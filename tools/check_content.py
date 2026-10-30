#!/usr/bin/env python3
"""Offline integrity checks for BM Gaming Wiki's versioned JSON content packs."""

import json
import re
import sys
import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACK_PATH = ROOT / "dist/data/games/darkest-dungeon-1.json"
SCHEMA_PATH = ROOT / "docs/game-content.schema.json"
VALID_STATUSES = {
    "verified", "reference-checked", "unverified", "missing", "unavailable",
    "not-applicable", "not-recorded",
}
VALID_TARGET_MODES = {"choose-one", "simultaneous", "all", "self", "none"}
VALID_TARGET_SIDES = {"enemy", "ally", "self", "none"}
ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9:-]*$")


class ContentError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise ContentError(message)


def walk_verification(value, path="$", source_ids=None):
    if isinstance(value, dict):
        verification = value.get("verification")
        if isinstance(verification, dict):
            status = verification.get("status")
            require(status in VALID_STATUSES, f"{path}: invalid verification status {status!r}")
            references = verification.get("sourceIds")
            require(isinstance(references, list), f"{path}: verification.sourceIds must be a list")
            if status in {"verified", "reference-checked"}:
                require(bool(references), f"{path}: verified data must cite at least one source")
            for source_id in references:
                require(source_id in source_ids, f"{path}: unknown source reference {source_id!r}")
            if "value" in value:
                if value["value"] is None:
                    require(status not in {"verified", "reference-checked"}, f"{path}: null value cannot be verified")
                if status == "not-applicable":
                    require(value["value"] is None, f"{path}: not-applicable value must be null")
        for key, nested in value.items():
            walk_verification(nested, f"{path}.{key}", source_ids)
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            walk_verification(nested, f"{path}[{index}]", source_ids)


def check_local_assets(value, path="$", key=None):
    if isinstance(value, dict):
        for child_key, nested in value.items():
            check_local_assets(nested, f"{path}.{child_key}", child_key)
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            check_local_assets(nested, f"{path}[{index}]", key)
    elif isinstance(value, str) and key in {"path", "assetPath", "src"} and value.startswith("assets/"):
        asset = ROOT / "dist" / value
        require(asset.is_file(), f"{path}: missing local asset {value}")
        check_image_file(asset, path)


def check_image_file(asset, context):
    """Check image signatures so a path cannot silently point at an HTML/file mismatch."""
    extension = asset.suffix.lower()
    header = asset.read_bytes()[:16]
    signatures = {
        ".png": header.startswith(b"\x89PNG\r\n\x1a\n"),
        ".gif": header.startswith((b"GIF87a", b"GIF89a")),
        ".jpg": header.startswith(b"\xff\xd8\xff"),
        ".jpeg": header.startswith(b"\xff\xd8\xff"),
        ".webp": len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP",
    }
    if extension == ".svg":
        content = asset.read_text(encoding="utf-8").lstrip("\ufeff \t\r\n")
        valid = bool(re.match(r"(?:<\?xml[^>]*>\s*)?(?:<!--.*?-->\s*)*<svg(?:\s|>)", content, re.S))
    else:
        valid = signatures.get(extension, False)
    require(valid, f"{context}: file extension does not match a supported image format ({asset.name})")


def check_artwork_inventory(pack):
    inventory_path = ROOT / "docs/artwork-inventory.csv"
    with inventory_path.open(encoding="utf-8", newline="") as inventory_file:
        rows = list(csv.DictReader(inventory_file))
    required = {"entity_id", "name", "category", "current_image_path", "desired_image_type",
                "asset_status", "candidate_source", "license_or_permission_status"}
    require(rows and required <= set(rows[0]), "artwork inventory is missing required columns or records")
    ids = [row["entity_id"] for row in rows]
    require(len(ids) == len(set(ids)), "artwork inventory contains duplicate entity IDs")
    require(all(row["candidate_source"] and row["license_or_permission_status"] for row in rows),
            "artwork inventory needs a candidate source and rights status for every record")
    for row in rows:
        path = row["current_image_path"]
        if path.startswith("assets/"):
            asset = ROOT / "dist" / path
            require(asset.is_file(), f"artwork inventory {row['entity_id']}: missing asset {path}")
            check_image_file(asset, f"artwork inventory {row['entity_id']}")

    expected_records = {}
    for collection in ("bosses", "enemies", "trinkets", "items", "curios", "locations", "quests"):
        for record in pack[collection]:
            expected_records[record["id"]] = (record["name"], record.get("assetPath") or "")
    for record in pack["heroes"]:
        gallery = record.get("artwork", {}).get("gallery", {})
        expected_records[f"darkest-dungeon-1:hero:{record['routeId']}"] = (
            record["name"], gallery.get("path", ""))
    # Legacy heroes remain authoritative for the rest of the gallery roster.
    heroes_js = (ROOT / "dist/js/heroes.js").read_text(encoding="utf-8")
    hero_registry = heroes_js.split("export const heroes = [", 1)[1].split("\n];", 1)[0]
    for block in re.findall(r"(?ms)^  \{(.*?)(?=^  \{|\Z)", hero_registry):
        hero_id = re.search(r"\bid:\s*['\"]([^'\"]+)['\"]", block)
        hero_name = re.search(r"\bname:\s*['\"]([^'\"]+)['\"]", block)
        hero_art = re.search(r"galleryArt:\s*\{[^\n]*?src:\s*['\"]([^'\"]+)", block)
        if hero_id:
            expected_records.setdefault(
                f"darkest-dungeon-1:hero:{hero_id.group(1)}",
                (hero_name.group(1) if hero_name else "", hero_art.group(1) if hero_art else ""))
    expected_records.update({
        "darkest-dungeon-1:composition:steady-expedition": ("A steady expedition", "Reuses member hero portraits in dist/js/heroes.js"),
        "darkest-dungeon-1:composition:rotating-middle": ("A rotating middle", "Reuses member hero portraits in dist/js/heroes.js"),
        "darkest-dungeon-1:hero:highwayman:guide-portrait": (
            "Highwayman guide portrait", "assets/images/darkest-dungeon/highwayman-idle.gif"),
    })
    actual = set(ids)
    expected = set(expected_records)
    require(expected == actual,
            f"artwork inventory entity mismatch (missing={sorted(expected - actual)}, extra={sorted(actual - expected)})")
    by_id = {record["entity_id"]: record for record in rows}
    for record_id, (name, current_path) in expected_records.items():
        row = by_id[record_id]
        require(row["name"] == name, f"artwork inventory {record_id}: name does not match canonical data")
        require(row["current_image_path"] == current_path,
                f"artwork inventory {record_id}: image path does not match canonical data")


def check_pack(pack):
    required_arrays = (
        "sources", "heroes", "combatSkills", "campingSkills", "equipmentProgressions",
        "trinkets", "trinketSets", "bosses", "enemies", "items", "curios", "locations", "quests", "teamCompositions", "strategyRecommendations",
        "dlcs", "regions", "bossCategories",
    )
    require(pack.get("schemaVersion") == 1, "schemaVersion must be 1")
    require(isinstance(pack.get("game", {}).get("versionContext"), dict), "game.versionContext is required")
    for name in required_arrays:
        require(isinstance(pack.get(name), list), f"{name} must be an array")

    identifiers = {}
    def register(record_id, context):
        require(isinstance(record_id, str) and ID_PATTERN.fullmatch(record_id), f"{context}: invalid stable id {record_id!r}")
        require(record_id not in identifiers, f"duplicate id {record_id!r} ({identifiers.get(record_id)} and {context})")
        identifiers[record_id] = context

    register(pack["game"]["id"], "game")
    register(pack["game"]["versionContext"].get("id"), "game.versionContext")
    for source in pack["sources"]:
        for key in ("id", "title", "url", "kind", "verificationStatus"):
            require(key in source, f"source missing {key}: {source.get('id', '<unknown>')}")
        register(source["id"], "source")
        require(source["url"].startswith(("https://", "http://")), f"source {source['id']}: URL must be absolute")
        require(source["verificationStatus"] in {"verified", "reference-checked", "unverified", "unavailable"},
                f"source {source['id']}: invalid verificationStatus")

    for collection in ("heroes", "combatSkills", "campingSkills", "equipmentProgressions", "trinkets", "trinketSets", "bosses", "enemies", "items", "curios", "locations", "quests", "teamCompositions", "strategyRecommendations", "dlcs", "regions", "bossCategories"):
        for record in pack[collection]:
            register(record.get("id"), collection)
            require(record["id"].startswith(pack["game"]["id"] + ":"),
                    f"{collection} ID {record['id']!r} must be namespaced by its game")

    required_fields = {
        "campingSkills": ("heroId", "name", "effects", "requirements", "verification"),
        "equipmentProgressions": ("heroId", "levels", "requirements", "verification"),
        "trinkets": ("name", "rarity", "requirements", "effects", "verification"),
        "bosses": ("routeId", "name", "categoryIds", "regionIds", "requirements", "versionContextId", "guideStatus", "summary", "summaryVerification", "verification"),
        "enemies": ("name", "requirements", "verification"),
        "items": ("routeId", "name", "category", "purpose", "usage", "limitations", "requirements", "relatedCurioIds", "verification"),
        "curios": ("routeId", "name", "regionIds", "whereFound", "requirements", "interactions", "verification"),
        "locations": ("routeId", "name", "regionId", "requirements", "summary", "enemyIds", "bossIds", "curioIds", "verification"),
        "quests": ("routeId", "name", "category", "summary", "regionIds", "verification"),
        "teamCompositions": ("name", "heroIds", "requirements", "verification"),
        "strategyRecommendations": ("heroId", "kind", "text", "sourceIds", "editorial"),
    }
    for collection, fields in required_fields.items():
        for record in pack[collection]:
            for field in fields:
                require(field in record, f"{collection} {record['id']}: missing {field}")

    source_ids = {record["id"] for record in pack["sources"]}
    hero_ids = {record["id"] for record in pack["heroes"]}
    legacy_heroes = (ROOT / "dist/js/heroes.js").read_text(encoding="utf-8")
    hero_registry = legacy_heroes.split("export const heroes = [", 1)[1].split("\n];", 1)[0]
    hero_route_ids = set(re.findall(r"\bid:\s*['\"]([^'\"]+)['\"]", hero_registry))
    trinket_ids = {record["id"] for record in pack["trinkets"]}
    boss_ids = {record["id"] for record in pack["bosses"]}
    dlc_ids = {record["id"] for record in pack["dlcs"]}
    region_ids = {record["id"] for record in pack["regions"]}
    category_ids = {record["id"] for record in pack["bossCategories"]}
    version_context_id = pack["game"]["versionContext"]["id"]
    for dlc in pack["dlcs"]:
        require(dlc.get("name") and isinstance(dlc.get("sourceIds"), list), f"DLC {dlc['id']}: name and sourceIds are required")
        for source_id in dlc["sourceIds"]:
            require(source_id in source_ids, f"DLC {dlc['id']}: unknown source {source_id!r}")
    for region in pack["regions"]:
        require(region.get("name") and isinstance(region.get("sourceIds"), list), f"region {region['id']}: name and sourceIds are required")
        requirements = region.get("requirements", {})
        require(isinstance(requirements.get("dlc"), list) and isinstance(requirements.get("mods"), list), f"region {region['id']}: DLC and mod requirements must be separate")
        for dlc_id in requirements.get("dlc", []):
            require(dlc_id in dlc_ids, f"region {region['id']}: unknown DLC {dlc_id!r}")
        for source_id in region["sourceIds"]:
            require(source_id in source_ids, f"region {region['id']}: unknown source {source_id!r}")
    for category in pack["bossCategories"]:
        require(category.get("name") and isinstance(category.get("order"), int), f"boss category {category['id']}: name and order are required")
    route_ids = set()
    for hero in pack["heroes"]:
        for key in ("routeId", "name", "requirements", "roleTags", "baseStats", "verification"):
            require(key in hero, f"hero {hero['id']}: missing {key}")
        require(ID_PATTERN.fullmatch(hero["routeId"]) and hero["routeId"] not in route_ids,
                f"hero {hero['id']}: routeId must be valid and unique")
        route_ids.add(hero["routeId"])
        require(hero["requirements"].get("baseGame") is not None and isinstance(hero["requirements"].get("dlc"), list)
                and isinstance(hero["requirements"].get("mods"), list), f"hero {hero['id']}: DLC and mod requirements must be separate")
        for position in hero.get("preferredPositions", []) + hero.get("alternativePositions", []):
            require(position in {1, 2, 3, 4}, f"hero {hero['id']}: invalid preferred position {position}")
        artwork = hero.get("artwork", {}).get("gallery")
        if artwork:
            asset = artwork.get("path", "")
            require(asset.startswith("assets/"), f"hero {hero['id']}: artwork path must be local to dist/assets")
            require((ROOT / "dist" / asset).is_file(), f"hero {hero['id']}: missing artwork asset {asset}")

    for skill in pack["combatSkills"]:
        for key in ("heroId", "name", "level1", "progression", "editorial"):
            require(key in skill, f"skill {skill['id']}: missing {key}")
        require(skill["heroId"] in hero_ids, f"skill {skill['id']}: unknown hero {skill['heroId']}")
        rules = skill.get("rankRules")
        if "ranked-combat" in pack["game"].get("mechanics", []):
            require(isinstance(rules, dict), f"skill {skill['id']}: this game's ranked-combat profile requires rankRules")
        if rules is not None:
            for position in rules.get("heroPositions", []):
                require(position in {1, 2, 3, 4}, f"skill {skill['id']}: invalid hero position {position}")
            target = rules.get("target", {})
            require(target.get("side") in VALID_TARGET_SIDES, f"skill {skill['id']}: invalid target side")
            require(target.get("mode") in VALID_TARGET_MODES, f"skill {skill['id']}: invalid target mode")
            ranks = target.get("ranks")
            require(isinstance(ranks, list) and all(rank in {1, 2, 3, 4} for rank in ranks), f"skill {skill['id']}: invalid target ranks")
            if target["side"] == "enemy":
                require(bool(ranks) and target["mode"] in {"choose-one", "simultaneous"}, f"skill {skill['id']}: enemy target needs explicit rank mode and ranks")
                if target["mode"] == "simultaneous":
                    require(len(ranks) > 1, f"skill {skill['id']}: simultaneous targeting must include multiple ranks")
            if target["side"] == "self":
                require(target["mode"] == "self" and not ranks, f"skill {skill['id']}: self target cannot list ranks")
            if target["side"] == "ally" and target["mode"] == "all":
                require(len(ranks) > 1, f"skill {skill['id']}: party target should represent multiple positions")
        progression = skill["progression"]
        levels = progression.get("levels", [])
        level_numbers = [level.get("level") for level in levels]
        require(level_numbers == sorted(set(level_numbers)), f"skill {skill['id']}: progression levels must be unique and ordered")
        require(all(level in {1, 2, 3, 4, 5} for level in level_numbers), f"skill {skill['id']}: progression level must be 1–5")
        for level in levels:
            for field in ("damageModifier", "accuracy", "criticalModifier", "effects", "verification"):
                require(field in level, f"skill {skill['id']} level {level.get('level')}: missing {field}")
        if progression.get("status") == "complete":
            require(level_numbers == [1, 2, 3, 4, 5], f"skill {skill['id']}: complete progression needs levels 1–5")
        if progression.get("status") == "not-recorded":
            require(not levels, f"skill {skill['id']}: not-recorded progression must not include values")

    for record_type in ("campingSkills", "equipmentProgressions"):
        for record in pack[record_type]:
            require(record.get("heroId") in hero_ids, f"{record_type} {record['id']}: unknown hero reference")
            require(isinstance(record.get("requirements", {}).get("dlc"), list)
                    and isinstance(record.get("requirements", {}).get("mods"), list),
                    f"{record_type} {record['id']}: DLC and mod requirements must be separate")
    for trinket in pack["trinkets"]:
        requirements = trinket.get("requirements", {})
        require(ID_PATTERN.fullmatch(trinket["routeId"]), f"trinket {trinket['id']}: invalid routeId")
        require(isinstance(requirements.get("dlc"), list) and isinstance(requirements.get("mods"), list),
                f"trinket {trinket['id']}: DLC and mod requirements must be separate")
        require(requirements.get("baseGame") is not None and all(dlc_id in dlc_ids for dlc_id in requirements["dlc"]), f"trinket {trinket['id']}: malformed or unknown DLC requirement")
        for hero_id in trinket.get("heroIds", []):
            require(hero_id in hero_ids, f"trinket {trinket['id']}: unknown hero {hero_id}")
        restrictions = trinket.get("classRestrictionHeroRouteIds", [])
        require(isinstance(restrictions, list), f"trinket {trinket['id']}: class restrictions must be a list")
        for route_id in trinket.get("heroRouteIds", []) + trinket.get("classRestrictionHeroRouteIds", []):
            require(route_id in hero_route_ids, f"trinket {trinket['id']}: unknown hero route {route_id}")
        for effect in trinket["effects"]:
            require(effect.get("polarity") in {"positive", "negative"}, f"trinket {trinket['id']}: effect polarity must be positive or negative")
        require(all(region_id in region_ids for region_id in trinket.get("regionIds", [])), f"trinket {trinket['id']}: unknown origin region")
        if trinket.get("bossId"):
            require(trinket["bossId"] in boss_ids, f"trinket {trinket['id']}: unknown associated boss")
        path = trinket.get("assetPath")
        if path:
            require(path.startswith("assets/") and (ROOT / "dist" / path).is_file(), f"trinket {trinket['id']}: missing asset {path}")
    trinket_set_ids = {entry["id"] for entry in pack["trinketSets"]}
    for trinket_set in pack["trinketSets"]:
        require(trinket_set["heroRouteId"] in hero_route_ids, f"trinket set {trinket_set['id']}: unknown hero route")
        require(all(dlc_id in dlc_ids for dlc_id in trinket_set["requirements"].get("dlc", [])), f"trinket set {trinket_set['id']}: unknown DLC")
    for trinket in pack["trinkets"]:
        if trinket.get("setId"):
            require(trinket["setId"] in trinket_set_ids, f"trinket {trinket['id']}: unknown set relationship")
    trinket_routes = {record["routeId"] for record in pack["trinkets"]}
    recommendation_routes = set(re.findall(r"routeId:\s*['\"]([^'\"]+)['\"]", legacy_heroes))
    require(recommendation_routes <= trinket_routes, f"hero trinket recommendations have unresolved item route IDs: {sorted(recommendation_routes - trinket_routes)}")
    boss_names = {boss["name"].casefold() for boss in pack["bosses"]}
    enemy_routes = set()
    enemy_ids = {record["id"] for record in pack["enemies"]}
    curio_ids = {record["id"] for record in pack["curios"]}
    item_ids = {record["id"] for record in pack["items"]}
    for enemy in pack["enemies"]:
        require(enemy["name"].casefold() not in boss_names, f"enemy {enemy['id']}: boss duplicated as regular enemy")
        require(enemy["routeId"] not in enemy_routes and ID_PATTERN.fullmatch(enemy["routeId"]), f"enemy {enemy['id']}: routeId must be valid and unique")
        enemy_routes.add(enemy["routeId"])
        require(enemy["encounterClass"] in {"regular", "miniboss"}, f"enemy {enemy['id']}: invalid encounterClass")
        require(enemy["requirements"].get("baseGame") is not None and isinstance(enemy["requirements"].get("dlc"), list) and isinstance(enemy["requirements"].get("mods"), list), f"enemy {enemy['id']}: malformed requirements")
        require(all(region in region_ids for region in enemy.get("regionIds", [])), f"enemy {enemy['id']}: unknown region")
        require(all(dlc in dlc_ids for dlc in enemy["requirements"]["dlc"]), f"enemy {enemy['id']}: unknown DLC")
        require(enemy["verification"].get("status") in {"verified", "reference-checked", "partial", "unverified"}, f"enemy {enemy['id']}: invalid verification status")
    item_routes = set()
    for item in pack["items"]:
        require(ID_PATTERN.fullmatch(item["routeId"]) and item["routeId"] not in item_routes, f"item {item['id']}: invalid or duplicate routeId")
        item_routes.add(item["routeId"])
        require(all(curio_id in curio_ids for curio_id in item["relatedCurioIds"]), f"item {item['id']}: unknown related curio")
        for dlc_id in item["requirements"].get("dlc", []): require(dlc_id in dlc_ids, f"item {item['id']}: unknown DLC {dlc_id}")
    for curio in pack["curios"]:
        require(ID_PATTERN.fullmatch(curio["routeId"]), f"curio {curio['id']}: invalid routeId")
        require(all(region_id in region_ids for region_id in curio["regionIds"]), f"curio {curio['id']}: unknown region")
        require(all(dlc_id in dlc_ids for dlc_id in curio["requirements"].get("dlc", [])), f"curio {curio['id']}: unknown DLC")
        for interaction in curio["interactions"]:
            if interaction.get("itemId") is not None: require(interaction["itemId"] in item_ids, f"curio {curio['id']}: unknown provision/item relationship")
    for location in pack["locations"]:
        require(location["regionId"] in region_ids, f"location {location['id']}: unknown region")
        require(all(record_id in enemy_ids for record_id in location["enemyIds"]), f"location {location['id']}: unknown enemy")
        require(all(record_id in boss_ids for record_id in location["bossIds"]), f"location {location['id']}: unknown boss")
        require(all(record_id in curio_ids for record_id in location["curioIds"]), f"location {location['id']}: unknown curio")
    for collection in ("trinkets", "curios", "locations", "quests"):
        route_ids = [record["routeId"] for record in pack[collection]]
        require(all(ID_PATTERN.fullmatch(route_id) for route_id in route_ids), f"{collection}: invalid route ID")
        require(len(route_ids) == len(set(route_ids)), f"{collection}: duplicate route ID")
    for quest in pack["quests"]:
        require(ID_PATTERN.fullmatch(quest["routeId"]), f"quest {quest['id']}: invalid routeId")
        require(all(region_id in region_ids for region_id in quest["regionIds"]), f"quest {quest['id']}: unknown region")
        for dlc_id in quest.get("requirements", {}).get("dlc", []): require(dlc_id in dlc_ids, f"quest {quest['id']}: unknown DLC")
    for composition in pack["teamCompositions"]:
        for hero_id in composition.get("heroIds", []):
            require(hero_id in hero_ids, f"composition {composition['id']}: unknown hero {hero_id}")
    for recommendation in pack["strategyRecommendations"]:
        require(recommendation.get("heroId") in hero_ids, f"recommendation {recommendation['id']}: unknown hero")
        if recommendation.get("bossId"):
            require(recommendation["bossId"] in boss_ids, f"recommendation {recommendation['id']}: unknown boss")
        for trinket_id in recommendation.get("trinketIds", []):
            require(trinket_id in trinket_ids, f"recommendation {recommendation['id']}: unknown trinket {trinket_id}")
        for source_id in recommendation.get("sourceIds", []):
            require(source_id in source_ids, f"recommendation {recommendation['id']}: unknown source {source_id}")
        require(isinstance(recommendation.get("editorial"), bool), f"recommendation {recommendation['id']}: mark factual/editorial status")

    boss_route_ids = set()
    composition_ids = {composition["id"] for composition in pack["teamCompositions"]}
    for boss in pack["bosses"]:
        route_id = boss["routeId"]
        require(ID_PATTERN.fullmatch(route_id) and route_id not in boss_route_ids, f"boss {boss['id']}: routeId must be valid and unique")
        boss_route_ids.add(route_id)
        require(boss["versionContextId"] == version_context_id, f"boss {boss['id']}: unknown game version context")
        require(boss["guideStatus"] in {"available", "in-development"}, f"boss {boss['id']}: invalid guide status")
        requirements = boss["requirements"]
        require(requirements.get("baseGame") is not None and isinstance(requirements.get("dlc"), list) and isinstance(requirements.get("mods"), list), f"boss {boss['id']}: malformed requirements")
        for dlc_id in requirements["dlc"]:
            require(dlc_id in dlc_ids, f"boss {boss['id']}: unknown DLC {dlc_id!r}")
        require(bool(boss["categoryIds"]) and all(category_id in category_ids for category_id in boss["categoryIds"]), f"boss {boss['id']}: unknown or missing category")
        require(all(region_id in region_ids for region_id in boss["regionIds"]), f"boss {boss['id']}: unknown region reference")
        for hero_route_id in boss.get("relatedHeroRouteIds", []):
            require(hero_route_id in hero_route_ids, f"boss {boss['id']}: unknown hero route {hero_route_id!r}")
        for composition_id in boss.get("relatedCompositionIds", []):
            require(composition_id in composition_ids, f"boss {boss['id']}: unknown composition {composition_id!r}")
        for team in boss.get("counterTeams", []):
            require(len(team.get("members", [])) == 4, f"boss {boss['id']}: counter team must contain four heroes")
            require([member.get("position") for member in team["members"]] == [4, 3, 2, 1], f"boss {boss['id']}: counter team positions must be 4→1")
            for member in team["members"]:
                require(member.get("heroRouteId") in hero_route_ids, f"boss {boss['id']}: unknown counter-team hero")
                require(len(member.get("skills", [])) == 4, f"boss {boss['id']}: each counter-team hero needs four skills")
                require(all(isinstance(skill.get("heroPositions"), list) and member["position"] in skill["heroPositions"] for skill in member["skills"]), f"boss {boss['id']}: counter-team skill is invalid for assigned rank")
                for route_id in member.get("trinketIds", []):
                    trinket = next((item for item in pack["trinkets"] if item["routeId"] == route_id), None)
                    require(trinket is not None, f"boss {boss['id']}: unknown counter-team trinket {route_id}")
                    require(not trinket.get("classRestrictionHeroRouteIds") or member["heroRouteId"] in trinket["classRestrictionHeroRouteIds"], f"boss {boss['id']}: counter-team trinket restricted from hero")
        if boss["guideStatus"] == "available":
            require(bool(boss.get("guideVerification")), f"boss {boss['id']}: available guide requires guideVerification")
            require(all(isinstance(boss.get(field), list) and boss[field] for field in ("mechanics", "variants", "attacks", "tacticalConsiderations")), f"boss {boss['id']}: available guide is missing detail sections")
        else:
            require(not any(boss.get(field) for field in ("mechanics", "variants", "attacks", "tacticalConsiderations")), f"boss {boss['id']}: in-development entry must not expose unverified guide content")

    # Hero routes are retained in the legacy JS registry until those records migrate.
    app_js = (ROOT / "dist/js/app.js").read_text(encoding="utf-8")
    require("parts[2] === 'bosses'" in app_js and "renderBossCollection" in app_js, "Bosses collection route is not wired in app.js")
    require("initializeCommandCenter" in app_js and "bosses: structuredGameContent" in app_js, "Bosses are not included in global search")
    for view in ("enemies", "trinkets", "items", "curios", "locations", "quests"):
        require(f"view: '{view}'" in (ROOT / "dist/js/games.js").read_text(encoding="utf-8"), f"{view} sidebar route is missing")
        require(f"{view}: () => renderEncyclopediaCollection('{view}')" in app_js, f"{view} collection renderer route is missing")
    require("const trinkets = getTrinkets().filter" in app_js, "Hero trinket recommendations do not resolve canonical item records")
    require("content: structuredGameContent" in app_js and "content?.trinkets.find" in (ROOT / "dist/js/command-center.js").read_text(encoding="utf-8"), "Global search is not using canonical trinket data")

    walk_verification(pack, source_ids=source_ids)
    check_local_assets(pack)
    # Check the legacy roster's referenced portraits until those records migrate.
    legacy_assets = re.findall(r"(?:src|path):\s*['\"](assets/[^'\"]+)['\"]", legacy_heroes)
    for asset_path in set(legacy_assets):
        asset = ROOT / "dist" / asset_path
        require(asset.is_file(), f"heroes.js: missing local artwork {asset_path}")
        check_image_file(asset, "heroes.js")
    check_artwork_inventory(pack)
    # IDs and references should stay resolvable when imported into a relational store.


def main():
    try:
        json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        pack = json.loads(PACK_PATH.read_text(encoding="utf-8"))
        check_pack(pack)
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ContentError) as error:
        print(f"Content check failed: {error}", file=sys.stderr)
        return 1
    print(f"Content check passed: {len(pack['heroes'])} hero, {len(pack['combatSkills'])} combat skills, "
          f"{len(pack['bosses'])} bosses ({sum(b['guideStatus'] == 'available' for b in pack['bosses'])} detailed), "
          f"{len(pack['enemies'])} enemies, {len(pack['trinkets'])} trinkets, {len(pack['items'])} items, "
          f"{len(pack['curios'])} curios, {len(pack['locations'])} locations, {len(pack['quests'])} quests, "
          f"{len(pack['sources'])} sources.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
