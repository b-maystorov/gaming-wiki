const COMPANION_TABS = ['overview', 'talents', 'gear'];
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
    tab: COMPANION_TABS.includes(state.tab) ? state.tab : 'overview'
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
      tab: COMPANION_TABS.includes(state.tab) ? state.tab : 'overview'
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

function getTalentProgression(state, guideData, progressionEngine) {
  const classRecord = guideData.talentClass || progressionEngine?.catalog?.classes?.find(item => item.id === state.classId);
  const availablePoints = progressionEngine?.availablePoints?.(state.level, 0) ?? null;
  const build = progressionEngine?.builds?.find(item => item.classId === state.classId && item.specializationId === state.specializationId);
  const verified = build?.verificationStatus === 'verified' && build.coverage?.status === 'complete';
  if (!verified || !progressionEngine?.resolve || !classRecord) return { availablePoints, verified: false };

  const resolved = progressionEngine.resolve(build, progressionEngine.catalog, state.level);
  if (!resolved.valid) return { availablePoints, verified: false };
  const displayLevel = resolved.snapshotLevel;
  const displayAvailable = progressionEngine.availablePoints(displayLevel, 0);
  const talentById = new Map((classRecord.trees || []).flatMap(tree => tree.talents || []).map(talent => [talent.id, talent]));
  const talents = Object.entries(resolved.allocation)
    .filter(([, rank]) => Number.isInteger(rank) && rank > 0)
    .map(([id, rank]) => ({ talent: talentById.get(id), rank }))
    .filter(item => item.talent);
  const nextTalent = resolved.covered && resolved.nextChange ? talentById.get(resolved.nextChange.talentId) : null;

  return {
    verified: true,
    availablePoints,
    displayAvailable,
    displayLevel,
    total: resolved.total,
    covered: resolved.covered,
    talents,
    nextTalent: nextTalent ? { ...resolved.nextChange, talent: nextTalent } : null
  };
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
    const progression = getTalentProgression(state, guideData, progressionEngine);
    if (!progression.verified) return {
      heading: `${specName} talent progression`,
      sections: progression.availablePoints === null ? [] : [{ title: 'Talent points available', text: `${progression.availablePoints} base points at level ${state.level}. No allocation is shown without a verified progression.` }],
      note: 'Budget excludes Talented Legacy bonus points.',
      notices: ['Talent progression not yet verified.']
    };

    const next = progression.nextTalent;
    return {
      heading: `${specName} talents · Level ${state.level}`,
      sections: [
        { title: progression.covered ? 'Talent points spent / available' : `Last documented allocation · level ${progression.displayLevel}`, text: `${progression.total} / ${progression.displayAvailable}` }
      ],
      talents: progression.talents,
      nextTalent: next,
      note: 'Budget excludes Talented Legacy bonus points.',
      notices: progression.covered ? [] : [`Talent progression is not verified beyond level ${progression.displayLevel}.`]
    };
  }

  const gear = guideMatchesSpec ? guide?.gear : '';
  return {
    heading: `${specName} gear`,
    sections: gear ? [{ title: 'Existing guide recommendation', text: gear }] : [],
    notices: gear ? [] : ['Guide data coming soon for this specialization’s gear recommendations.']
  };
}

function renderPanel(state, guideData, escapeHtml, progressionEngine = {}) {
  const panel = getCompanionPanel(state, guideData, progressionEngine);
  const sections = panel.sections.map(section => `<section class="wow-companion-result"><h4>${escapeHtml(section.title)}</h4>${section.text ? `<p>${escapeHtml(section.text)}</p>` : ''}${section.items?.length ? `<ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</section>`).join('');
  const notices = (panel.notices || []).map(notice => `<p class="wow-companion-missing" role="status">${escapeHtml(notice)}</p>`).join('');
  const learned = panel.talents?.length ? `<section class="wow-companion-learned"><h4>Talents already learned</h4>${panel.talents.map(({ talent, rank }) => `<details class="wow-companion-talent"><summary>${talent.icon ? `<img src="${escapeHtml(talent.icon)}" alt="" width="32" height="32" loading="lazy">` : ''}<span>${escapeHtml(talent.name)}</span><strong>${rank}/${talent.maxRank}</strong></summary><p>${escapeHtml(talent.rankEffects?.[rank - 1] || 'Description not recorded.')}</p></details>`).join('')}</section>` : '';
  const next = panel.nextTalent ? `<section class="wow-companion-next-talent"><h4>Next recommended talent</h4><p>Level ${panel.nextTalent.level} · ${escapeHtml(panel.nextTalent.talent.name)}${panel.nextTalent.rankAdded > 1 ? ` · ${panel.nextTalent.rankAdded} ranks` : ''}</p></section>` : '';
  return `<h3 data-companion-heading>${escapeHtml(panel.heading)}</h3>${sections || ''}${learned}${next}${panel.note ? `<p class="wow-companion-note">${escapeHtml(panel.note)}</p>` : ''}${notices}`;
}

export function renderLevelingCompanion({ classId, currentLevel = 1, selectedSpecialization = '', guideData = {}, progressionEngine = {}, escapeHtml = escapeText, storage } = {}) {
  const classRecord = guideData.classRecord || {};
  const specializations = classRecord.specializations || guideData.specializations || [];
  const state = loadCompanionState(classId, { level: currentLevel, specializationId: selectedSpecialization, tab: 'overview' }, specializations, storage);
  const prefix = String(classId || 'class').replace(/[^a-z0-9-]/gi, '-');
  const options = specializations.map(spec => `<option value="${escapeHtml(spec.id)}"${spec.id === state.specializationId ? ' selected' : ''}>${escapeHtml(spec.name)} · ${escapeHtml(spec.role)}</option>`).join('');
  const tabs = COMPANION_TABS.map(tab => `<button type="button" role="tab" id="${prefix}-companion-tab-${tab}" aria-controls="${prefix}-companion-panel" aria-selected="${state.tab === tab}" tabindex="${state.tab === tab ? '0' : '-1'}" data-companion-tab="${tab}">${tab[0].toUpperCase()}${tab.slice(1)}</button>`).join('');
  return `<section class="wow-leveling-companion" data-leveling-companion data-class-id="${escapeHtml(classId)}" style="--class-accent:${escapeHtml(classRecord.color || '#c79c6e')}" aria-labelledby="${prefix}-companion-title"><header><div><p class="wow-companion-kicker">Field companion · ${escapeHtml(classRecord.name || classId)}</p><h2 id="${prefix}-companion-title">Leveling Companion</h2></div><span data-companion-level-badge>Level ${state.level}</span></header><div class="wow-companion-controls"><label for="${prefix}-companion-level">Current level <output data-companion-level>${state.level}</output></label><input id="${prefix}-companion-level" type="range" min="1" max="60" step="1" value="${state.level}" aria-label="Current level" aria-valuetext="Level ${state.level}" data-companion-level-input><label for="${prefix}-companion-spec">Specialization</label><select id="${prefix}-companion-spec" data-companion-spec>${options}</select></div><div class="wow-companion-tabs" role="tablist" aria-label="${escapeHtml(classRecord.name || classId)} companion guide">${tabs}</div><div class="wow-companion-panel" id="${prefix}-companion-panel" role="tabpanel" tabindex="0" aria-labelledby="${prefix}-companion-tab-${state.tab}" data-companion-panel>${renderPanel(state, guideData, escapeHtml, progressionEngine)}</div><span class="visually-hidden" data-companion-status role="status" aria-live="polite"></span></section>`;
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
    panelElement.innerHTML = renderPanel(state, guideData, escapeHtml, progressionEngine);
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
