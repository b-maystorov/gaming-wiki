#!/usr/bin/env python3
"""Build a reviewable inventory of Darkest Dungeon artwork references."""

import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "dist/data/games/darkest-dungeon-1.json"
HEROES = ROOT / "dist/js/heroes.js"
OUTPUT = ROOT / "docs/artwork-inventory.csv"
REFERENCE_SOURCES = {
    "heroes": "https://darkestdungeon.wiki.gg/wiki/Heroes_(Darkest_Dungeon)",
    "bosses": "https://darkestdungeon.wiki.gg/wiki/Bosses_(Darkest_Dungeon)",
    "enemies": "https://darkestdungeon.wiki.gg/wiki/Enemies_(Darkest_Dungeon)",
    "trinkets": "https://darkestdungeon.wiki.gg/wiki/Trinkets",
    "items": "https://darkestdungeon.wiki.gg/wiki/Items",
    "curios": "https://darkestdungeon.wiki.gg/wiki/Curios",
    "locations": "https://darkestdungeon.wiki.gg/wiki/Locations_(Darkest_Dungeon)",
    "quests": "https://darkestdungeon.wiki.gg/wiki/Quests_(Darkest_Dungeon)",
}
WIKI_NOTE = "Reference for identifying the subject only; not an image source or reuse license."


def hero_records(pack):
    text = HEROES.read_text(encoding="utf-8")
    registry = text.split("export const heroes = [", 1)[1].split("\n];", 1)[0]
    # Hero objects begin at two spaces; nested builds and teams begin deeper.
    blocks = re.findall(r"(?ms)^  \{(.*?)(?=^  \{|\Z)", registry)
    records = {}
    for block in blocks:
        hero_id = re.search(r"\bid:\s*['\"]([^'\"]+)['\"]", block)
        name = re.search(r"\bname:\s*['\"]([^'\"]+)['\"]", block)
        if not hero_id or not name:
            continue
        art = re.search(r"galleryArt:\s*\{[^\n]*?src:\s*['\"]([^'\"]+)", block)
        records[hero_id.group(1)] = {
            "id": hero_id.group(1), "name": name.group(1),
            "path": art.group(1) if art else "",
        }
    for hero in pack["heroes"]:
        gallery = hero.get("artwork", {}).get("gallery", {})
        if gallery:
            records[hero["routeId"]] = {
                "id": hero["routeId"], "name": hero["name"],
                "path": gallery.get("path", ""),
            }
    return records


def row(entity_id, name, category, path, desired, source, rights, status=None):
    if status is None:
        status = "local-rights-unverified" if path else "placeholder-no-authorized-image"
    return {
        "entity_id": entity_id,
        "name": name,
        "category": category,
        "current_image_path": path or "",
        "desired_image_type": desired,
        "asset_status": status,
        "candidate_source": f"{source} — {WIKI_NOTE}",
        "license_or_permission_status": rights,
    }


def build_rows(pack):
    rows = []
    category_names = {
        "bosses": "boss", "enemies": "enemy", "trinkets": "trinket",
        "items": "item", "curios": "curio", "locations": "location", "quests": "quest",
    }
    desired = {
        "bosses": "recognizable encounter portrait or licensed icon",
        "enemies": "recognizable enemy portrait or licensed icon",
        "trinkets": "game inventory icon",
        "items": "game inventory icon",
        "curios": "in-game curio illustration",
        "locations": "region scene illustration",
        "quests": "quest or region illustration",
    }
    for collection, kind in category_names.items():
        for record in pack[collection]:
            path = record.get("assetPath") or ""
            rights = (
                "Source and redistribution permission not documented; existing file retained, not approved"
                if path else "No asset-specific redistribution permission found; no image approved"
            )
            rows.append(row(record["id"], record["name"], kind, path, desired[collection],
                            REFERENCE_SOURCES[collection], rights))

    for hero in hero_records(pack).values():
        rows.append(row(f"darkest-dungeon-1:hero:{hero['id']}", hero["name"], "hero",
                        hero["path"], "class portrait", REFERENCE_SOURCES["heroes"],
                        "User-provided image; original creator/source and public redistribution terms were not supplied; retained, not approved"))

    rows.append(row("darkest-dungeon-1:hero:highwayman:guide-portrait", "Highwayman guide portrait", "hero-guide",
                    "assets/images/darkest-dungeon/highwayman-idle.gif", "character guide portrait / idle animation",
                    REFERENCE_SOURCES["heroes"],
                    "User-provided image; original creator/source and public redistribution terms were not supplied; retained, not approved"))

    # The current two team cards reuse hero portrait files rather than having team artwork.
    rows.append(row("darkest-dungeon-1:composition:steady-expedition", "A steady expedition", "composition",
                    "Reuses member hero portraits in dist/js/heroes.js", "party composition illustration",
                    REFERENCE_SOURCES["heroes"],
                    "No dedicated composition image; reused hero portraits have unresolved source and redistribution terms",
                    "reuses-local-rights-unverified"))
    rows.append(row("darkest-dungeon-1:composition:rotating-middle", "A rotating middle", "composition",
                    "Reuses member hero portraits in dist/js/heroes.js", "party composition illustration",
                    REFERENCE_SOURCES["heroes"],
                    "No dedicated composition image; reused hero portraits have unresolved source and redistribution terms",
                    "reuses-local-rights-unverified"))
    return rows


def main():
    pack = json.loads(PACK.read_text(encoding="utf-8"))
    rows = build_rows(pack)
    fields = list(rows[0])
    with OUTPUT.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows(sorted(rows, key=lambda record: (record["category"], record["name"].casefold())))
    print(f"Wrote {len(rows)} artwork inventory records to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
