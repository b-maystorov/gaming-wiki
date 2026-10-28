// Level-one combat skill reference data for the 17-class gallery roster.
// Rank order follows the game guide table: hero ranks 4→1, enemy ranks 1→4.
// Numerical values are a compact reference snapshot; verify against the installed game patch.
export const heroAbilities = {
  abomination: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/abomination', skills: [
    ['Transform', '4,3,2,1', 'Self', '—', '—', '—', 'Enter beast form; +1 SPD; +20% blight resist (4 rounds); +10% damage (3 rounds); party stress +8.'],
    ['Manacles', '3,2', '1,2,3', '-60%', '95', '1%', 'Stun (90%).'],
    ["Beast’s Bile", '3,2', '2 + 3', '-90%', '95', '2%', 'Blight 2/round for 3 rounds; −20% blight resist.'],
    ['Absolution', '4,3,2,1', 'Self', '—', '—', '—', 'Heal 3 HP and 7 stress.'],
    ['Rake', '2,1', '1 + 2', '-50%', '90', '-3%', '+15% damage from Rake for 4 rounds.'],
    ['Rage', '2,1', '1,2,3', '—', '85', '7.5%', 'Single-target attack.'],
    ['Slam', '3,2,1', '1,2', '-25%', '80', '1%', 'Knockback 2; −10 dodge and −2 speed for 4 rounds.'],
    ['Transform', '3,2,1', 'Self', '—', '—', '—', 'Return to human form; −4 SPD; party stress −2.']
  ]},
  antiquarian: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/antiquarian', skills: [
    ['Nervous Stab', '4,3,2,1', '1,2,3', '—', '85', '3%', 'Melee attack.'],
    ['Festering Vapours', '4,3,2,1', '1,2,3,4', '-75%', '95', '—', 'Blight 1/round for 3 rounds; −20% blight resist.'],
    ['Get Down!', '4,3,2,1', 'Self', '—', '—', '—', 'Move back 2; +10% blight chance, +15 dodge, +1 speed.'],
    ['Flashpowder', '4,3,2,1', '1,2,3,4', '-100%', '95', '—', 'Remove stealth; −10 accuracy.'],
    ['Fortifying Vapours', '4,3', 'Any ally', '—', '—', '—', 'Heal 1–1; +10% bleed and blight resist.'],
    ['Invigorating Vapours', '4,3', 'All allies', '—', '—', '—', '+3 dodge.'],
    ['Protect Me!', '4,3,2,1', 'One ally', '—', '—', '—', 'Mark ally and force an ally guard; +4 dodge and +10% PROT.']
  ]},
  arbalest: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/arbalest', skills: [
    ['Sniper Shot', '4,3', '2,3,4', '—', '95', '5%', '+50% damage and +10% crit vs marked.'],
    ['Suppressing Fire', '4,3', '3 + 4', '-80%', '95', '-10%', '−15 accuracy and −15% crit.'],
    ["Sniper’s Mark", '4,3', '2,3,4', '-100%', '100', '—', 'Mark target; −20 dodge.'],
    ['Bola', '4,3', '1 + 2', '-50%', '95', '2%', 'Knockback 1 (75%).'],
    ['Blindfire', '4,3,2,1', '1,2,3,4', '-10%', '75', '—', 'Random target; self +3 speed.'],
    ['Battlefield Bandage', '4,3', 'One ally', '—', '—', '—', 'Heal 2–3; target receives +20% healing.'],
    ['Rallying Flare', '4,3,2,1', 'All enemies', '-100%', '95', '—', 'Remove stealth; clear stun and mark from party; torch +3; 1 stress heal (60%).']
  ]},
  'bounty-hunter': { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/bounty-hunter', skills: [
    ['Collect Bounty', '3,2,1', '1,2', '—', '85', '7.5%', '+90% damage vs marked; +15% vs human.'],
    ['Mark for Death', '4,3,2,1', '1,2,3,4', '-100%', '100', '—', 'Mark target; −10% PROT; self +4 speed.'],
    ['Come Hither', '4,3,2,1', '3,4', '-67%', '90', '—', 'Mark target and pull 2.'],
    ['Uppercut', '2,1', '1,2', '-67%', '90', '—', 'Knockback 2 and stun.'],
    ['Flashbang', '4,3,2', '2,3,4', '-100%', '95', '—', 'Stun (110%); shuffle target.'],
    ['Finish Him', '3,2,1', '1,2,3', '—', '85', '5%', '+25% damage vs stunned.'],
    ['Caltrops', '4,3,2', '3,4', '-95%', '90', '5%', 'Bleed 2/round for 3 rounds; target takes +10% damage and −4 speed.']
  ]},
  crusader: {
    source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/crusader',
    detailsSource: 'https://darkestdungeon.wiki.gg/wiki/Crusader_(Darkest_Dungeon)',
    strategySource: 'https://darkestdungeon.wiki.gg/wiki/Crusader_(Darkest_Dungeon)/Strategy',
    skillDetails: {
      'Smite': {
        type: 'Melee attack',
        target: { side: 'enemy', mode: 'choose-one' },
        description: 'A direct frontline strike that deals bonus damage to Unholy enemies.',
        tacticalNote: 'Use against a priority enemy in rank 1 or 2, especially if it is Unholy.'
      },
      'Zealous Accusation': {
        type: 'Ranged attack',
        target: { side: 'enemy', mode: 'simultaneous' },
        description: 'A ranged attack that hits both front enemy ranks at the same time.',
        tacticalNote: 'Use when both front ranks are worth damaging. This splits damage, so focus fire may be better when removing one enemy would prevent its next action.'
      },
      'Stunning Blow': {
        type: 'Melee attack · Stun',
        target: { side: 'enemy', mode: 'choose-one' },
        description: 'A frontline strike that can stun one enemy, making it lose its next turn if the stun succeeds.',
        tacticalNote: 'Use to delay a dangerous front enemy. Stun resistance can prevent the effect.'
      },
      'Bulwark of Faith': {
        type: 'Self buff · Defense',
        target: { side: 'self', mode: 'self' },
        description: 'Hardens the Crusader and marks him, drawing attacks toward him for a short time.',
        tacticalNote: 'Use when the Crusader can take the incoming hits and you want to protect a more vulnerable ally.',
        extraEffects: ['The PROT bonus and self-mark last 1 battle.', 'Limited to 1 use per battle.']
      },
      'Battle Heal': {
        type: 'Ally heal',
        target: { side: 'ally', mode: 'choose-one' },
        description: 'Restores a small amount of health to one ally in any party position.',
        tacticalNote: 'Use to stabilize a wounded ally when the Crusader does not need to attack.'
      },
      'Holy Lance': {
        type: 'Melee attack · Movement',
        target: { side: 'enemy', mode: 'choose-one' },
        description: 'A lunging strike that reaches the enemy back ranks and moves the Crusader forward.',
        tacticalNote: 'Use after the Crusader has been pushed back, or when the enemy back line is the priority. Check the party formation after he advances.'
      },
      'Inspiring Cry': {
        type: 'Party support · Heal and stress relief',
        target: { side: 'ally', mode: 'all' },
        description: 'Gives every party member a small heal and reduces stress, while raising the torchlight.',
        tacticalNote: 'Use when the party needs a little recovery or the torchlight needs a boost.'
      }
    },
    skills: [
    ['Smite', '2,1', '1,2', '+0%', '85', '0%', '+15% damage vs unholy.'],
    ['Zealous Accusation', '2,1', '1 + 2', '-40%', '85', '—', 'Attack both front enemy ranks.'],
    ['Stunning Blow', '2,1', '1,2', '-50%', '90', '—', 'Stun.'],
    ['Bulwark of Faith', '2,1', 'Self', '—', '—', '—', '+20% PROT; mark self; torch +24.'],
    ['Battle Heal', '4,3,2,1', 'One ally', '—', '—', '—', 'Heal 2–3.'],
    ['Holy Lance', '2,1', '2,3,4', '—', '85', '7.5%', '+15% damage vs unholy; move forward 1.'],
    ['Inspiring Cry', '4,3,2,1', 'All allies', '—', '—', '—', 'Heal 1; heal 5 stress; torch +5.']
  ]},
  flagellant: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/flagellant', skills: [
    ['Punish', '2,1', '1,2', '0%', '95', '6%', 'Bleed 4/round for 3 rounds; −20% bleed resist.'],
    ['Rain of Sorrows', '2,1', '3 + 4', '-67%', '95', '2%', 'Bleed 3/round for 3 rounds; −20% bleed resist.'],
    ['Exsanguinate', '2,1', '1,2', '0%', '90', '3%', 'Bleed 5/round for 3 rounds; self heals 35%, then −25% healing received and −3 speed. Requires low health.'],
    ['Reclaim', '4,3,2,1', 'One ally', '—', '—', '—', 'Target heals 2 per round for 2 rounds; self bleeds.'],
    ['Redeem', '4,3,2,1', 'One ally', '—', '—', '—', 'Target heals 33% max HP; self heals 35% HP. Requires low health; applies speed and healing penalties.'],
    ['Endure', '4,3,2,1', 'One ally', '—', '—', '—', 'Heal 10 stress; self gains 10 stress and +1 speed.'],
    ['Suffer', '4,3,2,1', 'One ally', '—', '—', '—', 'Clear target mark and cure blight/bleed; self takes mark and DoT; self gains stress and death-blow resistance.']
  ]},
  'grave-robber': { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/grave-robber', skills: [
    ['Pick to the Face', '3,2,1', '1,2', '-15%', '90', '1%', 'Ignores PROT.'],
    ['Lunge', '4,3', '1,2,3', '+40%', '95', '10%', '+20% damage vs blighted; move forward 2.'],
    ['Flashing Daggers', '4,3,2', '2 + 3', '-33%', '90', '-5%', '−20% bleed resist.'],
    ['Shadow Fade', '2,1', 'Self', '—', '—', '—', 'Stealth; move back 2; +10 dodge for 5 rounds; +80% damage and +10% crit for 2 rounds.'],
    ['Thrown Dagger', '4,3,2', '2,3,4', '-10%', '90', '10%', '+25% damage vs marked and +20% vs blighted; self +5 accuracy.'],
    ['Poison Dart', '4,3,2', '1,2,3,4', '-60%', '95', '7.5%', 'Blight 2/round for 3 rounds; −20% blight resist.'],
    ['Toxin Trickery', '4,3,2,1', 'Self', '—', '—', '—', 'Cure blight/bleed; +9 dodge and +2 speed for 1 battle.']
  ]},
  hellion: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/hellion', skills: [
    ['Wicked Hack', '2,1', '1,2', '+0%', '85', '5%', 'Melee attack.'],
    ['Iron Swan', '1', '4', '—', '85', '5%', 'Strike the farthest enemy rank.'],
    ['Barbaric YAWP!', '2,1', '1 + 2', '-100%', '95', '—', 'Stun (110%); self −20% damage and −3 speed.'],
    ['If It Bleeds', '3,2,1', '2,3', '-35%', '85', '—', 'Bleed 2/round for 3 rounds.'],
    ['Breakthrough', '4,3,2', '1 + 2 + 3', '-50%', '85', '-1%', 'Move forward 1; self −10% damage and −1 speed.'],
    ['Adrenaline Rush', '4,3,2,1', 'Self', '—', '—', '—', 'Heal 1; cure blight/bleed; +5 accuracy and +20% damage.'],
    ['Bleed Out', '1', '1', '+20%', '85', '7.5%', 'Bleed 3/round for 3 rounds; self −20% damage and −3 speed.']
  ]},
  highwayman: {
    source: 'https://darkestdungeon.wiki.gg/wiki/Highwayman_%28Darkest_Dungeon%29',
    strategySource: 'https://darkestdungeon.wiki.gg/wiki/Highwayman/Strategy',
    mechanicsSource: 'https://darkestdungeon.wiki.gg/wiki/Riposte',
    note: 'Highwayman combat values are the official Darkest Dungeon I campaign skill-level-1 values. They exclude Darkest Dungeon II and Butcher’s Circus changes. No DLC or mods are required for these seven combat skills.',
    skillDetails: {
      'Wicked Slice': {
        type: 'Melee attack',
        target: { side: 'enemy', mode: 'choose-one' },
        description: 'A close-range blade attack against either of the two front enemy ranks.',
        tacticalNote: 'Use when the Highwayman is in the front half of the party and wants to focus one enemy.'
      },
      'Pistol Shot': {
        type: 'Ranged attack',
        target: { side: 'enemy', mode: 'choose-one' },
        description: 'A pistol attack that reaches the enemy back line and deals extra damage to a marked target.',
        tacticalNote: 'Use to reach a priority enemy in ranks 2–4, especially if an ally has marked it.'
      },
      'Point Blank Shot': {
        type: 'Ranged attack · Movement',
        target: { side: 'enemy', mode: 'choose-one' },
        description: 'A powerful shot at the front enemy. The Highwayman moves back one rank, and the target may be knocked back one rank.',
        tacticalNote: 'Use only from the front rank. It can reposition the Highwayman, but its narrow reach makes it situational.',
        extraEffects: ['Enemy knockback is 100% base chance at skill level 1.']
      },
      'Grapeshot Blast': {
        type: 'Ranged attack · Multi-target',
        target: { side: 'enemy', mode: 'simultaneous' },
        description: 'A spread of shots that hits enemy ranks 1, 2, and 3 at the same time.',
        tacticalNote: 'Use when several front enemies can be weakened together; focus one target when a kill is more valuable.',
        extraEffects: ['Targets receive +4% chance to be critically hit for 3 rounds (100% base chance).']
      },
      'Tracking Shot': {
        type: 'Ranged attack · Self buff',
        target: { side: 'enemy', mode: 'choose-one' },
        description: 'A low-damage shot that can bypass and remove an enemy’s Stealth, while improving the Highwayman for the rest of the battle.',
        tacticalNote: 'Use against a stealthed or evasive priority target when the lasting self-buff is worth spending a turn.',
      },
      "Duelist’s Advance": {
        type: 'Melee attack · Movement · Riposte',
        target: { side: 'enemy', mode: 'choose-one' },
        description: 'A forward lunge that hits an enemy in ranks 1–3 and moves the Highwayman forward one rank.',
        tacticalNote: 'Use before enemies act when possible, so the Highwayman has a chance to counter their attacks with Riposte.',
        extraEffects: ['Riposte counters an eligible damaging attack aimed at the Highwayman, even if it misses; Stun disables Riposte.']
      },
      'Open Vein': {
        type: 'Melee attack · Bleed',
        target: { side: 'enemy', mode: 'choose-one' },
        description: 'A blade attack against the two front enemy ranks that inflicts Bleed and weakens Bleed resistance and speed.',
        tacticalNote: 'Use against enemies that can be bled, especially when their Protection makes direct damage less effective.',
      }
    },
    skills: [
    ['Wicked Slice', '3,2,1', '1,2', '+15%', '85', '5%', ''],
    ['Pistol Shot', '4,3,2', '2,3,4', '-15%', '85', '7.5%', '+25% damage vs marked.'],
    ['Point Blank Shot', '1', '1', '+50%', '95', '5%', 'Knockback 1 (100% base); move back 1.'],
    ['Grapeshot Blast', '3,2', '1 + 2 + 3', '-50%', '75', '-9%', 'Attack all three front enemy ranks.'],
    ['Tracking Shot', '4,3,2,1', '2,3,4', '-80%', '95', '0%', 'Bypass/remove Stealth; self +6 ACC, +4% CRIT, +12% DMG for 1 battle; once per battle.'],
    ["Duelist’s Advance", '4,3,2', '1,2,3', '-20%', '90', '5%', 'Move forward 1; activate Riposte for 3 rounds (Riposte −40% DMG at skill level 1).'],
    ['Open Vein', '3,2,1', '1,2', '-15%', '95', '0%', 'Bleed 2 damage/round for 3 rounds; −20% Bleed resist and −1 SPD for 3 rounds (100% base chance).']
  ]},
  houndmaster: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/houndmaster', skills: [
    ["Hound’s Rush", '4,3,2', '1,2,3,4', '+0%', '85', '-3%', 'Bleed 1/round for 3 rounds; +15% damage vs beasts and +60% vs marked.'],
    ["Hound’s Harry", '4,3,2,1', '1 + 2 + 3 + 4', '-75%', '85', '-5%', 'Bleed 1/round for 3 rounds.'],
    ['Target Whistle', '4,3,2,1', '1,2,3,4', '-100%', '100', '—', 'Mark target; −20% PROT.'],
    ['Cry Havoc', '4,3', 'All allies', '—', '—', '—', 'Heal 2 stress (66% chance).'],
    ['Guard Dog', '4,3,2,1', 'One ally', '—', '—', '—', 'Guard an ally; self +10 dodge.'],
    ['Lick Wounds', '4,3,2', 'Self', '—', '—', '—', 'Self heal 4.'],
    ['Blackjack', '2,1', '1,2,3', '-60%', '95', '1%', 'Stun.']
  ]},
  jester: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/jester', skills: [
    ['Dirk Stab', '4,3,2,1', '1,2,3', '+0%', '85', '5%', 'Ignore Guard; +30% Finale damage for 8 rounds; move forward 1.'],
    ['Harvest', '3,2', '2 + 3', '-50%', '90', '—', 'Bleed 2/round for 3 rounds; self +30% Finale damage for 8 rounds.'],
    ['Finale', '2,1', '1,2,3,4', '+50%', '140', '5%', 'Self −25 dodge, −3 speed, +100% stress; move back 3.'],
    ['Solo', '4,3', '1 + 2 + 3 + 4', '-100%', '125', '—', 'Self +20 dodge, +3 speed, +75% Finale damage and +10% Finale crit; move forward 3.'],
    ['Slice Off', '3,2', '2,3', '-33%', '95', '10%', 'Bleed 3/round for 3 rounds; self +30% Finale damage for 8 rounds.'],
    ['Battle Ballad', '4,3', 'All allies', '—', '—', '—', 'Party +5 accuracy, +2% crit, +3 speed; self gains Finale bonuses.'],
    ['Inspiring Tune', '4,3', 'One ally', '—', '—', '—', 'Heal 8 stress and reduce stress damage; self gains Finale bonuses.']
  ]},
  leper: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/leper', skills: [
    ['Chop', '4,3,2,1', '1,2', '+0%', '75', '5%', 'Melee attack.'],
    ['Hew', '2,1', '1 + 2', '-50%', '75', '-4%', 'Attack both front enemy ranks.'],
    ['Purge', '1', '1', '-40%', '85', '—', 'Knockback 3; clear corpses; self +5 accuracy.'],
    ['Revenge', '4,3,2,1', 'Self', '—', '—', '—', '+10 accuracy, +25% damage, +10% crit; −10 dodge and +25% damage taken for 1 battle.'],
    ['Withstand', '3,2,1', 'Self', '—', '—', '—', 'Mark self; +20% PROT and +30% blight/bleed/debuff/move resist.'],
    ['Solemnity', '2,1', 'Self', '—', '—', '—', 'Self heal 6 and stress heal 5.'],
    ['Intimidate', '1', '1,2,3,4', '-85%', '95', '—', 'Remove stealth; reduce target damage and speed; mark self; self +2 speed.']
  ]},
  'man-at-arms': { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/man-at-arms', skills: [
    ['Crush', '2,1', '1,2,3', '+0%', '85', '5%', 'Melee attack.'],
    ['Rampart', '3,2,1', '1,2', '-60%', '90', '5%', 'Knockback 1, stun, move forward 1.'],
    ['Bellow', '4,3,2,1', '1 + 2 + 3 + 4', '-100%', '90', '—', 'Reduce enemy dodge and speed; marked targets receive +5% crit.'],
    ['Defender', '4,3,2,1', 'One ally', '—', '—', '—', 'Guard ally; self +15% PROT.'],
    ['Retribution', '3,2,1', '1,2,3', '-75%', '85', '2.5%', 'Mark target, activate Riposte; riposte damage is reduced.'],
    ['Command', '4,3,2,1', 'All allies', '—', '—', '—', '+5 accuracy and +5% crit; +15% damage while guarded.'],
    ['Bolster', '4,3,2,1', 'All allies', '—', '—', '—', '+5 dodge and −10% stress for 1 battle; once per battle.']
  ]},
  occultist: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/occultist', skills: [
    ['Sacrificial Stab', '3,2,1', '1,2,3', '+0%', '80', '10%', '+15% damage vs eldritch.'],
    ['Abyssal Artillery', '4,3', '3 + 4', '-33%', '85', '—', '+15% damage vs eldritch.'],
    ['Weakening Curse', '4,3,2,1', '1,2,3,4', '-75%', '95', '5%', 'Reduce target damage and PROT.'],
    ['Wyrd Reconstruction', '4,3,2,1', 'One ally', '—', '—', '—', 'Heal 0–13; bleed 1/round for 3 rounds.'],
    ['Vulnerability Hex', '4,3,2,1', '1,2,3,4', '-90%', '95', '5%', 'Mark target; −15 dodge.'],
    ['Hands from the Abyss', '2,1', '1,2,3', '-50%', '90', '10%', 'Stun; torch −5.'],
    ["Daemon’s Pull", '4,3,2', '3,4', '-50%', '90', '5%', 'Pull 2; clear corpses.']
  ]},
  'plague-doctor': { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/plague-doctor', skills: [
    ['Noxious Blast', '4,3,2', '1,2', '-80%', '95', '5%', 'Blight 5/round for 3 rounds; −5 accuracy.'],
    ['Plague Grenade', '4,3', '3 + 4', '-90%', '95', '0%', 'Blight 4/round for 3 rounds.'],
    ['Blinding Gas', '4,3', '3 + 4', '-100%', '95', '—', 'Stun.'],
    ['Incision', '3,2,1', '1,2', '+0%', '85', '5%', 'Bleed 1/round for 3 rounds.'],
    ['Battlefield Medicine', '4,3', 'One ally', '—', '—', '—', 'Heal 1; cure blight/bleed on target and self.'],
    ['Emboldening Vapours', 'Any', 'One ally', '—', '—', '—', '+20% damage and +3 speed for 1 battle.'],
    ['Disorienting Blast', '4,3,2', '2,3,4', '-100%', '95', '—', 'Shuffle target, clear corpses, stun.']
  ]},
  shieldbreaker: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/shieldbreaker', skills: [
    ['Pierce', '3,2,1', '1,2,3,4', '-10%', '90', '5%', 'Armor piercing; move forward 1.'],
    ['Puncture', '4,3,2,1', '1,2,3,4', '-50%', '90', '—', 'Break/bypass guard; pull 2; −1 speed; move forward 1.'],
    ["Adder’s Kiss", '1', '1,2', '+0%', '90', '6%', 'Blight 3/round for 3 rounds; move back 1.'],
    ['Impale', '1', '1 + 2 + 3 + 4', '-60%', '90', '-6%', 'Attack all enemy ranks; move back 1.'],
    ['Expose', '3,2,1', '1,2,3', '-40%', '85', '2.5%', 'Remove stealth; −4 speed and +8% crit received; move back 1.'],
    ['Captivate', '3,2', '2,3', '-25%', '85', '4%', 'Blight 2/round for 3 rounds; +40% damage vs marked.'],
    ['Serpent Sway', '3,2,1', 'Self', '—', '—', '—', 'Move forward 1; 2 blocks; +1 speed. Two uses per battle.']
  ]},
  vestal: { source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458/vestal', skills: [
    ['Mace Bash', '2,1', '1,2', '+0%', '85', '—', '+15% damage vs unholy.'],
    ['Judgement', '4,3', '1,2,3,4', '-25%', '85', '5%', 'Self heal 4.'],
    ['Dazzling Light', '4,3,2', '1,2,3', '-75%', '90', '5%', 'Stun (100%); torch +6.'],
    ['Divine Grace', '4,3', 'One ally', '—', '—', '—', 'Heal 4–5.'],
    ['Divine Comfort', '4,3,2', 'All allies', '—', '—', '—', 'Party heal 1–3.'],
    ['Illumination', '3,2,1', '1,2,3,4', '-50%', '90', '—', 'Remove stealth; −20 dodge; torch +5.'],
    ['Hand of Light', '2,1', '1,2,3', '-50%', '85', '—', 'Self +15% damage vs unholy, +6 accuracy, +25% damage.']
  ]}
};

export const abilityReference = {
  title: 'Combat skill values and rank positions',
  note: 'Combat values are shown at skill level 1 from a community reference last updated in 2018. Skill upgrades change numerical values. Confirm exact values in your current game version; descriptions are concise summaries, not copied game text.',
  source: 'https://gamefaqs.gamespot.com/pc/804193-darkest-dungeon/faqs/76458'
};
