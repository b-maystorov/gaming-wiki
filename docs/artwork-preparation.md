# Round 1 artwork preparation

No artwork was downloaded, generated, overwritten, deleted, or removed from Git.
Gameplay JSON and legacy hero modules are unchanged. The existing CSV inventory
continues to describe the older references; the new JSON registry describes the
replacement slots used by the renderer.

## Asset structure and metadata

Private images go under `dist/assets/games/darkest-dungeon-1/private/`, with
`heroes`, `bosses`, `enemies`, `trinkets`, `items`, `curios`, `locations`, and `ui`
subdirectories. Only this private subtree is ignored. The generator recreates
empty directories after checkout. UI has no encyclopedia records in this round.

`dist/data/games/darkest-dungeon-1-artwork.json` is the shared presentation registry
for canonical records and all 17 legacy heroes. It uses the existing canonical
IDs; legacy hero IDs are qualified as `darkest-dungeon-1:hero:<id>`, matching the
existing artwork CSV and canonical Crusader ID. No gameplay values are copied.

Each record has `category`, `recordId`, `recordName`, `primary`, `thumbnail`,
`banner`, and `legacyAssets`. Primary is required. Thumbnail and banner default
to null; add a slot object when a different thumbnail or a detail banner exists.
Each slot contains:

- `path`: stable URL relative to `dist/`, normally `assets/games/darkest-dungeon-1/private/<category>/<routeId>.png`.
- `exists`: generated from the local filesystem, not proof of provenance.
- `currentlyReferenced`: the path is configured in the renderer's registry, even when missing; this does not mean an image is visible or fetched.
- `verifiedAuthentic`: explicit authenticity decision, initially false.
- `verificationSource`: required evidence when authenticity is true; use a non-private source description, not personal installation paths.
- `alt`: accessible description of the image.
- `missingReason` (optional): reason a specifically expected private asset is unavailable; this does not change fallback behavior.

Legacy assets separately record file existence, current references, unknown
origin, false authenticity, and replacement intent. The Highwayman guide/team
GIF is included separately from his gallery portrait. Existing legacy references
remain in their original data; the registry documents them without replacing them.

## Rendering

`dist/js/artwork.js` loads the optional registry independently of gameplay data.
Only existing, verified private slots with evidence are selected. Cards try the
thumbnail, then primary; detail pages use primary plus an optional banner.
Failures exhaust image candidates, then hide the failed image and reveal the
legacy portrait, CSS scene, or accessible monogram. Missing banners disappear.
The existing hero gallery and guide error handlers cover legacy portrait failures.
The public checkout works with no private files, even with stale existence flags.

Portraits and icons use `object-fit: contain`; location scenes and banners use
16:9 frames without stretching or cropping. Hero cards retain their 320px art
frame and DLC badges. Routes, filters, gameplay, and DLC/mod requirements are
unchanged. Team portrait and guide recommendation widgets retain their existing
legacy references; the new slots apply to encyclopedia cards and detail headers.

## Existing artwork audit / replacement queue

- All 17 `dist/assets/images/darkest-dungeon/*-portrait.png` gallery images
  (individual paths in the registry) should be replaced when authentic portraits
  are verified. They came from `dd1-character-contact-sheet.png`, which remains
  untouched and is not rendered directly. The user identifies AI-generated art
  as a replacement target; repository evidence only establishes these as
  game-inspired illustrations with unknown authorship. AI generation is not
  independently verified. Do not describe these as authentic game art.
- `highwayman-idle.gif`, `focus-ring.png`, and `gunslingers-buckle.png` have unknown
  provenance. Their visual appearance or existing filenames do not verify
  authenticity. Verify or replace them in Round 2; retain the files meanwhile.
- Boss scenes and encyclopedia monograms are CSS placeholders, not game images
  or AI-generated assets. They remain the final fallback.
- Existing SVG placeholders, portal scenery, branding, reference screenshots,
  and archived reference-site files are retained. They are not candidates for
  certification as authentic DD1 artwork. Reference archives are not rendered
  as encyclopedia images. This round does not clean up previously tracked files.

## Regeneration and Round 2

```
python3 tools/build_game_art_manifest.py
python3 tools/build_game_art_manifest.py --check
```

The generator joins the canonical JSON with the legacy roster, refreshes existence
flags, and preserves slot paths, alt text, and verification decisions. It rejects
paths outside the category's private directory and verified slots without evidence.
It never copies or downloads images. Re-run after adding or removing local images.
The existing `python3 tools/build_artwork_inventory.py` still regenerates the older
CSV audit; it is a separate report and remains unchanged in Round 1.

Round 2 must identify each subject, document authenticity, put its image in the
private subtree, set `verifiedAuthentic` and `verificationSource`, then regenerate
and validate the manifest. Review metadata for private information before any
future public commit. Authenticity does not imply redistribution permission.
No images are currently verified authentic. All 170 primary slots are missing:
heroes 17, bosses 26, enemies 66, trinkets 23, items 15, curios 16, locations 7.

## Validation

`python3 tools/check_content.py` passes. In this Node 24 environment the literal
`node --test tests/encyclopedia.test.mjs` fails because `SourceTextModule` requires
`--experimental-vm-modules`. The flagged test command passes; direct execution
with `node --experimental-vm-modules tests/encyclopedia.test.mjs` also reports
all 13 tests passing, including route resolution and artwork fallback checks.
Manifest freshness and `git diff --check` are checked separately.
`git check-ignore` confirms private paths are ignored, while game JSON and code
remain unignored; no files were already tracked in the new private subtree.
No browser layout or interaction tests were performed.

## Round 2: installed game import

The Round 1 counts and rendering notes above are historical. Round 2 found the
Steam Snap installation at `~/snap/steam/common/.local/share/Steam/steamapps/common/DarkestDungeon`.
Steam's library configuration lists this library and app 262060. The game contains
4,364 PNGs, base-game hero/monster/curio directories, inventory icons under
`panels/icons_equip`, and `loading_screen` region scenes. Its only installed DLC
art directory is `dlc/445700_musketeer`; Musketeer is outside the current roster.
No downloaded artwork, archive extraction, third-party tools, or modifications to
the installed game were needed. No external source search was needed.

Imported **133 unchanged PNG files**, connecting **133 of 170 records**:

| Category | Connected | Missing |
| --- | ---: | ---: |
| Heroes | 15 | 2 |
| Bosses | 17 | 9 |
| Enemies | 53 | 13 |
| Trinkets | 19 | 4 |
| Items | 11 | 4 |
| Curios | 13 | 3 |
| Locations | 5 | 2 |

Hero cards use the original guild illustrations, which are larger than the game's
small roster icons. Monster images use the atlas's complete `defend` frame;
curios use `closed`. Native SVG clips the original PNG and reverses atlas packing
rotation. This is a static game pose, not a reconstructed animation or generated
image. Flesh uses its original encounter statue portrait. Location primary and
banner slots share one PNG per region; no duplicate banner file is created.
Team portraits and guide trinket recommendations now also select verified art.
Existing generated/unknown files remain fallback assets and are untouched.

Identification uses English localization entries bundled with the installation,
not filename resemblance alone. Four explicit heading aliases are documented in
`tools/import_game_art.py`. The manifest records the source-relative filename,
localization key/name, SHA-256, native dimensions, base-game content origin, and
optional atlas frame (`x`, `y`, `width`, `height`, `rotated`). No personal absolute
installation path is stored in the manifest. `sourceContent: base-game` describes
the installed image source; existing game-data DLC requirements are unchanged.
No missing DLC image is certified or replaced with base-game artwork.

Remaining blockers:

- Flagellant and Shieldbreaker: their DLC artwork is not installed.
- Shieldbreaker has no verified private portrait in the imported set. The inspected installation did not include its DLC artwork. Its existing legacy portrait is origin-unverified and remains fallback-only until an authentic local replacement is available; this reason is recorded on its manifest `primary` slot and preserved by regeneration.
- All other missing records except Cultist Witch require absent Crimson Court,
  Shieldbreaker, or Color of Madness artwork. Their existing record requirements
  remain the source of DLC classification.
- Cultist Witch: the champion variant uses shader tinting of the Acolyte texture.
  Import is deliberately skipped until its correct appearance can be reproduced
  or an identifiable original image is available. The texture is not substituted
  under the Witch name.

Repeat an import from the repository root with:

```
python3 tools/import_game_art.py /path/to/installed/DarkestDungeon
python3 tools/build_game_art_manifest.py --check
```

The importer is intentionally limited to the verified base-game layouts and
mapping rules used here. Newly installed DLC needs its own source inspection and
mapping before importing; merely installing it will not automatically certify it.
The script checks app identity, localization, PNG signatures, atlas bounds and
Git exclusions. Existing destinations must match the original checksum; different
files are never overwritten. Regeneration preserves source and frame metadata;
validation checks imported PNG hashes, dimensions and frame bounds.

Visual changes retain the black/crimson palette: subtle card glow, short
transitions, and noninteractive region-edge shading. Images retain their native
proportions; atlas clipping excludes adjacent frames and shadows. Headings remain
in opaque panels for readability. Reduced-motion CSS disables transitions and
hover movement. Failed PNG/SVG candidates advance to the next image and finally
the original fallback, including when a hidden candidate fails first. A missing
banner collapses instead of displaying a broken-image icon.

Validation: Python content check, manifest integrity/freshness check, JavaScript
VM-module regression suite (15 tests), and `git diff --check` pass. Tests cover
routes, private-art selection, atlas markup, failure ordering, and absent-private-
asset behavior. All 133 private PNGs are ignored by Git and match their source
checksums. No old image files or gameplay data were changed. No visual browser
tests were performed. Nothing was committed, pushed, merged, or deployed.
