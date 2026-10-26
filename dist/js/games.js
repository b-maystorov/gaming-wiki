// Game-specific navigation and theme keys live here, outside the shared renderer.
export const games = {
  'darkest-dungeon': {
    id: 'darkest-dungeon',
    name: 'Darkest Dungeon',
    theme: 'darkest-dungeon',
    categories: [
      { id: 'overview', label: 'Overview', icon: '⌂', view: 'game', description: 'Start with featured guides and compositions.' },
      { id: 'heroes', label: 'Heroes', icon: '♟', view: 'heroes', description: 'Browse hero guides and positions.' },
      { id: 'bosses', label: 'Bosses', icon: '♜', comingSoon: true },
      { id: 'enemies', label: 'Enemies', icon: '⚔', comingSoon: true },
      { id: 'trinkets', label: 'Trinkets', icon: '◇', view: 'trinkets', description: 'Browse currently documented items.' },
      { id: 'curios', label: 'Curios', icon: '▤', comingSoon: true },
      { id: 'teams', label: 'Team Compositions', icon: '◉', view: 'teams', description: 'Browse all current example parties.' },
      { id: 'locations', label: 'Locations', icon: '⌖', comingSoon: true },
      { id: 'quests', label: 'Quests', icon: '☷', comingSoon: true }
    ]
  }
};
