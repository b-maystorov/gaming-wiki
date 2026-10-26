# Validation log

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
