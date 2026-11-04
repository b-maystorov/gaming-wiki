// Regional content and group membership live in the location record, not in this template.
export function regionalTeams(location, pack) {
  const general = (pack.teamCompositions || []).filter(team =>
    location.regionalGuide.generalTeamIds.includes(team.id) && team.regionIds?.includes(location.regionId)
    && team.verification?.status === 'reference-checked');
  const bossSpecific = pack.bosses.filter(boss => location.bossIds.includes(boss.id) && boss.regionIds.includes(location.regionId))
    .flatMap(boss => (boss.counterTeams || []).filter(team => team.verification?.status === 'reference-checked').map(team => ({ ...team, boss })));
  return { general, bossSpecific };
}

export function renderRegionalGuide(location, pack, { escapeHtml: escape, requirementLabel, renderBossCounterPreview, renderEntryArtwork }) {
  const guide = location.regionalGuide;
  const href = (kind, record) => `#game/darkest-dungeon/${kind}/${record.routeId}`;
  const link = (kind, record) => `<a href="${escape(href(kind, record))}">${escape(record.name)}</a>`;
  const sources = ids => [...new Set(ids)].map(id => pack.sources.find(source => source.id === id)).filter(Boolean)
    .map(source => `<a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.title)} ↗</a>`).join(' · ');
  function artwork(kind, record, slot = 'thumbnail') {
    const fallbackClass = kind === 'locations' ? 'location-art-fallback' : kind === 'bosses' ? 'location-boss-fallback' : kind === 'curios' ? 'location-curio-fallback' : 'region-enemy-fallback';
    const fallback = `<span class="encyclopedia-mark ${fallbackClass}" role="img" aria-label="${escape(record.name)} artwork unavailable"><span aria-hidden="true">${escape(record.name.split(/\s+/).map(word => word[0]).join('').slice(0, 3))}</span><small>No local art</small></span>`;
    return renderEntryArtwork(kind, record, slot, fallback);
  }
  const sectionId = key => `region-${location.routeId}-${key}`;
  const section = (key, title, content) => `<section class="encyclopedia-section region-section" id="${sectionId(key)}" tabindex="-1"><h2>${escape(title)}</h2>${content}</section>`;
  const enemies = location.enemyIds.map(id => pack.enemies.find(enemy => enemy.id === id)).filter(Boolean);
  function enemyCard(enemy) {
    return `<article class="region-enemy-card" data-region-enemy="${escape(enemy.id)}">${artwork('enemies', enemy)}<div><p class="eyebrow">${escape(enemy.enemyType)} · ${requirementLabel(enemy.requirements)}</p><h4>${link('enemies', enemy)}</h4><p>${escape(enemy.summary)}</p><details><summary>Mechanics & resistance coverage</summary><ul>${(enemy.mechanics || []).map(text => `<li>${escape(text)}</li>`).join('') || '<li>Mechanics are not recorded.</li>'}</ul><p class="guide-data-note">Numeric weaknesses and tier-specific resistance values are not recorded. ${escape(enemy.verification?.status || 'unverified')}.</p>${sources(enemy.verification?.sourceIds || [])}</details></div></article>`;
  }
  const groups = guide.enemyGroups.map(group => `<div class="region-enemy-group"><h3>${escape(group.title)}</h3><p>${escape(group.note)}</p><div class="region-card-grid">${group.enemyIds.map(id => enemies.find(enemy => enemy.id === id)).filter(Boolean).map(enemyCard).join('')}</div></div>`).join('');
  const curios = location.curioIds.map(id => pack.curios.find(curio => curio.id === id)).filter(Boolean);
  const curioCards = curios.map(curio => `<article class="location-related-card location-curio-card region-curio-card" data-region-curio="${escape(curio.id)}"><header>${artwork('curios', curio)}<div><p class="eyebrow">${escape(curio.whereFound)} · ${requirementLabel(curio.requirements)}</p><h3>${link('curios', curio)}</h3></div></header><dl>${curio.interactions.map(interaction => {
    const item = pack.items.find(item => item.id === interaction.itemId);
    const complete = interaction.certainty !== 'incomplete' && interaction.verification?.status === 'reference-checked';
    return `<div><dt>${item ? link('items', item) : interaction.itemId ? 'Provision record unavailable' : 'By hand / no provision'}</dt><dd><span class="region-status">${complete ? 'Reference-checked' : 'Incomplete / unverified'}</span> ${escape(interaction.outcome)}<small>Recorded chance: ${escape(interaction.chance || 'Not recorded')} · ${escape(interaction.certainty || 'Unknown certainty')}</small></dd></div>`;
  }).join('')}</dl><p class="guide-data-note">${escape(curio.warning)} <a href="${href('curios', curio)}">Details & sources →</a></p></article>`).join('');
  const bosses = location.bossIds.map(id => pack.bosses.find(boss => boss.id === id)).filter(Boolean);
  function bossCard(boss) {
    const mechanics = (boss.mechanics || []).filter(item => item.verification?.status === 'reference-checked');
    const warning = (boss.commonMistakes || []).find(item => item.verification?.status === 'reference-checked');
    return `<article class="location-related-card location-boss-card region-boss-card">${artwork('bosses', boss)}<div><p class="eyebrow">${requirementLabel(boss.requirements)}</p><h3>${link('bosses', boss)}</h3><span class="boss-status">${boss.guideStatus === 'available' ? 'Guide available' : 'Guide incomplete'}</span><p>${escape(mechanics[0]?.text || 'Main mechanic has not been verified in this guide.')}</p>${warning ? `<p class="region-warning"><strong>Warning:</strong> ${escape(warning.text)}</p>` : '<p class="guide-data-note">No separately verified critical warning is recorded; consult the full entry.</p>'}${(boss.counterTeams || []).length ? `<p>Boss-specific counter-team guides: ${(boss.counterTeams || []).map(team => `<a href="#game/darkest-dungeon/teams/${escape(team.id)}">${escape(team.name)}</a>`).join(' · ')}</p>` : ''}</div></article>`;
  }
  const regionBosses = bosses.filter(boss => boss.categoryIds.includes(`darkest-dungeon-1:boss-category:${location.routeId}`));
  const otherBosses = bosses.filter(boss => !regionBosses.includes(boss));
  const teams = regionalTeams(location, pack);
  const teamContent = `<p>General regional suitability and a counter-team for one boss are different assessments.</p>${teams.general.length ? teams.general.map(team => `<p><a href="#game/darkest-dungeon/teams/${escape(team.id)}">${escape(team.name)}</a> · ${requirementLabel(team.requirements)}</p>`).join('') : `<p>No verified general-purpose ${escape(location.name)} composition is recorded. <a href="#game/darkest-dungeon/expedition-planner">Build and review your own team in the Expedition Planner</a>.</p>`}${teams.bossSpecific.length ? `<h3>Recorded boss-specific teams</h3><p>These compositions are documented for their named encounter; they are not recommendations for every expedition in this region.</p><div class="boss-counter-teams location-team-grid">${teams.bossSpecific.map(team => `<div>${renderBossCounterPreview(team)}<p class="region-team-strategy"><strong>Starting strategy:</strong> ${escape(team.openingStrategy)}</p></div>`).join('')}</div>` : ''}`;
  const provisionIds = [...new Set(curios.flatMap(curio => curio.interactions.map(entry => entry.itemId)).filter(Boolean))];
  const provisions = provisionIds.map(id => pack.items.find(item => item.id === id)).filter(Boolean);
  const equipment = pack.trinkets.filter(item => item.regionIds?.includes(location.regionId));
  const preparation = `<p class="eyebrow">Expedition preparation</p><div class="region-card-grid">${guide.preparation.map(item => `<article class="panel region-prep-card"><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p>${item.heroRouteIds.length ? `<p>Capability references: ${item.heroRouteIds.map(id => `<a href="#hero/${escape(id)}/abilities">${escape(id.replaceAll('-', ' '))}</a>`).join(' · ')}</p>` : ''}<details><summary>References</summary>${sources(item.verification.sourceIds)}</details></article>`).join('')}</div><p class="region-actions"><a href="#game/darkest-dungeon/expedition-planner">Open Expedition Planner →</a><button type="button" data-region-section="${sectionId('teams')}">Compare recorded teams ↓</button></p>`;
  const navigation = [['overview','Overview'],['prepare','Preparation'],['enemies','Enemies'],['curios','Curios'],['bosses','Bosses'],['teams','Teams'],['sources','Sources']];
  return `<div class="regional-guide"><a class="back-link" href="#game/darkest-dungeon/locations">← All locations</a><header class="region-header"><div class="region-header-image">${artwork('locations', location, 'banner')}</div><div class="region-header-copy"><p class="eyebrow">Darkest Dungeon I · Regional field guide</p><h1 id="page-title" tabindex="-1">${escape(location.name)}</h1><p class="lede">${escape(guide.introduction)}</p><p class="region-requirements">${requirementLabel(location.requirements)}</p></div></header><nav class="region-section-nav" aria-label="Regional guide sections">${navigation.map(([key,label]) => `<button type="button" data-region-section="${sectionId(key)}" aria-controls="${sectionId(key)}">${label}</button>`).join('')}</nav>
    ${section('overview','Region overview',`<dl class="region-overview-facts"><div><dt>Main enemy types</dt><dd>${escape(guide.mainEnemyTypes)}</dd></div><div><dt>Major dangers</dt><dd>${escape(guide.dangers)}</dd></div><div><dt>Combat considerations</dt><dd>${escape(guide.combatConsiderations)}</dd></div></dl><details><summary>Special mechanics</summary><ul>${(location.specialMechanics || []).map(text => `<li>${escape(text)}</li>`).join('')}</ul></details>`)}
    ${section('prepare',`Before Entering the ${location.name}`,preparation)}
    ${section('enemies','Main enemies & threats',`<p>Regional and shared enemies are grouped by preparation needs. Priority labels are editorial; enemy descriptions follow their linked records.</p>${groups}<p><a href="#game/darkest-dungeon/enemies">Browse all enemies →</a></p>`)}
    ${section('curios','Relevant curios',`<h3>Useful provisions & interactions</h3><p>Known provision links: ${provisions.map(item => link('items', item)).join(' · ')}. No exact expedition quantities are prescribed.</p><p class="guide-data-note">Reference-checked does not mean every outcome is guaranteed. Unlisted interactions are unassessed, not automatically harmful.</p><div class="region-card-grid region-curio-grid">${curioCards}</div><p><a href="#game/darkest-dungeon/curios">Browse all curios →</a></p>`)}
    ${section('bosses','Available bosses',`<h3>Regional quest bosses</h3><div class="region-card-grid">${regionBosses.map(bossCard).join('')}</div>${otherBosses.length ? `<details class="region-roaming"><summary>Wandering and conditional encounters · ${otherBosses.length} records</summary><p>These are shared encounters, not this region’s quest bosses. DLC requirements and incomplete mechanics are shown separately on each card; appearance is conditional, not guaranteed.</p><div class="region-card-grid">${otherBosses.map(bossCard).join('')}</div></details>` : ''}<p><a href="#game/darkest-dungeon/bosses">Browse all bosses →</a></p>`)}
    ${section('teams','Related team compositions',teamContent)}
    ${section('sources','Sources & verification',`<p>${escape(guide.coverageNote)}</p><p>Reference-checked community data; not tested against an installed game patch. Editorial preparation advice is labeled. Numeric enemy stats are intentionally omitted where not recorded.</p><p>${sources(location.verification.sourceIds)}</p>${equipment.length ? `<p>Region-linked equipment records (not automatic recommendations): ${equipment.map(item => link('trinkets', item)).join(' · ')}.</p>` : ''}<p><a href="#game/darkest-dungeon/expedition-planner">Review your party and trinket collection in the Expedition Planner →</a></p>`)}
  </div>`;
}
