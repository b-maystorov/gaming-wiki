# Gaming Wiki 🎮

A personal project where I'm building a gaming wiki for different games, starting with **Darkest Dungeon**.

The idea is simple: I want one place where players can find useful information about characters, builds, team compositions, equipment, and strategies without having to search through dozens of different pages.

I'm developing the website step by step, starting with one game and gradually expanding it.

## Current Progress

The first game I'm working on is **Darkest Dungeon 1**.

So far, I've added:

- A BM Gaming Wiki homepage with four themed game previews
- Development preview pages for World of Warcraft, League of Legends, and Darkest Dungeon II; their categories are planned, not available guides
- A Darkest Dungeon section with its own navigation and theme
- A Highwayman guide with builds, strengths, weaknesses, and trinket recommendations
- A sourced boss index with four detailed encounter guides
- Team compositions with party positions and strategy explanations
- Search functionality for existing guides and compositions
- Original game sprites and item icons where available
- A responsive layout for desktop and mobile

The website is still in development. Most boss guides and sections such as Enemies, Curios, and Locations remain incomplete.

## Technologies

The project currently uses:

- HTML5
- CSS3
- JavaScript (ES Modules)
- Git & GitHub

The authoritative public site remains plain HTML, CSS, and JavaScript, with no runtime framework or backend.

I decided to keep the project lightweight and use plain HTML, CSS, and JavaScript for now.

## Run Locally

Clone the repository:

```bash
git clone <repository-url>
cd gaming-wiki
```

Start a local web server:

```bash
python3 -m http.server 8001 --bind 127.0.0.1 --directory dist
```

Open your browser at:

http://127.0.0.1:8001

Press `Ctrl+C` in the terminal to stop the server.

## Project Structure

```text
gaming-wiki/
├── dist/
│   ├── index.html
│   ├── css/
│   │   ├── styles.css
│   │   └── portal.css
│   ├── js/
│   │   ├── app.js
│   │   ├── games.js
│   │   └── heroes.js
│   ├── data/games/       # Canonical static JSON content packs
│   └── assets/
│       └── images/
├── docs/
├── tools/check_content.py
├── AGENTS.md
└── README.md
```

The website is served directly from the `dist/` folder.

Game data and page layouts are kept separate where possible, so adding new heroes or games doesn't require rebuilding the entire website.

## What's Next?

My next goals are:

- Complete the Highwayman guide with combat skills, camping skills, and equipment progression
- Add more Darkest Dungeon heroes and their builds
- Expand team compositions and trinket recommendations
- Expand the Darkest Dungeon boss encyclopedia beyond its initial four sourced guides
- Continue improving the search and navigation
- Eventually support other games with their own themes and content

The long-term goal is to build a useful gaming reference website that can grow over time.

## Development

I'm working on this project in small steps, using Codex as a coding assistant while reviewing changes, testing features, and maintaining the repository with Git.

The project is also an opportunity for me to practice frontend development, project organization, and documentation.

## Disclaimer

This is an unofficial fan project and is not affiliated with Red Hook Studios or any other game developer.

Darkest Dungeon and its associated characters and artwork belong to their respective rights holders. Artwork sources and reuse permissions are tracked in `docs/content-sources.md`.

## Game universe previews

The global homepage uses `dist/css/portal.css`; approved Darkest Dungeon styles
remain in `styles.css`. `portalGames` in `dist/js/games.js` configures each scene,
its availability, entry link, and planned categories. Future games share one
preview template and have no gameplay guides yet.

Preview routes: `#game/world-of-warcraft`, `#game/league-of-legends`, and
`#game/darkest-dungeon-2`. `#home/games` returns directly to the game selector.
Mouse hover, keyboard focus, or touch/click selects a universe; the entry link
opens its page. All scene art is original CSS geometry, with no remote images.


## Global Command Center

The header search button or `/` (outside editable fields) opens a local command
palette on any page. Type to filter, use ↑/↓ to select, Enter to navigate, and
Escape to close. Tab cycles the input and close button. Closing returns focus to
the opener; choosing a result lets the existing router focus the destination.

`dist/js/command-center.js` derives its index from `games.js` and `heroes.js`.
Only real games/previews and implemented hero guides, builds, teams, trinkets,
and combat skills are indexed. Build, trinket, and skill results open their
existing sections; preview games are labeled in development. Empty input lists
all indexed content. The native HTML
`dialog` makes background content inactive while open. Styling lives in
`dist/css/command-center.css`; no server or external search service is used.


## Darkest Dungeon hero gallery

The Heroes route displays the requested original 17-class roster: 15 base-game
classes, Flagellant (The Crimson Court), and Shieldbreaker (The Shieldbreaker).
The Musketeer variant and later additions are outside this gallery milestone.
Search class names or capability tags, combine search with the role selector,
and use Clear filters to reset. Cards open each class's combat-skill reference;
only Highwayman currently links to a full strategy guide.

`heroes.js` holds role tags, requirements, guide availability and `galleryArt`.
`hero-gallery.js` renders and filters the cards; `hero-gallery.css` scopes their
layout to the gallery. User-supplied portraits are used with source and reuse
terms unverified. Failed images retain the monogram fallback. Existing guide
portraits and gameplay content are unchanged.

Combat skill reference routes use `#hero/<id>/abilities`. Their level-one values
are snapshots from an older reference guide and were not checked against the
installed game patch. Full build, team, equipment, and strategy content remains
available only for Highwayman.

## Structured game content

New structured records live in `dist/data/games/` as version-controlled JSON,
served directly by the static site. Crusader is the first migrated hero;
existing pages for other heroes continue using their current JavaScript data.
The shared schema and migration notes are in
[`docs/content-architecture.md`](docs/content-architecture.md).

Check the data locally, without network access or extra packages:

```bash
python3 tools/check_content.py
```

## React + TypeScript development pilot

The production website is still the vanilla implementation in `dist/`; the
React prototype is isolated under `experiments/react-pilot/` and is not used by
public routes. The Bosses preview imports the existing JSON boss records and
Darkest Dungeon styles rather than maintaining a second content list.

Run the original website using the Python command above on port 8001. For the
prototype, use Node.js 20.19+ or 22.12+ and npm:

```bash
cd experiments/react-pilot
npm install
npm run dev
```

Vite binds to `127.0.0.1:5174`; BossCard links open their real boss routes on
the existing port 8001 site. To type-check and build the prototype, run:

```bash
npm run typecheck
npm run build
```

The build goes to the separate root folder `react-preview-dist/`. It does not
replace or clean `dist/`. The React pilot currently covers the boss collection
only; the vanilla site remains authoritative for every public page, route, and
gameplay record. Search, global routing, hero guides, team pages and the other
collections have not yet migrated.
