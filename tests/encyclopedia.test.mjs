import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { SourceTextModule, createContext } from 'node:vm';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '..');
const artworkManifest = JSON.parse(await readFile(resolve(root, 'dist/data/games/darkest-dungeon-1-artwork.json'), 'utf8'));
const pack = JSON.parse(await readFile(resolve(root, 'dist/data/games/darkest-dungeon-1.json'), 'utf8'));
const wowPack = JSON.parse(await readFile(resolve(root, 'dist/data/games/world-of-warcraft-forever.json'), 'utf8'));
const wowArtwork = JSON.parse(await readFile(resolve(root, 'dist/data/games/world-of-warcraft-forever-artwork.json'), 'utf8'));
const leagueArtwork = JSON.parse(await readFile(resolve(root, 'dist/data/games/league-of-legends-artwork.json'), 'utf8'));
const darkestDungeon2Artwork = JSON.parse(await readFile(resolve(root, 'dist/data/games/darkest-dungeon-2-artwork.json'), 'utf8'));
const wowClientData = JSON.parse(await readFile(resolve(root, 'dist/data/games/world-of-warcraft-forever-client-data.json'), 'utf8'));
const wowGuidedData = JSON.parse(await readFile(resolve(root, 'dist/data/games/world-of-warcraft-forever-guided-builds.json'), 'utf8'));
const dungeonPrepData = JSON.parse(await readFile(resolve(root, 'dist/data/games/world-of-warcraft-forever-dungeon-prep.json'), 'utf8'));
const portalStyles = await readFile(resolve(root, 'dist/css/portal.css'), 'utf8');
const appSource = await readFile(resolve(root, 'dist/js/app.js'), 'utf8');

// Execute real ES modules and loading code. Only browser event registration is excluded;
// the minimal DOM supports filter/render assertions, not browser layout or interaction claims.
async function harness(failure = null, storageMode = 'available', unavailableFiles = []) {
  const elements = new Map();
  const storedValues = new Map();
  let cards = [];
  let extraFilters = [];
  const fetchRequests = [];
  const globals = { console: { error() {} }, URL,
    location: { hash: '' },
    document: {
      querySelector: () => ({ addEventListener() {} }),
      getElementById: id => elements.get(id),
      querySelectorAll: selector => selector === '[data-encyclopedia-card]' ? cards
        : selector === '[data-encyclopedia-filter]' ? extraFilters : []
    },
    fetch: async url => {
      fetchRequests.push(String(url));
      if (unavailableFiles.some(file => String(url).endsWith(file))) return { ok: false, status: 404 };
      if (String(url).endsWith('world-of-warcraft-forever.json')) return { ok: true, json: async () => JSON.parse(await readFile(resolve(root, 'dist/data/games/world-of-warcraft-forever.json'), 'utf8')) };
      if (String(url).endsWith('world-of-warcraft-forever-artwork.json')) return { ok: true, json: async () => JSON.parse(await readFile(resolve(root, 'dist/data/games/world-of-warcraft-forever-artwork.json'), 'utf8')) };
      if (String(url).endsWith('league-of-legends-artwork.json')) return { ok: true, json: async () => JSON.parse(await readFile(resolve(root, 'dist/data/games/league-of-legends-artwork.json'), 'utf8')) };
      if (String(url).endsWith('darkest-dungeon-2-artwork.json')) return { ok: true, json: async () => JSON.parse(await readFile(resolve(root, 'dist/data/games/darkest-dungeon-2-artwork.json'), 'utf8')) };
      if (String(url).endsWith('world-of-warcraft-forever-client-data.json')) return { ok: true, json: async () => JSON.parse(await readFile(resolve(root, 'dist/data/games/world-of-warcraft-forever-client-data.json'), 'utf8')) };
      if (String(url).endsWith('world-of-warcraft-forever-guided-builds.json')) return { ok: true, json: async () => JSON.parse(await readFile(resolve(root, 'dist/data/games/world-of-warcraft-forever-guided-builds.json'), 'utf8')) };
      if (String(url).endsWith('world-of-warcraft-forever-dungeon-prep.json')) return { ok: true, json: async () => structuredClone(dungeonPrepData) };
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
  async function load(path, linkModule = true) {
    if (modules.has(path)) return modules.get(path);
    let source = await readFile(path, 'utf8');
    // Another import may populate the cache while this file is being read.
    if (modules.has(path)) return modules.get(path);
    if (path.endsWith('/app.js')) {
      source = source.slice(0, source.indexOf("document.querySelector('.skip-link')"));
      source += '\nexport { renderPage, readRoute, renderEncyclopediaDetail, renderEncyclopediaCollection, filterEncyclopedia, renderSearchResults, getTrinkets, teamMatchesFilters, getOwnedTrinketIds, setOwnedTrinket, clearOwnedTrinkets, renderTrinketOwnershipControl, renderTeamEquipmentReadinessContent, plannerBosses, updateExpeditionPlannerOptions, renderPlannerTeam, renderPlannerEquipmentStep, selectExpeditionTeam, sortedPlannerTeams, getExpeditionRoster, saveExpeditionRoster, renderExpeditionPlanner, renderPlannerRegionRecords, renderExpeditionPlannerResults, updateBackToTop, scrollBackToTop };';
    }
    const module = new SourceTextModule(source, { context, identifier: path,
      initializeImportMeta: meta => { meta.url = `file://${path}`; } });
    modules.set(path, module);
    if (linkModule) await module.link((specifier, parent) => load(resolve(dirname(parent.identifier), specifier), false));
    return module;
  }
  const app = await load(resolve(root, 'dist/js/app.js'));
  await app.evaluate();
  return { app: app.namespace, modules, context, storedValues, elements, fetchRequests,
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

test('Warrior gear retains eligible earlier items and separates requirement uncertainty at milestone levels', () => {
  const companion = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const classRecord = wowPack.classes.find(record => record.id === 'warrior');
  const guideData = { classRecord, warriorEquipment: wowPack.warriorEquipment };
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const allianceArms = companion.getCompanionPanel({ classId: 'warrior', specializationId: 'arms', faction: 'Alliance', level: 34, tab: 'gear' }, guideData).gearGuide.items;
  const hordeArms = companion.getCompanionPanel({ classId: 'warrior', specializationId: 'arms', faction: 'Horde', level: 34, tab: 'gear' }, guideData).gearGuide.items;
  assert.ok(allianceArms.some(item => item.id === 'defender-of-dalaran'));
  assert.ok(!hordeArms.some(item => item.id === 'defender-of-dalaran'));
  assert.ok(!allianceArms.some(item => item.id === 'kreshs-back'), 'Protection-only shields stay out of Arms recommendations');

  for (const level of [15, 25, 34, 45, 60]) {
    for (const specializationId of ['arms', 'fury', 'protection']) {
      const panel = companion.getCompanionPanel({ classId: 'warrior', specializationId, faction: 'Alliance', level, tab: 'gear' }, guideData);
      const items = panel.gearGuide.items;
      assert.ok(items.every(item => !item.faction || item.faction === 'Alliance'));
      assert.ok(items.every(item => !item.specializations || item.specializations.includes(specializationId)));
      const available = items.filter(item => Number.isFinite(item.requiredLevel) && item.requiredLevel <= level);
      const upcoming = items.filter(item => Number.isFinite(item.requiredLevel) && item.requiredLevel > level);
      assert.ok(available.length, `${specializationId} at level ${level} should retain earlier eligible equipment`);
      assert.ok(available.every(item => items.includes(item)), `${specializationId} level ${level}: eligible records remain in the guide`);

      const allHtml = companion.renderWarriorGearGuide(panel.gearGuide, level, 'all', escape);
      assert.match(allHtml, /data-gear-group="available"><h5>Available now/);
      assert.match(allHtml, /Available now · Available at Level/);
      if (upcoming.length) assert.match(allHtml, /data-gear-group="upcoming"><h5>Upcoming upgrades/);
      if (items.some(item => !Number.isFinite(item.requiredLevel))) assert.match(allHtml, /Item requirements unverified/);
      assert.doesNotMatch(allHtml, />Best</i);

      for (const category of ['weapon', 'armor', 'accessory']) {
        const filteredHtml = companion.renderWarriorGearGuide(panel.gearGuide, level, category, escape);
        assert.match(filteredHtml, new RegExp(`data-companion-gear-filter="${category}" aria-pressed="true"`));
        for (const match of filteredHtml.matchAll(/data-gear-category="([^"]+)"/g)) assert.equal(match[1], category);
        if (!items.some(item => item.category === category)) assert.match(filteredHtml, /No verified recommendations are recorded in this equipment category\./);
      }
    }
  }
});

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
  assert.ok(locationHtml.includes('Ruins'));

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
  for (const heading of ['Region overview', 'Before You Enter', 'Enemies', 'Boss encounters', 'Curios', 'Team guides']) {
    assert.ok(html.replaceAll('&amp;', '&').includes(heading), `Ruins guide should include ${heading}`);
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
  assert.ok(courtyardHtml.includes('general-purpose Courtyard team guide yet'));
});

test('trinket index groups rarity metadata without repeated verification labels or source lists', () => {
  const html = h.app.renderEncyclopediaCollection('trinkets');
  const rarities = [...new Set(pack.trinkets.map(record => record.rarity))];
  for (const rarity of rarities) {
    assert.ok(html.includes(`data-trinket-rarity="${rarity}"`), `missing rarity group ${rarity}`);
  }
  assert.ok(!html.includes('Sources: Trinkets (Darkest Dungeon)'));
  assert.ok(!html.includes('Reference-checked'));
  assert.ok(pack.trinkets.every(record => record.verification?.sourceIds?.length), 'source metadata remains in records');
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
  for (const [id, label] of [['planner-step-expedition', 'Choose Expedition'], ['planner-step-party', 'Choose Party'], ['planner-step-equipment', 'Check Equipment'], ['planner-step-battle', 'Battle Plan']]) {
    assert.ok(page.includes(`id="${id}"`), `planner should include ${id}`);
    assert.ok(page.includes(`data-planner-step="${id}"`), `step navigation should include ${label}`);
    assert.ok(page.includes(`<span>${String(['planner-step-expedition', 'planner-step-party', 'planner-step-equipment', 'planner-step-battle'].indexOf(id) + 1).padStart(2, '0')}</span> ${label}`));
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

test('Darkest Dungeon overview links all encyclopedia sections and derives a featured boss with its team guides', () => {
  const page = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon'));
  assert.ok(page.includes('Enter the <em>Darkest Dungeon</em>'));
  assert.ok(page.includes('Prepare an Expedition'));
  assert.ok(page.includes('Explore Boss Guides'));
  assert.ok(page.includes('overview-cinematic-art'));
  const games = h.modules.get(resolve(root, 'dist/js/games.js')).namespace.games;
  for (const id of ['heroes', 'bosses', 'enemies', 'trinkets', 'items', 'curios', 'teams', 'locations']) {
    const category = games['darkest-dungeon'].categories.find(entry => entry.id === id);
    const href = `#game/darkest-dungeon/${category.view}`;
    assert.ok(page.includes(`href="${href}"`), `overview should link to ${category.label}`);
    assert.equal(h.app.readRoute(href).view, category.view, `${category.label} link should resolve`);
  }
  assert.equal(h.app.readRoute('#game/darkest-dungeon/expedition-planner').view, 'expedition-planner');
  const featured = [...pack.bosses].filter(boss => boss.guideStatus === 'available' && boss.counterTeams?.length)
    .sort((left, right) => right.counterTeams.length - left.counterTeams.length)[0];
  assert.ok(page.includes(`A plan for the ${featured.name}`));
  assert.ok(page.includes(`#game/darkest-dungeon/bosses/${featured.routeId}`));
  for (const team of featured.counterTeams.slice(0, 3)) {
    const href = `#game/darkest-dungeon/teams/${team.id}`;
    assert.ok(page.includes(`href="${href}"`), `featured team ${team.id} should link to its guide`);
    assert.equal(h.app.readRoute(href).view, 'team-detail');
  }
  assert.ok(page.includes('#game/darkest-dungeon/quests'));
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

test('homepage features direct game routes and records its local game artwork', async () => {
  const homeRoute = h.app.readRoute('#home');
  const home = h.app.renderPage(homeRoute);
  assert.equal(homeRoute.view, 'home');
  assert.equal(h.app.readRoute('#home/games').view, 'home', 'the older games anchor remains a homepage route');
  assert.equal(h.app.readRoute('#home/games').library, true);
  assert.ok(home.includes('id="featured-games-title"'), 'the legacy games anchor now targets the featured games heading');
  assert.ok(home.includes('BM Gaming Wiki') && home.includes('Your adventure. Your guide.'));
  assert.ok(home.includes('Practical guides, builds, leveling routes and dungeon strategies for the games you love.'));
  assert.doesNotMatch(home, /bm-gaming-controller|home-welcome-art/, 'the welcome banner has no generic controller illustration');
  const welcomeStyles = await readFile(resolve(root, 'dist/css/portal.css'), 'utf8');
  assert.match(welcomeStyles, /\.home-welcome\s*\{[^}]*max-height:260px[^}]*background:[^}]*radial-gradient/);
  assert.doesNotMatch(welcomeStyles, /home-welcome-art|bm-gaming-controller/);
  assert.match(welcomeStyles, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.home-welcome\s*\{[^}]*max-height:none/);

  const cardLinks = [...home.matchAll(/<a class="home-game-card" href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(cardLinks, ['#game/darkest-dungeon', '#game/world-of-warcraft', '#game/league-of-legends', '#game/darkest-dungeon-2']);
  assert.equal((home.match(/class="home-game-card/g) || []).length, 4, 'all four games share one carousel row');
  assert.equal((home.match(/class="home-game-card is-coming"/g) || []).length, 0, 'the upcoming DDII card is a real link');
  assert.ok(home.includes('Darkest Dungeon I') && home.includes('Heroes, bosses, team compositions and expedition planning.'));
  assert.ok(home.includes('World of Warcraft: Forever') && home.includes('Classes, talents, leveling routes and dungeon preparation.'));
  assert.ok(home.includes('Explore Guides'));
  assert.equal(h.app.readRoute(cardLinks[0]).view, 'game');
  assert.equal(h.app.readRoute(cardLinks[1]).view, 'wow-home');
  assert.equal(h.app.readRoute(cardLinks[2]).view, 'preview');
  assert.equal(h.app.readRoute(cardLinks[3]).view, 'preview');

  const dd2Card = home.match(/<a class="home-game-card" href="#game\/darkest-dungeon-2"[\s\S]*?<\/a>/)?.[0] || '';
  assert.ok(dd2Card.includes('Darkest Dungeon II'));
  assert.ok(dd2Card.includes('Coming Soon'));
  assert.ok(dd2Card.includes('Heroes, journeys and strategies. Guides coming later.'));
  const dd2Art = darkestDungeon2Artwork.records.find(record => record.id === 'darkest-dungeon-2:homepage:featured');
  assert.ok(dd2Art, 'the DDII homepage artwork has a dedicated manifest record');
  assert.ok(dd2Card.includes(dd2Art.src));
  assert.ok(await readFile(resolve(root, 'dist', dd2Art.src)), 'the user-provided artwork exists locally');
  assert.equal(dd2Art.sourceFileName, 'darkest-dungeon-2.png');
  assert.match(dd2Art.provenance, /user-provided/i);
  assert.match(dd2Art.usageStatus, /redistribution rights unverified/i);
  assert.match(dd2Card, /aria-label="Darkest Dungeon II, coming soon"/);
  assert.ok(!home.includes('home-coming-grid'), 'coming-soon games are integrated into the game row');
  assert.equal(h.app.readRoute('#game/darkest-dungeon-2').view, 'preview');
  assert.match(home, /id="home-game-strip"[^>]*role="region"[^>]*tabindex="0"/);
  assert.match(home, /data-home-games-scroll="-1"/);
  assert.match(home, /data-home-games-scroll="1"/);
  assert.doesNotMatch(home, /data-preview-game|game-showcase|portal-hero-vista|portal-selectors|data-explore-games/);

  const shell = await readFile(resolve(root, 'dist/index.html'), 'utf8');
  const mainNavigation = shell.match(/<nav\b[^>]*class="site-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.equal((mainNavigation.match(/<a\b/g) || []).length, 6, 'dropdown lists four games plus Guides and GitHub');
  assert.match(mainNavigation, /<details id="universes-menu" class="universes-menu">[\s\S]*?<summary[^>]*data-site-page="universes"[^>]*>Universes/);
  for (const [target, name] of [['darkest-dungeon', 'Darkest Dungeon I'], ['world-of-warcraft', 'World of Warcraft: Forever'], ['league-of-legends', 'League of Legends'], ['darkest-dungeon-2', 'Darkest Dungeon II']]) {
    assert.ok(mainNavigation.includes(`href="#game/${target}"`) && mainNavigation.includes(name), `${name} appears in the dropdown`);
    assert.notEqual(h.app.readRoute(`#game/${target}`).view, 'missing', `${name} route remains valid`);
  }
  assert.match(mainNavigation, /href="#game\/world-of-warcraft" data-site-page="guides">Guides<\/a>/);
  assert.equal(h.app.readRoute('#game/world-of-warcraft').view, 'wow-home', 'Guides opens the existing guide directory');
  assert.match(mainNavigation, /href="https:\/\/github\.com\/b-maystorov\/gaming-wiki"/);
  assert.doesNotMatch(mainNavigation, /discord/i, 'Discord is omitted because no project URL is configured');
  assert.match(shell, /id="mobile-navigation-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="primary-navigation"/);
  assert.match(shell, /class="command-trigger-label">Search<\/span>/);
  const searchTrigger = shell.match(/<button id="open-command-center"[^>]*>[\s\S]*?<\/button>/)?.[0] || '';
  assert.match(searchTrigger, /aria-controls="command-center"/);
  assert.match(searchTrigger, /aria-keyshortcuts="\/"/, 'the slash shortcut stays available to assistive technology');
  assert.match(searchTrigger, /class="search-symbol"/);
  assert.match(searchTrigger, /class="command-trigger-label">Search/);
  assert.doesNotMatch(searchTrigger, /<kbd|>\/</, 'the visual slash badge is removed');
  assert.match(searchTrigger, /title="Search the wiki"/);
  const portalStyles = await readFile(resolve(root, 'dist/css/portal.css'), 'utf8');
  assert.match(portalStyles, /\.site-header\s*\{[^}]*background:#0b101b/);
  assert.match(portalStyles, /\.universes-dropdown\s*\{[^}]*position:absolute/);
  assert.match(portalStyles, /@media\(max-width:760px\)[\s\S]*?\.site-header-inner\[data-menu-open="true"\] \.site-nav\s*\{\s*display:flex/);
  assert.match(portalStyles, /\.site-header a:focus-visible, \.site-header summary:focus-visible, \.mobile-nav-toggle:focus-visible/);
  assert.match(portalStyles, /scroll-snap-type:\s*x mandatory/);
  assert.match(portalStyles, /grid-auto-flow:\s*column/);
  assert.match(portalStyles, /\.home-game-art > img\s*\{[^}]*object-fit:\s*cover/);
  assert.match(portalStyles, /\.league-coming-art img\s*\{[^}]*object-fit:\s*cover/);
  const appSource = await readFile(resolve(root, 'dist/js/app.js'), 'utf8');
  assert.match(appSource, /data-home-games-scroll/);
  assert.match(appSource, /strip\.scrollBy/);
  const searchStyles = await readFile(resolve(root, 'dist/css/command-center.css'), 'utf8');
  assert.match(searchStyles, /\.command-trigger:hover\s*\{[^}]*#54a9f5/i);
  assert.match(searchStyles, /\.command-trigger:focus-visible\s*\{[^}]*#75bcff/i);
  assert.match(searchStyles, /\.command-trigger\s*\{[^}]*min-height:\s*44px/);
  assert.match(searchStyles, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.command-trigger\s*\{\s*min-width:\s*44px/);
  assert.doesNotMatch(searchStyles, /@media\s*\(max-width:\s*420px\)[\s\S]*?\.command-trigger-label\s*\{\s*display:\s*none/);
  const commandCenterSource = await readFile(resolve(root, 'dist/js/command-center.js'), 'utf8');
  assert.match(commandCenterSource, /event\.key === '\/'/, 'the existing slash key listener remains active');
  assert.match(commandCenterSource, /trigger\.addEventListener\('click', open\)/, 'the button still opens the search dialog');

  const ddArt = artworkManifest.homepageArtwork;
  const wowArt = wowArtwork.records.find(record => record.id === 'wow-forever:homepage:featured');
  const leagueArt = leagueArtwork.records.find(record => record.id === 'league-of-legends:homepage:featured');
  assert.ok(ddArt && wowArt && leagueArt, 'all three illustrated cards have structured source and use-status records');
  for (const art of [ddArt.primary, leagueArt]) {
    const relativePath = art.path || art.src;
    assert.ok(relativePath.startsWith('assets/images/home/'));
    assert.ok(home.includes(relativePath), `${relativePath} is rendered locally on the homepage`);
    assert.ok(await readFile(resolve(root, 'dist', relativePath)), `${relativePath} exists`);
    assert.ok(art.sourceUrl && art.sourceFileName && art.usageStatus, `${relativePath} records source and usage status`);
  }
  assert.equal(ddArt.primary.originalWidth / ddArt.primary.originalHeight, 16 / 9);
  assert.equal(wowArt.src, 'assets/images/wow-forever/wow-forever-banner.png');
  assert.equal(wowArt.sourceFileName, 'wow-forever-banner.png');
  assert.equal(wowArt.usageStatus, 'User-provided; redistribution rights unverified.');
  assert.deepEqual([wowArt.width, wowArt.height], [860, 484]);
  assert.equal((await readFile(resolve(root, 'dist', wowArt.src))).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const wowHome = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft'));
  assert.match(wowHome, /class="wow-home-hero-art"[^>]*><img src="assets\/images\/wow-forever\/wow-forever-banner\.png"[^>]*width="860" height="484"/);
  assert.match(portalStyles, /\.wow-home-hero-art\s*\{[^}]*display:block[^}]*z-index:0/);
  assert.match(portalStyles, /\.wow-home-hero-art img\s*\{[^}]*visibility:visible[^}]*height:100%[^}]*object-fit:contain/);
  assert.equal(leagueArt.width / leagueArt.height, 16 / 9);
  assert.equal(leagueArt.sourceFileName, 'Ahri_0.jpg');
  assert.match(leagueArt.usageStatus, /not been independently verified/i);
  assert.equal((await readFile(resolve(root, 'dist', leagueArt.src))).subarray(0, 2).toString('hex'), 'ffd8');
});

test('latest wiki updates sit below the carousel with three local, keyboard-accessible guide links', async () => {
  const home = h.app.renderPage(h.app.readRoute('#home'));
  const section = home.match(/<section class="home-updates"[\s\S]*?<\/section>/)?.[0] || '';
  assert.ok(section.includes('Latest Wiki Updates') && section.includes('Explore our newest guides and tools'));
  assert.match(home, /id="home-game-strip"[\s\S]*?<\/section>\s*<section class="home-updates"/);
  const cards = [...section.matchAll(/<a class="home-update-card" href="([^"]+)"[\s\S]*?<\/a>/g)];
  assert.deepEqual(cards.map(match => match[1]), [
    '#hero/highwayman/overview', '#game/world-of-warcraft/talent-planner', '#game/world-of-warcraft/dungeons/deadmines'
  ]);
  assert.doesNotMatch(section, /<time\b|Coming Soon|In development|tabindex="-1"|<button\b/);
  for (const [card] of cards) {
    const path = card.match(/<img[^>]*src="([^"]+)"/)?.[1];
    assert.ok(path?.startsWith('assets/'), 'each card uses a local image');
    assert.ok((await readFile(resolve(root, 'dist', path))).length > 0);
    assert.match(card, /<h3>[^<]+<\/h3>/, 'the native link has a visible, accessible title');
    assert.match(card, /loading="lazy"/);
  }
});

for (const destination of [
  { title: 'Highwayman', href: '#hero/highwayman/overview', view: 'hero', content: /The moving duelist/ },
  { title: 'Talent Planner', href: '#game/world-of-warcraft/talent-planner', view: 'wow-talents', content: /data-wow-talent-planner/ },
  { title: 'Deadmines · Before You Enter', href: '#game/world-of-warcraft/dungeons/deadmines', view: 'wow-dungeon-prep', content: /Quest records/ }
]) {
  test(`homepage update opens the implemented ${destination.title} guide`, () => {
    const home = h.app.renderPage(h.app.readRoute('#home'));
    const cards = [...home.matchAll(/<a class="home-update-card" href="([^"]+)"[\s\S]*?<\/a>/g)];
    const matchingCards = cards.filter(match => match[1] === destination.href);
    assert.equal(matchingCards.length, 1, 'the destination appears exactly once in the updates section');
    assert.ok(matchingCards[0][0].includes(`<h3>${destination.title}</h3>`));
    const route = h.app.readRoute(destination.href);
    assert.equal(route.view, destination.view);
    const page = h.app.renderPage(route);
    assert.match(page, destination.content, 'the destination renders its implemented guide or tool');
    assert.doesNotMatch(page, /Page not found|Dungeon preparation unavailable|Azeroth guide unavailable|talent records could not be loaded/);
  });
}

test('homepage updates exclude unavailable guides and omit an empty section', async () => {
  for (const [file, hiddenHref] of [
    ['world-of-warcraft-forever.json', '#game/world-of-warcraft/talent-planner'],
    ['world-of-warcraft-forever-client-data.json', '#game/world-of-warcraft/talent-planner'],
    ['world-of-warcraft-forever-dungeon-prep.json', '#game/world-of-warcraft/dungeons/deadmines']
  ]) {
    const local = await harness(null, 'available', [file]);
    const home = local.app.renderPage(local.app.readRoute('#home'));
    const links = [...home.matchAll(/<a class="home-update-card" href="([^"]+)"/g)].map(match => match[1]);
    assert.equal(links.length, 2, `${file}: other available guides remain visible`);
    assert.ok(!links.includes(hiddenHref), `${file}: no link to the unavailable guide`);
  }
  const local = await harness(null, 'available', ['world-of-warcraft-forever-client-data.json', 'world-of-warcraft-forever-dungeon-prep.json']);
  const localHeroes = local.modules.get(resolve(root, 'dist/js/heroes.js')).namespace.heroes;
  localHeroes.find(hero => hero.id === 'highwayman').contentUnavailable = true;
  const home = local.app.renderPage(local.app.readRoute('#home'));
  assert.doesNotMatch(home, /class="home-updates"/);
  assert.ok(home.includes('id="home-game-strip"'), 'the approved carousel still renders');
});

test('League of Legends and Darkest Dungeon II Coming Soon routes work', () => {
  const home = h.app.renderPage(h.app.readRoute('#home'));
  const leagueCard = home.match(/<a class="home-game-card" href="#game\/league-of-legends"[\s\S]*?<\/a>/)?.[0] || '';
  assert.ok(leagueCard.includes('League of Legends') && leagueCard.includes('Coming Soon'));
  assert.ok(leagueCard.includes('assets/images/home/league-of-legends-ahri.jpg'));
  assert.ok(leagueCard.includes('data-home-art-image'));

  const route = h.app.readRoute('#game/league-of-legends');
  assert.equal(route.view, 'preview');
  assert.equal(route.preview.id, 'league-of-legends');
  const page = h.app.renderPage(route);
  assert.ok(page.includes('id="page-title"') && page.includes('League of Legends'));
  assert.ok(page.includes('League of Legends guides are coming later.'));
  assert.match(page, /href="#home"[^>]*>← Back to Home<\/a>/);
  assert.ok(page.includes('assets/images/home/league-of-legends-ahri.jpg'));
  assert.doesNotMatch(page, /tier list|champion guide/i, 'the Coming Soon page adds no League guide content');

  const dd2Card = home.match(/<a class="home-game-card" href="#game\/darkest-dungeon-2"[\s\S]*?<\/a>/)?.[0] || '';
  assert.ok(dd2Card.includes('assets/images/home/darkest-dungeon-2.png'));
  assert.equal(h.app.readRoute('#game/darkest-dungeon-2').preview.id, 'darkest-dungeon-2');
  const dd2Page = h.app.renderPage(h.app.readRoute('#game/darkest-dungeon-2'));
  assert.ok(dd2Page.includes('assets/images/home/darkest-dungeon-2.png'));
  assert.ok(dd2Page.includes('id="page-title"') && dd2Page.includes('Darkest Dungeon II'));
  assert.ok(dd2Page.includes('Coming Soon'));
  assert.ok(dd2Page.includes('A future guide collection for heroes, skills, journeys, combat and strategies.'));
  assert.match(dd2Page, /href="#home"[^>]*>← Back to Home<\/a>/);
  assert.doesNotMatch(dd2Page, /hero guide|build guide|skill guide/i, 'the preview does not add gameplay guides');
});

test('global navigation dropdown and mobile menu support dismissal and focus return', async () => {
  const navigationModule = h.modules.get(resolve(root, 'dist/js/site-navigation.js')).namespace;
  const makeElement = () => ({
    dataset: {}, attributes: {}, listeners: {}, open: false, focused: false,
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; },
    contains(target) { return target === this || (this.children || []).includes(target); }
  });
  const header = makeElement();
  const navigation = makeElement();
  const menuToggle = makeElement();
  const dropdown = makeElement();
  const summary = makeElement();
  const dropdownLink = makeElement();
  const navLink = makeElement();
  navLink.closest = selector => selector === 'a' ? navLink : null;
  dropdown.children = [summary, dropdownLink];
  navigation.children = [dropdown, navLink];
  dropdown.querySelector = selector => selector === 'summary' ? summary : null;
  const documentListeners = {};
  const documentObject = {
    getElementById(id) { return ({ 'site-header-inner': header, 'primary-navigation': navigation, 'mobile-navigation-toggle': menuToggle, 'universes-menu': dropdown })[id]; },
    addEventListener(type, callback) { documentListeners[type] = callback; }
  };

  assert.equal(navigationModule.initializeSiteNavigation(documentObject), true);
  dropdown.open = true;
  dropdown.listeners.toggle();
  assert.equal(summary.attributes['aria-expanded'], 'true', 'native disclosure state is reflected to assistive tech');
  documentListeners.keydown({ key: 'Escape' });
  assert.equal(dropdown.open, false, 'Escape closes the dropdown');
  assert.equal(summary.focused, true, 'Escape returns focus to the dropdown trigger');

  dropdown.open = true;
  documentListeners.click({ target: makeElement() });
  assert.equal(dropdown.open, false, 'outside click closes the dropdown');
  menuToggle.listeners.click();
  assert.equal(header.dataset.menuOpen, 'true');
  assert.equal(menuToggle.attributes['aria-expanded'], 'true');
  documentListeners.keydown({ key: 'Escape' });
  assert.equal(header.dataset.menuOpen, 'false', 'Escape closes the mobile menu');
  assert.equal(menuToggle.focused, true, 'Escape returns focus to the mobile menu button');

  menuToggle.listeners.click();
  dropdown.open = true;
  navigation.listeners.click({ target: navLink });
  assert.equal(dropdown.open, false, 'following a game link closes the dropdown');
  assert.equal(header.dataset.menuOpen, 'false', 'following a game link closes the mobile menu');
});

test('global utility controls offer truthful dialogs, database navigation and implemented milestone routes', async () => {
  const shell = await readFile(resolve(root, 'dist/index.html'), 'utf8');
  assert.match(shell, /<\/header>\s*<nav id="site-utility-bar"/, 'utilities immediately follow the main header');
  const utilities = shell.match(/<nav id="site-utility-bar"[\s\S]*?<\/nav>/)?.[0] || '';
  const controls = [...utilities.matchAll(/<button\b[\s\S]*?<\/button>/g)].map(match => match[0]);
  assert.equal(controls.length, 4);
  for (const [index, label] of ['Download App', 'Discord', 'Database', 'Updates'].entries()) {
    assert.ok(controls[index].includes(`<span>${label}</span>`), label);
    assert.match(controls[index], /type="button"/);
    if (label !== 'Database') assert.match(controls[index], /aria-haspopup="dialog"/);
    assert.match(controls[index], /<svg[^>]*aria-hidden="true"/);
  }
  assert.doesNotMatch(controls[2], /aria-haspopup|aria-controls/, 'Database navigates rather than opening a dialog');
  const dialog = shell.match(/<dialog id="utility-dialog"[\s\S]*?<\/dialog>/)?.[0] || '';
  assert.match(dialog, /aria-labelledby="utility-title"/);
  assert.match(dialog, /data-utility-content="app"[\s\S]*?Coming Soon[\s\S]*?no app to download yet/);
  assert.match(dialog, /Community Coming Soon[\s\S]*?invite has not been configured/);
  assert.doesNotMatch(utilities + dialog, /\bdownload=|discord\.gg|discord\.com\/invite|\bdatetime=/, 'no download, invite or release date is invented');
  const updates = dialog.match(/<ul class="utility-updates">[\s\S]*?<\/ul>/)?.[0] || '';
  assert.equal((updates.match(/<li>/g) || []).length, 3);
  assert.ok(pack.bosses.length && pack.enemies.length && pack.curios.length, 'the encyclopedia milestone has actual reference data');
  assert.ok(wowPack.classes.length && wowClientData.races.length && wowClientData.classes.length, 'the WoW milestone has actual class, race and talent data');
  const announcement = shell.match(/<aside class="site-announcement"[\s\S]*?<\/aside>/)?.[0] || '';
  assert.match(announcement, /Explore Guides/);
  for (const [, href] of (updates + announcement).matchAll(/href="(#[^"]+)"/g)) {
    const route = h.app.readRoute(href);
    assert.notEqual(route.view, 'missing', href);
    assert.doesNotMatch(h.app.renderPage(route), /Page not found/, href);
  }
});

test('utility dialogs preserve dismissal and focus behavior; Database opens its landing route', () => {
  const utilityModule = h.modules.get(resolve(root, 'dist/js/utility-bar.js')).namespace;
  let activeElement = null;
  const makeElement = (dataset = {}) => ({
    dataset, listeners: {}, hidden: true, isConnected: true,
    addEventListener(type, callback) { this.listeners[type] = callback; },
    focus() { activeElement = this; }
  });
  const triggers = ['app', 'community', 'updates'].map(utilityPanel => makeElement({ utilityPanel }));
  const titles = ['Download App', 'Community Coming Soon', 'Project Updates'];
  const panels = triggers.map((trigger, index) => makeElement({ utilityContent: trigger.dataset.utilityPanel, utilityTitle: titles[index] }));
  const updateLinks = [makeElement(), makeElement(), makeElement()];
  panels.forEach((panel, index) => { panel.querySelectorAll = () => index === 2 ? updateLinks : []; });
  const bar = { querySelectorAll: () => triggers };
  const dialog = Object.assign(makeElement(), {
    open: false,
    querySelectorAll: () => panels,
    showModal() { this.open = true; },
    close() { this.open = false; this.listeners.close(); }
  });
  const title = makeElement();
  const closeButton = makeElement();
  const databaseButton = makeElement();
  const bodyClasses = new Set();
  const documentObject = {
    get activeElement() { return activeElement; },
    getElementById: id => ({ 'site-utility-bar': bar, 'utility-dialog': dialog, 'utility-title': title, 'close-utility-dialog': closeButton, 'utility-database': databaseButton })[id],
    body: { classList: { add: name => bodyClasses.add(name), remove: name => bodyClasses.delete(name) } }
  };
  const destinations = [];
  assert.equal(utilityModule.initializeUtilityBar({ documentObject, navigate(href) { destinations.push(href); } }), true);
  for (const [index, trigger] of triggers.entries()) {
    trigger.listeners.click();
    assert.equal(dialog.open, true);
    assert.equal(title.textContent, titles[index]);
    assert.deepEqual(panels.map(panel => panel.hidden), panels.map((_, panelIndex) => panelIndex !== index));
    assert.equal(activeElement, closeButton, 'the modal has a focused close control');
    let tabPrevented = false;
    dialog.listeners.keydown({ key: 'Tab', shiftKey: true, preventDefault() { tabPrevented = true; } });
    assert.equal(tabPrevented, true, 'Shift+Tab stays inside the active modal');
    assert.equal(activeElement, index === 2 ? updateLinks.at(-1) : closeButton);
    dialog.listeners.keydown({ key: 'Tab', shiftKey: false, preventDefault() {} });
    assert.equal(activeElement, closeButton, 'Tab wraps to the close control from the last visible link');
    if (index === 0) {
      let prevented = false;
      dialog.listeners.cancel({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true, 'native Escape/cancel uses the same dismissal and cleanup');
    } else closeButton.listeners.click();
    assert.equal(dialog.open, false);
    assert.equal(activeElement, trigger, 'dismissal returns focus to the control that opened the modal');
    assert.equal(bodyClasses.size, 0, 'closing never leaves page scrolling locked');
  }
  triggers[2].listeners.click();
  const destinationHeading = makeElement();
  destinationHeading.focus();
  dialog.listeners.click({ target: { closest: () => ({ href: '#game/world-of-warcraft' }) } });
  assert.equal(dialog.open, false, 'following an update link dismisses the panel');
  assert.equal(activeElement, destinationHeading, 'link navigation does not restore focus to the old opener');
  assert.equal(bodyClasses.size, 0);
  databaseButton.listeners.click();
  assert.deepEqual(destinations, ['#game/world-of-warcraft/database']);
  assert.equal(dialog.open, false, 'Database navigation does not open a utility dialog');
  assert.equal(bodyClasses.size, 0, 'Database navigation leaves scrolling unlocked');
});

test('global footer links, project information routes, logo, and background rails are available', async () => {
  const shell = await readFile(resolve(root, 'dist/index.html'), 'utf8');
  const footer = shell.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0] || '';
  assert.ok(footer.includes('Your adventure. Your guide.'));
  assert.ok(footer.includes('A personal fan-made gaming wiki for guides, builds and adventures.'));
  assert.ok(footer.includes('© <time data-footer-year>2026</time> BM Gaming Wiki — Personal fan project.'));
  assert.ok(footer.includes('Unofficial fan project. Not affiliated with or endorsed by'));
  assert.equal((footer.match(/<section\b|<nav\b/g) || []).length, 4, 'footer has four desktop content columns');

  const footerRoutes = [...footer.matchAll(/href="(#[^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(footerRoutes, [
    '#home', '#home/games', '#game/darkest-dungeon', '#game/world-of-warcraft',
    '#game/league-of-legends', '#game/darkest-dungeon-2', '#info/about', '#info/impressum',
    '#info/privacy', '#info/disclaimer', '#info/contact'
  ]);
  for (const href of footerRoutes) assert.notEqual(h.app.readRoute(href).view, 'missing', href);
  assert.ok(footer.includes('https://github.com/b-maystorov/gaming-wiki'));

  const logo = await readFile(resolve(root, 'dist/assets/images/bm-mark.svg'), 'utf8');
  assert.match(logo, /#071426/i);
  assert.match(logo, /#4aa8ff/i);
  assert.match(shell, /src="assets\/images\/bm-mark\.svg"/g);
  assert.equal((shell.match(/src="assets\/images\/bm-mark\.svg"/g) || []).length, 3, 'header, search and footer share the local BM mark');

  const pages = [
    ['about', /independent personal fan project/i],
    ['impressum', /not a legally sufficient Impressum/i],
    ['privacy', /localStorage/i],
    ['disclaimer', /not affiliated with, endorsed by, or sponsored by/i],
    ['contact', /Contact details and a contact form have not been configured/i]
  ];
  for (const [slug, expected] of pages) {
    const route = h.app.readRoute(`#info/${slug}`);
    assert.equal(route.view, `info-${slug}`);
    assert.match(h.app.renderPage(route), expected, `#info/${slug} renders its information page`);
  }
  const contact = h.app.renderPage(h.app.readRoute('#info/contact'));
  assert.ok(contact.includes('https://github.com/b-maystorov/gaming-wiki'));

  const portalStyles = await readFile(resolve(root, 'dist/css/portal.css'), 'utf8');
  const baseStyles = await readFile(resolve(root, 'dist/css/styles.css'), 'utf8');
  assert.match(baseStyles, /body\s*\{[^}]*radial-gradient\([^}]+#1474d5/i, 'page surround uses restrained blue gradients');
  assert.doesNotMatch(portalStyles, /body\.portal-page:has\(\.home-page\)\s*\{\s*background:\s*#[0-9a-f]{6};/i);
  assert.match(portalStyles, /\.portal-page main::before\s*\{[^}]*pointer-events:\s*none/);
  assert.match(portalStyles, /\.site-footer::before\s*\{[^}]*pointer-events:\s*none/);
  assert.match(portalStyles, /\.site-footer-grid\s*\{[^}]*grid-template-columns:\s*1\.25fr 1\.2fr 1fr \.8fr/);
  assert.match(portalStyles, /\.footer-links a:focus-visible\s*\{/);
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
    const fail = index => artwork.handleArtworkError({ target: { matches: selector => selector === '[data-entry-image]',
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
  assert.equal(artworkManifest.records.length, 17 + ['bosses', 'enemies', 'trinkets', 'items', 'curios', 'locations'].reduce((total, kind) => total + pack[kind].length, 0));
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

test('custom builder keeps four ranks, swaps whole loadouts and prevents duplicate selection', () => {
  const custom = h.modules.get(resolve(root, 'dist/js/custom-team.js')).namespace;
  const build = custom.emptyBuild();
  ['vestal', 'plague-doctor', 'highwayman', 'crusader'].forEach((id, index) => custom.selectHero(build, index, id));
  build.party[0].skills = ['test-skill'];
  custom.selectHero(build, 3, 'vestal');
  assert.equal(build.party.length, 4);
  assert.equal(new Set(build.party.map(slot => slot.heroId)).size, 4);
  assert.equal(build.party[3].skills[0], 'test-skill');
  assert.equal(build.party[0].heroId, 'crusader');
  custom.selectHero(build, 8, 'jester');
  assert.equal(build.party.length, 4);
});

test('custom skill checks use recorded ranks, distinguish incomplete references and detect stale data', () => {
  const custom = h.modules.get(resolve(root, 'dist/js/custom-team.js')).namespace;
  const abilities = h.modules.get(resolve(root, 'dist/js/hero-abilities.js')).namespace.heroAbilities;
  const heroes = h.modules.get(resolve(root, 'dist/js/heroes.js')).namespace.heroes;
  const smite = custom.combatSkills('crusader', pack, abilities).find(skill => skill.name === 'Smite');
  assert.equal(custom.skillWorks(smite, 1), true);
  assert.equal(custom.skillWorks(smite, 4), false);
  assert.equal(smite.verified, true);
  const build = custom.emptyBuild();
  custom.selectHero(build, 0, 'crusader');
  build.party[0].skills = [smite.id, 'removed-skill'];
  build.party[0].trinkets = ['removed-trinket', ''];
  build.party[1].heroId = 'removed-hero';
  build.bossId = 'removed-boss';
  const warnings = custom.analyzeBuild(build, { heroes, abilities, pack, owned: [], quantities: {}, roster: { initialized: true, heroIds: [] } }).join(' ');
  for (const message of ['cannot be used from rank 4', 'unavailable saved skill', 'unavailable saved trinket', 'saved hero may be missing', 'saved boss may be missing', 'not marked available']) assert.ok(warnings.includes(message), message);
});

test('custom trinket compatibility uses class restrictions, not guide associations, and counts physical copies', () => {
  const custom = h.modules.get(resolve(root, 'dist/js/custom-team.js')).namespace;
  const abilities = h.modules.get(resolve(root, 'dist/js/hero-abilities.js')).namespace.heroAbilities;
  const heroes = h.modules.get(resolve(root, 'dist/js/heroes.js')).namespace.heroes;
  const generic = pack.trinkets.find(item => item.routeId === 'focus-ring');
  const restricted = pack.trinkets.find(item => item.classRestrictionHeroRouteIds?.length);
  assert.equal(custom.compatibleTrinket(generic, 'crusader'), true);
  assert.equal(custom.compatibleTrinket(restricted, restricted.classRestrictionHeroRouteIds[0]), true);
  assert.equal(custom.compatibleTrinket(restricted, 'unknown-class'), false);
  assert.equal(custom.copyQuantity(generic.id, [generic.id], {}), 1);
  assert.equal(custom.copyQuantity(generic.id, [], { [generic.id]: 20 }), 0);
  const build = custom.emptyBuild();
  custom.selectHero(build, 0, 'highwayman'); custom.selectHero(build, 1, 'crusader');
  build.party[0].trinkets[0] = generic.id; build.party[1].trinkets[0] = generic.id;
  const context = { heroes, abilities, pack, owned: [generic.id], quantities: {}, roster: null };
  assert.ok(custom.analyzeBuild(build, context).some(message => message.includes('Quantity conflict')));
  context.quantities[generic.id] = 2;
  assert.equal(custom.analyzeBuild(build, context).some(message => message.includes('Quantity conflict')), false);
  context.quantities[generic.id] = 1;
  assert.ok(custom.analyzeBuild(build, context).some(message => message.includes('Quantity conflict')));
});

test('custom build library saves stable IDs, edits, loads, deletes, and survives blocked writes', () => {
  const custom = h.modules.get(resolve(root, 'dist/js/custom-team.js')).namespace;
  const values = new Map();
  let blocked = false;
  const storage = { getItem: key => values.get(key), setItem(key, value) { if (blocked) throw new Error('Quota'); values.set(key, value); } };
  const store = custom.personalStore('test-builds', [], () => storage);
  const library = custom.buildLibrary(store, () => 'stable-test-id');
  const draft = custom.emptyBuild(); draft.name = 'My party';
  const saved = library.save(draft);
  assert.equal(saved.persisted, true);
  assert.equal(saved.record.id, 'stable-test-id');
  saved.record.name = 'Edited party';
  library.save(saved.record);
  assert.equal(library.list().length, 1);
  assert.equal(library.load(saved.record.id).name, 'Edited party');
  blocked = true;
  saved.record.name = 'Session edit';
  assert.equal(library.save(saved.record).persisted, false);
  assert.equal(library.load(saved.record.id).name, 'Session edit');
  assert.equal(library.remove(saved.record.id), false);
  assert.equal(library.list().length, 0);
  const unavailable = custom.personalStore('denied', [], () => { throw new Error('Denied'); });
  assert.equal(unavailable.write([saved.record]), false);
  assert.equal(unavailable.read().length, 1);
  const corrupt = custom.buildLibrary(custom.personalStore('bad', [], () => ({ getItem: () => '{bad json' })), () => 'new');
  assert.equal(corrupt.list().length, 0);
});

test('custom builder renders inside planner and preserves boss and team routes', () => {
  const markup = h.app.renderExpeditionPlanner();
  for (const label of ['Build My Own Team', '1. Select Boss', '2. Select Four Heroes', '3. Choose Skills', '4. Equip Trinkets', '5. Review and Save', 'Swine God']) assert.ok(markup.includes(label), label);
  assert.ok(markup.includes('planner-party-content'));
  for (const boss of pack.bosses) {
    assert.ok(h.app.renderPage(h.app.readRoute(`#game/darkest-dungeon/bosses/${boss.routeId}`)).includes(boss.name));
    for (const team of boss.counterTeams || []) assert.ok(h.app.readRoute(`#game/darkest-dungeon/teams/${team.id}`).team);
  }
  assert.ok(h.app.renderEncyclopediaCollection('trinkets').includes('data-collection-quantity'));
});


test('back-to-top follows scroll threshold and routes, with reduced-motion and focus support', async () => {
  const local = await harness();
  const button = { hidden: true };
  local.elements.set('back-to-top', button);
  local.context.document.body = { classList: { toggle() {} } };
  const bossRoute = local.app.readRoute('#game/darkest-dungeon/bosses/necromancer');
  local.app.updateBackToTop(bossRoute, 499);
  assert.equal(button.hidden, true);
  local.app.updateBackToTop(bossRoute, 500);
  assert.equal(button.hidden, false);
  for (const hash of ['#home', '#game/darkest-dungeon', '#game/darkest-dungeon/expedition-planner', '#missing']) {
    local.app.updateBackToTop(local.app.readRoute(hash), 900);
    assert.equal(button.hidden, true, hash);
  }
  local.app.updateBackToTop(local.app.readRoute('#hero/crusader/abilities'), 600);
  assert.equal(button.hidden, false);
  local.app.updateBackToTop(bossRoute, 0);
  assert.equal(button.hidden, true);
  let reducedMotion = false;
  let scroll;
  let focused = false;
  local.elements.set('page-title', { focus(options) { focused = options.preventScroll; } });
  local.context.window = { matchMedia: () => ({ matches: reducedMotion }), scrollTo: options => { scroll = options; } };
  local.app.scrollBackToTop();
  assert.equal(scroll.top, 0);
  assert.equal(scroll.behavior, 'smooth');
  assert.equal(focused, true);
  reducedMotion = true;
  local.app.scrollBackToTop();
  assert.equal(scroll.behavior, 'instant');
  const shell = await readFile(resolve(root, 'dist/index.html'), 'utf8');
  assert.equal((shell.match(/id="back-to-top"/g) || []).length, 1);
  assert.ok(shell.includes('aria-label="Back to top"'));
  assert.equal(local.app.renderPage(bossRoute).includes('id="back-to-top"'), false);
});

function teamReviewFixture() {
  const custom = h.modules.get(resolve(root, 'dist/js/custom-team.js')).namespace;
  const abilities = h.modules.get(resolve(root, 'dist/js/hero-abilities.js')).namespace.heroAbilities;
  const heroes = h.modules.get(resolve(root, 'dist/js/heroes.js')).namespace.heroes;
  const build = custom.emptyBuild();
  const context = { heroes, abilities, pack, owned: [], quantities: {}, roster: null };
  const equipSkills = (index, heroId, names) => {
    custom.selectHero(build, index, heroId);
    build.party[index].skills = names.map(name => {
      const skill = custom.combatSkills(heroId, pack, abilities).find(skill => skill.name === name);
      assert.ok(skill, name);
      return skill.id;
    });
  };
  return { custom, build, context, equipSkills };
}

test('smart review groups exact rank problems with hero links and aggregates incomplete coverage', () => {
  const { custom, build, context, equipSkills } = teamReviewFixture();
  equipSkills(0, 'crusader', ['Smite']);
  equipSkills(1, 'vestal', ['Divine Grace']);
  equipSkills(2, 'jester', ['Dirk Stab']);
  const review = custom.reviewBuild(build, context);
  const issue = review.skills.find(item => item.code === 'invalid-rank');
  assert.ok(issue.text.includes('Crusader: Smite cannot be used from rank 4; requires 2, 1'));
  assert.equal(issue.links[0].href, '#hero/crusader/abilities');
  assert.equal(review.missing.filter(item => item.code === 'incomplete-skills').length, 1);
  assert.ok(review.missing.find(item => item.code === 'incomplete-skills').text.includes('Vestal, Jester'));
  assert.equal(review.equipment.length, 0);
});

test('smart equipment review names users, class restrictions, verified alternatives and DLC uncertainty', () => {
  const { custom, build, context, equipSkills } = teamReviewFixture();
  equipSkills(0, 'arbalest', ['Sniper Shot']);
  equipSkills(3, 'crusader', ['Smite']);
  build.bossId = pack.bosses.find(boss => boss.routeId === 'swine-prince').id;
  const focus = pack.trinkets.find(item => item.routeId === 'focus-ring');
  const buckle = pack.trinkets.find(item => item.classRestrictionHeroRouteIds?.includes('highwayman') && !item.requirements.dlc.length);
  build.party[0].trinkets = [focus.id, buckle.id];
  build.party[3].trinkets = [focus.id, pack.trinkets.find(item => item.routeId === 'glittering-spaulders').id];
  context.owned = [focus.id, buckle.id];
  const original = JSON.stringify(build);
  let review = custom.reviewBuild(build, context);
  const quantity = review.equipment.find(item => item.code === 'quantity-conflict' && item.text.includes('Focus Ring'));
  assert.ok(quantity.text.includes('Arbalest, Crusader'));
  assert.ok(quantity.links.some(link => link.label.startsWith('Documented alternative:')));
  assert.ok(review.equipment.some(item => item.code === 'class-restriction' && item.text.includes('Arbalest') && item.text.includes(buckle.name)));
  assert.ok(review.missing.some(item => item.code === 'dlc-required' && item.text.includes('Glittering Spaulders') && item.text.includes('Active DLC is not recorded')));
  context.quantities[focus.id] = 2;
  review = custom.reviewBuild(build, context);
  assert.equal(review.equipment.some(item => item.code === 'quantity-conflict' && item.text.includes('Focus Ring')), false);
  assert.equal(JSON.stringify(build), original, 'review never changes equipment or saved selections');
});

test('smart review handles stale records and absent targeting without fabricating coverage', () => {
  const { custom, build, context, equipSkills } = teamReviewFixture();
  equipSkills(3, 'crusader', ['Smite']);
  context.pack = structuredClone(pack);
  const skill = context.pack.combatSkills.find(skill => skill.name === 'Smite');
  delete skill.rankRules;
  delete skill.level1;
  build.party[3].skills.push('removed-skill');
  build.party[3].trinkets[0] = 'removed-item';
  build.party[0].heroId = 'removed-hero';
  const review = custom.reviewBuild(build, context);
  for (const code of ['skill-missing', 'ranks-missing', 'hero-missing', 'incomplete-skills']) assert.ok(review.missing.some(item => item.code === code), code);
  assert.ok(review.equipment.some(item => item.code === 'item-missing'));
  assert.equal(review.reminders.some(item => item.code === 'coverage'), false);
});

test('Swine God review flags documented Riposte, area and random hits but distinguishes chosen targets', () => {
  const { custom, build, context, equipSkills } = teamReviewFixture();
  build.bossId = pack.bosses.find(boss => boss.routeId === 'swine-prince').id;
  build.tier = 'Champion';
  equipSkills(0, 'arbalest', ['Blindfire', 'Sniper Shot', 'Rallying Flare']);
  equipSkills(1, 'highwayman', ['Duelist’s Advance', 'Grapeshot Blast']);
  equipSkills(2, 'man-at-arms', ['Retribution']);
  equipSkills(3, 'flagellant', ['Rain of Sorrows']);
  const review = custom.reviewBuild(build, context);
  assert.ok(review.critical.some(item => item.code === 'wilbur' && item.text.includes('Enraged Destruction')));
  assert.equal(review.critical.filter(item => item.code === 'wilbur-riposte').length, 2);
  const area = review.critical.filter(item => item.code === 'wilbur-area');
  assert.equal(area.length, 2);
  assert.ok(area.some(item => item.text.includes('Blindfire')));
  assert.ok(area.some(item => item.text.includes('Rain of Sorrows')));
  assert.equal(review.critical.some(item => /Grapeshot Blast|Sniper Shot|Rallying Flare/.test(item.text)), false);
  assert.ok(review.reminders.some(item => item.code === 'wilbur-aim' && item.text.includes('Sniper Shot')));
  assert.ok(review.reminders.some(item => item.text.includes('Champion')));
  build.bossId = pack.bosses.find(boss => boss.routeId === 'hag').id;
  const hag = custom.reviewBuild(build, context);
  assert.equal(hag.critical.length, 0);
  assert.ok(hag.reminders.some(item => item.code === 'boss-advice' && item.text.includes('ranks 3–4')));
});

test('Wilbur skill warnings require recorded damage, targeting and verified encounter evidence', () => {
  const { custom, build, context, equipSkills } = teamReviewFixture();
  build.bossId = pack.bosses.find(boss => boss.routeId === 'swine-prince').id;
  equipSkills(3, 'flagellant', ['Rain of Sorrows']);
  context.abilities = structuredClone(context.abilities);
  const row = context.abilities.flagellant.skills.find(row => row[0] === 'Rain of Sorrows');
  row[2] = 'Unknown';
  assert.equal(custom.reviewBuild(build, context).critical.some(item => item.code === 'wilbur-area'), false);
  row[2] = '3 + 4'; row[3] = '-100%';
  assert.equal(custom.reviewBuild(build, context).critical.some(item => item.code === 'wilbur-area'), false);
  context.pack = structuredClone(pack);
  context.pack.bosses.find(boss => boss.id === build.bossId).mechanics = [];
  assert.equal(custom.reviewBuild(build, context).critical.length, 0);
});

test('structured coverage separates enemy reach from healing and defense and preserves v1 saves', () => {
  const { custom, build, context, equipSkills } = teamReviewFixture();
  equipSkills(3, 'crusader', ['Smite', 'Battle Heal', 'Bulwark of Faith', 'Inspiring Cry']);
  build.id = 'v1-stable-id'; build.name = 'Existing personal build';
  const original = JSON.stringify(build);
  const store = custom.personalStore('v1-test', [], () => ({ getItem: () => `[${original}]` }));
  const library = custom.buildLibrary(store);
  const loaded = library.load(build.id);
  const review = custom.reviewBuild(loaded, context);
  const coverage = review.reminders.find(item => item.code === 'coverage');
  assert.ok(coverage.text.includes('Smite → 1, 2'));
  assert.ok(coverage.text.includes('Battle Heal, Bulwark of Faith, Inspiring Cry'));
  assert.equal(coverage.text.includes('Battle Heal →'), false);
  assert.equal(JSON.stringify(loaded), original);
  assert.equal(JSON.stringify(library.load(build.id)), original);
});

test('team review renders only populated groups as accessible collapsible findings', () => {
  const { custom, build, context } = teamReviewFixture();
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const review = custom.reviewBuild(build, context);
  review.missing[0].text = '<script>unsafe</script>';
  const html = custom.renderTeamReview(review, escape);
  assert.ok(html.includes('Review My Team'));
  assert.ok(html.includes('Missing information'));
  assert.equal(html.includes('Equipment conflicts'), false);
  assert.ok(html.includes('data-review-group="missing"'));
  assert.ok(html.includes('&lt;script>'));
  assert.equal(html.includes('<script>'), false);
  assert.ok(h.app.renderExpeditionPlanner().includes('Review My Team'));
});

test('Necromancer rear coverage never mistakes ally targets for enemy reach', () => {
  const { custom, build, context, equipSkills } = teamReviewFixture();
  build.bossId = pack.bosses.find(boss => boss.routeId === 'necromancer').id;
  equipSkills(3, 'crusader', ['Battle Heal']);
  let review = custom.reviewBuild(build, context);
  assert.ok(review.missing.some(item => item.code === 'rear-reach'), 'unfinished party makes coverage uncertain');
  equipSkills(0, 'vestal', ['Divine Grace']);
  review = custom.reviewBuild(build, context);
  assert.ok(review.missing.some(item => item.code === 'rear-reach'));
  equipSkills(2, 'highwayman', ['Pistol Shot']);
  review = custom.reviewBuild(build, context);
  assert.equal(Object.values(review).flat().some(item => item.code === 'rear-reach'), false);
  assert.ok(review.reminders.some(item => item.code === 'boss-advice' && item.text.includes('retreats')));
});

test('Ruins v2 groups every recorded enemy once and preserves valid regional relationships', () => {
  const ruins = pack.locations.find(record => record.routeId === 'ruins');
  const grouped = ruins.regionalGuide.enemyGroups.flatMap(group => group.enemyIds);
  assert.equal(new Set(grouped).size, grouped.length);
  assert.deepEqual([...grouped].sort(), [...ruins.enemyIds].sort());
  for (const [kind, ids] of [['enemies', ruins.enemyIds], ['curios', ruins.curioIds], ['bosses', ruins.bossIds]]) {
    for (const id of ids) assert.ok(pack[kind].find(record => record.id === id).regionIds.includes(ruins.regionId), id);
  }
  const bearer = pack.enemies.find(enemy => enemy.routeId === 'bone-bearer');
  assert.ok(bearer.summary.includes('Champion-only'));
  assert.ok(bearer.attacks.includes('Unholy Rally'));
  assert.ok(!bearer.attacks.includes('Drums of Doom'));
  assert.ok(ruins.regionalGuide.enemyGroups.find(group => group.id === 'elite').enemyIds.includes(bearer.id));
});

test('Ruins boss associations distinguish local quest bosses from wandering and DLC encounters', () => {
  const ruins = pack.locations.find(record => record.routeId === 'ruins');
  const html = h.app.renderEncyclopediaDetail('locations', ruins);
  const pounder = pack.bosses.find(boss => boss.routeId === 'brigand-pounder');
  assert.deepEqual(pounder.regionIds, ['darkest-dungeon-1:region:weald']);
  assert.equal(ruins.bossIds.includes(pounder.id), false);
  assert.equal(h.app.plannerBosses(ruins).some(boss => boss.id === pounder.id), false);
  assert.ok(html.includes('Regional quest bosses'));
  for (const name of ['Necromancer', 'Prophet', 'Wandering and conditional encounters', 'Guide incomplete', 'DLC: The Crimson Court', 'DLC: The Color of Madness']) assert.ok(html.includes(name), name);
});

test('Ruins curio cards link valid provisions and preserve sourced and uncertain outcomes', () => {
  const ruins = pack.locations.find(record => record.routeId === 'ruins');
  const html = h.app.renderEncyclopediaDetail('locations', ruins);
  for (const id of ruins.curioIds) {
    const curio = pack.curios.find(record => record.id === id);
    assert.ok(html.includes(`#game/darkest-dungeon/curios/${curio.routeId}`));
    for (const entry of curio.interactions) {
      if (entry.itemId) {
        const item = pack.items.find(item => item.id === entry.itemId);
        assert.ok(html.includes(`#game/darkest-dungeon/items/${item.routeId}`));
        assert.ok(item.relatedCurioIds.includes(curio.id));
      }
    }
  }
  assert.ok(html.includes('unknown, not necessarily harmful'));
  const fountain = pack.curios.find(record => record.routeId === 'holy-fountain');
  assert.ok(fountain.interactions.some(entry => entry.itemId?.endsWith(':holy-water') && entry.outcome.includes('12 HP') && entry.chance === '100%'));
  const changed = structuredClone(ruins);
  const module = h.modules.get(resolve(root, 'dist/js/region-guide.js')).namespace;
  const fakePack = structuredClone(pack);
  fakePack.curios.find(curio => curio.id === ruins.curioIds[0]).interactions[0].certainty = 'incomplete';
  const result = module.renderRegionalGuide(changed, fakePack, { escapeHtml: String, requirementLabel: () => 'Base game', renderBossCounterPreview: () => '', renderEntryArtwork: () => '' });
  assert.ok(result.includes('Outcome details incomplete'));
});

test('regional team classification does not promote boss counters or unassessed teams', () => {
  const module = h.modules.get(resolve(root, 'dist/js/region-guide.js')).namespace;
  const ruins = pack.locations.find(record => record.routeId === 'ruins');
  const teams = module.regionalTeams(ruins, pack);
  assert.equal(teams.general.length, 0);
  assert.equal(teams.bossSpecific.length, 3);
  assert.ok(teams.bossSpecific.every(team => team.boss.routeId === 'necromancer'));
  const html = h.app.renderEncyclopediaDetail('locations', ruins);
  assert.ok(html.includes('general-purpose Ruins team guide yet'));
  assert.ok(html.includes('not as a ready-made plan for every expedition'));
  assert.ok(html.includes('Starting strategy:'));
  assert.ok(html.includes('DLC: The Shieldbreaker'));
  for (const team of teams.bossSpecific) {
    for (const member of team.members) assert.ok(html.includes(`Rank ${member.position}`));
    assert.ok(html.includes(`#game/darkest-dungeon/teams/${team.id}`));
  }
  const candidate = { id: 'test-unassessed', regionIds: [], verification: { status: 'unverified' } };
  const location = structuredClone(ruins); location.regionalGuide.generalTeamIds.push(candidate.id);
  assert.equal(module.regionalTeams(location, { ...pack, teamCompositions: [candidate] }).general.length, 0);
});

test('regional artwork falls back without private images and section navigation avoids hash collisions', async () => {
  const ruins = pack.locations.find(record => record.routeId === 'ruins');
  const manifest = structuredClone(artworkManifest);
  for (const entry of manifest.records) for (const slot of ['primary', 'thumbnail', 'banner']) if (entry[slot]) entry[slot].exists = false;
  artwork.setArtworkManifest(manifest);
  try {
    const html = h.app.renderEncyclopediaDetail('locations', ruins);
    assert.equal(html.includes('assets/games/darkest-dungeon-1/private/'), false);
    for (const fallback of ['location-art-fallback', 'region-enemy-fallback', 'location-curio-fallback', 'location-boss-fallback']) assert.ok(html.includes(fallback));
    for (const match of html.matchAll(/data-region-section="([^"]+)"/g)) assert.ok(html.includes(`id="${match[1]}"`));
    assert.equal(html.includes('href="#region-'), false);
    for (const match of html.matchAll(/href="(#(?:game|hero)\/[^"]+)"/g)) assert.notEqual(h.app.readRoute(match[1]).view, 'missing', match[1]);
  } finally { artwork.setArtworkManifest(artworkManifest); }
  const css = await readFile(resolve(root, 'dist/css/styles.css'), 'utf8');
  assert.ok(css.includes('@media (max-width: 950px) { .region-card-grid, .region-overview-facts { grid-template-columns: 1fr; } }'));
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce) { .region-enemy-card'));
});

test('WoW database route renders six categories with existing local artwork', async () => {
  const route = h.app.readRoute('#game/world-of-warcraft/database');
  assert.equal(route.view, 'wow-database');
  assert.equal(h.app.readRoute('#game/world-of-warcraft/database/unknown').view, 'missing');
  const page = h.app.renderPage(route);
  assert.match(page, /<h1 id="page-title" tabindex="-1">WoW: Forever Database<\/h1>/);
  assert.ok(page.includes('Explore quests, dungeons, items and other recorded game information.'));
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
  assert.deepEqual([...page.matchAll(/data-database-category="([^"]+)"/g)].map(match => match[1]),
    ['quests', 'dungeons', 'items', 'classes', 'talents', 'zones']);
  const images = [...page.matchAll(/<img[^>]*src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(images.length, 7, 'one existing WoW banner and six category icons');
  for (const path of images) {
    assert.ok(path.startsWith('assets/images/wow-forever/'), 'database imagery stays local');
    assert.ok((await readFile(resolve(root, 'dist', path))).length > 0, path);
  }
  assert.doesNotMatch(page, /<input\b|<time\b/, 'no pretend search or publishing dates');
});

for (const category of [
  { id: 'dungeons', href: '#game/world-of-warcraft/dungeons-raids', view: 'wow-dungeons', content: /wow-dungeon-prep-link/ },
  { id: 'classes', href: '#game/world-of-warcraft/classes', view: 'wow-classes', content: /wow-class-grid/ },
  { id: 'talents', href: '#game/world-of-warcraft/talent-planner', view: 'wow-talents', content: /data-wow-talent-planner/ },
  { id: 'zones', href: '#game/world-of-warcraft/leveling', view: 'wow-leveling', content: /wow-zone-grid/ }
]) {
  test(`WoW database ${category.id} category opens an implemented page`, () => {
    const database = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/database'));
    const card = [...database.matchAll(/<a class="wow-database-card" data-database-category="([^"]+)" href="([^"]+)"[\s\S]*?<\/a>/g)]
      .find(match => match[1] === category.id);
    assert.ok(card, `${category.id}: a native keyboard-accessible link is rendered`);
    assert.equal(card[2], category.href);
    const route = h.app.readRoute(card[2]);
    assert.equal(route.view, category.view);
    const page = h.app.renderPage(route);
    assert.match(page, category.content);
    assert.doesNotMatch(page, /Page not found|Guide in preparation|could not be loaded/);
  });
}

test('WoW database quest and item indexes remain informational development cards', () => {
  const page = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/database'));
  for (const id of ['quests', 'items']) {
    const card = [...page.matchAll(/<article class="wow-database-card is-unavailable" data-database-category="([^"]+)"[\s\S]*?<\/article>/g)]
      .find(match => match[1] === id)?.[0];
    assert.ok(card, `${id}: the unfinished index is clearly marked`);
    assert.match(card, /In Development/);
    assert.doesNotMatch(card, /href=|tabindex=|role="button"/, 'unavailable categories do not pretend to be interactive');
  }
  assert.equal((page.match(/<a class="wow-database-card"/g) || []).length, 4);
});

test('WoW database disables the talent link when required talent records cannot load', async () => {
  const local = await harness(null, 'available', ['world-of-warcraft-forever-client-data.json']);
  const page = local.app.renderPage(local.app.readRoute('#game/world-of-warcraft/database'));
  assert.match(page, /<article[^>]*data-database-category="talents"[\s\S]*?Records unavailable[\s\S]*?<\/article>/);
  assert.doesNotMatch(page, /href="#game\/world-of-warcraft\/talent-planner"/);
  assert.equal((page.match(/<a class="wow-database-card"/g) || []).length, 3);
});

test('WoW landing places a named, nine-class navigation strip between the hero and guide hub', () => {
  const landing = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft'));
  const shortcuts = landing.match(/<nav class="wow-home-class-shortcuts" aria-labelledby="wow-class-shortcuts-title">[\s\S]*?<\/nav>/)?.[0];
  assert.ok(shortcuts);
  assert.match(shortcuts, /<h2 id="wow-class-shortcuts-title">Choose Your Class<\/h2>/);
  const links = [...shortcuts.matchAll(/<a class="wow-home-class-shortcut" href="([^"]+)"[\s\S]*?<\/a>/g)];
  assert.deepEqual(links.map(([, target]) => target.split('/').at(-1)), ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock', 'druid']);
  assert.doesNotMatch(shortcuts, /<button|tabindex=|role="button"|onclick=/, 'native links provide keyboard activation without nested controls');
  assert.ok(landing.indexOf('class="wow-home-hero"') < landing.indexOf(shortcuts));
  assert.ok(landing.indexOf(shortcuts) < landing.indexOf('class="wow-home-directory"'));
});

for (const classRecord of wowPack.classes) {
  test(`WoW ${classRecord.name} shortcut uses its local icon and existing class guide route`, async () => {
    const landing = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft'));
    const target = `#game/world-of-warcraft/classes/${classRecord.id}`;
    const shortcut = [...landing.matchAll(/<a class="wow-home-class-shortcut" href="([^"]+)"[\s\S]*?<\/a>/g)]
      .find(([, href]) => href === target)?.[0];
    assert.ok(shortcut, `${classRecord.name} has a full native link`);
    assert.ok(shortcut.includes(`--shortcut-accent:${classRecord.color}`));
    assert.ok(shortcut.includes(`<span class="wow-home-class-shortcut-name">${classRecord.name}</span>`));
    const icon = wowClientData.classes.find(record => record.id === classRecord.id).icon;
    assert.ok(shortcut.includes(`src="${icon}" alt=""`), 'the visible class name labels the link without a duplicate icon announcement');
    assert.ok(await readFile(resolve(root, 'dist', icon)), 'the original class icon exists locally');
    const route = h.app.readRoute(target);
    assert.equal(route.view, 'wow-class');
    assert.equal(route.classRecord.id, classRecord.id);
    const guide = h.app.renderPage(route);
    assert.ok(guide.includes(`Starting your journey as ${classRecord.name}`));
    assert.ok(guide.includes(classRecord.starterGuide.reason), 'the destination renders the implemented class guide');
    assert.doesNotMatch(guide, /class="wow-home-class-shortcuts"/, 'the strip is limited to the landing page');
  });
}

test('WoW class shortcuts retain local icons and guide links when the optional client catalog is unavailable', async () => {
  const local = await harness(null, 'available', ['world-of-warcraft-forever-client-data.json']);
  const landing = local.app.renderPage(local.app.readRoute('#game/world-of-warcraft'));
  const shortcuts = landing.match(/<nav class="wow-home-class-shortcuts"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(shortcuts);
  for (const record of wowPack.classes) {
    assert.ok(shortcuts.includes(`href="#game/world-of-warcraft/classes/${record.id}"`));
    assert.ok(shortcuts.includes(`src="${wowArtwork.classEmblems[record.id].src}"`));
  }
});

test('WoW: Forever landing, categories, nine classes, zones, and tier lists have working routes', async () => {
  const route = h.app.readRoute;
  const render = h.app.renderPage;
  assert.equal(route('#game/world-of-warcraft').view, 'wow-home');
  const landing = render(route('#game/world-of-warcraft'));
  const homeArt = wowArtwork.records.find(record => record.id === 'wow-forever:homepage:featured');
  assert.ok(homeArt, 'WoW landing hero artwork is registered locally');
  assert.ok(await readFile(resolve(root, 'dist', homeArt.src)));
  assert.ok(homeArt.src === 'assets/images/wow-forever/wow-forever-banner.png', 'landing artwork points at the supplied local image');
  assert.equal(homeArt.usageStatus, 'User-provided; redistribution rights unverified.');
  assert.ok(landing.includes(`<img src="${homeArt.src}" alt="${homeArt.alt}" width="860" height="484"`), 'landing renders the image at its native aspect ratio');
  const heroStyles = await readFile(resolve(root, 'dist/css/portal.css'), 'utf8');
  assert.ok(heroStyles.includes('.wow-home-hero-art img { display:block; visibility:visible; width:100%; height:100%; object-fit:contain; }'));
  assert.ok(landing.includes('<h1 id="page-title" tabindex="-1" class="visually-hidden">World of Warcraft: Forever</h1>'), 'the image supplies the visible branding while the page retains an accessible heading');
  assert.ok(landing.includes('Your adventure across Azeroth starts here.'));
  assert.ok(landing.includes('Continue My Journey'));
  assert.doesNotMatch(landing, /Explore Classes|href="#game\/world-of-warcraft\/classes"|data-directory-visual="classes"/, 'class navigation is provided by the nine shortcuts without duplicate hero or directory links');
  assert.ok(landing.includes('href="#game/world-of-warcraft/my-journey"'), 'Continue My Journey remains a working route');
  assert.ok(!landing.includes('wow-scene') && !landing.includes('wow-moon'), 'old ambient circles are omitted from the landing hero');
  assert.ok(!landing.includes('<nav class="wow-nav"'), 'the redundant in-game navigation row is omitted from the landing page');
  assert.match(landing, /<h2 id="wow-directory-title">Explore WoW: Forever<\/h2>/);
  assert.doesNotMatch(landing, /data-directory-visual="(?:races|talent-planner)"/, 'races and talent navigation are removed only from the landing hub');
  for (const destination of ['leveling', 'dungeons-raids', 'tier-lists']) {
    const target = `#game/world-of-warcraft/${destination}`;
    assert.ok(landing.includes(`href="${target}"`), `landing directory links to ${destination}`);
    assert.notEqual(route(target).view, 'missing', `${destination} route resolves`);
  }
  const destinationCards = [...landing.matchAll(/<a class="wow-home-destination" href="([^"]+)"[\s\S]*?<\/a>/g)];
  assert.deepEqual(destinationCards.map(([, target]) => target), ['leveling', 'dungeons-raids', 'tier-lists'].map(view => `#game/world-of-warcraft/${view}`), 'three guide cards open their existing destinations');
  for (const [, target] of destinationCards) assert.notEqual(route(target).view, 'missing', `${target} resolves`);
  assert.equal((landing.match(/class="wow-home-destination-action">Explore Guides/g) || []).length, 3, 'each card has a visible Explore Guides action');
  assert.ok(!landing.includes('wow-home-destination-number'), 'guide cards have no generic numbered labels');
  const classOverview = render(route('#game/world-of-warcraft/classes'));
  assert.ok(classOverview.includes('<nav class="wow-nav"'), 'other WoW pages retain their navigation row');
  assert.ok(!classOverview.includes('wow-banner-art'), 'landing artwork is scoped to the WoW landing hero');
  const classCardArt = wowArtwork.records.filter(record => record.kind === 'class-card');
  assert.equal(classCardArt.length, 9, 'each documented class has dedicated overview art');
  for (const item of wowPack.classes) {
    const cardArt = classCardArt.find(record => record.classId === item.id);
    assert.ok(cardArt, `missing overview artwork for ${item.name}`);
    assert.ok(classOverview.includes(cardArt.src), `${item.name} card uses its local illustration`);
    assert.ok(classOverview.includes(`href="#game/world-of-warcraft/classes/${item.id}"`));
    assert.ok(await readFile(resolve(root, 'dist', cardArt.src)));
  }
  assert.equal((classOverview.match(/class="wow-class-card-emblem"/g) || []).length, 9);
  assert.equal((classOverview.match(/class="wow-class-card-copy"/g) || []).length, 9);
  const raceOverview = render(route('#game/world-of-warcraft/races'));
  assert.equal((raceOverview.match(/data-wow-race-card/g) || []).length, 10);
  assert.ok(raceOverview.includes('data-wow-race-faction') && raceOverview.includes('data-wow-race-class'));
  for (const race of wowClientData.races) {
    const portrait = wowArtwork.racePortraits[race.id];
    assert.ok(portrait, `missing portrait mapping for ${race.name}`);
    assert.ok(raceOverview.includes(portrait.src), `${race.name} uses its local portrait`);
    assert.ok(raceOverview.includes(`data-faction="${race.faction}"`), `${race.name} retains its faction filter value`);
    assert.ok(raceOverview.includes(`data-classes="${race.classes.map(name => name.toLowerCase()).join(' ')}"`), `${race.name} retains its compatibility filter values`);
    assert.ok(await readFile(resolve(root, 'dist', portrait.src)));
  }
  for (const item of wowPack.classes) {
    const classRoute = route(`#game/world-of-warcraft/classes/${item.id}`);
    assert.equal(classRoute.view, 'wow-class', item.id);
    const classHtml = render(classRoute);
    assert.ok(classHtml.includes(item.id === 'warrior' ? '<h1 id="page-title" tabindex="-1">Warrior</h1>' : `<h2>${item.name}</h2>`));
    assert.ok(classHtml.includes('Starting your journey'));
    assert.ok(classHtml.includes(item.starterGuide.specialization));
    assert.ok(classHtml.includes(item.starterGuide.reason));
    assert.ok(classHtml.includes('Quick combat reference'));
    assert.ok(classHtml.includes('Beginner traps'));
    assert.ok(classHtml.includes('Where to quest'));
    assert.ok(wowPack.sources.some(source => source.id === item.starterGuide.sourceId), 'starter guide retains its source record');
    assert.ok(!classHtml.includes(wowPack.sources.find(source => source.id === item.starterGuide.sourceId).url), 'class card does not repeat its source URL');
    if (item.id !== 'warrior') assert.ok(classHtml.includes('Original BM Gaming Wiki illustration'));
    const art = wowArtwork.records.find(record => record.classId === item.id);
    assert.ok(art, `missing local class illustration for ${item.id}`);
    const svg = await readFile(resolve(root, 'dist', art.src), 'utf8');
    assert.ok(svg.includes('<svg') && svg.includes('BM Gaming Wiki'));
    assert.ok(art.alt.includes('not official') && art.usage.includes('no Blizzard assets'));
    assert.ok(item.starterGuide.talentPriorities.every(name => classHtml.includes(name)));
    assert.equal(item.starterGuide.levelingBands.length, 3, `${item.id} has three early leveling bands`);
    for (const band of item.starterGuide.levelingBands) assert.ok(classHtml.includes(band.range));
    assert.ok(classHtml.includes('Race and faction options'));
    assert.ok(wowPack.sources.some(source => source.id === item.sourceId && source.title), 'class guide retains source attribution data');
    for (const specialization of item.specializations) {
      const href = `#game/world-of-warcraft/builds/${item.id}/${specialization.id}`;
      if (item.id === 'warrior') assert.ok(classHtml.includes(`data-warrior-spec-tab="${specialization.id}"`));
      else {
        assert.ok(classHtml.includes(href));
        assert.equal(route(href).view, 'wow-build-detail');
      }
    }
  }
  assert.equal(wowPack.classes.length, 9);
  for (const item of wowPack.classes) {
    const levelingSource = wowPack.sources.find(source => source.id === item.starterGuide.sourceId);
    assert.ok(levelingSource?.url.includes('/wow-forever/'), `non-Forever source for ${item.id}`);
    assert.equal(levelingSource.gameVersion, 'World of Warcraft: Forever');
    assert.ok(item.starterGuide.confidence && item.starterGuide.classMilestones && item.starterGuide.gear);
  }
  assert.equal(route('#game/world-of-warcraft/classes/nonexistent').view, 'missing');
  assert.ok(render(route('#game/world-of-warcraft/leveling')).includes('Zephras Isle'));
  assert.ok(render(route('#game/world-of-warcraft/leveling')).includes('Skyborne characters'));
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const zephras = wowPack.zones.find(zone => zone.id === 'zephras-isle');
  const riverglades = wowPack.zones.find(zone => zone.id === 'riverglades');
  assert.equal(wowModule.matchesWowZoneFilters(zephras, 'Alliance', 8), true);
  assert.equal(wowModule.matchesWowZoneFilters(zephras, 'Horde', 20), false);
  assert.equal(wowModule.matchesWowZoneFilters(riverglades, 'Alliance', 60), true, 'unknown ranges remain visible');
  const memoryStorage = new Map();
  const storage = { getItem: key => memoryStorage.get(key) ?? null, setItem: (key, value) => memoryStorage.set(key, String(value)), removeItem: key => memoryStorage.delete(key) };
  const shamanProfile = { characterName: 'Mira', faction: 'Horde', race: 'Tauren', classId: 'shaman', specializationId: 'enhancement', currentLevel: 17, playstyle: 'solo-leveling', currentZone: 'the-barrens' };
  assert.equal(wowModule.saveWowProfile(shamanProfile, storage), true);
  assert.deepEqual(JSON.parse(JSON.stringify(wowModule.loadWowProfile(storage))), { ...shamanProfile, talentBuildId: '' });
  assert.equal(wowModule.saveWowProfile({ ...shamanProfile, currentLevel: 61 }, storage), false);
  assert.deepEqual(JSON.parse(JSON.stringify(wowModule.loadWowProfile({ getItem() { throw new Error('blocked'); } }))), {});
  const checks = { 'shaman:call-fire': true };
  assert.equal(wowModule.saveWowGuideProgress(checks, storage), true);
  assert.deepEqual(JSON.parse(JSON.stringify(wowModule.loadWowGuideProgress(storage))), checks);
  assert.equal(wowModule.saveWowGuideProgress(checks, { setItem() { throw new Error('blocked'); } }), false);
  const dungeonSelection = wowModule.getWowDungeonSuggestions(wowPack.dungeons, 14);
  assert.deepEqual(dungeonSelection.current.map(item => item.id), ['hall-of-thanes']);
  assert.equal(wowModule.getWowDungeonSuggestions(wowPack.dungeons, 1).upcoming[0].id, 'hall-of-thanes');
  const personalized = wowModule.renderWowPage({ view: 'wow-journey' }, wowPack, String, wowArtwork, shamanProfile, checks);
  assert.ok(personalized.includes('Mira') && personalized.includes('Level 17'));
  assert.ok(personalized.includes('Call of Fire') && personalized.includes('Tauren'));
  assert.ok(personalized.includes('Hall of Thanes') && personalized.includes('Reset checklist'));
  assert.ok(personalized.includes('data-wow-progress-id="shaman:call-fire" checked'));
  const fallbackJourney = wowModule.renderWowPage({ view: 'wow-journey' }, wowPack, String, null, shamanProfile);
  assert.ok(fallbackJourney.includes('wow-class-art-fallback'));
  assert.ok(render(route('#game/world-of-warcraft/tier-lists')).includes('Rankings under review'));
  assert.equal(route('#game/world-of-warcraft/build-finder').view, 'wow-build-finder');
  const finderModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const tankPaths = finderModule.renderWowBuildResults(wowPack, { classId: 'warrior', playstyle: 'dungeon-tank', specialization: 'all' }, String);
  assert.ok(tankPaths.includes('Protection'));
  assert.ok(!tankPaths.includes('Fury'));
  assert.ok(tankPaths.includes('not complete talent builds'));
  const soloPaths = finderModule.renderWowBuildResults(wowPack, { classId: 'warrior', playstyle: 'solo-leveling', level: '18', specialization: 'all', faction: 'Alliance' }, String);
  assert.ok(soloPaths.includes('Arms'));
  assert.ok(soloPaths.includes('No evidence-backed build mapping'));
  assert.ok(soloPaths.includes('At level 18'));
  assert.ok(soloPaths.includes('Human, Dwarf, Gnome, Night Elf, Skyborne'));
  assert.equal(wowPack.buildProfiles.length, 0, 'no unverified point-by-point builds are presented');
  assert.ok(wowPack.classes.every(item => item.specializations.length === 3 && wowPack.sources.some(source => source.id === item.sourceId)));
  assert.ok(wowPack.talentSystem.sourceIds.every(id => wowPack.sources.some(source => source.id === id)));
  assert.ok(wowPack.classes.every(item => item.specializations.every(spec => wowPack.sources.some(source => source.id === spec.sourceId))));
  assert.ok(render(route('#game/world-of-warcraft/talent-planner')).includes('data-wow-talent-planner'));
  assert.ok(render(route('#game/world-of-warcraft/talent-planner')).includes('Shaman'), 'the planner has a usable default class selection');
  assert.ok(render(route('#game/world-of-warcraft/dungeons-raids')).includes('Hall of Thanes'));
  assert.ok(render(route('#game/world-of-warcraft/dungeons-raids')).includes('13–18'));
  assert.ok(render(route('#game/world-of-warcraft/dungeons-raids')).includes('Dungeons &amp; Raids') || render(route('#game/world-of-warcraft/dungeons-raids')).includes('Dungeons & Raids'));
  assert.equal(wowPack.dungeons.length, 9);
  assert.ok(wowPack.dungeons.every(dungeon => dungeon.minLevel >= 13 && dungeon.maxLevel <= 60 && wowPack.sources.some(source => source.id === dungeon.sourceId)));
  for (const category of ['gear-professions', 'beginner-guides']) assert.ok(render(route(`#game/world-of-warcraft/${category}`)).includes('Guide in preparation'));
  assert.equal(route('#game/world-of-warcraft/my-journey').view, 'wow-journey');
  const journey = render(route('#game/world-of-warcraft/my-journey'));
  assert.ok(journey.includes('Save my character') && journey.includes('Choose a class, faction and level above'));
  assert.equal(render(route('#game/world-of-warcraft/leveling')).includes('Levels null'), false);
});

test('WoW guide hub uses three distinct supplied illustrations without changing guide destinations', async () => {
  const landing = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft'));
  const cards = [...landing.matchAll(/<a class="wow-home-destination" href="([^"]+)"[\s\S]*?<\/a>/g)];
  assert.equal(cards.length, 3);
  const images = [];
  const expected = [
    ['Leveling Guides', 'Find the best zones and routes for your next adventure.', 'wow-leveling', 'leveling', 'assets/images/wow-forever/guide-leveling-landscape.png', 1024, 831],
    ['Dungeon Guides', 'Prepare for dungeons, complete questlines and discover rewards.', 'wow-dungeons', 'dungeons-raids', 'assets/images/wow-forever/guide-dungeon-entrance.png', 640, 360],
    ['Tier Lists', 'Compare classes, specializations and available recommendations.', 'wow-tier-lists', 'tier-lists', 'assets/images/wow-forever/guide-tier-list-classes.png', 540, 180]
  ];
  let index = 0;
  for (const [card, target] of cards) {
    const [title, description, view, artworkKey, source, width, height] = expected[index++];
    assert.ok(card.includes(`<h3>${title}</h3>`));
    assert.ok(card.includes(`<p>${description}</p>`));
    assert.equal(h.app.readRoute(target).view, view);
    assert.match(card, /class="wow-home-destination-media[^\"]*"[^>]*aria-hidden="true"/, 'the title labels the link while its artwork is decorative');
    assert.equal((card.match(/<img\b/g) || []).length, 1, 'one image per card, without collages');
    assert.ok(card.includes(`src="${source}"`));
    assert.ok(card.includes(`width="${width}" height="${height}"`), 'image attributes preserve the supplied dimensions');
    assert.match(card, /class="wow-home-destination-scene"[^>]*alt=""[^>]*loading="lazy"[^>]*data-home-art-image/);
    assert.match(card, /data-home-art-fallback hidden>Artwork unavailable/);
    const metadata = wowArtwork.guideCards[artworkKey];
    assert.equal(metadata.src, source);
    assert.equal(metadata.originalWidth, width);
    assert.equal(metadata.originalHeight, height);
    assert.match(metadata.provenance, /User-provided illustration/);
    assert.match(metadata.usageStatus, /rights unverified/);
    for (const [, path] of card.matchAll(/<img[^>]*src="([^"]+)"/g)) {
      images.push(path);
      assert.match(path, /^assets\/images\/(home|wow-forever)\/.*\.(png|jpg)$/);
      assert.ok((await readFile(resolve(root, 'dist', path))).length > 0, `${path} exists locally`);
    }
    assert.doesNotMatch(card, /<svg\b|https?:\/\/|<button\b|tabindex="-1"/, 'cards contain no substitute SVG art, hotlinks or nested controls');
    assert.doesNotMatch(card, /wow-home-media-(icons|token|icon)|wow-home-destination-fallback-icon|wow-forever-banner\.png|Eingefügtes Bild \(4\)\.png/, 'placeholder icons, repeated hero artwork and the unused fourth image are absent');
  }
  assert.deepEqual(images, expected.map(([, , , , source]) => source));
  assert.equal(new Set(images).size, 3, 'each visual is unique');
  const portalStyles = await readFile(resolve(root, 'dist/css/portal.css'), 'utf8');
  assert.match(portalStyles, /\.wow-home-destination-media\s*\{[^}]*position:absolute;[^}]*inset:0;[^}]*height:100%/s, 'guide artwork covers the full card behind the caption');
  assert.match(portalStyles, /\.wow-home-destination-scene\s*\{[^}]*object-fit:cover;[^}]*object-position:center/s, 'all supplied scenes use a centered cover crop');
});

test('WoW guide images render when the optional artwork manifest cannot load', async () => {
  const local = await harness(null, 'available', ['world-of-warcraft-forever-artwork.json']);
  const landing = local.app.renderPage(local.app.readRoute('#game/world-of-warcraft'));
  assert.equal((landing.match(/class="wow-home-destination-scene"/g) || []).length, 3);
  for (const filename of ['guide-leveling-landscape.png', 'guide-dungeon-entrance.png', 'guide-tier-list-classes.png']) {
    assert.ok(landing.includes(`src="assets/images/wow-forever/${filename}"`));
  }
  assert.doesNotMatch(landing, /class="wow-home-destination-media is-fallback"/);
});

test('WoW Forever race, class icon, talent planner, storage, and share data stay valid', async () => {
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  assert.equal(wowClientData.classes.length, 9);
  assert.equal(wowClientData.races.length, 10);
  assert.equal(wowClientData.iconAudit.talentRecords, 467);
  assert.equal(wowClientData.iconAudit.talentsWithLocalIcons, 467);
  assert.equal(wowClientData.iconAudit.brokenTalentIconPaths, 0);
  assert.equal(wowClientData.iconAudit.unverifiedTalentRecords, 0);

  const classOverview = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/classes'));
  assert.equal((classOverview.match(/class="wow-class-card"/g) || []).length, wowPack.classes.length);
  assert.equal((classOverview.match(/class="wow-class-card-art"/g) || []).length, wowPack.classes.length);
  assert.equal((classOverview.match(/class="wow-class-card-emblem"/g) || []).length, wowPack.classes.length);
  assert.ok(classOverview.includes('wow-class-card-copy') && classOverview.includes('wow-class-card-link'));
  const portalStyles = await readFile(resolve(root, 'dist/css/portal.css'), 'utf8');
  assert.match(portalStyles, /\.wow-class-card\s*\{[^}]*grid-template-rows:11\.5rem 1fr/s);
  assert.match(portalStyles, /\.wow-class-card-art\s*>\s*img\s*\{[^}]*object-fit:cover/s);
  assert.match(portalStyles, /\.wow-class-card-icon\s*\{[^}]*width:2\.7rem;[^}]*height:2\.7rem/s);

  for (const classRecord of wowClientData.classes) {
    assert.ok(classRecord.icon, `class emblem missing for ${classRecord.name}`);
    assert.ok(await readFile(resolve(root, 'dist', classRecord.icon)));
    assert.equal(classRecord.trees.length, 3, `${classRecord.name} should have three trees`);
    const detail = h.app.renderPage(h.app.readRoute(`#game/world-of-warcraft/classes/${classRecord.id}`));
    assert.ok(detail.includes(classRecord.icon), `${classRecord.name} class guide should use its emblem`);
    for (const tree of classRecord.trees) {
      assert.ok(tree.talents.length > 0);
      const names = new Set(tree.talents.map(talent => talent.name));
      for (const talent of tree.talents) {
        assert.ok(talent.id && talent.row >= 1 && talent.column >= 1);
        assert.equal(talent.rankEffects.length, talent.maxRank, `${talent.name} rank effects`);
        assert.equal(talent.confirmedRanks.length, talent.maxRank, `${talent.name} confirmed ranks`);
        assert.ok(talent.icon && await readFile(resolve(root, 'dist', talent.icon)), `missing local talent icon ${talent.iconToken}`);
        assert.ok(!talent.prerequisite || names.has(talent.prerequisite), `stale prerequisite ${talent.prerequisite}`);
      }
    }
  }

  const raceCombinations = wowPack.raceCombinations;
  for (const race of wowClientData.races) {
    const baseName = race.name.replace(/ \([^)]*\)$/, '');
    const official = raceCombinations[race.faction]?.[baseName];
    assert.ok(official, `missing official race matrix record ${race.faction} ${baseName}`);
    assert.deepEqual([...race.classes].sort(), [...official].sort(), `${race.name} Forever class access`);
    const route = h.app.readRoute(`#game/world-of-warcraft/races/${race.id}`);
    assert.equal(route.view, 'wow-race');
    const page = h.app.renderPage(route);
    assert.ok(page.includes(race.name) && page.includes('Racial abilities'));
    for (const ability of race.abilities) assert.ok(page.includes(ability.name.replaceAll("'", '&#39;')), `${race.name} racial ability missing from its detail route: ${ability.name}`);
  }
  const racePage = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/races'));
  assert.equal((racePage.match(/data-wow-race-card/g) || []).length, 10);
  const skyborne = wowClientData.races.find(race => race.id === 'skyborne-windshaper');
  assert.equal(skyborne.icon, '', 'unavailable icon has an explicit fallback path');
  assert.ok(h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/races/skyborne-windshaper')).includes('wow-race-emblem is-fallback'));
  for (const faction of ['Alliance', 'Horde']) {
    for (const classRecord of wowPack.classes) {
      const options = wowModule.getWowRaceOptions(wowClientData, faction, classRecord.name);
      assert.deepEqual(options.map(race => race.name).sort(), Object.entries(raceCombinations[faction]).filter(([, names]) => names.includes(classRecord.name)).map(([name]) => name === 'Skyborne' ? `${name} (${faction === 'Alliance' ? 'High Order' : 'Windshaper'})` : name).sort());
    }
  }

  assert.equal(wowModule.availableWowTalentPoints(9, 0), 0);
  assert.equal(wowModule.availableWowTalentPoints(10, 0), 1);
  assert.equal(wowModule.availableWowTalentPoints(5, 5), 1);
  assert.equal(wowModule.availableWowTalentPoints(60, 5), 51);
  const warrior = wowClientData.classes.find(record => record.id === 'warrior');
  const arms = warrior.trees.find(tree => tree.id === 'arms');
  const child = arms.talents.find(talent => talent.prerequisite);
  const prerequisite = arms.talents.find(talent => talent.name === child.prerequisite);
  const blocked = wowModule.adjustWowTalentRank(warrior, {}, child.id, 1, 51);
  assert.match(blocked.error, new RegExp(child.prerequisite));
  let allocation = {};
  for (let rank = 0; rank < prerequisite.maxRank; rank++) {
    const result = wowModule.adjustWowTalentRank(warrior, allocation, prerequisite.id, 1, 51);
    assert.equal(result.error, '');
    allocation = result.allocation;
  }
  const unlocked = wowModule.adjustWowTalentRank(warrior, allocation, child.id, 1, 51);
  assert.equal(unlocked.error, '');
  assert.equal(wowModule.validateWowTalentAllocation(warrior, unlocked.allocation, 51).valid, true);
  assert.match(wowModule.adjustWowTalentRank(warrior, unlocked.allocation, prerequisite.id, -1, 51).error, /Remove points/);
  let capped = { [prerequisite.id]: prerequisite.maxRank };
  assert.match(wowModule.adjustWowTalentRank(warrior, capped, prerequisite.id, 1, 51).error, /maximum rank/);
  const tooMany = { [prerequisite.id]: prerequisite.maxRank, stale: 100 };
  assert.equal(wowModule.validateWowTalentAllocation(warrior, tooMany, 1).valid, false);

  const memory = new Map();
  const storage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
  const profileKey = wowModule.WOW_PROFILE_STORAGE_KEY;
  storage.setItem(profileKey, JSON.stringify({ characterName: 'Old save', faction: 'Horde', race: 'Skyborne', classId: 'shaman', specializationId: 'enhancement', currentLevel: 12, playstyle: 'solo-leveling', currentZone: 'zephras-isle' }));
  const migrated = wowModule.loadWowProfile(storage);
  assert.equal(migrated.characterName, 'Old save');
  assert.equal(migrated.currentLevel, 12);
  assert.equal(migrated.talentBuildId, '');
  assert.equal(wowModule.saveWowProfile({ ...migrated, talentBuildId: 'stable-build-id' }, storage), true);
  assert.equal(wowModule.loadWowProfile(storage).talentBuildId, 'stable-build-id');

  const build = { id: 'stable-build-id', name: 'Arms draft', classId: 'warrior', specializationId: 'arms', level: 60, talentedRank: 0, allocation: unlocked.allocation, dataVersion: wowClientData.clientBuild };
  assert.equal(wowModule.saveWowTalentBuild(build, storage), true);
  assert.equal(wowModule.loadWowTalentBuilds(storage)[0].id, build.id);
  assert.equal(wowModule.loadWowTalentBuilds(storage)[0].specializationId, 'arms');
  assert.equal(wowModule.saveWowTalentBuild({ ...build, name: 'Arms draft edited' }, storage), true);
  assert.equal(wowModule.loadWowTalentBuilds(storage).length, 1, 'saving edits to a stable build ID replaces that record');
  assert.equal(wowModule.loadWowTalentBuilds(storage)[0].name, 'Arms draft edited');
  wowModule.saveWowTalentDraft({ classId: 'warrior', level: 60, talentedRank: 0, allocation: unlocked.allocation, name: 'Arms draft edited', editingBuildId: build.id }, storage);
  assert.equal(wowModule.loadWowTalentDraft(storage).editingBuildId, build.id, 'the editor keeps the saved record ID across reloads');
  const shared = wowModule.encodeWowTalentBuild(build);
  assert.deepEqual(JSON.parse(JSON.stringify(wowModule.decodeWowTalentBuild(shared, wowClientData))), JSON.parse(JSON.stringify({ classId: 'warrior', specializationId: 'arms', level: 60, talentedRank: 0, allocation: unlocked.allocation, mode: 'custom', guidedBuildId: '' })));
  assert.equal(wowModule.decodeWowTalentBuild(encodeURIComponent(JSON.stringify({ version: 'stale', classId: 'warrior' })), wowClientData), null);
  assert.equal(wowModule.decodeWowTalentBuild('%7Bbad-json', wowClientData), null);
  assert.equal(wowModule.deleteWowTalentBuild(build.id, storage), true);
  assert.equal(wowModule.loadWowTalentBuilds(storage).length, 0);
  assert.equal(wowModule.saveWowTalentBuild(build, { setItem() { throw new Error('denied'); } }), false);
  assert.equal(wowModule.loadWowTalentBuilds({ getItem() { throw new Error('denied'); } }).length, 0);

  h.context.localStorage.setItem(wowModule.WOW_TALENT_BUILDS_STORAGE_KEY, JSON.stringify([build]));
  assert.equal(wowModule.loadWowTalentBuilds(h.context.localStorage).length, 1);
  wowModule.saveWowTalentDraft({ classId: 'warrior', level: 60, talentedRank: 0, allocation: {}, name: '' }, h.context.localStorage);
  const planner = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/talent-planner'));
  assert.ok(planner.includes('data-wow-talent-add') && planner.includes('data-wow-talent-remove'));
  assert.ok(planner.includes('data-wow-talent-save') && planner.includes('data-wow-talent-load'));
  assert.ok(planner.includes('data-wow-talent-level-slider'), 'the planner exposes a keyboard-accessible leveling slider');
  assert.ok(planner.includes('data-wow-talent-spec') && planner.includes('Previous level') && planner.includes('Next level'));
  assert.equal((planner.match(/class="wow-talent-tree"/g) || []).length, 3, 'the planner renders all three recorded class trees');
  assert.match(planner, /grid-row:\d+;grid-column:\d+/, 'talent placement uses recorded grid coordinates');
  assert.ok(planner.includes('wow-talent-rank'), 'each talent node displays its current and maximum ranks above its icon');
  assert.ok(planner.includes('Copy share link') && planner.includes('does not verify per-row point gates'));
  assert.match(portalStyles, /\.wow-game-icon\s*\{[^}]*aspect-ratio:1;[^}]*object-fit:contain/s, 'WoW icon frames stay square and preserve the full image');
  assert.match(portalStyles, /\.wow-talent-icon\s*\{[^}]*width:2\.9rem;[^}]*height:2\.9rem/s, 'talent icons stay at a fixed game-icon size');
  assert.ok(h.app.readRoute(`#game/world-of-warcraft/talent-planner/${shared}`).sharedBuildToken);
  assert.equal(h.app.readRoute('#game/world-of-warcraft/races/not-a-race').view, 'missing');
});

test('WoW specialization heroes keep game icons separate from original artwork', async () => {
  const portalStyles = await readFile(resolve(root, 'dist/css/portal.css'), 'utf8');
  const shamanElemental = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/builds/shaman/elemental'));
  assert.ok(shamanElemental.includes('assets/images/wow-forever/elemental-shaman.svg'), 'Elemental selects its dedicated storm art');
  assert.ok(shamanElemental.includes('Open Manual Talent Planner'), 'Elemental has a manual-planning action because it has no verified guided route');
  assert.doesNotMatch(shamanElemental, /data-wow-build-id="bm-shaman-enhancement-solo-10-30"/);
  assert.ok(shamanElemental.includes('wow-class-emblem-large') && shamanElemental.includes('wow-specialization-icon'));
  assert.match(portalStyles, /\.wow-build-artwork\s*\{[^}]*width:100%;[^}]*height:100%;[^}]*object-fit:contain/s);
  assert.match(portalStyles, /\.wow-class-emblem-large\s*\{[^}]*width:4rem;[^}]*height:4rem;[^}]*object-fit:contain/s);
  assert.match(portalStyles, /\.wow-specialization-icon\s*\{[^}]*width:2\.9rem;[^}]*height:2\.9rem;[^}]*aspect-ratio:1/s);
  assert.doesNotMatch(portalStyles, /\.wow-build-hero\s+img\s*\{/, 'decorative art sizing must not target nested functional icons');
  for (const classRecord of wowPack.classes) {
    for (const spec of classRecord.specializations) {
      const html = h.app.renderPage(h.app.readRoute(`#game/world-of-warcraft/builds/${classRecord.id}/${spec.id}`));
      assert.ok(html.includes(spec.name), `${classRecord.name} ${spec.name} route renders`);
      assert.ok(html.includes('wow-specialization-icon'), `${classRecord.name} ${spec.name} has its tree emblem`);
      assert.ok(html.includes(`data-wow-build-class="${classRecord.id}"`) && html.includes(`data-wow-build-spec="${spec.id}"`), `${classRecord.name} ${spec.name} has a context-aware talent action`);
      assert.doesNotMatch(html, /wow-build-artwork[^>]+src="assets\/images\/wow-forever\/icons\//, `${classRecord.name} ${spec.name} uses decorative art, not an enlarged game icon`);
    }
  }
  const restoration = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/builds/shaman/restoration'));
  assert.ok(restoration.includes('assets/images/wow-forever/restoration-shaman.svg'));
});

test('WoW class and specialization pages link related guide cards only to implemented sibling routes', () => {
  const sectionLinks = html => {
    const section = html.match(/<section class="wow-related-guides"[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, 'page renders the reusable Related Guides section');
    const links = [...section.matchAll(/<a class="wow-related-guide-card" href="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(links).size, links.length, 'the section does not repeat destinations');
    assert.ok(section.includes('wow-related-guide-copy') && section.includes('Browse the existing zone directory'));
    for (const href of links) assert.notEqual(h.app.readRoute(href).view, 'missing', `unimplemented related route: ${href}`);
    return { section, links };
  };

  for (const classRecord of wowPack.classes) {
    const classHtml = h.app.renderPage(h.app.readRoute(`#game/world-of-warcraft/classes/${classRecord.id}`));
    if (classRecord.id === 'warrior') assert.doesNotMatch(classHtml, /class="wow-related-guides"/);
    else {
      const classSection = sectionLinks(classHtml);
      assert.ok(classSection.links.includes('#game/world-of-warcraft/talent-planner'));
      const classPlannerAnchor = classSection.section.match(/<a class="wow-related-guide-card" href="#game\/world-of-warcraft\/talent-planner"([^>]*)>/)?.[1] || '';
      assert.match(classPlannerAnchor, new RegExp(`data-wow-build-class="${classRecord.id}"`), 'planner link carries the relevant class selection');
      assert.ok(classSection.links.includes('#game/world-of-warcraft/leveling'));
      assert.ok(!classSection.links.includes(`#game/world-of-warcraft/classes/${classRecord.id}`), 'class overview does not link to itself');
      for (const spec of classRecord.specializations) assert.ok(classSection.links.includes(`#game/world-of-warcraft/builds/${classRecord.id}/${spec.id}`));
    }

    for (const spec of classRecord.specializations) {
      const specRoute = h.app.readRoute(`#game/world-of-warcraft/builds/${classRecord.id}/${spec.id}`);
      const specSection = sectionLinks(h.app.renderPage(specRoute));
      assert.ok(specSection.links.includes(`#game/world-of-warcraft/classes/${classRecord.id}`));
      assert.ok(specSection.links.includes('#game/world-of-warcraft/talent-planner'));
      const plannerAnchor = specSection.section.match(/<a class="wow-related-guide-card" href="#game\/world-of-warcraft\/talent-planner"([^>]*)>/)?.[1] || '';
      assert.match(plannerAnchor, new RegExp(`data-wow-build-spec="${spec.id}"`), 'planner link carries the current specialization');
      assert.ok(specSection.links.includes('#game/world-of-warcraft/leveling'));
      assert.ok(!specSection.links.includes(`#game/world-of-warcraft/builds/${classRecord.id}/${spec.id}`), 'specialization pages do not link to themselves');
      for (const otherSpec of classRecord.specializations.filter(item => item.id !== spec.id)) {
        assert.ok(specSection.links.includes(`#game/world-of-warcraft/builds/${classRecord.id}/${otherSpec.id}`));
      }
    }
  }
});

test('Enhancement Shaman has a sourced, playable guide with honest talent and art fallbacks', async () => {
  const route = h.app.readRoute('#game/world-of-warcraft/builds/shaman/enhancement');
  assert.equal(route.view, 'wow-build-detail');
  assert.equal(route.classRecord.id, 'shaman');
  assert.equal(route.specialization.id, 'enhancement');
  const html = h.app.renderPage(route);
  for (const section of ['Second-monitor reference', 'Switch to Play Mode', 'Enhancement at a glance', 'Solo leveling', 'Talent milestones', 'Live combat reference', 'Totems & utility', 'Leveling stat guide', 'Shaman totem quests', 'Faction areas and dungeon options', 'Level 60 priority reference']) assert.ok(html.includes(section), section);
  for (const talent of ['Shamanistic Focus', 'Stormstrike', 'Improved Stormstrike', 'Mindfulness', 'Water Shield', 'Maelstrom Weapon']) assert.ok(html.includes(talent), talent);
  for (const ability of ['Rockbiter Weapon', 'Windfury Weapon', 'Earth Shock', 'Fire Nova', 'Healing Wave', 'Totemic Recall']) assert.ok(html.includes(ability), ability);
  for (const milestone of wowPack.enhancementGuide.talentMilestones) assert.ok(html.includes(`data-enhancement-milestone="${milestone.level}"`));
  assert.ok(html.includes('Rank not specified in the source text'));
  assert.ok(html.includes('Provisional') && html.includes('beta testing ended at level 30'));
  assert.ok(html.includes('data-wow-play-mode hidden') && html.includes('data-wow-play-mode-toggle'));
  assert.ok(html.includes('Call of Earth') && html.includes('Call of Fire') && html.includes('Call of Water') && html.includes('Call of Air'));
  assert.ok(html.includes('Ragefire Chasm') && html.includes('Hall of Thanes'));
  assert.ok(html.includes('Stormstrike anchors the rotation'));
  for (const id of wowPack.enhancementGuide.sourceIds) {
    const source = wowPack.sources.find(item => item.id === id);
    assert.ok(source, `missing source ${id}`);
    assert.equal(source.gameVersion, 'World of Warcraft: Forever');
    assert.ok(source.updatedDate && source.confidence && source.url.startsWith('https://'));
  }
  assert.equal(wowPack.enhancementGuide.level60Builds.every(build => build.status === 'provisional'), true);
  assert.equal(wowPack.enhancementGuide.levelRangeDisclosure.includes('without assigning unsupported level bands'), true);
  for (const item of wowArtwork.records) {
    assert.ok(item.provenance && item.usage);
    assert.ok(await readFile(resolve(root, 'dist', item.src)));
  }
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const fallback = wowModule.renderWowPage(route, wowPack, String, null);
  assert.ok(fallback.includes('enhancement-art-fallback'));
  assert.equal(fallback.includes('src=""'), false);
  for (const href of ['#game/world-of-warcraft/classes/shaman', '#game/world-of-warcraft/talent-planner', '#game/world-of-warcraft/leveling', '#game/world-of-warcraft/dungeons-raids']) assert.notEqual(h.app.readRoute(href).view, 'missing', href);
});

test('guided Enhancement build resolves documented level snapshots without projecting beyond coverage', () => {
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const route = wowGuidedData.builds.find(build => build.id === 'bm-shaman-enhancement-solo-10-30');
  assert.ok(route);
  const validation = wowModule.validateWowGuidedBuild(route, wowClientData);
  assert.equal(validation.valid, true, validation.issues.join('; '));
  const snapshot = level => wowModule.resolveWowGuidedBuild(route, wowClientData, level);
  const talentId = name => wowClientData.classes.find(item => item.id === 'shaman').trees.flatMap(tree => tree.talents).find(talent => talent.name === name).id;
  assert.equal(snapshot(10).total, 1);
  assert.equal(snapshot(14).allocation[talentId('Thundering Strikes')], 5);
  assert.equal(snapshot(20).allocation[talentId('Shamanistic Focus')], 1);
  assert.equal(snapshot(25).allocation[talentId('Stormstrike')], 1);
  assert.equal(snapshot(25).total, 16);
  assert.equal(snapshot(30).allocation[talentId('Improved Stormstrike')], 1);
  assert.equal(snapshot(30).total, 21);
  assert.equal(snapshot(31).covered, false);
  assert.equal(snapshot(31).snapshotLevel, 30);
  assert.equal(snapshot(31).total, 21);
  assert.equal(route.allocations.length, 21, 'the route contains ordered point events, not only an end distribution');
  const invalid = structuredClone(route);
  invalid.allocations[0].talentId = 'missing-talent';
  assert.equal(wowModule.validateWowGuidedBuild(invalid, wowClientData).valid, false);
  const missingLevel = structuredClone(route);
  missingLevel.allocations = missingLevel.allocations.filter(change => change.level !== 11);
  assert.equal(wowModule.validateWowGuidedBuild(missingLevel, wowClientData).valid, false);
  const noPrerequisiteTalents = wowClientData.classes.find(item => item.id === 'shaman').trees.flatMap(tree => tree.talents).filter(talent => !talent.prerequisite);
  const respecBuild = {
    ...route,
    levelRange: { from: 10, through: 12 },
    coverage: { ...route.coverage, highestDocumentedLevel: 12 },
    allocations: [10, 11, 12].map((level, index) => ({ level, talentId: noPrerequisiteTalents[index + 1].id, rankAdded: 1 })),
    respecEvents: [{ level: 11, toAllocation: { [noPrerequisiteTalents[0].id]: 1 }, reason: 'Switch to a recorded test distribution.' }]
  };
  assert.equal(wowModule.validateWowGuidedBuild(respecBuild, wowClientData).valid, true);
  const respecState = wowModule.resolveWowGuidedBuild(respecBuild, wowClientData, 11);
  assert.ok(respecState.respecAtRequestedLevel);
  assert.equal(respecState.respecAtRequestedLevel.oldAllocation[noPrerequisiteTalents[1].id], 1);
  assert.equal(respecState.respecAtRequestedLevel.newAllocation[noPrerequisiteTalents[0].id], 1);
  assert.equal(respecState.allocation[noPrerequisiteTalents[1].id], undefined, 'a respec removes the prior allocation');
  assert.equal(respecState.allocation[noPrerequisiteTalents[2].id], 1, 'the point recorded at the respec level is applied after the reset');
  assert.ok(wowGuidedData.builds.filter(build => !build.companionOnly).every(build => build.classId === 'shaman'), 'only planner-supported routes appear in the shared talent planner catalog');
});

test('guided planner renders its controls, progression, level state, and guide navigation', () => {
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  h.context.localStorage.removeItem(wowModule.WOW_TALENT_DRAFT_STORAGE_KEY);
  const route = wowGuidedData.builds[0];
  const resolved = wowModule.resolveWowGuidedBuild(route, wowClientData, 15);
  assert.equal(resolved.changesAtRequestedLevel[0].talentId, 'shaman-enhancement-improved-lightning-shield');
  const html = wowModule.renderWowPage({ view: 'wow-talents' }, wowPack, String, wowArtwork, { classId: 'shaman', specializationId: 'enhancement', currentLevel: 15 }, {}, wowClientData, wowGuidedData);
  assert.match(html, /Guided Leveling/);
  assert.match(html, /Custom Build/);
  assert.match(html, /At level 15, this build adds/);
  assert.match(html, /Next recommended talent/);
  assert.match(html, /data-wow-guided-level="15"/);
  assert.match(html, /data-wow-talent-level-slider/);
  assert.match(html, /data-guided-allocation=/);
  assert.match(html, /Copy this guided build link/);
  assert.match(html, /class="wow-next-recommended-panel"/);
  assert.match(html, /Next recommended talent · Level 16/);
  assert.match(html, /Improved Lightning Shield/);
  assert.match(html, /Rank 2\/3/);
  const nextTalentRecord = wowClientData.classes.find(item => item.id === 'shaman').trees.flatMap(tree => tree.talents).find(talent => talent.name === 'Improved Lightning Shield');
  assert.ok(html.includes(nextTalentRecord.icon), 'the panel uses the recorded local talent icon');
  assert.ok(html.includes(nextTalentRecord.rankEffects[1]), 'the panel explains the documented next-rank effect');
  assert.equal((html.match(/class="wow-talent-tree"/g) || []).length, 3);
  h.context.localStorage.removeItem(wowModule.WOW_TALENT_DRAFT_STORAGE_KEY);
  const completed = wowModule.renderWowPage({ view: 'wow-talents' }, wowPack, String, wowArtwork, { classId: 'shaman', specializationId: 'enhancement', currentLevel: 31 }, {}, wowClientData, wowGuidedData);
  assert.match(completed, /route ends at level 30; later points are not projected/);
  h.context.localStorage.removeItem(wowModule.WOW_TALENT_DRAFT_STORAGE_KEY);
  const unsupported = wowModule.renderWowPage({ view: 'wow-talents' }, wowPack, String, wowArtwork, { classId: 'warrior', specializationId: 'arms', currentLevel: 20 }, {}, wowClientData, wowGuidedData);
  assert.match(unsupported, /No automatic build is currently available for Warrior/);
  assert.doesNotMatch(unsupported, /class="wow-next-recommended-panel"/, 'the automatic next-talent panel does not alter custom mode');
  const guide = wowModule.renderWowPage({ view: 'wow-build-detail', classRecord: wowPack.classes.find(item => item.id === 'shaman'), specialization: wowPack.classes.find(item => item.id === 'shaman').specializations.find(item => item.id === 'enhancement') }, wowPack, String, wowArtwork, { currentLevel: 15 }, {}, wowClientData, wowGuidedData);
  assert.match(guide, /Follow Leveling Build/);
  assert.match(guide, /data-wow-build-id="bm-shaman-enhancement-solo-10-30"/);
  assert.match(guide, /Current allocation:/);
  assert.match(guide, /Next recommended talent:/);
});

test('talent draft migration and guided share state preserve custom allocations', () => {
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, String(value)) };
  memory.set(wowModule.WOW_TALENT_DRAFT_STORAGE_KEY, JSON.stringify({ classId: 'shaman', specializationId: 'enhancement', level: 18, allocation: { keep: 1 }, name: 'Existing custom' }));
  const migrated = wowModule.loadWowTalentDraft(storage);
  assert.equal(migrated.mode, 'custom');
  assert.deepEqual(JSON.parse(JSON.stringify(migrated.allocation)), { keep: 1 });
  wowModule.saveWowTalentDraft({ ...migrated, mode: 'guided', guidedBuildId: wowGuidedData.builds[0].id }, storage);
  assert.deepEqual(JSON.parse(JSON.stringify(wowModule.loadWowTalentDraft(storage).allocation)), { keep: 1 });
  const point = wowModule.resolveWowGuidedBuild(wowGuidedData.builds[0], wowClientData, 20);
  const token = wowModule.encodeWowTalentBuild({ dataVersion: wowClientData.clientBuild, classId: 'shaman', specializationId: 'enhancement', level: 20, allocation: point.allocation, mode: 'guided', guidedBuildId: wowGuidedData.builds[0].id });
  const restored = wowModule.decodeWowTalentBuild(token, wowClientData);
  assert.equal(restored.mode, 'guided');
  assert.equal(restored.guidedBuildId, wowGuidedData.builds[0].id);
  assert.equal(wowModule.validateWowTalentAllocation(wowClientData.classes.find(item => item.id === 'shaman'), restored.allocation, 11).valid, true);
});

test('WoW dungeon preparation routes, quest relationships, faction filtering, local progress and missing data', async () => {
  const h = await harness();
  for (const id of ['shadowfang-keep', 'wailing-caverns', 'ruins-of-lordaeron', 'hall-of-thanes', 'deadmines']) {
    assert.equal(h.app.readRoute(`#game/world-of-warcraft/dungeons/${id}`).view, 'wow-dungeon-prep');
  }
  const prep = h.modules.get(resolve(root, 'dist/js/wow-dungeon-prep.js')).namespace;
  assert.deepEqual(prep.filterDungeonQuests(dungeonPrepData.dungeons.find(item => item.id === 'shadowfang-keep'), 'Alliance'), []);
  assert.equal(prep.countDocumentedRewardItems({ rewards: 'Ironforge Greathammer; Deepblaze; Calibrated Blunderbuss' }), 3);
  assert.equal(prep.countDocumentedRewardItems({ rewards: 'No gear reward' }), 0);
  const ruins = dungeonPrepData.dungeons.find(item => item.id === 'ruins-of-lordaeron');
  const allianceQuests = prep.filterDungeonQuests(ruins, 'Alliance');
  assert.ok(allianceQuests.every(item => item.factions.includes('Alliance')));
  assert.deepEqual(ruins.quests.find(item => item.id === 'ruins-new-plague').prerequisites, ['A Recipe For Death']);
  assert.deepEqual(ruins.quests.find(item => item.id === 'ruins-wrath').prerequisites, ['Rear Guard Patrol']);
  assert.equal(dungeonPrepData.dungeons.find(item => item.id === 'deadmines').quests.find(item => item.id === 'dm-testing-wells').stage, 'OUTDOOR PREREQUISITE');
  assert.equal(dungeonPrepData.dungeons.find(item => item.id === 'wailing-caverns').quests.find(item => item.id === 'wc-smart-drinks').kind, 'outdoor');
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  assert.equal(prep.saveDungeonPrepProgress({ 'deadmines:dm-testing-wells': true, 'unrelated:key': true }, storage), true);
  assert.deepEqual(JSON.parse(JSON.stringify(prep.loadDungeonPrepProgress(storage))), { 'deadmines:dm-testing-wells': true, 'unrelated:key': true });
  assert.equal(prep.saveDungeonPrepProgress({ x: true }, { setItem() { throw new Error('blocked'); } }), false);
  assert.ok(prep.renderWowDungeonPrep({ dungeonId: 'unknown' }, dungeonPrepData, String).includes('Dungeon preparation unavailable'));
  assert.ok(prep.renderWowDungeonPrep({ dungeonId: 'hall-of-thanes' }, dungeonPrepData, String).includes('Alliance · Shaman · Level 21'));
  assert.ok(prep.renderWowDungeonPrep({ dungeonId: 'hall-of-thanes' }, dungeonPrepData, String).includes('Old Ironforge Incursion'));
  const allianceWailing = prep.filterDungeonQuests(dungeonPrepData.dungeons.find(item => item.id === 'wailing-caverns'), 'Alliance');
  assert.ok(allianceWailing.some(item => item.id === 'wc-smart-drinks'));
  assert.ok(!allianceWailing.some(item => item.id === 'wc-leaders'));
  const deadminesPage = prep.renderWowDungeonPrep({ dungeonId: 'deadmines' }, dungeonPrepData, String);
  assert.ok(deadminesPage.includes('Staff of Westfall'));
  assert.ok(deadminesPage.includes('Why it may help a Shaman'));
  assert.ok(!deadminesPage.includes('Arugal Must Die'));
  const deadmines = dungeonPrepData.dungeons.find(item => item.id === 'deadmines');
  const allianceDeadmines = prep.filterDungeonQuests(deadmines, 'Alliance');
  assert.deepEqual(allianceDeadmines.map(item => item.id), ['dm-testing-wells', 'dm-defias-brotherhood', 'dm-collecting-memories', 'dm-underground-assault', 'dm-red-silk-bandanas', 'dm-oh-brother', 'dm-unsent-letter']);
  assert.equal(prep.filterDungeonQuests(deadmines, 'Horde').length, 0);
  const wells = deadmines.quests.find(item => item.id === 'dm-testing-wells');
  assert.deepEqual(wells.stageDetails.map(step => step.name), ['Testing the Wells', 'Murloc Gills', 'The State of the Mines', 'Moonbrook Espionage', 'Explosive Consultation', 'A Dynamite Plan', 'Detonation at a Distance', 'Detonation at a Distance', 'Explosive Consultation', 'Destruction in Deadmines', 'Destruction in Deadmines']);
  const stormwindConsultation = wells.stageDetails[4];
  assert.equal(stormwindConsultation.name, 'Explosive Consultation');
  assert.equal(stormwindConsultation.startingLocation, 'Sentinel Hill, Westfall');
  assert.equal(stormwindConsultation.where, 'Dwarven District, Stormwind');
  assert.equal(wells.stageDetails[5].prerequisites[0], 'Explosive Consultation');
  assert.equal(wells.stageDetails[8].stepNote, 'Return to Alba Fairmoon');
  assert.deepEqual(wells.stageDetails.slice(6, 8).map(step => step.stepNote), ['First step', 'Second step']);
  assert.match(wells.raceNote, /excluding Humans/);
  const brotherhood = deadmines.quests.find(item => item.id === 'dm-defias-brotherhood');
  assert.deepEqual(brotherhood.stageDetails.map(step => step.name), Array(7).fill('The Defias Brotherhood'));
  assert.deepEqual(brotherhood.stageDetails.map(step => step.stepNote), ['First step', "Wiley's Note", 'Stormwind report lead', 'Report to Master Mathias Shaw', 'Messenger report', 'Defias Traitor escort', 'Final VanCleef quest']);
  assert.equal(brotherhood.stageDetails.at(-1).next, null);
  assert.equal(deadmines.quests.find(item => item.id === 'dm-unsent-letter').stage, 'TURN IN AFTER DUNGEON');
  assert.equal(prep.countDocumentedRewardItems(brotherhood), 3);
  assert.equal(prep.countDocumentedRewardItems(wells), 0);
  assert.ok(deadminesPage.includes('Dungeon drops (not quest rewards)'));
  assert.ok(deadminesPage.includes('The Unsent Letter for a pre-run pickup'));
  assert.ok(deadminesPage.includes('data-count-ready'));
});

test('leveling companion updates its level, specialization, and tab and persists the selection', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const talentClass = wowClientData.classes.find(item => item.id === 'warrior');
  const guideData = { classRecord: warrior, guide: warrior.starterGuide, zones: wowPack.zones, dungeons: wowPack.dungeons, warriorLeveling: wowPack.warriorLeveling, warriorCombat: wowPack.warriorCombat, combatCatalog: wowClientData, warriorProfessions: wowPack.warriorProfessions, warriorEquipment: wowPack.warriorEquipment, dungeonPreparation: dungeonPrepData, sources: wowPack.sources, talentClass };
  const stored = new Map();
  const handlers = {};
  const attributes = new Map();
  const levelInput = { value: '1', matches: selector => selector === '[data-companion-level-input]', setAttribute: (name, value) => attributes.set(name, value) };
  const levelOutput = { value: '1', textContent: '1' };
  const levelBadge = { textContent: 'Level 1' };
  const previousLevelButton = { disabled: true, dataset: { companionLevelStep: '-1' } };
  const nextLevelButton = { disabled: false, dataset: { companionLevelStep: '1' } };
  const specializationSelect = { value: 'fury', matches: selector => selector === '[data-companion-spec]' };
  const panel = { innerHTML: '', setAttribute: (name, value) => attributes.set(name, value), querySelectorAll: () => [] };
  const status = { textContent: '' };
  const tabs = ['overview', 'stats', 'talents', 'gear', 'leveling', 'dungeons', 'professions', 'combat'].map(tab => ({ dataset: { companionTab: tab }, tabIndex: -1, attributes: new Map(), setAttribute(name, value) { this.attributes.set(name, value); }, focus() {} }));
  const companion = {
    dataset: {},
    querySelector(selector) {
      return ({ '[data-companion-level-input]': levelInput, '[data-companion-level]': levelOutput, '[data-companion-level-badge]': levelBadge, '[data-companion-level-step="-1"]': previousLevelButton, '[data-companion-level-step="1"]': nextLevelButton, '[data-companion-spec]': specializationSelect, '[data-companion-panel]': panel, '[data-companion-status]': status })[selector];
    },
    querySelectorAll: () => tabs,
    addEventListener: (type, handler) => { handlers[type] = handler; }
  };
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  companionModule.initializeLevelingCompanion({ querySelector: () => companion }, { classId: 'warrior', currentLevel: 1, selectedSpecialization: 'fury', guideData, progressionEngine: { builds: wowGuidedData.builds, catalog: wowClientData, resolve: wowModule.resolveWowGuidedBuild, availablePoints: wowModule.availableWowTalentPoints, validate: wowModule.validateWowTalentAllocation }, storage: { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) } });

  levelInput.value = '20';
  handlers.input({ target: levelInput });
  assert.equal(levelOutput.value, '20');
  assert.equal(levelBadge.textContent, 'Level 20');
  assert.equal(previousLevelButton.disabled, false);
  assert.equal(nextLevelButton.disabled, false);
  assert.ok(panel.innerHTML.includes('Fury · Level 20'));
  assert.ok(panel.innerHTML.includes('Dual Wield training at level 20'));
  assert.ok(panel.innerHTML.includes('Ruins of Lordaeron · levels 15–20'));
  handlers.click({ target: { closest: selector => selector === '[data-companion-level-step]' ? previousLevelButton : null } });
  assert.equal(levelInput.value, '19');
  assert.equal(levelOutput.value, '19');
  assert.equal(levelBadge.textContent, 'Level 19');
  assert.ok(panel.innerHTML.includes('Fury · Level 19'));
  handlers.click({ target: { closest: selector => selector === '[data-companion-level-step]' ? nextLevelButton : null } });
  assert.equal(levelInput.value, '20');
  assert.equal(levelBadge.textContent, 'Level 20');
  assert.ok(panel.innerHTML.includes('Fury · Level 20'));

  specializationSelect.value = 'arms';
  handlers.change({ target: specializationSelect });
  assert.ok(panel.innerHTML.includes('Arms · Overview'));
  assert.ok(panel.innerHTML.includes('two-handed weapon'));
  assert.ok(!panel.innerHTML.includes('two-weapon path'));

  const talentsTab = tabs.find(tab => tab.dataset.companionTab === 'talents');
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? talentsTab : null } });
  assert.equal(talentsTab.attributes.get('aria-selected'), 'true');
  assert.ok(panel.innerHTML.includes('Arms talent tree · Level 20'));
  assert.ok(!panel.innerHTML.includes('wow-companion-build-source'));
  assert.ok(panel.innerHTML.includes('Improved Rend'));
  assert.ok(panel.innerHTML.includes('3/3'));
  const saved = companionModule.loadCompanionState('warrior', {}, warrior.specializations, { getItem: key => stored.get(key) || null });
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), { classId: 'warrior', level: 20, specializationId: 'arms', tab: 'talents', selectedTalentId: '', faction: 'Alliance' });
  const gearTab = tabs.find(tab => tab.dataset.companionTab === 'gear');
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? gearTab : null } });
  assert.equal(gearTab.attributes.get('aria-selected'), 'true');
  assert.ok(panel.innerHTML.includes('Arms · Weapons &amp; Gear'));
  assert.ok(panel.innerHTML.includes('Level 20 · verified records only'));
  assert.ok(panel.innerHTML.includes('What should I equip?'));
  assert.ok(panel.innerHTML.includes('Two-handed weapon'));
  assert.ok(panel.innerHTML.includes('Heavy Copper Maul'));
  assert.ok(panel.innerHTML.includes('Upcoming · Available at Level 26'));
  assert.ok(panel.innerHTML.includes('weapon DPS'));
  assert.ok(panel.innerHTML.includes('Defender of Dalaran'));
  const accessoryFilter = { dataset: { companionGearFilter: 'accessory' } };
  handlers.click({ target: { closest: selector => selector === '[data-companion-gear-filter]' ? accessoryFilter : null } });
  assert.ok(panel.innerHTML.includes('data-companion-gear-filter="accessory" aria-pressed="true"'));
  assert.ok(panel.innerHTML.includes('Raptor Hide Cloak'));
  assert.ok(!panel.innerHTML.includes('Serpent&#39;s Shoulders'));
  const armorFilter = { dataset: { companionGearFilter: 'armor' } };
  handlers.click({ target: { closest: selector => selector === '[data-companion-gear-filter]' ? armorFilter : null } });
  assert.ok(panel.innerHTML.includes('Serpent&#39;s Shoulders'));
  assert.ok(!panel.innerHTML.includes('Seal of Sylvanas'));
  const weaponFilter = { dataset: { companionGearFilter: 'weapon' } };
  handlers.click({ target: { closest: selector => selector === '[data-companion-gear-filter]' ? weaponFilter : null } });
  assert.ok(panel.innerHTML.includes('data-companion-gear-filter="weapon" aria-pressed="true"'));
  assert.ok(panel.innerHTML.includes('Defender of Dalaran'));
  levelInput.value = '26';
  handlers.input({ target: levelInput });
  assert.ok(panel.innerHTML.includes('Arms · Weapons &amp; Gear · Level 26'));
  assert.ok(panel.innerHTML.includes('Available at Level 26'));
  assert.ok(panel.innerHTML.includes('data-companion-gear-filter="weapon" aria-pressed="true"'), 'filter choice persists as the level changes');
  levelInput.value = '20';
  handlers.input({ target: levelInput });

  const combatTab = tabs.find(tab => tab.dataset.companionTab === 'combat');
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? combatTab : null } });
  assert.ok(panel.innerHTML.includes('data-combat-specialization="arms"'));
  specializationSelect.value = 'fury';
  handlers.change({ target: specializationSelect });
  assert.ok(panel.innerHTML.includes('data-combat-specialization="fury"'), 'combat panel updates immediately when specialization changes');
  assert.ok(panel.innerHTML.includes('Fury') && !panel.innerHTML.includes('data-combat-specialization="arms"'));
  specializationSelect.value = 'arms';
  handlers.change({ target: specializationSelect });
  assert.ok(panel.innerHTML.includes('data-combat-specialization="arms"'));

  const levelingTabAfterCombat = tabs.find(tab => tab.dataset.companionTab === 'leveling');
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? levelingTabAfterCombat : null } });
  const savedTask = { matches: selector => selector === '[data-warrior-checklist-task]', dataset: { warriorChecklistTask: 'milestone-10-class-quest' }, checked: true };
  handlers.change({ target: savedTask });
  assert.ok(panel.innerHTML.includes('data-warrior-checklist-task="milestone-10-class-quest" checked'));
  const factionSelectAfterCombat = { value: 'Horde', matches: selector => selector === '[data-companion-faction]' };
  handlers.change({ target: factionSelectAfterCombat });
  assert.ok(panel.innerHTML.includes('<h5>The Barrens</h5>') && panel.innerHTML.includes('data-warrior-checklist-task="milestone-10-class-quest" checked'), 'faction changes update recommendations and preserve checklist progress');
  specializationSelect.value = 'fury';
  handlers.change({ target: specializationSelect });
  assert.ok(panel.innerHTML.includes('Fury · damage and Rage focus'), 'specialization changes update leveling focus');
  assert.ok(panel.innerHTML.includes('data-warrior-checklist-task="milestone-10-class-quest" checked'), 'specialization changes preserve checklist progress');
  assert.ok(stored.has(companionModule.WARRIOR_CHECKLIST_STORAGE_KEY), 'checklist saves use the existing Warrior storage key');
  specializationSelect.value = 'arms';
  handlers.change({ target: specializationSelect });

  const statsTab = tabs.find(tab => tab.dataset.companionTab === 'stats');
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? statsTab : null } });
  assert.equal(statsTab.attributes.get('aria-selected'), 'true');
  assert.ok(panel.innerHTML.includes('Arms · Stats &amp; Attributes'));
  assert.ok(panel.innerHTML.includes('data-stats-specialization="arms"'));
  assert.ok(panel.innerHTML.includes('Arms · Leveling priorities (1–59)'));
  assert.ok(panel.innerHTML.includes('Weapon DPS'));
  assert.ok(panel.innerHTML.includes('Strength'));
  assert.ok(panel.innerHTML.includes('Defense'));
  assert.ok(panel.innerHTML.includes('Bars show ordering, not numerical stat weights.'));
  assert.ok(panel.innerHTML.includes('What should I upgrade next?'));
  assert.equal((panel.innerHTML.match(/<details class="wow-stat-explanation">/g) || []).length, 3);
  assert.ok(panel.innerHTML.includes('<summary>Hit, Expertise and target level</summary>'), 'native details summaries provide keyboard-expandable explanations');
  assert.ok(!panel.innerHTML.includes('foreverdb.net/stats'), 'Warrior Stats citations are not repeated in the visible tab');
  assert.ok(warrior.statsGuide.sourceIds.every(id => wowPack.sources.some(source => source.id === id)), 'Stats attribution remains in the guide data');
  specializationSelect.value = 'fury';
  handlers.change({ target: specializationSelect });
  assert.ok(panel.innerHTML.includes('data-stats-specialization="fury"'));
  assert.ok(panel.innerHTML.includes('Fury · Dual-wield leveling priorities (20–59)'));
  assert.ok(panel.innerHTML.includes('extra 19% miss chance'));
  specializationSelect.value = 'protection';
  handlers.change({ target: specializationSelect });
  assert.ok(panel.innerHTML.includes('data-stats-specialization="protection"'));
  assert.ok(panel.innerHTML.includes('Protection · Leveling and dungeon tank priorities'));
  assert.ok(panel.innerHTML.includes('Threat &amp; damage'));
  assert.ok(panel.innerHTML.includes('Survival'));
  assert.ok(panel.innerHTML.includes('Block Value'));
  const statRows = panel.innerHTML.match(/<li class="wow-stat-row" data-stat-id="[^"]+">[\s\S]*?<\/li>/g) || [];
  assert.equal(statRows.length, 11, 'all Warrior stats render as consistent icon rows');
  assert.equal((panel.innerHTML.match(/<svg viewBox="0 0 24 24" focusable="false"/g) || []).length, 11);
  assert.ok(panel.innerHTML.includes('class="wow-stat-symbol is-strength"'));
  assert.ok(panel.innerHTML.includes('class="wow-stat-symbol is-agility"'));
  assert.ok(panel.innerHTML.includes('class="wow-stat-symbol is-block-value"'));
  assert.ok(!panel.innerHTML.includes('class="wow-stat-row"><img'), 'unrelated ability artwork is not used as stat icons');
  assert.ok(panel.innerHTML.includes('Bars show ordering, not numerical stat weights.'));
  assert.equal((panel.innerHTML.match(/class="wow-stat-priority-rank"/g) || []).length, 7);
  assert.ok(panel.innerHTML.indexOf('Expertise') < panel.innerHTML.indexOf('Hit Chance'));
  assert.match(portalStyles, /\.wow-stat-rows \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(portalStyles, /\.wow-stat-order-bar > span \{ display:block; height:100%;/);
  specializationSelect.value = 'arms';
  handlers.change({ target: specializationSelect });

  const levelingTab = tabs.find(tab => tab.dataset.companionTab === 'leveling');
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? levelingTab : null } });
  assert.ok(panel.innerHTML.includes('Arms leveling · Level 20'));
  assert.ok(panel.innerHTML.includes('Where should I go now?'));
  assert.ok(panel.innerHTML.includes('The Barrens') && !panel.innerHTML.includes('<h5>Westfall</h5>'));
  levelInput.value = '35';
  handlers.input({ target: levelInput });
  assert.equal(levelBadge.textContent, 'Level 35');
  assert.ok(panel.innerHTML.includes('Arms leveling · Level 35'));
  assert.ok(panel.innerHTML.includes('<h5>Riverglades</h5>'));
  levelInput.value = '20';
  handlers.input({ target: levelInput });
  const factionSelect = { value: 'Horde', matches: selector => selector === '[data-companion-faction]' };
  handlers.change({ target: factionSelect });
  assert.ok(panel.innerHTML.includes('<h5>The Barrens</h5>'));
  assert.ok(!panel.innerHTML.includes('<h5>Westfall</h5>'));
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? statsTab : null } });
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? levelingTab : null } });
  assert.ok(panel.innerHTML.includes('<option value="Horde" selected>Horde</option>'), 'faction is retained when switching guide tabs');
  const factionSaved = companionModule.loadCompanionState('warrior', {}, warrior.specializations, { getItem: key => stored.get(key) || null });
  assert.equal(factionSaved.faction, 'Horde');
  const professionsTab = tabs.find(tab => tab.dataset.companionTab === 'professions');
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? professionsTab : null } });
  assert.ok(panel.innerHTML.includes('Mining + Blacksmithing'));
  assert.ok(panel.innerHTML.includes('Mining + Engineering'));
  assert.ok(panel.innerHTML.includes('Character level 20'));
  assert.ok(panel.innerHTML.includes('Blacksmithing skill is unverified'));
  assert.ok(panel.innerHTML.includes('12 × Copper Bar'));
  assert.ok(panel.innerHTML.includes('Minimum Blacksmithing skill is unverified'));
  const engineeringChoice = { dataset: { professionChoice: 'mining-engineering' } };
  handlers.click({ target: { closest: selector => selector === '[data-profession-choice]' ? engineeringChoice : null } });
  assert.ok(panel.innerHTML.includes('data-profession-choice="mining-engineering" aria-pressed="true"'));
  assert.ok(panel.innerHTML.includes('data-profession-choice="mining-blacksmithing" aria-pressed="false"'));
  levelInput.value = '35';
  handlers.input({ target: levelInput });
  assert.ok(panel.innerHTML.includes('Arms · Professions · Level 35'));
  assert.ok(panel.innerHTML.includes('Available now · character level met'));
  specializationSelect.value = 'protection';
  handlers.change({ target: specializationSelect });
  assert.ok(panel.innerHTML.includes('Protection · Professions · Level 35'));
  assert.ok(panel.innerHTML.includes('Protection · armor and preparation'));
  assert.ok(!panel.innerHTML.includes('Arms · weapon progression'));
  assert.ok(panel.innerHTML.includes('mining-engineering" aria-pressed="true"'), 'pairing choice remains independent of specialization changes');

  levelInput.value = '20';
  handlers.input({ target: levelInput });
  specializationSelect.value = 'arms';
  handlers.change({ target: specializationSelect });
  const dungeonsTab = tabs.find(tab => tab.dataset.companionTab === 'dungeons');
  handlers.click({ target: { closest: selector => selector === '[data-companion-tab]' ? dungeonsTab : null } });
  const completedRun = { checked: true, dataset: { warriorDungeonTask: 'deadmines:run' }, matches: selector => selector === '[data-warrior-dungeon-task]' };
  handlers.change({ target: completedRun });
  assert.match(panel.innerHTML, /data-warrior-dungeon-task="deadmines:run" checked/);
  assert.deepEqual(JSON.parse(stored.get(companionModule.WARRIOR_DUNGEON_PROGRESS_STORAGE_KEY)), { 'deadmines:run': true });
  levelInput.value = '25';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /data-warrior-dungeon-task="deadmines:run" checked/, 'level changes preserve checked dungeon tasks');
  specializationSelect.value = 'protection';
  handlers.change({ target: specializationSelect });
  assert.match(panel.innerHTML, /data-warrior-dungeon-task="deadmines:run" checked/, 'specialization changes preserve checked dungeon tasks');
});

test('Warrior profession guidance filters craft status by level and changes by specialization', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guideData = { classRecord: warrior, warriorProfessions: wowPack.warriorProfessions, warriorEquipment: wowPack.warriorEquipment, sources: wowPack.sources };
  for (const level of [15, 35, 60]) for (const specializationId of ['arms', 'fury', 'protection']) {
    const html = companionModule.renderLevelingCompanion({
      classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId, guideData,
      storage: { getItem: () => JSON.stringify({ level, specializationId, tab: 'professions' }) }
    });
    assert.ok(html.includes(`data-specialization="${specializationId}"`), `${specializationId} profession content updates at ${level}`);
    assert.ok(html.includes('What should I work on now?') && html.includes('Artisan'), 'rank and level progression is present');
    assert.ok(html.includes('Copper Bar') && html.includes('Weak Flux') && html.includes('Light Leather'), 'known recipe materials render');
    assert.ok(html.includes('Blacksmithing skill is unverified') && html.includes('yellow at 80'), 'minimum crafting skill is not confused with skill-up range');
    assert.ok(html.includes('Two-Hand') && html.includes('10.8 DPS') && html.includes('Crafted with Blacksmithing'), 'craft links to existing equipment stats and acquisition');
    assert.ok(html.includes('wow-warrior-profession-recipe is-available') && html.includes('Available now · character level met'), `level ${level} makes the level-11 craft available`);
    assert.ok(!html.includes('Recipe source and materials are not recorded'));
    const expectedHeading = { arms: 'Arms · weapon progression', fury: 'Fury · damage and supplies', protection: 'Protection · armor and preparation' }[specializationId];
    assert.ok(html.includes(expectedHeading), `${specializationId} guidance is distinct at ${level}`);
  }
  assert.equal(wowPack.warriorProfessions.craftExamples[0].professionSkillRequired, null, 'unverified minimum skill stays unknown');
  assert.equal(wowPack.warriorProfessions.craftExamples[0].skillUpThreshold, 80, 'verified yellow skill-up point is a separate field');
  assert.ok(wowPack.warriorProfessions.craftExamples[0].sourceIds.every(id => wowPack.sources.some(source => source.id === id)));
  assert.ok(Object.values(wowPack.warriorProfessions.specializationGuidance).flatMap(entry => entry.sourceIds).every(id => wowPack.sources.some(source => source.id === id)));
});

test('Warrior Stats use sourced, level-aware priorities and explanations for each specialization', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guideData = { classRecord: warrior, sources: wowPack.sources };
  const render = (level, specializationId) => companionModule.renderLevelingCompanion({
    classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId, guideData,
    storage: { getItem: () => JSON.stringify({ level, specializationId, tab: 'stats' }) }
  });
  const priorities = (html) => [...html.matchAll(/class="wow-stat-priority-label">([^<]+)/g)].map(match => match[1]);
  const expected = {
    arms: {
      15: ['Two-handed Weapon DPS', 'Hit Chance', 'Expertise', 'Critical Strike &amp; Agility', 'Strength &amp; Attack Power'],
      35: ['Two-handed Weapon DPS', 'Hit Chance', 'Expertise', 'Critical Strike &amp; Agility', 'Strength &amp; Attack Power'],
      60: ['Two-handed Weapon DPS', 'Hit Chance', 'Expertise', 'Critical Strike', 'Strength']
    },
    fury: {
      15: ['Best available weapon', 'Hit Chance', 'Expertise', 'Strength &amp; Attack Power', 'Critical Strike &amp; Agility'],
      35: ['Both weapon DPS', 'Hit Chance', 'Expertise', 'Strength &amp; Attack Power', 'Critical Strike &amp; Agility'],
      60: ['Both weapon DPS', 'Hit Chance', 'Expertise', 'Critical Strike', 'Strength']
    },
    protection: {
      15: ['Weapon DPS', 'Hit &amp; Expertise', 'Strength &amp; Attack Power', 'Agility &amp; Critical Strike', 'Armor &amp; Stamina', 'Defense, Dodge, Parry &amp; Block', 'Block Value'],
      35: ['Weapon DPS', 'Hit &amp; Expertise', 'Strength &amp; Attack Power', 'Agility &amp; Critical Strike', 'Armor &amp; Stamina', 'Defense, Dodge, Parry &amp; Block', 'Block Value'],
      60: ['Expertise', 'Hit Chance', 'Agility', 'Strength', 'Stamina', 'Stamina', 'Armor', 'Agility', 'Avoidance', 'Defense']
    }
  };
  for (const level of [15, 35, 60]) for (const specializationId of ['arms', 'fury', 'protection']) {
    const html = render(level, specializationId);
    assert.ok(html.includes(`data-stats-specialization="${specializationId}" data-stats-level="${level}"`), `${specializationId} Stats update to level ${level}`);
    assert.deepEqual(priorities(html), expected[specializationId][level], `${specializationId} priority order at level ${level}`);
    assert.ok(html.includes('What should I upgrade next?') && html.includes('When it matters:'), `${specializationId} stat explanations render at level ${level}`);
    assert.ok(level === 60 ? /level-60 (?:raid-)?boss (?:references|contexts)/.test(html) : html.includes('No universal leveling'), `${specializationId} labels applicable or unverified thresholds at level ${level}`);
  }
  const furyBeforeDualWield = render(15, 'fury');
  assert.ok(furyBeforeDualWield.includes('no off-hand priority applies yet'));
  const furyAfterDualWield = render(35, 'fury');
  assert.ok(furyAfterDualWield.includes('fast off-hand') && furyAfterDualWield.includes('slower main hand'));
  assert.ok(warrior.statsGuide.priorities.arms.leveling.sourceIds.every(id => wowPack.sources.some(source => source.id === id)));
  assert.ok(warrior.statsGuide.priorities.fury.beforeDualWield.sourceIds.every(id => wowPack.sources.some(source => source.id === id)));
  assert.ok(warrior.statsGuide.priorities.protection.leveling.sourceIds.every(id => wowPack.sources.some(source => source.id === id)));
});

test('Warrior profession guidance uses loaded Forever records and explains when that data is missing', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const html = companionModule.renderLevelingCompanion({
    classId: 'warrior', currentLevel: 18, selectedSpecialization: 'fury',
    guideData: { classRecord: warrior },
    storage: { getItem: () => JSON.stringify({ level: 18, specializationId: 'fury', tab: 'professions' }) }
  });
  assert.match(html, /Fury · Professions · Level 18/);
  assert.match(html, /Verified Warrior profession data is not loaded/);
  assert.doesNotMatch(html, /Mining \+ Blacksmithing/);
  assert.match(appSource, /warriorProfessions:\s*wowData\.warriorProfessions/, 'interactive app setup passes the structured profession records');
  assert.ok(wowPack.warriorProfessions.sourceIds.every(id => wowPack.sources.some(source => source.id === id)), 'underlying profession attributions resolve');
  assert.ok(wowPack.warriorProfessions.combinations.some(pair => pair.id === 'mining-engineering'));
});

test('Warrior leveling guide filters faction zones, updates by level, shows upcoming ranges, and handles missing data', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guideData = { classRecord: warrior, warriorLeveling: wowPack.warriorLeveling };
  const render = (level, faction, specializationId = 'arms', guide = warrior.specializationGuides.arms.sections.leveling) => companionModule.renderLevelingCompanion({
    classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId,
    guideData: { ...guideData, specializationGuides: warrior.specializationGuides },
    storage: { getItem: () => JSON.stringify({ level, faction, tab: 'leveling', specializationId }) }
  });

  const allianceAt20 = render(20, 'Alliance');
  assert.match(allianceAt20, /Westfall/);
  assert.match(allianceAt20, /Wetlands/);
  assert.doesNotMatch(allianceAt20, /<h5>The Barrens<\/h5>/, 'Horde-only zones are filtered out');
  assert.match(allianceAt20, /Duskwood/);
  assert.match(allianceAt20, /wow-warrior-level-zone is-upcoming/);
  assert.match(allianceAt20, /Shadowfang Keep/);
  assert.match(allianceAt20, /Arms · solo and two-handed weapon focus/);
  assert.match(allianceAt20, /Before moving on/);
  assert.match(allianceAt20, /Alliance level 20 armor chain/);
  assert.doesNotMatch(allianceAt20, /Horde level 20 armor chain/);
  assert.match(allianceAt20, /Bartleby/);
  assert.match(allianceAt20, /Vorlus Vilehoof/);

  const hordeAt20 = render(20, 'Horde');
  assert.match(hordeAt20, /<h5>The Barrens<\/h5>/);
  assert.match(hordeAt20, /Silverpine Forest/);
  assert.doesNotMatch(hordeAt20, /<h5>Westfall<\/h5>/, 'Alliance-only zones are filtered out');
  assert.match(hordeAt20, /Horde level 20 armor chain/);
  assert.doesNotMatch(hordeAt20, /Alliance level 20 armor chain/);
  assert.match(hordeAt20, /Path of Defense/);
  assert.match(hordeAt20, /Ulag the Cleaver/);
  assert.match(hordeAt20, /The Affray on Fray Island/);

  const lowerLevel = render(8, 'Alliance');
  assert.match(lowerLevel, /Level 8/);
  assert.match(lowerLevel, /<h5>Elwynn Forest<\/h5>/);
  assert.match(lowerLevel, /Source-recommended range begins at level 10/);
  const laterLevel = render(35, 'Horde');
  assert.match(laterLevel, /Level 35/);
  assert.match(laterLevel, /<h5>Riverglades<\/h5>/);
  assert.match(laterLevel, /The Drowned City/);

  const missingRanges = companionModule.renderLevelingCompanion({
    classId: 'warrior', currentLevel: 60, selectedSpecialization: 'arms',
    guideData: { classRecord: warrior, specializationGuides: warrior.specializationGuides, warriorLeveling: { zones: [], dungeons: [] } },
    storage: { getItem: () => JSON.stringify({ level: 60, faction: 'Alliance', tab: 'leveling', specializationId: 'arms' }) }
  });
  assert.match(missingRanges, /No faction-matched zone with a verified level range is recorded/);
  assert.match(missingRanges, /No verified dungeon range is recorded for this level/);
  assert.match(missingRanges, /Leveling Checklist/);
  assert.ok(wowPack.warriorLeveling.sourceIds.every(id => wowPack.sources.some(source => source.id === id)));
  assert.ok(wowPack.warriorLeveling.dungeonSourceIds.every(id => wowPack.sources.some(source => source.id === id)));
  for (const guidance of Object.values(wowPack.warriorLeveling.specializationGuidance)) assert.ok(guidance.sourceIds.every(id => wowPack.sources.some(source => source.id === id)));
  for (const milestones of Object.values(wowPack.warriorLeveling.specializationMilestones)) for (const milestone of milestones) assert.ok(milestone.sourceIds.every(id => wowPack.sources.some(source => source.id === id)));
  for (const milestone of wowPack.warriorLeveling.questMilestones) assert.ok(milestone.sourceIds.every(id => wowPack.sources.some(source => source.id === id)));
  assert.match(appSource, /guideData:\s*\{[\s\S]*?warriorLeveling:\s*wowData\.warriorLeveling/, 'browser rerender initialization receives the same structured data as initial render');

  for (const level of [10, 20, 34, 45, 60]) for (const specializationId of ['arms', 'fury', 'protection']) for (const faction of ['Alliance', 'Horde']) {
    const result = render(level, faction, specializationId);
    assert.match(result, /class="wow-warrior-level-zone is-current"/, `${specializationId} ${faction} has matching zones at level ${level}`);
    assert.match(result, /<h4>Recommended now <span>Level /, `${specializationId} has level-specific zone recommendations at ${level}`);
    if (level < 60) assert.match(result, /class="wow-warrior-level-zone is-upcoming"/, `${specializationId} ${faction} has upcoming zones at level ${level}`);
    else assert.match(result, /No upcoming faction-matched zone range is recorded/, 'level 60 does not invent a future zone');
    if (level < 13) assert.match(result, /No verified dungeon range is recorded for this level/, `${specializationId} ${faction} gets an honest no-match at level ${level}`);
    else assert.match(result, /class="wow-warrior-dungeon-list"/, `${specializationId} ${faction} has relevant dungeons at level ${level}`);
    assert.match(result, new RegExp(`${specializationId === 'arms' ? 'two-handed weapon' : specializationId === 'fury' ? 'damage and Rage focus' : 'defense and dungeon tanking'}`, 'i'), `${specializationId} has distinct leveling guidance`);
  }
  assert.match(render(34, 'Alliance', 'arms'), /milestone-arms-sweeping-strikes/);
  assert.match(render(34, 'Alliance', 'fury'), /milestone-fury-gore-drinker/);
  assert.match(render(34, 'Alliance', 'protection'), /milestone-protection-vanguard/);
});

test('Warrior Arms, Fury and Protection milestones cover the sourced 10–60 progression', () => {
  const module = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guideData = { classRecord: warrior, specializationGuides: warrior.specializationGuides, warriorLeveling: wowPack.warriorLeveling };
  const expectations = {
    arms: ['arms-improved-overpower', 'arms-spearing-strike', 'arms-sweeping-strikes', 'arms-recklessness', 'arms-reckless-swings'],
    fury: ['fury-gore-drinker', 'fury-whirlwind', 'fury-flurry', 'fury-bloodthirst', 'fury-improved-berserker-rage', 'fury-deflection', 'fury-improved-charge', 'fury-recklessness', 'fury-improved-tactical-mastery', 'fury-anger-management', 'fury-improved-bloodrage', 'fury-enrage'],
    protection: ['protection-revenge', 'protection-shield-block', 'protection-vanguard', 'protection-shield-slam', 'protection-recklessness', 'protection-reckless-swings']
  };
  for (const [specializationId, ids] of Object.entries(expectations)) {
    const milestones = wowPack.warriorLeveling.specializationMilestones[specializationId];
    for (const id of ids) {
      const milestone = milestones.find(item => item.id === id);
      assert.ok(milestone, `${specializationId} contains ${id}`);
      assert.ok(milestone.sourceIds.every(sourceId => wowPack.sources.some(source => source.id === sourceId)), `${id} source attribution resolves`);
      if (id.includes('improved-overpower') || id.endsWith('spearing-strike') || /recklessness|reckless-swings|improved-berserker-rage|deflection|improved-charge|improved-tactical-mastery|anger-management|improved-bloodrage|enrage/.test(id)) {
        assert.ok(milestone.verificationDate && milestone.verificationStatus, `${id} retains verification metadata`);
      }
    }
  }
  for (const level of [10, 20, 30, 40, 50, 60]) for (const specializationId of ['arms', 'fury', 'protection']) {
    const storage = { getItem: key => key.endsWith(':warrior') ? JSON.stringify({ level, faction: 'Alliance', tab: 'leveling', specializationId }) : null };
    const html = module.renderLevelingCompanion({ classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId, guideData, storage });
    assert.match(html, /id="warrior-companion-tab-leveling"[^>]*aria-selected="true"/, `${specializationId} selects the leveling tab at level ${level}`);
    for (const id of expectations[specializationId]) assert.ok(html.includes(`data-warrior-checklist-task="milestone-${id}"`), `${specializationId} milestone ${id} remains in the level-filtered checklist at ${level}`);
    const otherSpecs = Object.keys(expectations).filter(spec => spec !== specializationId);
    for (const otherSpec of otherSpecs) for (const id of expectations[otherSpec]) assert.ok(!html.includes(`data-warrior-checklist-task="milestone-${id}"`), `${specializationId} does not receive ${otherSpec} milestone ${id}`);
  }
});

test('Warrior checklist progress is separate, persistent, manually checked, and grouped by level', () => {
  const module = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const key = module.WARRIOR_CHECKLIST_STORAGE_KEY;
  const storage = { values: new Map(), getItem(name) { return this.values.get(name) ?? null; }, setItem(name, value) { this.values.set(name, String(value)); } };
  const tasks = [
    { id: 'quest-10', level: 10, category: 'class-quest' },
    { id: 'dungeon-12', level: 12, maxLevel: 18, category: 'dungeon' },
    { id: 'weapon-20', level: 20, category: 'equipment' }
  ];
  assert.deepEqual(JSON.parse(JSON.stringify(module.groupWarriorChecklistTasks(tasks, 12, [], 'all'))), {
    available: ['dungeon-12'].map(id => tasks.find(task => task.id === id)),
    upcoming: [tasks[2]], completed: [tasks[0]]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(module.calculateWarriorChecklistProgress(tasks, ['quest-10']))), { completed: 1, total: 3, percent: 33 });
  assert.deepEqual(JSON.parse(JSON.stringify(module.calculateWarriorChecklistProgress(tasks, []))), { completed: 0, total: 3, percent: 0 }, 'level alone never increases manual completion progress');
  assert.equal(storage.values.has('bm-wow-leveling-companion-v1:warrior'), false, 'checklist state uses its own key and does not alter talents or companion preferences');
  storage.setItem('bm-wow-leveling-companion-v1:warrior', JSON.stringify({ level: 1, faction: 'Alliance', tab: 'leveling', specializationId: 'arms' }));
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guideData = { classRecord: warrior, specializationGuides: warrior.specializationGuides, warriorLeveling: wowPack.warriorLeveling };
  const render = level => {
    storage.setItem('bm-wow-leveling-companion-v1:warrior', JSON.stringify({ level, faction: 'Alliance', tab: 'leveling', specializationId: 'arms' }));
    return module.renderLevelingCompanion({ classId: 'warrior', currentLevel: level, selectedSpecialization: 'arms', guideData, storage });
  };
  assert.match(render(9), /Available Now/);
  assert.doesNotMatch(render(9), /data-warrior-checklist-task="milestone-10-class-quest" checked/);
  assert.equal(module.saveWarriorChecklistProgress(['milestone-10-class-quest'], storage), true);
  assert.deepEqual(JSON.parse(JSON.stringify(module.loadWarriorChecklistProgress(storage))), ['milestone-10-class-quest']);
  assert.match(render(10), /data-warrior-checklist-task="milestone-10-class-quest" checked/, 'only the manually saved task remains checked when level changes');
  assert.match(render(10), /<small>Completed · Complete the Defensive Stance class quest/);
  const laterLevel = render(20);
  assert.match(laterLevel, /data-warrior-checklist-task="milestone-12-ability-unlock"><span/);
  assert.match(laterLevel, /Earlier level · not checked off/, 'an old unchecked task is not presented as completed');
  const tracker = render(10);
  assert.match(tracker, /<details class="wow-warrior-checklist-group is-available" data-checklist-section="available" open>/, 'Available Now starts expanded and remains a native keyboard-accessible disclosure');
  assert.match(tracker, /<details class="wow-warrior-checklist-group is-upcoming" data-checklist-section="upcoming">/);
  assert.match(tracker, /<details class="wow-warrior-checklist-group is-completed" data-checklist-section="completed">/);
  assert.match(tracker, /1 \/ \d+ tasks complete/);
  assert.match(render(10), /value="class-quest"/);
  assert.match(render(10), /value="dungeon"/);
});

test('Warrior class quests filter by faction, specialization and level while preserving checklist IDs', () => {
  const module = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const records = wowPack.warriorLeveling.classQuests;
  const equipment = [...wowPack.warriorEquipment.items, ...warrior.specializationGuides.arms.sections.gear.equipmentGuide.items];
  assert.ok(records.length >= 8, 'the class quest path covers early stance unlocks through level 60');
  for (const quest of records) {
    assert.ok(quest.sourceUrl && quest.verificationDate && quest.verificationStatus, `${quest.id} retains attribution and reliability metadata`);
    assert.ok(quest.sourceIds.every(id => wowPack.sources.some(source => source.id === id)), `${quest.id} source IDs resolve`);
    for (const itemId of quest.itemIds) assert.ok(equipment.some(item => item.id === itemId && item.questIds?.includes(quest.id)), `${quest.id} links reward ${itemId} to a canonical equipment record`);
  }
  const allianceAtTen = records.filter(quest => quest.factions.includes('Alliance'));
  const hordeAtTen = records.filter(quest => quest.factions.includes('Horde'));
  assert.ok(allianceAtTen.some(quest => quest.id === 'class-quest-10-alliance' && quest.routeOptions.some(route => route.npc === 'Harry Burlguard')));
  assert.ok(hordeAtTen.some(quest => quest.id === 'class-quest-10-horde' && quest.routeOptions.some(route => route.npc === 'Veteran Uzzek')));
  assert.ok(allianceAtTen.find(quest => quest.id === 'class-quest-10-alliance').routeOptions.some(route => route.location.includes('Skyborne')));
  const source = { classRecord: warrior, warriorLeveling: wowPack.warriorLeveling, warriorEquipment: wowPack.warriorEquipment, dungeons: wowPack.dungeons, sources: wowPack.sources, dungeonPreparation: dungeonPrepData };
  for (const faction of ['Alliance', 'Horde']) for (const specializationId of ['arms', 'fury', 'protection']) for (const level of [10, 20, 30, 40, 60]) {
    const storage = { getItem: key => key.endsWith(':warrior') ? JSON.stringify({ level, faction, specializationId, tab: 'leveling' }) : null };
    const html = module.renderLevelingCompanion({ classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId, guideData: source, storage });
    assert.match(html, /Quest route, objectives and rewards/, `${faction} ${specializationId} sees expanded quest guidance at ${level}`);
    assert.match(html, /data-warrior-checklist-task="milestone-10-class-quest"/, 'existing level-10 checklist task ID remains compatible');
    assert.match(html, /class="wow-warrior-checklist-group is-(?:available|upcoming|completed)"/, 'quest checklist retains available/upcoming/completed group states');
    if (level === 10) assert.match(html, /Upcoming · Optional Fire Hardened Mail chain|Upcoming · Optional Brutal Armor chain/, 'level-20 faction chain appears as upcoming');
    if (level === 20) assert.match(html, /Recommended now · Optional Fire Hardened Mail chain|Recommended now · Optional Brutal Armor chain/, 'the matching level-20 faction chain becomes available');
    if (level === 20) assert.ok(faction === 'Alliance' ? !html.includes('Path of Defense') : !html.includes('Fire Hardened Mail'), `${faction} does not see the other faction's class armor chain`);
    if (level === 60 && specializationId !== 'protection') assert.doesNotMatch(html, /Codex of Defense/, `${specializationId} does not see the Protection-specific book reward`);
  }
  const stored = { getItem: key => key === module.WARRIOR_CHECKLIST_STORAGE_KEY ? JSON.stringify(['milestone-10-class-quest'])
    : key.endsWith(':warrior') ? JSON.stringify({ level: 20, faction: 'Alliance', tab: 'leveling', specializationId: 'arms' }) : null };
  const persisted = module.renderLevelingCompanion({ classId: 'warrior', currentLevel: 20, selectedSpecialization: 'arms', guideData: source, storage: stored });
  assert.match(persisted, /data-warrior-checklist-task="milestone-10-class-quest" checked/, 'legacy checklist data remains checked after quest detail expansion');

  const protectionAt54 = module.buildWarriorDungeonPreparation({ level: 54, specializationId: 'protection', faction: 'Alliance' }, source);
  const furyAt54 = module.buildWarriorDungeonPreparation({ level: 54, specializationId: 'fury', faction: 'Alliance' }, source);
  const sunkenTemple = protectionAt54.available.find(dungeon => dungeon.name === 'Sunken Temple');
  assert.ok(sunkenTemple.quests.some(quest => quest.classQuestId === 'class-quest-50-voodoo-feathers'), 'Sunken Temple references the Warrior Voodoo Feathers quest');
  const razorfen = module.buildWarriorDungeonPreparation({ level: 29, specializationId: 'protection', faction: 'Alliance' }, source).available.find(dungeon => dungeon.name === 'Razorfen Kraul');
  assert.ok(razorfen.quests.some(quest => quest.classQuestId === 'class-quest-20-alliance'), 'Razorfen Kraul links the Alliance Warrior armor chain');
  const direMaul = protectionAt54.available.find(dungeon => dungeon.name === 'Dire Maul East');
  assert.ok(direMaul.quests.some(quest => quest.classQuestId === 'class-quest-54-codex-of-defense'));
  assert.ok(!furyAt54.available.find(dungeon => dungeon.name === 'Dire Maul East').quests.some(quest => quest.classQuestId === 'class-quest-54-codex-of-defense'), 'specialization-specific recommendations respect the selected specialization');
});

test('Warrior dungeon preparation filters by level, changes with specialization, and saves checklist independently', () => {
  const module = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guideData = {
    classRecord: warrior,
    specializationGuides: warrior.specializationGuides,
    warriorLeveling: wowPack.warriorLeveling,
    warriorEquipment: wowPack.warriorEquipment,
    dungeons: wowPack.dungeons,
    sources: wowPack.sources,
    dungeonPreparation: dungeonPrepData
  };
  const atLevel = module.buildWarriorDungeonPreparation({ level: 18, specializationId: 'arms', faction: 'Alliance' }, guideData);
  assert.ok(atLevel.available.some(dungeon => dungeon.name === 'Hall of Thanes'));
  assert.ok(atLevel.comingUp.some(dungeon => dungeon.name === 'Shadowfang Keep'));
  assert.ok(!atLevel.available.some(dungeon => dungeon.name === 'Blackfathom Deeps'), 'a dungeon outside the verified range is not recommended yet');
  const horde = module.buildWarriorDungeonPreparation({ level: 22, specializationId: 'arms', faction: 'Horde' }, guideData);
  const alliance = module.buildWarriorDungeonPreparation({ level: 22, specializationId: 'arms', faction: 'Alliance' }, guideData);
  assert.ok(horde.available.find(dungeon => dungeon.name === 'Shadowfang Keep').quests.length > 0);
  assert.equal(alliance.available.find(dungeon => dungeon.name === 'Shadowfang Keep').quests.length, 0, 'quest records follow the selected faction');
  assert.match(alliance.available.find(dungeon => dungeon.name === 'Deadmines').entrance, /Moonbrook/);

  const arms = module.buildWarriorDungeonPreparation({ level: 30, specializationId: 'arms', faction: 'Alliance' }, guideData);
  const fury = module.buildWarriorDungeonPreparation({ level: 30, specializationId: 'fury', faction: 'Alliance' }, guideData);
  const protection = module.buildWarriorDungeonPreparation({ level: 30, specializationId: 'protection', faction: 'Alliance' }, guideData);
  assert.equal(arms.preparation.label, 'DPS preparation');
  assert.match(arms.preparation.advice, /two-handed weapon/);
  assert.equal(fury.preparation.label, 'DPS preparation');
  assert.match(fury.preparation.advice, /Dual Wield/);
  assert.equal(protection.preparation.label, 'Tank preparation');
  assert.match(module.buildWarriorDungeonPreparation({ level: 13, specializationId: 'protection', faction: 'Alliance' }, guideData).preparation.advice, /strongest current two-handed weapon/);
  assert.match(protection.preparation.advice, /one-handed weapon and shield/);
  assert.ok(fury.available.find(dungeon => dungeon.name === 'Razorfen Kraul').equipment.some(item => item.name === 'Pronged Reaver'));
  assert.ok(protection.available.find(dungeon => dungeon.name === 'Blackfathom Deeps').equipment.some(item => item.name === 'Darkwater Talwar'));
  const darkwater = protection.available.find(dungeon => dungeon.name === 'Blackfathom Deeps').equipment.find(item => item.name === 'Darkwater Talwar');
  assert.equal(darkwater.boss, 'Lady Sarevess');
  assert.equal(darkwater.slot, 'Main Hand');
  assert.ok(darkwater.stats.some(stat => stat.includes('17.0')), JSON.stringify(darkwater));
  assert.deepEqual(darkwater.specializations, ['protection']);
  assert.equal(darkwater.equipmentId, 'darkwater-talwar');
  const armsDrops = arms.available.find(dungeon => dungeon.name === 'Blackfathom Deeps').equipment;
  assert.ok(armsDrops.some(item => item.name === 'Strike of the Hydra' && /Aku.?mai/.test(item.boss) && item.slot === 'Two-Hand'));

  const gearRecords = [...wowPack.warriorEquipment.items, ...warrior.specializationGuides.arms.sections.gear.equipmentGuide.items];
  for (const drop of dungeonPrepData.warriorPreparation.equipmentDrops) {
    assert.ok(wowPack.warriorEquipment.items.some(item => item.id === drop.id), `${drop.name} reuses a canonical Warrior equipment ID`);
  }
  for (const level of [20, 35, 45, 60]) for (const specializationId of ['arms', 'fury', 'protection']) {
    const view = module.buildWarriorDungeonPreparation({ level, specializationId, faction: 'Alliance' }, guideData);
    assert.ok(view.level === level && view.specializationId === specializationId);
    for (const dungeon of [...view.available, ...view.comingUp]) {
      const linkedIds = dungeon.equipment.map(item => item.equipmentId);
      assert.equal(linkedIds.length, new Set(linkedIds).size, `${dungeon.name} avoids duplicate loot records`);
      for (const item of dungeon.equipment) {
        assert.ok(item.equipmentId && gearRecords.some(record => record.id === item.equipmentId), `${item.name} links to an equipment record`);
        assert.ok(item.specializations.includes(specializationId), `${item.name} is suitable for ${specializationId}`);
        assert.ok(!item.faction || item.faction === view.faction, `${item.name} matches the selected faction`);
      }
    }
  }
  const cityFury = module.buildWarriorDungeonPreparation({ level: 35, specializationId: 'fury', faction: 'Alliance' }, guideData)
    .available.find(dungeon => dungeon.id === 'drowned-city');
  const bloodslash = cityFury.equipment.find(item => item.equipmentId === 'bloodslash-axe');
  assert.equal(bloodslash.boss, 'Zul’Alai');
  assert.equal(bloodslash.slot, 'One-Hand');
  assert.equal(bloodslash.requiredLevel, 34);
  const kroldokProtection = module.buildWarriorDungeonPreparation({ level: 45, specializationId: 'protection', faction: 'Horde' }, guideData)
    .available.find(dungeon => dungeon.id === 'kroldok-stronghold');
  assert.ok(kroldokProtection.equipment.some(item => item.equipmentId === 'kroldok-warplate-chest' && item.boss === 'Nar’gurk'));
  const arms60 = module.buildWarriorDungeonPreparation({ level: 60, specializationId: 'arms', faction: 'Alliance' }, guideData);
  assert.ok(arms60.available.find(dungeon => dungeon.id === 'shapers-terrace').equipment.some(item => item.equipmentId === 'hammer-of-thundering-hooves'));
  const fury60 = module.buildWarriorDungeonPreparation({ level: 60, specializationId: 'fury', faction: 'Alliance' }, guideData);
  assert.ok(fury60.available.find(dungeon => dungeon.id === 'shapers-terrace').equipment.some(item => item.equipmentId === 'cinderedge-crescent'));
  const protection60 = module.buildWarriorDungeonPreparation({ level: 60, specializationId: 'protection', faction: 'Alliance' }, guideData);
  assert.ok(protection60.available.find(dungeon => dungeon.id === 'shapers-terrace').equipment.some(item => item.equipmentId === 'raptorscale-bulwark'));
  const allianceHall = module.buildWarriorDungeonPreparation({ level: 20, specializationId: 'fury', faction: 'Alliance' }, guideData)
    .available.find(dungeon => dungeon.id === 'hall-of-thanes');
  const hordeHall = module.buildWarriorDungeonPreparation({ level: 20, specializationId: 'fury', faction: 'Horde' }, guideData)
    .available.find(dungeon => dungeon.id === 'hall-of-thanes');
  assert.ok(allianceHall.equipment.some(item => item.equipmentId === 'durgen-crescent-axe'));
  assert.ok(!hordeHall.equipment.some(item => item.equipmentId === 'durgen-crescent-axe'));

  const storage = { values: new Map(), getItem(name) { return this.values.get(name) ?? null; }, setItem(name, value) { this.values.set(name, String(value)); } };
  const key = module.WARRIOR_DUNGEON_PROGRESS_STORAGE_KEY;
  const progress = { 'deadmines:run': true, 'deadmines:quests': false, 'deadmines:gear': true };
  assert.equal(module.saveWarriorDungeonProgress(progress, storage), true);
  assert.deepEqual(JSON.parse(JSON.stringify(module.loadWarriorDungeonProgress(storage))), progress);
  assert.equal(storage.values.has(module.WARRIOR_CHECKLIST_STORAGE_KEY), false, 'dungeon completion uses a separate key from the leveling checklist');

  storage.setItem('bm-wow-leveling-companion-v1:warrior', JSON.stringify({ level: 18, faction: 'Alliance', tab: 'dungeons', specializationId: 'arms' }));
  const rendered = module.renderLevelingCompanion({ classId: 'warrior', currentLevel: 18, selectedSpecialization: 'arms', guideData, storage });
  assert.match(rendered, /data-companion-tab="dungeons"/);
  assert.match(rendered, /data-warrior-dungeon-task="deadmines:run" checked/);
  assert.match(rendered, /Before You Enter · Arms · DPS preparation/);
  assert.match(rendered, /Recommended at your level/);
  assert.match(rendered, /Faction quest records/);
  assert.match(rendered, /<details class="wow-warrior-dungeon-details">/);
  assert.match(rendered, /Warrior Loot/);
  assert.match(rendered, /Rewards:/);
  assert.match(rendered, /Before You Enter · Arms/);
  assert.doesNotMatch(rendered, /Sources:/);
  storage.setItem('bm-wow-leveling-companion-v1:warrior', JSON.stringify({ level: 17, faction: 'Alliance', tab: 'dungeons', specializationId: 'fury' }));
  const earlyRendered = module.renderLevelingCompanion({ classId: 'warrior', currentLevel: 17, selectedSpecialization: 'fury', guideData, storage });
  assert.match(earlyRendered, /Buzz Saw[\s\S]*?Required level:<\/b> Level 18 · upcoming/, 'dungeon drops distinguish item requirements from dungeon range recommendations');
  assert.match(earlyRendered, /data-equipment-id="buzz-saw"/);
  storage.setItem('bm-wow-leveling-companion-v1:warrior', JSON.stringify({ level: 30, faction: 'Alliance', tab: 'dungeons', specializationId: 'protection' }));
  const protectionRendered = module.renderLevelingCompanion({ classId: 'warrior', currentLevel: 30, selectedSpecialization: 'protection', guideData, storage });
  assert.match(protectionRendered, /Slot:<\/b> Main Hand/);
  assert.match(protectionRendered, /Lady Sarevess/);
  assert.match(portalStyles, /\.wow-warrior-facts \{ gap:\.6rem 1rem; \}/, 'mobile fact spacing declaration parses as two CSS gap values');
  assert.match(portalStyles, /\.wow-warrior-nav button \{ min-height:46px; padding:\.5rem \.35rem; \}/, 'mobile navigation padding declaration parses as two CSS values');
  const otherClass = module.renderLevelingCompanion({ classId: 'paladin', currentLevel: 18, guideData: { classRecord: wowPack.classes.find(item => item.id === 'paladin') }, storage: { getItem: () => null } });
  assert.doesNotMatch(otherClass, /data-companion-tab="dungeons"/, 'the existing Warrior-only dungeon tab stays class-scoped');
  assert.match(otherClass, /data-companion-tab="gold-farming"/, 'the reusable gold farming tab is available for future class records');
});

test('gold farming responds to level, specialization and faction and preserves source metadata', () => {
  const module = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const storage = { getItem: () => null };
  const render = (level, specializationId, faction) => module.renderLevelingCompanion({
    classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId,
    guideData: { classRecord: warrior },
    storage: { getItem: key => key.endsWith(':warrior') ? JSON.stringify({ level, faction, specializationId, tab: 'gold-farming' }) : null },
  });
  const early = module.getCompanionPanel({ classId: 'warrior', level: 15, specializationId: 'arms', faction: 'Alliance', tab: 'gold-farming' }, { classRecord: warrior });
  assert.equal(early.goldFarming.level, 15);
  assert.match(render(15, 'arms', 'Alliance'), /Levels 1–20 suggestions/);
  assert.doesNotMatch(render(15, 'arms', 'Alliance'), /gorilla fangs/i);
  assert.doesNotMatch(render(40, 'protection', 'Alliance'), /Repeatable shellfish turn-in/);
  assert.match(render(40, 'protection', 'Horde'), /Repeatable shellfish turn-in/);
  for (const [level, spec, faction, expected] of [
    [14, 'arms', 'Alliance', 'Greymist Seer loot loop'],
    [29, 'fury', 'Horde', 'Elder Razormaw drops'],
    [40, 'arms', 'Alliance', 'Cold Eye Basilisk loop'],
    [54, 'protection', 'Horde', 'Blackrock Depths group loot run'],
    [60, 'protection', 'Horde', 'Stratholme level-60 group loot run'],
  ]) {
    const html = render(level, spec, faction);
    assert.match(html, new RegExp(expected));
    assert.match(html, new RegExp(`data-gold-spec="${spec}"`));
    assert.doesNotMatch(html, /Source ↗|verified 2026-|class="wow-gold-evidence|Forever data|Market-recorded/);
  }
  assert.doesNotMatch(render(14, 'arms', 'Horde'), /Greymist Seer loot loop/);
  assert.match(render(39, 'fury', 'Alliance'), /Fury approach/);
  assert.match(render(54, 'protection', 'Horde'), /whole group/);
  assert.match(render(14, 'arms', 'Alliance'), /source has ten recorded kills for drop observations/);
  const desktopLayout = portalStyles.match(/\.wow-gold-grid \{[^}]+\}/)?.[0] || '';
  assert.match(desktopLayout, /repeat\(2,\s*minmax\(0,\s*1fr\)\)/, 'desktop grid uses two equal columns');
  assert.match(portalStyles, /\.wow-gold-card:only-child\s*\{\s*grid-column:\s*1\s*\/\s*-1/,
    'a single recommendation spans the available row');
  assert.match(portalStyles, /@media\s*\(max-width:\s*900px\)\s*\{\s*\.wow-gold-grid\s*\{\s*grid-template-columns:\s*1fr/,
    'tablet and mobile grid collapses to one column');
  assert.match(portalStyles, /@media\(max-width:560px\)[\s\S]*?\.wow-gold-card dl \{ grid-template-columns:1fr;/,
    'mobile card details also stack in one column');
  const middle = module.getCompanionPanel({ classId: 'warrior', level: 40, specializationId: 'protection', faction: 'Horde', tab: 'gold-farming' }, { classRecord: warrior });
  assert.equal(middle.goldFarming.faction, 'Horde');
  const rendered = module.renderLevelingCompanion({ classId: 'warrior', currentLevel: 40, selectedSpecialization: 'protection', guideData: { classRecord: warrior }, storage: { getItem: key => key.endsWith(':warrior') ? JSON.stringify({ level: 40, faction: 'Horde', specializationId: 'protection', tab: 'gold-farming' }) : null } });
  assert.match(rendered, /Gorilla hides, hair and quest fangs/);
  assert.match(rendered, /Creator-reported; not a promise or typical result/);
  assert.doesNotMatch(rendered, /class="wow-gold-evidence|Source ↗|verified 2026-11-24/);
  assert.match(rendered, /Practical instructions and risks/);
  assert.doesNotMatch(rendered, /About 5–6 gold per hour/, 'creator estimates without a documented measurement are not presented as gold-per-hour results');
  const goldRecords = h.modules.get(resolve(root, 'dist/data/games/wow-forever-gold-farming.js')).namespace.WOW_GOLD_FARMING_METHODS;
  const creatorRecord = goldRecords.find(method => method.id === 'theramore-north-turtles');
  assert.ok(creatorRecord.sourceUrl && creatorRecord.verifiedDate && creatorRecord.status === 'Creator-reported', 'source and reliability metadata remain available in the data module');
  assert.match(rendered, /Levels 21–40 suggestions/);
  assert.match(render(47, 'arms', 'Alliance'), /Levels 41–59 suggestions/);
  assert.match(render(60, 'protection', 'Horde'), /Level 60 suggestions/);
  const emptyClass = module.renderLevelingCompanion({ classId: 'paladin', currentLevel: 10, selectedSpecialization: 'holy', guideData: { classRecord: wowPack.classes.find(item => item.id === 'paladin') }, storage: { getItem: key => key.endsWith(':paladin') ? JSON.stringify({ level: 10, faction: 'Alliance', specializationId: 'holy', tab: 'gold-farming' }) : null } });
  assert.match(emptyClass, /No matching methods for this level, faction, and specialization/);
});

test('leveling companion renders complete source-backed builds and safely handles blocked storage', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const specs = warrior.specializations;
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const engine = { builds: wowGuidedData.builds, catalog: wowClientData, resolve: wowModule.resolveWowGuidedBuild, availablePoints: wowModule.availableWowTalentPoints };
  const talentClass = wowClientData.classes.find(item => item.id === 'warrior');
  for (const spec of specs) {
    const missing = companionModule.getCompanionPanel({ classId: 'warrior', level: 15, specializationId: spec.id, tab: 'talents' }, { classRecord: warrior, talentClass }, engine);
    if (spec.id === 'arms') {
      assert.deepEqual(JSON.parse(JSON.stringify(missing.sections[0])), { title: 'Talent points spent / available', text: '6 / 6' });
      assert.deepEqual(JSON.parse(JSON.stringify(missing.notices)), []);
      assert.equal(missing.treeData.validation.total, 6);
    } else {
      assert.deepEqual(JSON.parse(JSON.stringify(missing.sections[0])), { title: 'Talent points spent / available', text: '6 / 6' });
      assert.deepEqual(JSON.parse(JSON.stringify(missing.notices)), []);
      assert.equal(missing.treeData.validation.total, 6);
    }
  }
  assert.deepEqual(wowGuidedData.builds.filter(build => build.classId === 'warrior').map(build => build.specializationId), ['arms', 'fury', 'protection']);
  const shaman = wowPack.classes.find(item => item.id === 'shaman');
  const shamanTalentClass = wowClientData.classes.find(item => item.id === 'shaman');
  const partialShaman = companionModule.getCompanionPanel({ classId: 'shaman', level: 20, specializationId: 'enhancement', tab: 'talents' }, { classRecord: shaman, talentClass: shamanTalentClass }, engine);
  assert.deepEqual(JSON.parse(JSON.stringify(partialShaman.notices)), ['The saved build is not eligible for automatic use (status: Partial · manual in-game verification still needed).']);
  assert.equal(companionModule.saveCompanionState({ classId: 'warrior', level: 45, specializationId: 'protection', tab: 'gear' }, { setItem() { throw new Error('Storage denied'); } }), false);
  const fallback = companionModule.loadCompanionState('warrior', { level: 17, specializationId: 'fury' }, specs, { getItem() { throw new Error('Storage denied'); } });
  assert.deepEqual(JSON.parse(JSON.stringify(fallback)), { classId: 'warrior', level: 17, specializationId: 'fury', tab: 'overview', selectedTalentId: '', faction: 'Alliance' });
});

test('WoW Forever talent point budget follows the level-10 through level-60 rule', () => {
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  for (const [level, expected] of [[1, 0], [9, 0], [10, 1], [15, 6], [60, 51]]) {
    assert.equal(wowModule.availableWowTalentPoints(level, 0), expected, `level ${level}`);
  }
});

test('Arms automatic progression stays unchanged and validates every level', () => {
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const build = wowGuidedData.builds.find(item => item.id === 'bm-warrior-arms-leveling-10-60');
  assert.ok(build);
  assert.equal(build.verificationStatus, 'source-supported');
  assert.equal(build.allocations.length, 51);
  assert.deepEqual(JSON.parse(JSON.stringify(wowModule.validateWowGuidedBuild(build, wowClientData))), { valid: true, issues: [] });
  for (const [level, expected] of [[9, 0], [10, 1], [15, 6], [35, 26], [60, 51]]) {
    const result = wowModule.resolveWowGuidedBuild(build, wowClientData, level);
    assert.equal(result.valid, true, `level ${level}: ${result.issues.join('; ')}`);
    assert.equal(result.total, expected, `level ${level}`);
  }
  const at15 = wowModule.resolveWowGuidedBuild(build, wowClientData, 15);
  assert.deepEqual(JSON.parse(JSON.stringify(at15.allocation)), {
    'warrior-arms-improved-rend': 3,
    'warrior-arms-deflection': 2,
    'warrior-arms-improved-tactical-mastery': 1
  });
  const at35 = wowModule.resolveWowGuidedBuild(build, wowClientData, 35);
  assert.equal(at35.valid, true);
  assert.equal(at35.total, 26);
  assert.equal(at35.allocation['warrior-arms-weaponmaster'], 3);
  const at60 = wowModule.resolveWowGuidedBuild(build, wowClientData, 60);
  assert.equal(at60.allocation['warrior-fury-cruelty'], 5);
  assert.equal(at60.allocation['warrior-fury-unbridled-wrath'], 5);
  assert.equal(at60.allocation['warrior-fury-booming-voice'], 2);
  for (let level = 10; level <= 60; level++) {
    const allocation = wowModule.resolveWowGuidedBuild(build, wowClientData, level).allocation;
    for (const tree of wowClientData.classes.find(item => item.id === 'warrior').trees) {
      assert.deepEqual(JSON.parse(JSON.stringify(h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace.validateCompanionTalentTiers(tree, allocation))), [], `tier requirements at level ${level}, ${tree.name}`);
    }
  }
});

test('all Warrior talent builds resolve level budgets, exact allocation, and specialization changes', () => {
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const talentClass = wowClientData.classes.find(item => item.id === 'warrior');
  const expectedLevels = [10, 15, 25, 34, 40, 60];
  const builds = ['arms', 'fury', 'protection'].map(specializationId => {
    const build = wowGuidedData.builds.find(item => item.classId === 'warrior' && item.specializationId === specializationId);
    assert.ok(build, `${specializationId} build exists`);
    assert.equal(build.allocations.length, 51);
    assert.deepEqual(JSON.parse(JSON.stringify(wowModule.validateWowGuidedBuild(build, wowClientData))), { valid: true, issues: [] });
    return build;
  });
  for (const build of builds) for (const level of expectedLevels) {
    const resolved = wowModule.resolveWowGuidedBuild(build, wowClientData, level);
    const budget = wowModule.availableWowTalentPoints(level, 0);
    assert.equal(resolved.valid, true, `${build.specializationId} level ${level}: ${resolved.issues.join('; ')}`);
    assert.equal(resolved.total, budget, `${build.specializationId} level ${level} budget`);
    assert.equal(Object.values(resolved.allocation).reduce((sum, rank) => sum + rank, 0), budget);
  }
  const engine = { builds: wowGuidedData.builds, catalog: wowClientData, resolve: wowModule.resolveWowGuidedBuild, availablePoints: wowModule.availableWowTalentPoints };
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  for (const level of expectedLevels) for (const specializationId of ['arms', 'fury', 'protection']) {
    const panel = companionModule.getCompanionPanel({ classId: 'warrior', level, specializationId, tab: 'talents' }, { classRecord: warrior, talentClass }, engine);
    assert.equal(panel.treeData.build.specializationId, specializationId);
    assert.equal(panel.treeData.recommended.total, wowModule.availableWowTalentPoints(level, 0));
  }
});

test('Warrior route loads the guided-build JSON and renders automatic Arms allocations at each level', () => {
  const key = 'bm-wow-leveling-companion-v1:warrior';
  const saved = h.storedValues.get(key);
  try {
    assert.ok(h.fetchRequests.includes('./data/games/world-of-warcraft-forever-guided-builds.json'));
    const build = wowGuidedData.builds.find(item => item.classId === 'warrior' && item.specializationId === 'arms');
    assert.ok(build, 'the app load path provides the Arms build to the Warrior route');
    assert.equal(build.verificationStatus, 'source-supported');
    for (const [level, total] of [[10, 1], [15, 6], [17, 8], [35, 26], [60, 51]]) {
      h.storedValues.set(key, JSON.stringify({ level, specializationId: 'arms', tab: 'talents' }));
      const html = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/classes/warrior'));
      assert.ok(html.includes(`${total} / ${total}`), `level ${level} renders ${total} / ${total} points`);
      assert.ok(html.includes(`Arms talent tree · Level ${level}`));
      assert.ok(html.includes('data-companion-level-step="-1"'));
      assert.ok(html.includes('data-companion-level-step="1"'));
      assert.doesNotMatch(html, /data-companion-level-step="-1" disabled/);
      if (level === 60) assert.match(html, /data-companion-level-step="1" disabled/);
      else assert.doesNotMatch(html, /data-companion-level-step="1" disabled/);
      assert.match(html, /class="wow-companion-tree is-primary tree-arms"/);
      assert.match(html, /aria-label="Arms talent tree" aria-current="true"/);
      assert.match(html, /aria-label="Fury talent tree"/);
      assert.match(html, /aria-label="Protection talent tree"/);
      assert.equal((html.match(/class="wow-companion-tree is-(?:primary|secondary) tree-(?:arms|fury|protection)"/g) || []).length, 3, 'all Warrior trees remain visible together');
      assert.ok(html.includes('wow-companion-connectors'));
      assert.ok(html.includes('marker-end="url(#companion-arrow-arms'), 'prerequisite connectors include arrows');
      assert.ok(html.indexOf('class="wow-companion-tree-stack"') < html.indexOf('class="wow-companion-talent-detail"'), 'talent details follow all three trees');
      assert.ok(html.includes('assets/images/wow-forever/icons/ability_warrior_'));
      assert.ok(!html.includes(build.sourceTitle), 'source citations are omitted from the Warrior tab UI');
      assert.ok(!html.includes('wow-companion-build-source'));
      assert.ok((html.match(/class="wow-companion-tree-node is-spent"/g) || []).length > 0, `level ${level} highlights allocated talents`);
    }
    h.storedValues.set(key, JSON.stringify({ level: 1, specializationId: 'arms', tab: 'overview' }));
    const levelOneHtml = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/classes/warrior'));
    assert.match(levelOneHtml, /data-companion-level-step="-1" disabled/);
    assert.doesNotMatch(levelOneHtml, /data-companion-level-step="1" disabled/);
  } finally {
    if (saved === undefined) h.storedValues.delete(key);
    else h.storedValues.set(key, saved);
  }
});

test('Warrior app data wiring loads level-34 Combat and shared Accessories for every specialization', () => {
  assert.match(appSource, /warriorCombat:\s*wowData\.warriorCombat/);
  assert.match(appSource, /warriorEquipment:\s*wowData\.warriorEquipment/);
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guideData = {
    classRecord: warrior, guide: warrior.starterGuide, zones: wowPack.zones, dungeons: wowPack.dungeons,
    warriorLeveling: wowPack.warriorLeveling, warriorEquipment: wowPack.warriorEquipment,
    warriorCombat: wowPack.warriorCombat, warriorProfessions: wowPack.warriorProfessions,
    sources: wowPack.sources, specializationGuides: warrior.specializationGuides,
    talentClass: wowClientData.classes.find(item => item.id === 'warrior'), combatCatalog: wowClientData
  };
  const render = (level, specializationId, tab) => companionModule.renderLevelingCompanion({
    classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId, guideData,
    progressionEngine: { builds: wowGuidedData.builds, catalog: wowClientData,
      resolve: wowModule.resolveWowGuidedBuild, validate: wowModule.validateWowTalentAllocation,
      availablePoints: wowModule.availableWowTalentPoints },
    storage: { getItem: () => JSON.stringify({ level, specializationId, tab }) }
  });
  for (const specializationId of ['arms', 'fury', 'protection']) {
    const combat = render(34, specializationId, 'combat');
    assert.ok(combat.includes('data-combat-level="34"'));
    assert.ok(combat.includes(`data-combat-specialization="${specializationId}"`));
    assert.ok(!combat.includes('Verified combat guidance is not loaded for this specialization.'));
    for (const level of [10, 15, 25, 34, 40, 60]) {
      const gear = render(level, specializationId, 'gear');
      assert.ok(gear.includes('data-gear-category="accessory"'), `${specializationId} shared accessories load at ${level}`);
      const talents = render(level, specializationId, 'talents');
      const points = level - 9;
      assert.ok(talents.includes(`${points} / ${points}`), `${specializationId} level ${level} budget: ${talents.match(/<strong>[^<]*<\/strong><span>points spent[^<]*/)?.[0] || 'no meter'}`);
      assert.ok(talents.includes(`class="wow-companion-tree is-primary tree-${specializationId}"`));
      assert.equal((talents.match(/class="wow-companion-tree is-(?:primary|secondary) tree-(?:arms|fury|protection)"/g) || []).length, 3);
      assert.ok((talents.match(/class="wow-companion-tree-node is-spent"/g) || []).length > 0);
    }
  }
});

test('Warrior companion tabs omit visible source references while source metadata remains available', () => {
  const key = 'bm-wow-leveling-companion-v1:warrior';
  const saved = h.storedValues.get(key);
  const sourceIds = wowPack.classes.find(item => item.id === 'warrior').specializationGuides.arms.sourceIds;
  try {
    for (const tab of ['overview', 'stats', 'talents', 'combat', 'gear', 'leveling', 'professions']) {
      h.storedValues.set(key, JSON.stringify({ level: 20, specializationId: 'arms', tab }));
      const html = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/classes/warrior'));
      assert.ok(!html.includes('wow-companion-guide-sources'), `${tab} omits generic citations`);
      assert.ok(!html.includes('wow-stat-explanation-sources'), `${tab} omits inline citations`);
      assert.ok(!html.includes('wow-companion-build-source'), `${tab} omits build citations`);
      assert.ok(!html.includes('wow-companion-tier-source'), `${tab} omits source disclosure citations`);
    }
    assert.ok(sourceIds.every(id => wowPack.sources.some(source => source.id === id)), 'source attribution remains in structured guide data');
    assert.ok(h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/classes/warrior')).includes('Open Forever trainer spellbook'));
  } finally {
    if (saved === undefined) h.storedValues.delete(key);
    else h.storedValues.set(key, saved);
  }
});

test('Warrior Overview presents sourced Strengths and Weaknesses in distinct responsive panels', () => {
  const key = 'bm-wow-leveling-companion-v1:warrior';
  const saved = h.storedValues.get(key);
  const overview = wowPack.classes.find(item => item.id === 'warrior').specializationGuides.arms.sections.overview.sections;
  try {
    h.storedValues.set(key, JSON.stringify({ level: 20, specializationId: 'arms', tab: 'overview' }));
    const html = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/classes/warrior'));
    const contextPosition = html.indexOf('class="wow-warrior-overview-context"');
    const strengthsPosition = html.indexOf('class="wow-warrior-overview-points is-strengths"');
    const weaknessesPosition = html.indexOf('class="wow-warrior-overview-points is-weaknesses"');
    assert.ok(contextPosition >= 0 && contextPosition < strengthsPosition);
    assert.ok(strengthsPosition < weaknessesPosition);
    assert.equal((html.match(/class="wow-warrior-overview-points is-(?:strengths|weaknesses)"/g) || []).length, 2);
    assert.equal((html.match(/aria-hidden="true">[+−]<\/span>/g) || []).length, 2);
    assert.ok(!html.includes('wow-warrior-overview-point-sign'));
    for (const point of [...overview.find(section => section.title === 'Strengths').items, ...overview.find(section => section.title === 'Weaknesses').items]) assert.ok(html.includes(point), point);
    assert.ok(html.includes('aria-hidden="true">+</span>'));
    assert.ok(html.includes('aria-hidden="true">−</span>'));
    assert.match(portalStyles, /\.wow-warrior-overview-panels \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(portalStyles, /\.wow-warrior-overview-points \{ display:flex; min-width:0; flex-direction:column;/);
    assert.match(portalStyles, /\.wow-warrior-overview-points li::before \{ position:absolute;/);
    assert.match(portalStyles, /\.wow-warrior-overview-context \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(portalStyles, /\.wow-companion-tabs \[role="tab"\].*font:650 \.82rem/);
    assert.match(portalStyles, /\.wow-companion-level-stepper \{ display:grid; grid-column:1\/-1;/);
    assert.match(portalStyles, /@media\(max-width:580px\) \{[\s\S]*?\.wow-warrior-guide \.wow-warrior-overview-context,\.wow-warrior-guide \.wow-warrior-overview-panels \{ grid-template-columns:1fr; \}/);
  } finally {
    if (saved === undefined) h.storedValues.delete(key);
    else h.storedValues.set(key, saved);
  }
});

test('Warrior gear guide follows level and specialization data without filling missing item lists', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const renderGear = (specializationId, level) => companionModule.renderLevelingCompanion({
    classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId,
    guideData: { classRecord: warrior },
    storage: { getItem: () => JSON.stringify({ level, specializationId, tab: 'gear' }) }
  });
  const furyBeforeDualWield = renderGear('fury', 19);
  assert.ok(furyBeforeDualWield.includes('Fury · Weapons &amp; Gear · Level 19'));
  assert.ok(furyBeforeDualWield.includes('Keep your strongest current weapon equipped'));
  assert.ok(furyBeforeDualWield.includes('No spec-only armor path is recorded'));
  assert.ok(!furyBeforeDualWield.includes('Corpsemaker'));
  const furyAfterDualWield = renderGear('fury', 20);
  assert.ok(furyAfterDualWield.includes('After training Dual Wield at level 20'));
  const protection = renderGear('protection', 35);
  assert.ok(protection.includes('Protection · Weapons &amp; Gear · Level 35'));
  assert.ok(protection.includes('No verified Protection equipment guidance or item records are stored yet.'));
});

test('Warrior equipment recommendations filter by level, faction, specialization, and slot', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guideData = { classRecord: warrior, warriorEquipment: wowPack.warriorEquipment, sources: wowPack.sources };
  const render = (level, faction, specializationId) => companionModule.renderLevelingCompanion({
    classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId, guideData,
    storage: { getItem: () => JSON.stringify({ level, faction, specializationId, tab: 'gear' }) }
  });

  const allianceArms = render(18, 'Alliance', 'arms');
  assert.ok(allianceArms.includes('Gloves of the Fang'));
  assert.ok(allianceArms.includes('Upcoming · Available at Level 20'));
  assert.ok(!allianceArms.includes("Ruga&#39;s Bulwark"));
  assert.ok(!allianceArms.includes('Kresh&#39;s Back'), 'shield records are Protection-only');
  assert.ok(allianceArms.includes('data-gear-category="armor" data-gear-slot="Shoulders"'));

  const shieldRecords = wowPack.warriorEquipment.items.filter(item => item.slot === 'Shield');
  assert.ok(shieldRecords.some(item => item.name === "Ruga's Bulwark" && item.faction === 'Horde'));
  assert.ok(shieldRecords.some(item => item.name === "Furen's Favor" && item.faction === 'Alliance'));
  assert.ok(shieldRecords.every(item => item.specializations.includes('protection')));

  const level50Arms = render(50, 'Alliance', 'arms');
  assert.ok(level50Arms.includes('Fury Visor'));
  assert.ok(level50Arms.includes('Razorsteel Shoulders'));
  assert.ok(level50Arms.includes('Diamond Flask'));
  assert.ok(level50Arms.includes('Required level</strong>Not listed in item record'));
  const royalSeal = wowPack.warriorEquipment.items.find(item => item.id === 'royal-seal-of-eldrethalas');
  assert.equal(royalSeal.availabilityLevel, 54);
  assert.deepEqual(royalSeal.specializations, ['protection']);

  for (const level of [15, 25, 35, 45, 60]) for (const specializationId of ['arms', 'fury', 'protection']) {
    const html = render(level, 'Alliance', specializationId);
    assert.ok(html.includes('data-gear-category="accessory"'), `${specializationId} has accessory recommendations at level ${level}`);
    assert.ok(!html.includes('No verified Warrior equipment guidance or item records are stored yet.'), `${specializationId} shared data is wired at level ${level}`);
    assert.ok(html.includes(`· Weapons &amp; Gear · Level ${level}`), `${specializationId} gear view follows the selected level`);
  }
  for (const [level, specializationId, itemName, availability] of [
    [15, 'arms', "Veteran's Chain Shirt", 'Available now · Available at Level 15'],
    [25, 'fury', "Veteran's Chain Helm", 'Available now · Available at Level 25'],
    [35, 'protection', 'Pronged Reaver', 'Available now · Available at Level 30'],
    [45, 'arms', 'Scarlet Leggings', 'Available now · Available at Level 39'],
    [60, 'fury', "Hurley's Tankard", 'Available now · Available at Level 52'],
  ]) {
    const html = render(level, 'Alliance', specializationId);
    assert.ok(html.includes(itemName.replaceAll("'", '&#39;')), `${specializationId} shows ${itemName} at ${level}`);
    assert.ok(html.includes(availability), `${itemName} availability follows level ${level}`);
    assert.ok(html.includes('data-gear-group="available"'));
  }
  const upcomingAt45 = render(45, 'Horde', 'protection');
  assert.match(upcomingAt45, /Lord General&#39;s Sword[\s\S]*?Upcoming · Available at Level 51/);
  const atlasItems = wowPack.warriorEquipment.items.filter(item => item.sourceIds?.includes('forever-atlas-warrior-gear'));
  assert.equal(atlasItems.length, 41);
  assert.ok(wowPack.warriorEquipment.sourceIds.includes('forever-atlas-warrior-gear'));
  assert.ok(atlasItems.every(item => item.verificationDate === '2026-11-24' && item.classRequirement && item.factionRestriction));
  assert.ok(atlasItems.every(item => wowPack.sources.some(source => source.id === 'forever-atlas-warrior-gear')));
  assert.ok(atlasItems.every(item => wowPack.dungeons.some(dungeon => dungeon.id === item.dungeonId)), 'new dungeon drops link to existing dungeon records');
  assert.ok(atlasItems.every(item => item.sourceUrl && item.acquisitionSourceUrl));
  const armsAt60 = render(60, 'Alliance', 'arms');
  const furyAt60 = render(60, 'Alliance', 'fury');
  const protectionAt60 = render(60, 'Alliance', 'protection');
  assert.ok(armsAt60.includes('Hammer of Thundering Hooves'));
  assert.ok(!furyAt60.includes('Hammer of Thundering Hooves'), 'two-handed Arms gear stays specialization-filtered');
  assert.ok(furyAt60.includes('Cinderedge Crescent'));
  for (const id of ['bloodslash-axe', 'dreadfrost-saber', 'toofbreaker', 'cinderedge-crescent', 'scaleguard-scimitar', 'talon-of-torrel']) {
    assert.equal(atlasItems.find(item => item.id === id)?.slot, 'One-Hand', `${id} can fill either one-handed weapon hand`);
  }
  assert.ok(protectionAt60.includes('Raptorscale Bulwark'));
  const allianceAt60 = render(60, 'Alliance', 'protection');
  const hordeAt60 = render(60, 'Horde', 'protection');
  assert.ok(allianceAt60.includes('Theramore Defender’s Gauntlets'));
  assert.ok(!allianceAt60.includes('Kor’kron Battle Gauntlets'));
  assert.ok(hordeAt60.includes('Kor’kron Battle Gauntlets'));
  assert.ok(!hordeAt60.includes('Theramore Defender’s Gauntlets'));
  const wingblade = wowPack.warriorEquipment.items.find(item => item.id === 'wingblade');
  assert.equal(wingblade.requiredLevel, null, 'the database does not state a minimum level for Wingblade');
  assert.ok(wingblade.sourceUrl && wingblade.sourceIds.includes('icy-wow-forever-items'));
  assert.ok(wingblade.sourceIds.every(id => wowPack.sources.some(source => source.id === id)), 'new item source IDs resolve to retained source metadata');
  for (const record of [...wowPack.warriorEquipment.items, ...wowPack.classes.find(item => item.id === 'warrior').specializationGuides.arms.sections.gear.equipmentGuide.items]) {
    assert.ok(record.sourceUrl && record.sourceIds?.length, `${record.name} keeps source metadata`);
  }
});

test('Warrior Combat filters ability availability by level and renders specialization priorities', async () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guideData = {
    classRecord: warrior,
    warriorCombat: wowPack.warriorCombat,
    combatCatalog: wowClientData,
    talentClass: wowClientData.classes.find(item => item.id === 'warrior')
  };
  const render = (level, specializationId) => companionModule.renderLevelingCompanion({
    classId: 'warrior', currentLevel: level, selectedSpecialization: specializationId, guideData,
    storage: { getItem: () => JSON.stringify({ level, specializationId, tab: 'combat' }) }
  });

  const armsBeforeSlam = render(19, 'arms');
  assert.ok(armsBeforeSlam.includes('data-combat-level="19"'));
  assert.ok(armsBeforeSlam.includes('data-combat-specialization="arms"'));
  assert.ok(armsBeforeSlam.includes('Upcoming · Minimum level 20'));
  assert.ok(armsBeforeSlam.includes('class="wow-warrior-combat-step is-upcoming is-locked"'));
  assert.ok(armsBeforeSlam.includes('Single target') && armsBeforeSlam.includes('Multiple enemies') && armsBeforeSlam.includes('Defensive situations'));
  assert.ok(armsBeforeSlam.includes('Combat Priority'));
  assert.ok(armsBeforeSlam.includes('Opening a Fight') && armsBeforeSlam.includes('Rage Management'));

  const armsAtThirty = render(30, 'arms');
  assert.ok(armsAtThirty.includes('Sweeping Strikes'));
  assert.ok(armsAtThirty.includes('New at this level'));
  assert.ok(armsAtThirty.includes('not a fixed rotation'));
  const renderedIcons = [...armsAtThirty.matchAll(/<img src="(assets\/images\/wow-forever\/icons\/[^"]+)" alt=""/g)];
  assert.ok(renderedIcons.length > 0, 'matching local Warrior ability icons render when available');
  for (const [, iconPath] of renderedIcons) assert.ok((await readFile(resolve(root, 'dist', iconPath))).length > 0, `local icon exists: ${iconPath}`);

  const furyAtThirtyFive = render(35, 'fury');
  assert.ok(furyAtThirtyFive.includes('data-combat-specialization="fury"'));
  assert.ok(furyAtThirtyFive.includes('Upcoming · Minimum level 36'));
  const furyAtThirtySix = render(36, 'fury');
  assert.ok(furyAtThirtySix.includes('Whirlwind'));
  assert.ok(furyAtThirtySix.includes('New at this level'));
  assert.ok(furyAtThirtySix.includes('Berserker Stance'));

  const protectionAtThirtyNine = render(39, 'protection');
  assert.ok(protectionAtThirtyNine.includes('data-combat-specialization="protection"'));
  assert.ok(protectionAtThirtyNine.includes('Upcoming · Minimum level 40'));
  const protectionAtForty = render(40, 'protection');
  assert.ok(protectionAtForty.includes('Shield Slam'));
  assert.ok(protectionAtForty.includes('New at this level'));
  assert.ok(protectionAtForty.includes('Shield Block'));

  for (const level of [15, 23, 35, 60]) for (const specializationId of ['arms', 'fury', 'protection']) {
    const html = render(level, specializationId);
    assert.ok(html.includes(`data-combat-level="${level}"`), `${specializationId} combat level ${level} loads`);
    assert.ok(html.includes(`data-combat-specialization="${specializationId}"`), `${specializationId} combat key resolves at ${level}`);
    assert.ok(html.includes('data-ability-availability="available"'), `${specializationId} has verified available abilities at ${level}`);
    if (level < 60) assert.ok(html.includes('data-ability-availability="upcoming"'), `${specializationId} distinguishes upcoming abilities at ${level}`);
    assert.ok(html.includes('Does:</strong>') && html.includes('When to use:</strong>') && html.includes('Minimum level'), `${specializationId} renders ability guidance and verified level at ${level}`);
    assert.ok(html.toLowerCase().includes('context-based priority list') && html.toLowerCase().includes('not a fixed sequence'), `${specializationId} explains priority systems at ${level}`);
    assert.ok(!html.includes('Verified combat guidance is not loaded'), `${specializationId} has sourced combat at ${level}`);
  }
  const level23 = render(23, 'arms');
  const mortalStrikePosition = level23.indexOf('<strong>Mortal Strike</strong>');
  const mortalStrikeStart = level23.lastIndexOf('<li class="', mortalStrikePosition);
  const mortalStrikeCard = level23.slice(mortalStrikeStart, level23.indexOf('</li>', mortalStrikePosition));
  assert.ok(mortalStrikeCard.includes('data-ability-availability="upcoming"') && mortalStrikeCard.includes('Upcoming · Minimum level 40') && mortalStrikeCard.includes('When to use:</strong> Upcoming:'), 'Mortal Strike at level 23 is explicitly upcoming, never immediately usable');
  const incompleteCatalog = { ...wowClientData, spellDescriptions: Object.fromEntries(Object.entries(wowClientData.spellDescriptions).filter(([key]) => !key.startsWith('Warrior|Slam|'))) };
  const unverifiedAbilityHtml = companionModule.renderLevelingCompanion({
    classId: 'warrior', currentLevel: 23, selectedSpecialization: 'arms',
    guideData: { ...guideData, combatCatalog: incompleteCatalog },
    storage: { getItem: () => JSON.stringify({ level: 23, specializationId: 'arms', tab: 'combat' }) }
  });
  assert.ok(unverifiedAbilityHtml.includes('data-ability-availability="unverified"') && unverifiedAbilityHtml.includes('Availability unverified') && unverifiedAbilityHtml.includes('Confirm that this ability is trained'), 'missing ability training metadata is explicitly unverified');

  const otherClass = companionModule.renderLevelingCompanion({ classId: 'paladin', currentLevel: 30, selectedSpecialization: 'retribution', guideData: { classRecord: wowPack.classes.find(item => item.id === 'paladin') } });
  assert.ok(!otherClass.includes('data-companion-tab="combat"'), 'Combat tab is Warrior-only');
});

test('Warrior talent layout uses full-width equal trees without desktop overflow and stacks responsively', () => {
  assert.match(portalStyles, /\.wow-warrior-guide \.wow-companion-panel:has\(\.wow-companion-tree\) \{ grid-template-columns:minmax\(0,1fr\); \}/);
  assert.match(portalStyles, /\.wow-leveling-companion \.wow-companion-tree-stack \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(portalStyles, /\.wow-leveling-companion \.wow-companion-tree-scroll \{ overflow:visible;/);
  assert.match(portalStyles, /\.wow-leveling-companion \.wow-companion-tree-grid \{[^}]*grid-template-columns:repeat\(var\(--talent-columns\),minmax\(0,1fr\)\)[^}]*width:100%;/);
  assert.match(portalStyles, /@media\(max-width:900px\) \{\s*\.wow-leveling-companion \.wow-companion-tree-stack \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/);
  assert.match(portalStyles, /@media\(max-width:580px\) \{\s*\.wow-leveling-companion \.wow-companion-tree-stack \{ grid-template-columns:1fr; \}/);
});

test('companion automatically updates sourced talent ranks with level and specialization', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const talentClass = wowClientData.classes.find(item => item.id === 'warrior');
  const arms = talentClass.trees.find(tree => tree.id === 'arms');
  const saved = new Map();
  const storage = { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) };
  const engine = {
    catalog: wowClientData, builds: wowGuidedData.builds,
    availablePoints: wowModule.availableWowTalentPoints,
    validate: wowModule.validateWowTalentAllocation,
    resolve: wowModule.resolveWowGuidedBuild
  };
  const druidTalentClass = wowClientData.classes.find(item => item.id === 'druid');
  assert.equal(companionModule.findCompanionTalentTree(druidTalentClass, 'feral', 'Feral').id, 'feral-combat');

  const rowTwo = arms.talents.find(talent => talent.row === 2);
  const prerequisiteChild = arms.talents.find(talent => talent.prerequisite);
  assert.equal(companionModule.companionTalentLock(rowTwo, arms, {}).tierLocked, true);
  assert.equal(companionModule.companionTalentLock(prerequisiteChild, arms, {}).prerequisiteLocked, true);
  const rowOne = arms.talents.filter(talent => talent.row === 1);
  let fivePoints = {};
  let points = 0;
  for (const talent of rowOne) {
    while (points < 5 && (fivePoints[talent.id] || 0) < talent.maxRank) {
      const next = wowModule.adjustWowTalentRank(talentClass, fivePoints, talent.id, 1, 51);
      assert.equal(next.error, '');
      fivePoints = next.allocation;
      points++;
    }
  }
  assert.equal(points, 5);
  assert.equal(companionModule.companionTalentLock(rowTwo, arms, fivePoints).tierLocked, false);
  const deeper = arms.talents.find(talent => talent.row === 3);
  const validSecondTier = { ...fivePoints, [rowTwo.id]: 1 };
  assert.deepEqual(JSON.parse(JSON.stringify(companionModule.validateCompanionTalentTiers(arms, validSecondTier))), []);
  const invalidTierRefund = { ...fivePoints, [rowOne[0].id]: fivePoints[rowOne[0].id] - 1, [rowTwo.id]: 1 };
  if (!invalidTierRefund[rowOne[0].id]) delete invalidTierRefund[rowOne[0].id];
  assert.equal(companionModule.validateCompanionTalentTiers(arms, invalidTierRefund).length, 1);
  assert.equal(companionModule.validateCompanionTalentTiers(arms, { [deeper.id]: 1 }).length, 1);

  const handlers = {};
  const levelInput = { value: '10', matches: selector => selector === '[data-companion-level-input]', setAttribute() {} };
  const levelOutput = { value: '10', textContent: '10' };
  const levelBadge = { textContent: 'Level 10' };
  const specSelect = { value: 'arms', matches: selector => selector === '[data-companion-spec]' };
  const panel = { innerHTML: '', setAttribute() {} };
  const status = { textContent: '' };
  const tabs = ['overview', 'talents', 'gear'].map(tab => ({ dataset: { companionTab: tab }, tabIndex: -1, setAttribute() {}, focus() {} }));
  const companion = {
    dataset: {},
    querySelector(selector) { return ({ '[data-companion-level-input]': levelInput, '[data-companion-level]': levelOutput, '[data-companion-level-badge]': levelBadge, '[data-companion-spec]': specSelect, '[data-companion-panel]': panel, '[data-companion-status]': status })[selector]; },
    querySelectorAll: () => tabs,
    addEventListener: (type, handler) => { handlers[type] = handler; }
  };
  companionModule.initializeLevelingCompanion({ querySelector: () => companion }, {
    classId: 'warrior', currentLevel: 10, selectedSpecialization: 'arms',
    guideData: { classRecord: warrior, talentClass }, progressionEngine: engine, storage
  });
  const targetFor = (selector, element) => ({ closest: candidate => candidate === selector ? element : null });
  handlers.click({ target: targetFor('[data-companion-tab]', tabs[1]) });
  assert.ok(!panel.innerHTML.includes('Arms Warrior, level 10 to 60 point-by-point'));
  assert.ok(panel.innerHTML.includes('1 / 1'));
  assert.ok(!panel.innerHTML.includes('Manual Build'));
  assert.ok(!panel.innerHTML.includes('data-companion-talent-remove'));
  assert.ok(!panel.innerHTML.includes('data-companion-talent-mode'));
  assert.ok(!panel.innerHTML.includes('Talent progression not yet verified'));
  levelInput.value = '11';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /2 \/ 2/);
  levelInput.value = '15';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /6 \/ 6/);
  assert.match(panel.innerHTML, /3\/3/);
  assert.match(panel.innerHTML, /class="wow-companion-tree-node is-spent"[^>]*>[\s\S]*?3\/3/);
  levelInput.value = '35';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /26 \/ 26/);
  assert.match(panel.innerHTML, /Arms talent tree · Level 35/);
  assert.match(panel.innerHTML, /class="wow-companion-tree is-primary tree-arms"/);
  levelInput.value = '60';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /51 \/ 51/);
  levelInput.value = '35';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /26 \/ 26/);
  levelInput.value = '15';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /6 \/ 6/);
  const inspectableTalent = arms.talents.find(talent => talent.name === 'Improved Rend');
  const rankBeforeInspect = panel.innerHTML.match(/3\/3/)?.[0];
  handlers.click({ target: targetFor('[data-companion-talent]', { dataset: { companionTalent: inspectableTalent.id } }) });
  assert.ok(panel.innerHTML.includes('Rank 3 / 3'));
  assert.equal(panel.innerHTML.match(/3\/3/)?.[0], rankBeforeInspect, 'inspecting an icon does not change its allocated rank');
  levelInput.value = '10';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /1 \/ 1/);
  levelInput.value = '1';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /0 \/ 0/);
  levelInput.value = '9';
  handlers.input({ target: levelInput });
  assert.match(panel.innerHTML, /0 \/ 0/);
  specSelect.value = 'fury';
  handlers.change({ target: specSelect });
  assert.ok(panel.innerHTML.includes('Fury talent tree · Level 9'));
  assert.ok(panel.innerHTML.includes('0 / 0'));
  levelInput.value = '34';
  handlers.input({ target: levelInput });
  assert.ok(panel.innerHTML.includes('25 / 25'));
  specSelect.value = 'protection';
  handlers.change({ target: specSelect });
  assert.ok(panel.innerHTML.includes('Protection talent tree · Level 34'));
  assert.ok(panel.innerHTML.includes('25 / 25'));
  levelInput.value = '15';
  handlers.input({ target: levelInput });
  assert.ok(panel.innerHTML.includes('6 / 6'), 'lowering the level removes points beyond its budget');
});

test('companion renders resolver-provided ranks, local icons, descriptions, and next points', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  // Synthetic test-only adapter data exercises rendering; it is not a game build or recommendation.
  const fixtureClass = {
    id: 'fixture', name: 'Fixture', color: '#aabbcc',
    specializations: [{ id: 'path', name: 'Path', role: 'Damage' }],
    trees: [{ id: 'path', talents: [
      { id: 'fixture-learned', name: 'Learned Talent', row: 1, column: 1, maxRank: 3, rankEffects: ['Rank one text', 'Rank two text', 'Rank three text'], icon: 'assets/images/wow-forever/icons/ability_warrior_charge.jpg' },
      { id: 'fixture-next', name: 'Next Talent', row: 1, column: 2, maxRank: 1, rankEffects: ['Next description'], icon: 'assets/images/wow-forever/icons/ability_warrior_devastate.jpg' }
    ] }]
  };
  const build = { id: 'fixture-only', classId: 'fixture', specializationId: 'path', verificationStatus: 'verified', coverage: { status: 'complete', highestDocumentedLevel: 60 } };
  const html = companionModule.renderLevelingCompanion({
    classId: 'fixture', currentLevel: 15, selectedSpecialization: 'path',
    guideData: { classRecord: fixtureClass, talentClass: fixtureClass },
    progressionEngine: {
      builds: [build], catalog: { classes: [fixtureClass] }, availablePoints: () => 2,
      resolve: () => ({ valid: true, snapshotLevel: 15, total: 2, covered: true, allocation: { 'fixture-learned': 2 }, nextChange: { level: 16, talentId: 'fixture-next', rankAdded: 1 } })
    },
    storage: { getItem: () => JSON.stringify({ level: 15, specializationId: 'path', tab: 'talents', talentMode: 'recommended' }) }
  });
  assert.ok(html.includes('2 / 2'));
  assert.ok(html.includes('Learned Talent'));
  assert.ok(html.includes('2/3'));
  assert.ok(html.includes('Rank two text'));
  assert.ok(html.includes('assets/images/wow-forever/icons/ability_warrior_charge.jpg'));
  assert.ok(html.includes('Next recommended talent · Unlocks at level 16 · Next Talent'));
});

test('guided progression validates prerequisites and maximum talent ranks', () => {
  const wowModule = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const warrior = wowClientData.classes.find(item => item.id === 'warrior');
  const arms = warrior.trees.find(tree => tree.id === 'arms');
  const child = arms.talents.find(talent => talent.prerequisite);
  const cappedTalent = arms.talents.find(talent => talent.maxRank === 1);
  const build = allocation => ({
    id: 'test-only-validator-fixture', classId: 'warrior', specializationId: 'arms',
    levelRange: { from: 10, through: 10 }, coverage: { highestDocumentedLevel: 10 },
    allocations: [allocation]
  });
  const unmetPrerequisite = wowModule.validateWowGuidedBuild(build({ level: 10, talentId: child.id, rankAdded: 1 }), wowClientData);
  assert.equal(unmetPrerequisite.valid, false);
  assert.match(unmetPrerequisite.issues.join(' '), new RegExp(child.prerequisite));
  const excessRank = wowModule.validateWowGuidedBuild(build({ level: 10, talentId: cappedTalent.id, rankAdded: cappedTalent.maxRank + 1 }), wowClientData);
  assert.equal(excessRank.valid, false);
  assert.match(excessRank.issues.join(' '), /invalid rank change/);
});

test('leveling companion accepts reusable class-specific data and renders accessible controls', () => {
  const companionModule = h.modules.get(resolve(root, 'dist/js/wow-leveling-companion.js')).namespace;
  const paladin = wowPack.classes.find(item => item.id === 'paladin');
  const guideData = { classRecord: paladin, guides: { retribution: paladin.starterGuide }, zones: [], dungeons: [] };
  const html = companionModule.renderLevelingCompanion({ classId: 'paladin', currentLevel: 8, selectedSpecialization: 'retribution', guideData });
  assert.ok(html.includes('data-class-id="paladin"'));
  assert.ok(html.includes('Paladin · Retribution · Level 8'));
  assert.ok(html.includes('role="tablist"'));
  assert.ok(html.includes('aria-selected="true"'));
  assert.ok(!html.includes('data-warrior-guide'));
  const gear = companionModule.getCompanionPanel({ classId: 'paladin', level: 8, specializationId: 'retribution', tab: 'gear' }, guideData);
  assert.ok(gear.sections[0].text.includes(paladin.starterGuide.gear));
});

test('Warrior guide keeps its header and opens the in-page specialization tabs directly', () => {
  const html = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/classes/warrior'));
  const header = html.match(/<header class="wow-warrior-header">[\s\S]*?<\/header>/)?.[0];
  assert.ok(header);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(header, /<h1 id="page-title" tabindex="-1">Warrior<\/h1>/);
  assert.ok(header.includes('Class Guide · Level 1–60'));
  assert.ok(header.includes('class="wow-warrior-divider"'));
  assert.ok(header.includes('class="wow-warrior-fact-chip">Damage</span>'));
  assert.ok(header.includes('class="wow-warrior-fact-chip">Tank</span>'));
  for (const specialization of ['Arms', 'Fury', 'Protection']) assert.ok(header.includes(`class="wow-warrior-fact-chip">${specialization}</span>`));
  assert.match(header, /src="assets\/images\/wow-forever\/icons\/class_warrior\.jpg"/);
  assert.ok(html.includes('href="#game/world-of-warcraft"'));
  assert.doesNotMatch(html, /class="wow-banner"|class="wow-nav"|class="wow-scene"|wow-class-hero-illustrated/);
  assert.doesNotMatch(header, /src="assets\/images\/wow-forever\/warrior\.svg"/);
  assert.match(header, /src="assets\/images\/wow-forever\/wow-forever-banner\.png"/);
  assert.match(portalStyles, /\.wow-warrior-header::after \{ z-index:2; background:linear-gradient\(90deg,#071320f7/);
  assert.match(portalStyles, /\.wow-warrior-header::before \{ z-index:1; background:radial-gradient/);
  assert.match(portalStyles, /prefers-reduced-motion:reduce\) \{ \.wow-warrior-guide \.wow-warrior-header \.wow-warrior-actions button \{ transition:none; \}/);
  assert.doesNotMatch(html, /class="wow-warrior-nav"/);
  assert.equal((html.match(/<button[^>]+data-warrior-spec-tab=/g) || []).length, 3);
  assert.match(html, /<button[^>]+role="tab"[^>]+aria-selected="true"[^>]+data-warrior-spec-tab="arms"/);
  assert.ok(html.indexOf(header) < html.indexOf('class="wow-warrior-spec-grid"'));
  assert.ok(html.indexOf('class="wow-warrior-spec-grid"') < html.indexOf('class="wow-leveling-companion"'));
  assert.match(html, /<details class="wow-warrior-leveling-details" id="warrior-leveling" tabindex="-1">/);
  assert.equal((html.match(/data-warrior-spec-tab=/g) || []).length, 3);
  assert.doesNotMatch(html, /Related Guides &amp; Tier Lists|Related Class Guides|id="warrior-changelog-title"/);
  assert.ok(html.includes('detailed levels 31–60 and level-60 coverage are coming later'));
  assert.doesNotMatch(html, /id="warrior-dungeons"|id="warrior-level-60"/);
});

test('Warrior specialization cards activate the guide and stay synchronized with the companion', () => {
  const module = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const handlers = {};
  const tabs = ['arms', 'fury', 'protection'].map((id, index) => ({
    dataset: { warriorSpecTab: id }, tabIndex: index ? -1 : 0, attributes: new Map(), focused: false,
    setAttribute(name, value) { this.attributes.set(name, value); },
    focus() { this.focused = true; }
  }));
  const navigation = { querySelectorAll: () => [] };
  const hub = { attributes: new Map(), setAttribute(name, value) { this.attributes.set(name, value); } };
  const companionSpec = {
    value: 'arms',
    ownerDocument: { defaultView: { Event: class { constructor(type, options) { this.type = type; Object.assign(this, options); } } } },
    dispatchEvent(event) { this.dispatched = event; return true; }
  };
  const guide = {
    dataset: {},
    contains: element => tabs.includes(element),
    querySelector: selector => selector === '.wow-warrior-nav' ? navigation : selector === '#warrior-specialization-guide' ? hub : selector === '[data-companion-spec]' ? companionSpec : null,
    querySelectorAll: selector => selector === '[data-warrior-spec-tab]' ? tabs : [],
    addEventListener: (type, handler) => { handlers[type] = handler; }
  };
  const targetFor = (element, selector) => ({ closest: candidate => candidate === selector ? element : null });
  module.initializeWarriorGuide({ querySelector: () => guide });
  let prevented = false;
  handlers.click({ target: targetFor(tabs[1], '[data-warrior-spec-tab]'), preventDefault() { prevented = true; } });
  assert.equal(prevented, true, 'specialization card selects the guide in place');
  assert.equal(tabs[1].attributes.get('aria-selected'), 'true');
  assert.equal(tabs[1].tabIndex, 0);
  assert.equal(companionSpec.value, 'fury');
  assert.equal(companionSpec.dispatched.type, 'change');
  assert.equal(hub.attributes.get('aria-labelledby'), 'warrior-spec-tab-fury');
  prevented = false;
  handlers.keydown({ target: targetFor(tabs[1], '[data-warrior-spec-tab]'), key: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(tabs[2].focused, true);
  assert.equal(tabs[2].attributes.get('aria-selected'), 'true');
  assert.equal(companionSpec.value, 'protection');
});

test('Warrior handbook preserves existing guide content and integrations', async () => {
  const warrior = wowPack.classes.find(item => item.id === 'warrior');
  const guide = warrior.starterGuide;
  const html = h.app.renderPage(h.app.readRoute('#game/world-of-warcraft/classes/warrior'));
  const specializationPosition = html.indexOf('class="wow-warrior-spec-grid"');
  const companionPosition = html.indexOf('class="wow-leveling-companion"');
  const handbookPosition = html.indexOf('class="wow-warrior-leveling-details"');
  assert.ok(specializationPosition < companionPosition && companionPosition < handbookPosition);
  assert.match(html, /id="warrior-specialization-guide" role="tabpanel" aria-labelledby="warrior-spec-tab-arms"/);
  assert.match(html, /<button[^>]*id="warrior-spec-tab-arms"[^>]*aria-selected="true"/);
  assert.ok(html.includes('Warrior Guide'));
  assert.ok(html.includes('Arms · Overview'));
  assert.match(html, /id="warrior-companion-level" type="range" min="1" max="60"/);
  assert.match(html, /<select id="warrior-companion-spec" data-companion-spec hidden aria-hidden="true" tabindex="-1">/);
  for (const tab of ['overview', 'talents', 'gear']) assert.ok(html.includes(`data-companion-tab="${tab}"`));
  for (const heading of ['Starting your journey as Warrior', 'Leveling roadmap', 'Strengths', 'Limitations', 'Specializations', 'Race and faction options', 'Open Forever trainer spellbook']) assert.ok(html.includes(heading), heading);
  for (const text of [...warrior.strengths, ...warrior.limitations, ...warrior.groupUtility, ...guide.combat, guide.reason, guide.resource, guide.gear, guide.classMilestones, guide.zoneAdvice]) assert.ok(html.includes(text), text);
  for (const band of guide.levelingBands) for (const text of [band.range,band.combat,band.survival,band.milestones]) assert.ok(html.includes(text), text);
  for (const spec of warrior.specializations) assert.ok(html.includes(`data-warrior-spec-tab="${spec.id}"`));
  assert.match(html, /href="#game\/world-of-warcraft\/talent-planner" data-wow-build-class="warrior" data-wow-build-spec="fury"/);
  assert.ok(html.includes('href="#game/world-of-warcraft/leveling"'));
  assert.ok(html.includes(guide.professionRecommendation.advice));
  assert.ok(wowPack.sources.some(source => source.id === guide.professionRecommendation.sourceId), 'profession recommendation retains source metadata');
  assert.ok(!html.includes(wowPack.sources.find(source => source.id === guide.professionRecommendation.sourceId).url), 'profession card omits repeated source URL');
  const icon = await readFile(resolve(root, 'dist/assets/images/wow-forever/icons/class_warrior.jpg'));
  assert.ok(icon.length > 0);
  for (const item of wowPack.classes.filter(item => item.id !== 'warrior')) {
    const other = h.app.renderPage(h.app.readRoute(`#game/world-of-warcraft/classes/${item.id}`));
    assert.doesNotMatch(other, /data-warrior-guide|wow-warrior-header|warrior-overview/);
    assert.ok(other.includes('class="wow-banner"'));
  }
});

test('Warrior section controls focus and scroll local targets without changing the route', () => {
  const module = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const sections = new Map();
  const buttons = ['overview', 'leveling', 'talents', 'combat', 'gear', 'professions'].map(name => ({ dataset: { warriorSection: `warrior-${name}` }, attributes: new Map(), setAttribute(name,value) { this.attributes.set(name,value); }, removeAttribute(name) { this.attributes.delete(name); } }));
  const listeners = [];
  const navigation = { querySelectorAll: () => buttons };
  const guide = { dataset: {}, contains: control => buttons.includes(control), querySelector: selector => selector === '.wow-warrior-nav' ? navigation : sections.get(selector.slice(1)), addEventListener: (type, listener) => listeners.push(listener) };
  const originalHash = h.context.location.hash;
  const originalMotion = h.context.matchMedia;
  const calls = [];
  for (const button of buttons) sections.set(button.dataset.warriorSection, { focus: options => calls.push(['focus', button.dataset.warriorSection, options.preventScroll]), scrollIntoView: options => calls.push(['scroll', button.dataset.warriorSection, options.behavior, options.block]) });
  try {
    module.initializeWarriorGuide({ querySelector: () => guide });
    module.initializeWarriorGuide({ querySelector: () => guide });
    assert.equal(listeners.length, 3, 'initializing the same DOM twice does not duplicate click, change, or keyboard listeners');
    h.context.matchMedia = () => ({ matches: true });
    let prevented = 0;
    listeners[0]({ target: { closest: () => buttons[1] }, preventDefault: () => { prevented += 1; } });
    assert.equal(prevented, 1);
    assert.deepEqual(calls[0], ['focus', 'warrior-leveling', true]);
    assert.deepEqual(calls[1], ['scroll', 'warrior-leveling', 'instant', 'start']);
    assert.equal(buttons[1].attributes.get('aria-current'), 'location');
    assert.ok(buttons.filter(button => button.attributes.has('aria-current')).length === 1);
    h.context.matchMedia = () => ({ matches: false });
    listeners[0]({ target: { closest: () => buttons[3] }, preventDefault() {} });
    assert.deepEqual(calls[3], ['scroll', 'warrior-combat', 'smooth', 'start']);
    assert.equal(h.context.location.hash, originalHash);
  } finally {
    h.context.matchMedia = originalMotion;
  }
});

test('Warrior class icon remains local when optional artwork metadata is unavailable', () => {
  const module = h.modules.get(resolve(root, 'dist/js/wow-forever.js')).namespace;
  const route = h.app.readRoute('#game/world-of-warcraft/classes/warrior');
  const html = module.renderWowPage(route, wowPack, String, null, {}, {}, null);
  assert.match(html, /wow-warrior-icon" aria-hidden="true"><img src="assets\/images\/wow-forever\/icons\/class_warrior\.jpg"/);
  assert.doesNotMatch(html, /wow-class-art-fallback/);
});
