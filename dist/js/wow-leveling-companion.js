const COMPANION_TABS = ['overview', 'talents', 'gear'];
const COMPANION_STORAGE_PREFIX = 'bm-wow-leveling-companion-v1:';
const COMPANION_TALENT_STORAGE_PREFIX = 'bm-wow-leveling-talents-v1:';

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
    talentMode: state.talentMode === 'recommended' ? 'recommended' : 'manual',
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
      talentMode: state.talentMode === 'recommended' ? 'recommended' : 'manual'
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
  return { classRecord, specializations, specialization, guide, guideMatchesSpec };
}

export function companionTalentStorageKey(classId, specializationId) {
  return `${COMPANION_TALENT_STORAGE_PREFIX}${classId}:${specializationId}`;
}

export function loadCompanionTalentAllocation(classId, specializationId, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    const saved = JSON.parse(store?.getItem(companionTalentStorageKey(classId, specializationId)) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
}

export function saveCompanionTalentAllocation(classId, specializationId, allocation, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    if (!store?.setItem) return false;
    store.setItem(companionTalentStorageKey(classId, specializationId), JSON.stringify(allocation || {}));
    return true;
  } catch { return false; }
}

function createTalentStorage(storage) {
  const sessionValues = new Map();
  return {
    getItem(key) {
      try {
        const value = (storage ?? globalThis.localStorage)?.getItem(key);
        if (value !== null && value !== undefined) sessionValues.set(key, value);
        return value ?? sessionValues.get(key) ?? null;
      } catch { return sessionValues.get(key) ?? null; }
    },
    setItem(key, value) {
      const serialized = String(value);
      sessionValues.set(key, serialized);
      try { (storage ?? globalThis.localStorage)?.setItem(key, serialized); } catch { /* Keep this session usable when browser storage is blocked. */ }
    }
  };
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

function verifiedBuildFor(state, progressionEngine) {
  return progressionEngine?.builds?.find(build => build.classId === state.classId
    && build.specializationId === state.specializationId
    && build.verificationStatus === 'verified'
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

function getManualTalentData(state, guideData, progressionEngine) {
  const classRecord = guideData.talentClass || progressionEngine?.catalog?.classes?.find(item => item.id === state.classId);
  const specialization = (guideData.classRecord?.specializations || guideData.specializations || []).find(item => item.id === state.specializationId);
  const tree = findCompanionTalentTree(classRecord, state.specializationId, specialization?.name);
  const availablePoints = progressionEngine?.availablePoints?.(state.level, 0) ?? 0;
  const build = verifiedBuildFor(state, progressionEngine);
  const recommended = build && progressionEngine?.resolve
    ? progressionEngine.resolve(build, progressionEngine.catalog, state.level)
    : null;
  const allocation = state.talentMode === 'recommended' && recommended?.valid
    ? recommended.allocation
    : loadCompanionTalentAllocation(state.classId, state.specializationId, progressionEngine?.storage);
  const selectedTalent = tree?.talents?.find(talent => talent.id === state.selectedTalentId) || tree?.talents?.[0] || null;
  const validation = classRecord && progressionEngine?.validate
    ? progressionEngine.validate(classRecord, allocation, availablePoints)
    : { total: treePoints(tree, allocation), valid: true, issues: [] };
  return { classRecord, tree, availablePoints, allocation, selectedTalent, validation, build, recommended };
}

export function getCompanionPanel(state, guideData = {}, progressionEngine = {}) {
  const { classRecord, specialization, guide, guideMatchesSpec } = selectedData(guideData, state);
  const specName = specialization?.name || 'Specialization';
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
    const treeData = getManualTalentData(state, guideData, progressionEngine);
    return {
      heading: `${specName} talent tree · Level ${state.level}`,
      treeData,
      sections: [{ title: 'Talent points spent / available', text: `${treeData.validation.total} / ${treeData.availablePoints}` }],
      notices: treeData.tree
        ? (treeData.recommended?.valid ? [] : ['Talent progression not yet verified.'])
        : ['Talent tree data coming soon for this specialization.'],
      note: 'Tier gates use the five-points-per-row rule. Budget excludes Talented Legacy bonus points.'
    };
  }

  const gear = guideMatchesSpec ? guide?.gear : '';
  return {
    heading: `${specName} gear`,
    sections: gear ? [{ title: 'Existing guide recommendation', text: gear }] : [],
    notices: gear ? [] : ['Guide data coming soon for this specialization’s gear recommendations.']
  };
}

function renderTalentTree(state, treeData, escapeHtml) {
  const { tree, allocation, availablePoints, validation, selectedTalent, build } = treeData;
  if (!tree) return '';
  const maxRow = Math.max(...tree.talents.map(talent => talent.row));
  const maxColumn = Math.max(...tree.talents.map(talent => talent.column));
  const nodes = tree.talents.map(talent => {
    const rank = Number(allocation[talent.id]) || 0;
    const lock = companionTalentLock(talent, tree, allocation);
    const cannotAdd = lock.locked || rank >= talent.maxRank || validation.total >= availablePoints;
    const classes = ['wow-companion-tree-node', rank ? 'is-spent' : '', lock.locked ? 'is-locked' : ''].filter(Boolean).join(' ');
    const lockHint = lock.tierLocked
      ? `Requires ${lock.requiredPoints} points spent in this tree.`
      : lock.prerequisiteLocked ? `Requires ${talent.prerequisite} at full rank.` : '';
    return `<article class="${classes}" style="grid-row:${talent.row};grid-column:${talent.column}"><button type="button" class="wow-companion-tree-icon" data-companion-talent="${escapeHtml(talent.id)}" data-cannot-add="${cannotAdd}" aria-label="${escapeHtml(talent.name)}, rank ${rank} of ${talent.maxRank}${lockHint ? `, locked: ${lockHint}` : cannotAdd ? ', cannot add a rank at this level' : ''}" aria-pressed="${talent.id === state.selectedTalentId}" title="${escapeHtml(lockHint || talent.name)}">${talent.icon ? `<img src="${escapeHtml(talent.icon)}" alt="" width="48" height="48" loading="lazy">` : `<span>${escapeHtml(talent.name.slice(0, 1))}</span>`}<strong>${rank}/${talent.maxRank}</strong></button><span class="wow-companion-tree-name">${escapeHtml(talent.name)}</span><button type="button" class="wow-companion-tree-minus" data-companion-talent-remove="${escapeHtml(talent.id)}" aria-label="Remove one point from ${escapeHtml(talent.name)}"${rank === 0 ? ' disabled' : ''}>−</button></article>`;
  }).join('');
  const selectedRank = selectedTalent ? Number(allocation[selectedTalent.id]) || 0 : 0;
  const selectedLock = selectedTalent ? companionTalentLock(selectedTalent, tree, allocation) : null;
  const detail = selectedTalent ? `<aside class="wow-companion-talent-detail" aria-live="polite"><div class="wow-companion-talent-detail-heading">${selectedTalent.icon ? `<img src="${escapeHtml(selectedTalent.icon)}" alt="" width="48" height="48">` : ''}<div><h4>${escapeHtml(selectedTalent.name)}</h4><p>Rank ${selectedRank} / ${selectedTalent.maxRank}</p></div></div><p>${escapeHtml(selectedTalent.rankEffects?.[Math.max(0, selectedRank - 1)] || selectedTalent.rankEffects?.[0] || 'Description not recorded.')}</p>${selectedTalent.rankEffects?.length > 1 ? `<ol>${selectedTalent.rankEffects.map((effect, index) => `<li${index + 1 === selectedRank ? ' aria-current="true"' : ''}><strong>Rank ${index + 1}:</strong> ${escapeHtml(effect)}</li>`).join('')}</ol>` : ''}${selectedLock?.locked ? `<p class="wow-companion-tree-lock-note">${selectedLock.tierLocked ? `Spend ${selectedLock.requiredPoints} points in this tree to unlock this row.` : `Requires ${escapeHtml(selectedTalent.prerequisite)} at full rank.`}</p>` : ''}</aside>` : '';
  return `<div class="wow-companion-tree-layout"><section class="wow-companion-tree" aria-label="${escapeHtml(tree.name)} talent tree"><header><h4>${escapeHtml(tree.name)}</h4><span>${treePoints(tree, allocation)} tree points</span></header><div class="wow-companion-tree-scroll"><div class="wow-companion-tree-grid" style="--talent-columns:${maxColumn};--talent-rows:${maxRow}">${nodes}</div></div></section>${detail}</div>`;
}

function renderPanel(state, guideData, escapeHtml, progressionEngine = {}, storage) {
  const panel = getCompanionPanel(state, guideData, progressionEngine);
  const sections = panel.sections.map(section => `<section class="wow-companion-result"><h4>${escapeHtml(section.title)}</h4>${section.text ? `<p>${escapeHtml(section.text)}</p>` : ''}${section.items?.length ? `<ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</section>`).join('');
  const notices = (panel.notices || []).map(notice => `<p class="wow-companion-missing" role="status">${escapeHtml(notice)}</p>`).join('');
  const treeData = panel.treeData;
  const recommendedAvailable = Boolean(treeData?.build && treeData?.recommended?.valid);
  const nextRecommended = treeData?.recommended?.valid && treeData.recommended.nextChange
    ? `<p class="wow-companion-next-talent">Next recommended point · Level ${treeData.recommended.nextChange.level} · ${escapeHtml(treeData.tree.talents.find(talent => talent.id === treeData.recommended.nextChange.talentId)?.name || 'Talent')}</p>`
    : '';
  const talentPanel = treeData ? `<div class="wow-companion-build-modes" aria-label="Talent build mode"><button type="button" data-companion-talent-mode="manual" aria-pressed="${state.talentMode !== 'recommended'}">Manual Build</button><button type="button" data-companion-talent-mode="recommended" aria-pressed="${state.talentMode === 'recommended'}"${recommendedAvailable ? '' : ' disabled'} title="${recommendedAvailable ? 'Load the verified progression' : 'Recommended Build is unavailable until verified point-by-point data is added.'}">Recommended Build</button></div>${recommendedAvailable ? '' : '<p class="wow-companion-missing">Recommended Build is disabled until verified point-by-point data is added.</p>'}${renderTalentTree(state, treeData, escapeHtml)}${nextRecommended}${treeData.validation.issues.length ? `<p class="wow-companion-missing" role="status">Current build needs review: ${escapeHtml(treeData.validation.issues.join(' '))}</p>` : ''}<p class="wow-companion-tier-source">Tier rules follow the currently documented five-points-per-row behavior; Blizzard has not separately confirmed this inherited rule for Forever.</p>` : '';
  return `<h3 data-companion-heading>${escapeHtml(panel.heading)}</h3>${sections || ''}${treeData ? talentPanel : ''}${panel.note ? `<p class="wow-companion-note">${escapeHtml(panel.note)}</p>` : ''}${notices}`;
}

export function renderLevelingCompanion({ classId, currentLevel = 1, selectedSpecialization = '', guideData = {}, progressionEngine = {}, escapeHtml = escapeText, storage } = {}) {
  progressionEngine = { ...progressionEngine, storage };
  const classRecord = guideData.classRecord || {};
  const specializations = classRecord.specializations || guideData.specializations || [];
  const state = loadCompanionState(classId, { level: currentLevel, specializationId: selectedSpecialization, tab: 'overview' }, specializations, storage);
  const prefix = String(classId || 'class').replace(/[^a-z0-9-]/gi, '-');
  const options = specializations.map(spec => `<option value="${escapeHtml(spec.id)}"${spec.id === state.specializationId ? ' selected' : ''}>${escapeHtml(spec.name)} · ${escapeHtml(spec.role)}</option>`).join('');
  const tabs = COMPANION_TABS.map(tab => `<button type="button" role="tab" id="${prefix}-companion-tab-${tab}" aria-controls="${prefix}-companion-panel" aria-selected="${state.tab === tab}" tabindex="${state.tab === tab ? '0' : '-1'}" data-companion-tab="${tab}">${tab[0].toUpperCase()}${tab.slice(1)}</button>`).join('');
  return `<section class="wow-leveling-companion" data-leveling-companion data-class-id="${escapeHtml(classId)}" style="--class-accent:${escapeHtml(classRecord.color || '#c79c6e')}" aria-labelledby="${prefix}-companion-title"><header><div><p class="wow-companion-kicker">Field companion · ${escapeHtml(classRecord.name || classId)}</p><h2 id="${prefix}-companion-title">Leveling Companion</h2></div><span data-companion-level-badge>Level ${state.level}</span></header><div class="wow-companion-controls"><label for="${prefix}-companion-level">Current level <output data-companion-level>${state.level}</output></label><input id="${prefix}-companion-level" type="range" min="1" max="60" step="1" value="${state.level}" aria-label="Current level" aria-valuetext="Level ${state.level}" data-companion-level-input><label for="${prefix}-companion-spec">Specialization</label><select id="${prefix}-companion-spec" data-companion-spec>${options}</select></div><div class="wow-companion-tabs" role="tablist" aria-label="${escapeHtml(classRecord.name || classId)} companion guide">${tabs}</div><div class="wow-companion-panel" id="${prefix}-companion-panel" role="tabpanel" tabindex="0" aria-labelledby="${prefix}-companion-tab-${state.tab}" data-companion-panel>${renderPanel(state, guideData, escapeHtml, progressionEngine, storage)}</div><span class="visually-hidden" data-companion-status role="status" aria-live="polite"></span></section>`;
}

export function initializeLevelingCompanion(root, { classId, currentLevel = 1, selectedSpecialization = '', guideData = {}, progressionEngine = {}, storage } = {}) {
  const talentStorage = createTalentStorage(storage);
  progressionEngine = { ...progressionEngine, storage: talentStorage };
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
    const mode = event.target.closest?.('[data-companion-talent-mode]');
    if (mode && !mode.disabled) update({ talentMode: mode.dataset.companionTalentMode });
    const removeButton = event.target.closest?.('[data-companion-talent-remove]');
    if (removeButton) adjustTalent(removeButton.dataset.companionTalentRemove, -1);
    const talentButton = event.target.closest?.('[data-companion-talent]');
    if (talentButton) {
      const talentId = talentButton.dataset.companionTalent;
      const data = getManualTalentData(state, guideData, progressionEngine);
      state = { ...state, selectedTalentId: talentId };
      if (!talentButton.dataset.cannotAdd || talentButton.dataset.cannotAdd !== 'true') adjustTalent(talentId, 1, false);
      else update({ selectedTalentId: talentId });
    }
  });
  companion.addEventListener('contextmenu', event => {
    const talentButton = event.target.closest?.('[data-companion-talent]');
    if (!talentButton) return;
    event.preventDefault();
    state = { ...state, selectedTalentId: talentButton.dataset.companionTalent };
    adjustTalent(talentButton.dataset.companionTalent, -1, false);
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

  function adjustTalent(talentId, change, select = true) {
    if (state.talentMode === 'recommended') state = { ...state, talentMode: 'manual' };
    const data = getManualTalentData(state, guideData, progressionEngine);
    const talent = data.tree?.talents?.find(item => item.id === talentId);
    if (!talent || !data.classRecord || !progressionEngine.adjust) return;
    if (change > 0) {
      const lock = companionTalentLock(talent, data.tree, data.allocation);
      if (lock.locked) {
        update({ selectedTalentId: talentId });
        if (status) status.textContent = lock.tierLocked
          ? `${talent.name} is locked until ${lock.requiredPoints} points are spent in this tree.`
          : `${talent.name} requires ${talent.prerequisite} at full rank.`;
        return;
      }
    }
    const result = progressionEngine.adjust(data.classRecord, data.allocation, talentId, change, data.availablePoints);
    if (!result.error && validateCompanionTalentTiers(data.tree, result.allocation).length) {
      result.error = 'Remove points from deeper talent rows first.';
    }
    if (result.error) {
      update({ selectedTalentId: talentId });
      if (status) status.textContent = result.error;
      return;
    }
    const savedAllocation = saveCompanionTalentAllocation(classId, state.specializationId, result.allocation, talentStorage);
    update({ selectedTalentId: select ? talentId : state.selectedTalentId });
    if (!savedAllocation && status) status.textContent = 'This browser could not save the talent allocation.';
  }
}
