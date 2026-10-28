# Content architecture

## Audit of the current data flow

- `dist/js/games.js` is presentation configuration: portal scenes, route IDs,
  availability and sidebar categories. It does not hold gameplay records.
- `dist/js/heroes.js` is both the 17-class gallery roster and a guide store.
  Highwayman's overview, builds, compositions, trinkets and prose are nested in
  one hero object. Other hero profiles are mostly short summaries.
- `dist/js/hero-abilities.js` contains seven-element positional skill tuples for
  every gallery class. The tuple columns encode name, source ranks, target
  ranks, DMG, ACC, CRIT and a semicolon-delimited effects string. Crusader,
  Highwayman and Plague Doctor additionally have presentation/detail objects.
  Source metadata varies by hero and is often only a URL; missing values use
  the ambiguous string `—`.
- `dist/js/app.js` owns route parsing and presentation. Its ability renderer
  interprets the positional tuples; team and trinket routes derive records from
  Highwayman's nested guide. Some skill descriptions and the same skill's
  targeting/statistics therefore live in separate objects that must be joined
  by display name.
- `dist/js/hero-gallery.js` reads hero role tags, DLC requirements and image
  paths from the roster. Image provenance is recorded separately in
  `docs/content-sources.md`; the supplied character portraits have unresolved
  original-source/reuse terms.
- There was no automated data-integrity command or test directory. Existing
  validation notes document manual/static checks and browser limitations.

The pilot removes Crusader's profile and skill values from these JavaScript
data objects. The JSON record is the one authoritative source for those values;
`content-adapter.js` converts its normalized fields into the renderer's current
in-memory shape. All non-migrated hero and Highwayman team/trinket records stay
where they are for this milestone.

## Canonical files and record model

`dist/data/games/<game-id>.json` is canonical, version-controlled content and
is served directly by the static site. No copy/publish step is needed. The
format is described in [`game-content.schema.json`](game-content.schema.json);
the Crusader pilot is in
[`darkest-dungeon-1.json`](../dist/data/games/darkest-dungeon-1.json).

Each pack contains a namespaced game ID, a version context, a source registry,
and typed entity arrays for heroes, combat skills, camping skills, equipment
progression, trinkets, bosses, enemies, team compositions and strategy
recommendations. Stable IDs use `<game-id>:<entity>`; relationships refer to
IDs rather than display names. Route IDs remain separate so content IDs can be
stable if the site URL changes.

Common records use fields that work across games. A game's own mechanics can
be added as optional namespaced fields or schema extensions; the shared model
does not require ranked combat, stress, camping or Darkest Dungeon status
effects for other games. A pack declares optional mechanics profiles; only the
DD1 ranked-combat profile requires rank and target-rank fields on combat skills.
Equipment levels use generic `values` objects rather than assuming weapon and
armor slots. `versionContext` records game mode, platform, patch and whether the
installed build was actually checked.

Factual fields carry verification status and source IDs. Editorial strategy
text has its own `editorial` field and is not presented as a confirmed game
mechanic. A measured value is numeric plus a unit. Missing or inapplicable
values use `null` with an explicit status; they are never given a verified
status. Skill progression is a separate level list, so an absent upgrade is
not inferred from a level-one value. Hero/trinket requirements keep base game,
DLC and mods in separate fields.

The Crusader pilot preserves the existing seven level-one combat skill values,
targeting modes, effects, prose and overview. Rank arrays replace ambiguous
display strings. The adapter formats those fields for the existing shared
renderer. Progression and all other entity collections are explicitly marked
as unrecorded/empty; no new gameplay values were filled in. Base-stat and
resistance slots demonstrate missing-value representation without inventing
numbers.

## Adding or updating content

1. Add the hero under `heroes` with a stable namespaced ID, a separate
   `routeId`, `requirements`, role/position fields, artwork metadata and a
   `baseStats` record. For unknown stats use `value: null` and status `missing`
   or `not-recorded`.
2. Add each combat skill under `combatSkills`, with a stable ID, `heroId`,
   explicit hero positions, target side/mode/ranks, movement rules, level-one
   measured values, effects, editorial description/tip and progression status.
   Use ranks 1–4 as numbers. `simultaneous` means every listed target rank is
   hit; `choose-one` means the player selects one. Keep movement separate from
   target ranks.
3. Add verified levels 1–5 under `progression.levels` only when sourced. Set
   `status` to `complete` only when all five are present; otherwise use a
   partial/unrecorded state.
4. Add camping skills and equipment progression as distinct records. Define a
   trinket once in `trinkets`, then associate it with hero IDs or a strategy
   recommendation's `trinketIds`; do not copy its effect text into each hero.
5. Add bosses/enemies once and refer to them by ID. Team compositions list four
   hero IDs in starting formation order (rear to front). Recommendations link
   to encounter/item/source IDs and set `editorial` explicitly.
6. Add a source to the pack's `sources` array, then cite its ID in the
   verification object for each factual claim. Record the source title, exact
   URL, kind and access/verification state. Keep artwork provenance and reuse
   status in the artwork record and `docs/content-sources.md`; a local file is
   not proof of permission.
7. Verify campaign mode, platform/patch, DLC and mod scope against a reliable
   source. Do not mark a value `verified` unless the evidence supports that
   claim. Use `reference-checked` when sources were compared but the installed
   game was not tested. Leave uncertain values null and explain the gap.

Run the offline checks from the repository root:

```bash
python3 tools/check_content.py
```

This checks pack/schema JSON syntax, required fields, stable ID uniqueness,
entity/source references, rank and target semantics, progression ordering,
missing-versus-verified values, explicit DLC/mod fields, artwork paths and
source-reference integrity. It uses only the Python standard library and does
not access the network. The schema is documented in JSON Schema form; the
project's checker applies the important semantic rules without an installed
JSON Schema package.

## Static loading and future relational storage

The app fetches the Crusader pack from `dist/data/` through
`dist/js/content-adapter.js` before initializing gallery/search/routes. The
adapter translates only the pilot record for the legacy component. Other hero
records continue to load from the current JS modules until migrated. Since the
pack already lives beneath `dist/`, local static serving and deployment use the
same data file; no generator or backend is required.

The same IDs and references map directly to SQLite later: `games`,
`version_contexts`, `sources`, `heroes`, `combat_skills`, level/effect child
tables, `camping_skills`, `equipment_progressions`, `trinkets`, `bosses`,
`enemies`, `team_compositions` and `strategy_recommendations`. Join tables
represent hero/trinket, composition/member and record/source relationships.
Foreign keys preserve current IDs; verification status and version context
remain explicit columns/relations. JSON remains easy to export for the static
site, so a database migration is optional rather than a prerequisite.

## Darkest Dungeon boss index

Boss records live in the existing `dist/data/games/darkest-dungeon-1.json`
pack under `bosses`; this is the single source of truth for the collection,
detail pages, and global search. Stable boss IDs are namespaced by game, while
`routeId` is the readable URL segment. `categoryIds` control the index groups,
`regionIds` point to the pack's `regions`, and DLC requirements refer to stable
IDs in `dlcs`. `versionContextId` records the campaign context for each entry.

`guideStatus` is either `available` or `in-development`. Only available guides
include mechanics, variants, attacks, tactical considerations, and
`guideVerification`; each factual item carries its own verification/source
references. Tactical considerations are explicitly editorial. Related heroes
use the current hero route IDs. Related compositions use canonical IDs and are
left empty unless the matchup has actually been documented. A summary in an
in-development record only identifies and locates the encounter; it is not a
claim that the detailed guide is verified.

The current pack includes 26 encounters from the cited Darkest Dungeon boss
index, grouped into the base regions, wandering and event encounters, Courtyard,
Farmstead, and spoiler-sensitive Darkest Dungeon encounters. The official wiki
listing includes Garden Guardian while Hintbook's index currently lists one
fewer entry; the Garden Guardian is retained with the wiki.gg reference. The
2026 Fire's Edge DLC is outside the scope of these references and has not been
assessed. No boss portrait files were present, so pages use original CSS-only
atmospheric placeholders; these are presentation and are not game artwork.

Use the offline command above to check boss IDs, route IDs, category/region/DLC
and version-context references, related hero/composition IDs, local paths,
verification states, and source integrity. The browser routes resolve only
bosses in this pack, so an in-development record has a real identity page while
clearly withholding unresearched guide content.
