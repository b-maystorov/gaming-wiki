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
    galleryArt: { src: null, permission: 'unverified', monogram: 'HW' },
    name: 'Highwayman',
    epithet: 'A blade. A pistol. A way through.',
    role: 'Flexible damage · Riposte',
    preferredPositions: [3, 2],
    alternativePositions: [4, 1],
    requirements: baseGame,
    portrait,
    summary: 'A mobile damage dealer who can pressure the back line and punish incoming attacks. Build around the party’s formation, not just his next shot.',
    guide: {
      verification: 'Campaign mechanics and item values checked against the linked references on 26 October 2026. Builds and parties are editorial suggestions, not tested guarantees. No installed game data or patch-specific validation was available.',
      strengths: ['Pistol Shot reaches enemy rank 4.', 'Duelist’s Advance adds Riposte and forward movement.', 'Melee and ranged options cover different targets.'],
      weaknesses: ['No combat healing or stun in his own skill set.', 'Riposte needs enemies to attack him; its value varies.', 'Movement can disrupt allies. Plan the next formation.'],
      positions: 'Start in 3 or 2 for flexible skill access. Rank 4 is an alternative for Pistol Shot or advancing; it disables his close-range attacks. Rank 1 is situational: Point Blank Shot can take him back to 2. These are recommendations, not universal best positions.',
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
        {
          name: 'Focus Ring', rarity: 'Very rare', use: 'Accuracy for the mixed build',
          image: { src: 'assets/images/darkest-dungeon/focus-ring.png', alt: 'Focus Ring item icon from Darkest Dungeon I', width: 36, height: 72, placeholder: false },
          effects: ['+10 ACC', '+5% CRIT'], drawbacks: ['−8 DODGE'],
          advice: 'A general accuracy option for a loadout using both melee and ranged attacks.',
          alternative: 'Reckless Charm is common: less accuracy, but a smaller dodge penalty.', requirements: baseGame, source: 'trinkets'
        },
        {
          name: 'Gunslinger’s Buckle', rarity: 'Very rare · Highwayman only', use: 'For a ranged commitment',
          image: { src: 'assets/images/darkest-dungeon/gunslingers-buckle.png', alt: "Gunslinger's Buckle item icon from Darkest Dungeon I", width: 36, height: 72, placeholder: false },
          effects: ['+20% DMG ranged skills', '+15 ACC ranged skills'], drawbacks: ['−10% DMG melee skills', '−5% CRIT melee skills'],
          advice: 'Fits the gunslinger loadout. Its melee penalties make it a poor default for a mixed build.',
          alternative: 'Use the common Reckless Charm for accuracy or Damage Stone for damage until you find it.', requirements: baseGame, source: 'highwayman'
        },
        {
          name: 'Reckless Charm', rarity: 'Common', use: 'Accessible accuracy alternative',
          image: { src: 'assets/images/charm-placeholder.svg', alt: 'Charm symbol placeholder; not Reckless Charm game artwork', placeholder: true },
          effects: ['+5 ACC'], drawbacks: ['−2 DODGE'],
          advice: 'A modest general accuracy option while collecting rarer equipment.',
          alternative: 'If unavailable, leave the slot open or use an owned item whose downside your party can handle; no drop is guaranteed.', requirements: baseGame, source: 'trinkets'
        },
        {
          name: 'Damage Stone', rarity: 'Common', use: 'Accessible damage option',
          image: { src: 'assets/images/stone-placeholder.svg', alt: 'Stone symbol placeholder; not Damage Stone game artwork', placeholder: true },
          effects: ['+10% DMG'], drawbacks: ['−4 DODGE'],
          advice: 'Useful when accuracy is already covered. Combining it with Focus Ring gives up more dodge.',
          alternative: 'Choose Reckless Charm instead when misses are the bigger problem. Neither is required to use these builds.', requirements: baseGame, source: 'trinkets'
        }
      ],
      sourceIds: ['highwayman', 'strategy', 'ranges', 'trinkets', 'doctor', 'vestal', 'crusader', 'hellion']
    }
  },
  // Original 17-class gallery scope. Tags summarize capabilities, not tier ratings.
  { id: "abomination", name: "Abomination", roleTags: ["Damage", "Stun", "Blight"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'AB' } },
  { id: "antiquarian", name: "Antiquarian", roleTags: ["Support", "Debuff"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'AQ' } },
  { id: "arbalest", name: "Arbalest", roleTags: ["Damage", "Healing", "Mark"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'AR' } },
  { id: "bounty-hunter", name: "Bounty Hunter", roleTags: ["Damage", "Stun", "Mark"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'BH' } },
  { id: "crusader", name: "Crusader", roleTags: ["Damage", "Stress relief"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'CR' } },
  { id: "grave-robber", name: "Grave Robber", roleTags: ["Damage", "Blight"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'GR' } },
  { id: "hellion", name: "Hellion", roleTags: ["Damage", "Bleed", "Stun"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'HE' } },
  { id: "houndmaster", name: "Houndmaster", roleTags: ["Support", "Guard", "Stun"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'HM' } },
  { id: "jester", name: "Jester", roleTags: ["Stress relief", "Support", "Bleed"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'JE' } },
  { id: "leper", name: "Leper", roleTags: ["Damage", "Self-sustain"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'LE' } },
  { id: "man-at-arms", name: "Man-at-Arms", roleTags: ["Guard", "Support", "Riposte"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'MA' } },
  { id: "occultist", name: "Occultist", roleTags: ["Healing", "Debuff", "Mark"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'OC' } },
  { id: "plague-doctor", name: "Plague Doctor", roleTags: ["Blight", "Stun", "Healing"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'PD' } },
  { id: "vestal", name: "Vestal", roleTags: ["Healing", "Stun"],
    requirements: baseGame, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'VE' } },
  { id: "flagellant", name: "Flagellant", roleTags: ["Bleed", "Healing"],
    requirements: { baseGame: true, dlc: ["The Crimson Court"], mods: [] }, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'FL' } },
  { id: "shieldbreaker", name: "Shieldbreaker", roleTags: ["Damage", "Armor piercing", "Guard break"],
    requirements: { baseGame: true, dlc: ["The Shieldbreaker"], mods: [] }, guide: null,
    galleryArt: { src: null, permission: 'missing', monogram: 'SB' } }
];
