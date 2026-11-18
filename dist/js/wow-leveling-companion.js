const COMPANION_TABS = ['overview', 'stats', 'talents', 'gear', 'leveling', 'professions'];
const COMPANION_TAB_LABELS = { overview: 'Overview', stats: 'Stats', talents: 'Talents', gear: 'Weapons & Gear', leveling: 'Leveling', professions: 'Professions' };
const COMPANION_STORAGE_PREFIX = 'bm-wow-leveling-companion-v1:';

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function validLevel(value, fallback = 1) {
  const level = Number(value);
  return Number.isFinite(level) ? Math.max(1, Math.min(60, Math.round(level))) : fallback;
}

function specIds(specializations = []) {
  return specializations.map(spec => spec.id).filter(id => typeof id === 'string' && id);
}

export function normalizeCompanionState(classId, state = {}, specializations = []) {
  const ids = specIds(specializations);
  const fallbackSpec = ids[0] || '';
  return {
    classId: typeof classId === 'string' ? classId : '',
    level: validLevel(state.level ?? state.currentLevel, 1),
    specializationId: ids.includes(state.specializationId) ? state.specializationId : fallbackSpec,
    tab: COMPANION_TABS.includes(state.tab) ? state.tab : 'overview',
    selectedTalentId: typeof state.selectedTalentId === 'string' ? state.selectedTalentId : ''
  };
}

export function updateCompanionState(classId, state, change, specializations = []) {
  return normalizeCompanionState(classId, { ...state, ...change }, specializations);
}

export function loadCompanionState(classId, fallback = {}, specializations = [], storage) {
  const initial = normalizeCompanionState(classId, fallback, specializations);
  try {
    const store = storage ?? globalThis.localStorage;
    const saved = JSON.parse(store?.getItem(`${COMPANION_STORAGE_PREFIX}${classId}`) || 'null');
    if (!saved || typeof saved !== 'object') return initial;
    return normalizeCompanionState(classId, { ...initial, ...saved }, specializations);
  } catch {
    return initial;
  }
}

export function saveCompanionState(state, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    if (!store?.setItem || !state?.classId) return false;
    store.setItem(`${COMPANION_STORAGE_PREFIX}${state.classId}`, JSON.stringify({
      level: validLevel(state.level),
      specializationId: state.specializationId,
      tab: COMPANION_TABS.includes(state.tab) ? state.tab : 'overview',
    }));
    return true;
  } catch {
    return false;
  }
}

function levelRange(range) {
  const values = String(range || '').match(/\d+/g)?.map(Number);
  return values?.length >= 2 ? values : null;
}

function rangesOverlap(level, minimum, maximum) {
  return Number.isFinite(Number(minimum)) && Number.isFinite(Number(maximum)) && level >= Number(minimum) && level <= Number(maximum);
}

function selectedData(guideData, state) {
  const classRecord = guideData?.classRecord || {};
  const specializations = classRecord.specializations || guideData?.specializations || [];
  const specialization = specializations.find(spec => spec.id === state.specializationId) || null;
  const configuredGuides = guideData?.guides;
  const specializationGuide = Array.isArray(configuredGuides)
    ? configuredGuides.find(item => item.specializationId === state.specializationId || item.specialization === specialization?.name)
    : configuredGuides?.[state.specializationId];
  const guide = specializationGuide || guideData?.guide || classRecord.starterGuide || null;
  const guideMatchesSpec = Boolean(guide && specialization && (specializationGuide || guide.specialization === specialization.name));
  const specializationGuideContent = guideData?.specializationGuides?.[state.specializationId]
    || classRecord.specializationGuides?.[state.specializationId]
    || null;
  return { classRecord, specializations, specialization, guide, guideMatchesSpec, specializationGuideContent };
}

function treePoints(tree, allocation) {
  return (tree?.talents || []).reduce((sum, talent) => sum + (Number(allocation?.[talent.id]) || 0), 0);
}

function pointsAboveRow(tree, row, allocation) {
  return (tree?.talents || []).reduce((sum, talent) => talent.row < row ? sum + (Number(allocation?.[talent.id]) || 0) : sum, 0);
}

// Forever tree references describe five points per row; the planning reference notes Blizzard
// has not separately confirmed this inherited rule: wow-forever.gg/news/2026-09-18-forever-talent-trees/
// and foreverwow.com/talents/.
export function companionTalentLock(talent, tree, allocation) {
  const requiredPoints = Math.max(0, (Number(talent?.row) - 1) * 5);
  const spent = pointsAboveRow(tree, Number(talent?.row), allocation);
  const prerequisite = talent?.prerequisite
    ? tree?.talents?.find(item => item.name === talent.prerequisite)
    : null;
  const unmetPrerequisite = Boolean(talent?.prerequisite && (!prerequisite || Number(allocation?.[prerequisite.id] || 0) < prerequisite.maxRank));
  return {
    requiredPoints,
    spent,
    tierLocked: spent < requiredPoints,
    prerequisiteLocked: unmetPrerequisite,
    locked: spent < requiredPoints || unmetPrerequisite
  };
}

export function validateCompanionTalentTiers(tree, allocation) {
  return (tree?.talents || [])
    .filter(talent => Number(allocation?.[talent.id]) > 0 && pointsAboveRow(tree, Number(talent.row), allocation) < Math.max(0, (Number(talent.row) - 1) * 5))
    .map(talent => `${talent.name} requires ${Math.max(0, (Number(talent.row) - 1) * 5)} points in this tree.`);
}

function sourceSupportedBuildFor(state, progressionEngine) {
  return progressionEngine?.builds?.find(build => build.classId === state.classId
    && build.specializationId === state.specializationId
    && ['verified', 'source-supported'].includes(build.verificationStatus)
    && build.coverage?.status === 'complete') || null;
}

export function findCompanionTalentTree(classRecord, specializationId, specializationName = '') {
  const trees = classRecord?.trees || [];
  const direct = trees.find(tree => tree.id === specializationId);
  if (direct) return direct;
  const normalizedName = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const specKey = normalizedName(specializationId);
  const nameKey = normalizedName(specializationName);
  return trees.find(tree => normalizedName(tree.id).startsWith(specKey) || normalizedName(tree.name) === nameKey || normalizedName(tree.name).startsWith(nameKey)) || null;
}

function getAutomaticTalentData(state, guideData, progressionEngine) {
  const classRecord = guideData.talentClass || progressionEngine?.catalog?.classes?.find(item => item.id === state.classId);
  const catalog = progressionEngine?.catalog || { classes: classRecord ? [classRecord] : [] };
  const specialization = (guideData.classRecord?.specializations || guideData.specializations || []).find(item => item.id === state.specializationId);
  const tree = findCompanionTalentTree(classRecord, state.specializationId, specialization?.name);
  const availablePoints = progressionEngine?.availablePoints?.(state.level, 0) ?? 0;
  const matchingBuilds = (progressionEngine?.builds || []).filter(build => build.classId === state.classId && build.specializationId === state.specializationId);
  const build = sourceSupportedBuildFor(state, progressionEngine);
  let recommended = build && progressionEngine?.resolve
    ? progressionEngine.resolve(build, catalog, state.level)
    : null;
  let availabilityReason = '';
  if (!tree) availabilityReason = `The ${specialization?.name || state.specializationId} talent tree is missing from the loaded Forever client data.`;
  else if (!matchingBuilds.length) availabilityReason = `No automatic leveling build for ${classRecord?.name || state.classId} ${specialization?.name || state.specializationId} was loaded.`;
  else if (!build) {
    const candidate = matchingBuilds[0];
    availabilityReason = !['verified', 'source-supported'].includes(candidate.verificationStatus)
      ? `The saved build is not eligible for automatic use (status: ${candidate.verificationStatus || 'not recorded'}).`
      : `The saved build does not have complete coverage (status: ${candidate.coverage?.status || 'not recorded'}).`;
  } else if (!progressionEngine?.resolve) availabilityReason = 'The guided-build resolver is unavailable.';
  else if (!recommended?.valid) availabilityReason = `The saved build failed validation: ${(recommended?.issues || ['the resolver returned no allocation']).join(' ')}`;
  else if (state.level >= (build.levelRange?.from || 1) && recommended.total !== availablePoints) {
    recommended = { ...recommended, valid: false };
    availabilityReason = `The saved build allocates ${recommended.total} of ${availablePoints} available talent points at level ${state.level}.`;
  }
  const allocation = recommended?.valid ? recommended.allocation : {};
  const allTrees = classRecord?.trees || [];
  const selectedTalent = allTrees.flatMap(item => item.talents || []).find(talent => talent.id === state.selectedTalentId)
    || tree?.talents?.[0] || null;
  const selectedTree = allTrees.find(item => item.talents?.some(talent => talent.id === selectedTalent?.id)) || tree;
  const baseValidation = classRecord && progressionEngine?.validate
    ? progressionEngine.validate(classRecord, allocation, availablePoints)
    : { total: treePoints(tree, allocation), valid: true, issues: [] };
  const tierIssues = allTrees.flatMap(item => validateCompanionTalentTiers(item, allocation));
  const validation = { ...baseValidation, valid: baseValidation.valid && !tierIssues.length, issues: [...baseValidation.issues, ...tierIssues] };
  if (recommended?.valid && !validation.valid) {
    recommended = { ...recommended, valid: false };
    availabilityReason = `The saved build failed talent validation: ${validation.issues.join(' ')}`;
  }
  return { classRecord, tree, allTrees, selectedTree, availablePoints, allocation, selectedTalent, validation, build, recommended, availabilityReason };
}

export function getCompanionPanel(state, guideData = {}, progressionEngine = {}) {
  const { classRecord, specialization, guide, guideMatchesSpec, specializationGuideContent } = selectedData(guideData, state);
  const specName = specialization?.name || 'Specialization';
  if (state.tab === 'stats' && classRecord.statsGuide) {
    const priority = classRecord.statsGuide.priorities?.[state.specializationId];
    return {
      heading: `${specName} · Stats & Attributes`,
      statsGuide: classRecord.statsGuide,
      priority: priority ? { ...priority, id: state.specializationId } : null,
      sections: [],
      notices: priority ? [] : [`No stat guidance is recorded for ${specName}.`],
      sourceIds: [...new Set(['foreverdb-stats', ...(priority?.sourceIds || []), ...(classRecord.statsGuide.upgradeSourceIds || [])])]
    };
  }
  if (state.tab !== 'talents' && specializationGuideContent) {
    const tabContent = specializationGuideContent.sections?.[state.tab];
    const sourceIds = tabContent?.sourceIds || specializationGuideContent.sourceIds || [];
    if (state.tab === 'leveling') {
      const milestones = tabContent?.milestones || [];
      const learned = milestones.filter(milestone => milestone.level <= state.level);
      const next = milestones.find(milestone => milestone.level > state.level);
      const sections = [];
      if (learned.length) sections.push({ title: `Recorded milestones through level ${state.level}`, items: learned.map(item => `Level ${item.level} · ${item.kind} · ${item.text}`) });
      if (next) sections.push({ title: `Next recorded milestone · Level ${next.level}`, text: next.text });
      const factionZones = Object.entries(tabContent?.zones || {}).map(([faction, zones]) => `${faction}: ${zones.join(' · ')}`);
      if (factionZones.length) sections.push({ title: 'Source-listed zone options · level brackets not retained', items: factionZones });
      if (tabContent?.dungeons?.length) sections.push({ title: 'Dungeons named by the leveling source', items: tabContent.dungeons });
      return {
        heading: `${specName} leveling · Level ${state.level}`,
        sections,
        notices: tabContent?.zoneSourceDisclosure ? [tabContent.zoneSourceDisclosure] : [],
        sourceIds
      };
    }
    if (tabContent?.sections?.length) return {
      heading: `${specName} · ${COMPANION_TAB_LABELS[state.tab] || state.tab}`,
      sections: tabContent.sections,
      notices: [],
      sourceIds
    };
  }
  if (state.tab === 'overview') {
    const sections = [];
    if (guideMatchesSpec && guide?.reason) sections.push({ title: 'Existing class recommendation', text: guide.reason });
    const activeBand = guideMatchesSpec
      ? guide?.levelingBands?.find(band => {
        const range = levelRange(band.range);
        return range && state.level >= range[0] && state.level <= range[1];
      })
      : null;
    if (activeBand) sections.push({
      title: activeBand.range,
      items: [activeBand.combat, activeBand.survival, activeBand.milestones].filter(Boolean)
    });
    const zones = (guideData.zones || []).filter(zone => {
      const range = levelRange(zone.range);
      return range && state.level >= range[0] && state.level <= range[1];
    });
    if (zones.length) sections.push({ title: 'Recorded world-zone ranges · not a class route', items: zones.map(zone => `${zone.name} · levels ${zone.range} · ${zone.faction}${zone.access ? ` · ${zone.access}` : ''}`) });
    const quests = (guideData.quests || []).filter(quest => Number.isFinite(Number(quest.level)) && Number(quest.level) === state.level);
    if (quests.length) sections.push({ title: 'Recorded class quests', items: quests.map(quest => `${quest.name}${quest.reward ? ` · ${quest.reward}` : ''}`) });
    const dungeons = (guideData.dungeons || []).filter(dungeon => rangesOverlap(state.level, dungeon.minLevel, dungeon.maxLevel));
    if (dungeons.length) sections.push({ title: 'Dungeon level ranges', items: dungeons.map(dungeon => `${dungeon.name} · levels ${dungeon.minLevel}–${dungeon.maxLevel}`) });
    const notices = [];
    if (!activeBand) notices.push('Guide data coming soon for this specialization and level.');
    if (!quests.length) notices.push('Guide data coming soon for level-matched class quests.');
    if (!zones.length) notices.push('Guide data coming soon for a recorded zone range at this level.');
    return {
      heading: `${classRecord.name || state.classId} · ${specName} · Level ${state.level}`,
      sections,
      notices
    };
  }

  if (state.tab === 'talents') {
    const treeData = getAutomaticTalentData(state, guideData, progressionEngine);
    return {
      heading: `${specName} talent tree · Level ${state.level}`,
      treeData,
      sections: [{ title: 'Talent points spent / available', text: `${treeData.validation.total} / ${treeData.availablePoints}` }],
      notices: treeData.tree
        ? (treeData.recommended?.valid ? [] : [treeData.availabilityReason || 'Automatic talent allocation is unavailable for this specialization.'])
        : [treeData.availabilityReason || 'Talent tree data coming soon for this specialization.'],
      note: 'Talent points start at level 10 and exclude Talented Legacy bonus points.'
    };
  }

  if (state.tab !== 'gear') return {
    heading: `${specName} · ${COMPANION_TAB_LABELS[state.tab] || state.tab}`,
    sections: [],
    notices: ['Guide data coming soon for this specialization.']
  };

  const gear = guideMatchesSpec ? guide?.gear : '';
  return {
    heading: `${specName} gear`,
    sections: gear ? [{ title: 'Existing guide recommendation', text: gear }] : [],
    notices: gear ? [] : ['Guide data coming soon for this specialization’s gear recommendations.']
  };
}

function renderTalentTree(state, treeData, escapeHtml) {
  const { tree, allTrees, selectedTree, allocation, validation, selectedTalent } = treeData;
  if (!tree) return '';
  const renderTree = currentTree => {
    const maxRow = Math.max(...currentTree.talents.map(talent => talent.row));
    const maxColumn = Math.max(...currentTree.talents.map(talent => talent.column));
    const talentsByName = new Map(currentTree.talents.map(talent => [talent.name, talent]));
    const connectors = currentTree.talents.flatMap(talent => {
      const prerequisite = talentsByName.get(talent.prerequisite);
      if (!prerequisite) return [];
      const active = Number(allocation[talent.id]) > 0;
      return [`<line class="wow-companion-connector${active ? ' is-active' : ''}" marker-end="url(#companion-arrow-${currentTree.id}${active ? '-active' : ''})" x1="${prerequisite.column - 0.5}" y1="${prerequisite.row - 0.5}" x2="${talent.column - 0.5}" y2="${talent.row - 0.5}"></line>`];
    }).join('');
    const nodes = currentTree.talents.map(talent => {
      const rank = Number(allocation[talent.id]) || 0;
      const lock = companionTalentLock(talent, currentTree, allocation);
      const classes = ['wow-companion-tree-node', rank ? 'is-spent' : '', lock.locked ? 'is-locked' : ''].filter(Boolean).join(' ');
      const lockHint = lock.tierLocked
        ? `Requires ${lock.requiredPoints} points spent in this tree.`
        : lock.prerequisiteLocked ? `Requires ${talent.prerequisite} at full rank.` : '';
      return `<article class="${classes}" style="grid-row:${talent.row};grid-column:${talent.column}"><button type="button" class="wow-companion-tree-icon" data-companion-talent="${escapeHtml(talent.id)}" aria-label="Inspect ${escapeHtml(talent.name)}, rank ${rank} of ${talent.maxRank}${lockHint ? `, locked: ${lockHint}` : ''}" aria-pressed="${talent.id === state.selectedTalentId}" title="${escapeHtml(lockHint || talent.name)}">${talent.icon ? `<img src="${escapeHtml(talent.icon)}" alt="" width="56" height="56" loading="lazy">` : `<span>${escapeHtml(talent.name.slice(0, 1))}</span>`}<strong>${rank}/${talent.maxRank}</strong></button><span class="wow-companion-tree-name">${escapeHtml(talent.name)}</span></article>`;
    }).join('');
    const selectedPath = currentTree.id === tree.id;
    return `<section class="wow-companion-tree${selectedPath ? ' is-primary' : ' is-secondary'} tree-${escapeHtml(currentTree.id)}" aria-label="${escapeHtml(currentTree.name)} talent tree"${selectedPath ? ' aria-current="true"' : ''}><header><h4>${escapeHtml(currentTree.name)}</h4><span>${selectedPath ? 'Selected path · ' : ''}${treePoints(currentTree, allocation)} points</span></header><div class="wow-companion-tree-scroll"><div class="wow-companion-tree-grid" style="--talent-columns:${maxColumn};--talent-rows:${maxRow}"><svg class="wow-companion-connectors" viewBox="0 0 ${maxColumn} ${maxRow}" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="companion-arrow-${escapeHtml(currentTree.id)}" viewBox="0 0 4 3" refX="3.4" refY="1.5" markerWidth="4" markerHeight="3" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 4 1.5 L 0 3 z" fill="#49657f"></path></marker><marker id="companion-arrow-${escapeHtml(currentTree.id)}-active" viewBox="0 0 4 3" refX="3.4" refY="1.5" markerWidth="4" markerHeight="3" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 4 1.5 L 0 3 z" fill="#d6a34e"></path></marker></defs>${connectors}</svg>${nodes}</div></div></section>`;
  };
  const visibleTrees = allTrees?.length ? allTrees : [tree];
  const selectedRank = selectedTalent ? Number(allocation[selectedTalent.id]) || 0 : 0;
  const selectedLock = selectedTalent ? companionTalentLock(selectedTalent, selectedTree, allocation) : null;
  const detail = selectedTalent ? `<aside class="wow-companion-talent-detail" aria-live="polite"><div class="wow-companion-talent-detail-heading">${selectedTalent.icon ? `<img src="${escapeHtml(selectedTalent.icon)}" alt="" width="48" height="48">` : ''}<div><h4>${escapeHtml(selectedTalent.name)}</h4><p>Rank ${selectedRank} / ${selectedTalent.maxRank}</p></div></div><p>${escapeHtml(selectedTalent.rankEffects?.[Math.max(0, selectedRank - 1)] || selectedTalent.rankEffects?.[0] || 'Description not recorded.')}</p>${selectedTalent.rankEffects?.length > 1 ? `<ol>${selectedTalent.rankEffects.map((effect, index) => `<li${index + 1 === selectedRank ? ' aria-current="true"' : ''}><strong>Rank ${index + 1}:</strong> ${escapeHtml(effect)}</li>`).join('')}</ol>` : ''}${selectedLock?.locked ? `<p class="wow-companion-tree-lock-note">${selectedLock.tierLocked ? `Spend ${selectedLock.requiredPoints} points in this tree to unlock this row.` : `Requires ${escapeHtml(selectedTalent.prerequisite)} at full rank.`}</p>` : ''}</aside>` : '';
  return `<div class="wow-companion-tree-layout"><div class="wow-companion-tree-stack">${visibleTrees.map(renderTree).join('')}</div>${detail}</div>`;
}

function renderStatsGuide(statsGuide, priority, escapeHtml) {
  if (!statsGuide || !priority) return '';
  const renderPriority = (title, items) => `<section class="wow-stat-priority-group"><h4>${escapeHtml(title)}</h4><ol>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol></section>`;
  const priorities = priority.items
    ? renderPriority(priority.label, priority.items)
    : `${renderPriority('Threat & damage', priority.offense || [])}${renderPriority('Survival', priority.defense || [])}`;
  const rows = statsGuide.attributes.map(stat => `<li class="wow-stat-row"><img src="${escapeHtml(stat.icon)}" alt="" width="36" height="36" loading="lazy"><strong>${escapeHtml(stat.name)}</strong><span>${escapeHtml(stat.summary)}</span></li>`).join('');
  const explanations = statsGuide.explanations.map(item => {
    const sources = (item.sourceIds || []).map(id => statsGuide.sourceCatalog?.[id]).filter(Boolean);
    const links = sources.length ? `<span class="wow-stat-explanation-sources">Sources: ${sources.map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>`).join(' · ')}</span>` : '';
    return `<details class="wow-stat-explanation"><summary>${escapeHtml(item.title)}</summary><p>${escapeHtml(item.text)}</p>${links}</details>`;
  }).join('');
  return `<div class="wow-stats-guide" data-stats-specialization="${escapeHtml(priority.id || '')}"><section class="wow-stat-priority"><div class="wow-stat-section-heading"><h4>${escapeHtml(priority.label || 'Specialization priority')}</h4><span>${escapeHtml(priority.note || 'Guide order · not stat weights')}</span></div><div class="wow-stat-priority-groups">${priorities}</div></section><section class="wow-stat-attributes"><h4>Warrior attributes</h4><ul class="wow-stat-rows">${rows}</ul></section><section class="wow-stat-explanations"><h4>Mechanics &amp; context</h4>${explanations}</section><section class="wow-stat-upgrade"><h4>What should I upgrade next?</h4><p>${escapeHtml(statsGuide.upgradeAdvice)}</p></section></div>`;
}

function renderPanel(state, guideData, escapeHtml, progressionEngine = {}, storage) {
  const panel = getCompanionPanel(state, guideData, progressionEngine);
  const sections = panel.sections.map(section => `<section class="wow-companion-result"><h4>${escapeHtml(section.title)}</h4>${section.text ? `<p>${escapeHtml(section.text)}</p>` : ''}${section.items?.length ? `<ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</section>`).join('');
  const notices = (panel.notices || []).map(notice => `<p class="wow-companion-missing" role="status">${escapeHtml(notice)}</p>`).join('');
  const sources = (panel.sourceIds || []).map(sourceId => guideData.sources?.find(source => source.id === sourceId)).filter(Boolean);
  const sourceLinks = sources.length ? `<p class="wow-companion-guide-sources">Sources: ${sources.map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>`).join(' · ')}</p>` : '';
  const treeData = panel.treeData;
  const statsGuide = panel.statsGuide ? { ...panel.statsGuide, sourceCatalog: Object.fromEntries((guideData.sources || []).map(source => [source.id, source])) } : null;
  const statsPanel = statsGuide ? renderStatsGuide(statsGuide, panel.priority, escapeHtml) : '';
  const nextRecommended = treeData?.recommended?.valid && treeData.recommended.nextChange
    ? `<p class="wow-companion-next-talent">Next recommended talent · Unlocks at level ${treeData.recommended.nextChange.level} · ${escapeHtml(treeData.tree.talents.find(talent => talent.id === treeData.recommended.nextChange.talentId)?.name || 'Talent')}</p>`
    : '';
  const sourceAttribution = treeData?.build?.sourceUrl
    ? `<p class="wow-companion-build-source">Source: <a href="${escapeHtml(treeData.build.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(treeData.build.sourceTitle || treeData.build.name)}</a>. ${escapeHtml(treeData.build.confidence || '')}${treeData.build.comparisonSourceDetails?.map(source => ` <span>Comparison: <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a> (${escapeHtml(source.note)}).</span>`).join('') || ''}</p>`
    : '';
  const talentPanel = treeData ? `${treeData.tree ? renderTalentTree(state, treeData, escapeHtml) : ''}${treeData.recommended?.valid ? nextRecommended : ''}${sourceAttribution}${treeData.validation.issues.length ? `<p class="wow-companion-missing" role="status">Progression data needs review: ${escapeHtml(treeData.validation.issues.join(' '))}</p>` : ''}${treeData.build?.tierRuleDisclosure ? `<p class="wow-companion-tier-source">${escapeHtml(treeData.build.tierRuleDisclosure)}</p>` : ''}` : '';
  return `<h3 data-companion-heading>${escapeHtml(panel.heading)}</h3>${sections || ''}${statsPanel}${treeData ? talentPanel : ''}${panel.note ? `<p class="wow-companion-note">${escapeHtml(panel.note)}</p>` : ''}${notices}${sourceLinks}`;
}

export function renderLevelingCompanion({ classId, currentLevel = 1, selectedSpecialization = '', guideData = {}, progressionEngine = {}, escapeHtml = escapeText, storage } = {}) {
  progressionEngine = { ...progressionEngine, storage };
  const classRecord = guideData.classRecord || {};
  const specializations = classRecord.specializations || guideData.specializations || [];
  const state = loadCompanionState(classId, { level: currentLevel, specializationId: selectedSpecialization, tab: 'overview' }, specializations, storage);
  const prefix = String(classId || 'class').replace(/[^a-z0-9-]/gi, '-');
  const options = specializations.map(spec => `<option value="${escapeHtml(spec.id)}"${spec.id === state.specializationId ? ' selected' : ''}>${escapeHtml(spec.name)} · ${escapeHtml(spec.role)}</option>`).join('');
  const tabs = COMPANION_TABS.map(tab => `<button type="button" role="tab" id="${prefix}-companion-tab-${tab}" aria-controls="${prefix}-companion-panel" aria-selected="${state.tab === tab}" tabindex="${state.tab === tab ? '0' : '-1'}" data-companion-tab="${tab}">${COMPANION_TAB_LABELS[tab]}</button>`).join('');
  const title = classId === 'warrior' ? 'Warrior Guide' : 'Leveling Companion';
  const specializationControl = classId === 'warrior'
    ? `<select id="${prefix}-companion-spec" data-companion-spec hidden aria-hidden="true" tabindex="-1">${options}</select>`
    : `<label for="${prefix}-companion-spec">Specialization</label><select id="${prefix}-companion-spec" data-companion-spec>${options}</select>`;
  return `<section class="wow-leveling-companion" data-leveling-companion data-class-id="${escapeHtml(classId)}" style="--class-accent:${escapeHtml(classRecord.color || '#c79c6e')}" aria-labelledby="${prefix}-companion-title"><header><div><p class="wow-companion-kicker">Field guide · ${escapeHtml(classRecord.name || classId)}</p><h2 id="${prefix}-companion-title">${title}</h2></div><span data-companion-level-badge>Level ${state.level}</span></header><div class="wow-companion-controls"><label for="${prefix}-companion-level">Current level <output data-companion-level>${state.level}</output></label><input id="${prefix}-companion-level" type="range" min="1" max="60" step="1" value="${state.level}" aria-label="Current level" aria-valuetext="Level ${state.level}" data-companion-level-input>${specializationControl}</div><div class="wow-companion-tabs" role="tablist" aria-label="${escapeHtml(classRecord.name || classId)} companion guide">${tabs}</div><div class="wow-companion-panel" id="${prefix}-companion-panel" role="tabpanel" tabindex="0" aria-labelledby="${prefix}-companion-tab-${state.tab}" data-companion-panel>${renderPanel(state, guideData, escapeHtml, progressionEngine, storage)}</div><span class="visually-hidden" data-companion-status role="status" aria-live="polite"></span></section>`;
}

export function initializeLevelingCompanion(root, { classId, currentLevel = 1, selectedSpecialization = '', guideData = {}, progressionEngine = {}, storage } = {}) {
  const companion = root.querySelector('[data-leveling-companion]');
  if (!companion || companion.dataset.companionInitialized) return;
  companion.dataset.companionInitialized = 'true';
  const classRecord = guideData.classRecord || {};
  const specializations = classRecord.specializations || guideData.specializations || [];
  const escapeHtml = escapeText;
  let state = loadCompanionState(classId, { level: currentLevel, specializationId: selectedSpecialization, tab: 'overview' }, specializations, storage);
  const levelInput = companion.querySelector('[data-companion-level-input]');
  const levelOutput = companion.querySelector('[data-companion-level]');
  const levelBadge = companion.querySelector('[data-companion-level-badge]');
  const specializationSelect = companion.querySelector('[data-companion-spec]');
  const panelElement = companion.querySelector('[data-companion-panel]');
  const status = companion.querySelector('[data-companion-status]');
  const tabs = [...companion.querySelectorAll('[data-companion-tab]')];

  const update = change => {
    state = updateCompanionState(classId, state, change, specializations);
    levelInput.value = String(state.level);
    levelInput.setAttribute('aria-valuetext', `Level ${state.level}`);
    levelOutput.value = String(state.level);
    levelOutput.textContent = String(state.level);
    levelBadge.textContent = `Level ${state.level}`;
    specializationSelect.value = state.specializationId;
    for (const tab of tabs) {
      const selected = tab.dataset.companionTab === state.tab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    panelElement.setAttribute('aria-labelledby', `${classId}-companion-tab-${state.tab}`);
    panelElement.innerHTML = renderPanel(state, guideData, escapeHtml, progressionEngine, storage);
    if (!saveCompanionState(state, storage) && status) status.textContent = 'This browser could not save companion preferences.';
    else if (status) status.textContent = '';
  };

  companion.addEventListener('input', event => {
    if (event.target.matches('[data-companion-level-input]')) update({ level: event.target.value });
  });
  companion.addEventListener('change', event => {
    if (event.target.matches('[data-companion-spec]')) update({ specializationId: event.target.value });
  });
  companion.addEventListener('click', event => {
    const tab = event.target.closest?.('[data-companion-tab]');
    if (tab) update({ tab: tab.dataset.companionTab });
    const talentButton = event.target.closest?.('[data-companion-talent]');
    if (talentButton) {
      const talentId = talentButton.dataset.companionTalent;
      update({ selectedTalentId: talentId });
    }
  });
  companion.addEventListener('keydown', event => {
    const currentIndex = tabs.indexOf(event.target.closest?.('[data-companion-tab]'));
    if (currentIndex < 0) return;
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[nextIndex].focus();
    update({ tab: tabs[nextIndex].dataset.companionTab });
  });
}
