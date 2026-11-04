# Ruins regional guide v2

The Ruins detail route opts into a reusable `regionalGuide` record on the location. Other regions retain the existing layout. `dist/js/region-guide.js` renders this record with the existing artwork resolver, requirement labels and boss-team portrait cards. Gameplay copy remains in the content pack. Section buttons focus their destination without changing the application's hash route; reduced motion uses instant scrolling.

The header renders the existing authentic Ruins banner once. Enemy and curio cards request existing local thumbnails and retain labeled fallbacks. Five new curio records have metadata-only missing-art entries; no private artwork was copied, edited, or added. Two-column cards collapse to one column below 950px. Native disclosures keep detailed enemy mechanics, sources and conditional encounters available without making them dominate the page.

## Content and classification

- Preparation covers rear-rank threats, damage considerations, Champion corpse management, and provision interactions with reasons and references. Hero links illustrate capabilities, not a newly endorsed four-hero composition.
- All 20 existing Ruins enemy associations appear once, in editorial priority, Veteran/Champion, or common/shared groups. Bone Bearer is corrected to Champion-only, with Wicked Surge, Defend the Icon and Unholy Rally replacing the erroneous drum abilities.
- Five additional Ruins curios: Decorative Urn, Confession Booth, Locked Sarcophagus, Sarcophagus and Suit of Armor. Holy Fountain now records both Holy Water and bare-hand outcomes. Existing supply records link back to the new curios.
- The Brigand Pounder association is corrected to Weald only, including removal from the other locations' boss lists. This also corrects Expedition Planner options through shared data, without changing planner code.
- Necromancer and Prophet are separated from conditional wandering encounters. The latter retain their individual DLC labels. Incomplete boss mechanics remain visibly incomplete.
- No general-purpose Ruins team is endorsed. The three existing, reference-checked Necromancer teams remain explicitly boss-specific, with portraits, ranks, strategy and requirements. Regional team classification requires an explicit regional association and verification, never an inference from hero composition.

## Sources and uncertainty

Checked on 2026-11-04 using indexed reference extracts (direct page opens returned HTTP 403):

- [Ruins reference](https://darkestdungeon.wiki.gg/wiki/Ruin): regional damage considerations and enemy roster. Preparation priorities are labeled editorial.
- [Bone Bearer](https://darkestdungeon.wiki.gg/wiki/Bone_Bearer): Champion-only spawning, support abilities and corpse resurrection. Conflicting start/end-of-round wording in the source was not resolved; the guide intentionally does not assert exact resurrection timing.
- [Curio data module](https://darkestdungeon.wiki.gg/wiki/Module:Curios/Data) and [curio table](https://darkestdungeon.wiki.gg/wiki/Curios): item/outcome mappings. Loot pools are summarized, not promised item drops. No exact expedition supply quantities are prescribed.
- [Brigand Pounder](https://darkestdungeon.wiki.gg/wiki/Pounder): Weald association.

This is a curated reference, not a complete encounter distribution. Numeric enemy weaknesses/resistances, some shared curios, and detailed Prophet/wandering-boss strategies remain missing. Unlisted curio interactions are unassessed, not presumed harmful. Current game-patch behavior has not been tested. Do not infer safety from an absent warning.

## Extending another region

Add the optional `regionalGuide` object to its location using the documented schema. Supply sourced introduction/preparation copy, stable enemy group IDs covering each regional enemy once, and explicit verified general-team IDs (or an empty list). Reuse existing canonical associations and artwork metadata. The content validator checks group completeness, hero links and team suitability. Do not copy Ruins-specific mechanics to another region.

Validation: content validator, 53 Node VM tests, and `git diff --check`. Tests cover associations, curio links and outcomes, boss/team classification, one main artwork, missing-art fallbacks, internal routes, and responsive CSS rules. No actual browser layout or interaction test was performed for this milestone.
