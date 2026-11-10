
export const WOW_PROFILE_STORAGE_KEY = 'bm-wow-forever-character-v1';
export const WOW_PROGRESS_STORAGE_KEY = 'bm-wow-forever-guide-progress-v1';
export const WOW_TALENT_BUILDS_STORAGE_KEY = 'bm-wow-forever-talent-builds-v1';
export const WOW_TALENT_DRAFT_STORAGE_KEY = 'bm-wow-forever-talent-draft-v1';

export function loadWowProfile(storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    const saved = JSON.parse(store?.getItem(WOW_PROFILE_STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return {};
    const level = Number(saved.currentLevel);
    return {
      characterName: typeof saved.characterName === 'string' ? saved.characterName.slice(0, 32) : '',
      faction: ['Alliance', 'Horde'].includes(saved.faction) ? saved.faction : '',
      race: typeof saved.race === 'string' ? saved.race : '',
      classId: typeof saved.classId === 'string' ? saved.classId : '',
      specializationId: typeof saved.specializationId === 'string' ? saved.specializationId : '',
      currentLevel: Number.isInteger(level) && level >= 1 && level <= 60 ? level : 1,
      playstyle: typeof saved.playstyle === 'string' ? saved.playstyle : 'solo-leveling',
      currentZone: typeof saved.currentZone === 'string' ? saved.currentZone : '',
      talentBuildId: typeof saved.talentBuildId === 'string' ? saved.talentBuildId.slice(0, 80) : ''
    };
  } catch { return {}; }
}

export function saveWowProfile(profile, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    if (!store?.setItem) return false;
    const level = Number(profile?.currentLevel);
    if (!Number.isInteger(level) || level < 1 || level > 60) return false;
    const safeProfile = {
      characterName: String(profile.characterName || '').trim().slice(0, 32),
      faction: ['Alliance', 'Horde'].includes(profile.faction) ? profile.faction : '',
      race: String(profile.race || '').slice(0, 32),
      classId: String(profile.classId || '').slice(0, 32),
      specializationId: String(profile.specializationId || '').slice(0, 32),
      currentLevel: level,
      playstyle: String(profile.playstyle || 'solo-leveling').slice(0, 32),
      currentZone: String(profile.currentZone || '').slice(0, 64),
      talentBuildId: String(profile.talentBuildId || '').slice(0, 80)
    };
    store.setItem(WOW_PROFILE_STORAGE_KEY, JSON.stringify(safeProfile));
    return true;
  } catch { return false; }
}

export function availableWowTalentPoints(level, talentedLegacyRank = 0) {
  const currentLevel = Math.max(1, Math.min(60, Number(level) || 1));
  const rank = Math.max(0, Math.min(5, Number(talentedLegacyRank) || 0));
  return Math.min(51, Math.max(0, currentLevel - (10 - rank) + 1));
}

export function validateWowTalentAllocation(classRecord, allocation, availablePoints) {
  const talents = (classRecord?.trees || []).flatMap(tree => tree.talents || []);
  const byId = new Map(talents.map(talent => [talent.id, talent]));
  const ranks = allocation && typeof allocation === 'object' && !Array.isArray(allocation) ? allocation : {};
  const total = Object.values(ranks).reduce((sum, rank) => sum + (Number.isInteger(rank) && rank > 0 ? rank : 0), 0);
  const issues = [];
  for (const [id, rawRank] of Object.entries(ranks)) {
    const talent = byId.get(id);
    if (!talent) { issues.push(`Unknown or stale talent record: ${id}`); continue; }
    if (!Number.isInteger(rawRank) || rawRank < 0 || rawRank > talent.maxRank) issues.push(`${talent.name} has an invalid rank.`);
    if (rawRank > 0 && talent.prerequisite) {
      const tree = classRecord.trees.find(item => item.talents.some(candidate => candidate.id === talent.id));
      const prerequisite = tree?.talents.find(item => item.name === talent.prerequisite);
      if (!prerequisite || Number(ranks[prerequisite.id] || 0) < prerequisite.maxRank) issues.push(`${talent.name} requires ${talent.prerequisite} at full rank.`);
    }
  }
  if (total > availablePoints) issues.push(`The build spends ${total} points, but only ${availablePoints} are available.`);
  return { total, issues, valid: issues.length === 0 };
}

export function adjustWowTalentRank(classRecord, allocation, talentId, change, availablePoints) {
  const talent = classRecord?.trees?.flatMap(tree => tree.talents).find(item => item.id === talentId);
  if (!talent || ![-1, 1].includes(change)) return { allocation: { ...(allocation || {}) }, error: 'Talent reference is missing or stale.' };
  const next = { ...(allocation || {}) };
  const currentRank = Number(next[talentId]) || 0;
  if (change > 0) {
    if (currentRank >= talent.maxRank) return { allocation: next, error: `${talent.name} is already at maximum rank.` };
    if (Object.values(next).reduce((sum, rank) => sum + (Number(rank) || 0), 0) >= availablePoints) return { allocation: next, error: 'No talent points remain at this level.' };
    if (talent.prerequisite) {
      const prerequisite = classRecord.trees.flatMap(tree => tree.talents).find(item => item.name === talent.prerequisite);
      if (!prerequisite || Number(next[prerequisite.id] || 0) < prerequisite.maxRank) return { allocation: next, error: `${talent.name} requires ${talent.prerequisite} at full rank.` };
    }
    next[talentId] = currentRank + 1;
  } else {
    if (!currentRank) return { allocation: next, error: `${talent.name} has no points to remove.` };
    const dependent = classRecord.trees.flatMap(tree => tree.talents).find(item => item.prerequisite === talent.name && Number(next[item.id] || 0) > 0);
    if (dependent && currentRank - 1 < talent.maxRank) return { allocation: next, error: `Remove points from ${dependent.name} first.` };
    if (currentRank === 1) delete next[talentId]; else next[talentId] = currentRank - 1;
  }
  return { allocation: next, error: '' };
}

export function validateWowGuidedBuild(build, catalog) {
  const classRecord = catalog?.classes?.find(item => item.id === build?.classId);
  const issues = [];
  if (!classRecord) return { valid: false, issues: ['The guided build class is missing from the client dataset.'] };
  if (!Array.isArray(build.allocations) || !build.coverage?.highestDocumentedLevel) {
    return { valid: false, issues: ['The guided build has no ordered allocations or coverage limit.'] };
  }
  const talentById = new Map(classRecord.trees.flatMap(tree => tree.talents).map(talent => [talent.id, talent]));
  const allocation = {};
  const respecByLevel = new Map((build.respecEvents || []).map(event => [event.level, event]));
  for (let level = build.levelRange.from; level <= build.coverage.highestDocumentedLevel; level++) {
    const respec = respecByLevel.get(level);
    if (respec) {
      const check = validateWowTalentAllocation(classRecord, respec.toAllocation, availableWowTalentPoints(level, 0));
      if (!check.valid) issues.push(`Level ${level} respec allocation is invalid: ${check.issues[0]}`);
      else {
        Object.keys(allocation).forEach(id => delete allocation[id]);
        Object.assign(allocation, respec.toAllocation);
      }
    }
    const changes = build.allocations.filter(change => change.level === level);
    if (level >= build.levelRange.from && changes.length !== 1) issues.push(`Level ${level} must have exactly one recorded talent point.`);
    for (const change of changes) {
      const talent = talentById.get(change.talentId);
      if (!talent) { issues.push(`Level ${level} references an unknown talent: ${change.talentId}`); continue; }
      if (!Number.isInteger(change.rankAdded) || change.rankAdded < 1 || change.rankAdded > talent.maxRank) {
        issues.push(`Level ${level} has an invalid rank change for ${talent.name}.`);
        continue;
      }
      for (let rank = 0; rank < change.rankAdded; rank++) {
        const result = adjustWowTalentRank(classRecord, allocation, talent.id, 1, availableWowTalentPoints(level, 0));
        if (result.error) { issues.push(`Level ${level}: ${result.error}`); break; }
        Object.assign(allocation, result.allocation);
      }
      const check = validateWowTalentAllocation(classRecord, allocation, availableWowTalentPoints(level, 0));
      if (!check.valid) issues.push(`Level ${level} allocation is invalid: ${check.issues[0]}`);
    }
  }
  return { valid: issues.length === 0, issues };
}

export function resolveWowGuidedBuild(build, catalog, requestedLevel) {
  const classRecord = catalog?.classes?.find(item => item.id === build?.classId);
  const level = Math.max(1, Math.min(60, Number(requestedLevel) || 1));
  if (!classRecord || !build) return { valid: false, allocation: {}, level, snapshotLevel: level, total: 0, issues: ['Choose a supported guided build.'] };
  const buildCheck = validateWowGuidedBuild(build, catalog);
  if (!buildCheck.valid) return { valid: false, allocation: {}, level, snapshotLevel: level, total: 0, issues: buildCheck.issues };
  const maxLevel = build.coverage.highestDocumentedLevel;
  const snapshotLevel = Math.min(level, maxLevel);
  const allocation = {};
  const respecs = (build.respecEvents || []).filter(event => event.level <= snapshotLevel).sort((a, b) => a.level - b.level);
  const changesByLevel = new Map();
  for (const change of build.allocations) {
    if (change.level > snapshotLevel) continue;
    const changes = changesByLevel.get(change.level) || [];
    changes.push(change);
    changesByLevel.set(change.level, changes);
  }
  const eventLevels = [...new Set([...respecs.map(event => event.level), ...changesByLevel.keys()])].sort((a, b) => a - b);
  const changesAtRequestedLevel = [];
  let respecAtRequestedLevel = null;
  for (const eventLevel of eventLevels) {
    const respec = respecs.find(event => event.level === eventLevel);
    if (respec) {
      const oldAllocation = { ...allocation };
      Object.keys(allocation).forEach(id => delete allocation[id]);
      Object.assign(allocation, respec.toAllocation);
      if (eventLevel === level) respecAtRequestedLevel = { ...respec, oldAllocation, newAllocation: { ...allocation } };
    }
    for (const change of changesByLevel.get(eventLevel) || []) {
      for (let rank = 0; rank < change.rankAdded; rank++) {
        const result = adjustWowTalentRank(classRecord, allocation, change.talentId, 1, availableWowTalentPoints(eventLevel, 0));
        if (result.error) return { valid: false, allocation, level, snapshotLevel, total: Object.values(allocation).reduce((sum, value) => sum + value, 0), issues: [result.error] };
        Object.assign(allocation, result.allocation);
      }
      if (eventLevel === level) changesAtRequestedLevel.push(change);
    }
  }
  const validation = validateWowTalentAllocation(classRecord, allocation, availableWowTalentPoints(snapshotLevel, 0));
  return {
    valid: validation.valid,
    allocation,
    level,
    snapshotLevel,
    total: validation.total,
    changesAtRequestedLevel,
    respecAtRequestedLevel,
    nextChange: build.allocations.find(change => change.level > snapshotLevel) || null,
    nextMilestone: build.milestones?.find(milestone => milestone.level > snapshotLevel) || null,
    covered: level <= maxLevel,
    issues: validation.issues
  };
}

export function loadWowTalentDraft(storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    const saved = JSON.parse(store?.getItem(WOW_TALENT_DRAFT_STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null;
    const level = Number(saved.level);
    return {
      classId: typeof saved.classId === 'string' ? saved.classId : '',
      specializationId: typeof saved.specializationId === 'string' ? saved.specializationId.slice(0, 32) : '',
      mode: saved.mode === 'guided' ? 'guided' : 'custom',
      guidedBuildId: typeof saved.guidedBuildId === 'string' ? saved.guidedBuildId.slice(0, 80) : '',
      level: Number.isInteger(level) && level >= 1 && level <= 60 ? level : 1,
      talentedRank: Math.max(0, Math.min(5, Number(saved.talentedRank) || 0)),
      allocation: saved.allocation && typeof saved.allocation === 'object' && !Array.isArray(saved.allocation) ? saved.allocation : {},
      name: typeof saved.name === 'string' ? saved.name.slice(0, 60) : '',
      editingBuildId: typeof saved.editingBuildId === 'string' ? saved.editingBuildId.slice(0, 80) : ''
    };
  } catch { return null; }
}

export function saveWowTalentDraft(draft, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    if (!store?.setItem) return false;
    store.setItem(WOW_TALENT_DRAFT_STORAGE_KEY, JSON.stringify({
      classId: String(draft?.classId || '').slice(0, 32),
      specializationId: String(draft?.specializationId || '').slice(0, 32),
      mode: draft?.mode === 'guided' ? 'guided' : 'custom',
      guidedBuildId: String(draft?.guidedBuildId || '').slice(0, 80),
      level: Math.max(1, Math.min(60, Number(draft?.level) || 1)),
      talentedRank: Math.max(0, Math.min(5, Number(draft?.talentedRank) || 0)),
      allocation: draft?.allocation && typeof draft.allocation === 'object' && !Array.isArray(draft.allocation) ? draft.allocation : {},
      name: String(draft?.name || '').slice(0, 60),
      editingBuildId: String(draft?.editingBuildId || '').slice(0, 80)
    }));
    return true;
  } catch { return false; }
}

export function loadWowTalentBuilds(storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    const builds = JSON.parse(store?.getItem(WOW_TALENT_BUILDS_STORAGE_KEY) || '[]');
    return Array.isArray(builds) ? builds.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.classId === 'string') : [];
  } catch { return []; }
}

export function saveWowTalentBuild(build, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    if (!store?.setItem || !build?.id || !build?.classId || !build?.name?.trim()) return false;
    const builds = loadWowTalentBuilds(store).filter(item => item.id !== build.id);
    builds.unshift({ ...build, name: String(build.name).trim().slice(0, 60), savedAt: new Date().toISOString() });
    store.setItem(WOW_TALENT_BUILDS_STORAGE_KEY, JSON.stringify(builds.slice(0, 100)));
    return true;
  } catch { return false; }
}

export function deleteWowTalentBuild(id, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    if (!store?.setItem) return false;
    store.setItem(WOW_TALENT_BUILDS_STORAGE_KEY, JSON.stringify(loadWowTalentBuilds(store).filter(item => item.id !== id)));
    return true;
  } catch { return false; }
}

export function encodeWowTalentBuild(build) {
  return encodeURIComponent(JSON.stringify({ version: build.dataVersion, classId: build.classId, specializationId: build.specializationId || '', level: build.level, talentedRank: build.talentedRank, allocation: build.allocation, mode: build.mode, guidedBuildId: build.guidedBuildId || '' }));
}

export function decodeWowTalentBuild(token, catalog) {
  try {
    const build = JSON.parse(decodeURIComponent(token));
    const classRecord = catalog?.classes?.find(item => item.id === build.classId);
    if (!classRecord || build.version !== catalog.clientBuild || !build.allocation || typeof build.allocation !== 'object' || Array.isArray(build.allocation)) return null;
    const available = availableWowTalentPoints(build.level, build.talentedRank);
    if (!validateWowTalentAllocation(classRecord, build.allocation, available).valid) return null;
    return { classId: build.classId, specializationId: typeof build.specializationId === 'string' ? build.specializationId.slice(0, 32) : '', level: Math.max(1, Math.min(60, Number(build.level) || 1)), talentedRank: Math.max(0, Math.min(5, Number(build.talentedRank) || 0)), allocation: build.allocation, mode: build.mode === 'guided' ? 'guided' : 'custom', guidedBuildId: typeof build.guidedBuildId === 'string' ? build.guidedBuildId.slice(0, 80) : '' };
  } catch { return null; }
}

function renderWowIcon(src, alt, escapeHtml, className = 'wow-game-icon') {
  return src ? `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" width="56" height="56">` : `<span class="${className} is-fallback" role="img" aria-label="${escapeHtml(alt)}">${escapeHtml(alt.slice(0, 1))}</span>`;
}

function renderClassEmblem(classId, catalog, escapeHtml, className = 'wow-class-emblem') {
  const record = catalog?.classes?.find(item => item.id === classId);
  return record ? renderWowIcon(record.icon, `${record.name} class emblem`, escapeHtml, className) : '';
}

export function getWowRaceOptions(catalog, faction, className) {
  return (catalog?.races || []).filter(race => race.faction === faction && race.classes.includes(className));
}

function renderWowRaceDirectory(data, catalog, artworkManifest, escapeHtml) {
  if (!catalog?.races?.length) return '<p class="wow-note">Race details could not be loaded. The class guide still lists its verified faction options.</p>';
  const cards = catalog.races.map(race => {
    const portrait = artworkManifest?.racePortraits?.[race.id];
    const factionAccent = race.faction === 'Alliance' ? '#86a9c2' : '#bd8069';
    const portraitMarkup = portrait?.src
      ? `<img class="wow-race-portrait-image" src="${escapeHtml(portrait.src)}" alt="${escapeHtml(portrait.alt || `${race.name} portrait`)}" width="128" height="128" loading="lazy">`
      : '<span class="wow-race-portrait-fallback" aria-hidden="true"><i></i><b></b></span>';
    return `<a class="wow-race-card" style="--faction-accent:${factionAccent}" href="#game/world-of-warcraft/races/${escapeHtml(race.id)}" data-wow-race-card data-faction="${escapeHtml(race.faction)}" data-classes="${escapeHtml(race.classes.map(name => name.toLowerCase()).join(' '))}"><span class="wow-race-portrait">${portraitMarkup}</span><span class="wow-race-card-copy"><small class="wow-race-faction">${escapeHtml(race.faction)}</small><strong>${escapeHtml(race.name)}</strong><span class="wow-race-classes">${escapeHtml(race.classes.join(' · '))}</span></span></a>`;
  }).join('');
  return `<p class="wow-lede">Pick a faction and see the races and class combinations confirmed for WoW: Forever.</p><div class="wow-race-filters"><label>Faction<select data-wow-race-faction><option value="all">Both factions</option><option>Alliance</option><option>Horde</option></select></label><label>Compatible class<select data-wow-race-class><option value="all">All classes</option>${data.classes.map(item => `<option value="${escapeHtml(item.name.toLowerCase())}">${escapeHtml(item.name)}</option>`).join('')}</select></label></div><div class="wow-race-grid">${cards}</div><p class="wow-source-link">Race availability: <a href="${escapeHtml(data.sources.find(item => item.id === data.raceCombinationsSourceId)?.url || 'https://worldofwarcraft.blizzard.com/en-us/news/24304075/create-the-hero-you-want-to-be-in-world-of-warcraft-forever')}" target="_blank" rel="noreferrer">Blizzard Forever race and class overview ↗</a></p>`;
}

function renderWowRaceDetail(race, data, catalog, escapeHtml) {
  const compatible = data.classes.filter(item => race.classes.includes(item.name));
  const abilityCards = race.abilities.map(ability => `<article class="wow-racial-card">${renderWowIcon(ability.icon, `${ability.name} racial ability icon`, escapeHtml, 'wow-racial-icon')}<div><h3>${escapeHtml(ability.name)}</h3><p>${escapeHtml(ability.effect)}</p></div></article>`).join('');
  return `<article class="wow-race-detail"><header><div class="wow-race-detail-icon">${renderWowIcon(race.icon, `${race.name} race emblem`, escapeHtml, 'wow-race-emblem')}</div><div><p class="wow-eyebrow">${escapeHtml(race.faction)} · WoW: Forever</p><h3>${escapeHtml(race.name)}</h3><p>Race abilities and class access from the Forever client reference. Where both factions have a Skyborne variant, their class combinations are shown separately.</p></div></header><section><h3>Available classes</h3><div class="wow-compatible-classes">${compatible.map(item => `<a href="#game/world-of-warcraft/classes/${escapeHtml(item.id)}" style="--class-accent:${escapeHtml(item.color)}">${renderClassEmblem(item.id, catalog, escapeHtml)}<span>${escapeHtml(item.name)}</span></a>`).join('')}</div></section><section><h3>Racial abilities</h3><div class="wow-racial-grid">${abilityCards}</div></section><p class="wow-note">Race playstyle advice is not added where the client data does not establish a practical advantage. Skyborne access requires the Heroic Pack or higher.</p><a href="#game/world-of-warcraft/races">← All races</a></article>`;
}

function renderWowSpellbook(classRecord, catalog, escapeHtml) {
  const spellbook = catalog?.spellbooks?.[classRecord.id];
  if (!spellbook) return '<p class="wow-note">The class spellbook reference is unavailable.</p>';
  const abilities = catalog.classAbilities?.[classRecord.id] || [];
  const featured = abilities.length ? `<section class="wow-ability-gallery" aria-label="Noteworthy class abilities">${abilities.map(item => `<article>${renderWowIcon(item.icon, `${item.name} spell icon`, escapeHtml, 'wow-ability-icon')}<div><h4>${escapeHtml(item.name)}</h4><p>${escapeHtml(item.summary)}</p></div></article>`).join('')}</section>` : '';
  const tabs = spellbook.tabs.map(tab => {
    const entries = tab.spells.map(spell => {
      const key = `${classRecord.name}|${spell.name}|${spell.rank}`;
      const details = catalog.spellDescriptions?.[key];
      const icon = abilities.find(item => item.name === spell.name)?.icon || '';
      const learned = details?.level || '';
      return `<li>${icon ? renderWowIcon(icon, `${spell.name} spell icon`, escapeHtml, 'wow-spellbook-icon') : '<span class="wow-spellbook-icon is-fallback" aria-hidden="true">✦</span>'}<span><strong>${escapeHtml(spell.name)}${spell.rank ? ` · ${escapeHtml(spell.rank)}` : ''}</strong>${learned ? `<small>${escapeHtml(learned)}</small>` : ''}${details?.description ? `<small>${escapeHtml(details.description)}</small>` : ''}<small class="wow-spell-id">Spell ID ${escapeHtml(String(details?.id ?? 'not recorded'))}</small></span></li>`;
    }).join('');
    return `<details class="wow-spell-tab"><summary>${escapeHtml(tab.name)} <span>${tab.spells.length} records</span></summary><ul>${entries}</ul></details>`;
  }).join('');
  return `<details class="wow-spellbook"><summary>Open Forever trainer spellbook <span>${spellbook.tabs.reduce((sum, tab) => sum + tab.spells.length, 0)} spell/rank records</span></summary>${featured}<p class="wow-note">Spell IDs and descriptions come from a client-derived Forever export; rank source details vary by spell. Blank descriptions mean no verified tooltip text was supplied.</p>${tabs}<p class="wow-source-link">Data: <a href="https://talentsforever.com/data.json" target="_blank" rel="noreferrer">Talents Forever client-data export ↗</a></p></details>`;
}

function renderWowTalentPlanner(data, catalog, profile, route, escapeHtml, guidedData = null) {
  if (!catalog?.classes?.length) return '<p class="wow-note">The Forever talent records could not be loaded. No Classic-era talent tree is substituted.</p>';
  const guidedBuilds = guidedData?.builds || [];
  const savedDraft = loadWowTalentDraft();
  const shared = route.sharedBuildToken && !savedDraft ? decodeWowTalentBuild(route.sharedBuildToken, catalog) : null;
  let state = savedDraft || shared || {
    classId: profile.classId || 'shaman', specializationId: profile.specializationId || '',
    mode: 'guided', guidedBuildId: '', level: profile.currentLevel || 10, talentedRank: 0,
    allocation: {}, name: '', editingBuildId: ''
  };
  if (!state.specializationId) state.specializationId = profile.specializationId || '';
  const classId = catalog.classes.some(item => item.id === state.classId) ? state.classId : catalog.classes[0].id;
  const classRecord = catalog.classes.find(item => item.id === classId);
  const sourceClass = data.classes.find(item => item.id === classId);
  const preferredGuide = guidedBuilds.find(build => build.classId === classId);
  const specializationId = sourceClass.specializations.some(item => item.id === state.specializationId)
    ? state.specializationId
    : preferredGuide?.specializationId || sourceClass.specializations[0]?.id || '';
  const matchingGuides = guidedBuilds.filter(build => build.classId === classId && build.specializationId === specializationId);
  const selectedGuide = matchingGuides.find(build => build.id === state.guidedBuildId) || matchingGuides[0] || null;
  const mode = state.mode === 'guided' && selectedGuide ? 'guided' : 'custom';
  const level = Math.max(1, Math.min(60, Number(state.level) || 1));
  const guidedState = mode === 'guided' ? resolveWowGuidedBuild(selectedGuide, catalog, level) : null;
  const allocation = mode === 'guided' ? guidedState.allocation : (state.allocation || {});
  const budgetLevel = mode === 'guided' ? guidedState.snapshotLevel : level;
  const availablePoints = availableWowTalentPoints(budgetLevel, state.talentedRank);
  const validation = validateWowTalentAllocation(classRecord, allocation, availablePoints);
  const points = validation.total;
  const talentMap = new Map(classRecord.trees.flatMap(tree => tree.talents.map(talent => [talent.id, talent])));
  const addedIds = new Set((guidedState?.changesAtRequestedLevel || []).map(change => change.talentId));
  const nextTalentId = guidedState?.nextChange?.talentId || '';
  const treeDistribution = classRecord.trees.map(tree => `${tree.name} ${tree.talents.reduce((sum, talent) => sum + (Number(allocation[talent.id]) || 0), 0)}`).join(' · ');
  const trees = classRecord.trees.map(tree => {
    const maxRow = Math.max(...tree.talents.map(talent => talent.row));
    const maxColumn = Math.max(...tree.talents.map(talent => talent.column));
    const connectors = tree.talents.filter(talent => talent.prerequisite).map(talent => {
      const parent = tree.talents.find(item => item.name === talent.prerequisite);
      if (!parent) return '';
      const x1 = (parent.column - 1) * 96 + 38, y1 = (parent.row - 1) * 104 + 36;
      const x2 = (talent.column - 1) * 96 + 38, y2 = (talent.row - 1) * 104 + 36;
      return `<path d="M${x1} ${y1} L${x2} ${y2}" />`;
    }).join('');
    const nodes = tree.talents.map(talent => {
      const rank = Number(allocation[talent.id]) || 0;
      const prerequisite = talent.prerequisite ? tree.talents.find(item => item.name === talent.prerequisite) : null;
      const unmet = prerequisite && Number(allocation[prerequisite.id] || 0) < prerequisite.maxRank;
      const effect = rank ? talent.rankEffects[Math.min(rank - 1, talent.rankEffects.length - 1)] : talent.rankEffects[0];
      const nextEffect = rank < talent.maxRank ? talent.rankEffects[rank] : '';
      const title = `${talent.name} · Rank ${rank}/${talent.maxRank}\n${effect || 'Effect text unavailable.'}${nextEffect ? `\nNext rank: ${nextEffect}` : '\nMaximum rank reached.'}${talent.prerequisite ? `\nRequires ${talent.prerequisite} at full rank.` : ''}\nTree point gates are not verified.`;
      const columnTitle = `${talent.name}, rank ${rank} of ${talent.maxRank}${unmet ? `, requires ${talent.prerequisite}` : ''}`;
      const classes = ['wow-talent-node', rank ? 'is-spent' : '', unmet ? 'is-locked' : '', addedIds.has(talent.id) ? 'is-current-addition' : '', nextTalentId === talent.id ? 'is-next-recommended' : ''].filter(Boolean).join(' ');
      const pointDisabled = mode === 'guided' || rank >= talent.maxRank || points >= availablePoints || unmet;
      return `<article class="${classes}" style="grid-row:${talent.row};grid-column:${talent.column}"><button type="button" class="wow-talent-add" data-wow-talent-add="${escapeHtml(talent.id)}" aria-label="Add a point to ${escapeHtml(columnTitle)}" title="${escapeHtml(title)}"${pointDisabled ? ' disabled' : ''}><span class="wow-talent-rank">${rank}/${talent.maxRank}</span>${renderWowIcon(talent.icon, `${talent.name} talent icon`, escapeHtml, 'wow-talent-icon')}<strong>${escapeHtml(talent.name)}</strong></button><button type="button" class="wow-talent-remove" data-wow-talent-remove="${escapeHtml(talent.id)}" aria-label="Remove a point from ${escapeHtml(columnTitle)}"${rank === 0 || mode === 'guided' ? ' disabled' : ''}>−</button>${talent.prerequisite ? `<small>Requires ${escapeHtml(talent.prerequisite)}</small>` : ''}</article>`;
    }).join('');
    return `<section class="wow-talent-tree" data-tree-id="${escapeHtml(tree.id)}" data-class-id="${escapeHtml(classId)}" aria-label="${escapeHtml(tree.name)} talent tree"><header>${renderWowIcon(tree.icon, `${tree.name} tree icon`, escapeHtml, 'wow-tree-icon')}<div><h3>${escapeHtml(tree.name)}</h3><small>${tree.talents.length} client talent records</small></div></header><div class="wow-talent-tree-scroll"><div class="wow-talent-grid" style="--talent-columns:${maxColumn};--talent-rows:${maxRow}"><svg class="wow-talent-links" viewBox="0 0 ${maxColumn * 96} ${maxRow * 104}" aria-hidden="true">${connectors}</svg>${nodes}</div></div></section>`;
  }).join('');
  const savedBuilds = loadWowTalentBuilds();
  const matchingBuilds = savedBuilds.filter(build => build.classId === classId);
  const staleBuilds = matchingBuilds.filter(build => build.dataVersion !== catalog.clientBuild || !validateWowTalentAllocation(classRecord, build.allocation, availableWowTalentPoints(build.level, build.talentedRank)).valid);
  const source = catalog.sources?.[0];
  const share = encodeWowTalentBuild({ dataVersion: catalog.clientBuild, classId, specializationId, level, talentedRank: state.talentedRank, allocation, mode, guidedBuildId: mode === 'guided' ? selectedGuide.id : '' });
  const sourceNote = classRecord.sourceNote || `Client talent snapshot ${catalog.clientBuild}.`;
  const malformedIds = Object.keys(allocation).filter(id => !talentMap.has(id));
  const shareWarning = route.sharedBuildToken && !savedDraft && !shared ? '<p class="wow-talent-issues" role="status">This shared build is invalid or uses a different talent-data version. It was not loaded.</p>' : '';
  const guidedShareAction = mode === 'guided' ? `<p class="wow-guided-share"><button type="button" data-wow-talent-share data-share-url="#game/world-of-warcraft/talent-planner/${escapeHtml(share)}">Copy this guided build link</button></p>` : '';
  const guidedOptions = matchingGuides.map(build => `<option value="${escapeHtml(build.id)}"${selectedGuide?.id === build.id ? ' selected' : ''}>${escapeHtml(build.name)}</option>`).join('');
  const modeControls = `<fieldset class="wow-talent-modes"><legend>Build mode</legend><button type="button" data-wow-talent-mode="guided" aria-pressed="${mode === 'guided'}"${!selectedGuide ? ' disabled' : ''}>Guided Leveling</button><button type="button" data-wow-talent-mode="custom" aria-pressed="${mode === 'custom'}">Custom Build</button>${mode === 'guided' ? '<button type="button" class="wow-copy-guided" data-wow-guided-copy>Copy this level into a new Custom Build</button>' : ''}</fieldset>`;
  const guideControls = `<label>Recommended build<select data-wow-guided-build${matchingGuides.length ? '' : ' disabled'}>${guidedOptions || '<option value="">No guided build verified for this class and specialization</option>'}</select></label>`;
  let guidedNotes = '';
  let nextTalentPanel = '';
  let progressionMarkup = '';
  if (mode === 'guided' && selectedGuide) {
    const buildSources = selectedGuide.sourceIds.map(id => (guidedData?.sources || []).find(item => item.id === id)).filter(Boolean);
    const sourceLinks = buildSources.map(item => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)} · updated ${escapeHtml(item.updated)}</a>`).join(' · ');
    const nextTalent = guidedState.nextChange ? talentMap.get(guidedState.nextChange.talentId) : null;
    if (nextTalent && guidedState.nextChange) {
      const nextRank = (Number(guidedState.allocation[nextTalent.id]) || 0) + guidedState.nextChange.rankAdded;
      const milestoneNote = selectedGuide.milestones?.find(item => item.level === guidedState.nextChange.level && item.talentId === nextTalent.id)?.note;
      const rankEffect = nextTalent.rankEffects?.[nextRank - 1];
      const explanation = milestoneNote || rankEffect || '';
      nextTalentPanel = `<aside class="wow-next-recommended-panel" aria-live="polite" aria-label="Next recommended talent"><div class="wow-next-recommended-icon">${renderWowIcon(nextTalent.icon, `${nextTalent.name} talent icon`, escapeHtml, 'wow-next-recommended-game-icon')}</div><div class="wow-next-recommended-copy"><p class="wow-eyebrow">Next recommended talent · Level ${guidedState.nextChange.level}</p><h4>${escapeHtml(nextTalent.name)}</h4><p class="wow-next-recommended-rank">Rank ${nextRank}/${nextTalent.maxRank}</p>${explanation ? `<p class="wow-next-recommended-explanation">${escapeHtml(explanation)}</p>` : ''}</div></aside>`;
    } else {
      const message = !guidedState.covered
        ? `No later talent is documented. This route ends at level ${selectedGuide.coverage.highestDocumentedLevel}; later points are not projected.`
        : `No further talent is documented in this route through level ${selectedGuide.coverage.highestDocumentedLevel}.`;
      nextTalentPanel = `<aside class="wow-next-recommended-panel is-complete" aria-live="polite" aria-label="Next recommended talent"><div class="wow-next-recommended-icon is-empty" aria-hidden="true">✦</div><div class="wow-next-recommended-copy"><p class="wow-eyebrow">Next recommended talent</p><p>${escapeHtml(message)}</p></div></aside>`;
    }
    const currentMilestone = selectedGuide.milestones?.find(item => item.level === guidedState.snapshotLevel);
    const upcomingMilestone = guidedState.nextMilestone;
    const addedNames = guidedState.changesAtRequestedLevel.map(change => talentMap.get(change.talentId)?.name).filter(Boolean);
    const changeNote = guidedState.respecAtRequestedLevel
      ? `<p class="wow-level-change is-respec"><strong>Level ${level} respec:</strong> ${escapeHtml(guidedState.respecAtRequestedLevel.reason || 'This route changes its allocation here.')}</p>`
      : addedNames.length ? `<p class="wow-level-change"><strong>At level ${level}, this build adds ${guidedState.changesAtRequestedLevel.map(change => `${escapeHtml(talentMap.get(change.talentId)?.name || change.talentId)} rank ${Number(allocation[change.talentId]) || 0}`).join(', ')}.</strong></p>`
        : '<p class="wow-level-change">No new talent point is recorded for this level.</p>';
    const coverageNote = !guidedState.covered
      ? `<p class="wow-coverage-note" role="status">Level ${level} is beyond this route’s documented level ${selectedGuide.coverage.highestDocumentedLevel}. Showing the level-${guidedState.snapshotLevel} allocation; later talents are not projected.</p>`
      : level < selectedGuide.levelRange.from
        ? `<p class="wow-coverage-note" role="status">This route starts at level ${selectedGuide.levelRange.from}; no earlier talents are assumed.</p>`
        : '';
    guidedNotes = `<section class="wow-guided-summary" aria-live="polite"><div><p class="wow-eyebrow">${escapeHtml(selectedGuide.name)} · ${escapeHtml(selectedGuide.verificationStatus)}</p><h4>Level ${level}${guidedState.covered ? '' : ` · showing documented level ${guidedState.snapshotLevel}`}</h4><p>${escapeHtml(selectedGuide.summary)}</p><p class="wow-guided-distribution">${escapeHtml(treeDistribution)}</p></div><div><strong>Next recommended talent</strong><p>${nextTalent ? `Level ${guidedState.nextChange.level} · ${escapeHtml(nextTalent.name)}` : 'No later point in documented coverage.'}</p>${upcomingMilestone ? `<strong>Upcoming milestone · Level ${upcomingMilestone.level}</strong><p>${escapeHtml(talentMap.get(upcomingMilestone.talentId)?.name || '')} · ${escapeHtml(upcomingMilestone.note)}</p>` : ''}${currentMilestone ? `<p class="wow-milestone-current">Current milestone · ${escapeHtml(currentMilestone.ranks)} ${escapeHtml(talentMap.get(currentMilestone.talentId)?.name || '')}</p>` : ''}</div></section>${changeNote}${coverageNote}<p class="wow-guide-confidence">Coverage: ${escapeHtml(selectedGuide.coverage.label)} · ${escapeHtml(selectedGuide.confidence)} ${escapeHtml(selectedGuide.respecDisclosure || '')}</p><p class="wow-source-link">Sources: ${sourceLinks}</p>`;
    const grouped = [];
    for (const change of selectedGuide.allocations) {
      const talent = talentMap.get(change.talentId);
      if (!talent) continue;
      const previous = grouped[grouped.length - 1];
      if (previous && previous.talentId === change.talentId && previous.toLevel + 1 === change.level) {
        previous.toLevel = change.level;
        previous.lastRank = (previous.lastRank || 0) + change.rankAdded;
      } else grouped.push({ talentId: change.talentId, fromLevel: change.level, toLevel: change.level, firstRank: Number(allocation[change.talentId]) || 0, lastRank: change.rankAdded });
    }
    const progressRows = grouped.map(row => {
      const talent = talentMap.get(row.talentId);
      const fromSnapshot = resolveWowGuidedBuild(selectedGuide, catalog, row.fromLevel - 1);
      const startingRank = Number(fromSnapshot.allocation[row.talentId]) || 0;
      const endingRank = startingRank + (row.toLevel - row.fromLevel + 1);
      const levelLabel = row.fromLevel === row.toLevel ? `Level ${row.fromLevel}` : `Levels ${row.fromLevel}–${row.toLevel}`;
      const current = level >= row.fromLevel && level <= row.toLevel;
      const rowMarkup = `<span class="wow-progression-level">${levelLabel}</span><span class="wow-progression-talent">${renderWowIcon(talent.icon, `${talent.name} talent icon`, escapeHtml, 'wow-progression-icon')}<strong>${escapeHtml(talent.name)}</strong></span><span>${startingRank + 1}–${endingRank}/${talent.maxRank}</span><span>${escapeHtml(selectedGuide.milestones?.find(item => item.talentId === row.talentId)?.note || 'Part of the selected leveling route.')}</span>`;
      return `<button type="button" class="wow-progression-row${current ? ' is-current' : ''}" data-wow-guided-level="${row.fromLevel}" aria-current="${current ? 'step' : 'false'}">${rowMarkup}</button>`;
    }).join('');
    progressionMarkup = `<section class="wow-guided-progression"><h4>Talent progression · ${escapeHtml(selectedGuide.levelRange.from)}–${escapeHtml(selectedGuide.coverage.highestDocumentedLevel)}</h4><div class="wow-progression-head"><span>Level</span><span>Talent</span><span>Ranks</span><span>Why</span></div><div class="wow-progression-table">${progressRows}</div><div class="wow-progression-mobile">${grouped.map(row => { const talent = talentMap.get(row.talentId); const current = level >= row.fromLevel && level <= row.toLevel; return `<details class="wow-progression-detail${current ? ' is-current' : ''}"><summary>${row.fromLevel}–${row.toLevel} · ${escapeHtml(talent.name)}</summary><button type="button" data-wow-guided-level="${row.fromLevel}">Move to level ${row.fromLevel}</button><p>${escapeHtml(selectedGuide.milestones?.find(item => item.talentId === row.talentId)?.note || 'Part of the selected leveling route.')}</p></details>`; }).join('')}</div></section>`;
  }
  const customActions = mode === 'custom' ? `<div class="wow-talent-save"><label>Build name<input type="text" maxlength="60" value="${escapeHtml(state.name || '')}" data-wow-build-name placeholder="e.g. My Enhancement build"></label><button type="button" data-wow-talent-save>${state.editingBuildId ? 'Update saved build' : 'Save as new build'}</button><button type="button" data-wow-talent-reset>Reset custom allocation</button><button type="button" data-wow-talent-share data-share-url="#game/world-of-warcraft/talent-planner/${escapeHtml(share)}">Copy share link</button><span role="status" aria-live="polite" data-wow-talent-status></span></div>` : '';
  const savedList = matchingBuilds.length ? `<ul>${matchingBuilds.map(build => `<li><strong>${escapeHtml(build.name)}</strong><span>Level ${escapeHtml(String(build.level))} · ${Object.values(build.allocation || {}).reduce((sum, rank) => sum + (Number(rank) || 0), 0)} points</span><button type="button" data-wow-talent-load="${escapeHtml(build.id)}"${build.dataVersion !== catalog.clientBuild ? ' disabled aria-label="Saved against an older talent data version"' : ''}>Load into Custom Build</button><button type="button" data-wow-talent-delete="${escapeHtml(build.id)}">Delete</button></li>`).join('')}</ul>` : '<p>No saved custom builds for this class yet.</p>';
  const unsupportedGuide = mode === 'custom' && !matchingGuides.length
    ? `<p class="wow-coverage-note" role="status">No automatic build is currently available for ${escapeHtml(classRecord.name)} · ${escapeHtml(sourceClass.specializations.find(spec => spec.id === specializationId)?.name || '')}. Manual planning is available.</p>`
    : '';
  const copyNote = mode === 'custom' && state.copiedFromGuided ? '<p class="wow-note" role="status">Recommended allocation copied into a new unsaved custom draft. Your saved builds were not changed.</p>' : '';
  return `<section class="wow-talent-planner" data-wow-talent-planner data-class-id="${escapeHtml(classId)}" data-mode="${mode}" data-guided-allocation="${escapeHtml(encodeURIComponent(JSON.stringify(guidedState?.allocation || {})))}">${shareWarning}<div class="wow-talent-controls"><label>Class<select data-wow-talent-class>${catalog.classes.map(item => `<option value="${escapeHtml(item.id)}"${item.id === classId ? ' selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label><label>Specialization<select data-wow-talent-spec>${sourceClass.specializations.map(item => `<option value="${escapeHtml(item.id)}"${item.id === specializationId ? ' selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>${guideControls}<label>Current level<input type="number" min="1" max="60" value="${level}" data-wow-talent-level></label><label class="wow-level-slider-label">Level ${level}<input type="range" min="1" max="60" value="${level}" aria-label="Leveling talent build level" data-wow-talent-level-slider></label><div class="wow-level-stepper"><button type="button" data-wow-talent-level-step="-1"${level <= 1 ? ' disabled' : ''}>← Previous level</button><strong>Level ${level}</strong><button type="button" data-wow-talent-level-step="1"${level >= 60 ? ' disabled' : ''}>Next level →</button></div></div>${modeControls}${guidedShareAction}${mode === 'guided' ? nextTalentPanel : ''}<header class="wow-talent-heading" style="--class-accent:${escapeHtml(sourceClass?.color || '#c0a46b')}">${renderClassEmblem(classId, catalog, escapeHtml, 'wow-class-emblem-large')}<div><p class="wow-eyebrow">World of Warcraft: Forever · Talent planner</p><h3>${escapeHtml(classRecord.name)} · ${escapeHtml(sourceClass.specializations.find(spec => spec.id === specializationId)?.name || '')}</h3><p>${escapeHtml(sourceNote)}</p><small>Snapshot ${escapeHtml(catalog.snapshotDate)} · client ${escapeHtml(catalog.clientBuild)}</small></div></header>${unsupportedGuide}${copyNote}${guidedNotes}<div class="wow-talent-meter"><strong>${points} / ${availablePoints}</strong><span>points spent / points at ${mode === 'guided' ? `snapshot level ${budgetLevel}` : `level ${level}`}</span><span>${availablePoints - points} remaining</span></div>${mode === 'guided' ? `<p class="wow-build-distribution">${escapeHtml(treeDistribution)}</p>` : ''}${validation.issues.length ? `<ul class="wow-talent-issues" role="status">${validation.issues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}</ul>` : ''}${malformedIds.length ? `<p class="wow-note" role="status">${malformedIds.length} stale talent reference(s) are excluded from the visible tree.</p>` : ''}<p class="wow-talent-rule-note">${escapeHtml(catalog.talentRuleNote)} Known rank limits and named prerequisites are validated. Per-row point gates are not verified.</p><div class="wow-talent-trees" data-spec-tree-set="${escapeHtml(classId)}:${escapeHtml(specializationId)}">${trees}</div>${progressionMarkup}${customActions}<section class="wow-saved-builds"><h3>Saved custom builds · ${escapeHtml(classRecord.name)}</h3>${staleBuilds.length ? `<p class="wow-note">${staleBuilds.length} saved build(s) need review against the current talent snapshot.</p>` : ''}${savedList}</section><p class="wow-source-link">Talent node data: <a href="${escapeHtml(source?.url || 'https://talentsforever.com/data.json')}" target="_blank" rel="noreferrer">Talents Forever · CC BY 4.0 ↗</a></p></section>`;
}
export function getWowDungeonSuggestions(dungeons, level) {
  const currentLevel = Number(level) || 1;
  const records = Array.isArray(dungeons) ? dungeons : [];
  const available = records.filter(item => currentLevel >= item.minLevel && currentLevel <= item.maxLevel);
  if (available.length) return { current: available, upcoming: [] };
  return { current: [], upcoming: records.filter(item => item.minLevel > currentLevel).sort((a,b) => a.minLevel-b.minLevel).slice(0,3) };
}

export function loadWowGuideProgress(storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    const value = JSON.parse(store?.getItem(WOW_PROGRESS_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function saveWowGuideProgress(progress, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    if (!store?.setItem) return false;
    store.setItem(WOW_PROGRESS_STORAGE_KEY, JSON.stringify(progress && typeof progress === 'object' ? progress : {}));
    return true;
  } catch { return false; }
}

function renderWowDungeons(data, escapeHtml) {
  const source = data.sources.find(item => item.id === 'forever-new-dungeons');
  const cards = (data.dungeons || []).map(dungeon => `<article class="wow-dungeon-card"><span class="wow-dungeon-level">${dungeon.minLevel}–${dungeon.maxLevel}</span><p class="wow-eyebrow">${escapeHtml(dungeon.continent)} · New in Forever</p><h3>${escapeHtml(dungeon.name)}</h3><p>${escapeHtml(dungeon.location)}</p><small>Published level range · travel and group readiness still depend on your party.</small></article>`).join('');
  return `<section class="wow-note dungeon-profile-recommendation"><p class="wow-eyebrow">Current character · Alliance Shaman · Level 21</p><h2>Good next runs</h2><p><strong>Deadmines (17–26)</strong> and <strong>Wailing Caverns (15–24)</strong> are within the Forever level bands. For Enhancement, Hall of Thanes is below band but its Alliance quest chain offers the recommended Ironforge Greathammer.</p><a href="#game/world-of-warcraft/dungeons/deadmines">Start with Deadmines preparation →</a></section><p class="wow-lede">Plan outdoor errands before you queue, then carry the right quests into the instance.</p><p class="wow-dungeon-prep-link"><a href="#game/world-of-warcraft/dungeons/shadowfang-keep">Shadowfang Keep preparation →</a> · <a href="#game/world-of-warcraft/dungeons/wailing-caverns">Wailing Caverns →</a> · <a href="#game/world-of-warcraft/dungeons/ruins-of-lordaeron">Ruins of Lordaeron →</a> · <a href="#game/world-of-warcraft/dungeons/hall-of-thanes">Hall of Thanes →</a> · <a href="#game/world-of-warcraft/dungeons/deadmines">Deadmines →</a></p><div class="wow-dungeon-grid">${cards}</div>${source ? `<p class="wow-source-link">Ranges and locations: <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a></p>` : ''}<p class="wow-note">Preparation pages use documented Forever data. Upcoming Blackfathom Deeps and Excavation Site: Wetlands are listed when their preparation details have been verified.</p>`;
}

function renderWowJourney(data, artworkManifest, catalog, profile, progress, escapeHtml) {
  const classRecord = data.classes.find(item => item.id === profile.classId);
  const spec = classRecord?.specializations.find(item => item.id === profile.specializationId);
  const art = classRecord && (artworkManifest?.records?.find(record => record.kind === 'class' && record.classId === classRecord.id) || artworkManifest?.records?.find(record => record.classId === classRecord.id));
  const raceOptions = classRecord && profile.faction
    ? (catalog?.races?.length ? getWowRaceOptions(catalog, profile.faction, classRecord.name).map(race => race.name) : Object.entries(data.raceCombinations?.[profile.faction] || {}).filter(([, names]) => names.includes(classRecord.name)).map(([race]) => race))
    : [];
  const selectedRace = profile.race === 'Skyborne' ? raceOptions.find(race => race.startsWith('Skyborne')) || profile.race : profile.race;
  const raceRecord = catalog?.races?.find(race => race.name === selectedRace && race.faction === profile.faction);
  const savedBuilds = loadWowTalentBuilds().filter(build => !classRecord || build.classId === classRecord.id);
  const selectedBuild = savedBuilds.find(build => build.id === profile.talentBuildId);
  const specOptions = classRecord?.specializations || [];
  const zones = data.zones.filter(zone => !profile.faction || zone.faction === 'Both' || zone.faction === profile.faction);
  const level = profile.currentLevel || 1;
  const enhancementMilestones = classRecord?.id === 'shaman' ? data.enhancementGuide.talentMilestones.filter(item => item.level >= level) : [];
  const nextEnhancement = enhancementMilestones[0];
  const talentSummary = classRecord?.id === 'shaman'
    ? nextEnhancement ? `<p>Next listed milestone: level ${nextEnhancement.level}, <strong>${escapeHtml(nextEnhancement.name)}</strong>. ${escapeHtml(nextEnhancement.note)}</p>` : '<p>Past the recorded early milestones. Check the source for later progression.</p>'
    : classRecord?.starterGuide?.talentPriorities?.length ? `<p>${escapeHtml(classRecord.starterGuide.talentPriorities.join(' · '))}</p><small>These are source-listed priorities; a next-point level is not recorded here.</small>`
      : '<p>No class-specific talent milestones are recorded for this path yet. Use the linked leveling guide before spending points.</p>';
  const steps = classRecord?.starterGuide?.journeySteps || [];
  const checks = steps.length ? steps.map((step, index) => {
    const id = `${classRecord.id}:${step.id}`;
    return `<label class="wow-progress-step"><input type="checkbox" data-wow-progress-id="${escapeHtml(id)}"${progress[id] ? ' checked' : ''}><span>${step.level ? `<small>Level ${escapeHtml(String(step.level))}</small>` : ''}${escapeHtml(step.label)}</span></label>`;
  }).join('') : '<p>No step-by-step quest checklist is verified for this class yet. The linked class guide remains available.</p>';
  const dungeonSuggestions = getWowDungeonSuggestions(data.dungeons, level);
  const dungeonList = [...dungeonSuggestions.current, ...dungeonSuggestions.upcoming];
  const source = classRecord && data.sources.find(item => item.id === classRecord.starterGuide?.sourceId);
  const zoneImage = zone => artworkManifest?.records?.find(record => record.kind === 'zone' && record.zoneId === zone.id);
  const regionCards = zones.map(zone => {
    const picture = zoneImage(zone);
    const inRange = zone.range && level >= Number(zone.range.split(/[–-]/)[0]) && level <= Number(zone.range.split(/[–-]/)[1]);
    return `<a class="wow-journey-zone${inRange ? ' is-level-match' : ''}${profile.currentZone === zone.id ? ' is-current-zone' : ''}" id="journey-zone-${escapeHtml(zone.id)}" href="#game/world-of-warcraft/leveling">${picture ? `<img src="${escapeHtml(picture.src)}" alt="" loading="lazy" width="560" height="300">` : `<span class="wow-zone-art-fallback" aria-hidden="true">✦</span>`}<strong>${escapeHtml(zone.name)}</strong><small>${zone.range ? `Levels ${escapeHtml(zone.range)}` : 'Level range not confirmed'} · ${escapeHtml(zone.faction)}</small>${profile.currentZone === zone.id ? '<small>Your current region</small>' : ''}${zone.access ? `<small>${escapeHtml(zone.access)}</small>` : ''}</a>`;
  }).join('');
  return `<section class="wow-journey-dashboard" aria-label="My Azeroth Journey">
    <p class="wow-lede">A private guide profile saved in this browser. It does not connect to the WoW client or read your in-game progress.</p>
    <form class="wow-profile-form" data-wow-character-form><div class="wow-profile-fields"><label>Character name<input name="characterName" maxlength="32" value="${escapeHtml(profile.characterName || '')}" autocomplete="nickname"></label><label>Faction<select name="faction" data-wow-profile-faction><option value="">Choose faction</option>${['Alliance','Horde'].map(value => `<option${profile.faction === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label><label>Class<select name="classId" data-wow-profile-class><option value="">Choose class</option>${data.classes.map(item => `<option value="${escapeHtml(item.id)}"${profile.classId === item.id ? ' selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label><label>Race<select name="race" data-wow-profile-race><option value="">${raceOptions.length ? 'Choose race' : 'Choose faction and class first'}</option>${raceOptions.map(value => `<option${selectedRace === value ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select></label><label>Specialization<select name="specializationId" data-wow-profile-spec><option value="">Choose specialization</option>${specOptions.map(item => `<option value="${escapeHtml(item.id)}"${profile.specializationId === item.id ? ' selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label><label>Current level<input name="currentLevel" type="number" min="1" max="60" value="${escapeHtml(String(level))}"></label><label>Playstyle<select name="playstyle">${data.playstyles.map(item => `<option value="${escapeHtml(item.id)}"${profile.playstyle === item.id ? ' selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}</select></label><label>Saved talent build<select name="talentBuildId"><option value="">No saved build selected</option>${savedBuilds.map(build=>`<option value="${escapeHtml(build.id)}"${profile.talentBuildId === build.id ? ' selected' : ''}>${escapeHtml(build.name)}</option>`).join('')}</select></label><label>Current region<select name="currentZone"><option value="">Choose region</option>${data.zones.map(zone => `<option value="${escapeHtml(zone.id)}"${profile.currentZone === zone.id ? ' selected' : ''}>${escapeHtml(zone.name)}</option>`).join('')}</select></label></div><div class="wow-profile-actions"><button type="submit">Save my character</button><button type="button" data-wow-profile-reset>Clear profile</button><span data-wow-profile-status role="status" aria-live="polite"></span></div></form>
    ${classRecord ? `<header class="wow-dashboard-character" style="--class-accent:${escapeHtml(classRecord.color)}">${art ? `<img src="${escapeHtml(art.src)}" alt="${escapeHtml(art.alt)}" width="400" height="260">` : `<span class="wow-class-art-fallback" role="img" aria-label="${escapeHtml(classRecord.name)} class-themed illustration fallback">${escapeHtml(classRecord.name.slice(0, 1))}</span>`}<div class="wow-dashboard-identity"><span class="wow-character-emblems">${renderClassEmblem(classRecord.id,catalog,escapeHtml,'wow-class-emblem-large')}${raceRecord ? renderWowIcon(raceRecord.icon,`${raceRecord.name} race emblem`,escapeHtml,'wow-race-emblem') : ''}</span><p class="wow-eyebrow">My character${profile.characterName ? ` · ${escapeHtml(profile.characterName)}` : ''}</p><h3>${escapeHtml(classRecord.name)}${spec ? ` · ${escapeHtml(spec.name)}` : ''}</h3><p>${profile.race ? `${escapeHtml(profile.race)} · ` : ''}Level ${level} · ${escapeHtml(profile.faction || 'Faction not selected')} · ${escapeHtml(data.playstyles.find(item => item.id === profile.playstyle)?.label || 'Solo leveling')}</p>${source ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open the Forever leveling guide ↗</a>` : ''}</div></header>
    <div class="wow-dashboard-grid"><section><p class="wow-eyebrow">Where next?</p><h3>Faction-matched regions</h3><p>${escapeHtml(classRecord.starterGuide.zoneAdvice)}</p><div class="wow-journey-zones">${regionCards || '<p>No regions match the selected faction.</p>'}</div><a href="#game/world-of-warcraft/leveling">Open zone explorer →</a></section><section><p class="wow-eyebrow">Talent direction</p><h3>My next talents</h3>${talentSummary}${selectedBuild ? `<p class="wow-selected-build">Selected build: <strong>${escapeHtml(selectedBuild.name)}</strong> · ${Object.values(selectedBuild.allocation || {}).reduce((sum,rank)=>sum+(Number(rank)||0),0)} planned points.</p>` : ''}<a href="#game/world-of-warcraft/talent-planner">Open ${escapeHtml(classRecord.name)} talent planner →</a></section><section><p class="wow-eyebrow">During a fight</p><h3>How to play</h3><ul>${classRecord.starterGuide.combat.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul><div class="wow-ability-row">${classRecord.starterGuide.quickAbilities.map(name => `<span class="wow-ability-chip">${escapeHtml(name)}</span>`).join('')}</div></section><section><p class="wow-eyebrow">Dungeon plans</p><h3>Current opportunities</h3>${dungeonList.length ? `<ul class="wow-dungeon-opportunities">${dungeonList.map(item => `<li><strong>${escapeHtml(item.name)}</strong><span>Levels ${item.minLevel}–${item.maxLevel} · ${item.location}</span>${item.minLevel > level ? '<small>Upcoming</small>' : ''}</li>`).join('')}</ul>` : '<p>No dungeon level bands are recorded in this guide yet.</p>'}<a href="#game/world-of-warcraft/dungeons-raids">Open dungeon guide →</a></section><section class="wow-dashboard-progress"><p class="wow-eyebrow">My questing progress</p><h3>Guide milestones</h3><p>Check these off manually as you go; they are not synced to the game.</p>${steps.length ? `<div>${checks}</div><button type="button" data-wow-progress-reset>Reset checklist</button><span data-wow-progress-status role="status" aria-live="polite"></span>` : checks}</section><section><p class="wow-eyebrow">Quick links</p><h3>Keep adventuring</h3><nav class="wow-dashboard-links"><a href="#game/world-of-warcraft/classes/${escapeHtml(classRecord.id)}">Class guide</a><a href="#game/world-of-warcraft/builds/${escapeHtml(classRecord.id)}/${escapeHtml(spec?.id || classRecord.specializations[0].id)}">Build guide</a><a href="#game/world-of-warcraft/leveling">Leveling directory</a><a href="#game/world-of-warcraft/dungeons-raids">Dungeon directory</a><a href="#game/world-of-warcraft/races">Race directory</a></nav></section></div>` : `<section class="wow-journey-empty"><h3>Start with your character</h3><p>Choose a class, faction and level above. We’ll connect your profile to the guides we have.</p><a href="#game/world-of-warcraft/classes">Browse all nine classes →</a></section>`}
  </section>`;
}


function renderRelatedGuides(classRecord, currentSpecialization, artworkManifest, catalog, escapeHtml) {
  const classArtwork = artworkManifest?.records?.find(record => record.kind === 'class' && record.classId === classRecord.id);
  const zoneArtwork = artworkManifest?.records?.find(record => record.kind === 'zone');
  const clientClass = catalog?.classes?.find(record => record.id === classRecord.id);
  const treeFor = specialization => clientClass?.trees?.find(tree => tree.name === specialization.name);
  const frame = (src, decorative = false) => src
    ? `<img class="wow-related-guide-icon${decorative ? ' is-artwork' : ''}" src="${escapeHtml(src)}" alt="" loading="lazy" width="56" height="56" aria-hidden="true">`
    : '<span class="wow-related-guide-icon is-fallback" aria-hidden="true">✦</span>';
  const cards = [];
  if (currentSpecialization) {
    cards.push({ href: `#game/world-of-warcraft/classes/${classRecord.id}`, title: `${classRecord.name} overview`, type: 'Class guide', description: `Review ${classRecord.name} roles, strengths, starter advice, and all specializations.`, icon: frame(classArtwork?.src, true) });
  }
  const plannerSpecialization = currentSpecialization || classRecord.specializations.find(spec => spec.name === classRecord.starterGuide?.specialization) || classRecord.specializations[0];
  const plannerTree = plannerSpecialization ? treeFor(plannerSpecialization) : null;
  const guidedBuildAttribute = classRecord.id === 'shaman' && plannerSpecialization?.id === 'enhancement' ? ' data-wow-build-id="bm-shaman-enhancement-solo-10-30"' : '';
  cards.push({ href: '#game/world-of-warcraft/talent-planner', title: `${classRecord.name} talent planner`, type: 'Talent planner', description: plannerSpecialization ? `Open the three-tree planner for ${plannerSpecialization.name}; guided data is shown where available.` : `Plan ${classRecord.name} talents across the recorded class trees.`, icon: plannerTree?.icon ? frame(plannerTree.icon) : frame(clientClass?.icon), plannerAttributes: `data-wow-build-class="${escapeHtml(classRecord.id)}" data-wow-build-spec="${escapeHtml(plannerSpecialization?.id || '')}"${guidedBuildAttribute}` });
  cards.push({ href: '#game/world-of-warcraft/leveling', title: 'Leveling zones and routes', type: 'Leveling guide', description: 'Browse the existing zone directory and narrow it by faction, class, and level.', icon: frame(zoneArtwork?.src, true) });
  for (const specialization of classRecord.specializations) {
    if (specialization.id === currentSpecialization?.id) continue;
    const tree = treeFor(specialization);
    cards.push({ href: `#game/world-of-warcraft/builds/${classRecord.id}/${specialization.id}`, title: `${classRecord.name} ${specialization.name}`, type: `${specialization.role} · Specialization`, description: specialization.focus, icon: tree?.icon ? frame(tree.icon) : frame(clientClass?.icon) });
  }
  return `<section class="wow-related-guides" aria-labelledby="wow-related-guides-title" style="--class-accent:${escapeHtml(classRecord.color)}"><div class="wow-related-guides-heading"><p class="wow-eyebrow">Continue your research</p><h3 id="wow-related-guides-title">Related Guides</h3></div><div class="wow-related-guide-grid">${cards.map(card => `<a class="wow-related-guide-card" href="${escapeHtml(card.href)}"${card.plannerAttributes ? ` ${card.plannerAttributes}` : ''}><span class="wow-related-guide-visual">${card.icon}</span><span class="wow-related-guide-copy"><small>${escapeHtml(card.type)}</small><strong>${escapeHtml(card.title)}</strong><span>${escapeHtml(card.description)}</span></span><span class="wow-related-guide-arrow" aria-hidden="true">↗</span></a>`).join('')}</div></section>`;
}

export function renderWowPage(route, data, escapeHtml, artworkManifest = null, profile = {}, progress = loadWowGuideProgress(), catalog = null, guidedData = null) {
  const href = view => `#game/world-of-warcraft/${view}`;
  const scene = `<div class="wow-scene" aria-hidden="true"><div class="wow-moon"></div><div class="wow-spires"></div></div>`;
  const categories = [
    ['my-journey', 'My Azeroth Journey', 'Your character, progress and next steps'],
    ['classes', 'Classes & Specializations', 'Class directory and verified details'],
    ['races', 'Races of Azeroth', 'Forever race abilities and class choices'],
    ['build-finder', 'Find My Build', 'Explore supported class and role paths'],
    ['talent-planner', 'Talent Planner', 'Interactive Forever talent trees'],
    ['tier-lists', 'Tier Lists', 'Rankings will appear when evidence is ready'],
    ['leveling', 'Leveling Zones & Routes', 'Browse classic and newly introduced lands'],
    ['dungeons-raids', 'Dungeons & Raids', 'Encounter guides · Upcoming'],
    ['gear-professions', 'Gear & Professions', 'Equipment and crafting · Upcoming'],
    ['beginner-guides', 'Beginner Guides', 'Getting started · Upcoming']
  ];
  const classArt = item => artworkManifest?.records?.find(record => record.kind === 'class' && record.classId === item.id) || artworkManifest?.records?.find(record => record.classId === item.id);
  const classCardArt = item => artworkManifest?.records?.find(record => record.kind === 'class-card' && record.classId === item.id) || classArt(item);
  const wowHeroArt = artworkManifest?.records?.find(record => record.id === 'wow-forever:homepage:featured');
  const title = route.view === 'wow-home' ? 'World of Warcraft: Forever' : route.view === 'wow-journey' ? 'My Azeroth Journey' : route.view === 'wow-classes' ? 'Classes & Specializations' : route.view === 'wow-races' ? 'Races of Azeroth' : route.view === 'wow-race' ? route.raceRecord.name : route.view === 'wow-class' ? route.classRecord.name : route.view === 'wow-dungeons' ? 'Dungeons & Raids' : route.view === 'wow-leveling' ? 'Leveling Zones & Routes' : route.view === 'wow-tier-lists' ? 'Tier Lists' : route.view === 'wow-build-finder' ? 'Find My Build' : route.view === 'wow-build-detail' ? `${route.classRecord.name} · ${route.specialization.name}` : route.view === 'wow-talents' ? 'Talent Planner' : categories.find(item => item[0] === route.view.replace('wow-', ''))?.[1] || 'Azeroth Field Guide';
  let body = '';
  if (route.view === 'wow-home') {
    const destinations = [
      { view: 'classes', title: 'Classes', description: 'Explore all nine classes.', icon: catalog?.classes?.find(item => item.id === 'warrior')?.icon, iconAlt: 'Warrior class icon' },
      { view: 'races', title: 'Races', description: 'Compare Alliance and Horde options.', icon: catalog?.races?.find(item => item.id === 'human')?.icon, iconAlt: 'Human race icon' },
      { view: 'talent-planner', title: 'Talent Builds', description: 'Find talents and leveling builds.', icon: catalog?.classes?.find(item => item.id === 'warrior')?.trees?.find(tree => tree.id === 'arms')?.icon, iconAlt: 'Arms talent icon' },
      { view: 'leveling', title: 'Leveling Zones', description: 'Discover where to level next.', icon: 'assets/images/wow-forever/icons/achievement_zone_barrens_01.jpg', iconAlt: 'Barrens zone achievement icon' },
      { view: 'dungeons-raids', title: 'Dungeon Guides', description: 'Quests, preparation and rewards.', icon: 'assets/images/wow-forever/icons/ability_warrior_shieldwall.jpg', iconAlt: 'Warrior Shield Wall game icon' },
      { view: 'tier-lists', title: 'Tier Lists', description: 'Compare available class and role recommendations.', icon: 'assets/images/wow-forever/icons/achievement_raidprimalist_windelemental.jpg', iconAlt: 'Raid achievement icon' }
    ];
    const cards = destinations.map(item => `<a class="wow-home-destination" href="${href(item.view)}"><span class="wow-home-destination-icon">${renderWowIcon(item.icon, '', escapeHtml, 'wow-home-destination-icon-img')}</span><span class="wow-home-destination-copy"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></span><span class="wow-home-destination-action">Explore <span aria-hidden="true">→</span></span></a>`).join('');
    body = `<section class="wow-home-hero" aria-labelledby="page-title"><div class="wow-home-hero-copy"><p class="wow-eyebrow">Azeroth · Forever begins now</p><h1 id="page-title" tabindex="-1">World of Warcraft: Forever</h1><p>Your adventure across Azeroth starts here.</p><div class="wow-home-actions"><a class="wow-home-action-primary" href="${href('classes')}">Explore Classes <span aria-hidden="true">→</span></a><a class="wow-home-action-secondary" href="${href('my-journey')}">Continue My Journey</a></div></div>${wowHeroArt ? `<div class="wow-home-hero-art"><img src="${escapeHtml(wowHeroArt.src)}" alt="${escapeHtml(wowHeroArt.alt)}" width="${wowHeroArt.width}" height="${wowHeroArt.height}" fetchpriority="high"></div>` : ''}</section><section class="wow-home-directory" aria-labelledby="wow-directory-title"><div class="wow-home-section-heading"><p class="wow-eyebrow">The field guide</p><h2 id="wow-directory-title">Explore Azeroth</h2></div><div class="wow-home-directory-grid">${cards}</div></section>`;
  }
  if (route.view === 'wow-journey') body = renderWowJourney(data, artworkManifest, catalog, profile, progress, escapeHtml);
  if (route.view === 'wow-classes') body = `<p class="wow-lede">Choose your class and get practical Forever-specific tips for your first levels.</p><p class="wow-note">${escapeHtml(data.classNotes)}</p><div class="wow-class-grid">${data.classes.map(item => {
    const art = classCardArt(item);
    return `<a class="wow-class-card" style="--class-accent:${escapeHtml(item.color)}" href="${href(`classes/${item.id}`)}"><span class="wow-class-card-art">${art ? `<img src="${escapeHtml(art.src)}" alt="" width="480" height="320" loading="lazy">` : `<span class="wow-class-art-fallback" aria-hidden="true">${escapeHtml(item.name.slice(0, 1))}</span>`}<span class="wow-class-card-emblem">${renderClassEmblem(item.id,catalog,escapeHtml,'wow-class-card-icon')}</span></span><span class="wow-class-card-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.roles.join(' · '))}</small><span class="wow-class-card-link">Explore class <span aria-hidden="true">→</span></span></span></a>`;
  }).join('')}</div>`;
  if (route.view === 'wow-races') body = renderWowRaceDirectory(data, catalog, artworkManifest, escapeHtml);
  if (route.view === 'wow-race') body = renderWowRaceDetail(route.raceRecord, data, catalog, escapeHtml);
  if (route.view === 'wow-class') {
    const item = route.classRecord;
    const source = data.sources.find(entry => entry.id === item.sourceId);
    const guide = item.starterGuide;
    const guideSource = data.sources.find(entry => entry.id === guide?.sourceId);
    const art = classArt(item);
    const raceGroups = Object.entries(data.raceCombinations || {}).map(([faction, races]) => {
      const availableRaces = Object.entries(races).filter(([, classNames]) => classNames.includes(item.name)).map(([race]) => race);
      return `<div><strong>${escapeHtml(faction)}</strong><span>${escapeHtml(availableRaces.join(', ') || 'No combinations recorded')}</span></div>`;
    }).join('');
    const specializations = item.specializations.map(spec => `<a class="wow-spec-card" href="${href(`builds/${item.id}/${spec.id}`)}">${art ? `<img src="${escapeHtml(art.src)}" alt="" width="480" height="220" loading="lazy">` : ''}<span>${escapeHtml(spec.role)}</span><h3>${escapeHtml(spec.name)}</h3><p>${escapeHtml(spec.focus)}</p><small>${escapeHtml(spec.name === guide?.specialization ? 'Leveling guide available' : 'Read path overview')} →</small></a>`).join('');
    const bullets = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
    const abilityChips = guide?.quickAbilities?.map(name => { const icon = catalog?.classAbilities?.[item.id]?.find(record => record.name === name)?.icon || catalog?.classes?.find(record => record.id === item.id)?.trees.flatMap(tree => tree.talents).find(talent => talent.name === name)?.icon; return `<span class="wow-ability-chip">${icon ? renderWowIcon(icon, `${name} game icon`, escapeHtml, 'wow-chip-icon') : ''}${escapeHtml(name)}</span>`; }).join('') || '';
    body = `<header class="wow-class-hero wow-class-hero-illustrated" style="--class-accent:${escapeHtml(item.color)}">${art ? `<img src="${escapeHtml(art.src)}" alt="${escapeHtml(art.alt)}" width="960" height="640" fetchpriority="high">` : `<div class="wow-class-art-fallback" role="img" aria-label="${escapeHtml(item.name)} class-themed decorative illustration fallback"><span aria-hidden="true">${escapeHtml(item.name.slice(0, 1))}</span></div>`}<div class="wow-class-hero-heading">${renderClassEmblem(item.id,catalog,escapeHtml,'wow-class-emblem-large')}<p class="wow-eyebrow">World of Warcraft: Forever · Class field guide</p><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description)}</p><span class="wow-art-caption">Original BM Gaming Wiki illustration · not official in-game art</span></div></header>
      <section class="wow-starter-guide" aria-labelledby="starter-guide-title"><div class="wow-subsection-heading"><div><p class="wow-eyebrow">First levels · Forever-specific guide</p><h3 id="starter-guide-title">Starting your journey as ${escapeHtml(item.name)}</h3></div>${guideSource ? `<a class="wow-guide-source" href="${escapeHtml(guideSource.url)}" target="_blank" rel="noreferrer">Open full leveling guide ↗</a>` : ''}</div><div class="wow-starter-summary"><article><span>Suggested path</span><h4>${escapeHtml(guide?.specialization || 'Class path')}</h4><p>${escapeHtml(guide?.reason || item.description)}</p></article><article><span>Quick combat reference</span><div class="wow-ability-row">${abilityChips}</div><ol>${bullets(guide?.combat || item.soloTips || [])}</ol></article></div><section class="wow-level-roadmap" aria-label="${escapeHtml(item.name)} leveling roadmap"><div class="wow-subsection-heading"><div><p class="wow-eyebrow">Early journey · levels 1–30</p><h3>Leveling roadmap</h3></div></div><div class="wow-level-roadmap-grid">${(guide?.levelingBands || []).map(band => `<article><span>${escapeHtml(band.range)}</span><p>${escapeHtml(band.combat)}</p><p><strong>Stay safe:</strong> ${escapeHtml(band.survival)}</p><small>${escapeHtml(band.milestones)}</small></article>`).join('')}</div></section><div class="wow-starter-grid"><article><h4>Resource and pacing</h4><p>${escapeHtml(guide?.resource || 'See the linked Forever guide for current resource advice.')}</p></article><article><h4>Class quests and unlocks</h4><p>${escapeHtml(guide?.classMilestones || 'Check the class quest guide for your race and level.')}</p></article><article><h4>Weapons and gear</h4><p>${escapeHtml(guide?.gear || 'Use current level-appropriate gear and the linked guide for detailed priorities.')}</p></article><article><h4>Beginner traps</h4>${bullets(guide?.beginnerMistakes || [])}</article></div>${guide?.talentPriorities?.length ? `<details class="wow-talent-tips"><summary>Early talent priorities from the guide</summary>${bullets(guide.talentPriorities)}<small>Recommendations are copied as names and milestones only; this page does not claim a full talent allocation.</small></details>` : ''}<div class="wow-start-zones"><strong>Where to quest</strong><p>${escapeHtml(guide?.zoneAdvice || 'Use the leveling directory and choose a faction/level-matched zone.')}</p><a href="${href('leveling')}">Open leveling helper →</a></div></section>
      <div class="wow-detail-grid"><article><h3>Roles</h3><p>${escapeHtml(item.roles.join(' · '))}</p></article><article><h3>Strengths</h3>${renderBullets(item.strengths, escapeHtml)}</article><article><h3>Limitations</h3>${renderBullets(item.limitations, escapeHtml)}</article><article><h3>Group utility</h3>${renderBullets(item.groupUtility, escapeHtml)}</article><article><h3>Available tools</h3>${renderBullets(item.abilities, escapeHtml)}</article></div><section class="wow-subsection"><div class="wow-subsection-heading"><p class="wow-eyebrow">Forever talent paths</p><h3>Specializations</h3></div><div class="wow-spec-grid">${specializations}</div></section><section class="wow-subsection"><h3>Race and faction options</h3><div class="wow-race-list">${raceGroups}</div><p class="wow-note">Skyborne access and starting experience require the Heroic Pack or higher.</p><a href="#game/world-of-warcraft/races">Open race details and compatibility →</a></section>${renderWowSpellbook(item,catalog,escapeHtml)}${renderRelatedGuides(item,null,artworkManifest,catalog,escapeHtml)}${source ? `<p class="wow-source-link">Class details: <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a></p>` : ''}`;
  }
  if (route.view === 'wow-build-finder') body = `<p class="wow-lede">Explore source-backed specialization paths by role. This finder does not claim that a complete talent loadout or rotation is verified.</p><form class="wow-build-form" data-wow-build-finder><label>Class<select name="classId"><option value="all">Choose a class</option>${data.classes.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('')}</select></label><label>Playstyle<select name="playstyle">${data.playstyles.map(style => `<option value="${escapeHtml(style.id)}">${escapeHtml(style.label)}</option>`).join('')}</select></label><label>Current level<input name="level" type="number" min="1" max="60" value="1"></label><label>Preferred specialization<select name="specialization"><option value="all">Any specialization</option>${data.classes.flatMap(item => item.specializations.map(spec => `<option value="${escapeHtml(item.id)}:${escapeHtml(spec.id)}">${escapeHtml(item.name)} · ${escapeHtml(spec.name)}</option>`)).join('')}</select></label><label>Faction<select name="faction"><option value="all">Choose later</option><option>Alliance</option><option>Horde</option></select></label><label class="wow-hardcore"><input type="checkbox" disabled> Hardcore preference <small>Unavailable in this guide until its release status is verified.</small></label></form><div id="wow-build-results" aria-live="polite">${renderWowBuildResults(data, { classId: 'all', playstyle: 'solo-leveling', level: '1', specialization: 'all', faction: 'all' }, escapeHtml, catalog)}</div>`;
  if (route.view === 'wow-build-detail') {
    const { classRecord, specialization: spec } = route;
    body = classRecord.id === 'shaman' && spec.id === 'enhancement'
      ? renderEnhancementGuide(data, artworkManifest, escapeHtml, profile, catalog, guidedData)
      : renderSpecOverview(classRecord, spec, data, href, escapeHtml, artworkManifest, profile, catalog);
  }
  if (route.view === 'wow-talents') body = renderWowTalentPlanner(data,catalog,profile,route,escapeHtml,guidedData);
  if (route.view === 'wow-leveling') body = `<p class="wow-lede">Choose your faction, class and current level to narrow the confirmed zone directory and open a class-specific first-steps guide.</p><p class="wow-note">${escapeHtml(data.specialAccess)}</p><div class="wow-zone-filters"><label>Faction <select data-wow-faction-filter><option value="all">All factions</option><option${profile.faction === 'Alliance' ? ' selected' : ''}>Alliance</option><option${profile.faction === 'Horde' ? ' selected' : ''}>Horde</option></select></label><label>Class <select data-wow-class-filter><option value="">Choose class</option>${data.classes.map(item => `<option value="${escapeHtml(item.id)}"${profile.classId === item.id ? ' selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label><label>Current level <input data-wow-level-filter type="number" min="1" max="60" inputmode="numeric" value="${profile.currentLevel || ''}" placeholder="1–60"><small>Unknown level bands remain visible.</small></label></div><section class="wow-leveling-next" data-wow-leveling-next aria-live="polite">${data.classes.some(item => item.id === profile.classId) ? (() => { const selected = data.classes.find(item => item.id === profile.classId); return `<strong>${escapeHtml(selected.name)} · ${escapeHtml(selected.starterGuide.specialization)} · Level ${escapeHtml(String(profile.currentLevel || 1))}</strong><p>${escapeHtml(selected.starterGuide.zoneAdvice)}</p><a href="#game/world-of-warcraft/classes/${escapeHtml(selected.id)}">Open ${escapeHtml(selected.name)} first-steps guide →</a>`; })() : '<strong>Start here</strong><p>Pick your class to see its current leveling recommendation.</p>'}</section><div class="wow-zone-grid">${data.zones.map(zone => { const range = zone.range?.split(/[–-]/).map(Number); const zoneLevelMatch = !profile.currentLevel || !range || Number(profile.currentLevel) >= range[0] && Number(profile.currentLevel) <= range[1]; const zoneFactionMatch = !profile.faction || zone.faction === 'Both' || zone.faction === profile.faction; return `<article class="wow-zone" id="${escapeHtml(zone.id)}" data-wow-zone-card data-zone-faction="${escapeHtml(zone.faction)}"${zoneLevelMatch && zoneFactionMatch ? '' : ' hidden'}${range ? ` data-level-start="${range[0]}" data-level-end="${range[1]}"` : ''}>${(() => { const picture = artworkManifest?.records?.find(record => record.kind === 'zone' && record.zoneId === zone.id); return picture ? `<img src="${escapeHtml(picture.src)}" alt="${escapeHtml(picture.alt)}" loading="lazy" width="560" height="300">` : '<span class="wow-zone-art-fallback" aria-hidden="true">✦</span>'; })()}<div><h2>${escapeHtml(zone.name)}</h2>${zone.new ? '<span class="wow-tag">New in Forever</span>' : ''}</div><p>${zone.range ? `Levels ${escapeHtml(zone.range)}` : 'Level range not yet confirmed here'} · ${escapeHtml(zone.faction)}</p>${zone.access ? `<small>${escapeHtml(zone.access)}</small>` : ''}</article>`; }).join('')}</div>`;
  if (route.view === 'wow-tier-lists') body = `<p class="wow-lede">No launch rankings are published here yet. We’ll add class and specialization comparisons when version-specific evidence is available.</p><div class="wow-tier-grid">${data.tierCategories.map((category, index) => `<article><span>0${index + 1}</span><h2>${escapeHtml(category)}</h2><p>Rankings under review</p></article>`).join('')}</div>`;
  if (route.view === 'wow-dungeons') body = renderWowDungeons(data, escapeHtml);
  if (route.view.startsWith('wow-upcoming')) body = `<div class="wow-note"><h2>Guide in preparation</h2><p>This destination is active and ready for version-specific records. No guide data is published yet.</p></div>`;
  const wowNav = `<nav class="wow-nav" aria-label="World of Warcraft: Forever"><a href="#game/world-of-warcraft">Azeroth</a><a href="${href('my-journey')}">My Journey</a><a href="${href('classes')}">Classes</a><a href="${href('races')}">Races</a><a href="${href('build-finder')}">Find My Build</a><a href="${href('talent-planner')}">Talents</a><a href="${href('leveling')}">Leveling</a><a href="${href('dungeons-raids')}">Dungeons</a><a href="${href('tier-lists')}">Tier Lists</a></nav>`;
  return `<div class="wow-page">${route.view === 'wow-home' ? '' : scene}${route.view === 'wow-home' ? body : `<section class="wow-banner"><p class="wow-eyebrow">BM Gaming Wiki <span>✦</span> World of Warcraft: Forever</p><h1 id="page-title" tabindex="-1">${escapeHtml(title)}</h1><p>Explore a reimagined original Azeroth, one well-prepared adventure at a time.</p>${wowNav}</section><section class="wow-content"><a class="wow-back" href="#game/world-of-warcraft">← WoW: Forever</a><h2>${escapeHtml(title)}</h2>${body}</section>`}</div>`;
}

function renderSpecOverview(classRecord, spec, data, href, escapeHtml, artworkManifest, profile = {}, catalog = null) {
  const specSource = data.sources.find(entry => entry.id === spec.sourceId);
  const guide = classRecord.starterGuide;
  const supportsBuild = guide?.specialization === spec.name;
  const levelingSource = data.sources.find(entry => entry.id === guide?.sourceId);
  const art = artworkManifest?.records?.find(record => record.kind === 'specialization' && record.classId === classRecord.id && record.specializationId === spec.id)
    || artworkManifest?.records?.find(record => record.kind === 'class' && record.classId === classRecord.id)
    || artworkManifest?.records?.find(record => record.classId === classRecord.id);
  const specTree = catalog?.classes?.find(item => item.id === classRecord.id)?.trees.find(tree => tree.name === spec.name);
  const specializationIcon = renderWowIcon(specTree?.icon || '', `${spec.name} talent-tree icon`, escapeHtml, 'wow-specialization-icon');
  const milestones = classRecord.id === 'shaman' && spec.id === 'enhancement'
    ? data.enhancementGuide.talentMilestones.map(item => `<li><strong>Level ${item.level} · ${escapeHtml(item.name)}</strong><span>${escapeHtml(item.note)}</span></li>`).join('')
    : (supportsBuild ? guide.talentPriorities : []).map(name => `<li>${escapeHtml(name)}</li>`).join('');
  const fightList = supportsBuild ? guide.combat.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '';
  const profileLevel = Number(profile.currentLevel) || 1;
  const nextMilestone = classRecord.id === 'shaman' && spec.id === 'enhancement' ? data.enhancementGuide.talentMilestones.find(item => item.level >= profileLevel) : null;
  const compactTalent = nextMilestone ? `Next listed milestone: level ${nextMilestone.level}, ${nextMilestone.name}.` : supportsBuild && guide.talentPriorities.length ? `Talent priorities: ${guide.talentPriorities.join(', ')}. No next-point level is recorded.` : 'No level-specific talent recommendation is recorded for this specialization.';
  const compactCombat = supportsBuild ? guide.combat.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '<li>No spec-specific combat priority is verified for this path yet.</li>';
  const emblem = renderClassEmblem(classRecord.id,catalog,escapeHtml,'wow-class-emblem-large');
  const supportedGuide = classRecord.id === 'shaman' && spec.id === 'enhancement';
  const talentAction = `<a class="wow-build-primary-action" href="#game/world-of-warcraft/talent-planner" data-wow-build-class="${escapeHtml(classRecord.id)}" data-wow-build-spec="${escapeHtml(spec.id)}"${supportedGuide ? ' data-wow-build-id="bm-shaman-enhancement-solo-10-30"' : ''}>${supportedGuide ? 'Follow Leveling Build' : 'Open Manual Talent Planner'} <span aria-hidden="true">→</span></a>`;
  return `<article class="wow-build-page" style="--class-accent:${escapeHtml(classRecord.color)}"><header class="wow-build-hero" data-specialization="${escapeHtml(spec.id)}">${art ? `<div class="wow-build-art-panel"><img class="wow-build-artwork" src="${escapeHtml(art.src)}" alt="${escapeHtml(art.alt)}" width="1120" height="640"></div>` : '<div class="wow-build-art-panel wow-build-art-fallback" aria-hidden="true">✦</div>'}<div class="wow-build-heading"><div class="wow-build-emblems">${emblem}${specializationIcon}</div><p class="wow-eyebrow">${escapeHtml(classRecord.name)} · ${escapeHtml(spec.role)} · Forever</p><h3>${escapeHtml(spec.name)}</h3><p>${escapeHtml(spec.focus)}</p><span>Recommended for leveling: ${escapeHtml(guide?.specialization || 'No recommendation recorded')}</span>${talentAction}</div></header><div class="wow-build-controls"><a href="#game/world-of-warcraft/classes/${escapeHtml(classRecord.id)}">← ${escapeHtml(classRecord.name)} guide</a><button type="button" data-wow-play-mode-toggle aria-expanded="false">Switch to Play Mode</button><a href="#game/world-of-warcraft/talent-planner">Open talent planner →</a>${levelingSource ? `<a href="${escapeHtml(levelingSource.url)}" target="_blank" rel="noreferrer">Full Forever leveling reference ↗</a>` : ''}</div><section class="wow-play-mode" data-wow-play-mode hidden><p class="wow-eyebrow">Second monitor · Level ${profileLevel}</p><h4>${escapeHtml(classRecord.name)} · ${escapeHtml(spec.name)}</h4><p>${escapeHtml(compactTalent)}</p><ul>${compactCombat}</ul><p><strong>Destination:</strong> ${escapeHtml(guide?.zoneAdvice || 'No spec-matched leveling route is recorded.')}</p><a href="#game/world-of-warcraft/my-journey">Open My Azeroth Journey →</a></section><div data-wow-full-guide><div class="wow-build-columns"><section><h4>Who this path suits</h4><p>${supportsBuild ? escapeHtml(guide.reason) : `The current Forever class record describes ${escapeHtml(spec.focus.toLowerCase())}. A spec-specific leveling rotation is not yet recorded locally.`}</p><h4>Strengths</h4>${renderBullets(supportsBuild ? classRecord.strengths : [spec.focus], escapeHtml)}<h4>Limitations</h4>${renderBullets(classRecord.limitations, escapeHtml)}</section><section><h4>Talent progression</h4>${milestones ? `<ul class="wow-build-milestones">${milestones}</ul>` : '<p>No point-by-point allocation is asserted. Follow the linked Forever guide before assigning talents.</p>'}<h4>Combat priority</h4>${fightList ? `<ol>${fightList}</ol>` : '<p>This route currently has a specialization overview only; no rotation is inferred from another game version.</p>'}</section><section><h4>Gear and pacing</h4><p>${supportsBuild ? escapeHtml(guide.gear) : 'Use current, level-appropriate equipment; no specialization-specific stat order is stored for this path.'}</p><h4>Resource reminder</h4><p>${supportsBuild ? escapeHtml(guide.resource) : 'See the class overview and source guide for verified resource advice.'}</p></section></div>${renderRelatedGuides(classRecord,spec,artworkManifest,catalog,escapeHtml)}<p class="wow-source-link">${specSource ? `<a href="${escapeHtml(specSource.url)}" target="_blank" rel="noreferrer">${escapeHtml(specSource.title)} ↗</a>` : ''}${levelingSource ? ` · <a href="${escapeHtml(levelingSource.url)}" target="_blank" rel="noreferrer">${escapeHtml(levelingSource.title)} ↗</a>` : ''}</p></div></article>`;
}

function renderEnhancementGuide(data, artworkManifest, escapeHtml, profile = {}, catalog = null, guidedData = null) {
  const guide = data.enhancementGuide;
  const enhancementTreeIcon = catalog?.classes?.find(item => item.id === 'shaman')?.trees.find(tree => tree.name === 'Enhancement')?.icon || '';
  const sourceById = id => data.sources.find(source => source.id === id);
  const art = artworkManifest?.records?.find(item => item.id === guide.artworkId);
  const image = art?.src || '';
  const ability = name => {
    const image = catalog?.classAbilities?.shaman?.find(item => item.name === name)?.icon || catalog?.classes?.find(item => item.id === 'shaman')?.trees?.flatMap(tree => tree.talents).find(item => item.name === name)?.icon;
    return `<span class="enhancement-ability">${image ? renderWowIcon(image, `${name} game icon`, escapeHtml, 'wow-ability-icon') : `<span class="wow-icon-fallback" aria-hidden="true">${escapeHtml(name.split(/\s+/).map(word => word[0]).join('').slice(0, 2))}</span>`}<strong>${escapeHtml(name)}</strong></span>`;
  };
  const list = items => `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  const sourceLink = id => {
    const source = sourceById(id);
    return source ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>` : '';
  };
  const sourceIds = [...new Set(guide.sourceIds)];
  const currentLevel = Number(profile.currentLevel) || 1;
  const automaticBuild = guidedData?.builds?.find(item => item.classId === 'shaman' && item.specializationId === 'enhancement');
  const automaticState = automaticBuild && catalog ? resolveWowGuidedBuild(automaticBuild, catalog, currentLevel) : null;
  const automaticTalentById = new Map(catalog?.classes?.find(item => item.id === 'shaman')?.trees.flatMap(tree => tree.talents).map(item => [item.id, item]) || []);
  const automaticDistribution = automaticBuild && automaticState?.valid
    ? catalog.classes.find(item => item.id === 'shaman').trees.map(tree => `${tree.name} ${tree.talents.reduce((sum, talent) => sum + (Number(automaticState.allocation[talent.id]) || 0), 0)}`).join(' · ')
    : 'No complete automatic route is loaded for this level.';
  const automaticNextTalent = automaticState?.nextChange ? automaticTalentById.get(automaticState.nextChange.talentId) : null;
  const quickTalentIcons = guide.additionalTalents.slice(0, 4).map(name => ability(name)).join('');
  const nextTalent = guide.talentMilestones.find(item => item.kind === 'talent' && item.level >= currentLevel);
  const currentDungeon = (data.dungeons || []).find(item => currentLevel >= item.minLevel && currentLevel <= item.maxLevel);
  const nextDungeon = (data.dungeons || []).filter(item => item.minLevel > currentLevel).sort((a,b) => a.minLevel-b.minLevel)[0];
  const milestoneRows = guide.talentMilestones.map(item => `<tr data-enhancement-milestone="${item.level}" data-milestone-name="${escapeHtml(item.name)}"><td><strong>${item.level}</strong></td><td>${ability(item.name)}<small>${item.kind === 'ability' ? 'Ability unlock' : 'Talent recommendation'}</small></td><td>${escapeHtml(item.note)}</td><td>Rank not specified in the source text</td></tr>`).join('');
  const questCards = guide.quests.map(quest => `<article class="enhancement-quest-card"><span>${quest.level ? `Level ${quest.level}` : 'Milestone quest'}</span><h3>${escapeHtml(quest.name)}</h3><p>${escapeHtml(quest.reward)}</p><small>${escapeHtml(quest.note)}</small></article>`).join('');
  const factionCards = Object.entries(guide.factionAreas).map(([faction, areas]) => `<article><h3>${escapeHtml(faction)} route areas</h3><p>${escapeHtml(areas.join(' · '))}</p><small>No level bands are assigned here; see the level-sensitive source route.</small></article>`).join('');
  const dungeonCards = Object.entries(guide.dungeons).map(([faction, dungeons]) => `<article><h3>${escapeHtml(faction)} dungeon opportunities</h3><ul>${dungeons.map(name => `<li>${escapeHtml(name)}</li>`).join('')}</ul><small>These dungeons appear in the source’s faction/level guide; confirm current level and access in its live slider.</small></article>`).join('');
  const buildCards = guide.level60Builds.map(build => `<article class="enhancement-build-card"><p class="wow-eyebrow">${build.status === 'provisional' ? 'Provisional · Level 60' : escapeHtml(build.status)}</p><h3>${escapeHtml(build.name)}</h3><p>${escapeHtml(build.summary)}</p><p class="enhancement-build-mode">For: ${escapeHtml(build.modes.join(' · '))}</p><details><summary>Talent trade-offs</summary>${list(build.alternatives)}</details></article>`).join('');
  const artMarkup = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(art.alt)}" width="1120" height="640" fetchpriority="high">`
    : `<div class="enhancement-art-fallback" role="img" aria-label="Storm-lit mountain and totem illustration unavailable"><span aria-hidden="true">✦</span></div>`;
  return `<article class="enhancement-guide" style="--class-accent:#73a8da">
    <header class="enhancement-hero"><figure class="enhancement-artwork">${artMarkup}<figcaption>${image ? 'Original BM Gaming Wiki artwork · not in-game art' : 'Illustration fallback'}</figcaption></figure><div class="enhancement-hero-copy"><div class="wow-build-emblems">${renderClassEmblem('shaman',catalog,escapeHtml,'wow-class-emblem-large')}${renderWowIcon(enhancementTreeIcon,'Enhancement talent-tree icon',escapeHtml,'wow-specialization-icon')}</div><p class="wow-eyebrow">Shaman · Melee damage · WoW: Forever</p><h2>Enhancement</h2><p>Fight in melee with weapon strikes and Shock spells. Stormstrike anchors the rotation; totems bring useful buffs to the party. Mana is your limiting resource, so spend it where it changes the fight.</p><div class="enhancement-hero-facts"><span>High burst</span><span>Totem utility</span><span>Mana hungry</span></div><div class="enhancement-hero-actions"><a class="wow-build-primary-action" href="#game/world-of-warcraft/talent-planner" data-wow-build-class="shaman" data-wow-build-spec="enhancement" data-wow-build-id="bm-shaman-enhancement-solo-10-30">Follow Leveling Build <span aria-hidden="true">→</span></a><a class="wow-source-pill" href="#enhancement-leveling">Start leveling ↓</a><a class="wow-source-pill" href="${escapeHtml(sourceById('icy-enhancement-guide')?.url || '#')}" target="_blank" rel="noreferrer">Guide updated ${escapeHtml(guide.updateDate)} · Icy Veins ↗</a></div></div></header>
    <section class="enhancement-quick-reference" aria-labelledby="enhancement-quick-title"><p class="wow-eyebrow">Second-monitor reference</p><h3 id="enhancement-quick-title">Enhancement at a glance</h3><div><article><strong>Before a pull</strong><p>Rockbiter before level 30; Windfury Weapon after 30. Apply Lightning Shield between pulls.</p></article><article><strong>In combat</strong><p>Stormstrike when available, then use Shocks as needed. Let weapon swings finish low-health enemies to preserve Mana.</p></article><article><strong>Remember</strong><p>Any Mana spend pauses Spirit regeneration for five seconds. Avoid unnecessary casts when the target is nearly down.</p></article></div></section><div class="enhancement-mode-control"><span>Saved character level: ${currentLevel}</span><button type="button" data-wow-play-mode-toggle aria-expanded="false">Switch to Play Mode</button></div><section class="enhancement-play-mode" data-wow-play-mode hidden><p class="wow-eyebrow">${renderClassEmblem('shaman',catalog,escapeHtml)} Live reference · Level ${currentLevel}</p><h3>Enhancement Shaman</h3><p><strong>Next recommended talent:</strong> ${automaticNextTalent ? `Level ${automaticState.nextChange.level} · ${escapeHtml(automaticNextTalent.name)}` : 'No later allocation is documented in this route.'}</p><p><strong>Current allocation:</strong> ${escapeHtml(automaticDistribution)} · ${automaticState?.total || 0} points</p><div class="wow-ability-row">${quickTalentIcons}</div><p><strong>Fight:</strong> Stormstrike on cooldown after level 25; use Shocks deliberately and let auto-attacks finish low-health targets.</p><p><strong>Questing:</strong> ${escapeHtml(profile.currentZone ? (data.zones.find(zone => zone.id === profile.currentZone)?.name || 'Current region') : guide.factionAreas.Alliance[0] + ' (Alliance) · ' + guide.factionAreas.Horde[0] + ' (Horde)')}</p><p><strong>Dungeon:</strong> ${escapeHtml(currentDungeon?.name || nextDungeon ? `${(currentDungeon || nextDungeon).name} · levels ${(currentDungeon || nextDungeon).minLevel}–${(currentDungeon || nextDungeon).maxLevel}` : 'No level-matched dungeon range recorded.')}</p><a href="#game/world-of-warcraft/my-journey">Open My Azeroth Journey →</a></section><div data-wow-full-guide><nav class="enhancement-section-nav" aria-label="Enhancement guide sections"><a href="#enhancement-leveling">Leveling</a><a href="#enhancement-talents">Talent milestones</a><a href="#enhancement-combat">Combat</a><a href="#enhancement-utility">Totems & utility</a><a href="#enhancement-gear">Gear</a><a href="#enhancement-quests">Class quests</a><a href="#enhancement-routes">Areas & dungeons</a><a href="#enhancement-level60">Level 60</a></nav>
    <section class="enhancement-section" aria-labelledby="enhancement-at-glance"><div class="enhancement-heading"><p class="wow-eyebrow">At a glance</p><h3 id="enhancement-at-glance">A strong toolkit with a real Mana budget</h3></div><div class="enhancement-pro-con"><article><h4>What works well</h4>${list(guide.strengths)}</article><article><h4>Plan around</h4>${list(guide.weaknesses)}</article></div></section>
    <section id="enhancement-leveling" class="enhancement-section" aria-labelledby="enhancement-leveling-title"><div class="enhancement-heading"><p class="wow-eyebrow">Solo leveling</p><h3 id="enhancement-leveling-title">Build toward Stormstrike, protect your Mana</h3></div><div class="enhancement-level-control"><label for="enhancement-level">Your level</label><input id="enhancement-level" data-enhancement-level type="range" min="1" max="60" value="10"><output for="enhancement-level" data-enhancement-level-output>10</output><span id="enhancement-level-status" aria-live="polite">At level 10. Next listed milestone: level 20, Shamanistic Focus.</span></div><div class="enhancement-timeline"><article><span>Levels 1–19</span><h4>Spend carefully</h4><p>Use Rockbiter Weapon before level 30, keep Lightning Shield active between pulls, and let auto-attacks finish low-health enemies instead of spending Mana on overkill.</p></article><article><span>Levels 20–29</span><h4>Reach Stormstrike</h4><p>Shamanistic Focus is a level 20 recommendation. Stormstrike becomes available around level 25; the source describes an optional respec to reach it.</p></article><article><span>Levels 30–41</span><h4>Gain sustain and mobility</h4><p>Windfury Weapon unlocks at 30. Improved Stormstrike adds Mana sustain and reset opportunities; the guide later pivots to Restoration for Mindfulness.</p></article><article><span>Level 42+</span><h4>Continue the sustain path</h4><p>Water Shield is listed at 42. Save deeper Enhancement investments until these resource tools are in place.</p></article></div></section>
    <section id="enhancement-talents" class="enhancement-section" aria-labelledby="enhancement-talents-title"><div class="enhancement-heading"><p class="wow-eyebrow">Level-based picks</p><h3 id="enhancement-talents-title">Talent milestones</h3><p>${escapeHtml(guide.talentRankDisclosure)}</p></div><div class="enhancement-table-wrap"><table class="enhancement-talent-table"><thead><tr><th>Level</th><th>Talent / unlock</th><th>Why the guide picks it</th><th>Rank</th></tr></thead><tbody>${milestoneRows}</tbody></table></div><p class="wow-note">Other talents the guides discuss: ${guide.additionalTalents.map(name => ability(name)).join(' ')}</p><p class="enhancement-source-line">${sourceLink('icy-enhancement-leveling')} · ${sourceLink('icy-enhancement-talents')}</p></section>
    <section id="enhancement-combat" class="enhancement-section" aria-labelledby="enhancement-combat-title"><div class="enhancement-heading"><p class="wow-eyebrow">Live combat reference</p><h3 id="enhancement-combat-title">Prepare, then follow the priority</h3></div><article class="enhancement-rotation-card"><h4>Before combat</h4>${list(guide.precombat)}</article><div class="enhancement-rotation-grid">${guide.levelingRotation.map(group => `<article class="enhancement-rotation-card"><h4>${escapeHtml(group.title)}</h4>${list(group.items)}</article>`).join('')}</div><p class="enhancement-source-line">Leveling priorities: ${sourceLink('icy-enhancement-leveling')}</p></section>
    <section class="enhancement-section" aria-labelledby="enhancement-endgame-rotation"><div class="enhancement-heading"><p class="wow-eyebrow">Only after acquiring these talents</p><h3 id="enhancement-endgame-rotation">Level 60 priority reference</h3><p class="enhancement-provisional-label">Provisional · the source notes level-60 choices were not tested in beta.</p></div><div class="enhancement-rotation-grid"><article class="enhancement-rotation-card"><h4>Single target</h4>${list(guide.singleTargetRotation)}</article><article class="enhancement-rotation-card"><h4>Area damage</h4>${list(guide.aoeRotation)}</article></div><p class="enhancement-source-line">${sourceLink('icy-enhancement-rotation')}</p></section>
    <section id="enhancement-utility" class="enhancement-section" aria-labelledby="enhancement-utility-title"><div class="enhancement-heading"><p class="wow-eyebrow">Group contribution & survival</p><h3 id="enhancement-utility-title">Choose totems for the situation</h3></div><div class="enhancement-utility-grid">${guide.utility.map(item => `<article><span class="enhancement-rune" aria-hidden="true">✦</span><p>${escapeHtml(item)}</p></article>`).join('')}</div></section>
    <section id="enhancement-gear" class="enhancement-section" aria-labelledby="enhancement-gear-title"><div class="enhancement-heading"><p class="wow-eyebrow">Keep your weapon current</p><h3 id="enhancement-gear-title">Leveling stat guide</h3></div><ol class="enhancement-stat-list">${guide.levelingStats.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol><p class="enhancement-provisional-label">Level-60 stat ordering is speculative because the source reports incomplete beta gear data.</p><p>${guide.endgameStats.map(escapeHtml).join(' · ')}</p><p class="enhancement-source-line">${sourceLink('icy-enhancement-stats')}</p></section>
    <section id="enhancement-quests" class="enhancement-section" aria-labelledby="enhancement-quests-title"><div class="enhancement-heading"><p class="wow-eyebrow">Class milestones</p><h3 id="enhancement-quests-title">Shaman totem quests</h3><p>Race-specific chains differ. The level 4 Call of Earth route details shown by Icy Veins are for Dwarf Shamans.</p></div><div class="enhancement-quest-grid">${questCards}</div><p class="enhancement-source-line">${sourceLink('icy-shaman-quests')}</p></section>
    <section id="enhancement-routes" class="enhancement-section" aria-labelledby="enhancement-routes-title"><div class="enhancement-heading"><p class="wow-eyebrow">Where to go</p><h3 id="enhancement-routes-title">Faction areas and dungeon options</h3><p>${escapeHtml(guide.levelRangeDisclosure)}</p></div><div class="enhancement-route-grid">${factionCards}${dungeonCards}</div><p class="enhancement-source-line">${sourceLink('icy-enhancement-leveling')}</p></section>
    <section id="enhancement-level60" class="enhancement-section" aria-labelledby="enhancement-level60-title"><div class="enhancement-heading"><p class="wow-eyebrow">Theorycrafting · provisional</p><h3 id="enhancement-level60-title">Two level-60 paths from the current guide</h3><p>${escapeHtml(guide.endgameDisclosure)}</p></div><div class="enhancement-build-grid">${buildCards}</div><p class="enhancement-source-line">${sourceLink('icy-enhancement-talents')}</p></section>
    <details class="enhancement-sources"><summary>Sources and update notes</summary><ul>${sourceIds.map(id => { const source = sourceById(id); return source ? `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a> · updated ${escapeHtml(source.updatedDate)} · ${escapeHtml(source.status)}</li>` : ''; }).join('')}</ul></details>
    ${renderRelatedGuides(data.classes.find(item => item.id === 'shaman'),{ id: 'enhancement', name: 'Enhancement' },artworkManifest,catalog,escapeHtml)}</div>
  </article>`;
}

function renderBullets(items, escapeHtml, emptyText = 'No verified notes are available yet.') {
  return items?.length ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : `<p class="wow-unavailable">${escapeHtml(emptyText)}</p>`;
}

export function renderWowBuildResults(data, selections, escapeHtml, catalog = null) {
  const classRecord = data.classes.find(item => item.id === selections.classId);
  if (!classRecord) return `<p class="wow-note">Choose a class to see its sourced specialization paths. ${escapeHtml(data.buildProfileNote)}</p>`;
  const playstyleRoles = { 'dungeon-dps': 'Damage', 'dungeon-tank': 'Tank', 'dungeon-healer': 'Healing' };
  const roleFilter = playstyleRoles[selections.playstyle];
  const specs = classRecord.specializations.filter(spec => (!roleFilter || spec.role.split(' / ').includes(roleFilter)) && (selections.specialization === 'all' || selections.specialization === `${classRecord.id}:${spec.id}`));
  if (!specs.length) return `<p class="wow-note">No specialization for ${escapeHtml(classRecord.name)} is recorded for this role. Check another path or class.</p>`;
  const levelNote = selections.level ? ` At level ${escapeHtml(selections.level)}, no level-specific talent budget or unlock has been confirmed for this path.` : '';
  const races = selections.faction && selections.faction !== 'all' ? Object.entries(data.raceCombinations?.[selections.faction] || {}).filter(([, classes]) => classes.includes(classRecord.name)).map(([race]) => race) : [];
  const factionNote = races.length ? `<p class="wow-build-faction">${escapeHtml(selections.faction)} races with ${escapeHtml(classRecord.name)}: ${escapeHtml(races.join(', '))}.</p>` : '';
  const playstyleNote = roleFilter ? `These paths are documented for the ${escapeHtml(roleFilter.toLowerCase())} role. They are not complete talent builds.` : `No evidence-backed build mapping is recorded for the selected playstyle yet. Compare the class's documented paths below; they are not presented as matches.`;
  return `<p class="wow-note">No complete verified loadout matches these selections yet. ${playstyleNote}${levelNote}</p>${factionNote}<div class="wow-spec-grid">${specs.map(spec => `<a class="wow-spec-card" href="#game/world-of-warcraft/builds/${escapeHtml(classRecord.id)}/${escapeHtml(spec.id)}">${renderClassEmblem(classRecord.id,catalog,escapeHtml)}<span>${escapeHtml(spec.role)}</span><h3>${escapeHtml(spec.name)}</h3><p>${escapeHtml(spec.focus)}</p><small>Review path details →</small></a>`).join('')}</div>`;
}

export function matchesWowZoneFilters(zone, faction, level) {
  if (faction !== 'all' && zone.faction !== 'Both' && zone.faction !== faction) return false;
  const requestedLevel = Number(level);
  if (level && Number.isFinite(requestedLevel) && zone.range) {
    const [minimum, maximum] = zone.range.split(/[–-]/).map(Number);
    if (requestedLevel < minimum || requestedLevel > maximum) return false;
  }
  return true;
}
