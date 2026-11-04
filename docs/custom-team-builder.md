# Custom Boss Team Builder v1

Open Expedition Planner → Build My Own Team. The five sections are on one page, independently of predefined team recommendations. Choose a boss and supported campaign tier, then fill ranks 4 → 1. Selecting an existing party member swaps the entire loadout. The expedition roster annotates unavailable heroes without hiding them.

`dist/js/custom-team.js` contains the selection and analysis functions, storage adapter, and builder renderer/controller. `dist/js/app.js` connects these to the existing portraits, boss reminders, roster, routing, and trinket collection. `dist/css/styles.css` adds responsive controls using the existing dark/crimson panels. `tests/encyclopedia.test.mjs` tests the data rules, persistence failure paths, and existing routes.

Structured combat-skill IDs are used where available. Older hero-reference rows get explicit reference IDs and incomplete-validation warnings. Rank checks describe starting positions, not a combat simulation. Abomination transformation rules are explicitly unmodeled. No upgrade values, scores, or new boss strategies are generated. Trinket class restrictions are distinct from hero recommendation associations. Boss advice and alternatives come from existing records.

The existing ownership key remains intact. Optional quantities use `bm-gaming-wiki-trinket-quantities-v1`; an owned item without a quantity counts as one copy. Zero unmarks ownership. Custom equipment cannot allocate unrecorded copies or incompatible classes. Reducing a quantity later leaves the draft intact and reports a conflict. The same trinket cannot occupy both slots of a single hero.

Named drafts use `bm-gaming-wiki-custom-teams-v1` with stable UUIDs. Save changes replaces that record. New composition starts a separate draft. Delete removes the saved record while retaining the current editable draft. Incomplete drafts can be saved; warnings are recalculated when loaded, including stale hero, boss, skill, trinket, or difficulty references. Failed storage access/writes fall back to session memory with a visible notice. Builds never enter public game data.

Validation: content validator, Node VM tests, and whitespace checks. A headless Brave smoke check exercised boss/tier selection and the Wilbur warning, four-hero selection and swaps with skill retention, copy allocation and reduction conflicts, save/reload/load/delete, and a 390px viewport overflow check. This is not exhaustive visual or assistive-technology testing.
