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

The website is still in development. Some sections, such as Bosses, Enemies, Curios, and Locations, will be added later.

## Technologies

The project currently uses:

- HTML5
- CSS3
- JavaScript (ES Modules)
- Git & GitHub

No frameworks, databases, or external dependencies are required.

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
│   └── assets/
│       └── images/
├── docs/
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
- Create guides for bosses, enemies, and dungeon locations
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
