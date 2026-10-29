# Development setup

The repository contains two independent applications. The public vanilla site
is served from the tracked root `dist/` directory and remains authoritative.
The React + TypeScript + Vite BossCard pilot lives on the separate
`experiment/react-boss-card` branch. Its code is not present in the current
`content/dd1-encyclopedia` checkout; use a separate worktree to keep both
branches available without merging them.

## Prerequisites

- Ubuntu with Git and Python 3.10 or newer
- Node.js 24 and npm for the React pilot
- nvm is recommended for managing Node versions. The repository `.nvmrc` pins
  the major version to 24.

On a checkout containing `.nvmrc`, install and select the project Node version:

```bash
nvm install
nvm use
node --version
npm --version
```

The React package lockfile pins its dependency tree. Use `npm ci` for a
repeatable install; do not install project dependencies globally.

## Python checks and optional virtual environment

The content tools use only Python's standard library. No requirements file or
package installation is needed. A virtual environment is optional:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

From the repository root, validate structured content and local references:

```bash
python3 tools/check_content.py
```

Run the vanilla encyclopedia regression tests with Node.js 24 (no packages needed):

```bash
node --experimental-vm-modules tests/encyclopedia.test.mjs
```

The tests load the real ES modules with simulated data requests and a minimal
DOM. They check filters, search, metadata, routes, and load failures; they do
not replace browser accessibility, layout, or keyboard testing. The VM flag is
only for this test harness; the website still runs directly in a browser.

Regenerate the artwork inventory only after changing the content records:

```bash
python3 tools/build_artwork_inventory.py
```

The checker parses the JSON schema and Darkest Dungeon data pack as part of its
offline checks.

## Run the authoritative website

From the repository root:

```bash
python3 -m http.server 8001 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:8001>. Stop the server with `Ctrl+C` in its terminal.
This application needs no Node.js dependencies or build step.

## Run the isolated React pilot

The pilot is maintained on `experiment/react-boss-card`, separate from the
current encyclopedia branch. If the branch is not already checked out in
another worktree, create a sibling worktree:

```bash
git worktree add ../gaming-wiki-react experiment/react-boss-card
cd ../gaming-wiki-react
nvm install 24
nvm use 24
cd experiments/react-pilot
npm ci
npm run dev
```

Vite binds to `127.0.0.1:5174` and uses a strict port check. Boss links target
the vanilla site at port 8001 by default. Stop Vite with `Ctrl+C`.

Available package commands:

```bash
npm run typecheck
npm run build
```

The build runs TypeScript checking first and writes to the sibling worktree's
root `react-preview-dist/`, never to the authoritative root `dist/`. The pilot
uses the shared static content pack and existing CSS; it does not replace the
vanilla site.

## Git safety

Before editing or switching branches, check `git status --short` and
`git branch --show-current`. Keep unrelated work intact. Use a separate
worktree for the React branch where possible, stage only named source and
documentation files, and review `git diff --cached` before committing. Do not
use `git clean`, `git reset`, or force-push as a cleanup shortcut.

The ignore rules cover dependencies and generated experimental output. Root
`dist/` is intentionally tracked because it is the published static website.
The encyclopedia branch had 543 generated dependency files and 3 React build
files tracked. Their removal is staged from Git's index only; the local files
remain on disk and are now covered by the ignore rules. Ignore patterns alone
do not untrack files already in Git.
