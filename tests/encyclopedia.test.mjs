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
    fetch: async url => {
      if (String(url).endsWith('-artwork.json')) return { ok: true, json: async () => structuredClone(artworkManifest) };
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
      source += '\nexport { renderPage, readRoute, renderEncyclopediaDetail, renderEncyclopediaCollection, filterEncyclopedia, renderSearchResults, getTrinkets, teamMatchesFilters };';
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

test('location details use one main artwork and refreshed collections retain visible record data', () => {
  const ruins = pack.locations.find(record => record.routeId === 'ruins');
  const locationHtml = h.app.renderEncyclopediaDetail('locations', ruins);
  assert.equal((locationHtml.match(/data-entry-art/g) || []).length, 1, 'location detail should render one artwork frame');
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
    assert.equal((html.match(/class="counter-guide-trinket"/g) || []).length, 8);
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
  assert.equal(teamCount, 6);
  for (const routeId of ['hag', 'siren', 'swine-prince']) {
    const boss = pack.bosses.find(row => row.routeId === routeId);
    assert.equal(boss.counterTeams.length, 1);
    const page = h.app.renderPage(h.app.readRoute(`#game/darkest-dungeon/bosses/${routeId}`));
    assert.ok(page.includes('View full team guide'));
  }
});
