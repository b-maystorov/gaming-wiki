# Isolated React BossCard pilot

This experiment is deliberately separate from the production vanilla entry
point. `src/data/bosses.ts` reads and checks records from the canonical JSON
pack, and the React components import the existing `dist/css/styles.css`. It
does not change `dist/index.html`, production routes, or the Python preview
server.

Requirements: Node.js 20.19+ or 22.12+ and npm. From this directory:

```bash
npm install
npm run dev
```

The dev server binds to `127.0.0.1:5174` with a strict port check, so it will
not take over the existing `8001` preview. Search and region filters update the
cards in place. Cards link back to the corresponding
boss hash route on `http://127.0.0.1:8001`; set `VITE_LEGACY_SITE_URL` when the
existing site uses a different local origin. The production site must already
be running for those destination links to open.

Run `npm run typecheck` for TypeScript checks and `npm run build` to create a
static bundle. Vite writes only to the root `react-preview-dist/` folder; it
never writes to or clears the production `dist/`. The build uses a relative
base so the prototype can also be hosted as static files.

No dependency lockfile is included yet because this environment does not have
Node.js/npm to resolve and verify an install. Keep this experiment isolated
until dependencies, rendering, keyboard navigation, mobile layout, build
output and links have been checked locally. The public vanilla application
remains authoritative until that review and a later migration decision.
