// Portal metadata also configures future-game preview pages; only DD I has guides.
export const portalGames = [
  { id: 'darkest-dungeon', name: 'Darkest Dungeon I', theme: 'crimson', motif: 'gateway', label: 'The original descent',
    available: true, action: 'Enter the dungeon', href: '#game/darkest-dungeon',
    description: 'Hero guides, team compositions, and trinkets. Prepare your party for the darkness ahead.' },
  { id: 'world-of-warcraft', name: 'World of Warcraft', theme: 'frost', motif: 'citadel', label: 'A world of legends',
    available: false, action: 'Explore the preview', href: '#game/world-of-warcraft',
    description: 'Beyond the frozen gates, a world of adventure awaits. Discover the shape of our future Warcraft wiki.',
    categories: ['Classes', 'Specializations', 'Builds', 'Dungeons', 'Raids', 'Equipment'] },
  { id: 'league-of-legends', name: 'League of Legends', theme: 'arcane', motif: 'crystal', label: 'The next great play',
    available: false, action: 'Explore the preview', href: '#game/league-of-legends',
    description: 'Arcane power. Shared ambition. A future home for champion builds, team compositions, and strategy.',
    categories: ['Champions', 'Roles', 'Builds', 'Items', 'Team Compositions'] },
  { id: 'darkest-dungeon-2', name: 'Darkest Dungeon II', theme: 'ember', motif: 'horizon', label: 'Beyond the ruin',
    available: false, action: 'Explore the preview', href: '#game/darkest-dungeon-2',
    description: 'Follow the embers into the unknown. Preview a future field guide to heroes and the journey ahead.',
    categories: ['Heroes', 'Paths', 'Combat', 'Trinkets', 'Expeditions'] }
];

// Game-specific navigation and theme keys live here, outside the shared renderer.
export const games = {
  'darkest-dungeon': {
    id: 'darkest-dungeon',
    name: 'Darkest Dungeon',
    theme: 'darkest-dungeon',
    categories: [
      { id: 'overview', label: 'Overview', icon: '⌂', view: 'game', description: 'Start with featured guides and compositions.' },
      { id: 'heroes', label: 'Heroes', icon: '♟', view: 'heroes', description: 'Browse hero guides and positions.' },
      { id: 'bosses', label: 'Bosses', icon: '♜', view: 'bosses', description: 'Browse the boss index and encounter guides.' },
      { id: 'enemies', label: 'Enemies', icon: '⚔', view: 'enemies', description: 'Search enemies by region, type, and threat.' },
      { id: 'trinkets', label: 'Trinkets', icon: '◇', view: 'trinkets', description: 'Browse currently documented items.' },
      { id: 'items', label: 'Items & Provisions', icon: '▧', view: 'items', description: 'Review provisions and expedition supplies.' },
      { id: 'curios', label: 'Curios', icon: '▤', view: 'curios', description: 'Find curios and their documented interactions.' },
      { id: 'teams', label: 'Team Compositions', icon: '◉', view: 'teams', description: 'Browse all current example parties.' },
      { id: 'locations', label: 'Locations', icon: '⌖', view: 'locations', description: 'Browse the campaign regions.' },
      { id: 'quests', label: 'Quests', icon: '☷', view: 'quests', description: 'Understand named and special expeditions.' }
    ]
  }
};
