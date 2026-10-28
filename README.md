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
- Team compositions with party positions and strategy explanations
- Search functionality for existing guides and compositions
- Original game sprites and item icons where available
- A responsive layout for desktop and mobile

The website is still in development. Bosses, Enemies, Trinkets, Items & Provisions, Curios, Locations, and selected Quests now have structured Darkest Dungeon I indexes. Many entries are partial reference records; detailed enemy guides and broader item coverage remain in progress.

## Technologies

The project currently uses:

- HTML5
- CSS3
- JavaScript (ES Modules)
- Git & GitHub

No frameworks, databases, or external dependencies are required.

The public application stays lightweight and uses plain HTML, CSS, and
JavaScript. The React + TypeScript + Vite BossCard pilot is isolated on the
`experiment/react-boss-card` branch and is not part of the authoritative site.

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

For Python validation, Node.js setup, the isolated React pilot, and safe Git
workflows, see [Development setup](docs/development.md).

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

The vanilla application in `dist/` remains the authoritative website. The React + TypeScript + Vite prototype in `experiments/react-pilot/` is isolated and is not part of the production site. The global homepage uses `dist/css/portal.css`; approved Darkest Dungeon styles
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
combat skills, bosses, enemies, items, curios, locations, and quests are indexed. Build, trinket, and skill results open their
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


## Darkest Dungeon field encyclopedias

The canonical DD1 JSON pack now contains a sourced enemy index, normalized trinket records, expedition items, curated curio interactions, regional guides, and selected quest formats. These collections are rendered by the existing vanilla hash router and are also included in global search.

Enemy roster facts and regional mechanics were reference-checked against the DD1 community wiki. Detailed stats and attack tables are intentionally omitted unless recorded. The initial curios list is a curated sample, not an exhaustive database; interaction probabilities are shown only where recorded. Trinket records include the established Highwayman recommendations plus selected general and Crimson Court examples. No source artwork is claimed for encyclopedia entries; CSS monograms are used where permitted local art is unavailable.

Run `python3 tools/check_content.py` to check IDs, source and DLC links, region relationships, item-curio links, asset paths, and routed collection entry points.

Artwork provenance and unresolved image needs are listed in
[`docs/artwork-inventory.csv`](docs/artwork-inventory.csv). Regenerate that
inventory after changing the DD1 records with:

```bash
python3 tools/build_artwork_inventory.py
```

Existing supplied character and item images
are retained, but their redistribution permission is not established; see
[`docs/content-sources.md`](docs/content-sources.md) before adding artwork.
