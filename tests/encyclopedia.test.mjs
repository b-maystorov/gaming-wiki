import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { SourceTextModule, createContext } from 'node:vm';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '..');
const artworkManifest = JSON.parse(await readFile(resolve(root, 'dist/data/games/darkest-dungeon-1-artwork.json'), 'utf8'));
const pack = JSON.parse(await readFile(resolve(root, 'dist/data/games/darkest-dungeon-1.json'), 'utf8'));

// Execute real ES modules and loading code. Only browser event registration is excluded;
// the minimal DOM supports filter/render assertions, not browser layout or interaction claims.
async function harness(failure = null, storageMode = 'available') {
  const elements = new Map();
  const storedValues = new Map();
  let cards = [];
  let extraFilters = [];
  const globals = { console: { error() {} }, URL,
    location: { hash: '' },
    document: {
      querySelector: () => ({ addEventListener() {} }),
      getElementById: id => elements.get(id),
      querySelectorAll: selector => selector === '[data-encyclopedia-card]' ? cards
        : selector === '[data-encyclopedia-filter]' ? extraFilters : []
    },
    fetch: async url => {
      if (String(url).endsWith('-artwork.json')) return { ok: true, json: async () => structuredClone(artworkManifest) };
      if (failure === 'network') throw new Error('Network unavailable');
      return { ok: failure !== 'http', status: 404, json: async () => {
        if (failure === 'json') throw new SyntaxError('Invalid JSON');
        return failure === 'shape' ? {} : structuredClone(pack);
      } };
    }
  };
  if (storageMode === 'available') globals.localStorage = { getItem: key => storedValues.get(key) ?? null, setItem: (key, value) => storedValues.set(key, String(value)), removeItem: key => storedValues.delete(key) };
  if (storageMode === 'inaccessible') globals.localStorage = { getItem() { throw new Error('Storage denied'); }, setItem() { throw new Error('Storage denied'); } };
  const context = createContext(globals);
  const modules = new Map();
  async function load(path) {
    if (modules.has(path)) return modules.get(path);
    let source = await readFile(path, 'utf8');
    if (path.endsWith('/app.js')) {
      source = source.slice(0, source.indexOf("document.querySelector('.skip-link')"));
      source += '\nexport { renderPage, readRoute, renderEncyclopediaDetail, renderEncyclopediaCollection, filterEncyclopedia, renderSearchResults, getTrinkets, teamMatchesFilters, getOwnedTrinketIds, setOwnedTrinket, clearOwnedTrinkets, renderTrinketOwnershipControl, renderTeamEquipmentReadinessContent, plannerBosses, updateExpeditionPlannerOptions, renderPlannerTeam, renderPlannerEquipmentStep, selectExpeditionTeam, sortedPlannerTeams, getExpeditionRoster, saveExpeditionRoster, renderExpeditionPlanner, renderPlannerRegionRecords, renderExpeditionPlannerResults };';
    }
    const module = new SourceTextModule(source, { context, identifier: path,
      initializeImportMeta: meta => { meta.url = `file://${path}`; } });
    modules.set(path, module);
    await module.link((specifier, parent) => load(resolve(dirname(parent.identifier), specifier)));
    return module;
  }
  const app = await load(resolve(root, 'dist/js/app.js'));
  await app.evaluate();
  return { app: app.namespace, modules, context, storedValues, elements,
    filter(kind, value, records, extras = []) {
      context.location.hash = `#game/darkest-dungeon/${kind}`;
      elements.set('encyclopedia-filter', { value });
      elements.set('encyclopedia-search', { value: '' });
      cards = records.map(record => ({ href: `http://localhost/#game/darkest-dungeon/${kind}/${record.routeId}`, dataset: { searchText: '' } }));
      extraFilters = extras.map(([field, value]) => ({ dataset: { encyclopediaFilter: field }, value }));
      app.namespace.filterEncyclopedia();
      return records.filter((_, index) => !cards[index].hidden);
    }
  };
}

const h = await harness();
const helpers = h.modules.get(resolve(root, 'dist/js/encyclopedia.js')).namespace;

test('quest categories and trinket rarities use their own fields', () => {
  assert.equal(h.filter('quests', 'duration', pack.quests).length, 3);
  assert.equal(h.filter('quests', 'all', pack.quests).length, 12);
  for (const rarity of new Set(pack.trinkets.map(record => record.rarity))) {
    assert.equal(h.filter('trinkets', rarity, pack.trinkets).length, pack.trinkets.filter(record => record.rarity === rarity).length);
  }
  assert.equal(helpers.matchesCollectionFilter('trinkets', { rarity: 'Rare', regionIds: ['ruins'] }, 'Rare'), true);
  assert.equal(h.filter('locations', pack.locations[0].regionId, pack.locations).length, 1);
});

test('class restrictions remain separate from recommendation associations', () => {
  const restricted = h.filter('trinkets', 'all', pack.trinkets, [['class', 'highwayman']]);
  assert.ok(!restricted.some(record => record.routeId === 'focus-ring'));
  assert.ok(restricted.some(record => record.routeId === 'gunslingers-buckle'));
  assert.deepEqual(pack.trinkets.find(record => record.routeId === 'focus-ring').heroRouteIds, ['highwayman']);
  assert.ok(h.app.getTrinkets().some(record => record.routeId === 'focus-ring'));
  assert.equal(pack.trinkets.filter(record => record.classRestrictionHeroRouteIds?.length).length, 5);
});

test('collection and both global searches include relationships and every interaction', () => {
  const cases = [
    ['locations', 'ruins', 'Bone Soldier'], ['locations', 'ruins', 'Necromancer'],
    ['locations', 'ruins', 'Alchemy Table'], ['curios', 'alchemy-table', 'Possible Blight'],
    ['curios', 'alchemy-table', 'Medicinal Herbs'], ['items', 'medicinal-herbs', 'Alchemy Table']
  ];
  const search = h.modules.get(resolve(root, 'dist/js/command-center.js')).namespace;
  const index = search.createSearchIndex(pack.bosses, pack);
  for (const [kind, routeId, query] of cases) {
    const record = pack[kind].find(entry => entry.routeId === routeId);
    assert.ok(helpers.encyclopediaSearchText(kind, record, pack).includes(query.toLowerCase()));
    const html = h.app.renderEncyclopediaCollection(kind);
    const cardText = [...html.matchAll(/data-search-text="([^"]+)"[^>]+href="([^"]+)"/g)]
      .find(match => match[2].endsWith('/' + routeId))?.[1];
    assert.ok(cardText?.includes(query.toLowerCase()), `${kind}/${routeId}: ${query}`);
    const href = `#game/darkest-dungeon/${kind}/${routeId}`;
    assert.ok(h.app.renderSearchResults(query).markup.includes(href));
    assert.ok(search.searchEntries(index, query).some(entry => entry.href === href));
  }
});

test('location details use one main artwork and refreshed collections retain visible record data', () => {
  const ruins = pack.locations.find(record => record.routeId === 'ruins');
  const locationHtml = h.app.renderEncyclopediaDetail('locations', ruins);
  assert.equal((locationHtml.match(/entry-art-locations/g) || []).length, 1, 'location detail should render one location artwork frame');
  assert.ok(locationHtml.includes('entry-art-locations entry-art-banner'));
  assert.ok(locationHtml.includes('location-art-fallback'));

  const itemHtml = h.app.renderEncyclopediaCollection('items');
  const curioHtml = h.app.renderEncyclopediaCollection('curios');
  const trinketHtml = h.app.renderEncyclopediaCollection('trinkets');
  assert.ok(itemHtml.includes('encyclopedia-grid-items'));
  assert.ok(curioHtml.includes('curio-card-outcomes'));
  assert.ok(curioHtml.includes('Possible Blight'));
  assert.ok(trinketHtml.includes('encyclopedia-grid-trinkets'));
  assert.ok(trinketHtml.includes('Very rare'));
  assert.ok(trinketHtml.includes('+10 ACC'));
});

test('location guides organize linked expedition records and preserve recorded item and team links', () => {
  const ruins = pack.locations.find(record => record.routeId === 'ruins');
  const html = h.app.renderEncyclopediaDetail('locations', ruins);
  for (const heading of ['Region overview', 'Main enemies & threats', 'Available bosses', 'Relevant curios', 'Useful provisions & interactions', 'Special mechanics', 'Related team compositions', 'Expedition preparation']) {
    assert.ok(html.includes(heading), `Ruins guide should include ${heading}`);
  }
  for (const [kind, routeId] of [['enemies', 'bone-soldier'], ['bosses', 'necromancer'], ['curios', 'alchemy-table'], ['items', 'medicinal-herbs']]) {
    assert.ok(html.includes(`#game/darkest-dungeon/${kind}/${routeId}`), `Ruins guide should link ${kind}/${routeId}`);
  }
  const associatedTeams = pack.bosses.find(boss => boss.routeId === 'necromancer').counterTeams;
  for (const team of associatedTeams) assert.ok(html.includes(`#game/darkest-dungeon/teams/${team.id}`));
  assert.ok(!html.includes('No boss-specific teams are recorded'), 'a region with supported boss teams should show those teams');
  assert.ok(html.includes('location-boss-card') && html.includes('location-curio-card'));
  assert.ok(html.includes('location-boss-fallback') && html.includes('location-curio-fallback'));

  const courtyard = pack.locations.find(record => record.routeId === 'courtyard');
  const courtyardHtml = h.app.renderEncyclopediaDetail('locations', courtyard);
  assert.ok(courtyardHtml.includes('DLC: The Crimson Court'));
  assert.ok(courtyardHtml.includes('general-purpose compositions remain unassessed'));
});

test('trinket index groups existing rarity metadata and shows verification and source status', () => {
  const html = h.app.renderEncyclopediaCollection('trinkets');
  const rarities = [...new Set(pack.trinkets.map(record => record.rarity))];
  for (const rarity of rarities) {
    assert.ok(html.includes(`data-trinket-rarity="${rarity}"`), `missing rarity group ${rarity}`);
  }
  assert.ok(html.includes('Sources: Trinkets (Darkest Dungeon)'));
  assert.ok(html.includes('Reference-checked'));
  assert.ok(html.includes('DLC: The Crimson Court'));
});

test('team build alternatives resolve to compatible canonical trinkets and ownership stays local', () => {
  const trinketRoutes = new Set(pack.trinkets.map(item => item.routeId));
  const teams = pack.bosses.flatMap(boss => boss.counterTeams || []);
  for (const team of teams) for (const member of team.members) {
    assert.ok(member.budgetPriorities?.length, `${team.id}/${member.heroRouteId} needs an equipment fallback`);
    for (const id of member.alternativeTrinketIds || []) {
      assert.ok(trinketRoutes.has(id), `${team.id}: unknown alternative ${id}`);
      const trinket = pack.trinkets.find(item => item.routeId === id);
      assert.ok(!trinket.classRestrictionHeroRouteIds?.length || trinket.classRestrictionHeroRouteIds.includes(member.heroRouteId));
      assert.ok(!member.trinketIds.includes(id), 'alternative should not duplicate recommended equipment');
    }
  }
  const page = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon/teams/darkest-dungeon-1:boss-team:swine-prince-mark-removal'));
  assert.ok(page.includes('Alternative options'));
  assert.ok(page.includes('Budget fallback'));
  assert.ok(page.includes('Equipment Readiness'));
  assert.ok(page.includes('Missing equipment does not make this team unusable'));
  assert.match(page, /aria-label="Mark Damage Stone as owned"(?! checked)/);
  h.app.setOwnedTrinket('darkest-dungeon-1:trinket:damage-stone', true);
  assert.ok(h.app.getOwnedTrinketIds().includes('darkest-dungeon-1:trinket:damage-stone'));
  assert.ok(h.storedValues.has('bm-gaming-wiki-owned-trinkets'));
  assert.deepEqual(JSON.parse(h.storedValues.get('bm-gaming-wiki-owned-trinkets')), ['darkest-dungeon-1:trinket:damage-stone']);
  const ownedPage = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon/teams/darkest-dungeon-1:boss-team:swine-prince-mark-removal'));
  assert.match(ownedPage, /aria-label="Mark Damage Stone as owned" checked/);
  assert.match(ownedPage, /data-team-equipment-readiness[^]*?Damage Stone/);
  const bossPage = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon/bosses/swine-prince'));
  assert.match(bossPage, /Equipment checklist: \d+\/\d+ recommended trinkets marked owned/);
  h.app.setOwnedTrinket('darkest-dungeon-1:trinket:damage-stone', false);
  assert.ok(!h.app.getOwnedTrinketIds().includes('darkest-dungeon-1:trinket:damage-stone'));
});

test('trinket collection and detail pages expose ownership controls keyed by canonical IDs', () => {
  const first = pack.trinkets[0];
  const collection = h.app.renderEncyclopediaCollection('trinkets');
  assert.ok(collection.includes(`data-owned-trinket="${first.id}"`));
  assert.ok(collection.includes('data-clear-owned-trinkets'));
  const detail = h.app.renderEncyclopediaDetail('trinkets', first);
  assert.ok(detail.includes(`data-owned-trinket="${first.id}"`));
  assert.ok(detail.includes('Ownership is stored only in this browser'));
});

test('ownership loads, toggles, clears, migrates route IDs, and drops stale IDs', async () => {
  const local = await harness();
  const id = pack.trinkets[0].id;
  local.storedValues.set('bm-gaming-wiki-owned-trinkets', JSON.stringify(['focus-ring', 'stale-trinket-id']));
  assert.deepEqual(Array.from(local.app.getOwnedTrinketIds()), [id]);
  assert.deepEqual(JSON.parse(local.storedValues.get('bm-gaming-wiki-owned-trinkets')), [id]);
  assert.deepEqual(Array.from(local.app.setOwnedTrinket(id, true).ids), [id]);
  assert.deepEqual(Array.from(local.app.setOwnedTrinket(id, false).ids), []);
  local.app.setOwnedTrinket(id, true);
  const cleared = local.app.clearOwnedTrinkets();
  assert.deepEqual({ ...cleared, ids: Array.from(cleared.ids) }, { ids: [], persisted: true });
  assert.deepEqual(Array.from(local.app.getOwnedTrinketIds()), []);
  assert.deepEqual(Array.from(local.app.setOwnedTrinket('not-a-trinket', true).ids), []);
});

test('ownership remains usable when browser storage is missing or inaccessible', async () => {
  for (const mode of ['missing', 'inaccessible']) {
    const local = await harness(null, mode);
    const id = pack.trinkets[0].id;
    assert.doesNotThrow(() => local.app.getOwnedTrinketIds());
    assert.equal(local.app.setOwnedTrinket(id, true).persisted, false);
    assert.deepEqual(Array.from(local.app.getOwnedTrinketIds()), [id]);
    assert.equal(local.app.clearOwnedTrinkets().persisted, false);
    assert.deepEqual(Array.from(local.app.getOwnedTrinketIds()), []);
  }
});

test('team readiness links only recorded alternatives and does not invent fallback trinkets', () => {
  const teams = pack.bosses.flatMap(boss => (boss.counterTeams || []).map(team => ({ ...team, boss })));
  for (const team of teams) for (const member of team.members) {
    const html = h.app.renderTeamEquipmentReadinessContent(team);
    const alternatives = member.alternativeTrinketIds || [];
    for (const routeId of alternatives) {
      const record = pack.trinkets.find(item => item.routeId === routeId);
      assert.ok(record, `${team.id}: alternative must resolve from canonical data`);
      assert.ok(html.includes(`#game/darkest-dungeon/trinkets/${routeId}`), `${team.id}: recorded alternative should be linked by the build`);
    }
    assert.ok(html.includes('Missing equipment does not make this team unusable'));
    assert.ok(html.includes('rate team power'));
    assert.ok(member.budgetPriorities, `${team.id}/${member.heroRouteId}: attribute fallback remains explicit`);
  }
});

test('expedition planner route and region boss choices use only recorded location associations', () => {
  const route = h.app.readRoute('#game/darkest-dungeon/expedition-planner');
  assert.equal(route.view, 'expedition-planner');
  const page = h.app.renderPage(route);
  assert.ok(page.includes('Expedition Planner'));
  assert.ok(page.includes('id="planner-region"'));
  assert.ok(page.includes('id="planner-boss"'));
  assert.ok(page.includes('data-reset-expedition-roster'));
  for (const [id, label] of [['planner-step-expedition', 'Expedition'], ['planner-step-party', 'Party'], ['planner-step-equipment', 'Equipment'], ['planner-step-battle', 'Battle plan']]) {
    assert.ok(page.includes(`id="${id}"`), `planner should include ${id}`);
    assert.ok(page.includes(`data-planner-step="${id}"`), `step navigation should include ${label}`);
  }
  const ruins = pack.locations.find(location => location.routeId === 'ruins');
  const warrens = pack.locations.find(location => location.routeId === 'warrens');
  const necromancer = pack.bosses.find(boss => boss.routeId === 'necromancer');
  const ruinsBosses = h.app.plannerBosses(ruins);
  assert.ok(ruinsBosses.some(boss => boss.routeId === 'necromancer'));
  assert.ok(!ruinsBosses.some(boss => boss.routeId === 'swine-prince'));
  assert.ok(h.app.plannerBosses(warrens).some(boss => boss.routeId === 'swine-prince'));
  const locationMarkup = h.app.renderPlannerRegionRecords(ruins);
  assert.ok(locationMarkup.includes('#game/darkest-dungeon/bosses/necromancer'));
  assert.ok(locationMarkup.includes('#game/darkest-dungeon/enemies/'));
  assert.ok(locationMarkup.includes('#game/darkest-dungeon/curios/'));
  assert.ok(locationMarkup.includes('Known provision interactions'));
  const games = h.modules.get(resolve(root, 'dist/js/games.js')).namespace.games;
  assert.ok(games['darkest-dungeon'].categories.some(category => category.id === 'expedition-planner' && category.view === 'expedition-planner'));
  const regionSelect = { value: ruins.regionId };
  const bossSelect = { value: '', disabled: true, innerHTML: '' };
  const difficultySelect = { value: '', disabled: true, innerHTML: '' };
  h.elements.set('planner-region', regionSelect);
  h.elements.set('planner-boss', bossSelect);
  h.elements.set('planner-difficulty', difficultySelect);
  h.app.updateExpeditionPlannerOptions();
  assert.equal(bossSelect.disabled, false);
  assert.ok(bossSelect.innerHTML.includes(necromancer.id));
  assert.ok(!bossSelect.innerHTML.includes('swine-prince'));
  bossSelect.value = necromancer.id;
  h.app.updateExpeditionPlannerOptions();
  assert.equal(difficultySelect.disabled, false);
  assert.ok(difficultySelect.innerHTML.includes('Apprentice'));
  bossSelect.value = pack.bosses.find(boss => boss.routeId === 'swine-prince').id;
  h.app.updateExpeditionPlannerOptions();
  assert.equal(bossSelect.value, '', 'changing region should clear a now-unsupported boss');
});

test('expedition planner roster distinguishes unknown, available and missing heroes without hiding teams', async () => {
  const local = await harness();
  const swine = pack.bosses.find(boss => boss.routeId === 'swine-prince');
  const team = { ...swine.counterTeams[0], boss: swine };
  assert.equal(local.app.getExpeditionRoster(), null);
  const unknownMarkup = local.app.renderPlannerTeam(team, local.app.getExpeditionRoster());
  assert.ok(unknownMarkup.includes('Roster availability unknown'));
  assert.ok(unknownMarkup.includes(`#game/darkest-dungeon/teams/${team.id}`));
  const partialRoster = { initialized: true, heroIds: ['arbalest', 'hellion'] };
  assert.equal(local.app.saveExpeditionRoster(partialRoster), true);
  assert.ok(local.storedValues.has('bm-gaming-wiki-available-heroes'));
  const partialMarkup = local.app.renderPlannerTeam(team, local.app.getExpeditionRoster());
  assert.ok(partialMarkup.includes('Missing 2 marked heroes'));
  assert.ok(partialMarkup.includes('Occultist'));
  assert.ok(partialMarkup.includes('Houndmaster'));
  assert.ok(partialMarkup.includes(`#game/darkest-dungeon/teams/${team.id}`), 'partial roster must not hide a useful team guide');
  local.app.saveExpeditionRoster({ initialized: true, heroIds: [] });
  assert.notEqual(local.app.getExpeditionRoster(), null, 'an explicitly empty roster is different from unknown');
  assert.ok(local.app.renderPlannerTeam(team, local.app.getExpeditionRoster()).includes('Missing 4 marked heroes'));
  const complete = { initialized: true, heroIds: team.members.map(member => member.heroRouteId) };
  local.app.saveExpeditionRoster(complete);
  assert.ok(local.app.renderPlannerTeam(team, local.app.getExpeditionRoster()).includes('All required heroes marked available'));
  local.app.saveExpeditionRoster({ initialized: true, heroIds: ['stale-hero-id'] });
  assert.deepEqual(Array.from(local.app.getExpeditionRoster().heroIds), []);
});

test('selecting a team preserves expedition selections and opens per-hero equipment with duplicate-copy warnings', async () => {
  const local = await harness();
  const boss = pack.bosses.find(entry => entry.routeId === 'necromancer');
  const team = boss.counterTeams[0];
  const region = pack.locations.find(entry => entry.routeId === 'ruins');
  const selectors = {
    'planner-region': { value: region.regionId },
    'planner-boss': { value: boss.id },
    'planner-difficulty': { value: 'Apprentice' },
    'planner-equipment-content': { innerHTML: '' },
    'planner-battle-content': { innerHTML: '' }
  };
  for (const [id, element] of Object.entries(selectors)) local.elements.set(id, element);
  const repeated = team.members[0].trinketIds.find(id => team.members.filter(member => member.trinketIds.includes(id)).length > 1);
  const repeatedRecord = pack.trinkets.find(item => item.routeId === repeated);
  local.app.setOwnedTrinket(repeatedRecord.id, true);
  assert.equal(local.app.selectExpeditionTeam(team.id), true);
  assert.equal(selectors['planner-region'].value, region.regionId);
  assert.equal(selectors['planner-boss'].value, boss.id);
  assert.equal(selectors['planner-difficulty'].value, 'Apprentice');
  const equipment = selectors['planner-equipment-content'].innerHTML;
  assert.ok(equipment.includes('Damage Stone</a> is recommended for 4 heroes'));
  assert.ok(equipment.includes('yes/no checklist, not an inventory count'));
  assert.match(equipment, new RegExp(`data-owned-trinket="${repeatedRecord.id}"[^>]* checked`));
  assert.ok(equipment.includes('Recorded alternatives'));
  assert.ok(selectors['planner-battle-content'].innerHTML.includes('Necromancer quick reminder'));
  assert.equal(local.app.selectExpeditionTeam('unrelated-team-id'), false);
});

test('expedition planner filters related teams by supported boss and provides fallback artwork', async () => {
  const local = await harness();
  const region = pack.locations.find(location => location.routeId === 'ruins');
  const necromancer = pack.bosses.find(boss => boss.routeId === 'necromancer');
  local.elements.set('planner-region', { value: region.regionId });
  local.elements.set('planner-boss', { value: necromancer.id });
  local.elements.set('planner-difficulty', { value: 'Apprentice' });
  const result = local.app.renderExpeditionPlannerResults();
  assert.ok(result.includes('Necromancer quick reminder'));
  assert.ok(result.includes('Apprentice'));
  assert.ok(result.includes(necromancer.counterTeams[0].name));
  const swineTeamId = pack.bosses.find(boss => boss.routeId === 'swine-prince').counterTeams[0].id;
  assert.ok(!result.includes(swineTeamId), 'a boss outside this selected association must not appear as a team recommendation');
  assert.ok(result.includes('Select a team in Party'));
  assert.ok(result.includes('No local image') || result.includes('data-art-kind="locations"'), 'region art must retain its local image or designed fallback');
  local.elements.set('planner-boss', { value: '' });
  const regionTeams = local.app.renderExpeditionPlannerResults();
  assert.ok(regionTeams.includes(necromancer.counterTeams[0].id));
  assert.ok(!regionTeams.includes(swineTeamId), 'region-only recommendations must follow that region’s recorded boss associations');
  const swineWarning = local.app.renderPage(local.app.readRoute('#game/darkest-dungeon/expedition-planner'));
  assert.ok(swineWarning.includes('Choose a region'));
  const swine = pack.bosses.find(boss => boss.routeId === 'swine-prince');
  local.elements.set('planner-region', { value: pack.locations.find(location => location.routeId === 'warrens').regionId });
  local.elements.set('planner-boss', { value: swine.id });
  local.elements.set('planner-difficulty', { value: 'Champion' });
  const swineResult = local.app.renderExpeditionPlannerResults();
  assert.ok(swineResult.includes('Do not damage Wilbur before defeating the Swine Prince.'));
  assert.ok(swineResult.includes('Wilbur'));
  const swineTeam = { ...swine.counterTeams[0], boss: swine };
  const reminder = local.app.renderPlannerTeam(swineTeam, null);
  assert.ok(reminder.includes('Select this team'));
  assert.ok(reminder.includes('Full team guide'));
});

test('expedition roster storage handles blocked localStorage in the current session', async () => {
  for (const mode of ['missing', 'inaccessible']) {
    const local = await harness(null, mode);
    assert.equal(local.app.getExpeditionRoster(), null);
    assert.equal(local.app.saveExpeditionRoster({ initialized: true, heroIds: ['hellion'] }), false);
    assert.deepEqual(Array.from(local.app.getExpeditionRoster().heroIds), ['hellion']);
    assert.equal(local.app.saveExpeditionRoster(null), false);
    assert.equal(local.app.getExpeditionRoster(), null);
  }
});

test('team composition index presents each boss guide once and keeps it searchable', () => {
  const html = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon/teams'));
  const ids = [...html.matchAll(/data-team-id="([^"]+)"/g)].map(match => match[1]);
  const bossTeamIds = pack.bosses.flatMap(boss => boss.counterTeams || []).map(team => team.id);
  assert.equal(new Set(ids).size, ids.length, 'team index should not repeat composition previews');
  for (const id of bossTeamIds) {
    assert.equal(ids.filter(entryId => entryId === id).length, 1, `${id} should have one index card`);
    const team = pack.bosses.flatMap(boss => (boss.counterTeams || []).map(entry => ({ ...entry, boss }))).find(entry => entry.id === id);
    const card = html.match(new RegExp(`<article[^>]*data-team-id="${id}"[^>]*>([\\s\\S]*?)<\\/article>`))?.[1];
    const cardElement = html.match(new RegExp(`<article[^>]*data-team-id="${id}"[^>]*>`))?.[0];
    assert.ok(cardElement?.includes('data-search-text='), `${id} should participate in team search`);
    assert.ok(card?.includes(team.name));
    assert.ok(card?.includes(team.boss.name) && card.includes(team.boss.regionLabel));
    assert.ok(card?.includes(team.difficultyRecommendations));
    assert.equal([...card.matchAll(/counter-preview-rank">Rank (\d+)/g)].map(match => Number(match[1])).join(','), '4,3,2,1');
    assert.ok(html.includes(`#game/darkest-dungeon/teams/${id}`), `${id} should link to its full guide`);
  }
  assert.ok(html.includes('View full team guide'));
  assert.ok(html.includes('portrait unavailable'), 'unavailable local art should retain the team portrait fallback');
  const groupPositions = ['unassessed', 'darkest-dungeon-1:region:ruins', 'darkest-dungeon-1:region:warrens', 'darkest-dungeon-1:region:weald', 'darkest-dungeon-1:region:cove']
    .map(region => html.indexOf(`data-team-region-group="${region}"`));
  assert.ok(groupPositions.every((position, index) => position >= 0 && (index === 0 || groupPositions[index - 1] < position)), 'supported groups should follow the requested order');
  assert.ok(!html.includes('data-team-region-group="darkest-dungeon-1:region:courtyard"'));
  assert.ok(!html.includes('data-team-region-group="darkest-dungeon-1:region:farmstead"'));
});

test('team filters combine region, boss and category without assigning general teams to regions', () => {
  const necromancer = { teamRegion: 'ruins', teamBoss: 'darkest-dungeon-1:boss:necromancer', teamCategory: 'beginner' };
  const general = { teamRegion: 'unassessed', teamBoss: 'unassessed', teamCategory: 'unassessed' };
  const matches = h.app.teamMatchesFilters;
  assert.equal(matches(necromancer, { region: 'ruins' }), true);
  assert.equal(matches(necromancer, { boss: necromancer.teamBoss }), true);
  assert.equal(matches(necromancer, { category: 'beginner' }), true);
  assert.equal(matches(necromancer, { region: 'ruins', boss: necromancer.teamBoss, category: 'beginner' }), true);
  assert.equal(matches(necromancer, { region: 'warrens', boss: necromancer.teamBoss, category: 'beginner' }), false);
  assert.equal(matches(necromancer, { region: 'ruins', boss: 'swine-prince', category: 'beginner' }), false);
  assert.equal(matches(necromancer, { region: 'ruins', boss: necromancer.teamBoss, category: 'balanced' }), false);
  assert.equal(matches(general, { region: 'unassessed' }), true);
  assert.equal(matches(general, { region: 'ruins' }), false);
});

test('verification presentation follows metadata without claiming patch testing', () => {
  const original = pack.trinkets[0];
  for (const [status, label] of [['reference-checked', 'Reference-checked'], ['unverified', 'Unverified'], ['missing', 'Information missing'], ['not-recorded', 'Information not recorded']]) {
    const record = { ...original, verification: { status, sourceIds: [] } };
    const html = h.app.renderEncyclopediaDetail('trinkets', record);
    assert.ok(html.includes(label));
    assert.ok(html.includes('Partial information'));
    assert.ok(html.includes('Not tested against an installed game patch'));
    if (status !== 'reference-checked') assert.ok(!html.includes('Reference-checked'));
  }
  assert.equal(helpers.verificationLabel('quests', {}), 'Verification not recorded');
});

test('all encyclopedia routes and generated internal links resolve', () => {
  const routes = ['#home', '#game/darkest-dungeon', '#game/darkest-dungeon/heroes', '#game/darkest-dungeon/teams', '#hero/highwayman/overview'];
  for (const kind of ['bosses', 'enemies', 'trinkets', 'items', 'curios', 'locations', 'quests']) {
    routes.push(`#game/darkest-dungeon/${kind}`, ...pack[kind].map(record => `#game/darkest-dungeon/${kind}/${record.routeId}`));
  }
  for (const hash of routes) {
    const html = h.app.renderPage(h.app.readRoute(hash));
    assert.ok(!html.includes('Page not found'), hash);
    for (const [, href] of html.matchAll(/href="(#[^"]+)"/g)) assert.notEqual(h.app.readRoute(href).view, 'missing', href);
  }
});

for (const failure of ['network', 'http', 'json', 'shape']) {
  test(`${failure} load failure preserves guides and shows honest error states`, async () => {
    const { app } = await harness(failure);
    for (const hash of ['#game/darkest-dungeon/quests', '#game/darkest-dungeon/trinkets/focus-ring', '#game/darkest-dungeon/bosses/necromancer', '#hero/crusader/abilities']) {
      const html = app.renderPage(app.readRoute(hash));
      assert.ok(html.includes('could not be loaded'), hash);
      assert.ok(html.includes('id="page-title"'));
      assert.ok(!html.includes('Page not found'));
    }
    for (const hash of ['#home', '#game/world-of-warcraft', '#game/darkest-dungeon/heroes', '#game/darkest-dungeon/teams', '#hero/highwayman/trinkets']) {
      const html = app.renderPage(app.readRoute(hash));
      assert.ok(!html.includes('Page not found'), hash);
      if (hash.includes('highwayman')) {
        assert.ok(html.includes('Item details are unavailable'));
        assert.ok(!html.includes('<dt>Benefits</dt>'));
      }
    }
  });
}

const artwork = h.modules.get(resolve(root, 'dist/js/artwork.js')).namespace;

test('artwork requires verified local assets and uses stable hero IDs', () => {
  const record = { id: 'crusader', name: 'Crusader' };
  const path = 'assets/games/darkest-dungeon-1/private/heroes/crusader.png';
  const entry = { recordId: 'darkest-dungeon-1:hero:crusader', primary: {
    path, exists: true, verifiedAuthentic: false, verificationSource: '', alt: 'Crusader portrait'
  } };
  try {
    artwork.setArtworkManifest({ records: [entry] });
    assert.equal(artwork.renderEntryArtwork('heroes', record, 'thumbnail', 'legacy portrait'), 'legacy portrait');
    entry.primary.verifiedAuthentic = true;
    entry.primary.verificationSource = 'Test fixture evidence';
    assert.ok(artwork.renderEntryArtwork('heroes', record, 'thumbnail', 'legacy portrait').includes(`src="${path}"`));
    assert.equal(artwork.renderEntryArtwork('heroes', record, 'banner'), '');
    entry.primary.exists = false;
    assert.equal(artwork.renderEntryArtwork('heroes', record, 'primary', 'legacy portrait'), 'legacy portrait');
  } finally { artwork.setArtworkManifest(artworkManifest); }
});

test('PNG and SVG failures advance candidates and preserve the final fallback', () => {
  for (const hiddenFailsFirst of [false, true]) {
    const fallback = { hidden: true };
    const classes = [];
    const visuals = [{ hidden: false, dataset: {} }, { hidden: true, dataset: {} }];
    const frame = { classList: { add: name => classes.push(name) }, querySelector: () => fallback,
      querySelectorAll: () => visuals };
    const fail = index => artwork.handleArtworkError({ target: { matches: () => true,
      closest: selector => selector === '[data-art-visual]' ? visuals[index] : frame } });
    if (hiddenFailsFirst) {
      fail(1);
      assert.equal(fallback.hidden, true);
      assert.equal(visuals[0].hidden, false);
    }
    fail(0);
    if (!hiddenFailsFirst) {
      assert.equal(visuals[1].hidden, false);
      assert.equal(fallback.hidden, true);
      fail(1);
    }
    assert.ok(visuals.every(visual => visual.hidden));
    assert.equal(fallback.hidden, false);
    assert.deepEqual(classes, ['image-failed']);
  }
});

test('atlas poses use native SVG clipping, packing rotation and accessible labels', () => {
  const entry = structuredClone(artworkManifest.records.find(row => row.primary.frame?.rotated));
  assert.ok(entry);
  entry.primary.exists = true;
  artwork.setArtworkManifest({ records: [entry] });
  try {
    const html = artwork.renderEntryArtwork(entry.category, { id: entry.recordId, name: entry.recordName });
    const frame = entry.primary.frame;
    assert.ok(html.includes(`viewBox="0 0 ${frame.width} ${frame.height}"`));
    assert.ok(html.includes(`translate(${frame.width} 0) rotate(90)`));
    assert.ok(html.includes(`href="${entry.primary.path}"`));
    assert.ok(html.includes('role="img" aria-label='));
  } finally { artwork.setArtworkManifest(artworkManifest); }
});

test('manifest covers every requested record without certifying legacy art', () => {
  assert.equal(artworkManifest.records.length, 170);
  for (const category of ['bosses', 'enemies', 'trinkets', 'items', 'curios', 'locations']) {
    assert.deepEqual(artworkManifest.records.filter(row => row.category === category).map(row => row.recordId).sort(),
      pack[category].map(row => row.id).sort());
  }
  for (const entry of artworkManifest.records) {
    assert.ok(entry.primary.path.startsWith(`assets/games/darkest-dungeon-1/private/${entry.category}/`));
    assert.ok(entry.legacyAssets.every(asset => !asset.verifiedAuthentic));
  }
  const shieldbreaker = artworkManifest.records.find(row => row.recordId === 'darkest-dungeon-1:hero:shieldbreaker');
  assert.equal(shieldbreaker.primary.exists, false);
  assert.equal(shieldbreaker.primary.verifiedAuthentic, false);
  assert.match(shieldbreaker.primary.missingReason, /Shieldbreaker DLC artwork/);
});

test('verified slots render through real collection and detail routes', () => {
  const manifest = structuredClone(artworkManifest);
  for (const entry of manifest.records) {
    entry.primary.exists = true;
    entry.primary.verifiedAuthentic = true;
    entry.primary.verificationSource = 'Test fixture only';
  }
  artwork.setArtworkManifest(manifest);
  try {
    for (const category of ['bosses', 'enemies', 'trinkets', 'items', 'curios', 'locations']) {
      const record = pack[category][0];
      const path = manifest.records.find(entry => entry.recordId === record.id).primary.path;
      for (const suffix of ['', `/${record.routeId}`]) {
        const html = h.app.renderPage(h.app.readRoute(`#game/darkest-dungeon/${category}${suffix}`));
        assert.ok(html.includes(`"${path}"`), `${category}${suffix}`);
      }
    }
    for (const route of ['#game/darkest-dungeon/heroes', '#hero/crusader/overview']) {
      const html = h.app.renderPage(h.app.readRoute(route));
      assert.ok(html.includes('private/heroes/crusader.png'), route);
    }
  } finally { artwork.setArtworkManifest(artworkManifest); }
});

test('a checkout without private assets keeps legacy artwork and usable routes', () => {
  const manifest = structuredClone(artworkManifest);
  for (const entry of manifest.records) for (const slot of ['primary', 'thumbnail', 'banner']) {
    if (entry[slot]) entry[slot].exists = false;
  }
  artwork.setArtworkManifest(manifest);
  try {
    for (const route of ['#game/darkest-dungeon/heroes', '#hero/highwayman/overview',
      '#game/darkest-dungeon/teams', '#game/darkest-dungeon/bosses', '#game/darkest-dungeon/enemies',
      '#game/darkest-dungeon/trinkets', '#game/darkest-dungeon/items', '#game/darkest-dungeon/curios',
      '#game/darkest-dungeon/locations']) {
      const html = h.app.renderPage(h.app.readRoute(route));
      assert.ok(!html.includes('assets/games/darkest-dungeon-1/private/'), route);
      assert.ok(!html.includes('Page not found'), route);
    }
    const hero = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon/heroes'));
    assert.ok(hero.includes('assets/images/darkest-dungeon/crusader-portrait.png'));
  } finally { artwork.setArtworkManifest(artworkManifest); }
});

test('Necromancer page renders three complete counter teams with valid ranks, skills and trinkets', () => {
  const boss = pack.bosses.find(record => record.routeId === 'necromancer');
  const teams = boss.counterTeams || [];
  assert.deepEqual(teams.map(team => team.category), ['beginner', 'balanced', 'specialized']);
  const legacyHeroes = h.modules.get(resolve(root, 'dist/js/heroes.js')).namespace.heroes;
  const abilityData = h.modules.get(resolve(root, 'dist/js/hero-abilities.js')).namespace.heroAbilities;
  for (const team of teams) {
    assert.equal(team.members.length, 4);
    assert.deepEqual(team.members.map(member => member.position), [4, 3, 2, 1]);
    for (const member of team.members) {
      assert.ok(legacyHeroes.some(hero => hero.id === member.heroRouteId), member.heroRouteId);
      assert.equal(member.skills.length, 4);
      const available = abilityData[member.heroRouteId]?.skills || [];
      for (const skill of member.skills) {
        const record = available.find(entry => entry[0] === skill.name);
        assert.ok(record, `${member.heroRouteId}: ${skill.name}`);
        assert.ok(record[1].split(',').includes(String(member.position)), `${member.heroRouteId}/${skill.name} at ${member.position}`);
        assert.deepEqual(skill.heroPositions, record[1].split(',').map(Number));
        for (const target of record[2].matchAll(/\d/g)) assert.ok(Number(target[0]) >= 1 && Number(target[0]) <= 4);
      }
      assert.equal(member.trinketIds.length, 2);
      for (const routeId of member.trinketIds) {
        const item = pack.trinkets.find(trinket => trinket.routeId === routeId);
        assert.ok(item, routeId);
        assert.ok(!(item.classRestrictionHeroRouteIds || []).length || item.classRestrictionHeroRouteIds.includes(member.heroRouteId));
        assert.ok(item.requirements.baseGame || item.requirements.dlc.length);
      }
    }
  }
  const html = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon/bosses/necromancer'));
  assert.equal((html.match(/data-counter-team=/g) || []).length, 3);
  for (const team of teams) {
    assert.ok(html.includes(team.name));
    assert.ok(html.includes('View full team guide'));
    assert.ok(!html.includes('Skills and trinkets by hero'));
    for (const member of team.members) assert.ok(html.includes(`Rank ${member.position}`));
  }
  assert.match(html, /Shieldbreaker portrait unavailable/);
  assert.ok(!html.includes('shieldbreaker-portrait.png'));
});

test('Necromancer team IDs route to full guides and connect boss, hero, trinket and team navigation', () => {
  const boss = pack.bosses.find(record => record.routeId === 'necromancer');
  for (const team of boss.counterTeams) {
    const hash = `#game/darkest-dungeon/teams/${team.id}`;
    const route = h.app.readRoute(hash);
    assert.equal(route.view, 'team-detail');
    assert.equal(route.team.id, team.id);
    const html = h.app.renderPage(route);
    assert.ok(html.includes('class="team-guide-hero"'));
    assert.ok(html.includes('Quick Battle Plan'));
    assert.ok(html.includes('href="#formation"'));
    assert.ok(html.includes('href="#builds"'));
    assert.ok(html.includes('href="#strategy"'));
    assert.equal((html.match(/class="team-formation-card/g) || []).length, 4);
    assert.equal((html.match(/class="counter-guide-skill"/g) || []).length, 16);
    assert.equal((html.match(/class="counter-guide-trinket"/g) || []).length,
      team.members.reduce((count, member) => count + member.trinketIds.length + (member.alternativeTrinketIds || []).length, 0));
    assert.ok(html.includes(`href="#game/darkest-dungeon/bosses/${boss.routeId}"`));
    assert.ok(html.includes('class="team-guide-party"'));
    assert.ok(html.includes('class="team-guide-build-grid"'));
    assert.ok(html.includes('team-battle-steps'));
    assert.ok(html.includes('#game/darkest-dungeon/teams'));
    for (const member of team.members) {
      assert.ok(html.includes(`href="#hero/${member.heroRouteId}/`));
      for (const trinketId of member.trinketIds) assert.ok(html.includes(`href="#game/darkest-dungeon/trinkets/${trinketId}"`));
    }
  }
  const bossHtml = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon/bosses/necromancer'));
  assert.equal((bossHtml.match(/boss-counter-preview/g) || []).length, 3);
  assert.match(bossHtml, /Each guide includes rank-specific skills, trinkets and encounter notes/);
  assert.ok(bossHtml.includes('View full team guide'));
  assert.ok(!bossHtml.includes('Skills and trinkets by hero'));
  const index = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon/teams'));
  for (const team of boss.counterTeams) assert.ok(index.includes(`href="#game/darkest-dungeon/teams/${team.id}"`));
});

test('boss coverage and all counter-team routes, links, ranks and restrictions stay coherent', () => {
  assert.equal(pack.bosses.filter(boss => boss.guideStatus === 'available').length, 4);
  assert.equal(pack.bosses.filter(boss => boss.guideStatus === 'in-development').length, 22);
  const heroRoutes = new Set(h.modules.get(resolve(root, 'dist/js/heroes.js')).namespace.heroes.map(hero => hero.id));
  const abilities = h.modules.get(resolve(root, 'dist/js/hero-abilities.js')).namespace.heroAbilities;
  const teamIds = new Set();
  let teamCount = 0;
  for (const boss of pack.bosses) {
    const bossHtml = h.app.renderPage(h.app.readRoute(`#game/darkest-dungeon/bosses/${boss.routeId}`));
    for (const team of boss.counterTeams || []) {
      teamCount += 1;
      assert.ok(!teamIds.has(team.id), `duplicate team ID: ${team.id}`);
      teamIds.add(team.id);
      assert.ok(bossHtml.includes(`href="#game/darkest-dungeon/teams/${team.id}"`), `${boss.routeId} preview link`);
      assert.deepEqual(team.members.map(member => member.position), [4, 3, 2, 1]);
      const route = h.app.readRoute(`#game/darkest-dungeon/teams/${team.id}`);
      assert.equal(route.team.id, team.id);
      const page = h.app.renderPage(route);
      assert.ok(page.includes('id="sources"'));
      assert.ok(page.includes('id="strategy"'));
      assert.ok(page.includes(`href="#game/darkest-dungeon/bosses/${boss.routeId}"`));
      const localIds = [...page.matchAll(/href="#(?:game\/darkest-dungeon\/trinkets\/([^"#]+)|hero\/([^"#/]+)\/)/g)];
      for (const [, trinketRoute, heroRoute] of localIds) {
        if (trinketRoute) assert.ok(pack.trinkets.some(item => item.routeId === trinketRoute), `${team.id}: trinket link ${trinketRoute}`);
        if (heroRoute) assert.ok(heroRoutes.has(heroRoute), `${team.id}: hero link ${heroRoute}`);
      }
      for (const member of team.members) {
        assert.ok(heroRoutes.has(member.heroRouteId), `${team.id}: hero ${member.heroRouteId}`);
        assert.equal(member.skills.length, 4);
        assert.equal(member.trinketIds.length, 2);
        for (const skill of member.skills) {
          assert.ok(skill.heroPositions.includes(member.position), `${team.id}/${skill.name} launch rank`);
          const ability = abilities[member.heroRouteId]?.skills?.find(row => row[0] === skill.name);
          if (ability) {
            assert.deepEqual(skill.heroPositions, ability[1].split(',').map(Number));
            assert.equal(skill.target, ability[2]);
          } else {
            const canonical = pack.combatSkills.find(row => row.heroId.endsWith(`:${member.heroRouteId}`) && row.name === skill.name);
            assert.ok(canonical, `${team.id}: skill ${skill.name} resolves`);
            assert.deepEqual(skill.heroPositions, canonical.rankRules.heroPositions);
          }
        }
        for (const id of member.trinketIds) {
          const trinket = pack.trinkets.find(item => item.routeId === id);
          assert.ok(trinket, `${team.id}: trinket ${id}`);
          assert.ok(!trinket.classRestrictionHeroRouteIds?.length || trinket.classRestrictionHeroRouteIds.includes(member.heroRouteId));
        }
      }
    }
  }
  assert.equal(teamCount, 9);
  for (const routeId of ['hag', 'siren']) {
    const boss = pack.bosses.find(row => row.routeId === routeId);
    assert.equal(boss.counterTeams.length, 1);
    const page = h.app.renderPage(h.app.readRoute(`#game/darkest-dungeon/bosses/${routeId}`));
    assert.ok(page.includes('View full team guide'));
  }
  const swine = pack.bosses.find(row => row.routeId === 'swine-prince');
  assert.equal(swine.counterTeams.length, 4);
  assert.equal(new Set(swine.counterTeams.map(team => team.id)).size, 4);
  assert.deepEqual(swine.variants.map(variant => variant.name), ['Swine Prince', 'Swine King', 'Swine God']);
  assert.ok(swine.mechanics.some(mechanic => mechanic.text.includes('Wilbur') && mechanic.text.includes('Enraged Destruction')));
  assert.equal(swine.commonMistakes.length, 5);
  assert.ok(swine.verification.sourceIds.includes('wiki-wilbur'));
  assert.ok(swine.counterTeams[0].members.every(member => !member.trinketIds.includes('fusemans-matchstick')),
    'beginner loadout should not depend on the Champion Brigand Pounder trophy');
  const advanced = swine.counterTeams.find(team => team.id.endsWith(':swine-prince-mark-transfer'));
  assert.ok(advanced.requirements.dlc.includes('darkest-dungeon-1:dlc:crimson-court'));
  assert.ok(advanced.members.find(member => member.heroRouteId === 'flagellant').skills.every(skill => skill.name !== 'Rain of Sorrows'));
  const swinePage = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon/bosses/swine-prince'));
  assert.ok(swinePage.includes('Do not damage Wilbur before defeating the Swine Prince.'));
  assert.ok(swinePage.includes('Common mistakes to avoid'));
  assert.ok(swinePage.includes('Champion, favor Accuracy'));
  for (const team of swine.counterTeams) {
    assert.ok(swinePage.includes(`#game/darkest-dungeon/teams/${team.id}`));
    assert.ok(h.app.readRoute(`#game/darkest-dungeon/teams/${team.id}`).team);
  }
});
