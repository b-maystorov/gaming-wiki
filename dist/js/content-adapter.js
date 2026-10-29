// Bridges normalized static records to the existing hero page renderer.
export async function loadStructuredGameContent({ heroes, heroAbilities }) {
  const dataUrl = new URL('../data/games/darkest-dungeon-1.json', import.meta.url);
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error(`Structured game data request failed (${response.status}).`);
  const pack = await response.json();
  const collections = ['heroes', 'combatSkills', 'sources', 'dlcs', 'regions', 'bossCategories',
    'bosses', 'enemies', 'trinkets', 'trinketSets', 'items', 'curios', 'locations', 'quests'];
  if (!pack?.game?.versionContext || collections.some(key => !Array.isArray(pack[key]))) {
    throw new Error('Structured game data is missing required collections or version context.');
  }
  const hero = pack.heroes.find(record => record.routeId === 'crusader');
  if (!hero) throw new Error('Structured game data does not contain the Crusader record.');

  const pageHero = heroes.find(record => record.id === hero.routeId);
  if (!pageHero) throw new Error(`No roster entry exists for ${hero.routeId}.`);
  // Finish conversion before mutating the legacy roster so failed loads stay isolated.
  const abilities = toLegacyAbilityEntry(pack, hero);
  Object.assign(pageHero, {
    roleTags: hero.roleTags,
    role: hero.role,
    summary: hero.summary,
    preferredPositions: hero.preferredPositions,
    alternativePositions: hero.alternativePositions,
    requirements: hero.requirements,
    overview: hero.overview,
    galleryArt: {
      src: hero.artwork.gallery.path,
      alt: hero.artwork.gallery.alt,
      monogram: hero.artwork.gallery.monogram,
      credit: hero.artwork.gallery.credit,
      permission: 'user-provided'
    }
  });

  heroAbilities.crusader = abilities;
  return pack;
}

function toLegacyAbilityEntry(pack, hero) {
  const records = pack.combatSkills.filter(skill => skill.heroId === hero.id);
  const skillDetails = {};
  const skills = records.map(skill => {
    const target = skill.rankRules.target;
    const targetLabel = target.side === 'self'
      ? 'Self'
      : target.side === 'ally'
        ? target.mode === 'all' ? 'All allies' : 'One ally'
        : target.mode === 'simultaneous'
          ? target.ranks.join(' + ')
          : target.ranks.join(',');
    const effects = skill.level1.effects;
    const primaryEffects = effects.filter(effect => effect.presentationGroup !== 'detail').map(effect => effect.text);
    const detailEffects = effects.filter(effect => effect.presentationGroup === 'detail').map(effect => effect.text);
    skillDetails[skill.name] = {
      type: skill.category,
      target: { side: target.side, mode: target.mode },
      description: skill.editorial.description,
      tacticalNote: skill.editorial.whenToUse,
      ...(detailEffects.length ? { extraEffects: detailEffects } : {})
    };
    return [
      skill.name,
      skill.rankRules.heroPositions.join(','),
      targetLabel,
      formatLegacyStat(skill.level1.damageModifier),
      formatLegacyStat(skill.level1.accuracy),
      formatLegacyStat(skill.level1.criticalModifier),
      primaryEffects.join('; ')
    ];
  });

  return {
    source: sourceUrl(pack, 'dd1-crusader-gamefaqs'),
    detailsSource: sourceUrl(pack, 'dd1-crusader-wiki'),
    strategySource: sourceUrl(pack, 'dd1-crusader-strategy'),
    skillDetails,
    skills
  };
}

function formatLegacyStat(stat) {
  if (stat.value === null || stat.value === undefined) return '—';
  if (stat.unit === 'points') return String(stat.value);
  const sign = stat.sign === 'always' && stat.value >= 0 ? '+' : '';
  return `${sign}${stat.value}%`;
}

function sourceUrl(pack, sourceId) {
  return pack.sources.find(source => source.id === sourceId)?.url || '';
}
