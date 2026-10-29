// Shared by collection filters and both search interfaces.
export function matchesCollectionFilter(kind, record, value) {
  if (value === 'all') return true;
  if (!record) return false;
  if (kind === 'trinkets') return record.rarity === value;
  if (kind === 'items' || kind === 'quests') return record.category === value;
  if (kind === 'locations') return record.regionId === value;
  return (record.regionIds || []).includes(value);
}

export function encyclopediaSearchText(kind, record, pack, heroes = []) {
  const names = (collection, ids = []) => ids.map(id =>
    (pack?.[collection] || []).find(entry => entry.id === id)?.name || '').join(' ');
  const text = [record.name, record.summary, record.purpose, record.usage,
    record.whereFound, record.enemyType, record.category, record.rarity, record.duration,
    ...(record.mechanics || []), ...(record.specialMechanics || []),
    ...(record.effects || []).map(effect => `${effect.text} ${effect.condition || ''}`),
    names('regions', record.regionIds || (record.regionId ? [record.regionId] : []))];
  if (kind === 'locations') text.push(names('enemies', record.enemyIds),
    names('bosses', record.bossIds), names('curios', record.curioIds));
  if (kind === 'items') text.push(names('curios', record.relatedCurioIds));
  if (kind === 'curios') for (const interaction of record.interactions || []) {
    text.push(names('items', interaction.itemId ? [interaction.itemId] : []),
      interaction.outcome, interaction.chance, interaction.certainty);
  }
  if (kind === 'trinkets') text.push(...(record.classRestrictionHeroRouteIds || [])
    .map(id => heroes.find(hero => hero.id === id)?.name || id));
  return text.filter(Boolean).join(' ').toLowerCase();
}

export function verificationLabel(kind, record) {
  const status = record.verification?.status;
  const labels = { verified: 'Verified', 'reference-checked': 'Reference-checked',
    unverified: 'Unverified', missing: 'Information missing', unavailable: 'Information unavailable',
    'not-recorded': 'Information not recorded', 'not-applicable': 'Not applicable' };
  const nestedStatuses = [];
  function collect(value) {
    if (!value || typeof value !== 'object') return;
    if (value.verification?.status) nestedStatuses.push(value.verification.status);
    Object.values(value).forEach(collect);
  }
  Object.entries(record).filter(([key]) => key !== 'verification').forEach(([, value]) => collect(value));
  const partial = nestedStatuses.some(value => ['missing', 'not-recorded', 'unverified', 'unavailable'].includes(value))
    || (kind === 'enemies' && (!record.attacks?.length || !Object.keys(record.stats || {}).length))
    || (kind === 'trinkets' && !record.acquisition)
    || (kind === 'curios' && record.interactions?.some(entry => !entry.chance));
  return `${labels[status] || 'Verification not recorded'}${partial ? ' · Partial information' : ''}`;
}
