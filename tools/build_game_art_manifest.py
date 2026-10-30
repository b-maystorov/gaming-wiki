#!/usr/bin/env python3
"""Regenerate artwork references without changing gameplay content or copying images."""
import argparse
import hashlib
import struct
import json
from collections import Counter
from pathlib import Path
from build_artwork_inventory import ROOT, PACK, hero_records

OUTPUT = ROOT / 'dist/data/games/darkest-dungeon-1-artwork.json'
BASE = 'assets/games/darkest-dungeon-1/private'
CATEGORIES = ('heroes', 'bosses', 'enemies', 'trinkets', 'items', 'curios', 'locations')


def build():
    pack = json.loads(PACK.read_text())
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {'records': []}
    previous = {row['recordId']: row for row in previous['records']}
    rows = []
    for category in CATEGORIES:
        records = pack[category] if category != 'heroes' else [
            dict(hero, id=f"darkest-dungeon-1:hero:{hero['id']}", routeId=hero['id'], assetPath=hero['path'])
            for hero in hero_records(pack).values()]
        for record in records:
            old = previous.get(record['id'], {})
            slots = {}
            for slot in ('primary', 'thumbnail', 'banner'):
                prior = old.get(slot)
                if slot != 'primary' and not prior:
                    slots[slot] = None
                    continue
                path = prior['path'] if prior else f"{BASE}/{category}/{record['routeId']}.png"
                relative = Path(path)
                assert path.startswith(f'{BASE}/{category}/') and '..' not in relative.parts, path
                evidence = prior.get('verificationSource', '') if prior else ''
                verified = prior.get('verifiedAuthentic', False) if prior else False
                assert not verified or evidence.strip(), f'{path}: authenticity requires evidence'
                slots[slot] = dict(path=path, exists=(ROOT / 'dist' / path).is_file(),
                    currentlyReferenced=True, verifiedAuthentic=verified, verificationSource=evidence,
                    alt=prior.get('alt', f"{record['name']} — Darkest Dungeon I") if prior else f"{record['name']} — Darkest Dungeon I")
                # Keep verified source metadata and atlas frames through regeneration.
                for field in ('sourceRelativePath', 'sourceContent', 'sourceSha256', 'imageWidth', 'imageHeight', 'frame'):
                    if prior and field in prior:
                        slots[slot][field] = prior[field]
                if prior and prior.get('missingReason') and not slots[slot]['exists']:
                    slots[slot]['missingReason'] = prior['missingReason']
                if slots[slot]['exists'] and slots[slot].get('sourceSha256'):
                    asset_bytes = (ROOT / 'dist' / path).read_bytes()
                    assert hashlib.sha256(asset_bytes).hexdigest() == slots[slot]['sourceSha256'], f'{path}: checksum mismatch'
                    assert asset_bytes[:8] == b'\x89PNG\r\n\x1a\n', f'{path}: invalid PNG signature'
                    width, height = struct.unpack('>II', asset_bytes[16:24])
                    assert (width, height) == (slots[slot]['imageWidth'], slots[slot]['imageHeight']), f'{path}: dimensions mismatch'
                    frame = slots[slot].get('frame')
                    if frame:
                        frame_width, frame_height = frame['width'], frame['height']
                        assert frame_width > 0 and frame_height > 0 and frame['x'] >= 0 and frame['y'] >= 0
                        if frame['rotated']:
                            frame_width, frame_height = frame_height, frame_width
                        assert frame['x'] + frame_width <= width and frame['y'] + frame_height <= height, f'{path}: atlas bounds mismatch'
            legacy = record.get('assetPath') or ''
            if category == 'heroes' and record['routeId'] == 'shieldbreaker' and not slots['primary']['exists']:
                slots['primary']['missingReason'] = (
                    'No verified Shieldbreaker portrait is present in the private local asset set. '
                    'The inspected installation did not include Shieldbreaker DLC artwork; the '
                    'existing legacy portrait is origin-unverified and remains fallback-only.'
                )
            rows.append(dict(category=category, recordId=record['id'], recordName=record['name'],
                **slots, legacyAssets=[dict(path=legacy, exists=(ROOT / 'dist' / legacy).is_file(),
                    currentlyReferenced=True, verifiedAuthentic=False,
                    origin='game-inspired illustration; AI attribution unverified' if category == 'heroes' else 'unknown',
                    replaceWhenAuthenticAvailable=True)] if legacy else []))
    highwayman = next(row for row in rows if row['recordId'] == 'darkest-dungeon-1:hero:highwayman')
    gif = 'assets/images/darkest-dungeon/highwayman-idle.gif'
    highwayman['legacyAssets'].append(dict(path=gif, exists=(ROOT / 'dist' / gif).is_file(),
        currentlyReferenced=True, verifiedAuthentic=False, origin='unknown; guide and team animation',
        replaceWhenAuthenticAvailable=True))
    return dict(schemaVersion=1, records=sorted(rows, key=lambda row: (row['category'], row['recordId'])))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if inventory is stale')
    args = parser.parse_args()
    manifest = build()
    text = json.dumps(manifest, indent=2, ensure_ascii=False) + '\n'
    if args.check:
        assert OUTPUT.exists() and OUTPUT.read_text() == text, 'Manifest is stale; regenerate it'
    else:
        for category in (*CATEGORIES, 'ui'):
            (ROOT / 'dist' / BASE / category).mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(text)
    missing = Counter(row['category'] for row in manifest['records'] if not row['primary']['exists'])
    print(f"{len(manifest['records'])} records; missing primary assets: {dict(sorted(missing.items()))}")


if __name__ == '__main__':
    main()
