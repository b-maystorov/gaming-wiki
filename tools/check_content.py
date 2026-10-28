#!/usr/bin/env python3
"""Offline integrity checks for BM Gaming Wiki's versioned JSON content packs."""

import json
import re
import sys
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
        require((ROOT / "dist" / value).is_file(), f"{path}: missing local asset {value}")


def check_pack(pack):
    required_arrays = (
        "sources", "heroes", "combatSkills", "campingSkills", "equipmentProgressions",
        "trinkets", "bosses", "enemies", "teamCompositions", "strategyRecommendations",
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

    for collection in ("heroes", "combatSkills", "campingSkills", "equipmentProgressions", "trinkets", "bosses", "enemies", "teamCompositions", "strategyRecommendations", "dlcs", "regions", "bossCategories"):
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
        "teamCompositions": ("name", "heroIds", "requirements", "verification"),
        "strategyRecommendations": ("heroId", "kind", "text", "sourceIds", "editorial"),
    }
    for collection, fields in required_fields.items():
        for record in pack[collection]:
            for field in fields:
                require(field in record, f"{collection} {record['id']}: missing {field}")

    source_ids = {record["id"] for record in pack["sources"]}
    hero_ids = {record["id"] for record in pack["heroes"]}
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
        require(isinstance(requirements.get("dlc"), list) and isinstance(requirements.get("mods"), list),
                f"trinket {trinket['id']}: DLC and mod requirements must be separate")
        for hero_id in trinket.get("heroIds", []):
            require(hero_id in hero_ids, f"trinket {trinket['id']}: unknown hero {hero_id}")
        path = trinket.get("assetPath")
        if path:
            require(path.startswith("assets/") and (ROOT / "dist" / path).is_file(), f"trinket {trinket['id']}: missing asset {path}")
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
    legacy_heroes = (ROOT / "dist/js/heroes.js").read_text(encoding="utf-8")
    hero_registry = legacy_heroes.split("export const heroes = [", 1)[1].split("\n];", 1)[0]
    hero_route_ids = set(re.findall(r"\bid:\s*['\"]([^'\"]+)['\"]", hero_registry))
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
        if boss["guideStatus"] == "available":
            require(bool(boss.get("guideVerification")), f"boss {boss['id']}: available guide requires guideVerification")
            require(all(isinstance(boss.get(field), list) and boss[field] for field in ("mechanics", "variants", "attacks", "tacticalConsiderations")), f"boss {boss['id']}: available guide is missing detail sections")
        else:
            require(not any(boss.get(field) for field in ("mechanics", "variants", "attacks", "tacticalConsiderations")), f"boss {boss['id']}: in-development entry must not expose unverified guide content")

    # Hero routes are retained in the legacy JS registry until those records migrate.
    app_js = (ROOT / "dist/js/app.js").read_text(encoding="utf-8")
    require("parts[2] === 'bosses'" in app_js and "renderBossCollection" in app_js, "Bosses collection route is not wired in app.js")
    require("initializeCommandCenter" in app_js and "bosses: structuredGameContent" in app_js, "Bosses are not included in global search")

    walk_verification(pack, source_ids=source_ids)
    check_local_assets(pack)
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
          f"{len(pack['sources'])} sources; optional sections are explicitly empty until documented.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
