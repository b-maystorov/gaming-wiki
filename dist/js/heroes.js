// Campaign content only: no Darkest Dungeon II or Butcher's Circus rules.
// Source details and image provenance live in docs/content-sources.md.
export const sources = {
  highwayman: { title: 'Highwayman · skills and class trinkets', url: 'https://darkestdungeon.wiki.gg/wiki/Highwayman_(Darkest_Dungeon)' },
  strategy: { title: 'Highwayman · tactical reference', url: 'https://darkestdungeon.wiki.gg/wiki/Highwayman/Strategy' },
  ranges: { title: 'Highwayman · skill rank cross-check', url: 'https://gamefaqs.gamespot.com/pc/228501-darkest-dungeon-the-color-of-madness/faqs/76458/highwayman' },
  trinkets: { title: 'Campaign trinkets · effects and rarity', url: 'https://darkestdungeon.wiki.gg/wiki/Trinkets' },
  doctor: { title: 'Plague Doctor · control and support', url: 'https://darkestdungeon.wiki.gg/wiki/Plague_Doctor/Strategy' },
  vestal: { title: 'Vestal · healing and stun', url: 'https://darkestdungeon.wiki.gg/wiki/Vestal/Strategy' },
  crusader: { title: 'Crusader · Holy Lance and recovery', url: 'https://darkestdungeon.wiki.gg/wiki/Crusader_(Darkest_Dungeon)' },
  hellion: { title: 'Hellion · Iron Swan and positioning', url: 'https://darkestdungeon.wiki.gg/wiki/Hellion_(Darkest_Dungeon)/Strategy' }
};

const baseGame = { baseGame: true, dlc: [], mods: [] };
const portrait = {
  src: 'assets/images/darkest-dungeon/highwayman-idle.gif',
  alt: 'Highwayman in his Darkest Dungeon I idle animation, holding a pistol and knife',
  width: 175,
  height: 301,
  placeholder: false,
  animated: true,
  reducedMotionLabel: 'Highwayman character animation paused to respect your reduced-motion preference'
};

export const heroes = [
  {
    id: 'highwayman',
    roleTags: ['Damage', 'Riposte'],
    galleryArt: { src: 'assets/images/darkest-dungeon/highwayman-portrait.png', permission: 'user-provided', monogram: 'HW', alt: 'User-provided Darkest Dungeon-style illustration identified as Highwayman', credit: 'User-provided image · original source unverified' },
    name: 'Highwayman',
    epithet: 'A blade. A pistol. A way through.',
    role: 'Flexible damage · Riposte',
    preferredPositions: [3, 2],
    alternativePositions: [4, 1],
    requirements: baseGame,
    portrait,
    summary: 'A mobile damage dealer who can pressure the back line and punish incoming attacks. Build around the party’s formation, not just his next shot.',
    uniqueAttributes: [{
      name: 'Riposte',
      description: 'Duelist’s Advance activates Riposte for 3 rounds. It counters eligible attacks directed at the Highwayman; the level-one Riposte damage modifier is −40%, and Stun disables the counter.',
      source: 'https://darkestdungeon.wiki.gg/wiki/Riposte'
    }],
    guide: {
      verification: 'Campaign mechanics and item values checked against the linked references on 26 October 2026. Builds and parties are editorial suggestions, not tested guarantees. No installed game data or patch-specific validation was available.',
      strengths: ['Pistol Shot reaches enemy rank 4.', 'Duelist’s Advance adds Riposte and forward movement.', 'Melee and ranged options cover different targets.'],
      weaknesses: ['No combat healing or stun in his own skill set.', 'Riposte needs enemies to attack him; its value varies.', 'Movement can disrupt allies. Plan the next formation.'],
      positions: 'Start in 3 or 2 for flexible skill access. Rank 4 is an alternative for Pistol Shot or advancing; it disables his close-range attacks. Rank 1 is situational: Point Blank Shot can take him back to 2. These are recommendations, not universal best positions.',
      beginnerAdvice: 'Start in rank 3 or 2 to keep both melee and ranged options available. Duelist’s Advance can set up Riposte; follow with another skill rather than repeatedly advancing, since the Riposte damage penalty stacks.',
      builds: [
        {
          id: 'riposte', name: 'The moving duelist', label: 'Flexible melee + ranged', start: 'Start in 3 or 2',
          description: 'Use when the hero ahead can tolerate being moved back. Make an opening for Riposte, then choose targets instead of repeating a fixed rotation.',
          skills: [
            { name: 'Duelist’s Advance', detail: 'From 4/3/2 → enemy 1/2/3. Moves forward 1 and activates Riposte.' },
            { name: 'Pistol Shot', detail: 'From 4/3/2 → enemy 2/3/4. Keep a way to reach the rear.' },
            { name: 'Wicked Slice', detail: 'From 3/2/1 → enemy 1/2. A direct melee option without relying on bleed.' },
            { name: 'Point Blank Shot', detail: 'From 1 → enemy 1. Moves back 1; attempts to knock the target back.' }
          ],
          priorities: 'Advance when the target and resulting formation make sense. Use Pistol Shot to finish a dangerous rear enemy. At the front, consider Point Blank Shot to recover position.',
          limitation: 'Do not chase Point Blank Shot into a protected front line while a rear threat lives. Repeated Advance can push support heroes out of useful ranks.',
          trinkets: 'Consider Focus Ring with Damage Stone; both also impose a dodge cost.'
        },
        {
          id: 'ranged', name: 'The steady gunslinger', label: 'Ranged focus', start: 'Start in 3 or 2',
          description: 'Use when allies need stable positions. Gunslinger’s Buckle suits this approach, but the build can start with common trinkets.',
          skills: [
            { name: 'Pistol Shot', detail: 'From 4/3/2 → enemy 2/3/4. Your usual single-target choice.' },
            { name: 'Grapeshot Blast', detail: 'From 3/2 → enemy 1+2+3. Consider it when several weakened targets can fall.' },
            { name: 'Tracking Shot', detail: 'From any rank → enemy 2/3/4. Removes stealth and buffs the user; once per battle.' },
            { name: 'Point Blank Shot', detail: 'From 1 → enemy 1. A way back out if shuffled to the front.' }
          ],
          priorities: 'Focus Pistol Shot on a priority target. Spend a turn on Tracking Shot for stealth removal or a longer fight, rather than automatically opening with it.',
          limitation: 'No Riposte in this loadout. Grapeshot spreads damage, and rank 4 disables it. A surviving front enemy may require an ally to finish the job.',
          trinkets: 'Consider Gunslinger’s Buckle with Damage Stone. Before the buckle is available, try Reckless Charm for general accuracy.'
        }
      ],
      teams: [
        {
          id: 'steady-expedition',
          name: 'A steady expedition', build: 'The steady gunslinger', requirements: baseGame,
          members: ['Vestal', 'Plague Doctor', 'Highwayman', 'Crusader'],
          synergy: 'Plague Doctor controls the rear with Blinding Gas. Highwayman follows with focused fire, while Crusader handles the front and can use Inspiring Cry for stress recovery. Vestal supplies healing.',
          strengths: ['Can pressure rear ranks while retaining front-line attacks.', 'Combines rear control, direct damage, healing, and stress recovery.'],
          limitation: 'No guaranteed opening order. Blight is less reliable against resistant foes, and a shuffle can restrict the two rear supports. This is an adaptable starting party, not a boss-specific solution.',
          priorities: ['Look for a useful Blinding Gas stun on enemy ranks 3–4.', 'Use Pistol Shot to concentrate damage on the most urgent rear target; Crusader can attack or stun in front.', 'Vestal can use Dazzling Light when healing is unnecessary; use Divine Grace or Divine Comfort as health demands.']
        },
        {
          id: 'rotating-middle',
          name: 'A rotating middle', build: 'The moving duelist', requirements: baseGame,
          members: ['Vestal', 'Highwayman', 'Crusader', 'Hellion'],
          synergy: 'Highwayman advances from 3 to 2, moving Crusader to 3. Holy Lance can bring Crusader forward again. Hellion stays in 1 to keep Iron Swan available against enemy rank 4.',
          strengths: ['Advance adds Riposte while making room for Crusader’s Holy Lance.', 'Hellion can threaten enemy rank 4 while remaining in the front rank.'],
          limitation: 'The exchange depends on turn order. If Crusader acts first, use a front-rank skill or Inspiring Cry and reassess. Avoid advancing Highwayman from 2 into 1 when Hellion needs Iron Swan. No dedicated bleed/blight cure here.',
          priorities: ['If appropriate, Advance from 3 to set up Riposte and Crusader’s next move.', 'Use Holy Lance from 3 when Crusader gets his turn; Hellion can focus a rear threat with Iron Swan.', 'Vestal heals or stuns as needed. On later turns use Pistol Shot if another Advance would spoil the formation.']
        }
      ],
      trinkets: [
        { routeId: 'focus-ring', use: 'Accuracy for the mixed build', advice: 'A general accuracy option for a loadout using both melee and ranged attacks.', alternative: 'Reckless Charm is common: less accuracy, but a smaller dodge penalty.' },
        { routeId: 'gunslingers-buckle', use: 'For a ranged commitment', advice: 'Fits the gunslinger loadout. Its melee penalties make it a poor default for a mixed build.', alternative: 'Use the common Reckless Charm for accuracy or Damage Stone for damage until you find it.' },
        { routeId: 'reckless-charm', use: 'Accessible accuracy alternative', advice: 'A modest general accuracy option while collecting rarer equipment.', alternative: 'If unavailable, leave the slot open or use an owned item whose downside your party can handle; no drop is guaranteed.' },
        { routeId: 'damage-stone', use: 'Accessible damage option', advice: 'Useful when accuracy is already covered. Combining it with Focus Ring gives up more dodge.', alternative: 'Choose Reckless Charm instead when misses are the bigger problem. Neither is required to use these builds.' }
      ],
      sourceIds: ['highwayman', 'strategy', 'ranges', 'trinkets', 'doctor', 'vestal', 'crusader', 'hellion']
    }
  },
  // Original 17-class gallery scope. Tags summarize capabilities, not tier ratings.
  { id: "abomination", name: "Abomination", roleTags: ["Damage", "Stun", "Blight"],
    requirements: baseGame, guide: null,
    uniqueAttributes: [{
      name: 'Human and Beast forms',
      description: 'Transform is a free action that changes the Abomination’s available combat skills. It can be used twice per battle, once to enter Beast form and once to return. Entering Beast form stresses the party, and the Abomination gains stress while he remains transformed; he returns to Human form at battle end or when afflicted.',
      source: 'https://darkestdungeon.wiki.gg/wiki/Abomination_%28Darkest_Dungeon%29'
    }],
    galleryArt: { src: 'assets/images/darkest-dungeon/abomination-portrait.png', permission: 'user-provided', monogram: 'AB', alt: 'User-provided Darkest Dungeon-style illustration identified as Abomination', credit: 'User-provided image · original source unverified' } },
  { id: "antiquarian", name: "Antiquarian", roleTags: ["Support", "Debuff"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/antiquarian-portrait.png', permission: 'user-provided', monogram: 'AQ', alt: 'User-provided Darkest Dungeon-style illustration identified as Antiquarian', credit: 'User-provided image · original source unverified' } },
  { id: "arbalest", name: "Arbalest", roleTags: ["Damage", "Healing", "Mark"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/arbalest-portrait.png', permission: 'user-provided', monogram: 'AR', alt: 'User-provided Darkest Dungeon-style illustration identified as Arbalest', credit: 'User-provided image · original source unverified' } },
  { id: "bounty-hunter", name: "Bounty Hunter", roleTags: ["Damage", "Stun", "Mark"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/bounty-hunter-portrait.png', permission: 'user-provided', monogram: 'BH', alt: 'User-provided Darkest Dungeon-style illustration identified as Bounty Hunter', credit: 'User-provided image · original source unverified' } },
  // Crusader's guide and portrait are loaded from the structured static record.
  { id: "crusader", name: "Crusader", guide: null },
  { id: "grave-robber", name: "Grave Robber", roleTags: ["Damage", "Blight"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/grave-robber-portrait.png', permission: 'user-provided', monogram: 'GR', alt: 'User-provided Darkest Dungeon-style illustration identified as Grave Robber', credit: 'User-provided image · original source unverified' } },
  { id: "hellion", name: "Hellion", roleTags: ["Damage", "Bleed", "Stun"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/hellion-portrait.png', permission: 'user-provided', monogram: 'HE', alt: 'User-provided Darkest Dungeon-style illustration identified as Hellion', credit: 'User-provided image · original source unverified' } },
  { id: "houndmaster", name: "Houndmaster", roleTags: ["Support", "Guard", "Stun"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/houndmaster-portrait.png', permission: 'user-provided', monogram: 'HM', alt: 'User-provided Darkest Dungeon-style illustration identified as Houndmaster', credit: 'User-provided image · original source unverified' } },
  { id: "jester", name: "Jester", roleTags: ["Stress relief", "Support", "Bleed"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/jester-portrait.png', permission: 'user-provided', monogram: 'JE', alt: 'User-provided Darkest Dungeon-style illustration identified as Jester', credit: 'User-provided image · original source unverified' } },
  { id: "leper", name: "Leper", roleTags: ["Damage", "Self-sustain"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/leper-portrait.png', permission: 'user-provided', monogram: 'LE', alt: 'User-provided Darkest Dungeon-style illustration identified as Leper', credit: 'User-provided image · original source unverified' } },
  { id: "man-at-arms", name: "Man-at-Arms", roleTags: ["Guard", "Support", "Riposte"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/man-at-arms-portrait.png', permission: 'user-provided', monogram: 'MA', alt: 'User-provided Darkest Dungeon-style illustration identified as Man At Arms', credit: 'User-provided image · original source unverified' } },
  { id: "occultist", name: "Occultist", roleTags: ["Healing", "Debuff", "Mark"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/occultist-portrait.png', permission: 'user-provided', monogram: 'OC', alt: 'User-provided Darkest Dungeon-style illustration identified as Occultist', credit: 'User-provided image · original source unverified' } },
  { id: "plague-doctor", name: "Plague Doctor", roleTags: ["Blight", "Stun", "Healing"],
    role: 'Backline Blight · Stun · Support',
    summary: 'A backline specialist who controls enemies with Stuns, applies Blight, and supports allies with limited healing and cures.',
    preferredPositions: [4, 3], alternativePositions: [2], requirements: baseGame, guide: null,
    overview: {
      positions: 'Ranks 4 and 3 preserve access to Blinding Gas, Plague Grenade, and Battlefield Medicine. Rank 2 is a situational option for Disorienting Blast or Incision; rank 1 leaves only Incision.',
      strengths: ['Can Stun both enemy back ranks with Blinding Gas.', 'Blight damage can bypass enemy Protection.', 'Battlefield Medicine heals slightly and cures Bleed and Blight on both target and self.'],
      weaknesses: ['Low base damage outside damage-over-time effects.', 'Blight is less reliable against resistant enemies.', 'Most skills favor the back ranks, so being pulled forward can restrict options.'],
      beginnerAdvice: 'Use Blinding Gas to delay dangerous back-line enemies, then apply Blight where it can land. Keep Battlefield Medicine for ongoing Bleed or Blight when possible; its direct heal is small.'
    },
    galleryArt: { src: 'assets/images/darkest-dungeon/plague-doctor-portrait.png', permission: 'user-provided', monogram: 'PD', alt: 'User-provided Darkest Dungeon-style illustration identified as Plague Doctor', credit: 'User-provided image · original source unverified' } },
  { id: "vestal", name: "Vestal", roleTags: ["Healing", "Stun"],
    requirements: baseGame, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/vestal-portrait.png', permission: 'user-provided', monogram: 'VE', alt: 'User-provided Darkest Dungeon-style illustration identified as Vestal', credit: 'User-provided image · original source unverified' } },
  { id: "flagellant", name: "Flagellant", roleTags: ["Bleed", "Healing"],
    requirements: { baseGame: true, dlc: ["The Crimson Court"], mods: [] }, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/flagellant-portrait.png', permission: 'user-provided', monogram: 'FL', alt: 'User-provided Darkest Dungeon-style illustration identified as Flagellant', credit: 'User-provided image · original source unverified' } },
  { id: "shieldbreaker", name: "Shieldbreaker", roleTags: ["Damage", "Armor piercing", "Guard break"],
    requirements: { baseGame: true, dlc: ["The Shieldbreaker"], mods: [] }, guide: null,
    galleryArt: { src: 'assets/images/darkest-dungeon/shieldbreaker-portrait.png', permission: 'user-provided', monogram: 'SB', alt: 'User-provided Darkest Dungeon-style illustration identified as Shieldbreaker', credit: 'User-provided image · original source unverified' } }
];
