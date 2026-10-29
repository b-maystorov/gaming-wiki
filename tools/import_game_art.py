#!/usr/bin/env python3
"""Copy identified PNGs from an installed DD1 game into ignored local storage."""
import argparse
import hashlib
import json
import re
import shutil
import struct
import subprocess
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from build_game_art_manifest import ROOT, OUTPUT, BASE, build

# These encyclopedia headings abbreviate the names used by the installed game.
ALIASES = {
    'brigand-pounder': 'Brigand 8 Pounder', 'prophet': 'Sonorous Prophet',
    'shrieker': 'Callous Shrieker', 'barnacle-chest': 'Barnacle Crusted Chest',
}


def png_size(path):
    with path.open('rb') as image:
        header = image.read(24)
    if header[:8] != b'\x89PNG\r\n\x1a\n' or header[12:16] != b'IHDR':
        raise ValueError(f'Not a PNG: {path.name}')
    return struct.unpack('>II', header[16:24])


def atlas_frame(path, region):
    """Read one complete pose/state; never assemble skeletal animation parts."""
    text = path.read_text()
    match = re.search(rf'(?m)^{re.escape(region)}\n((?:  [^\n]*\n?)+)', text)
    if not match:
        raise ValueError(f'{path.name}: no complete {region} region')
    values = dict(line.strip().split(': ', 1) for line in match[1].splitlines())
    x, y = map(int, values['xy'].split(','))
    width, height = map(int, values['size'].split(','))
    return dict(x=x, y=y, width=width, height=height, rotated=values['rotate'] == 'true')


def localized_entries(source):
    entries = {}
    for file in sorted((source / 'localization').glob('*.string_table.xml')):
        for entry in ET.parse(file).getroot().findall("./language[@id='english']/entry"):
            entries[entry.attrib['id']] = entry.text or ''
    return entries


def identify(row, source, entries):
    category = row['category']
    slug = row['recordId'].split(':')[-1]
    name = ALIASES.get(slug, row['recordName'])
    prefixes = dict(heroes='hero_class_name_', bosses='str_monstername_', enemies='str_monstername_',
                    trinkets='str_inventory_title_trinket', items='str_inventory_title_supply',
                    curios='str_curio_title_', locations='dungeon_name_')
    prefix = prefixes[category]
    matches = [key for key, value in entries.items() if key.startswith(prefix) and value.casefold() == name.casefold()]
    if slug == 'food':
        return [('primary', 'panels/icons_equip/provision/inv_provision+_0.png', None, 'str_inventory_title_provision')]
    if slug == 'flesh':
        # The statue portrait represents the whole encounter, not one of its four parts.
        return [('primary', 'campaign/town/buildings/statue/portrait_formless_flesh.png', None, 'str_monstername_formless_guard_A')]
    if slug == 'cultist-witch':
        # Champion recoloring is shader-driven; the base texture depicts the Acolyte.
        return []
    for key in matches:
        internal = key.removeprefix(prefix)
        if category == 'heroes':
            path = f'heroes/{internal}/{internal}_guild_header.png'
            frame = None
        elif category in ('bosses', 'enemies'):
            internal = re.sub(r'_[ABCD]$', '', internal)
            path = f'monsters/{internal}/anim/{internal}.sprite.defend.png'
            atlas = source / Path(path).with_suffix('.atlas')
            if not atlas.exists():
                continue
            frame = atlas_frame(atlas, 'defend')
        elif category == 'trinkets':
            path = f'panels/icons_equip/trinket/inv_trinket+{internal}.png'
            frame = None
        elif category == 'items':
            path = f'panels/icons_equip/supply/inv_supply+{internal}.png'
            frame = None
        elif category == 'curios':
            path = f'props/shared/curios/{internal}/{internal}.png'
            atlas = source / Path(path).with_suffix('.atlas')
            if not atlas.exists():
                continue
            frame = atlas_frame(atlas, 'closed')
        else:
            path = f'loading_screen/loading_screen.{internal}_0.png'
            frame = None
        if (source / path).is_file():
            slots = [('primary', path, frame, key)]
            if category == 'locations':
                slots.append(('banner', path, frame, key))
            return slots
    return []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game_directory', type=Path, help='Installed DarkestDungeon directory (read only)')
    args = parser.parse_args()
    source = args.game_directory.resolve()
    if (source / 'steam_appid.txt').read_text().strip() != '262060':
        raise ValueError('Expected the installed Darkest Dungeon I Steam app')
    manifest = json.loads(OUTPUT.read_text())
    entries = localized_entries(source)
    copied = set()
    connected = Counter()
    missing = []
    for row in manifest['records']:
        matches = identify(row, source, entries)
        if not matches:
            missing.append(f"{row['category']}: {row['recordName']}")
            continue
        for slot, relative, frame, key in matches:
            original = source / relative
            width, height = png_size(original)
            if frame:
                packed_width = frame['height'] if frame['rotated'] else frame['width']
                packed_height = frame['width'] if frame['rotated'] else frame['height']
                if frame['x'] + packed_width > width or frame['y'] + packed_height > height:
                    raise ValueError(f'Atlas frame out of bounds: {relative}')
            # Primary and banner share one private PNG, avoiding duplicate image files.
            path = f"{BASE}/{row['category']}/{row['recordId'].split(':')[-1]}.png"
            destination = ROOT / 'dist' / path
            subprocess.run(['git', 'check-ignore', '-q', str(destination)], cwd=ROOT, check=True)
            digest = hashlib.sha256(original.read_bytes()).hexdigest()
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.exists():
                if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
                    raise ValueError(f'Refusing to overwrite different artwork: {path}')
            else:
                shutil.copyfile(original, destination)
                copied.add(path)
            label = entries[key]
            row[slot] = dict(path=path, exists=True, currentlyReferenced=True, verifiedAuthentic=True,
                verificationSource=f'Installed Steam app 262060; {relative}; English localization {key} = {label}',
                alt=f'{row["recordName"]} — original Darkest Dungeon I {"guild illustration" if row["category"] == "heroes" else "game artwork"}',
                sourceRelativePath=relative, sourceContent='base-game', sourceSha256=digest,
                imageWidth=width, imageHeight=height, **({'frame': frame} if frame else {}))
        connected[row['category']] += 1
    OUTPUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    OUTPUT.write_text(json.dumps(build(), indent=2, ensure_ascii=False) + '\n')
    print(f'Copied {len(copied)} PNG files. Connected records: {dict(connected)}')
    print('Missing or not safely identified:\n' + '\n'.join(missing))


if __name__ == '__main__':
    main()
