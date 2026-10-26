# Gaming Wiki

A personal gaming wiki with public source code and a locally hosted website.
The current Darkest Dungeon 1 content includes a hero gallery, a reusable
Highwayman guide, team compositions, and trinket recommendations. Shared page
components and game configuration are designed to support more games over time.

## Local preview

From the project root, serve **only `dist/`**:

```bash
python3 -m http.server 8001 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8001. Stop the server with **Ctrl+C**. Reuse an existing
server if it is already serving this project's `dist/` on that address; do not
start a duplicate. If another application owns the port, do not stop it blindly.
Use HTTP rather than opening `index.html` directly: the page uses JavaScript
modules. There are no dependencies, install commands, frameworks, or build step.

## Files

```text
AGENTS.md                    Project rules and Git authorization
README.md                    Project overview, usage, and extension instructions
.gitignore                   Temporary files, OS clutter, local secrets, logs
docs/
  content-sources.md         Fact references, image origins, verification limits
  validation.md              Checks performed and remaining manual checks
dist/                       The entire locally served website
  index.html                 Semantic page shell, navigation, module entry point
  css/styles.css             Charcoal/crimson palette and responsive layout
  js/heroes.js               Hero, build, party, trinket, and source data
  js/games.js                Per-game theme key and category/navigation config
  js/app.js                  Shared views, collections, search, and hash router
  assets/images/
    darkest-dungeon/
      highwayman-idle.gif       Highwayman portrait (31-frame idle animation)
      focus-ring.png            Focus Ring icon (36 × 72)
      gunslingers-buckle.png    Gunslinger's Buckle icon (36 × 72)
    hero-placeholder.svg      Portrait fallback for other heroes
    charm-placeholder.svg     Reckless Charm fallback
    stone-placeholder.svg     Damage Stone fallback
    ledger-mark.svg           Original decorative site favicon
```

## How it works

`index.html` loads `app.js` as an ES module. The shared renderer imports hero
and source data from `heroes.js`, plus category labels, icons, routes, and a
theme key from `games.js`. The same guide template serves each hero; the game
configuration supplies its sidebar without adding game-specific markup to the
global header. Team composition records provide a reusable summary and detail
view. Content strings are HTML-escaped before rendering.

| Route | View |
| --- | --- |
| `/` (no hash) or `#home` | Gaming Wiki home and game cards |
| `#game/darkest-dungeon` | Darkest Dungeon landing page |
| `#game/darkest-dungeon/heroes` | Hero gallery |
| `#game/darkest-dungeon/teams` | All current team compositions |
| `#game/darkest-dungeon/teams/steady-expedition` | A steady expedition details |
| `#game/darkest-dungeon/teams/rotating-middle` | A rotating middle details |
| `#game/darkest-dungeon/trinkets` | All current trinket recommendations |
| `#hero/highwayman/overview` | Highwayman guide |
| `#hero/highwayman/builds`, `/teams`, `/trinkets` | Hero-specific sections |
| `#heroes` | Preserved alias for the hero gallery |

These are hash routes in one static page, so the Python server needs no rewrite
rules. The brand links home. Only Darkest Dungeon has an available game card;
the other three cards are non-link articles labeled Coming soon. Breadcrumbs
show the hierarchy. Global Teams and Trinkets use the same content renderers as
the hero guide but display independent collections, without opening hero tabs.

Hash changes support direct links and browser Back/Forward. Navigation updates
the title and heading focus. Re-activating the current link returns to its heading.
Unknown pages have a home link. Guide sections remain visible together, and
Sources uses a native disclosure. There is no backend, storage, analytics,
external font, or runtime image download.

## Add another hero in a later milestone

1. Add an entry to `heroes` in `dist/js/heroes.js` using Highwayman's shape.
   Give it a unique lowercase URL-safe `id`, name, summary, role, positions,
   portrait, and requirements. Omit `guide` for a non-clickable gallery entry.
2. For a complete guide, supply strengths, weaknesses, position advice, builds,
   teams, trinkets, verification notes, and source IDs. Each build selects four
   combat skills. Team `members` are ordered **4, 3, 2, 1**, rear to front.
3. Keep requirements explicit: `{ baseGame: true, dlc: [], mods: [] }`. List
   actual DLC names in `dlc` and actual mod names in `mods`; do not combine them
   into an ambiguous "extra content" label. Teams and trinkets have their own
   requirements. Current content requires no DLC or mods.
4. Add permitted local images under `dist/assets/images/`. Record each image's
   origin and reuse permission in `docs/content-sources.md`. Until permission is
   established, keep a labeled placeholder with `placeholder: true` and useful
   alternative text. Set it to `false` only when genuine artwork replaces it.
5. Record references and verification limits, then repeat the checks in
   `docs/validation.md`. No per-hero HTML page or renderer change is needed.

## Navigation and theme milestone

The home page offers a compact Choose your game grid. Darkest Dungeon leads to
Heroes, Team Compositions, and Trinkets. Darkest Dungeon II, WoW: Forever, and
League of Legends are non-interactive Coming soon cards; no empty pages exist.
The Darkest Dungeon menu is visible only within that game's views. Hero pages
keep Overview, Builds, Teams, and Trinkets navigation separately from the menu.
The category sidebar is built from `games.js`: available routes link to existing
views, while Bosses, Enemies, Curios, Locations, and Quests are labeled Coming
soon and are not interactive. Its mobile menu is a keyboard-operable disclosure.
The Darkest Dungeon landing search indexes only current hero, build, team, and
trinket records. Team collections and featured cards lead to individual details;
no tier or location assessment is shown as a fact where the project has none.

The charcoal palette uses named custom properties in `styles.css`: background,
panel, text, muted text, borders, accent fill/text/surface/hover, image background,
and focus ring. `games.js` selects a theme key per game; its scoped CSS rule sets
the game accent tokens. Add a theme configuration and matching scoped CSS tokens
for another game's colors. Paragraphs remain neutral, with crimson reserved for
Darkest Dungeon navigation and restrained highlights.
The short transitions and entry fade are disabled for reduced-motion preferences.

The Highwayman idle animation, Focus Ring icon, and Gunslinger's Buckle icon now
use existing local image files. Their original source and reuse permission remain
unverified and are recorded as such. Reckless Charm and Damage Stone still use
their labeled placeholders. The animated portrait switches to a text alternative
when reduced motion is preferred. Small item icons preserve their 36 × 72 size.

## Completed and remaining

Completed: a game-selection home page, Darkest Dungeon landing page with indexed
search, responsive category sidebar, Coming soon categories, independent
Teams/Trinkets collections, detailed routes for both current compositions,
breadcrumbs, one-hero gallery, reusable guide, and Overview/Builds/Teams/Trinkets
navigation, preferred and alternative positions, two four-skill builds, two
explained party formations with positions, portraits where locally available,
skills, strategies, strengths, limitations, and opening priorities, and four
trinket recommendations with numerical
effects, drawbacks, and accessible alternatives. The layout includes mobile
breakpoints, visible focus indicators, a skip link, and labeled illustrations.

Remaining image placeholders: Reckless Charm and Damage Stone icons use labeled
SVGs. Vestal, Plague Doctor, Crusader, and Hellion party portraits are labeled
unavailable. Highwayman, Focus Ring, and Gunslinger's Buckle source attribution
and reuse conditions remain unverified. Team tiers and dungeon suitability are
not assessed. Bosses, Enemies, Curios, Locations, and Quests remain unavailable.
Mechanics and item values were checked against published references; no installed-game or patch-specific
verification was available. Tactical advice is editorial, not playtested.
Browser-level visual, keyboard, and runtime checks remain unperformed because
this execution environment blocked browser startup and local sockets; see the
validation log. Additional heroes and features are outside this milestone.

## Authorized Git workflow

After each small, completed, validated improvement, review the diff, stage only
relevant files, create a descriptive commit, and push to this project's existing
`origin`. Never commit secrets, private data, or unrelated changes. Never
force-push. Report the exact blocker if Git or network permissions prevent an
operation. Explain changed files, validation, and how the code works after each
milestone. **Website deployment remains out of scope.**
