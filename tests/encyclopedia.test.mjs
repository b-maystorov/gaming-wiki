import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { SourceTextModule, createContext } from 'node:vm';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '..');
const pack = JSON.parse(await readFile(resolve(root, 'dist/data/games/darkest-dungeon-1.json'), 'utf8'));

// Execute real ES modules and loading code. Only browser event registration is excluded;
// the minimal DOM supports filter/render assertions, not browser layout or interaction claims.
async function harness(failure = null) {
  const elements = new Map();
  let cards = [];
  let extraFilters = [];
  const context = createContext({ console: { error() {} }, URL,
    location: { hash: '' },
    document: {
      querySelector: () => ({ addEventListener() {} }),
      getElementById: id => elements.get(id),
      querySelectorAll: selector => selector === '[data-encyclopedia-card]' ? cards
        : selector === '[data-encyclopedia-filter]' ? extraFilters : []
    },
    fetch: async () => {
      if (failure === 'network') throw new Error('Network unavailable');
      return { ok: failure !== 'http', status: 404, json: async () => {
        if (failure === 'json') throw new SyntaxError('Invalid JSON');
        return failure === 'shape' ? {} : structuredClone(pack);
      } };
    }
  });
  const modules = new Map();
  async function load(path) {
    if (modules.has(path)) return modules.get(path);
    let source = await readFile(path, 'utf8');
    if (path.endsWith('/app.js')) {
      source = source.slice(0, source.indexOf("document.querySelector('.skip-link')"));
      source += '\nexport { renderPage, readRoute, renderEncyclopediaDetail, renderEncyclopediaCollection, filterEncyclopedia, renderSearchResults, getTrinkets };';
    }
    const module = new SourceTextModule(source, { context, identifier: path,
      initializeImportMeta: meta => { meta.url = `file://${path}`; } });
    modules.set(path, module);
    await module.link((specifier, parent) => load(resolve(dirname(parent.identifier), specifier)));
    return module;
  }
  const app = await load(resolve(root, 'dist/js/app.js'));
  await app.evaluate();
  return { app: app.namespace, modules, context,
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
