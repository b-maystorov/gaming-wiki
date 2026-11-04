// Regional content and group membership live in location records, not in this template.
export function regionalTeams(location, pack) {
  const general = (pack.teamCompositions || []).filter(team =>
    (location.regionalGuide?.generalTeamIds || []).includes(team.id) && team.regionIds?.includes(location.regionId)
    && team.verification?.status === 'reference-checked');
  const bossSpecific = (pack.bosses || []).filter(boss => (location.bossIds || []).includes(boss.id) && boss.regionIds.includes(location.regionId))
    .flatMap(boss => (boss.counterTeams || []).filter(team => team.verification?.status === 'reference-checked').map(team => ({ ...team, boss })));
  return { general, bossSpecific };
}

export function renderRegionalGuide(location, pack, { escapeHtml: escape, requirementLabel, renderBossCounterPreview, renderEntryArtwork }) {
  const guide = location.regionalGuide || {};
  // Keep source metadata intact; only remove administrative phrasing from player-facing copy.
  const playerText = value => String(value || '').replace(/^Editorial:\s*/i, '').replace(/recorded |documented /gi, '')
    .replace(/not (?:yet )?recorded(?: here)?/gi, 'not available yet').replace(/listed /gi, '');
  const text = value => escape(playerText(value));
  const href = (kind, record) => `#game/darkest-dungeon/${kind}/${record.routeId}`;
  const link = (kind, record) => `<a href="${escape(href(kind, record))}">${escape(record.name)}</a>`;
  const related = (kind, ids = []) => ids.map(id => (pack[kind] || []).find(record => record.id === id)).filter(Boolean);
  function artwork(kind, record, slot = 'thumbnail') {
    const fallbackClass = kind === 'locations' ? 'location-art-fallback' : kind === 'bosses' ? 'location-boss-fallback' : kind === 'curios' ? 'location-curio-fallback' : 'region-enemy-fallback';
    const fallback = `<span class="encyclopedia-mark ${fallbackClass}" role="img" aria-label="${escape(record.name)} artwork unavailable"><span aria-hidden="true">${escape(record.name.split(/\s+/).map(word => word[0]).join('').slice(0, 3))}</span><small>Image unavailable</small></span>`;
    // Prefer a banner, but use an existing primary image when no banner is mapped.
    if (slot === 'banner') return renderEntryArtwork(kind, record, slot, '') || renderEntryArtwork(kind, record, 'primary', fallback);
    return renderEntryArtwork(kind, record, slot, fallback);
  }
  const sectionId = key => `region-${location.routeId}-${key}`;
  const section = (key, title, content) => `<section class="encyclopedia-section region-section" id="${sectionId(key)}" tabindex="-1"><h2>${escape(title)}</h2>${content}</section>`;
  const enemies = related('enemies', location.enemyIds);
  function enemyCard(enemy) {
    const mechanics = (enemy.mechanics || []).filter(Boolean);
    return `<article class="region-enemy-card" data-region-enemy="${escape(enemy.id)}">${artwork('enemies', enemy)}<div><p class="eyebrow">${escape(enemy.enemyType)} · ${requirementLabel(enemy.requirements)}</p><h4>${link('enemies', enemy)}</h4><p>${text(enemy.summary || 'More about this enemy is coming soon.')}</p>${mechanics.length ? `<details><summary>Attacks & things to watch</summary><ul>${mechanics.map(value => `<li>${text(value)}</li>`).join('')}</ul></details>` : ''}</div></article>`;
  }
  const assigned = new Set();
  const enemyGroups = (guide.enemyGroups || []).map(group => {
    const members = enemies.filter(enemy => (group.enemyIds || []).includes(enemy.id) && !assigned.has(enemy.id));
    members.forEach(enemy => assigned.add(enemy.id));
    return { ...group, members };
  });
  const remaining = enemies.filter(enemy => !assigned.has(enemy.id));
  if (remaining.length) enemyGroups.push({ title: 'Enemies you may encounter', note: '', members: remaining });
  const groups = enemyGroups.filter(group => group.members.length).map(group => `<div class="region-enemy-group"><h3>${escape(group.title)}</h3>${group.note ? `<p>${text(group.note)}</p>` : ''}<div class="region-card-grid">${group.members.map(enemyCard).join('')}</div></div>`).join('');
  const curios = related('curios', location.curioIds);
  const curioCards = curios.map(curio => `<article class="location-related-card location-curio-card region-curio-card" data-region-curio="${escape(curio.id)}"><header>${artwork('curios', curio)}<div><p class="eyebrow">${escape(curio.whereFound || 'Curio')} · ${requirementLabel(curio.requirements)}</p><h3>${link('curios', curio)}</h3></div></header>${curio.interactions?.length ? `<dl>${curio.interactions.map(interaction => {
    const item = (pack.items || []).find(item => item.id === interaction.itemId);
    const complete = interaction.certainty !== 'incomplete' && ['reference-checked', 'verified'].includes(interaction.verification?.status);
    return `<div><dt>${item ? link('items', item) : interaction.itemId ? 'Required provision unknown' : 'By hand / no provision'}</dt><dd>${!complete ? '<span class="region-status">Outcome details incomplete.</span> ' : ''}${text(interaction.outcome || 'The outcome is not known yet.')}<small>${interaction.chance ? `Chance: ${escape(interaction.chance)}` : 'Chance unknown'}${interaction.certainty === 'random' ? ' · Random outcome' : ''}</small></dd></div>`;
  }).join('')}</dl>` : '<p>Interactions for this curio are still being added.</p>'}<p class="guide-data-note"><a href="${href('curios', curio)}">Full curio guide →</a></p></article>`).join('');
  const bosses = related('bosses', location.bossIds);
  function bossCard(boss) {
    const mechanics = (boss.mechanics || []).filter(item => item.verification?.status === 'reference-checked');
    const warning = (boss.commonMistakes || []).find(item => item.verification?.status === 'reference-checked');
    return `<article class="location-related-card location-boss-card region-boss-card">${artwork('bosses', boss)}<div><p class="eyebrow">${requirementLabel(boss.requirements)}</p><h3>${link('bosses', boss)}</h3>${boss.guideStatus !== 'available' ? '<span class="boss-status">Guide incomplete</span>' : ''}<p>${text(mechanics[0]?.text || 'Detailed tactics for this encounter are still being added.')}</p>${warning ? `<p class="region-warning"><strong>Warning:</strong> ${text(warning.text)}</p>` : ''}${(boss.counterTeams || []).length ? `<p>Teams for this boss: ${boss.counterTeams.map(team => `<a href="#game/darkest-dungeon/teams/${escape(team.id)}">${escape(team.name)}</a>`).join(' · ')}</p>` : ''}</div></article>`;
  }
  const otherBosses = bosses.filter(boss => boss.categoryIds?.some(id => id.endsWith(':wandering')));
  const regionBosses = bosses.filter(boss => !otherBosses.includes(boss));
  const teams = regionalTeams(location, pack);
  const teamContent = `${teams.general.length ? teams.general.map(team => `<p><a href="#game/darkest-dungeon/teams/${escape(team.id)}">${escape(team.name)}</a> · ${requirementLabel(team.requirements)}</p>`).join('') : `<p>We don’t have a general-purpose ${escape(location.name)} team guide yet. <a href="#game/darkest-dungeon/expedition-planner">Build and review your own party in the Expedition Planner</a>.</p>`}${teams.bossSpecific.length ? `<h3>Teams for specific bosses</h3><p>Choose these for the named boss, not as a ready-made plan for every expedition.</p><div class="boss-counter-teams location-team-grid">${teams.bossSpecific.map(team => `<div>${renderBossCounterPreview(team)}<p class="region-team-strategy"><strong>Starting strategy:</strong> ${text(team.openingStrategy)}</p></div>`).join('')}</div>` : ''}`;
  const provisionIds = [...new Set(curios.flatMap(curio => (curio.interactions || []).map(entry => entry.itemId)).filter(Boolean))];
  const provisions = related('items', provisionIds);
  const equipment = (pack.trinkets || []).filter(item => item.regionIds?.includes(location.regionId));
  const quests = (pack.quests || []).filter(quest => quest.regionIds?.includes(location.regionId));
  const preparationCards = (guide.preparation || []).map(item => `<article class="panel region-prep-card"><h3>${escape(item.title)}</h3><p>${text(item.text)}</p>${item.heroRouteIds?.length ? `<p>Explore these skills: ${item.heroRouteIds.map(id => `<a href="#hero/${escape(id)}/abilities">${escape(id.replaceAll('-', ' '))}</a>`).join(' · ')}</p>` : ''}</article>`).join('');
  const preparation = `${preparationCards ? `<div class="region-card-grid">${preparationCards}</div>` : '<p>Preparation advice for this region is still being added. Review the encounters below before choosing your party.</p>'}${provisions.length ? `<p>Supplies with known curio uses: ${provisions.map(item => link('items', item)).join(' · ')}. Check the interaction before using an item; pack quantities for your actual quest.</p>` : ''}<p class="region-actions"><a href="#game/darkest-dungeon/expedition-planner">Open Expedition Planner →</a><button type="button" data-region-section="${sectionId('teams')}">Explore team guides ↓</button></p>`;
  const navigation = [['overview','Overview'],['prepare','Preparation'],['enemies','Enemies'],['curios','Curios'],['bosses','Bosses'],['teams','Teams']];
  return `<div class="regional-guide"><a class="back-link" href="#game/darkest-dungeon/locations">← All locations</a><header class="region-header"><div class="region-header-image">${artwork('locations', location, 'banner')}</div><div class="region-header-copy"><p class="eyebrow">Darkest Dungeon I · Regional field guide</p><h1 id="page-title" tabindex="-1">${escape(location.name)}</h1><p class="lede">${text(guide.introduction || location.summary || 'More about this region is coming soon.')}</p><p class="region-requirements">${requirementLabel(location.requirements)}</p></div></header><nav class="region-section-nav" aria-label="Regional guide sections">${navigation.map(([key,label]) => `<button type="button" data-region-section="${sectionId(key)}" aria-controls="${sectionId(key)}">${label}</button>`).join('')}</nav>
    ${section('overview','Region overview',`<dl class="region-overview-facts"><div><dt>Main enemy types</dt><dd>${text(guide.mainEnemyTypes || 'Enemy details are still being added.')}</dd></div><div><dt>Major dangers</dt><dd>${text(guide.dangers || 'More encounter advice is coming soon.')}</dd></div><div><dt>Combat considerations</dt><dd>${text(guide.combatConsiderations || 'Check the individual encounters before choosing your skills.')}</dd></div></dl>`)}
    ${section('prepare','Before You Enter',preparation)}
    ${section('enemies','Enemies',groups ? `<p>Enemies you may encounter in this region.</p>${groups}<p class="guide-data-note">Some enemy stats and resistance details are still being added.</p>` : '<p>The enemy guide for this region is still being added.</p>')}
    ${section('curios','Curios',curioCards ? `<p>Check the provision and outcome before interacting. Unlisted interactions are unknown, not necessarily harmful.</p><div class="region-card-grid region-curio-grid">${curioCards}</div>` : '<p>Curio interactions for this region are still being added. No supply recommendations are available yet.</p>')}
    ${section('bosses','Boss encounters',`${regionBosses.length ? `<h3>Regional quest bosses</h3><div class="region-card-grid">${regionBosses.map(bossCard).join('')}</div>` : '<p>Regional boss guides are still being added.</p>'}${otherBosses.length ? `<details class="region-roaming"><summary>Wandering and conditional encounters</summary><p>These encounters can appear under particular conditions; they are not guaranteed. Check any DLC requirements before planning around them.</p><div class="region-card-grid">${otherBosses.map(bossCard).join('')}</div></details>` : ''}`)}
    ${section('teams','Team guides',teamContent)}
    <aside class="region-related-guides" aria-label="Related guides">${guide.coverageNote ? `<p class="guide-data-note">${text(guide.coverageNote)}</p>` : ''}<p><a href="#game/darkest-dungeon/enemies">All enemies</a> · <a href="#game/darkest-dungeon/curios">All curios</a> · <a href="#game/darkest-dungeon/bosses">All bosses</a> · <a href="#game/darkest-dungeon/expedition-planner">Expedition Planner</a></p>${quests.length ? `<details><summary>Related quests</summary><p>${quests.map(quest => link('quests', quest)).join(' · ')}</p></details>` : ''}${equipment.length ? `<details><summary>Related trinkets</summary><p>${equipment.map(item => link('trinkets', item)).join(' · ')}. Compare their effects with your party’s needs.</p></details>` : ''}</aside>
  </div>`;
}
