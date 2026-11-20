# Arms Warrior Level 1–60 Content Completion Audit

Audit date: 2026-11-20  
Scope: existing Warrior Guide data and rendering paths, with Arms as the selected specialization. This is a content audit only; no gameplay implementation was changed.

## Summary

The Arms guide has a complete, tested automatic talent point order from levels 10–60 and a useful set of level-aware Warrior systems. It is not yet a complete Arms-specific leveling reference. The largest gameplay gaps are the thin level 30–60 gear coverage, broad dungeon recommendations whose detail is missing for many instances, and the incomplete joins between shared Warrior gear and the Dungeons tab. Zones, equipment, stats, and professions also mix Arms-specific recommendations with Warrior-wide or level-60 material.

The existing coverage must not be read as a proof that a bracket is fully researched. An empty record means the project does not currently retain a verified recommendation there.

## Completion checklist

- [x] Automatic Arms point allocations exist for every level 10–60 (51 allocations) and are checked by regression tests.
- [x] The Stats tab has an Arms-specific level-60 PvE priority order and shared Warrior attribute explanations.
- [x] Arms has an equipment guide, plus shared Warrior equipment records filtered for Arms eligibility.
- [x] Level filtering exists for shared Warrior zone and dungeon ranges; Arms has seven explicit milestone entries.
- [x] Detailed dungeon preparation and faction-filtered quest records exist for a subset of dungeons.
- [x] Combat priorities, opener guidance, ability descriptions, local icons where matched, and Rage guidance exist for Arms, Fury, and Protection.
- [x] Profession pairings, general rank gates, camp benefits, and a crafted Arms weapon example are present.
- [ ] An Arms-specific, level-banded equipment path covering the requested gear slots and all 10–60 brackets is not present.
- [ ] Level-by-level or bracket-level Arms quest and zone routes are not retained.
- [ ] Detailed dungeon preparation, Arms-specific drops, and quest coverage are not complete across the 35 listed level ranges.
- [ ] Crafted Warrior equipment progression and recipe/material acquisition are not documented beyond one example.
- [ ] Source freshness and source-level validation are not consistently reflected in the stored Arms guide metadata.

## Findings by section

### 1. Automatic Arms talent progression

**Implemented and working:** `dist/data/games/world-of-warcraft-forever-guided-builds.json` contains one Arms build marked complete for levels 10 through 60, with 51 point allocations. The companion resolves it against the local Warrior talent catalog. The test suite checks the point order and validates it at every level; the Warrior route test also renders the automatic allocation at selected levels. The build is explicitly stored separately from the Arms leveling guide's talent advice, whose source order differs.

**Incomplete or missing:** No point allocations exist below level 10, consistent with the project’s normal talent-point start. The dataset has no respec events or extra per-level explanatory note in this build record. This does not block the leveling guide, but players receive the allocation more than the reasoning behind every transition.

**Specificity and verification:** This is the strongest Arms-specific section. Its coverage metadata says `complete`; keep that claim scoped to the recorded automatic point order, not to the rest of the Arms guide.

### 2. Stats and attributes

**Implemented and working:** `statsGuide.priorities.arms` gives an explicit level-60 PvE starting order: Weapon DPS, Hit Chance, Expertise, Critical Strike, Strength. The shared guide records 11 attribute explanations, includes target-level context, and advises comparing weapon DPS, per-swing damage, and other stats together.

**Incomplete or missing:** There are no numerical stat weights and no Arms leveling priorities by bracket. The priority is explicitly a level-60 PvE starting order, not a universal leveling order. Hit and Expertise explanations are framed around level-63 raid targets, so they are not leveling caps. Generic Warrior explanations are shown alongside it; the shared Armor/Defense/Block explanation is tank-focused and is not Arms-specific.

**Coverage:** The Arms-specific ordering covers endgame PvE context only. Levels 1–59 have no Arms-specific stat progression data.

### 3. Weapons, armor, shields, and accessories

**Implemented and working:** The Arms-specific equipment guide has five named records:

| Item | Recorded source or requirement | Coverage note |
| --- | --- | --- |
| Heavy Copper Maul | Blacksmithing; character level 11 and skill 80 in profession data | Only retained craft example |
| Strike of the Hydra | Blackfathom Deeps; required level 26 | Named dungeon weapon |
| Corpsemaker | Razorfen Kraul; required level 29 | Named dungeon weapon |
| Defender of Dalaran | Alliance quest reward in City of Dalaran; item requirement not listed | Quest item, not a guaranteed upgrade |
| Heavehammer | Wetlands excavation quest rewards; item requirement not listed | Quest item, not a guaranteed upgrade |

The broader `warriorEquipment.items` dataset adds 34 Warrior records. Twenty-nine are marked eligible for Arms, although most are shared Warrior recommendations rather than Arms-specific judgments. The current level-aware equipment tab presents these alongside the five Arms-guide items. Shield records are Protection-only, consistent with the Arms guide’s two-handed focus.

**Level-range gaps:** The five Arms-specific records cluster around level 11 and the mid-to-late 20s; there are none recorded above level 29. Shared Arms-eligible records are unevenly distributed: nine in 10–20, thirteen in 20–30, one in 30–40, one in 40–50, and four in 50–60, plus one item without a bracket. Shared counts are not Arms-specific recommendations. In particular, 30–40 and 40–50 have only a necklace and ring respectively; 50–60 has a waist item and level-50 class-quest rewards, with no Arms-specific item route. Several shared rewards have a known quest/source start but no item requirement, and Seal of Wrynn has neither a retained requirement nor an availability level.

**Incomplete or missing:** The data does not provide a sourced Arms armor/accessory upgrade path by slot and bracket. A missing item does not mean no upgrade exists. The Arms guide itself says it has no level-specific armor list and no numerical leveling stat weights. The broader Warrior record fills some early slots, but its shared eligibility should not be presented as Arms-specialized optimization. There is no Arms shield recommendation; existing shield records are filtered to Protection.

### 4. Leveling zones, quests, and milestones

**Implemented and working:** The shared Warrior leveling data retains 42 faction/contested zone ranges spanning levels 1–60 and 35 dungeon level ranges. The Leveling tab filters current and upcoming options by selected level and faction. The Arms data includes seven milestones at levels 10, 12, 20, 30, 36, 38, and 40.

**Incomplete or missing:** Arms’ own zone lists name places by faction but do not retain level bands; the data explicitly warns that the source’s exact level-sensitive zone choices were not preserved. The rendered level ranges come from shared Warrior zone data, not an Arms-specific route. Arms milestone coverage stops at level 40. The records cover class stance quests at 10 and 30 but do not retain the exact quest names, quest givers, steps, or faction-specific path in the Arms progression data. The project’s general class-quest guide source is present, but that does not make the full quest chain data available to the tab.

**Coverage:** Existing global ranges provide useful options at most levels, but the class-specific guide has insufficient milestone and route coverage from 41–60. Exact Arms quest and zone recommendations by bracket are not verified in the retained data.

### 5. Dungeons, bosses, drops, and dungeon quests

**Implemented and working:** The Warrior leveling list provides 35 dungeon ranges, including level 58–60 instances. Dungeon preparation switches between Arms DPS, Fury DPS, and Protection tank advice. Seven dungeons have detailed preparation records with location/entrance and quest data. Five of those have nonempty recorded quest lists; Blackfathom Deeps and Excavation Site: Wetlands have no quest records in this dataset, which must be treated as a data gap rather than proof that they have no quests.

The `warriorPreparation.equipmentDrops` catalog contains 12 records, but none is marked for Arms. A separate Arms-specific path in `buildWarriorDungeonPreparation` derives links from the five Arms gear records by matching their acquisition text to dungeon names. This currently connects four of the five Arms gear-guide items to dungeon recommendations: Strike of the Hydra, Corpsemaker, Defender of Dalaran, and Heavehammer. Heavy Copper Maul is correctly a crafted item and not a dungeon drop.

**Equipment-to-dungeon gap:** The dungeon renderer’s Arms-specific matcher only reads `specializationGuides.arms.sections.gear.equipmentGuide.items`. It does not read the 34 shared `warriorEquipment.items`. Therefore shared dungeon-sourced Warrior armor and accessories can appear in Weapons & Gear but are not discoverable from the corresponding Dungeons cards. This is a confirmed cross-tab connection gap. The current substring-based matching is also sensitive to inconsistent dungeon names and does not provide a canonical item-to-dungeon relationship.

**Incomplete or missing:** Only 13 of the 35 level-range dungeon names match a detailed dungeon-preparation or canonical dungeon record; 22 have a range but no matched detail/location record in the current datasets. High-level dungeon recommendations therefore lack reliable entrance, quest, boss, and Arms-drop detail. Quest data is filtered by faction when present but is not Arms-specific. The dungeon item-drop list has no Arms-labeled records, and the four derived Arms links are incidental matches from gear acquisition prose rather than explicit dungeon relationships.

### 6. Combat priorities, abilities, and Rage

**Implemented and working:** `warriorCombat` has separate Arms single-target, multiple-enemy, defensive, opener, and Rage-management content. The companion uses the selected level and specialization, resolves ability descriptions from `spellDescriptions`, derives unlock levels from their recorded “Learned at level” values, mutes locked abilities, highlights current-level unlocks, and uses exact-name local talent/class icons where available. Ability descriptions are expandable. The UI calls these priorities, not fixed rotations.

**Incomplete or missing:** Coverage is practical source-backed leveling advice, not a complete optimized Arms combat reference. It does not model actual current Rage, target health, procs, cooldown state, enemy count beyond the section, weapon speed, or party/tank context. Some descriptions or unlock levels can be unavailable when the optional client catalog is not loaded; the UI then uses an honest missing-description/unlisted-level fallback. The guide sources are retained as IDs in data but generic citations are omitted from the Warrior tab UI, so players cannot inspect the evidence from this section itself.

**Specificity:** Arms has its own priority content. Some abilities and fundamentals (Battle Shout, Rage generation, stance tradeoffs, defensive utility) are class-wide, while the Arms-specific order centers on Rend, Overpower, Slam, Mortal Strike, Sweeping Strikes, and conserving Rage for interrupts and the next pull.

### 7. Profession progression and crafted equipment

**Implemented and working:** Profession data includes four generic profession pairings, four rank gates, three camp benefits, two secondary-profession entries, and one craft example: Heavy Copper Maul. The companion can display character/skill gates and pairing tradeoffs. The content explicitly says profession choice is not an Arms requirement and does not claim spec-specific differences.

**Incomplete or missing:** The sole equipment recipe example is level 11 Heavy Copper Maul. Its recipe materials and recipe-acquisition details are null. There is no Arms-relevant crafted weapon or armor progression for levels 20–60, and no level-banded recipe path, material list, trainer/recipe source, or comparison against the named dungeon/quest gear. The profession combinations and camp benefits are Warrior-wide rather than Arms-specific.

## Highest-priority gaps

1. **Repair item discovery across Gear and Dungeons.** Give existing shared gear records canonical dungeon/source relationships and confirm their visibility from the matching dungeon cards. The Dungeons data currently has 12 non-Arms-labeled equipment drops and only four Arms links derived from item prose.
2. **Research Arms gear for levels 30–60 by slot.** Coverage falls sharply after level 29. Research only supported candidates and retain explicit empty states for uncovered brackets/slots; do not fill a coverage quota with guesses.
3. **Complete Arms dungeon preparation.** Reconcile the 35 level ranges with canonical details, entrances, faction quests, bosses, and sourced Arms items. Prioritize dungeons where a verified weapon or armor upgrade/quest already exists in the project.
4. **Retain Arms route and class-quest detail.** Preserve exact verified zone level bands and exact class quest names, start requirements, faction paths, and unlock/reward links where sources support them, particularly 41–60.
5. **Extend crafting progression with evidence.** Add recipe, character-level, skill, material, and acquisition information only when sourced; connect each crafted item to the Gear record and relevant profession step.
6. **Clarify context and freshness for Stats/Combat.** Keep level-60 raid-target stat notes clearly separate from leveling; refresh source dates and retain per-section provenance so users can inspect the basis for advice.

## Suggested small implementation milestones

| Milestone | Deliverable | Likely files |
| --- | --- | --- |
| 1. Explicit Gear ↔ Dungeon relationships | Add stable dungeon/item links to existing sourced records; use IDs rather than parsing acquisition prose; add tests that each rendered link resolves and respects specialization/faction. | `dist/data/games/world-of-warcraft-forever.json`, `dist/data/games/world-of-warcraft-forever-dungeon-prep.json`, `dist/js/wow-leveling-companion.js`, `tests/encyclopedia.test.mjs` |
| 2. Arms 30–60 equipment research | Add only researched Arms candidates with item tooltip facts, requirements, acquisition, and source attribution; preserve per-slot/bracket empty states. | `dist/data/games/world-of-warcraft-forever.json`, `dist/js/wow-leveling-companion.js` if new grouping is needed, `tests/encyclopedia.test.mjs` |
| 3. Dungeon detail coverage by level band | Match/add verified canonical detail for missing dungeon ranges, then add faction quest and boss/drop records; do not infer a missing quest from an empty list. | `dist/data/games/world-of-warcraft-forever-dungeon-prep.json`, `dist/data/games/world-of-warcraft-forever.json`, `dist/js/wow-leveling-companion.js`, `tests/encyclopedia.test.mjs` |
| 4. Arms leveling route and class quests | Store source-backed Arms zone bands and quest chain records; expose exact unlock/start levels and faction distinctions, with “not recorded” where absent. | `dist/data/games/world-of-warcraft-forever.json`, `dist/js/wow-leveling-companion.js`, `tests/encyclopedia.test.mjs` |
| 5. Crafted gear progression | Add verified recipe records and tie crafts to equipment candidates and skill/level gates; retain explicit unknown materials or recipe acquisition when sources omit them. | `dist/data/games/world-of-warcraft-forever.json`, `dist/js/wow-leveling-companion.js`, `tests/encyclopedia.test.mjs` |
| 6. Stats/source provenance review | Refresh Arms source metadata and label the level-60 raid context separately from leveling advice; keep source details available in structured data. | `dist/data/games/world-of-warcraft-forever.json`, `dist/js/wow-leveling-companion.js`, `tests/encyclopedia.test.mjs` |

These are proposed future milestones only; no gameplay changes were made for this audit.

## Source and validation notes

- Arms reference: [Icy Veins Arms Warrior Leveling Guide](https://www.icy-veins.com/wow-forever/arms-warrior-leveling). The live page reports an update on 2026-11-16, while the stored `icy-arms-leveling` source record says 2026-11-04; refresh metadata when content is next reviewed.
- Automatic build source: `wow-forever-outpost-arms-leveling-2026-11`, stored in `dist/data/games/world-of-warcraft-forever-guided-builds.json`.
- Dungeon source records include the Forever dungeon index and the seven records in `dist/data/games/world-of-warcraft-forever-dungeon-prep.json`.
- `python3 tools/check_content.py` checks the structured Darkest Dungeon content pack; it does not validate WoW equipment coverage or Gear-to-Dungeon joins. The Node suite tests selected behaviors and data consistency but does not certify that the 1–60 Arms content set is complete.
