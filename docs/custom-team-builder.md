# Custom Boss Team Builder v2

Open Expedition Planner → Build My Own Team. The five sections are on one page, independently of predefined team recommendations. Choose a boss and supported campaign tier, then fill ranks 4 → 1. Selecting an existing party member swaps the entire loadout. The expedition roster annotates unavailable heroes without hiding them.

`dist/js/custom-team.js` contains the selection and analysis functions, storage adapter, and builder renderer/controller. `dist/js/app.js` connects these to the existing portraits, boss reminders, roster, routing, and trinket collection. `dist/css/styles.css` adds responsive controls using the existing dark/crimson panels. `tests/encyclopedia.test.mjs` tests the data rules, persistence failure paths, and existing routes.

Structured combat-skill IDs are used where available. Older hero-reference rows get explicit reference IDs and incomplete-validation warnings. Rank checks describe starting positions, not a combat simulation. Abomination transformation rules are explicitly unmodeled. No upgrade values, scores, or new boss strategies are generated. Trinket class restrictions are distinct from hero recommendation associations. Boss advice and alternatives come from existing records.

The existing ownership key remains intact. Optional quantities use `bm-gaming-wiki-trinket-quantities-v1`; an owned item without a quantity counts as one copy. Zero unmarks ownership. Custom equipment cannot allocate unrecorded copies or incompatible classes. Reducing a quantity later leaves the draft intact and reports a conflict. The same trinket cannot occupy both slots of a single hero.

Named drafts use `bm-gaming-wiki-custom-teams-v1` with stable UUIDs. Save changes replaces that record. New composition starts a separate draft. Delete removes the saved record while retaining the current editable draft. Incomplete drafts can be saved; warnings are recalculated when loaded, including stale hero, boss, skill, trinket, or difficulty references. Failed storage access/writes fall back to session memory with a visible notice. Builds never enter public game data.

V1 validation: content validator, Node VM tests, and whitespace checks. A headless Brave smoke check exercised boss/tier selection and the Wilbur warning, four-hero selection and swaps with skill retention, copy allocation and reduction conflicts, save/reload/load/delete, and a 390px viewport overflow check. This is not exhaustive visual or assistive-technology testing.


## Smart team review

Review My Team groups only relevant findings into critical encounter warnings, skill/position problems, equipment conflicts, missing information, and tactical reminders. Native disclosure controls let players collapse a group without deleting its findings. Unchanged groups retain their collapsed state when editing; changed problem groups reopen. The full selected loadout is available in a separate disclosure below the review.

Rank problems name the hero, skill, starting rank, and recorded required ranks. Equipment checks name the assigned heroes and items, distinguish class restrictions from guide associations, and link compatible, reference-checked alternatives documented in the selected boss’s team guides. Requirements are reported separately for DLC and mods. Since active DLC/mod settings are not stored, the review requests confirmation rather than claiming an item is unavailable.

Swine warnings rely on the stored, reference-checked Wilbur retaliation and rank-4 formation mechanics. Explicit activation of Riposte triggers a skill warning even when repositioning would be needed to use it. Damaging simultaneous or random targeting that includes rank 4 gets a warning; chosen single targets get an aiming reminder. Unknown targeting or damage is not treated as evidence that a skill hits Wilbur. These checks do not simulate changes to the encounter formation.

Coverage uses typed categories and targets for attacks, healing, and defense, with older references labeled as incompletely validated. It reports starting-rank availability, not effectiveness or healing sufficiency. The Necromancer rear-reach check distinguishes unknown coverage from a confirmed recorded gap. Existing sourced boss advice stays labeled as editorial advice. No new game facts, counters, scores, or upgrade values were added.

V2 keeps the v1 storage keys, stable build IDs, skill reference IDs, and ownership quantities unchanged. Review is read-only. Focused VM tests cover rank conflicts, missing data, class/copy/DLC findings, Wilbur targeting and Riposte, links, rendering, and loading existing v1 records without modification. V2 has not been tested in a real browser.
