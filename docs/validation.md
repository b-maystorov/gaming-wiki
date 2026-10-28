# Validation log

## Structured content pilot — 2026-10-28

- `python3 tools/check_content.py` passed offline: required fields, namespaced
  unique IDs, references, rank/target constraints, progression shape, explicit
  DLC/mod fields, local image paths, and missing-versus-verified values.
- Fault-injection checks confirmed rejection of a duplicate ID, dangling hero
  reference, null value marked verified, rank 5, and a missing image.
- The pack and schema both parsed as JSON. The installed `jsonschema` package
  validated the Crusader pack against `docs/game-content.schema.json`.
- Compared the seven migrated skills with the pre-migration `HEAD` data:
  skill names, hero positions, target ranks/modes, level-one DMG/ACC/CRIT
  formatting, and rendered effect strings matched. No values were added.
- Reviewed the adapter's app initialization order, gallery/render dependencies,
  static asset URL, route IDs, and fallback behavior. No other hero record,
  composition, trinket, or theme was migrated.
- `git diff --check` passed. No packages or network access were needed.

The existing preview at `http://127.0.0.1:8001` refused the connection, and no
browser or JavaScript runtime is available in this environment. The server was
not started, stopped, or replaced. Browser rendering, route interaction,
browser Back/Forward, console errors, and actual fetch/adapter execution remain
unverified. The static files and references were checked locally.

## Highwayman image integration

- Verified the three original files with Pillow: GIF 175 × 301 px, 31 frames,
  palette transparency; Focus Ring PNG 36 × 72 px RGBA; Gunslinger's Buckle
  PNG 36 × 72 px RGBA. Opened all three and visually confirmed their identity.
- Confirmed organized local paths exist and image decoders can load them. Existing
  data descriptors now point at those paths; remaining two item icons continue
  to use their labeled placeholders.
- Confirmed the reduced-motion markup pairs the animated image with an accessible
  text alternative, with CSS to hide the GIF and show the alternative under the
  media preference. CSS source was inspected; browser media-query rendering
  could not be exercised here.
- Original download URLs and reuse terms were not supplied with the images and
  remain explicitly unverified in `content-sources.md`.
- Browser image loading, mobile rendering, keyboard and screen-reader behavior
  remain limited by the previously recorded browser startup and loopback socket
  errors. File decoding, paths, data references, and responsive CSS source were
  checked locally.

## Home, game navigation, and charcoal theme — 2026-10-26

### Passed checks

- Read AGENTS.md and inspected the existing website and image-attempt records.
  Compared `heroes.js` to a pre-edit snapshot: gameplay data is byte-for-byte
  unchanged. Still one hero, two four-skill builds, two parties, and four items.
- Ran production JavaScript renderers and routing in the system JavaScriptCore
  engine with a minimal DOM stub. Only the module import/export declarations
  were removed for that harness; no dependencies were added to the project.
- Checked the root/home view, game landing, Heroes, global Teams, global Trinkets,
  all four hero sections, unknown routes, and the legacy `#heroes` alias.
- Confirmed global Teams renders two compositions and global Trinkets renders
  four items, with no hero-section navigation automatically opened. Hero pages
  retain all four guide sections and remain within the Heroes game-menu item.
- Checked three Coming soon cards are articles without links. Followed every
  rendered internal destination through the route parser; none led to a missing
  page. Checked active navigation, breadcrumbs, heading focus, scroll requests,
  skip-link handling, and repeated activation of the current route.
- Replayed a sequence of prior hashes in reverse and forward order; content and
  navigation state restored correctly. This is route-history logic testing,
  **not a real browser Back/Forward test**.
- Parsed all seven rendered view types for unique IDs, valid label references,
  nonempty image alt text, valid local asset paths, and no inline styles/events.
- Existing local SVGs parse with an SVG root element; they are not HTML error
  pages. No real game-image files were downloaded, so real-asset decoding and
  visual identity confirmation cannot be claimed.
- Calculated neutral/accent text contrast: **7.78:1–16.22:1** across the relevant
  background/panel/selected fills. Button text: **7.35:1**, hover **5.76:1**.
- Inspected flexible card/menu grids, small-screen wrapping, intrinsic image
  proportions, the small-icon cap, visible focus states, and reduced-motion
  overrides. This is source inspection, not a rendered layout audit.

### Verification limits

The existing preview at `http://127.0.0.1:8001` could not be reached:

```text
URLError: <urlopen error [Errno 1] Operation not permitted>
```

The earlier browser startup attempt failed with:

```text
ERROR:third_party/crashpad/crashpad/util/linux/socket.cc:45
setsockopt: Operation not permitted (1)
```

No evidence of browser-permission recovery was available, so that failed launch
was not repeatedly retried. The existing preview server was left untouched;
no duplicate server was started. Actual browser Back/Forward, module loading,
console errors, image decoding, Tab/Enter behavior, screen-reader output,
responsive rendering, and screenshots remain **unverified**. File and DOM-stub
checks are not substitutes for those checks.

### Manual checks on the existing preview

1. Open http://127.0.0.1:8001 without a hash: Gaming Wiki home should appear.
2. Open Darkest Dungeon, then Heroes, Team Compositions, and Trinkets. The latter
   two should be independent collections. Coming soon cards must not be links.
3. Open Highwayman and all four sections. Check Home / Darkest Dungeon / Heroes /
   Highwayman breadcrumbs, brand-to-home navigation, and the old `/#heroes` and
   `/#hero/highwayman/teams` links.
4. Use browser Back/Forward across these pages and reload direct links. Check
   focus, titles, active states, repeated current-route clicks, and missing-page
   fallback. Use Tab/Enter for all links, the skip link, and Sources disclosure.
5. Inspect at 320px, 375px, 768px, desktop, and 200% zoom. Check wrapping, no
   horizontal overflow, focus visibility, and preserved image proportions.
6. Check the console and Network panel. Only local SVG placeholders should load;
   no missing PNG files or remote image requests should occur. Enable reduced
   motion and confirm animations and transitions are disabled.

See `content-sources.md` for exact image-source blockers and required filenames.

### Diff review and Git result

Reviewed the navigation diff and the pre-edit comparison; checked tracked and
new-file diffs for whitespace and common credential patterns. CSS variables and
brace structure passed. No unrelated files were selected for staging.

Staging the explicit project file list failed:

```text
fatal: Unable to create '/home/bilgin/github/private/gaming-wiki/.git/index.lock': Read-only file system
```

No new commit exists and no push was attempted. Existing HEAD is `4fec88d`.
Earlier website milestones are also still uncommitted. From a normal terminal,
these commands stage the current reviewed project work; review the staged diff
before committing, and do not force-push:

```bash
cd /home/bilgin/github/private/gaming-wiki
git add -- AGENTS.md README.md dist/index.html dist/css/styles.css \
  dist/js/app.js dist/js/heroes.js \
  dist/assets/images/hero-placeholder.svg \
  dist/assets/images/ring-placeholder.svg \
  dist/assets/images/buckle-placeholder.svg \
  dist/assets/images/charm-placeholder.svg \
  dist/assets/images/stone-placeholder.svg \
  dist/assets/images/ledger-mark.svg \
  docs/content-sources.md docs/validation.md
git diff --cached --check
git diff --cached
git commit -m "feat: add Gaming Wiki home and Darkest Dungeon collections"
git push origin main
```

No deployment is part of this workflow.

## Darkest Dungeon sidebar, landing, and composition milestone

### Checks completed

- Ran the current application renderers and route parser in the installed
  JavaScriptCore library with a minimal DOM stub. This exercised the root,
  game overview, hero gallery, global Teams/Trinkets, Highwayman guide, and both
  composition detail routes.
- Confirmed all rendered internal links resolve to a supported route, sidebar
  active states follow the selected category, the legacy `#heroes` alias still
  resolves, and the Highwayman Overview/Builds/Teams/Trinkets tabs remain active.
- Confirmed each team detail route renders the requested four positions and its
  corresponding composition; navigating directly between the two team routes
  updates the content and title. Tier and location information is explicitly
  unassigned/unassessed.
- Exercised the sidebar disclosure state and search renderer. Search results
  are generated from existing hero, build, team, and trinket records; the
  no-match state is present. Coming soon sidebar entries are non-interactive.
- Parsed the HTML shell and every representative rendered view. Checked unique
  IDs, matching `aria-labelledby` targets, nonempty image alt text, no inline
  styles/event handlers, valid local image paths, and decoded raster/SVG files.
- Checked CSS brace balance, mobile breakpoints at 680px and 440px, the
  collapsible-menu selector, game-scoped accent tokens, and existing reduced-
  motion rules. Reviewed party-card grid fallbacks and compact sidebar layout
  in the stylesheet. Existing local images still decode; no image data changed.
- Calculated contrast from the current CSS color tokens: main text/background
  16.22:1, muted text/panel 9.05:1, white text/crimson button 7.35:1, and
  accent text/accent surface 7.78:1. The faded Coming soon label was 4.80:1.
  These are token calculations, not a rendered-page contrast audit.
- `git diff --check` passed.

### Verification limits

No browser executable or browser automation tool is available in this
environment. The existing preview/browser restrictions are recorded above and
were not retried. Responsive layout, real keyboard focus/activation, native
browser Back/Forward, rendered color contrast, console errors, and screen-reader
output therefore remain unverified in a browser. JavaScriptCore route tests and
CSS source inspection do not replace those checks. No preview server was
started or changed, and the site was not deployed.

### Manual review when browser access is available

Open the existing local preview at `http://127.0.0.1:8001`. Check the sidebar
on Overview, Heroes, Teams, Trinkets, and Highwayman sections; at mobile width,
open and close “Browse Darkest Dungeon” with keyboard and touch. Search for
Highwayman, “Gunslinger’s Buckle”, and an unknown word. Open each team detail,
then use browser Back/Forward and breadcrumbs. Inspect at 320px, 375px, 768px,
desktop, and 200% zoom; check for horizontal overflow, image placeholders,
visible focus, and contrast. No commit, push, or deployment was performed for
this milestone.

## Team composition browsing milestone

### Checks completed

- Read `AGENTS.md`, inspected the current team data, list cards, route parser,
  detail renderer, CSS, and reviewed the reference composition page. The
  reference page is accessible; its community tier ratings were not imported.
- Exercised the global composition list, featured cards, Highwayman guide team
  section, and each composition detail route in the JavaScriptCore DOM harness.
  Overview cards show the party formation and main strategy without the detail
  sections. Detail views retain strategy, opening priorities, build skills,
  strengths, and limitations.
- Confirmed composition cards and their title/action links resolve to the
  matching detail routes, breadcrumbs return to Team Compositions, and member
  names only link when a guide exists. Other party portraits remain labeled
  unavailable placeholders. Existing image paths decode locally.
- Exercised search against existing names, hero members, and strategy text,
  including the no-results state. Confirmed filtering does not create content.
- `git diff --check` passed. No dependencies were added.

### Verification limits

No browser binary or browser automation tool is available here. Native
Back/Forward behavior, keyboard operation in a real browser, and rendered
mobile layout could not be exercised. Hash-route transitions and focus targets
were checked with the DOM harness; mobile breakpoints and focus styles were
inspected in CSS. These checks do not replace a browser review. No commit, push,
or deployment was performed.
