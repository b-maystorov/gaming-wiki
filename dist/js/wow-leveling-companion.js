import { WOW_GOLD_FARMING_METHODS, WOW_GOLD_LEVEL_SUGGESTIONS, WOW_GOLD_OTHER_TIPS } from '../data/games/wow-forever-gold-farming.js';

const COMPANION_TABS = ['overview', 'stats', 'talents', 'combat', 'gear', 'leveling', 'dungeons', 'professions', 'gold-farming'];
const WARRIOR_ONLY_TABS = new Set(['combat', 'dungeons']);
const COMPANION_TAB_LABELS = { overview: 'Overview', stats: 'Stats', talents: 'Talents', combat: 'Combat', gear: 'Weapons & Gear', leveling: 'Leveling', dungeons: 'Dungeons', professions: 'Professions', 'gold-farming': 'Gold Farming' };
const COMPANION_STORAGE_PREFIX = 'bm-wow-leveling-companion-v1:';
export const WARRIOR_CHECKLIST_STORAGE_KEY = 'bm-warrior-leveling-checklist-v1';
const WARRIOR_CHECKLIST_CATEGORIES = ['class-quest', 'ability', 'talent', 'equipment', 'dungeon'];
export const WARRIOR_DUNGEON_PROGRESS_STORAGE_KEY = 'bm-warrior-dungeon-prep-v1';

function companionStorageKey(classId, specializationId = '') {
  return classId === 'shaman' && specializationId
    ? `${COMPANION_STORAGE_PREFIX}${classId}:${specializationId}`
    : `${COMPANION_STORAGE_PREFIX}${classId}`;
}

function tabsForClass(classId) {
  return COMPANION_TABS.filter(tab => !WARRIOR_ONLY_TABS.has(tab) || ['warrior', 'shaman'].includes(classId));
}

export function loadWarriorChecklistProgress(storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage)?.getItem(WARRIOR_CHECKLIST_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];
  } catch { return []; }
}

export function saveWarriorChecklistProgress(progress, storage) {
  try {
    (storage ?? globalThis.localStorage)?.setItem(WARRIOR_CHECKLIST_STORAGE_KEY, JSON.stringify([...new Set(progress.filter(id => typeof id === 'string'))]));
    return true;
  } catch { return false; }
}

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
    tab: tabsForClass(classId).includes(state.tab) ? state.tab : 'overview',
    selectedTalentId: typeof state.selectedTalentId === 'string' ? state.selectedTalentId : '',
    faction: state.faction === 'Horde' ? 'Horde' : 'Alliance'
  };
}

export function updateCompanionState(classId, state, change, specializations = []) {
  return normalizeCompanionState(classId, { ...state, ...change }, specializations);
}

export function loadCompanionState(classId, fallback = {}, specializations = [], storage, preferRememberedSpecialization = true) {
  let initial = normalizeCompanionState(classId, fallback, specializations);
  try {
    const store = storage ?? globalThis.localStorage;
    const baseKey = companionStorageKey(classId);
    const baseValue = classId === 'shaman' ? store?.getItem(baseKey) : null;
    const baseState = JSON.parse(baseValue || 'null');
    if (classId === 'shaman' && preferRememberedSpecialization && specIds(specializations).includes(baseState?.specializationId)) {
      initial = normalizeCompanionState(classId, { ...initial, specializationId: baseState.specializationId }, specializations);
    }
    const specializationValue = store?.getItem(companionStorageKey(classId, initial.specializationId));
    const savedValue = specializationValue || (classId === 'shaman' && (!baseState || baseState.specializationId === initial.specializationId) ? baseValue : null)
      || (classId !== 'shaman' ? store?.getItem(baseKey) : null);
    const saved = JSON.parse(savedValue || 'null');
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
    const value = JSON.stringify({
      level: validLevel(state.level),
      specializationId: state.specializationId,
      tab: tabsForClass(state.classId).includes(state.tab) ? state.tab : 'overview',
      faction: state.faction === 'Horde' ? 'Horde' : 'Alliance',
    });
    store.setItem(companionStorageKey(state.classId, state.specializationId), value);
    if (state.classId === 'shaman') store.setItem(companionStorageKey(state.classId), value);
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

function buildWarriorLevelingData(state, guideData, tabContent) {
  const faction = state.faction === 'Horde' ? 'Horde' : 'Alliance';
  const reference = guideData.warriorLeveling || {};
  const zones = (reference.zones || []).filter(zone => zone.faction === faction || zone.faction === 'Contested' || zone.faction === 'Both');
  const currentZones = zones.filter(zone => rangesOverlap(state.level, zone.minLevel, zone.maxLevel));
  const upcomingZones = zones.filter(zone => Number(zone.minLevel) > state.level)
    .sort((left, right) => left.minLevel - right.minLevel || left.name.localeCompare(right.name)).slice(0, 4);
  const dungeons = (reference.dungeons || []).filter(dungeon => rangesOverlap(state.level, dungeon.minLevel, dungeon.maxLevel));
  // The existing Arms guide contains the shared class unlocks; specialization-only build milestones are added separately.
  const recordedMilestones = tabContent?.milestones?.length
    ? tabContent.milestones
    : guideData.classRecord?.specializationGuides?.arms?.sections?.leveling?.milestones || [];
  const milestones = recordedMilestones.filter(milestone => Number.isFinite(Number(milestone.level)));
  const specializationGuidance = reference.specializationGuidance?.[state.specializationId] || null;
  const specializationMilestones = reference.specializationMilestones?.[state.specializationId] || [];
  const questMilestones = (reference.questMilestones || []).filter(item =>
    (item.faction === faction || item.faction === 'Both')
    && (!item.specializations || item.specializations.includes(state.specializationId))
    && !(reference.classQuests || []).some(quest => (quest.id === item.id || quest.checklistId === item.id)
      && quest.specializations && !quest.specializations.includes(state.specializationId))
  );
  const classQuests = (reference.classQuests || []).filter(item =>
    item.factions?.includes(faction)
    && (!item.specializations || item.specializations.includes(state.specializationId))
  );
  const unknownNames = [...new Set((tabContent?.zones?.[faction] || []).filter(name => !(reference.zones || []).some(zone => zone.name === name)))];
  return {
    faction,
    level: state.level,
    specializationId: state.specializationId,
    specializationGuidance,
    specializationMilestones,
    preparationTips: reference.preparationTips || null,
    questMilestones,
    classQuests,
    currentZones,
    upcomingZones,
    dungeons,
    milestones,
    checklistTasks: buildWarriorChecklistTasks(milestones, reference, faction, state.specializationId, specializationMilestones, questMilestones, classQuests),
    unknownNames,
    sourceIds: [...new Set([...(reference.sourceIds || []), ...(reference.dungeonSourceIds || []), ...(specializationGuidance?.sourceIds || []), ...(reference.preparationTips?.sourceIds || []), ...specializationMilestones.flatMap(item => item.sourceIds || []), ...questMilestones.flatMap(item => item.sourceIds || []), ...classQuests.flatMap(item => item.sourceIds || [])])]
  };
}

function buildWarriorChecklistTasks(milestones, reference, faction = 'Alliance', specializationId = 'arms', specializationMilestones = [], questMilestones = [], classQuests = []) {
  const tasks = milestones.flatMap(item => {
    if (item.kind === 'Training and build milestone') {
      const buildMilestone = specializationMilestones.find(candidate => Number(candidate.level) === Number(item.level));
      return [
      { id: `milestone-${item.level}-equipment`, level: Number(item.level), category: 'equipment', title: `Level ${item.level} · Equipment training`, text: 'Plate Armor training and 60% mount availability.' },
      ...(specializationId === 'arms' ? [{ id: `milestone-${item.level}-talent`, level: Number(item.level), category: 'talent', title: `Level ${item.level} · ${buildMilestone?.title || 'Arms build milestone'}`, text: buildMilestone?.text || 'Mortal Strike is a milestone in the cited Arms leveling build.' }] : [])
      ];
    }
    const questDetail = item.kind === 'Class quest'
      ? questMilestones.find(candidate => Number(candidate.level) === Number(item.level))?.text
      : '';
    return [{
      id: `milestone-${item.level}-${item.kind.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      level: Number(item.level), category: item.kind === 'Class quest' ? 'class-quest'
        : item.kind.toLowerCase().includes('talent') || item.kind.toLowerCase().includes('build') ? 'talent' : 'ability',
      title: `Level ${item.level} · ${item.kind}`, text: [item.text, questDetail].filter(Boolean).join(' ')
    }];
  });
  tasks.push({ id: 'weapon-training-reminder', level: 1, category: 'equipment', title: 'Level 1+ · Keep your weapon skill trained', text: 'Compare upgrades with your equipped weapon; no level-specific weapon weights are recorded.' });
  if (specializationId === 'fury') tasks.push({ id: 'dual-wield-training', level: 20, category: 'equipment', title: 'Level 20 · Train Dual Wield', text: 'The Warrior starter guide records Dual Wield training at level 20; maintain both weapon skills afterward.' });
  tasks.push(...specializationMilestones.filter(item => !(specializationId === 'arms' && item.id === 'arms-mortal-strike')).map(item => ({
    id: `milestone-${item.id}`, level: Number(item.level), category: /talent/i.test(item.title) ? 'talent' : 'ability',
    title: `Level ${item.level} · ${item.title}`, text: item.text
  })));
  tasks.push(...questMilestones.filter(item => ![10, 30].includes(Number(item.level))).map(item => ({
    id: item.id, level: Number(item.level), category: 'class-quest', title: `Level ${item.level} · ${item.title}`, text: item.text
  })));
  for (const quest of classQuests) {
    const existing = tasks.find(task => task.id === quest.checklistId);
    if (existing) existing.classQuest = quest;
    else tasks.push({
      id: quest.checklistId || quest.id, level: Number(quest.requiredLevel), category: 'class-quest',
      title: `Level ${quest.requiredLevel} · ${quest.title}`, text: quest.objectives, classQuest: quest
    });
  }
  for (const dungeon of reference.dungeons || []) tasks.push({
    id: `dungeon-${dungeon.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    level: Number(dungeon.minLevel), maxLevel: Number(dungeon.maxLevel), category: 'dungeon', title: dungeon.name,
    text: `Recorded opportunity range: levels ${dungeon.minLevel}–${dungeon.maxLevel}.`
  });
  return tasks.filter(task => Number.isFinite(task.level) && WARRIOR_CHECKLIST_CATEGORIES.includes(task.category));
}

export function groupWarriorChecklistTasks(tasks, level, progress, filter = 'all') {
  const selected = new Set(progress);
  const groups = { available: [], upcoming: [], completed: [] };
  const nearbyDungeons = tasks.filter(task => task.category === 'dungeon' && task.maxLevel >= level);
  const dungeonIds = new Set([
    ...nearbyDungeons.filter(task => task.level <= level).map(task => task.id),
    ...nearbyDungeons.filter(task => task.level > level).sort((a, b) => a.level - b.level).slice(0, 4).map(task => task.id),
    ...tasks.filter(task => task.category === 'dungeon' && selected.has(task.id)).map(task => task.id)
  ]);
  for (const task of tasks) {
    if (filter !== 'all' && task.category !== filter) continue;
    if (task.category === 'dungeon' && !dungeonIds.has(task.id)) continue;
    if (selected.has(task.id) || (task.maxLevel != null && task.maxLevel < level) || (task.maxLevel == null && task.level < level)) {
      if (task.category !== 'dungeon' || selected.has(task.id)) groups.completed.push(task);
    }
    else if (task.level > level) groups.upcoming.push(task);
    else groups.available.push(task);
  }
  return groups;
}

export function calculateWarriorChecklistProgress(tasks, progress) {
  const completedIds = new Set(progress);
  const completed = tasks.reduce((count, task) => count + Number(completedIds.has(task.id)), 0);
  return { completed, total: tasks.length, percent: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
}

export function loadWarriorDungeonProgress(storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage)?.getItem(WARRIOR_DUNGEON_PROGRESS_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function saveWarriorDungeonProgress(progress, storage) {
  try {
    (storage ?? globalThis.localStorage)?.setItem(WARRIOR_DUNGEON_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch { return false; }
}

function normalizeDungeonName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function buildWarriorDungeonPreparation(state, guideData = {}) {
  const pack = guideData.dungeonPreparation || {};
  const levelRecords = guideData.warriorLeveling?.dungeons || [];
  const detailedRecords = pack.dungeons || [];
  const fullRecords = guideData.dungeons || [];
  const faction = state.faction === 'Horde' ? 'Horde' : 'Alliance';
  const specializationId = ['arms', 'fury', 'protection'].includes(state.specializationId) ? state.specializationId : 'arms';
  const config = pack.warriorPreparation?.specializations?.[specializationId];
  const specs = guideData.classRecord?.specializationGuides || {};
  const armsItems = specs.arms?.sections?.gear?.equipmentGuide?.items || [];
  const genericSource = guideData.sources?.find(source => source.id === 'icy-dungeons-index');
  const itemFaction = item => item.faction || String(item.acquisition || '').match(/^(Alliance|Horde) quest reward/i)?.[1] || '';
  const getRecord = dungeon => {
    const key = normalizeDungeonName(dungeon.name);
    const detail = detailedRecords.find(record => normalizeDungeonName(record.name) === key) || null;
    const full = fullRecords.find(record => normalizeDungeonName(record.name) === key
      || normalizeDungeonName(record.name) === key.replace('wetlands', '')
      || normalizeDungeonName(record.name) === key.replace('islandprison', 'prison')) || null;
    return { detail, full };
  };
  const gearFor = (dungeon, full, detail) => {
    const dungeonId = full?.id || detail?.id || normalizeDungeonName(dungeon.name);
    const aliases = [...new Set([
      normalizeDungeonName(dungeon.name), normalizeDungeonName(dungeon.name).replace(/^the/, ''),
      normalizeDungeonName(full?.name), normalizeDungeonName(full?.id), normalizeDungeonName(detail?.name),
      normalizeDungeonName(dungeonId)
    ].filter(alias => alias.length >= 6))];
    const belongsToDungeon = item => {
      if (item.dungeonId && normalizeDungeonName(item.dungeonId) === normalizeDungeonName(dungeonId)) return true;
      const acquisition = normalizeDungeonName(item.acquisition || '');
      return aliases.some(alias => acquisition.includes(alias));
    };
    const matchesProfile = item => (!item.specializations || item.specializations.includes(specializationId))
      && (!itemFaction(item) || itemFaction(item) === faction);
    const gearRecords = [
      ...(guideData.warriorEquipment?.items || []).map(item => ({ ...item, gearRecordType: 'shared' })),
      ...(specializationId === 'arms' ? armsItems.map(item => ({ ...item, gearRecordType: 'arms-guide' })) : [])
    ];
    const byId = new Map(gearRecords.map(item => [item.id, item]));
    const byName = new Map(gearRecords.map(item => [normalizeDungeonName(item.name), item]));
    const linkedItems = gearRecords.filter(item => belongsToDungeon(item) && matchesProfile(item)).map(item => {
      const boss = item.boss || String(item.acquisition || '').match(/Dropped by (.+?) in /i)?.[1] || '';
      return {
        ...item, faction: itemFaction(item) || undefined, equipmentId: item.id, boss, stats: item.attributes || [],
        specializations: item.specializations || ['arms', 'fury', 'protection']
      };
    });
    const linkedIds = new Set(linkedItems.map(item => item.id));
    const configuredItems = (pack.warriorPreparation?.equipmentDrops || []).filter(item =>
      normalizeDungeonName(item.dungeon) === normalizeDungeonName(dungeon.name)
        || (dungeon.name === 'Alcaz Island Prison' && normalizeDungeonName(item.dungeon) === 'alcazprison'));
    for (const drop of configuredItems) {
      const record = byId.get(drop.id) || byName.get(normalizeDungeonName(drop.name));
      if (record) {
        if (linkedIds.has(record.id) || !matchesProfile(record)) continue;
        linkedItems.push({ ...record, equipmentId: record.id, boss: drop.boss, stats: record.attributes || drop.stats || [], specializations: record.specializations || drop.specializations });
        linkedIds.add(record.id);
        continue;
      }
      if (!drop.specializations?.includes(specializationId) || (drop.faction && drop.faction !== faction)) continue;
      linkedItems.push({ ...drop, equipmentId: null, boss: drop.boss, acquisition: `Dropped by ${drop.boss} in ${drop.dungeon}.`, stats: drop.stats || [] });
    }
    return linkedItems;
  };
  const records = levelRecords.map(dungeon => {
    const { detail, full } = getRecord(dungeon);
    const quests = (detail?.quests || []).filter(quest => quest.factions?.includes(faction));
    for (const quest of guideData.warriorLeveling?.classQuests || []) {
      if (!quest.factions?.includes(faction) || (quest.specializations && !quest.specializations.includes(specializationId))
        || !quest.dungeonIds?.some(id => normalizeDungeonName(id) === normalizeDungeonName(dungeon.name))) continue;
      quests.push({
        id: quest.id, classQuestId: quest.id, name: quest.title, npc: quest.startingNpc, where: quest.location,
        min: quest.requiredLevel, factions: quest.factions, kind: 'class', stage: 'CLASS QUEST REQUIRING INSTANCE PARTICIPATION',
        outside: quest.prerequisites?.join('; '), unlock: quest.objectives, rewards: quest.rewards?.join('; '), sourceIds: quest.sourceIds
      });
    }
    const equipment = gearFor(dungeon, full, detail);
    const bosses = [...new Set(equipment.map(item => item.boss).filter(Boolean))];
    const sourceIds = [...new Set([
      genericSource?.id,
      full?.sourceId,
      dungeon.sourceId,
      ...(config?.sourceIds || []),
      ...equipment.flatMap(item => item.sourceIds || (item.sourceId ? [item.sourceId] : [])),
      ...quests.flatMap(quest => quest.sourceIds || [])
    ].filter(Boolean))];
    return {
      ...dungeon, id: detail?.id || full?.id || normalizeDungeonName(dungeon.name), detail, full, quests, equipment, bosses, sourceIds,
      levelRange: `${dungeon.minLevel}–${dungeon.maxLevel}`,
      withinRange: state.level >= dungeon.minLevel && state.level <= dungeon.maxLevel,
      location: detail?.zone || full?.location || dungeon.location || '',
      entrance: detail?.entrance || '',
      note: detail?.warnings || ''
    };
  });
  const available = records.filter(dungeon => dungeon.withinRange)
    .sort((left, right) => left.minLevel - right.minLevel || left.name.localeCompare(right.name));
  const comingUp = records.filter(dungeon => dungeon.minLevel > state.level)
    .sort((left, right) => left.minLevel - right.minLevel || left.name.localeCompare(right.name)).slice(0, 3);
  return {
    level: state.level, faction, specializationId, specializationName: guideData.classRecord?.specializations?.find(spec => spec.id === specializationId)?.name || specializationId,
    preparation: config ? {
      ...config,
      advice: specializationId === 'protection'
        ? state.level < 14
          ? 'Before level 14, use your strongest current two-handed weapon while you build toward Revenge. Complete the level 10 class quest, train Taunt and Sunder Armor, and check your weapon skill before the run.'
          : 'Bring a one-handed weapon and shield. Keep Revenge, Taunt, and Sunder Armor ready; use Shield Block when trained against heavy melee pressure, and recover loose enemies with Taunt before rebuilding threat.'
        : config.advice
    } : null,
    available, comingUp, sourceIds: config?.sourceIds || [],
    allDungeonCount: records.length
  };
}

function buildWarriorProfessionGuide(state, guideData) {
  const reference = guideData.warriorProfessions || null;
  const specialization = (guideData.classRecord?.specializations || []).find(item => item.id === state.specializationId);
  const level = state.level;
  const activityKey = level < 10 ? 'before10' : level < 20 ? 'before20' : level < 25 ? 'before25' : level < 35 ? 'before35' : 'artisan';
  const equipment = [
    ...(guideData.warriorEquipment?.items || []),
    ...(guideData.classRecord?.specializationGuides?.arms?.sections?.gear?.equipmentGuide?.items || [])
  ];
  const specializationGuidance = reference?.specializationGuidance?.[state.specializationId] || null;
  return {
    level,
    specializationId: state.specializationId,
    specialization: specialization?.name || state.specializationId,
    reference,
    activity: reference?.activityNotes?.[activityKey] || '',
    specializationGuidance,
    recipes: (reference?.craftExamples || []).map(recipe => ({
      ...recipe,
      relatedEquipment: equipment.find(item => item.id === recipe.gearItemId) || null
    })),
    sourceIds: [...new Set([...(reference?.sourceIds || []), ...(specializationGuidance?.sourceIds || [])])]
  };
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
  const availablePoints = progressionEngine?.availablePoints?.(state.level, 0) ?? Math.max(0, Number(state.level) - 9);
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
  if (classRecord.id === 'shaman' && state.tab === 'overview') {
    const races = Object.entries(guideData.raceCombinations || {}).map(([faction, entries]) => ({
      faction,
      names: Object.entries(entries).filter(([, classes]) => classes.includes('Shaman'))
        .map(([race]) => faction === 'Horde' && race === 'Skyborne' ? 'Windshaper Skyborne' : race)
    })).filter(entry => entry.names.length);
    return {
      heading: `Shaman · ${specName} · Level ${state.level}`,
      shamanOverview: {
        level: state.level,
        specialization: specialization || { name: specName, role: 'Role not recorded', focus: 'Specialization details are not yet documented.' },
        availableTalentPoints: progressionEngine?.availablePoints?.(state.level, 0) ?? Math.max(0, state.level - 9),
        classMechanics: guideData.shamanGuide?.classMechanics || '',
        races,
        sourceIds: [...new Set([...(guideData.shamanGuide?.sourceIds || []), specialization?.sourceId].filter(Boolean))]
      },
      sections: [], notices: []
    };
  }
  if (classRecord.id === 'shaman' && state.tab !== 'talents' && state.tab !== 'gold-farming') {
    const label = COMPANION_TAB_LABELS[state.tab] || state.tab;
    return { heading: `${specName} · ${label} · Level ${state.level}`, sections: [], notices: [`Not yet documented for Shaman ${specName}.`] };
  }
  if (state.tab === 'stats' && classRecord.statsGuide) {
    const priorityRecord = classRecord.statsGuide.priorities?.[state.specializationId];
    const profile = state.level >= 60 ? priorityRecord
      : state.specializationId === 'fury' && state.level < 20 ? priorityRecord?.beforeDualWield
        : priorityRecord?.leveling || priorityRecord;
    const priority = profile ? { ...profile, id: state.specializationId, level: state.level } : null;
    return {
      heading: `${specName} · Stats & Attributes · Level ${state.level}`,
      statsGuide: classRecord.statsGuide,
      priority: priority ? { ...priority, id: state.specializationId } : null,
      sections: [],
      notices: priority ? [] : [`No stat guidance is recorded for ${specName}.`],
      sourceIds: [...new Set(['foreverdb-stats', ...(priority?.sourceIds || []), ...(classRecord.statsGuide.upgradeSourceIds || [])])]
    };
  }
  if (state.tab === 'combat' && classRecord.id === 'warrior') {
    const combatGuide = buildWarriorCombatGuide(state, guideData);
    return {
      heading: `${specName} · Combat · Level ${state.level}`,
      warriorCombatGuide: combatGuide,
      sections: [],
      notices: [],
      sourceIds: combatGuide.sourceIds
    };
  }
  if (state.tab === 'gear' && classRecord.id === 'warrior') {
    const recordedGuide = specializationGuideContent?.sections?.gear?.equipmentGuide
      || (guideMatchesSpec ? guide?.equipmentGuide : null);
    const sharedEquipment = guideData.warriorEquipment || {};
    const faction = state.faction === 'Horde' ? 'Horde' : 'Alliance';
    const allItems = [...(recordedGuide?.items || []), ...(sharedEquipment.items || [])];
    const eligibleItems = allItems.filter(item => (!item.specializations || item.specializations.includes(state.specializationId))
      && (!item.faction || item.faction === faction));
    const gearGuide = {
      ...(recordedGuide || {}),
      items: eligibleItems,
      slotCoverage: sharedEquipment.slotCoverage || [],
      emptyState: sharedEquipment.emptyState || '',
      availabilityMessage: recordedGuide?.availabilityMessage || (eligibleItems.length ? '' : `No verified ${specName} equipment guidance or item records are stored yet.`)
    };
    return {
      heading: `${specName} · Weapons & Gear · Level ${state.level}`,
      gearGuide,
      level: state.level,
      notices: [],
      sections: []
    };
  }
  if (state.tab === 'professions' && classRecord.id === 'warrior') {
    const professionGuide = buildWarriorProfessionGuide(state, guideData);
    return {
      heading: `${professionGuide.specialization} · Professions · Level ${state.level}`,
      warriorProfessionGuide: professionGuide,
      sections: [],
      notices: [],
      sourceIds: professionGuide.sourceIds
    };
  }
  if (state.tab === 'dungeons' && classRecord.id === 'warrior') {
    const dungeonGuide = buildWarriorDungeonPreparation(state, guideData);
    return {
      heading: `${dungeonGuide.specializationName} Dungeons · Level ${state.level}`,
      warriorDungeons: dungeonGuide,
      sections: [], notices: [], sourceIds: dungeonGuide.sourceIds
    };
  }
  if (state.tab === 'leveling' && classRecord.id === 'warrior') {
    // Leveling references are shared across specs where a dedicated guide section is not yet stored.
    const tabContent = specializationGuideContent?.sections?.leveling
      || classRecord.specializationGuides?.arms?.sections?.leveling;
    const levelingData = buildWarriorLevelingData(state, guideData, tabContent);
    return {
      heading: `${specName} leveling · Level ${state.level}`,
      warriorLeveling: levelingData,
      sections: [],
      notices: [],
      sourceIds: [...new Set([...(tabContent?.sourceIds || []), ...levelingData.sourceIds])]
    };
  }
  if (state.tab === 'gold-farming') {
    return { heading: `${specName} Gold Farming · Level ${state.level}`, goldFarming: { level: state.level, faction: state.faction, specializationId: state.specializationId, classId: classRecord.id || state.classId }, sections: [], notices: [] };
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
    if (state.tab === 'overview' && tabContent?.sections?.length) {
      const strengths = tabContent.sections.find(section => section.title === 'Strengths');
      const weaknesses = tabContent.sections.find(section => section.title === 'Weaknesses');
      if (strengths && weaknesses) return {
        heading: `${specName} · Overview`,
        sections: tabContent.sections.filter(section => section !== strengths && section !== weaknesses),
        overviewHighlights: { strengths: strengths.items || [], weaknesses: weaknesses.items || [] },
        notices: [],
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
    if (classRecord.id === 'shaman') return {
      heading: `${specName} talent tree · Level ${state.level}`,
      treeData,
      sections: [{ title: 'Talent-point budget', text: `${treeData.availablePoints} points are available at level ${state.level}. This is the game-rule budget, not an allocated build.` }],
      notices: [shamanBuildAvailabilityNotice(treeData, progressionEngine, state.specializationId)].filter(Boolean),
      note: `Talent points start at level 10 and exclude Talented Legacy bonus points. ${treeData.tree ? 'All three trees remain visible for reference; no ranks are marked as recommended without a complete verified progression.' : ''}`
    };
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

function shamanBuildAvailabilityNotice(treeData, progressionEngine, specializationId) {
  if (treeData.recommended?.valid) return '';
  const candidate = progressionEngine?.builds?.find(build => build.classId === 'shaman'
    && build.specializationId === specializationId);
  if (candidate?.coverage?.status === 'partial') {
    const through = candidate.coverage.highestDocumentedLevel || candidate.levelRange?.through;
    return `A draft route is recorded${through ? ` through level ${through}` : ''}, but its tree-row requirements and full progression are not verified. It is not applied automatically.`;
  }
  return 'A current WoW: Forever leveling guide is available, but it does not provide a fully auditable rank-by-rank build here. Automatic allocation is withheld until that progression is verified.';
}

function buildWarriorCombatGuide(state, guideData) {
  const source = guideData.warriorCombat || {};
  const specialization = source.specializations?.[state.specializationId];
  if (!specialization) return { level: state.level, specializationId: state.specializationId, availabilityMessage: 'Verified combat guidance is not loaded for this specialization.', sections: [], openers: [], abilities: [], sourceIds: [] };
  const client = guideData.combatCatalog || {};
  const classAbilities = client.classAbilities?.warrior || [];
  const descriptions = client.spellDescriptions || {};
  const talentTrees = guideData.talentClass?.trees || [];
  const abilityNames = [...new Set([
    ...(specialization.opening || []).map(step => step.ability),
    ...Object.values(specialization.priorities || {}).flat().map(step => step.ability)
  ].filter(Boolean))];
  const abilities = abilityNames.map(name => {
    const descriptionEntries = Object.entries(descriptions).filter(([key]) => key.startsWith(`Warrior|${name}|`));
    const spell = descriptionEntries.find(([key]) => key.endsWith('|Rank 1'))?.[1]
      || descriptionEntries.find(([key]) => key.endsWith('|'))?.[1]
      || descriptionEntries[0]?.[1];
    const unlockMatch = spell?.level?.match(/Learned at level (\d+)/i);
    const exactAbility = classAbilities.find(item => item.name === name);
    const talent = talentTrees.flatMap(tree => tree.talents || []).find(item => item.name === name && item.icon);
    // Prefer an exact-name talent icon; class ability icons are used only for known matching records.
    const trustedClassIcons = new Set(['Rage', 'Thunder Clap', 'Bloodrage', 'Shield Wall', 'Shield Block']);
    return {
      name,
      unlockLevel: unlockMatch ? Number(unlockMatch[1]) : null,
      description: spell?.description || (trustedClassIcons.has(name) ? exactAbility?.summary : '') || 'No verified ability description is available in the loaded project data.',
      icon: talent?.icon || (trustedClassIcons.has(name) ? exactAbility?.icon : '') || '',
      // Missing trainer-level metadata is not evidence that an ability is usable.
      availability: !unlockMatch ? 'unverified' : state.level >= Number(unlockMatch[1]) ? 'available' : 'upcoming',
      unlocked: Boolean(unlockMatch && state.level >= Number(unlockMatch[1])),
      newAtLevel: Boolean(unlockMatch && state.level === Number(unlockMatch[1]))
    };
  });
  return {
    level: state.level,
    specializationId: state.specializationId,
    specializationName: guideData.classRecord?.specializations?.find(item => item.id === state.specializationId)?.name || state.specializationId,
    sourceIds: specialization.sourceIds || [],
    singleTarget: specialization.priorities?.singleTarget || [],
    multipleEnemies: specialization.priorities?.multipleEnemies || [],
    defensive: specialization.priorities?.defensive || [],
    opening: specialization.opening || [],
    rageManagement: specialization.rageManagement || 'No verified specialization-specific Rage guidance is recorded.',
    abilities
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

const WARRIOR_STAT_SYMBOLS = {
  strength: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  agility: '<path d="M20.5 3.5C14 3 7 6 5.2 11.1 3.9 14.8 6 18 9.5 18c5.1 0 8.6-7.6 11-14.5Z"/><path d="M4 21 14.8 10.2M8 17l-1-4M12 13l-1-4"/>',
  stamina: '<path d="M20.8 8.8c0 4.1-8.8 11-8.8 11s-8.8-6.9-8.8-11a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z"/>',
  'attack-power': '<path d="m4 3 17 18M20 3 3 20M3 3l4 1 1 4M17 17l1 4 4 1M21 3l-4 1-1 4M7 17l-1 4-4 1"/>',
  'critical-strike': '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
  'hit-chance': '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M12 10v4M10 12h4"/>',
  'weapon-damage': '<path d="M14 4 20 2l2 2-2 6-3-3-9 9-2-2 9-9-1-1Z"/><path d="m6 14-4 4 4 4 4-4"/>',
  expertise: '<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m14 10 7-7M17 3h4v4"/>',
  defense: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/>',
  armor: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m8 11 2.5 2.5L16 8"/>',
  'block-value': '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m8 12 2.5 2.5L16 9"/><path d="M12 5v3"/>'
};

function renderWarriorStatSymbol(statId) {
  const paths = WARRIOR_STAT_SYMBOLS[statId] || WARRIOR_STAT_SYMBOLS.defense;
  return `<span class="wow-stat-symbol is-${statId}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;
}

function renderStatsGuide(statsGuide, priority, escapeHtml) {
  if (!statsGuide || !priority) return '';
  const renderPriority = (title, items) => `<section class="wow-stat-priority-group"><h4>${escapeHtml(title)}</h4><ol>${items.map((item, index) => {
    const orderFill = Math.round(((items.length - index) / items.length) * 100);
    return `<li><span class="wow-stat-priority-rank" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="wow-stat-priority-label">${escapeHtml(item)}</span><span class="wow-stat-order-bar" aria-hidden="true"><span style="width:${orderFill}%"></span></span></li>`;
  }).join('')}</ol></section>`;
  const priorities = priority.items
    ? renderPriority(priority.label, priority.items)
    : `${renderPriority('Threat & damage', priority.offense || [])}${renderPriority('Survival', priority.defense || [])}`;
  const rows = statsGuide.attributes.map(stat => `<li class="wow-stat-row" data-stat-id="${escapeHtml(stat.id)}">${renderWarriorStatSymbol(stat.id)}<strong>${escapeHtml(stat.name)}</strong><span><span>${escapeHtml(stat.summary)}</span>${stat.when ? `<small><strong>When it matters:</strong> ${escapeHtml(stat.when)}</small>` : ''}</span></li>`).join('');
  const explanations = statsGuide.explanations.map(item => `<details class="wow-stat-explanation"><summary>${escapeHtml(item.title)}</summary><p>${escapeHtml(item.text)}</p></details>`).join('');
  return `<div class="wow-stats-guide" data-stats-specialization="${escapeHtml(priority.id || '')}" data-stats-level="${Number(priority.level) || 60}"><section class="wow-stat-priority"><div class="wow-stat-section-heading"><h4>${escapeHtml(priority.label || 'Specialization priority')}</h4><span>Level ${Number(priority.level) || 60} · Bars show ordering, not numerical stat weights.</span></div>${priority.note ? `<p class="wow-stat-priority-note">${escapeHtml(priority.note)}</p>` : ''}${priority.thresholdNote ? `<p class="wow-stat-threshold-note">${escapeHtml(priority.thresholdNote)}</p>` : ''}<div class="wow-stat-priority-groups">${priorities}</div></section><section class="wow-stat-attributes"><h4>Warrior attributes</h4><ul class="wow-stat-rows">${rows}</ul></section><section class="wow-stat-explanations"><h4>Mechanics &amp; context</h4>${explanations}</section><section class="wow-stat-upgrade"><h4>What should I upgrade next?</h4><p>${escapeHtml(statsGuide.upgradeAdvice)}</p></section></div>`;
}

export function renderWarriorGearGuide(gearGuide, level, selectedFilter, escapeHtml) {
  const items = gearGuide.items || [];
  const visibleItems = selectedFilter === 'all' ? items : items.filter(item => item.category === selectedFilter);
  const categories = [
    ['all', 'All'],
    ['weapon', 'Weapons'],
    ['armor', 'Armor'],
    ['accessory', 'Accessories']
  ];
  const categorized = items.reduce((result, item) => {
    (result[item.category] ||= []).push(item);
    return result;
  }, {});
  const adviceRows = [];
  if (gearGuide.weaponType) adviceRows.push(['Weapon type', gearGuide.weaponType]);
  else if (Number.isFinite(gearGuide.dualWieldLevel)) {
    adviceRows.push(['Weapon type', level < gearGuide.dualWieldLevel ? gearGuide.weaponBeforeDualWield : gearGuide.weaponAfterDualWield]);
  }
  if (gearGuide.weaponAdvice) adviceRows.push(['Damage & speed', gearGuide.weaponAdvice]);
  if (gearGuide.importantAttributes) adviceRows.push(['Important attributes', gearGuide.importantAttributes]);
  if (gearGuide.armorAdvice) adviceRows.push(['Armor type', gearGuide.armorAdvice]);
  if (gearGuide.survivabilityAdvice) adviceRows.push(['Survivability', gearGuide.survivabilityAdvice]);
  const advice = adviceRows.length
    ? `<section class="wow-warrior-gear-advice"><h4>What should I equip?</h4><dl>${adviceRows.map(([label, text]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(text)}</dd></div>`).join('')}</dl></section>`
    : `<section class="wow-warrior-gear-advice"><h4>What should I equip?</h4><p>${escapeHtml(gearGuide.availabilityMessage || 'No verified equipment guidance is recorded for this specialization.')}</p></section>`;
  const renderItem = item => {
    const hasRequirement = Number.isFinite(item.requiredLevel);
    const requirement = hasRequirement ? `Level ${item.requiredLevel}` : 'Not listed in item record';
    const availabilityLevel = hasRequirement ? item.requiredLevel : Number.isFinite(item.availabilityLevel) ? item.availabilityLevel : null;
    const availabilityText = hasRequirement ? `Available at ${requirement}` : Number.isFinite(item.availabilityLevel)
      ? `Source available from level ${item.availabilityLevel}`
      : 'Source level not listed';
    const status = !hasRequirement ? availabilityLevel != null && level < availabilityLevel
      ? `Upcoming · ${availabilityText}; item requirement unverified` : 'Item requirement unverified'
      : level >= availabilityLevel ? `Available now · ${availabilityText}` : `Upcoming · ${availabilityText}`;
    const itemName = item.sourceUrl
      ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a>`
      : escapeHtml(item.name);
    const bracket = item.recommendationBracket ? `<span><strong>Bracket</strong>Levels ${escapeHtml(item.recommendationBracket)}</span>` : '';
    const explanation = item.whyUseful ? `<p><strong>Warrior value</strong> ${escapeHtml(item.whyUseful)}</p>` : '';
    return `<article class="wow-warrior-gear-item" data-gear-category="${escapeHtml(item.category)}" data-gear-slot="${escapeHtml(item.slot)}"><header><h5>${itemName}</h5><span>${escapeHtml(status)}</span></header><div class="wow-warrior-gear-item-facts"><span><strong>Required level</strong>${escapeHtml(requirement)}</span>${!hasRequirement && Number.isFinite(item.availabilityLevel) ? `<span><strong>Source level</strong>${item.availabilityLevel} (item requirement not listed)</span>` : ''}<span><strong>Slot</strong>${escapeHtml(item.slot)}</span>${bracket}${Number.isFinite(item.itemLevel) ? `<span><strong>Item level</strong>${item.itemLevel}</span>` : ''}</div><p><strong>Relevant attributes</strong> ${escapeHtml(item.attributes?.join(' · ') || 'No item attributes are recorded.')}</p><p><strong>Obtain</strong> ${escapeHtml(item.acquisition || 'Acquisition method not recorded.')}</p>${explanation}</article>`;
  };
  const groupLevel = item => Number.isFinite(item.requiredLevel) ? item.requiredLevel
    : Number.isFinite(item.availabilityLevel) ? item.availabilityLevel : null;
  const groups = [
    ['available', 'Available now', visibleItems.filter(item => Number.isFinite(item.requiredLevel) && item.requiredLevel <= level).sort((left, right) => left.requiredLevel - right.requiredLevel)],
    ['upcoming', 'Upcoming upgrades', visibleItems.filter(item => groupLevel(item) != null && groupLevel(item) > level).sort((left, right) => groupLevel(left) - groupLevel(right))],
    ['unknown', 'Item requirements unverified', visibleItems.filter(item => !Number.isFinite(item.requiredLevel) && !(Number.isFinite(item.availabilityLevel) && item.availabilityLevel > level))]
  ].filter(([, , groupItems]) => groupItems.length);
  const equipment = groups.map(([id, title, groupItems]) => `<section class="wow-warrior-gear-group" data-gear-group="${id}"><h5>${escapeHtml(title)}</h5>${groupItems.map(renderItem).join('')}</section>`).join('');
  const filterButtons = categories.map(([category, label]) => `<button type="button" data-companion-gear-filter="${category}" aria-pressed="${category === selectedFilter}">${label}</button>`).join('');
  const noItems = !items.length;
  const noVisibleItems = !visibleItems.length;
  const categorySlots = gearGuide.slotCoverage?.filter(slot => selectedFilter === 'armor' ? !['Ring', 'Necklace', 'Trinket', 'Cloak'].includes(slot) : selectedFilter === 'accessory' ? ['Ring', 'Necklace', 'Trinket', 'Cloak'].includes(slot) : false) || [];
  const unrecordedSlots = categorySlots.filter(slot => !items.some(item => item.slot === slot));
  const emptyMessage = noItems
    ? gearGuide.availabilityMessage || 'No verified item-by-item recommendations are recorded for this specialization.'
    : noVisibleItems && unrecordedSlots.length
      ? `${gearGuide.emptyState || 'No verified Warrior recommendation is recorded.'} Slots without records: ${unrecordedSlots.join(', ')}.`
      : 'No verified recommendations are recorded in this equipment category.';
  return `<div class="wow-warrior-gear-guide" data-warrior-gear-guide>${advice}<section class="wow-warrior-gear-upgrades"><div class="wow-warrior-gear-section-heading"><h4>Equipment upgrades</h4><span>Level ${level} · verified records only</span></div><div class="wow-warrior-gear-filter" role="group" aria-label="Filter equipment by type">${filterButtons}</div><p class="wow-warrior-gear-empty" data-gear-filter-empty role="status"${noVisibleItems ? '' : ' hidden'}>${escapeHtml(emptyMessage)}</p><div class="wow-warrior-gear-groups"${noVisibleItems ? ' hidden' : ''}>${equipment}</div>${gearGuide.upgradeRationale ? `<p class="wow-warrior-gear-rationale"><strong>Why upgrades matter</strong> ${escapeHtml(gearGuide.upgradeRationale)}</p>` : ''}</section></div>`;
}

function renderOverviewHighlights(highlights, escapeHtml) {
  const renderPanel = (kind, title, sign, items) => `<section class="wow-warrior-overview-points is-${kind}"><h4><span aria-hidden="true">${sign}</span>${title}</h4><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`;
  return `<div class="wow-warrior-overview-panels">${renderPanel('strengths', 'Strengths', '+', highlights.strengths)}${renderPanel('weaknesses', 'Weaknesses', '−', highlights.weaknesses)}</div>`;
}

function renderWarriorCombatGuide(data, escapeHtml) {
  if (!data.specializationName) return `<div class="wow-warrior-combat"><p class="wow-warrior-combat-empty" role="status">${escapeHtml(data.availabilityMessage)}</p></div>`;
  const abilityByName = new Map(data.abilities.map(ability => [ability.name, ability]));
  const renderAbility = (name, index, reason) => {
    const ability = abilityByName.get(name) || { name, availability: 'unverified', unlockLevel: null, description: 'No verified ability description is available in the loaded project data.', icon: '' };
    const stateClass = ability.newAtLevel ? ' is-new' : ability.availability === 'available' ? ' is-available' : ability.availability === 'upcoming' ? ' is-upcoming is-locked' : ' is-unverified';
    const level = Number.isFinite(ability.unlockLevel) ? `Minimum level ${ability.unlockLevel}` : 'Minimum level unverified';
    const status = ability.newAtLevel ? 'New at this level · available now' : ability.availability === 'available' ? `Available now · ${level}` : ability.availability === 'upcoming' ? `Upcoming · ${level}` : 'Availability unverified';
    const usableReason = ability.availability === 'upcoming' ? `Upcoming: ${reason}` : ability.availability === 'unverified' ? `Confirm that this ability is trained and its requirements are met before use. ${reason}` : reason;
    const icon = ability.icon ? `<img src="${escapeHtml(ability.icon)}" alt="" loading="lazy">` : `<span aria-hidden="true">${escapeHtml(name.split(/\s+/).map(word => word[0]).join('').slice(0, 2))}</span>`;
    return `<li class="wow-warrior-combat-step${stateClass}" data-ability-availability="${ability.availability}"><span class="wow-warrior-combat-number" aria-hidden="true">${index + 1}</span><span class="wow-warrior-combat-icon">${icon}</span><div class="wow-warrior-combat-step-content"><div class="wow-warrior-combat-ability-line"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(status)}</span></div><p><strong>Does:</strong> ${escapeHtml(ability.description)}</p><p><strong>When to use:</strong> ${escapeHtml(usableReason)}</p><p class="wow-warrior-combat-minimum-level">${escapeHtml(level)}</p></div></li>`;
  };
  const section = (title, steps) => `<section class="wow-warrior-combat-section"><h4>${title}</h4>${steps.length ? `<ol>${steps.map((step, index) => renderAbility(step.ability, index, step.when)).join('')}</ol>` : '<p class="wow-warrior-combat-empty">No verified priorities are recorded for this situation.</p>'}</section>`;
  const opening = data.opening.length ? `<section class="wow-warrior-combat-opening"><h4>Opening a Fight</h4><ol>${data.opening.map((step, index) => renderAbility(step.ability, index, step.when)).join('')}</ol><p>Use this as a practical opener when conditions fit, not a fixed rotation.</p></section>` : '';
  return `<div class="wow-warrior-combat" data-warrior-combat data-combat-level="${data.level}" data-combat-specialization="${escapeHtml(data.specializationId)}"><p class="wow-warrior-combat-disclosure">Level ${data.level} · ${escapeHtml(data.specializationName)} · Context-based priority list, not a fixed rotation. Use the highest available action that fits the situation; this is not a fixed sequence that must be repeated.</p><h4 class="wow-warrior-combat-priority-title">Combat Priority</h4><div class="wow-warrior-combat-grid">${section('Single target', data.singleTarget)}${section('Multiple enemies', data.multipleEnemies)}${section('Defensive situations', data.defensive)}</div>${opening}<section class="wow-warrior-combat-rage"><h4>Rage Management</h4><p>${escapeHtml(data.rageManagement)}</p></section></div>`;
}

function renderPanel(state, guideData, escapeHtml, progressionEngine = {}, storage, gearFilter = 'all', professionChoice = 'mining-blacksmithing', checklistProgress = [], checklistFilter = 'all', dungeonProgress = {}) {
  const panel = getCompanionPanel(state, guideData, progressionEngine);
  const sections = panel.sections.map(section => `<section class="wow-companion-result"><h4>${escapeHtml(section.title)}</h4>${section.text ? `<p>${escapeHtml(section.text)}</p>` : ''}${section.items?.length ? `<ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</section>`).join('');
  const notices = (panel.notices || []).map(notice => `<p class="wow-companion-missing" role="status">${escapeHtml(notice)}</p>`).join('');
  const treeData = panel.treeData;
  const statsPanel = panel.statsGuide ? renderStatsGuide(panel.statsGuide, panel.priority, escapeHtml) : '';
  const combatPanel = panel.warriorCombatGuide ? renderWarriorCombatGuide(panel.warriorCombatGuide, escapeHtml) : '';
  const gearPanel = panel.gearGuide ? renderWarriorGearGuide(panel.gearGuide, panel.level, gearFilter, escapeHtml) : '';
  const levelingPanel = panel.warriorLeveling ? renderWarriorLevelingGuide(panel.warriorLeveling, escapeHtml, checklistProgress, checklistFilter) : '';
  const dungeonsPanel = panel.warriorDungeons ? renderWarriorDungeonPreparation(panel.warriorDungeons, dungeonProgress, escapeHtml) : '';
  const professionsPanel = panel.warriorProfessionGuide ? renderWarriorProfessionGuide(panel.warriorProfessionGuide, professionChoice, escapeHtml) : '';
  const goldFarmingPanel = panel.goldFarming ? renderGoldFarmingGuide(panel.goldFarming, escapeHtml) : '';
  const shamanOverviewPanel = panel.shamanOverview ? renderShamanOverview(panel.shamanOverview, escapeHtml) : '';
  const overviewContent = panel.overviewHighlights
    ? `<div class="wow-warrior-overview"><div class="wow-warrior-overview-context">${sections}</div>${renderOverviewHighlights(panel.overviewHighlights, escapeHtml)}</div>`
    : sections;
  const nextRecommended = treeData?.recommended?.valid && treeData.recommended.nextChange
    ? `<p class="wow-companion-next-talent">Next recommended talent · Unlocks at level ${treeData.recommended.nextChange.level} · ${escapeHtml(treeData.tree.talents.find(talent => talent.id === treeData.recommended.nextChange.talentId)?.name || 'Talent')}</p>`
    : '';
  const talentPanel = treeData ? `${treeData.tree ? renderTalentTree(state, treeData, escapeHtml) : ''}${treeData.recommended?.valid ? nextRecommended : ''}${treeData.validation.issues.length ? `<p class="wow-companion-missing" role="status">Progression data needs review: ${escapeHtml(treeData.validation.issues.join(' '))}</p>` : ''}` : '';
  return `<h3 data-companion-heading>${escapeHtml(panel.heading)}</h3>${overviewContent || ''}${shamanOverviewPanel}${statsPanel}${combatPanel}${gearPanel}${levelingPanel}${dungeonsPanel}${professionsPanel}${goldFarmingPanel}${treeData ? talentPanel : ''}${panel.note ? `<p class="wow-companion-note">${escapeHtml(panel.note)}</p>` : ''}${notices}`;
}

function renderShamanOverview(data, escapeHtml) {
  const { specialization, races } = data;
  const factions = races.map(group => `<div><dt>${escapeHtml(group.faction)}</dt><dd>${escapeHtml(group.names.join(', '))}</dd></div>`).join('');
  return `<section class="wow-shaman-overview"><div class="wow-shaman-overview-card"><p class="wow-companion-kicker">${escapeHtml(specialization.role)} · Level ${data.level}</p><h4>${escapeHtml(specialization.name)}</h4><p>${escapeHtml(specialization.focus)}</p><p><strong>Talent points available:</strong> ${data.availableTalentPoints}. This is a point budget, not a recommended allocation.</p></div><div class="wow-shaman-overview-card"><h4>Totems, Mana and group play</h4><p>${escapeHtml(data.classMechanics || 'Shaman class mechanics are not yet documented.')}</p></div><div class="wow-shaman-overview-card"><h4>Playable races by faction</h4><dl>${factions || '<div><dd>Faction combinations are not yet documented.</dd></div>'}</dl></div></section>`;
}

function renderGoldFarmingGuide(selection, escapeHtml) {
  const { level, faction, specializationId, classId } = selection;
  const categoryLabels = ['Farming Spots', 'Gathering Professions', 'Crafting for Profit', 'Dungeon Farming', 'Auction House Tips', 'Class-Specific Strategies'];
  const records = WOW_GOLD_FARMING_METHODS.filter(method => method.classes.includes(classId)
    && (method.faction === 'Both' || method.faction === faction)
    && (!Number.isFinite(method.minLevel) || method.minLevel <= level)
    && (!Number.isFinite(method.maxLevel) || method.maxLevel >= level)
    && (!method.specializations.length || method.specializations.includes(specializationId)));
  const cards = categoryLabels.map(category => {
    const categoryRecords = records.filter(method => method.category === category);
    return `<section class="wow-gold-category"><h4>${category}</h4>${categoryRecords.length ? `<div class="wow-gold-grid">${categoryRecords.map(method => {
      const rate = method.goldPerHour ? `<p class="wow-gold-rate"><strong>Observed haul:</strong> ${escapeHtml(method.goldPerHour.amount)} · ${escapeHtml(method.goldPerHour.context)}. Creator-reported; not a promise or typical result.</p>` : '';
      const specNames = method.specializations.length ? method.specializations.map(id => ({ arms: 'Arms', fury: 'Fury', protection: 'Protection' })[id] || id).join(', ') : 'All specializations';
      const levelLabel = method.levelLabel || `Levels ${method.minLevel}–${method.maxLevel}`;
      const specAdvice = method.specializationAdvice?.[specializationId];
      const lootValue = method.groupLoot ? `<p class="wow-gold-rate"><strong>Recorded group loot:</strong> ${escapeHtml(method.groupLoot.value)}. ${escapeHtml(method.groupLoot.context)}</p>` : '';
      return `<article class="wow-gold-card"><header><h5>${escapeHtml(method.name)}</h5><span class="wow-gold-level">${escapeHtml(levelLabel)}</span></header><dl><div class="wow-gold-location"><dt>Location</dt><dd>${escapeHtml(method.zone || 'No verified zone')}${method.location ? ` · ${escapeHtml(method.location)}` : ''}</dd></div>${method.target ? `<div><dt>Enemies / resources</dt><dd>${escapeHtml(method.target)}</dd></div>` : ''}<div><dt>Collect</dt><dd>${escapeHtml(method.collect)}</dd></div><div><dt>Requirements</dt><dd>${escapeHtml(method.requirement || 'None recorded')}</dd></div><div><dt>How it earns</dt><dd>${escapeHtml(method.earn)}</dd></div><div><dt>Group / specs</dt><dd>${escapeHtml(method.suitability)} · ${escapeHtml(specNames)}</dd></div></dl>${rate}${lootValue}<details><summary>Practical instructions and risks</summary>${method.route ? `<p><strong>Reach it:</strong> ${escapeHtml(method.route)}</p>` : ''}<p>${escapeHtml(method.instructions)}</p>${specAdvice ? `<p><strong>${escapeHtml(specNames)} approach:</strong> ${escapeHtml(specAdvice)}</p>` : ''}${method.risks ? `<p><strong>Risks:</strong> ${escapeHtml(method.risks)}</p>` : ''}</details></article>`;
    }).join('')}</div>` : `<p class="wow-gold-empty">${classId === 'shaman' ? 'Not yet documented for Shaman with these selections.' : 'No matching methods for this level, faction, and specialization.'}</p>`}</section>`;
  }).join('');
  const suggestion = WOW_GOLD_LEVEL_SUGGESTIONS.find(item => level >= item.min && level <= item.max);
  const otherTips = WOW_GOLD_OTHER_TIPS.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const bandLabel = suggestion.min === 60 ? 'Level 60' : `Levels ${suggestion.min}–${suggestion.max}`;
  return `<div class="wow-gold-farming" data-gold-level="${level}" data-gold-spec="${escapeHtml(specializationId)}" data-gold-faction="${escapeHtml(faction)}"><p class="wow-gold-disclosure">Suggestions use the guide’s current level, specialization and faction. Market prices and demand vary by ruleset, faction and date. Rates appear only when a source reports a measured result.</p><section class="wow-gold-band"><h4>${bandLabel} suggestions</h4><p>${escapeHtml(suggestion.text)}</p></section>${cards}<section class="wow-gold-other"><h4>Other Ways to Make Gold</h4><ul>${otherTips}</ul></section></div>`;
}

function renderWarriorProfessionGuide(data, selectedChoice, escapeHtml) {
  const guide = data.reference;
  if (!guide) return `<div class="wow-warrior-professions"><p class="wow-companion-missing" role="status">Verified Warrior profession data is not loaded. No profession pairs, recipe requirements or leveling milestones are available.</p></div>`;
  const combinations = guide.combinations.map(pair => `<article class="wow-warrior-profession-card${pair.id === selectedChoice ? ' is-selected' : ''}"><button type="button" class="wow-warrior-profession-choice" data-profession-choice="${escapeHtml(pair.id)}" aria-pressed="${pair.id === selectedChoice}" aria-label="Select ${escapeHtml(pair.name)} as the pairing to compare"><span class="wow-warrior-profession-symbol" aria-hidden="true">${escapeHtml(pair.symbol)}</span><span><strong>${escapeHtml(pair.name)}</strong><small>${escapeHtml(pair.label)}</small></span><span class="wow-warrior-profession-selected">${pair.id === selectedChoice ? 'Comparing' : 'Compare'}</span></button><p>${escapeHtml(pair.benefit)}</p><p class="wow-warrior-profession-tradeoff"><strong>Tradeoff</strong> ${escapeHtml(pair.tradeoff)}</p></article>`).join('');
  const gates = guide.rankGates.map(rank => {
    const requiredSkill = rank.skillRequired == null ? '—' : rank.skillRequired;
    const gateLabel = requiredLevel => requiredLevel == null
      ? 'No level gate'
      : `Level ${requiredLevel} · ${data.level >= requiredLevel ? 'met' : 'upcoming'}`;
    const craftingLevel = gateLabel(rank.craftingCharacterLevel);
    const gatheringLevel = gateLabel(rank.gatheringCharacterLevel);
    const current = rank.craftingCharacterLevel == null || rank.gatheringCharacterLevel == null
      || data.level >= rank.craftingCharacterLevel || data.level >= rank.gatheringCharacterLevel;
    return `<tr class="${current ? 'is-level-ready' : ''}"><th scope="row">${escapeHtml(rank.rank)}<small>Cap ${escapeHtml(rank.skillCap)}</small></th><td>${escapeHtml(requiredSkill)}</td><td>${escapeHtml(craftingLevel)}</td><td>${escapeHtml(gatheringLevel)}</td></tr>`;
  }).join('');
  const examples = data.recipes.map(recipe => {
    const levelStatus = data.level >= recipe.characterLevelRequired ? 'Available now · character level met' : `Upcoming · character level ${recipe.characterLevelRequired}`;
    const professionRequirement = recipe.professionSkillRequired == null
      ? `Minimum ${escapeHtml(recipe.profession)} skill is unverified${recipe.skillUpThreshold ? `; skill-up chance turns yellow at ${escapeHtml(recipe.skillUpThreshold)}` : ''}.`
      : `${escapeHtml(recipe.profession)} skill ${escapeHtml(recipe.professionSkillRequired)} required.`;
    const materials = Array.isArray(recipe.materials) && recipe.materials.length
      ? `<ul class="wow-warrior-profession-materials">${recipe.materials.map(material => `<li><strong>${escapeHtml(material.quantity)} × ${escapeHtml(material.name)}</strong> · ${escapeHtml(material.source || 'Material source not recorded.')}</li>`).join('')}</ul>`
      : '<p class="wow-warrior-profession-unverified">Recipe materials are not recorded.</p>';
    const relatedAcquisition = recipe.relatedEquipment?.acquisition?.replace(/\s*\(skill 80\)/i, ' (yellow skill-up point 80; minimum skill unverified)');
    const related = recipe.relatedEquipment
      ? `<p><strong>Existing equipment recommendation:</strong> ${escapeHtml(recipe.relatedEquipment.slot || 'Slot not recorded')} · ${escapeHtml((recipe.relatedEquipment.attributes || []).join(' · ') || 'Stats not recorded')} · ${escapeHtml(relatedAcquisition || 'Acquisition not recorded.')}</p>`
      : '';
    const availability = data.level >= recipe.characterLevelRequired ? 'is-available' : 'is-upcoming';
    return `<article class="wow-warrior-profession-recipe ${availability}" data-profession-recipe="${escapeHtml(recipe.id || recipe.name)}"><div><h5>${escapeHtml(recipe.name)}</h5><span>${escapeHtml(levelStatus)}</span></div><p><strong>Profession:</strong> ${escapeHtml(recipe.profession)} · ${professionRequirement} Character level ${escapeHtml(recipe.characterLevelRequired)} is a separate gate.</p><p><strong>Acquisition:</strong> ${escapeHtml(recipe.acquisition)} Recipe: ${escapeHtml(recipe.recipeAcquisition || 'source unavailable')}.</p>${materials}${related}<p class="wow-warrior-profession-unverified">${escapeHtml(recipe.verificationStatus?.includes('unavailable') || recipe.professionSkillRequired == null ? 'Exact minimum profession skill is unavailable in the verified record.' : '')}</p></article>`;
  }).join('');
  const campBenefits = guide.campBenefits.map(item => `<li><span class="wow-warrior-profession-symbol" aria-hidden="true">${escapeHtml(item.symbol)}</span><div><strong>${escapeHtml(item.profession)} · ${escapeHtml(item.name)}</strong><p>Profession skill ${escapeHtml(item.skillRequired)} · ${escapeHtml(item.benefit)}</p></div></li>`).join('');
  const secondary = guide.secondaryProfessions.map(item => `<article><span class="wow-warrior-profession-symbol" aria-hidden="true">${escapeHtml(item.symbol)}</span><div><h5>${escapeHtml(item.name)}</h5><p>${escapeHtml(item.benefit)}</p></div></article>`).join('');
  return `<div class="wow-warrior-professions" data-warrior-professions data-specialization="${escapeHtml(data.specializationId)}"><div class="wow-warrior-professions-intro"><div><p class="wow-eyebrow">Selected path · ${escapeHtml(data.specialization)}</p><h4>Choose a profession direction</h4></div><span>Character level ${data.level}</span></div>${data.specializationGuidance ? `<section class="wow-warrior-profession-section wow-warrior-profession-focus"><h4>${escapeHtml(data.specializationGuidance.title)}</h4><p>${escapeHtml(data.specializationGuidance.text)}</p></section>` : ''}<p class="wow-warrior-profession-disclosure">${escapeHtml(guide.recommendationDisclosure)}</p><div class="wow-warrior-profession-combinations" role="group" aria-label="Compare profession combinations">${combinations}</div><section class="wow-warrior-profession-section"><h4>What should I work on now?</h4><p>${escapeHtml(data.activity)}</p><p>Profession skill and character level are separate gates. Being high enough level does not mean your profession skill requirement is met.</p></section><section class="wow-warrior-profession-section"><h4>Profession rank requirements</h4><div class="wow-warrior-profession-table-wrap"><table><thead><tr><th scope="col">Rank</th><th scope="col">Profession skill</th><th scope="col">Crafting character level</th><th scope="col">Gathering character level</th></tr></thead><tbody>${gates}</tbody></table></div></section><section class="wow-warrior-profession-section"><h4>Warrior craft and equipment records</h4>${examples || '<p class="wow-warrior-profession-empty">No profession recipe examples are recorded.</p>'}</section><section class="wow-warrior-profession-section"><h4>Warrior camp benefits</h4><ul class="wow-warrior-camp-benefits">${campBenefits}</ul><p class="wow-warrior-profession-empty">Each listed camp feature requires profession skill 20. Profession skill is not character level.</p></section><section class="wow-warrior-profession-section"><h4>Useful secondary skills</h4><div class="wow-warrior-secondary-grid">${secondary}</div><p class="wow-warrior-profession-empty">Secondary skills do not use either primary profession slot.</p></section></div>`;
}

function renderWarriorLevelingGuide(data, escapeHtml, checklistProgress = [], checklistFilter = 'all') {
  const zoneCard = (zone, upcoming = false) => `<article class="wow-warrior-level-zone${upcoming ? ' is-upcoming' : ' is-current'}"><div><h5>${escapeHtml(zone.name)}</h5><span>${escapeHtml(zone.minLevel)}–${escapeHtml(zone.maxLevel)}</span></div><p>${upcoming ? `Source-recommended range begins at level ${zone.minLevel}.` : `Your level is within this source-recommended range (${zone.minLevel}–${zone.maxLevel}).`}</p><small>${zone.faction === 'Contested' ? 'Contested zone' : `${escapeHtml(zone.faction)} access`}</small></article>`;
  const dungeonRows = data.dungeons.map(dungeon => `<li><strong>${escapeHtml(dungeon.name)}</strong><span>Levels ${escapeHtml(dungeon.minLevel)}–${escapeHtml(dungeon.maxLevel)}</span></li>`).join('');
  const checklistGroups = groupWarriorChecklistTasks(data.checklistTasks, data.level, checklistProgress, checklistFilter);
  const checklistProgressSummary = calculateWarriorChecklistProgress(data.checklistTasks, checklistProgress);
  const checklistItem = task => {
    const isComplete = checklistProgress.includes(task.id);
    const status = isComplete ? 'Completed' : task.level > data.level ? 'Upcoming' : task.level === data.level || (task.category === 'dungeon' && task.maxLevel >= data.level) ? 'Recommended now' : 'Earlier level · not checked off';
    const quest = task.classQuest;
    const questDetails = quest ? `<details class="wow-warrior-class-quest-details"><summary>Quest route, objectives and rewards</summary><dl><div><dt>Required level</dt><dd>${escapeHtml(quest.requiredLevel)}${quest.recommendedCompletionLevel != null && quest.recommendedCompletionLevel !== quest.requiredLevel ? ` · recommended completion around ${escapeHtml(quest.recommendedCompletionLevel)}` : ''}</dd></div>${quest.recommendedCompletionNote ? `<div><dt>Completion timing</dt><dd>${escapeHtml(quest.recommendedCompletionNote)}</dd></div>` : ''}<div><dt>Starting NPC and area</dt><dd>${escapeHtml(quest.startingNpc)} · ${escapeHtml(quest.location)}</dd></div>${quest.prerequisites?.length ? `<div><dt>Prerequisites</dt><dd>${escapeHtml(quest.prerequisites.join('; '))}</dd></div>` : ''}<div><dt>Objectives</dt><dd>${escapeHtml(quest.objectives)}</dd></div>${quest.routeOptions?.length ? `<div><dt>Available routes</dt><dd><ul>${quest.routeOptions.map(route => `<li><strong>${escapeHtml(route.npc)}</strong> · ${escapeHtml(route.location)} — ${escapeHtml(route.objective)}</li>`).join('')}</ul></dd></div>` : ''}<div><dt>Rewards</dt><dd>${escapeHtml(quest.rewards.join('; '))}</dd></div><div><dt>Group / risk</dt><dd>${escapeHtml(quest.groupRequirement)}</dd></div></dl></details>` : '';
    return `<li class="wow-warrior-checklist-item${isComplete ? ' is-complete' : ''}" data-task-category="${escapeHtml(task.category)}"><label><input type="checkbox" data-warrior-checklist-task="${escapeHtml(task.id)}"${isComplete ? ' checked' : ''}><span class="wow-warrior-checklist-icon" aria-hidden="true"></span><span class="wow-warrior-checklist-copy"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(status)} · ${escapeHtml(task.text)}</small></span></label>${questDetails}</li>`;
  };
  const checklistSection = (id, heading, tasks, isOpen = false) => `<details class="wow-warrior-checklist-group is-${id}" data-checklist-section="${id}"${isOpen ? ' open' : ''}><summary>${heading}<span>${tasks.length}</span></summary><div class="wow-warrior-checklist-content">${tasks.length ? `<ul>${tasks.map(checklistItem).join('')}</ul>` : '<p class="wow-warrior-leveling-empty">No milestones in this section.</p>'}</div></details>`;
  const talentAvailable = data.checklistTasks.some(task => task.category === 'talent');
  const current = data.currentZones.map(zone => zoneCard(zone)).join('');
  const upcoming = data.upcomingZones.map(zone => zoneCard(zone, true)).join('');
  const specializationTitle = ({ arms: 'Arms · solo and two-handed weapon focus', fury: 'Fury · damage and Rage focus', protection: 'Protection · defense and dungeon tanking' })[data.specializationId] || 'Specialization focus';
  const specializationSection = `<section class="wow-warrior-leveling-section wow-warrior-leveling-focus"><h4>${escapeHtml(specializationTitle)}</h4><p>${escapeHtml(data.specializationGuidance?.text || 'No verified specialization-specific leveling advice is recorded.')}</p></section>`;
  const preparationSection = data.preparationTips?.text ? `<section class="wow-warrior-leveling-section wow-warrior-leveling-preparation"><h4>Before moving on</h4><p>${escapeHtml(data.preparationTips.text)}</p></section>` : '<p class="wow-warrior-leveling-empty">No verified zone-transition preparation advice is recorded.</p>';
  return `<div class="wow-warrior-leveling-guide" data-warrior-leveling-guide><section class="wow-warrior-checklist" aria-labelledby="warrior-checklist-title"><div class="wow-warrior-checklist-heading"><div><h4 id="warrior-checklist-title">Leveling Checklist</h4><p>Track milestones manually; changing level never completes a task.</p></div><label for="warrior-checklist-filter">Filter<select id="warrior-checklist-filter" data-warrior-checklist-filter><option value="all"${checklistFilter === 'all' ? ' selected' : ''}>All tasks</option><option value="class-quest"${checklistFilter === 'class-quest' ? ' selected' : ''}>Class quests</option><option value="ability"${checklistFilter === 'ability' ? ' selected' : ''}>Abilities</option><option value="talent"${checklistFilter === 'talent' ? ' selected' : ''}>Talents</option><option value="equipment"${checklistFilter === 'equipment' ? ' selected' : ''}>Equipment</option><option value="dungeon"${checklistFilter === 'dungeon' ? ' selected' : ''}>Dungeons</option></select></label></div><div class="wow-warrior-checklist-progress"><span>${checklistProgressSummary.completed} / ${checklistProgressSummary.total} tasks complete</span><progress max="${checklistProgressSummary.total || 1}" value="${checklistProgressSummary.completed}" aria-label="Warrior leveling checklist completion">${checklistProgressSummary.percent}%</progress></div>${checklistSection('available', 'Available Now', checklistGroups.available, true)}${checklistSection('upcoming', 'Coming Up', checklistGroups.upcoming)}${checklistSection('completed', 'Completed / Earlier Levels', checklistGroups.completed)}${!talentAvailable ? '<p class="wow-warrior-leveling-empty">No exact talent milestone is recorded in the verified Warrior leveling data.</p>' : ''}</section><div class="wow-warrior-leveling-toolbar"><div><h4>Where should I go now?</h4><p>Level-fit zone options, not a ranked route.</p></div><label for="warrior-leveling-faction">Faction<select id="warrior-leveling-faction" data-companion-faction aria-label="Choose faction"><option value="Alliance"${data.faction === 'Alliance' ? ' selected' : ''}>Alliance</option><option value="Horde"${data.faction === 'Horde' ? ' selected' : ''}>Horde</option></select></label></div><p class="wow-warrior-leveling-note">Zone ranges are source-recommended ranges; faction filtering shows faction-specific and contested zones.</p>${specializationSection}<section class="wow-warrior-leveling-section"><h4>Recommended now <span>Level ${data.level}</span></h4>${current ? `<div class="wow-warrior-level-zones">${current}</div>` : '<p class="wow-warrior-leveling-empty">No faction-matched zone with a verified level range is recorded for this level.</p>'}</section><section class="wow-warrior-leveling-section is-upcoming"><h4>Upcoming zones <span>Coming up</span></h4>${upcoming ? `<div class="wow-warrior-level-zones">${upcoming}</div>` : '<p class="wow-warrior-leveling-empty">No upcoming faction-matched zone range is recorded.</p>'}</section>${preparationSection}<section class="wow-warrior-leveling-section"><h4>Dungeons for this level</h4>${dungeonRows ? `<ul class="wow-warrior-dungeon-list">${dungeonRows}</ul>` : '<p class="wow-warrior-leveling-empty">No verified dungeon range is recorded for this level.</p>'}</section>${data.unknownNames.length ? `<p class="wow-warrior-leveling-empty">Additional faction guide options have no level range in the source data: ${data.unknownNames.map(escapeHtml).join(', ')}.</p>` : ''}</div>`;
}

function renderWarriorDungeonPreparation(data, progress, escapeHtml) {
  const renderDungeon = (dungeon, state) => {
    const runCompleted = Boolean(progress[`${dungeon.id}:run`]);
    const checks = [
      { key: 'run', label: 'Dungeon completed', enabled: true },
      { key: 'quests', label: 'Documented quests completed', enabled: dungeon.quests.length > 0 },
      { key: 'gear', label: 'Desired equipment obtained', enabled: dungeon.equipment.length > 0 }
    ];
    const itemRows = dungeon.equipment.map(item => {
      const name = item.sourceUrl
        ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a>`
        : escapeHtml(item.name);
      const stats = item.stats?.length ? item.stats.join(' · ') : 'Stats not verified in the current record.';
      const acquisition = item.acquisition || (item.boss ? `Dropped by ${item.boss}.` : 'Acquisition method not recorded.');
      const specializations = (item.specializations || []).map(spec => ({ arms: 'Arms', fury: 'Fury', protection: 'Protection' })[spec] || spec).join(', ');
      const requirement = Number.isFinite(item.requiredLevel)
        ? data.level >= item.requiredLevel ? `Level ${item.requiredLevel} · eligible now` : `Level ${item.requiredLevel} · upcoming`
        : Number.isFinite(item.availabilityLevel) ? `Item minimum unlisted · source level ${item.availabilityLevel}` : 'Item minimum not listed';
      const factionRestriction = item.faction ? ` · <b>Faction:</b> ${escapeHtml(item.faction)} only` : '';
      const linkedId = item.equipmentId || item.id;
      return `<li data-equipment-id="${escapeHtml(linkedId || '')}"><strong>${name}</strong><small><b>Slot:</b> ${escapeHtml(item.slot || 'Not recorded')} · <b>Stats:</b> ${escapeHtml(stats)} · <b>Acquisition:</b> ${escapeHtml(acquisition)} · <b>Spec:</b> ${escapeHtml(specializations || 'Not recorded')} · <b>Required level:</b> ${escapeHtml(requirement)}${factionRestriction}. Compare with your current gear; a drop is not a guaranteed upgrade.</small></li>`;
    }).join('');
    const bossNames = dungeon.bosses || [];
    const quests = dungeon.quests.map(quest => `<li><strong>${escapeHtml(quest.name)}</strong><small>${escapeHtml(data.faction)} · minimum level ${escapeHtml(String(quest.min))} · ${escapeHtml(quest.npc || 'Quest giver not recorded')} · ${escapeHtml(quest.where || 'Quest giver location not recorded')} · ${escapeHtml(quest.stage)} · Rewards: ${escapeHtml(quest.rewards || 'Not listed')}. ${escapeHtml(quest.unlock || quest.outside || '')}</small></li>`).join('');
    const questList = dungeon.quests.length
      ? `<details class="wow-warrior-dungeon-quests"><summary>Faction quest records (${dungeon.quests.length})</summary><ul>${quests}</ul></details>`
      : `<p class="wow-warrior-dungeon-missing">No verified quest records for ${data.faction} are available here; this does not establish that no quests exist.</p>`;
    const checklist = checks.map(check => check.enabled
      ? `<label class="wow-warrior-dungeon-check${progress[`${dungeon.id}:${check.key}`] ? ' is-complete' : ''}"><input type="checkbox" data-warrior-dungeon-task="${escapeHtml(`${dungeon.id}:${check.key}`)}"${progress[`${dungeon.id}:${check.key}`] ? ' checked' : ''}><span>${escapeHtml(check.label)}</span></label>`
      : `<p class="wow-warrior-dungeon-missing">${escapeHtml(check.label)}: no related records to track.</p>`).join('');
    const bossSummary = bossNames.length
      ? `<p><strong>Important bosses:</strong> ${bossNames.map(escapeHtml).join(' · ')}</p>`
      : '<p class="wow-warrior-dungeon-missing">Important bosses are unavailable in the verified records for this dungeon.</p>';
    const dropSection = itemRows
      ? `<h6>Warrior Loot</h6><ul class="wow-warrior-dungeon-items">${itemRows}</ul>`
      : '<p class="wow-warrior-dungeon-missing">No Warrior-relevant drops are verified for this dungeon and specialization.</p>';
    return `<article class="wow-warrior-dungeon-card${state === 'available' ? ' is-recommended' : ' is-upcoming'}${runCompleted ? ' is-run-complete' : ''}"><details class="wow-warrior-dungeon-details"><summary><span><small>${state === 'available' ? 'Recommended at your level' : 'Coming up'}</small><strong>${escapeHtml(dungeon.name)}</strong></span><span class="wow-warrior-dungeon-range">Levels ${escapeHtml(dungeon.levelRange)}</span></summary><div class="wow-warrior-dungeon-detail-content"><dl><div><dt>Location</dt><dd>${escapeHtml(dungeon.location || 'No verified location is recorded.')}</dd></div><div><dt>Entrance</dt><dd>${escapeHtml(dungeon.entrance || 'No verified entrance directions are recorded.')}</dd></div></dl><p class="wow-warrior-dungeon-access"><strong>${escapeHtml(data.faction)}:</strong> Quest list availability only; instance entry restrictions are not recorded.</p>${dungeon.note ? `<p class="wow-warrior-dungeon-note">${escapeHtml(dungeon.note)}</p>` : ''}<section class="wow-warrior-dungeon-why">${bossSummary}${dropSection}${questList}</section></div></details><section class="wow-warrior-dungeon-checklist" aria-label="${escapeHtml(dungeon.name)} preparation checklist"><h6>Preparation checklist</h6>${checklist}</section></article>`;
  };
  const cardGrid = (dungeons, state) => dungeons.length
    ? `<div class="wow-warrior-dungeon-grid">${dungeons.map(dungeon => renderDungeon(dungeon, state)).join('')}</div>`
    : `<p class="wow-warrior-dungeon-empty">${state === 'available' ? `No verified dungeon range includes level ${data.level}.` : 'No upcoming verified dungeon range is recorded.'}</p>`;
  const preparation = data.preparation
    ? `<section class="wow-warrior-dungeon-preparation"><h4>Before You Enter · ${escapeHtml(data.specializationName)} · ${escapeHtml(data.preparation.label)}</h4><p>${escapeHtml(data.preparation.advice)}</p></section>`
    : '<p class="wow-warrior-dungeon-empty">No verified preparation advice is recorded for this specialization.</p>';
  return `<div class="wow-warrior-dungeons" data-warrior-dungeons><p class="wow-warrior-dungeon-intro">Dungeon suggestions update with your level and specialization. Recommended ranges are guide ranges, not an entry-level guarantee.</p>${preparation}<section class="wow-warrior-dungeon-section"><h4>Recommended now <span>Level ${data.level}</span></h4>${cardGrid(data.available, 'available')}</section><section class="wow-warrior-dungeon-section is-upcoming"><h4>Coming up</h4>${cardGrid(data.comingUp, 'upcoming')}</section><p class="wow-warrior-dungeon-disclosure">Quest availability is filtered by faction when quest records exist. A missing location, quest, boss, or item record is a data gap, not evidence that none exists.</p></div>`;
}

export function renderLevelingCompanion({ classId, currentLevel = 1, selectedSpecialization = '', guideData = {}, progressionEngine = {}, escapeHtml = escapeText, storage } = {}) {
  progressionEngine = { ...progressionEngine, storage };
  const classRecord = guideData.classRecord || {};
  const specializations = classRecord.specializations || guideData.specializations || [];
  const state = loadCompanionState(classId, { level: currentLevel, specializationId: selectedSpecialization, tab: 'overview' }, specializations, storage);
  const prefix = String(classId || 'class').replace(/[^a-z0-9-]/gi, '-');
  const options = specializations.map(spec => `<option value="${escapeHtml(spec.id)}"${spec.id === state.specializationId ? ' selected' : ''}>${escapeHtml(spec.name)} · ${escapeHtml(spec.role)}</option>`).join('');
  const tabs = tabsForClass(classId).map(tab => `<button type="button" role="tab" id="${prefix}-companion-tab-${tab}" aria-controls="${prefix}-companion-panel" aria-selected="${state.tab === tab}" tabindex="${state.tab === tab ? '0' : '-1'}" data-companion-tab="${tab}">${COMPANION_TAB_LABELS[tab]}</button>`).join('');
  const title = `${classRecord.name || classId} Guide`;
  const specializationControl = ['warrior', 'shaman'].includes(classId)
    ? `<select id="${prefix}-companion-spec" data-companion-spec hidden aria-hidden="true" tabindex="-1">${options}</select>`
    : `<label for="${prefix}-companion-spec">Specialization</label><select id="${prefix}-companion-spec" data-companion-spec>${options}</select>`;
  const levelSlider = `<input id="${prefix}-companion-level" type="range" min="1" max="60" step="1" value="${state.level}" aria-label="Current level" aria-valuetext="Level ${state.level}" data-companion-level-input>`;
  const levelControl = classId === 'warrior'
    ? `<div class="wow-companion-level-stepper"><button type="button" data-companion-level-step="-1"${state.level <= 1 ? ' disabled' : ''}>← Previous</button>${levelSlider}<button type="button" data-companion-level-step="1"${state.level >= 60 ? ' disabled' : ''}>Next →</button></div>`
    : levelSlider;
  const checklistProgress = classId === 'warrior' ? loadWarriorChecklistProgress(storage) : [];
  const dungeonProgress = classId === 'warrior' ? loadWarriorDungeonProgress(storage) : {};
  return `<section class="wow-leveling-companion" data-leveling-companion data-class-id="${escapeHtml(classId)}" style="--class-accent:${escapeHtml(classRecord.color || '#c79c6e')}" aria-labelledby="${prefix}-companion-title"><header><div><p class="wow-companion-kicker">Field guide · ${escapeHtml(classRecord.name || classId)}</p><h2 id="${prefix}-companion-title">${title}</h2></div><span data-companion-level-badge>Level ${state.level}</span></header><div class="wow-companion-controls"><label for="${prefix}-companion-level">Current level <output data-companion-level>${state.level}</output></label>${levelControl}${specializationControl}</div><div class="wow-companion-tabs" role="tablist" aria-label="${escapeHtml(classRecord.name || classId)} companion guide">${tabs}</div><div class="wow-companion-panel" id="${prefix}-companion-panel" role="tabpanel" tabindex="0" aria-labelledby="${prefix}-companion-tab-${state.tab}" data-companion-panel>${renderPanel(state, guideData, escapeHtml, progressionEngine, storage, 'all', 'mining-blacksmithing', checklistProgress, 'all', dungeonProgress)}</div><span class="visually-hidden" data-companion-status role="status" aria-live="polite"></span></section>`;
}

export function initializeLevelingCompanion(root, { classId, currentLevel = 1, selectedSpecialization = '', guideData = {}, progressionEngine = {}, storage } = {}) {
  const companion = root.querySelector('[data-leveling-companion]');
  if (!companion || companion.dataset.companionInitialized) return;
  companion.dataset.companionInitialized = 'true';
  const classRecord = guideData.classRecord || {};
  const specializations = classRecord.specializations || guideData.specializations || [];
  const escapeHtml = escapeText;
  let state = loadCompanionState(classId, { level: currentLevel, specializationId: selectedSpecialization, tab: 'overview' }, specializations, storage);
  let gearFilter = 'all';
  let professionChoice = 'mining-blacksmithing';
  let checklistProgress = classId === 'warrior' ? loadWarriorChecklistProgress(storage) : [];
  let checklistFilter = 'all';
  let dungeonProgress = classId === 'warrior' ? loadWarriorDungeonProgress(storage) : {};
  const levelInput = companion.querySelector('[data-companion-level-input]');
  const levelOutput = companion.querySelector('[data-companion-level]');
  const levelBadge = companion.querySelector('[data-companion-level-badge]');
  const previousLevelButton = companion.querySelector('[data-companion-level-step="-1"]');
  const nextLevelButton = companion.querySelector('[data-companion-level-step="1"]');
  const specializationSelect = companion.querySelector('[data-companion-spec]');
  const panelElement = companion.querySelector('[data-companion-panel]');
  const status = companion.querySelector('[data-companion-status]');
  const tabs = [...companion.querySelectorAll('[data-companion-tab]')];

  const update = change => {
    state = classId === 'shaman' && change.specializationId && change.specializationId !== state.specializationId
      ? loadCompanionState(classId, { ...state, ...change }, specializations, storage, false)
      : updateCompanionState(classId, state, change, specializations);
    levelInput.value = String(state.level);
    levelInput.setAttribute('aria-valuetext', `Level ${state.level}`);
    levelOutput.value = String(state.level);
    levelOutput.textContent = String(state.level);
    levelBadge.textContent = `Level ${state.level}`;
    if (previousLevelButton) previousLevelButton.disabled = state.level <= 1;
    if (nextLevelButton) nextLevelButton.disabled = state.level >= 60;
    specializationSelect.value = state.specializationId;
    for (const tab of tabs) {
      const selected = tab.dataset.companionTab === state.tab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    panelElement.setAttribute('aria-labelledby', `${classId}-companion-tab-${state.tab}`);
    panelElement.innerHTML = renderPanel(state, guideData, escapeHtml, progressionEngine, storage, gearFilter, professionChoice, checklistProgress, checklistFilter, dungeonProgress);
    if (!saveCompanionState(state, storage) && status) status.textContent = 'This browser could not save companion preferences.';
    else if (status) status.textContent = '';
  };

  companion.addEventListener('input', event => {
    if (event.target.matches('[data-companion-level-input]')) update({ level: event.target.value });
  });
  companion.addEventListener('change', event => {
    if (event.target.matches('[data-companion-spec]')) update({ specializationId: event.target.value });
    if (event.target.matches('[data-companion-faction]')) update({ faction: event.target.value });
    if (event.target.matches('[data-warrior-dungeon-task]')) {
      const taskId = event.target.dataset.warriorDungeonTask;
      dungeonProgress = { ...dungeonProgress, [taskId]: event.target.checked };
      const saved = saveWarriorDungeonProgress(dungeonProgress, storage);
      panelElement.innerHTML = renderPanel(state, guideData, escapeHtml, progressionEngine, storage, gearFilter, professionChoice, checklistProgress, checklistFilter, dungeonProgress);
      [...panelElement.querySelectorAll('[data-warrior-dungeon-task]')].find(input => input.dataset.warriorDungeonTask === taskId)?.focus();
      if (!saved && status) status.textContent = 'This browser could not save dungeon preparation progress.';
    }
    if (event.target.matches('[data-warrior-checklist-filter]')) {
      checklistFilter = WARRIOR_CHECKLIST_CATEGORIES.includes(event.target.value) ? event.target.value : 'all';
      panelElement.innerHTML = renderPanel(state, guideData, escapeHtml, progressionEngine, storage, gearFilter, professionChoice, checklistProgress, checklistFilter, dungeonProgress);
    }
    if (event.target.matches('[data-warrior-checklist-task]')) {
      const taskId = event.target.dataset.warriorChecklistTask;
      const openSections = [...panelElement.querySelectorAll('[data-checklist-section]')]
        .filter(section => section.open).map(section => section.dataset.checklistSection);
      checklistProgress = event.target.checked ? [...checklistProgress, taskId] : checklistProgress.filter(id => id !== taskId);
      const saved = saveWarriorChecklistProgress(checklistProgress, storage);
      panelElement.innerHTML = renderPanel(state, guideData, escapeHtml, progressionEngine, storage, gearFilter, professionChoice, checklistProgress, checklistFilter, dungeonProgress);
      for (const section of panelElement.querySelectorAll('[data-checklist-section]')) section.open = openSections.includes(section.dataset.checklistSection);
      const changedTask = [...panelElement.querySelectorAll('[data-warrior-checklist-task]')]
        .find(input => input.dataset.warriorChecklistTask === taskId);
      changedTask?.closest('[data-checklist-section]')?.setAttribute('open', '');
      changedTask?.focus();
      if (!saved && status) status.textContent = 'This browser could not save checklist progress.';
    }
  });
  companion.addEventListener('click', event => {
    const gearFilterButton = event.target.closest?.('[data-companion-gear-filter]');
    if (gearFilterButton) {
      gearFilter = gearFilterButton.dataset.companionGearFilter;
      panelElement.innerHTML = renderPanel(state, guideData, escapeHtml, progressionEngine, storage, gearFilter, professionChoice, checklistProgress, checklistFilter, dungeonProgress);
      return;
    }
    const professionButton = event.target.closest?.('[data-profession-choice]');
    if (professionButton) {
      professionChoice = professionButton.dataset.professionChoice;
      panelElement.innerHTML = renderPanel(state, guideData, escapeHtml, progressionEngine, storage, gearFilter, professionChoice, checklistProgress, checklistFilter, dungeonProgress);
      return;
    }
    const levelStep = event.target.closest?.('[data-companion-level-step]');
    if (levelStep) {
      update({ level: state.level + Number(levelStep.dataset.companionLevelStep) });
      return;
    }
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
