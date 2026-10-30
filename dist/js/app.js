import { loadArtworkManifest, renderEntryArtwork, handleArtworkError } from './artwork.js';
import { matchesCollectionFilter, encyclopediaSearchText, verificationLabel } from './encyclopedia.js';
import { heroes, sources } from './heroes.js';
import { games, portalGames } from './games.js';
import { initializeCommandCenter } from './command-center.js';
import { renderHeroGallery, initializeHeroGallery } from './hero-gallery.js';
import { heroAbilities, abilityReference } from './hero-abilities.js';
import { loadStructuredGameContent } from './content-adapter.js';

let structuredGameContent = null;
try {
  structuredGameContent = await loadStructuredGameContent({ heroes, heroAbilities });
} catch (error) {
  // Keep the rest of the site navigable if its required static data file is missing.
  console.error('Could not load the Darkest Dungeon encyclopedia:', error);
  const crusader = heroes.find(hero => hero.id === 'crusader');
  if (crusader) Object.assign(crusader, {
    roleTags: ['Content unavailable'], requirements: { baseGame: true, dlc: [], mods: [] },
    galleryArt: { src: '', alt: 'Crusader portrait unavailable', monogram: 'CR', credit: '', permission: 'unavailable' },
    summary: 'Crusader guide data could not be loaded.', contentUnavailable: true
  });
  heroAbilities.crusader = { skills: [], loadError: true };
}

await loadArtworkManifest();

const main = document.querySelector('main');
main.addEventListener('error', handleArtworkError, true);
// `builds` remains the route alias for the long-form strategy section.
const sections = ['overview', 'teams', 'bosses', 'trinkets', 'attributes', 'abilities', 'progression', 'builds'];
let currentView = '';
let selectedPortalGame = 0;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function requirementLabel(requirements) {
  const labels = [];
  if (requirements.baseGame) labels.push('Base game');
  labels.push(...requirements.dlc.map(name => {
    const record = structuredGameContent?.dlcs.find(dlc => dlc.id === name);
    return `DLC: ${record?.name || name}`;
  }));
  labels.push(...requirements.mods.map(name => `Mod: ${name}`));
  return labels.map(escapeHtml).join(' · ');
}

function renderImage(image, className = '', fallbackMarkup = '') {
  const animationClass = image.animated ? ' animated-image' : '';
  const reducedMotionAlternative = image.animated
    ? `<span class="motion-alternative" role="img" aria-label="${escapeHtml(image.reducedMotionLabel)}">Animation paused for reduced motion</span>`
    : '';
  const artworkClass = image.animated ? ' animated-artwork' : '';
  const dimensions = image.width && image.height ? `width="${image.width}" height="${image.height}"` : '';
  return `<figure class="artwork ${className}${artworkClass}">
    <img class="image-content${animationClass}" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" ${dimensions}>
    ${reducedMotionAlternative}${fallbackMarkup}
    ${image.placeholder ? '<figcaption>Placeholder · Not game art</figcaption>' : ''}
  </figure>`;
}

function renderHeroPortrait(hero) {
  const portrait = hero.portrait || (hero.galleryArt?.src ? hero.galleryArt : null);
  const fallback = portrait
    ? renderImage(portrait, 'guide-portrait', `<span class="portrait-unavailable" data-portrait-fallback hidden role="img" aria-label="${escapeHtml(hero.name)} portrait unavailable"><span aria-hidden="true">${escapeHtml(hero.galleryArt?.monogram || hero.name.slice(0, 2).toUpperCase())}</span><small>Portrait unavailable</small></span>`)
    : `<div class="ability-hero-mark" role="img" aria-label="${escapeHtml(hero.name)} portrait unavailable">${escapeHtml(hero.galleryArt?.monogram || hero.name.slice(0, 2).toUpperCase())}</div>`;
  return renderEntryArtwork('heroes', hero, 'banner') + renderEntryArtwork('heroes', hero, 'primary', fallback);
}

function renderHeroGuideNavigation(hero) {
  const labels = { overview: 'Overview', teams: 'Teams', bosses: 'Bosses', trinkets: 'Trinkets', attributes: 'Mechanics', abilities: 'Abilities', progression: 'Progression', builds: 'Builds & strategy' };
  const sectionNumbers = { overview: '02', teams: '03', bosses: '04', trinkets: '05', attributes: '06', abilities: '07', progression: '08', builds: '09' };
  return `<nav class="guide-nav" aria-label="${escapeHtml(hero.name)} guide sections">${sections.map(section => `<a href="#hero/${escapeHtml(hero.id)}/${section}" data-section="${section}"><span aria-hidden="true">${sectionNumbers[section]}</span>${labels[section]}</a>`).join('')}</nav>`;
}

function renderPositions(hero) {
  return `<div class="position-scale" aria-label="Party positions, rear to front">
    <span class="position-direction">Rear</span>
    <ol class="positions">${[4, 3, 2, 1].map(position => {
      const preferred = hero.preferredPositions.includes(position);
      const alternative = hero.alternativePositions.includes(position);
      const label = preferred ? 'Preferred' : alternative ? 'Alternative' : 'Not recommended';
      return `<li class="${preferred ? 'preferred' : ''}"><strong>${position}</strong><span>${label}</span></li>`;
    }).join('')}</ol><span class="position-direction">Front →</span>
  </div>`;
}

function renderList(items, ordered = false) {
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag}>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;
}

function renderHome() {
  return `<div class="portal">
    <section class="portal-hero" aria-labelledby="page-title">
      <div class="portal-compass" aria-hidden="true"><span>✦</span></div>
      <div class="portal-hero-copy">
        <div class="portal-identity"><img src="assets/images/bm-mark.svg" width="112" height="112" alt=""><div><p class="portal-brand-name">BM Gaming Wiki</p><p class="portal-kicker">Your adventure, understood</p></div></div>
        <h1 id="page-title" tabindex="-1">Every game has a story.<br> <em>Master yours.</em></h1>
        <p class="portal-intro">Find your way with game guides, hero builds, team compositions, equipment, and strategy help. Start with Darkest Dungeon. More worlds await.</p>
        <button class="portal-explore" type="button" data-explore-games>Explore Games <span aria-hidden="true">↓</span></button>
      </div>
      <div class="portal-hero-foot"><span>A personal field guide for the journey</span><span aria-hidden="true">01 — Choose your world</span></div>
    </section>
    <section class="portal-library" aria-labelledby="games-heading">
      <div class="portal-library-heading"><div><p class="portal-kicker">The game library</p><h2 id="games-heading" tabindex="-1">Choose your world.</h2></div><p>Four universes. Choose your next adventure.</p></div>
      <div class="portal-selectors" role="group" aria-label="Preview a game">${portalGames.map((game, index) => `
        <button type="button" class="portal-selector" data-preview-game="${index}" data-portal-theme="${game.theme}" aria-pressed="${index === selectedPortalGame}" aria-controls="game-showcase">
          <span class="portal-selector-number" aria-hidden="true">0${index + 1}</span><strong>${escapeHtml(game.name)}</strong><small>${game.available ? 'Guides available' : 'Wiki in development'}</small>
        </button>`).join('')}</div>
      <div id="game-showcase" class="portal-showcase" data-active-game="${selectedPortalGame}">${renderPortalShowcase(portalGames[selectedPortalGame])}</div>
      <p class="portal-preview-status visually-hidden" role="status" aria-live="polite" aria-atomic="true"></p>
      <p class="portal-art-note">Original abstract scenery · No official game artwork</p>
    </section>
  </div>`;
}

function renderPortalShowcase(game) {
  return `<article class="portal-scene" data-portal-theme="${escapeHtml(game.theme)}" aria-labelledby="showcase-title">
    ${renderPortalScenery(game)}
    <div class="portal-panel-top"><span>World preview</span><span class="portal-status">${game.available ? 'Guides available' : 'Wiki in development'}</span></div>
    <div class="portal-panel-copy"><p class="portal-kicker">${escapeHtml(game.label)}</p><h3 id="showcase-title">${escapeHtml(game.name)}</h3>
      <p class="portal-description">${escapeHtml(game.description)}</p>
      <a class="portal-panel-action" href="${escapeHtml(game.href)}">${escapeHtml(game.action)} <span aria-hidden="true">↗</span></a>
    </div>
  </article>`;
}

function renderPortalScenery(game) {
  return `<div class="portal-environment" data-scenery="${escapeHtml(game.motif)}" aria-hidden="true"><div class="scene-distance"></div><div class="portal-scenery ${escapeHtml(game.motif)}"><span></span></div><div class="scene-ground"></div></div>`;
}

function renderGamePreview(game) {
  return `<div class="portal"><section class="portal-preview" data-portal-theme="${escapeHtml(game.theme)}">
    <a class="portal-return" href="#home/games">← All game universes</a>
    <div class="portal-scene portal-preview-scene">
      ${renderPortalScenery(game)}
      <div class="portal-panel-top"><span>BM Gaming Wiki / World preview</span><span class="portal-status">Wiki in development</span></div>
      <div class="portal-panel-copy"><p class="portal-kicker">${escapeHtml(game.label)}</p>
        <h1 id="page-title" tabindex="-1">${escapeHtml(game.name)}</h1>
        <p class="portal-description">${escapeHtml(game.description)}</p>
        <p class="portal-development-note">This wiki is in development. Guides and gameplay content are not available yet.</p>
      </div>
    </div>
    <section class="portal-roadmap" aria-labelledby="upcoming-heading"><p class="portal-kicker">On the horizon</p><h2 id="upcoming-heading">The future field guide</h2>
      <p>Planned categories, ready to grow as the wiki develops.</p>
      <div class="portal-category-grid">${game.categories.map((category, index) => `<article class="portal-category"><span aria-hidden="true">0${index + 1}</span><h3>${escapeHtml(category)}</h3><p>Planned · No guides yet</p></article>`).join('')}</div>
    </section>
  </section></div>`;
}

function selectPortalGame(button) {
  const showcase = document.getElementById('game-showcase');
  const index = Number(button.dataset.previewGame);
  if (!showcase || !portalGames[index] || showcase.dataset.activeGame === String(index)) return;
  // Keep the selectors mounted so keyboard focus survives each preview change.
  selectedPortalGame = index;
  showcase.innerHTML = renderPortalShowcase(portalGames[index]);
  showcase.dataset.activeGame = String(index);
  document.querySelectorAll('[data-preview-game]').forEach(selector => {
    selector.setAttribute('aria-pressed', String(selector === button));
  });
  document.querySelector('.portal-preview-status').textContent = `${portalGames[index].name}: ${portalGames[index].available ? 'guides available' : 'wiki in development; preview available'}.`;
}

function renderGameLanding() {
  const game = games['darkest-dungeon'];
  const guideCount = heroes.filter(hero => hero.guide).length;
  const teams = getTeams();
  const categoryCards = game.categories.filter(category => category.id !== 'overview')
    .map(category => category.comingSoon
      ? `<article class="navigation-card coming-soon"><span class="status-label">Coming soon</span><h3>${escapeHtml(category.label)}</h3><p>Entries are not available yet.</p></article>`
      : `<a class="navigation-card" href="#game/darkest-dungeon/${category.view}"><span class="status-label">Available</span><h3>${escapeHtml(category.label)}</h3><p>${escapeHtml(category.description)}</p><span class="card-action">Browse ${escapeHtml(category.label)} <span aria-hidden="true">→</span></span></a>`).join('');
  return `<section class="game-welcome" aria-labelledby="page-title"><div><p class="eyebrow">Original game / Campaign</p>
    <h1 id="page-title" tabindex="-1">Darkest Dungeon</h1><p class="lede">Campaign guides, party plans, and equipment notes. Current entries cover the base game.</p></div>
    <span class="welcome-mark" aria-hidden="true">DD I</span></section>
    <section class="game-search" aria-labelledby="search-title"><label for="game-search-input" id="search-title">Search this guide</label>
      <input id="game-search-input" type="search" autocomplete="off" placeholder="Hero, build, composition, or trinket">
      <p id="game-search-status" class="search-status" aria-live="polite">Search current guides, teams, builds, and trinkets.</p><div id="game-search-results" class="search-results"></div></section>
    <section aria-labelledby="begin-heading"><div class="section-heading"><h2 id="begin-heading">Where to begin</h2><span>Browse available guides or see what is planned</span></div>
      <div class="landing-grid">${categoryCards}</div></section>
    <section aria-labelledby="featured-teams-heading"><div class="section-heading"><h2 id="featured-teams-heading">Featured Team Compositions</h2><a href="#game/darkest-dungeon/teams">All compositions →</a></div>
      <p class="section-intro">${teams.length} editorial example parties · no tier rating or dungeon suitability has been assigned.</p>
      <div class="team-list">${teams.map(renderTeamCard).join('')}</div></section>
    <section aria-labelledby="featured-heroes-heading"><div class="section-heading"><h2 id="featured-heroes-heading">Hero Guides</h2><a href="#game/darkest-dungeon/heroes">All heroes →</a></div>
      <div class="featured-hero-list">${heroes.filter(hero => hero.guide).map(hero => `<a class="featured-hero panel" href="#hero/${escapeHtml(hero.id)}/overview">${renderTeamPortrait(hero.name)}<span><strong>${escapeHtml(hero.name)}</strong><small>${escapeHtml(hero.role)}</small></span><span class="card-action">Read guide →</span></a>`).join('')}</div></section>`;
}

function getTeams() {
  return heroes.flatMap(hero => hero.guide ? hero.guide.teams.map(team => ({ ...team, hero })) : []);
}

function getBossCounterTeams() {
  return (structuredGameContent?.bosses || []).flatMap(boss => (boss.counterTeams || []).map(team => ({ ...team, boss })));
}

const teamCategoryLabels = { beginner: 'Beginner', balanced: 'Balanced', offensive: 'Offensive', specialized: 'Specialized', unassessed: 'Unassessed' };

function teamMatchesFilters(team, filters = {}) {
  const matches = (key, value) => !value || value === 'all' || team[key] === value;
  return matches('teamRegion', filters.region)
    && matches('teamBoss', filters.boss)
    && matches('teamCategory', filters.category);
}

function renderTeamCompositionGroups() {
  const generalTeams = getTeams();
  const bossTeams = getBossCounterTeams();
  const regionsByName = new Map((structuredGameContent?.regions || []).map(region => [region.name.toLowerCase(), region]));
  const preferredRegionNames = ['Ruins', 'Warrens', 'Weald', 'Cove', 'Darkest Dungeon', 'Courtyard', 'Farmstead'];
  const regionTeams = new Map();
  const otherTeams = [];
  for (const team of bossTeams) {
    const regionId = team.boss.regionIds?.[0];
    const roamingEncounter = (team.boss.categoryIds || []).some(id => /:(wandering|events)$/.test(id));
    if (!roamingEncounter && regionId && structuredGameContent.regions.some(region => region.id === regionId)) {
      if (!regionTeams.has(regionId)) regionTeams.set(regionId, []);
      regionTeams.get(regionId).push(team);
    } else otherTeams.push(team);
  }
  const orderedRegions = preferredRegionNames.map(name => regionsByName.get(name.toLowerCase())).filter(region => region && regionTeams.has(region.id));
  const knownIds = new Set(orderedRegions.map(region => region.id));
  const additionalRegions = [...regionTeams.keys()].filter(id => !knownIds.has(id))
    .map(id => structuredGameContent.regions.find(region => region.id === id)).filter(Boolean);
  const groupForRegion = (region, teams) => {
    const bossGroups = structuredGameContent.bosses.filter(boss => teams.some(team => team.boss.id === boss.id)).map(boss => {
      const entries = teams.filter(team => team.boss.id === boss.id);
      return `<section class="team-boss-group" data-team-boss-group="${escapeHtml(boss.id)}"><div class="team-boss-heading"><h3><a href="#game/darkest-dungeon/bosses/${escapeHtml(boss.routeId)}">${escapeHtml(boss.name)}</a></h3><span>${escapeHtml(boss.regionLabel)}</span></div><div class="team-card-grid">${entries.map(renderBossCounterPreview).join('')}</div></section>`;
    }).join('');
    return `<section class="team-region-group" data-team-region-group="${escapeHtml(region.id)}"><div class="team-region-heading"><div><p class="eyebrow">${escapeHtml(requirementLabel(region.requirements))}</p><h2>${escapeHtml(region.name)}</h2></div><span>${teams.length} ${teams.length === 1 ? 'team' : 'teams'}</span></div>${bossGroups}</section>`;
  };
  const groups = [];
  if (generalTeams.length) groups.push(`<section class="team-region-group team-unassessed-group" data-team-region-group="unassessed"><div class="team-region-heading"><div><p class="eyebrow">No regional assignment recorded</p><h2>General-purpose / Unassessed</h2></div><span>${generalTeams.length} ${generalTeams.length === 1 ? 'team' : 'teams'}</span></div><p class="team-group-note">These formations come from hero guides and have no verified boss or region association.</p><div class="team-card-grid">${generalTeams.map(renderTeamCard).join('')}</div></section>`);
  for (const region of [...orderedRegions, ...additionalRegions]) groups.push(groupForRegion(region, regionTeams.get(region.id)));
  if (otherTeams.length) groups.push(groupForRegion({ id: 'other', name: 'Other / roaming encounters', requirements: { baseGame: false, dlc: [], mods: [] } }, otherTeams));

  const regionOptions = [
    ...(generalTeams.length ? [['unassessed', 'General-purpose / Unassessed']] : []),
    ...[...orderedRegions, ...additionalRegions].map(region => [region.id, region.name]),
    ...(otherTeams.length ? [['other', 'Other / roaming encounters']] : [])
  ];
  const bossOptions = [...new Map(bossTeams.map(team => [team.boss.id, [team.boss.id, team.boss.name]])).values()];
  const categories = [...new Set([...generalTeams.map(() => 'unassessed'), ...bossTeams.map(team => team.category)])];
  const categoryOptions = ['beginner', 'balanced', 'offensive', 'specialized', 'unassessed'].filter(category => categories.includes(category))
    .map(category => [category, teamCategoryLabels[category] || category]);
  return { markup: groups.join(''), count: generalTeams.length + bossTeams.length, regionOptions, bossOptions, categoryOptions };
}

function filterTeamCompositions() {
  const query = document.getElementById('team-search-input')?.value.trim().toLowerCase() || '';
  const filters = {
    region: document.getElementById('team-region-filter')?.value || 'all',
    boss: document.getElementById('team-boss-filter')?.value || 'all',
    category: document.getElementById('team-category-filter')?.value || 'all'
  };
  const cards = [...document.querySelectorAll('[data-composition-card]')];
  let visibleCount = 0;
  for (const card of cards) {
    const matches = card.dataset.searchText.includes(query) && teamMatchesFilters(card.dataset, filters);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  }
  document.querySelectorAll('[data-team-boss-group]').forEach(group => {
    group.hidden = group.querySelectorAll('[data-composition-card]:not([hidden])').length === 0;
  });
  document.querySelectorAll('[data-team-region-group]').forEach(group => {
    group.hidden = group.querySelectorAll('[data-composition-card]:not([hidden])').length === 0;
  });
  const status = document.getElementById('team-search-status');
  if (status) status.textContent = query || Object.values(filters).some(value => value !== 'all')
    ? `${visibleCount} matching ${visibleCount === 1 ? 'composition' : 'compositions'}.`
    : `${visibleCount} compositions available.`;
  const empty = document.getElementById('team-empty-state');
  if (empty) empty.hidden = visibleCount > 0;
}

function findBossCounterTeam(id) {
  return getBossCounterTeams().find(team => team.id === id);
}

function getTrinkets() {
  return heroes.flatMap(hero => hero.guide ? hero.guide.trinkets.map(trinket => {
    const record = structuredGameContent?.trinkets.find(item => item.routeId === trinket.routeId);
    return record ? { ...trinket, ...record, hero, advice: trinket.advice, alternative: trinket.alternative, use: trinket.use,
      effects: record.effects.filter(effect => effect.polarity === 'positive').map(effect => effect.text),
      drawbacks: record.effects.filter(effect => effect.polarity === 'negative').map(effect => effect.text),
      requirements: record.requirements,
      image: record.assetPath ? { src: record.assetPath, alt: `${record.name} local icon; reuse terms unverified`, width: 36, height: 72 } : null,
      source: record.verification.sourceIds[0] } : { ...trinket, hero, contentUnavailable: true };
  }) : []);
}

function collectionRecords(kind) {
  return structuredGameContent?.[kind] || [];
}

function encyclopediaHref(kind, record) {
  return `#game/darkest-dungeon/${kind}/${record.routeId}`;
}

function renderEncyclopediaCard(kind, record, meta, summary, extraMarkup = '') {
  const label = Array.isArray(meta) ? meta.join(' · ') : meta;
  const title = record.name;
  const cardData = `data-encyclopedia-card data-route-id="${escapeHtml(record.routeId)}" data-search-text="${escapeHtml(`${title} ${label} ${summary} ${encyclopediaSearchText(kind, record, structuredGameContent, heroes)}`.toLowerCase())}" data-region-ids="${escapeHtml((record.regionIds || []).join(' '))}"`;
  const href = escapeHtml(encyclopediaHref(kind, record));
  if (kind === 'trinkets') return `<article class="encyclopedia-card encyclopedia-card-trinkets" ${cardData}>
    <a class="encyclopedia-card-art-link" href="${href}" tabindex="-1" aria-hidden="true">${renderEntryArtwork(kind, record, 'thumbnail')}</a><a class="encyclopedia-card-copy" href="${href}"><small>${escapeHtml(label)}</small><strong>${escapeHtml(title)}</strong><span>${escapeHtml(summary)}</span><em>Open entry →</em></a>${extraMarkup}</article>`;
  return `<a class="encyclopedia-card encyclopedia-card-${kind}" ${cardData} href="${href}">
    ${renderEntryArtwork(kind, record, 'thumbnail')}<span class="encyclopedia-card-copy"><small>${escapeHtml(label)}</small><strong>${escapeHtml(title)}</strong><span>${escapeHtml(summary)}</span>${extraMarkup}<em>Open entry →</em></span></a>`;
}

const collectionConfig = {
  enemies: { title: 'Enemies', intro: 'A field index of regular campaign enemies, organized by encounter region. Boss records remain in the separate Bosses encyclopedia.', search: 'Enemy, region, type, mechanic', filter: 'Region' },
  trinkets: { title: 'Trinkets', intro: 'Equipment records consolidate documented effects; hero-specific advice remains editorial and is shown with the existing guides.', search: 'Trinket, rarity, class, effect', filter: 'Rarity' },
  items: { title: 'Items & Provisions', intro: 'Expedition supplies and inventory items are separate from equippable trinkets. Costs are left out where not included in the checked record.', search: 'Item, effect, curio', filter: 'Category' },
  curios: { title: 'Curios', intro: 'Interaction outcomes describe what may happen after choosing an interaction. Curio appearance probabilities are not implied.', search: 'Curio, region, provision, outcome', filter: 'Region' },
  locations: { title: 'Locations', intro: 'Regional guides connect the current enemy, boss, and curio indexes. Their roster links are generated from stable record IDs.', search: 'Region, enemy, boss, curio', filter: 'Region' },
  quests: { title: 'Quests', intro: 'Selected expedition formats and named special questlines. This is not an exhaustive listing of procedurally generated missions.', search: 'Quest, duration, mechanic', filter: 'Category' }
};

function filterEncyclopedia() {
  const query = document.getElementById('encyclopedia-search')?.value.trim().toLowerCase() || '';
  const filter = document.getElementById('encyclopedia-filter')?.value || 'all';
  const extraFilters = [...document.querySelectorAll('[data-encyclopedia-filter]')].map(select => [select.dataset.encyclopediaFilter, select.value]);
  const cards = [...document.querySelectorAll('[data-encyclopedia-card]')];
  const kind = location.hash.replace(/^#game\/darkest-dungeon\//, '').split('/')[0];
  let visible = 0;
  for (const card of cards) {
    const record = collectionRecords(kind).find(entry => entry.routeId === card.dataset.routeId || card.href?.endsWith(`/${entry.routeId}`));
    const matchText = card.dataset.searchText.includes(query);
    let matchFilter = matchesCollectionFilter(kind, record, filter);
    if (record) for (const [field, value] of extraFilters) {
      if (value === 'all') continue;
      if (field === 'provision') matchFilter = matchFilter && record.interactions?.some(interaction => interaction.itemId === value);
      if (field === 'class') matchFilter = matchFilter && (record.classRestrictionHeroRouteIds || []).includes(value);
      if (field === 'dlc') matchFilter = matchFilter && (record.requirements?.dlc || []).includes(value);
      if (field === 'region') matchFilter = matchFilter && (record.regionIds || []).includes(value);
      if (field === 'effect') matchFilter = matchFilter && record.effects?.some(effect => effect.polarity === value || (value === 'conditional' && effect.condition));
    }
    card.hidden = !(matchText && matchFilter);
    if (!card.hidden) visible += 1;
  }
  const status = document.getElementById('encyclopedia-status');
  if (status) status.textContent = `${visible} matching ${visible === 1 ? 'entry' : 'entries'}.`;
  const empty = document.getElementById('encyclopedia-empty');
  if (empty) empty.hidden = visible > 0;
  document.querySelectorAll('[data-encyclopedia-group]').forEach(group => {
    group.hidden = group.querySelectorAll('[data-encyclopedia-card]:not([hidden])').length === 0;
  });
}

function renderEncyclopediaCollection(kind) {
  const config = collectionConfig[kind];
  if (!structuredGameContent) return `<section class="page-intro"><h1 id="page-title" tabindex="-1">${config.title}</h1><p class="lede">Content could not be loaded.</p></section>`;
  const records = collectionRecords(kind);
  const isRegionFilter = ['enemies', 'curios', 'locations'].includes(kind);
  const filterValues = isRegionFilter
    ? structuredGameContent.regions.map(region => [region.id, region.name])
    : [...new Set(records.map(record => kind === 'trinkets' ? record.rarity : kind === 'items' ? record.category : record.category))].map(value => [value, value]);
  const trinketSourceLabel = record => {
    const sourceNames = (record.verification?.sourceIds || []).map(id => structuredGameContent.sources.find(source => source.id === id)?.title).filter(Boolean);
    return sourceNames.length ? `Sources: ${sourceNames.join(', ')}` : 'Source details not recorded';
  };
  const trinketSummary = record => `${record.effects?.length ? record.effects.map(effect => effect.text).join(' · ') : 'Effects are not recorded.'} · ${verificationLabel('trinkets', record)}`;
  const renderTrinketCard = record => renderEncyclopediaCard('trinkets', record, [record.rarity, requirementLabel(record.requirements), (record.classRestrictionHeroRouteIds || []).map(id=>heroes.find(hero=>hero.id===id)?.name || id).join(', '), (record.regionIds || []).map(id=>structuredGameContent.regions.find(region=>region.id===id)?.name).filter(Boolean).join(', '), trinketSourceLabel(record)], trinketSummary(record), renderTrinketOwnershipControl(record, 'trinket-card-owned'));
  const cards = records.map(record => {
    if (kind === 'enemies') return renderEncyclopediaCard(kind, record, [record.regionIds.map(id => structuredGameContent.regions.find(region => region.id === id)?.name).filter(Boolean).join(' / '), record.enemyType, record.encounterClass, requirementLabel(record.requirements)], record.summary);
    if (kind === 'trinkets') {
      return renderTrinketCard(record);
    }
    if (kind === 'items') return renderEncyclopediaCard(kind, record, [record.category, requirementLabel(record.requirements), verificationLabel(kind, record)], record.purpose || 'Usage information is not recorded.');
    if (kind === 'curios') {
      const visibleInteractions = record.interactions.slice(0, 2);
      const interactionRows = visibleInteractions.map(interaction => {
        const item = interaction.itemId && structuredGameContent.items.find(entry => entry.id === interaction.itemId);
        return `<span><strong>${escapeHtml(item?.name || 'Unassisted')}</strong><span>${escapeHtml(interaction.outcome)}</span></span>`;
      }).join('');
      return renderEncyclopediaCard(kind, record, [...record.regionIds.map(id => structuredGameContent.regions.find(region => region.id === id)?.name).filter(Boolean), requirementLabel(record.requirements), verificationLabel(kind, record)], record.whereFound || 'Where found is not recorded.', `<span class="curio-card-outcomes" aria-label="Example interaction outcomes">${interactionRows || '<span><strong>Interactions</strong><span>Not recorded</span></span>'}</span>`);
    }
    if (kind === 'locations') return renderEncyclopediaCard(kind, record, requirementLabel(record.requirements), record.summary);
    return renderEncyclopediaCard(kind, record, record.category, record.summary);
  }).join('');
  const moreFilters = kind === 'trinkets' ? `<div><label for="filter-class">Class restriction</label><select id="filter-class" data-encyclopedia-filter="class"><option value="all">All restrictions</option><option value="highwayman">Highwayman</option><option value="crusader">Crusader</option></select></div><div><label for="filter-dlc">Requirement</label><select id="filter-dlc" data-encyclopedia-filter="dlc"><option value="all">Any requirement</option>${structuredGameContent.dlcs.map(dlc=>`<option value="${escapeHtml(dlc.id)}">${escapeHtml(dlc.name)}</option>`).join('')}</select></div><div><label for="filter-effect">Effect</label><select id="filter-effect" data-encyclopedia-filter="effect"><option value="all">Any effect</option><option value="positive">Benefits</option><option value="negative">Drawbacks</option><option value="conditional">Conditional effects</option></select></div><div><label for="filter-origin">Region / origin</label><select id="filter-origin" data-encyclopedia-filter="region"><option value="all">Any origin</option>${structuredGameContent.regions.map(region=>`<option value="${escapeHtml(region.id)}">${escapeHtml(region.name)}</option>`).join('')}</select></div>` : kind === 'curios' ? `<div><label for="filter-provision">Provision</label><select id="filter-provision" data-encyclopedia-filter="provision"><option value="all">Any provision</option>${structuredGameContent.items.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('')}</select></div>` : '';
  const groupedCards = kind === 'enemies' ? [
    ['Shared and wandering enemies', records.filter(record => record.regionIds.length > 1)],
    ...structuredGameContent.regions.map(region => [region.name, records.filter(record => record.regionIds.length === 1 && record.regionIds[0] === region.id)])
  ].filter(([, entries]) => entries.length).map(([name, entries]) => `<section class="encyclopedia-group" data-encyclopedia-group><div class="section-heading"><h2>${escapeHtml(name)}</h2><span>${entries.length} entries</span></div><div class="encyclopedia-grid encyclopedia-grid-enemies">${entries.map(record => renderEncyclopediaCard(kind, record, [record.regionIds.map(id => structuredGameContent.regions.find(region => region.id === id)?.name).filter(Boolean).join(' / '), record.enemyType, record.encounterClass, requirementLabel(record.requirements)], record.summary)).join('')}</div></section>`).join('') : kind === 'trinkets'
    ? ['Common', 'Uncommon', 'Rare', 'Very rare', 'Ancestral', 'Trophy', 'Crimson Court'].map(rarity => [rarity, records.filter(record => record.rarity === rarity)]).filter(([, entries]) => entries.length).map(([rarity, entries]) => `<section class="encyclopedia-group trinket-rarity-group" data-encyclopedia-group data-trinket-rarity="${escapeHtml(rarity)}"><div class="section-heading"><h2>${escapeHtml(rarity)}</h2><span>${entries.length} ${entries.length === 1 ? 'trinket' : 'trinkets'}</span></div><div class="encyclopedia-grid encyclopedia-grid-trinkets">${entries.map(renderTrinketCard).join('')}</div></section>`).join('')
    : `<div class="encyclopedia-grid encyclopedia-grid-${kind}">${cards}</div>`;
  const ownershipTools = kind === 'trinkets' ? `<div class="trinket-collection-tools"><button type="button" class="clear-owned-trinkets" data-clear-owned-trinkets>Clear owned list</button><p data-ownership-storage-status role="status" aria-live="polite">Ownership is stored only in this browser. Copies are not counted.</p></div>` : '';
  return `<section class="page-intro" aria-labelledby="page-title"><p class="eyebrow">Darkest Dungeon / Field encyclopedia</p><h1 id="page-title" tabindex="-1">${config.title}</h1><p class="lede">${config.intro}</p>${kind === 'enemies' ? '<p class="guide-data-note">Minibosses and bosses are listed separately in the <a href="#game/darkest-dungeon/bosses">Bosses encyclopedia</a>.</p>' : ''}</section>
    <section class="encyclopedia-controls" aria-label="Filter ${config.title}"><div><label for="encyclopedia-search">Search ${config.title.toLowerCase()}</label><input id="encyclopedia-search" type="search" placeholder="${config.search}" autocomplete="off"></div><div><label for="encyclopedia-filter">Filter by ${config.filter.toLowerCase()}</label><select id="encyclopedia-filter"><option value="all">All ${config.filter.toLowerCase()}s</option>${filterValues.map(([value,label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}</select></div>${moreFilters}<p id="encyclopedia-status" role="status" aria-live="polite">${records.length} ${config.title.toLowerCase()} entries.</p></section>${ownershipTools}
    ${groupedCards}<p id="encyclopedia-empty" class="panel" hidden>No entries match these filters. Try another search.</p>`;
}

function renderEncyclopediaDetail(kind, record) {
  const back = `#game/darkest-dungeon/${kind}`;
  const regionName = id => structuredGameContent.regions.find(region => region.id === id)?.name || 'Unknown region';
  let sections = '';
  if (kind === 'enemies') {
    sections = `<section class="encyclopedia-section"><h2>Known mechanics</h2>${record.mechanics?.length ? `<ul>${record.mechanics.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : '<p>Mechanics have not been recorded.</p>'}</section><section class="encyclopedia-section"><h2>Selected attacks and effects</h2>${record.attacks?.length ? `<ul>${record.attacks.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : '<p>Attack names and target details have not been recorded for this entry.</p>'}${record.statusEffects?.length ? `<p><strong>Relevant effects:</strong> ${escapeHtml(record.statusEffects.join(', '))}</p>` : ''}<p>Numeric variant statistics and resistance values are not included in this entry.</p></section>`;
  } else if (kind === 'trinkets') {
    const set = structuredGameContent.trinketSets.find(entry => entry.id === record.setId);
    const associatedBoss = record.bossId && structuredGameContent.bosses.find(boss => boss.id === record.bossId);
    sections = `<section class="encyclopedia-section trinket-collection-detail"><h2>My collection</h2>${renderTrinketOwnershipControl(record, 'trinket-detail-owned')}<p data-ownership-storage-status role="status" aria-live="polite">Ownership is stored only in this browser. Copies are not counted.</p></section><section class="encyclopedia-section"><h2>Effects</h2><ul>${record.effects.map(effect => `<li><strong>${effect.polarity === 'negative' ? 'Drawback' : 'Benefit'}:</strong> ${escapeHtml(effect.text)}${effect.condition ? ` <small>(${escapeHtml(effect.condition)})</small>` : ''}</li>`).join('')}</ul></section><section class="encyclopedia-section"><h2>Availability</h2><p>${escapeHtml(requirementLabel(record.requirements))} · ${escapeHtml(record.rarity)}. ${escapeHtml(record.acquisition?.text || 'Acquisition details are not yet recorded.')}</p>${associatedBoss ? `<p>Associated encounter: <a href="#game/darkest-dungeon/bosses/${escapeHtml(associatedBoss.routeId)}">${escapeHtml(associatedBoss.name)}</a>.</p>` : ''}${set ? `<p><strong>${escapeHtml(set.name)} set bonus:</strong> ${escapeHtml(set.bonus.join('; '))} when both class set trinkets are equipped.</p>` : ''}</section>`;
  } else if (kind === 'items') {
    sections = `<section class="encyclopedia-section"><h2>Purpose & limitations</h2><p>${escapeHtml(record.purpose)}</p><p>${escapeHtml(record.usage)}</p><p>${escapeHtml(record.limitations)}</p>${record.effects?.length ? `<ul>${record.effects.map(effect=>`<li>${escapeHtml(effect.text)}</li>`).join('')}</ul>` : ''}<p><strong>Acquisition:</strong> ${escapeHtml(record.acquisition.text)}${record.acquisition.cost !== null ? ` Cost ${record.acquisition.cost} gold · stack ${record.acquisition.stackSize}.` : record.acquisition.stackSize ? ` Stack ${record.acquisition.stackSize}.` : ''}</p></section><section class="encyclopedia-section"><h2>Related curios</h2>${record.relatedCurioIds?.length ? `<ul>${record.relatedCurioIds.map(id=>{const c=structuredGameContent.curios.find(x=>x.id===id);return c?`<li><a href="${encyclopediaHref('curios',c)}">${escapeHtml(c.name)}</a></li>`:''}).join('')}</ul>`:'<p>No curio interactions are recorded for this item.</p>'}</section>`;
  } else if (kind === 'curios') {
    sections = `<section class="encyclopedia-section"><h2>Documented interactions</h2><div class="table-scroll"><table><thead><tr><th>Item</th><th>Possible result</th><th>Outcome chance</th><th>Certainty</th></tr></thead><tbody>${record.interactions.map(entry=>{const item=entry.itemId&&structuredGameContent.items.find(x=>x.id===entry.itemId);return `<tr><td>${item?`<a href="${encyclopediaHref('items',item)}">${escapeHtml(item.name)}</a>`:'Bare hands / unspecified'}</td><td>${escapeHtml(entry.outcome)}</td><td>${escapeHtml(entry.chance||'Not recorded')}</td><td>${escapeHtml(entry.certainty)}</td></tr>`}).join('')}</tbody></table></div><p>${escapeHtml(record.warning)}</p></section>`;
  } else if (kind === 'locations') {
    const enemyLinks=record.enemyIds.map(id=>structuredGameContent.enemies.find(e=>e.id===id)).filter(Boolean);
    const bossLinks=record.bossIds.map(id=>structuredGameContent.bosses.find(b=>b.id===id)).filter(Boolean);
    const curioLinks=record.curioIds.map(id=>structuredGameContent.curios.find(c=>c.id===id)).filter(Boolean);
    sections = renderLocationGuideSections(record, enemyLinks, bossLinks, curioLinks);
  } else {
    sections = `<section class="encyclopedia-section"><h2>Expedition context</h2><p>${escapeHtml(record.summary)}</p>${record.specialMechanics?.length?`<ul>${record.specialMechanics.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:''}<p>${record.spoilerSensitive?'Spoilers are minimized by default; this entry contains a high-level description only.':'This record covers a named or format-level quest, not generated objectives.'}</p></section>`;
  }
  const meta = kind === 'enemies' ? `${record.regionIds.map(regionName).join(' · ')} · ${record.enemyType} · ${record.encounterClass} · ${requirementLabel(record.requirements)}` : kind === 'curios' ? `${record.regionIds.map(regionName).join(' · ')} · ${requirementLabel(record.requirements)}` : kind === 'locations' ? `${regionName(record.regionId)} · ${requirementLabel(record.requirements)}` : kind === 'trinkets' ? `${record.rarity} · ${requirementLabel(record.requirements)}${record.classRestrictionHeroRouteIds?.length ? ` · ${record.classRestrictionHeroRouteIds.map(id=>heroes.find(hero=>hero.id===id)?.name || id).join(', ')}` : ''}${record.regionIds?.length ? ` · ${record.regionIds.map(regionName).join(' · ')}` : ''}` : record.category || 'Reference entry';
  const sources = (record.verification?.sourceIds || []).map(id=>structuredGameContent.sources.find(source=>source.id===id)).filter(Boolean);
  const locationArtworkFallback = `<span class="encyclopedia-mark location-art-fallback" role="img" aria-label="${escapeHtml(record.name)} artwork unavailable"><span aria-hidden="true">${escapeHtml(record.name.split(/\s+/).map(word => word[0]).join('').slice(0, 3))}</span><small>No local art</small></span>`;
  const artwork = kind === 'locations'
    ? renderEntryArtwork(kind, record, 'banner', locationArtworkFallback) || renderEntryArtwork(kind, record)
    : `${renderEntryArtwork(kind, record, 'banner')}${renderEntryArtwork(kind, record)}`;
  return `<a class="back-link" href="${back}">← All ${collectionConfig[kind].title.toLowerCase()}</a><section class="page-intro" aria-labelledby="page-title"><p class="eyebrow">${escapeHtml(meta)}</p><h1 id="page-title" tabindex="-1">${escapeHtml(record.name)}</h1><p class="lede">${escapeHtml(record.summary || record.purpose || record.whereFound || '')}</p><span class="boss-status">${escapeHtml(verificationLabel(kind, record))}</span></section>${artwork}${sections}<section class="encyclopedia-section"><h2>Sources & verification</h2><p>${escapeHtml(verificationLabel(kind, record))}. ${structuredGameContent.game.versionContext.verifiedAgainstInstalledBuild ? 'See the recorded game-version context for testing scope.' : 'Not tested against an installed game patch.'}</p><ul>${sources.map(source=>`<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a></li>`).join('')}</ul></section>`;
}

function renderLocationGuideSections(locationRecord, enemies, bosses, curios) {
  const sourceStatus = verificationLabel('locations', locationRecord);
  const enemyCards = enemies.map(enemy => `<li class="location-roster-entry"><a href="${encyclopediaHref('enemies', enemy)}">${escapeHtml(enemy.name)}</a><span>${escapeHtml([enemy.enemyType, enemy.encounterClass].filter(Boolean).join(' · ') || 'Enemy')}</span><p>${escapeHtml(enemy.summary || 'Threat details are not recorded.')}</p>${enemy.mechanics?.length ? `<ul>${enemy.mechanics.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</li>`).join('');
  const bossCards = bosses.map(boss => `<article class="location-related-card location-boss-card">${renderEntryArtwork('bosses', boss, 'thumbnail', `<span class="encyclopedia-mark location-boss-fallback" role="img" aria-label="${escapeHtml(boss.name)} portrait unavailable"><span aria-hidden="true">${escapeHtml(boss.name.split(/\s+/).map(word => word[0]).join('').slice(0, 3))}</span><small>No local art</small></span>`)}<div><p class="eyebrow">${escapeHtml(boss.regionLabel || 'Encounter')} · ${escapeHtml(requirementLabel(boss.requirements))}</p><h3><a href="#game/darkest-dungeon/bosses/${escapeHtml(boss.routeId)}">${escapeHtml(boss.name)}</a></h3><p>${escapeHtml(boss.summary || 'Boss overview is incomplete.')}</p><span class="boss-status">${escapeHtml(boss.guideStatus || 'Coverage not recorded')}</span></div></article>`).join('');
  const curioCards = curios.map(curio => `<article class="location-related-card location-curio-card">${renderEntryArtwork('curios', curio, 'thumbnail', `<span class="encyclopedia-mark location-curio-fallback" role="img" aria-label="${escapeHtml(curio.name)} icon unavailable"><span aria-hidden="true">${escapeHtml(curio.name.split(/\s+/).map(word => word[0]).join('').slice(0, 3))}</span></span>`)}<div><p class="eyebrow">${escapeHtml(curio.whereFound || 'Where found not recorded')} · ${escapeHtml(requirementLabel(curio.requirements))}</p><h3><a href="${encyclopediaHref('curios', curio)}">${escapeHtml(curio.name)}</a></h3><p>${curio.interactions.length} recorded ${curio.interactions.length === 1 ? 'interaction' : 'interactions'} · ${escapeHtml(verificationLabel('curios', curio))}</p></div></article>`).join('');
  const interactionRows = curios.flatMap(curio => curio.interactions.map(interaction => {
    const item = interaction.itemId && structuredGameContent.items.find(entry => entry.id === interaction.itemId);
    const itemLink = item ? `<a href="${encyclopediaHref('items', item)}">${escapeHtml(item.name)}</a>` : 'No provision specified';
    const chance = interaction.chance || 'Not recorded';
    const certainty = interaction.certainty || 'Not recorded';
    return `<tr><td>${itemLink}</td><td><a href="${encyclopediaHref('curios', curio)}">${escapeHtml(curio.name)}</a></td><td>${escapeHtml(interaction.outcome)}</td><td>${escapeHtml(chance)} · ${escapeHtml(certainty)}</td></tr>`;
  })).join('');
  const relatedTeams = [...new Map(bosses.flatMap(boss => (boss.counterTeams || []).map(team => [team.id, { ...team, boss }]))).values()];
  const teamMarkup = relatedTeams.length
    ? `<div class="boss-counter-teams location-team-grid">${relatedTeams.map(renderBossCounterPreview).join('')}</div>`
    : '<p>No boss-specific teams are recorded for this region yet. <a href="#game/darkest-dungeon/teams">Browse all teams</a>; general-purpose compositions remain unassessed for regional suitability.</p>';
  const regionTrinkets = structuredGameContent.trinkets.filter(trinket => (trinket.regionIds || []).includes(locationRecord.regionId));
  const relatedItems = [...new Map(curios.flatMap(curio => curio.interactions.map(interaction => interaction.itemId && structuredGameContent.items.find(item => item.id === interaction.itemId)).filter(Boolean).map(item => [item.id, item]))).values()];
  const relatedEquipment = [...regionTrinkets.map(trinket => `<a href="${encyclopediaHref('trinkets', trinket)}">${escapeHtml(trinket.name)} trinket</a>`), ...relatedItems.map(item => `<a href="${encyclopediaHref('items', item)}">${escapeHtml(item.name)}</a>`)];
  return `<section class="encyclopedia-section location-guide-overview"><h2>Region overview</h2><p class="guide-data-note">Coverage: ${escapeHtml(sourceStatus)}. The linked roster reflects recorded regional associations; it is not an encounter-frequency ranking.</p><p><a href="#game/darkest-dungeon/enemies">Browse all enemies</a> · <a href="#game/darkest-dungeon/bosses">Browse all bosses</a> · <a href="#game/darkest-dungeon/curios">Browse all curios</a></p></section>
    <section class="encyclopedia-section"><h2>Main enemies & threats</h2>${enemyCards ? `<details class="location-roster"><summary>${enemies.length} recorded regional enemies</summary><ul class="location-roster-list">${enemyCards}</ul></details>` : '<p>No regional enemies are recorded.</p>'}</section>
    <section class="encyclopedia-section"><h2>Available bosses</h2>${bossCards ? `<div class="location-related-grid">${bossCards}</div>` : '<p>No bosses are recorded for this region.</p>'}</section>
    <section class="encyclopedia-section"><h2>Relevant curios</h2>${curioCards ? `<div class="location-related-grid location-curio-grid">${curioCards}</div>` : '<p>No curios are recorded for this region.</p>'}</section>
    <section class="encyclopedia-section"><h2>Useful provisions & interactions</h2>${interactionRows ? `<p>These are recorded curio interactions, not a universal shopping list. Check each linked entry for its outcome warning.</p><div class="table-scroll"><table><thead><tr><th>Provision</th><th>Curio</th><th>Recorded outcome</th><th>Chance / certainty</th></tr></thead><tbody>${interactionRows}</tbody></table></div>` : '<p>No provision interactions are recorded for the listed curios.</p>'}</section>
    <section class="encyclopedia-section"><h2>Special mechanics</h2>${locationRecord.specialMechanics?.length ? `<ul>${locationRecord.specialMechanics.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No regional mechanics are recorded yet.</p>'}</section>
    <section class="encyclopedia-section"><h2>Related team compositions</h2>${teamMarkup}</section>
    <section class="encyclopedia-section"><h2>Expedition preparation</h2><ul><li>Review the linked enemy roster and boss guide for the planned quest; this index is not an encounter-frequency ranking.</li><li>Use recorded curio interactions as reference only. The actual curio and outcome depend on the expedition.</li><li>Provision needs vary by quest and party; no universal quantities are asserted.</li></ul>${relatedEquipment.length ? `<p class="location-related-links"><strong>Related records:</strong> ${relatedEquipment.join(' · ')}</p>` : '<p>No region-linked trinkets or provision interactions are recorded here yet.</p>'}<p><a href="#game/darkest-dungeon/teams">Browse team compositions</a></p></section>`;
}

const EXPEDITION_ROSTER_STORAGE_KEY = 'bm-gaming-wiki-available-heroes';
let memoryExpeditionRoster = null;

function getExpeditionRoster() {
  try {
    if (typeof localStorage === 'undefined') return memoryExpeditionRoster;
    const raw = localStorage.getItem(EXPEDITION_ROSTER_STORAGE_KEY);
    if (!raw) return memoryExpeditionRoster;
    const saved = JSON.parse(raw);
    if (!saved || saved.initialized !== true || !Array.isArray(saved.heroIds)) return memoryExpeditionRoster;
    const knownIds = new Set(heroes.map(hero => hero.id));
    memoryExpeditionRoster = { initialized: true, heroIds: [...new Set(saved.heroIds.filter(id => knownIds.has(id)))] };
    if (JSON.stringify(saved.heroIds) !== JSON.stringify(memoryExpeditionRoster.heroIds)) saveExpeditionRoster(memoryExpeditionRoster);
    return { initialized: true, heroIds: [...memoryExpeditionRoster.heroIds] };
  } catch {
    return memoryExpeditionRoster;
  }
}

function saveExpeditionRoster(roster) {
  memoryExpeditionRoster = roster ? { initialized: true, heroIds: [...new Set(roster.heroIds.filter(id => heroes.some(hero => hero.id === id)))] } : null;
  try {
    if (typeof localStorage === 'undefined') return false;
    if (!memoryExpeditionRoster) localStorage.removeItem(EXPEDITION_ROSTER_STORAGE_KEY);
    else localStorage.setItem(EXPEDITION_ROSTER_STORAGE_KEY, JSON.stringify(memoryExpeditionRoster));
    return true;
  } catch {
    return false;
  }
}

function expeditionRosterHeroes() {
  return [...heroes].sort((left, right) => left.name.localeCompare(right.name));
}

function renderExpeditionRosterControls() {
  const roster = getExpeditionRoster();
  return `<section class="expedition-roster panel" aria-labelledby="planner-roster-heading"><div class="planner-section-heading"><div><p class="eyebrow">Personal checklist · this browser only</p><h2 id="planner-roster-heading">Heroes available</h2><p>Mark the heroes currently in your roster. Unmarked does not mean unavailable until you start the checklist.</p></div><button type="button" class="planner-secondary-button" data-reset-expedition-roster>Reset to unknown</button></div><fieldset><legend>Mark available heroes</legend><div class="expedition-roster-grid">${expeditionRosterHeroes().map(hero => `<label class="expedition-roster-option"><input type="checkbox" data-expedition-hero="${escapeHtml(hero.id)}"${roster?.heroIds.includes(hero.id) ? ' checked' : ''}><span>${escapeHtml(hero.name)}</span><small>${requirementLabel(hero.requirements)}</small></label>`).join('')}</div></fieldset><p id="planner-roster-status" role="status" aria-live="polite">${roster ? `${roster.heroIds.length} heroes marked available. Roster is stored only in this browser.` : 'Roster availability is unknown. Mark heroes to compare teams.'}</p><p data-roster-storage-note class="planner-data-note">Personal roster data is never written to game JSON.</p></section>`;
}

function plannerLocation(regionId) {
  return structuredGameContent.locations.find(location => location.regionId === regionId);
}

function plannerBosses(location) {
  if (!location) return [];
  return location.bossIds.map(id => structuredGameContent.bosses.find(boss => boss.id === id)).filter(boss => boss && boss.regionIds.includes(location.regionId));
}

function updateExpeditionPlannerOptions() {
  const regionSelect = document.getElementById('planner-region');
  const bossSelect = document.getElementById('planner-boss');
  const difficultySelect = document.getElementById('planner-difficulty');
  if (!regionSelect || !bossSelect || !difficultySelect) return;
  const location = plannerLocation(regionSelect.value);
  const previousBoss = bossSelect.value;
  const bosses = plannerBosses(location);
  bossSelect.innerHTML = `<option value="">Any recorded boss in this region</option>${bosses.map(boss => `<option value="${escapeHtml(boss.id)}">${escapeHtml(boss.name)}</option>`).join('')}`;
  bossSelect.disabled = !location;
  bossSelect.value = bosses.some(boss => boss.id === previousBoss) ? previousBoss : '';
  const selectedBoss = bosses.find(boss => boss.id === bossSelect.value);
  difficultySelect.innerHTML = `<option value="">Not selected</option>${(selectedBoss?.variants || []).map(variant => `<option value="${escapeHtml(variant.tier)}">${escapeHtml(variant.tier)} · ${escapeHtml(variant.name)}</option>`).join('')}`;
  difficultySelect.disabled = !selectedBoss || !selectedBoss.variants?.length;
  if (difficultySelect.disabled) difficultySelect.value = '';
}

function renderPlannerDifficulty(boss, tier) {
  if (!boss) return '';
  if (!boss.variants?.length) return '<p class="planner-data-note">No tier-specific boss data is recorded for this encounter.</p>';
  if (!tier) return `<p class="planner-data-note">Difficulty variants are documented in the linked boss guide. Select a tier above for its recorded summary.</p>`;
  const variant = boss.variants.find(entry => entry.tier === tier);
  if (!variant) return '';
  const stats = variant.stats || {};
  const summary = [['Health', stats.health], ['Speed', stats.speed], ['Stun resistance', stats.resistances?.stun]].filter(([, entry]) => entry?.value !== undefined).map(([label, entry]) => `<div><dt>${label}</dt><dd>${escapeHtml(entry.value)}${entry.unit === 'percent' ? '%' : entry.unit === 'hp' ? ' HP' : ''}</dd></div>`).join('');
  return `<dl class="planner-difficulty-summary"><div><dt>Variant</dt><dd>${escapeHtml(variant.name)}</dd></div>${summary}<div><dt>Coverage</dt><dd>${escapeHtml(verificationLabel('bosses', { verification: variant.verification }))}</dd></div></dl>`;
}

function renderPlannerRegionRecords(location) {
  const enemies = location.enemyIds.map(id => structuredGameContent.enemies.find(enemy => enemy.id === id)).filter(Boolean);
  const curios = location.curioIds.map(id => structuredGameContent.curios.find(curio => curio.id === id)).filter(Boolean);
  const interactions = curios.flatMap(curio => curio.interactions.map(interaction => ({ curio, interaction, item: interaction.itemId && structuredGameContent.items.find(item => item.id === interaction.itemId) })));
  const mechanics = location.specialMechanics?.length ? `<ul>${location.specialMechanics.map(mechanic => `<li>${escapeHtml(mechanic)}</li>`).join('')}</ul>` : '<p>No regional mechanics are recorded.</p>';
  const enemyList = enemies.length ? `<details class="planner-record-disclosure"><summary>Review ${enemies.length} recorded regional enemies</summary><ul class="planner-record-list">${enemies.map(enemy => `<li><a href="${encyclopediaHref('enemies', enemy)}">${escapeHtml(enemy.name)}</a><span>${escapeHtml(enemy.enemyType)} · ${escapeHtml(enemy.encounterClass)}</span><p>${escapeHtml(enemy.summary)}</p></li>`).join('')}</ul></details>` : '<p>No regional enemies are associated in the current records.</p>';
  const curioList = curios.length ? `<ul class="planner-curio-list">${curios.map(curio => `<li><a href="${encyclopediaHref('curios', curio)}">${escapeHtml(curio.name)}</a><span>${escapeHtml(verificationLabel('curios', curio))} · ${curio.interactions.length} recorded interaction${curio.interactions.length === 1 ? '' : 's'}</span></li>`).join('')}</ul>` : '<p>No curios are associated in the current records.</p>';
  const interactionTable = interactions.length ? `<details class="planner-record-disclosure"><summary>Review ${interactions.length} recorded interactions</summary><div class="table-scroll"><table><thead><tr><th>Provision / item</th><th>Curio</th><th>Recorded outcome</th><th>Certainty</th></tr></thead><tbody>${interactions.map(({ curio, interaction, item }) => `<tr><td>${item ? `<a href="${encyclopediaHref('items', item)}">${escapeHtml(item.name)}</a><small class="planner-item-purpose">${escapeHtml(item.purpose || 'Purpose not recorded.')}</small><small>${escapeHtml(verificationLabel('items', item))}</small>` : 'No item specified'}</td><td><a href="${encyclopediaHref('curios', curio)}">${escapeHtml(curio.name)}</a></td><td>${escapeHtml(interaction.outcome)}</td><td>${escapeHtml(interaction.certainty || 'Not recorded')}</td></tr>`).join('')}</tbody></table></div></details>` : '<p>No provision interactions are recorded for the associated curios.</p>';
  const linkedBosses = plannerBosses(location);
  const bossLinks = linkedBosses.length ? `<ul class="planner-boss-list">${linkedBosses.map(boss => `<li><a href="#game/darkest-dungeon/bosses/${escapeHtml(boss.routeId)}">${escapeHtml(boss.name)}</a><span>${escapeHtml(boss.guideStatus === 'available' ? 'Detailed guide available' : 'Guide coverage incomplete')}</span></li>`).join('')}</ul>` : '<p>No boss associations are recorded for this location.</p>';
  return `<div class="expedition-prep-grid"><section><h3>Main threats</h3>${enemyList}<p><a href="#game/darkest-dungeon/enemies">Browse enemy index →</a></p></section><section><h3>Bosses available in this region</h3>${bossLinks}</section><section><h3>Regional mechanics</h3>${mechanics}</section><section><h3>Curios</h3>${curioList}<p><a href="#game/darkest-dungeon/curios">Browse curios →</a></p></section><section class="expedition-interactions"><h3>Known provision interactions</h3><p>Recorded outcomes only; no universal provision quantities are implied.</p>${interactionTable}<p><a href="#game/darkest-dungeon/items">Browse provisions and items →</a></p></section></div>`;
}

function renderPlannerRegionHeader(location) {
  const verification = verificationLabel('locations', location);
  return `<section class="expedition-region-summary"><header>${renderEntryArtwork('locations', location, 'banner', `<div class="expedition-region-placeholder" role="img" aria-label="${escapeHtml(location.name)} image unavailable"><span>${escapeHtml(location.name.slice(0, 2).toUpperCase())}</span><small>No local image</small></div>`)}<div><p class="eyebrow">Region record · ${escapeHtml(requirementLabel(location.requirements))}</p><h2>${escapeHtml(location.name)}</h2><p>${escapeHtml(location.summary)}</p><p class="planner-data-note">${escapeHtml(verification)} · associations from the location record.</p><a href="#game/darkest-dungeon/locations/${escapeHtml(location.routeId)}">Open full region guide →</a></div></header></section>`;
}

function renderPlannerTeam(team, roster) {
  const requiredIds = team.members.map(member => member.heroRouteId);
  const missing = roster ? requiredIds.filter(id => !roster.heroIds.includes(id)) : [];
  const status = !roster ? 'Roster availability unknown' : missing.length ? `Missing ${missing.length} marked ${missing.length === 1 ? 'hero' : 'heroes'}` : 'All required heroes marked available';
  const lineup = [...team.members].sort((left, right) => right.position - left.position).map(member => {
    const hero = heroes.find(entry => entry.id === member.heroRouteId);
    const name = hero?.name || member.heroRouteId;
    const href = `#hero/${escapeHtml(member.heroRouteId)}/${hero?.guide ? 'overview' : 'abilities'}`;
    return `<li><span>Rank ${member.position}</span>${renderTeamPortrait(name)}<a href="${href}">${escapeHtml(name)}</a></li>`;
  }).join('');
  const missingLinks = missing.length ? `<p class="planner-missing-heroes"><strong>Not marked:</strong> ${missing.map(id => { const hero = heroes.find(entry => entry.id === id); return `<a href="#hero/${escapeHtml(id)}/${hero?.guide ? 'overview' : 'abilities'}">${escapeHtml(hero?.name || id)}</a>`; }).join(', ')}</p>` : '';
  const readiness = getTeamEquipmentStats(team);
  return `<article class="planner-team-card"><header><p class="eyebrow">${escapeHtml(team.category)} · ${requirementLabel(team.requirements)}</p><h3><a href="#game/darkest-dungeon/teams/${escapeHtml(team.id)}">${escapeHtml(team.name)}</a></h3><p>${escapeHtml(team.purpose)}</p><span class="planner-roster-state${roster && !missing.length ? ' is-ready' : ''}">${status}</span>${missingLinks}</header><ol class="planner-team-lineup" aria-label="Formation, rank 4 to rank 1">${lineup}</ol><p><strong>Recommended tiers:</strong> ${escapeHtml(team.difficultyRecommendations || 'Not recorded')}</p><p class="planner-equipment-count">${readiness.owned}/${readiness.total} recommended trinkets marked owned</p>${renderTeamEquipmentReadinessContent(team)}<a class="team-details-link" href="#game/darkest-dungeon/teams/${escapeHtml(team.id)}">View full team guide →</a></article>`;
}

function renderPlannerBossReminder(boss, tier) {
  const primary = boss.mechanics?.[0];
  const strategyTeam = boss.counterTeams?.[0];
  const mechanics = (boss.mechanics || []).slice(primary ? 1 : 0, primary ? 3 : 2).map(item => {
    const label = item.kind === 'editorial' ? 'Editorial advice' : item.verification?.status === 'reference-checked' ? 'Reference-checked' : 'Verification not recorded';
    return `<li><span>${escapeHtml(label)}</span>${escapeHtml(item.text)}</li>`;
  }).join('');
  const warning = boss.routeId === 'swine-prince' ? renderBossCriticalWarning(boss) : '';
  const tacticalResponse = boss.tacticalConsiderations?.[0];
  const primaryStatus = primary?.kind === 'editorial' ? 'Editorial advice' : primary?.verification?.status === 'reference-checked' ? 'Reference-checked mechanic' : 'Verification not recorded';
  return `<section class="planner-boss-reminder"><div class="planner-section-heading"><div><p class="eyebrow">Encounter reference · ${escapeHtml(verificationLabel('bosses', boss))}</p><h2>${escapeHtml(boss.name)} quick reminder</h2></div><a href="#game/darkest-dungeon/bosses/${escapeHtml(boss.routeId)}">Open full boss guide →</a></div>${warning}<p class="planner-key-mechanic"><strong>${escapeHtml(primaryStatus)}</strong>${escapeHtml(primary?.text || 'Mechanics are not recorded for this entry.')}</p><ul class="planner-boss-mechanics">${mechanics || '<li>Boss mechanics have not been documented.</li>'}</ul>${tacticalResponse ? `<p class="planner-opening-note"><strong>Response to the mechanic · ${tacticalResponse.kind === 'editorial' ? 'Editorial' : tacticalResponse.verification?.status === 'reference-checked' ? 'Reference-checked' : 'Coverage unverified'}:</strong> ${escapeHtml(tacticalResponse.text)}</p>` : ''}${renderPlannerDifficulty(boss, tier)}${strategyTeam ? `<p class="planner-opening-note"><strong>Opening strategy · ${escapeHtml(strategyTeam.name)}:</strong> ${escapeHtml(strategyTeam.openingStrategy)} <a href="#game/darkest-dungeon/teams/${escapeHtml(strategyTeam.id)}">Team guide →</a></p>` : ''}</section>`;
}

function renderExpeditionPlannerResults() {
  const regionId = document.getElementById('planner-region')?.value || '';
  const bossId = document.getElementById('planner-boss')?.value || '';
  const tier = document.getElementById('planner-difficulty')?.value || '';
  const location = plannerLocation(regionId);
  const roster = getExpeditionRoster();
  if (!location) return '<section class="panel planner-empty"><h2>Choose a region</h2><p>The planner will gather only records linked to that region.</p></section>';
  const bosses = plannerBosses(location);
  const selectedBoss = bosses.find(boss => boss.id === bossId) || null;
  const relevantBosses = selectedBoss ? [selectedBoss] : bosses;
  const teams = [...new Map(relevantBosses.flatMap(boss => (boss.counterTeams || []).map(team => [team.id, { ...team, boss }]))).values()];
  const availableBossTeamLinks = selectedBoss ? '' : `<p class="planner-context-note">Select a specific boss above to focus its battle reminder. The current team list includes only teams attached to bosses recorded for ${escapeHtml(location.name)}.</p>`;
  const teamSection = teams.length ? `<section class="expedition-planner-section"><div class="planner-section-heading"><div><p class="eyebrow">Supported boss associations</p><h2>Matching team guides</h2></div><a href="#game/darkest-dungeon/teams">All team compositions →</a></div>${availableBossTeamLinks}<div class="planner-teams-grid">${teams.map(team => renderPlannerTeam(team, roster)).join('')}</div></section>` : `<section class="expedition-planner-section"><h2>Matching team guides</h2><p class="panel planner-empty">No boss-specific team guide is currently associated with ${selectedBoss ? escapeHtml(selectedBoss.name) : escapeHtml(location.name)}. General-purpose teams remain unassessed, so they are not presented as regional recommendations.</p><a href="#game/darkest-dungeon/teams">Browse all team compositions →</a></section>`;
  const checklist = `<section class="planner-checklist panel"><h2>Before entering</h2><ul><li>Confirm the selected region and boss route; these links follow recorded location-to-boss associations.</li><li>Check your roster status and choose a linked guide whose formation and skill loadout you can field.</li><li>Review owned trinkets and listed alternatives; the planner does not count copies, so confirm duplicate equipment in your inventory.</li><li>Read the linked curio interactions and pack provisions for your actual quest; no fixed quantities are prescribed.</li>${selectedBoss ? '<li>Review the boss warning and difficulty variant before starting the encounter.</li>' : ''}</ul></section>`;
  return `${renderPlannerRegionHeader(location)}${selectedBoss ? renderPlannerBossReminder(selectedBoss, tier) : ''}${renderPlannerRegionRecords(location)}${teamSection}${checklist}`;
}

function renderExpeditionPlanner() {
  const locations = structuredGameContent.locations;
  return `<section class="page-intro planner-intro"><p class="eyebrow">Darkest Dungeon / Field preparation</p><h1 id="page-title" tabindex="-1">Expedition Planner</h1><p class="lede">Choose a recorded region and boss to gather threats, preparation notes, team guides, and your local roster and equipment checklists.</p><p class="guide-data-note">The planner reuses existing encyclopedia relationships. It does not rank teams or infer unrecorded regional suitability.</p></section><section class="expedition-planner-controls" aria-label="Choose expedition"><div><label for="planner-region">Region</label><select id="planner-region"><option value="">Choose a region</option>${locations.map(location => `<option value="${escapeHtml(location.regionId)}">${escapeHtml(location.name)}</option>`).join('')}</select></div><div><label for="planner-boss">Boss (optional)</label><select id="planner-boss" disabled><option value="">Choose a region first</option></select></div><div><label for="planner-difficulty">Campaign difficulty</label><select id="planner-difficulty" disabled><option value="">Select a boss for supported tiers</option></select></div></section>${renderExpeditionRosterControls()}<div id="expedition-planner-results">${renderExpeditionPlannerResults()}</div>`;
}

function renderSearchResults(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const results = [];
  if (!normalizedQuery) return { status: 'Search current guides, teams, builds, and trinkets.', markup: '' };
  heroes.filter(hero => hero.guide).forEach(hero => {
    if (`${hero.name} ${hero.role} ${hero.summary}`.toLowerCase().includes(normalizedQuery)) {
      results.push({ title: hero.name, kind: 'Hero guide', href: `#hero/${hero.id}/overview` });
    }
    hero.guide.builds.forEach(build => {
      if (`${build.name} ${build.label} ${build.description}`.toLowerCase().includes(normalizedQuery)) {
        results.push({ title: build.name, kind: `${hero.name} build`, href: `#hero/${hero.id}/builds` });
      }
    });
    getTrinkets().filter(trinket => trinket.hero.id === hero.id).forEach(trinket => {
      if (`${trinket.name} ${trinket.use}`.toLowerCase().includes(normalizedQuery)) {
        results.push({ title: trinket.name, kind: 'Trinket recommendation', href: encyclopediaHref('trinkets', trinket) });
      }
    });
  });
  getTeams().forEach(team => {
    if (`${team.name} ${team.build} ${team.synergy} ${team.members.join(' ')}`.toLowerCase().includes(normalizedQuery)) {
      results.push({ title: team.name, kind: 'Team composition', href: `#game/darkest-dungeon/teams/${team.id}` });
    }
  });
  getBossCounterTeams().forEach(team => {
    const text = `${team.name} ${team.purpose} ${team.openingStrategy} ${team.members.map(member => `${member.heroRouteId} ${member.role}`).join(' ')}`.toLowerCase();
    if (text.includes(normalizedQuery)) results.push({ title: team.name, kind: 'Boss team guide', href: `#game/darkest-dungeon/teams/${team.id}` });
  });
  structuredGameContent?.bosses.filter(boss => `${boss.name} ${(boss.aliases || []).join(' ')} ${boss.summary} ${boss.regionLabel}`.toLowerCase().includes(normalizedQuery)).forEach(boss => {
    results.push({ title: boss.name, kind: boss.guideStatus === 'available' ? 'Boss guide' : 'Boss · In development', href: `#game/darkest-dungeon/bosses/${boss.routeId}` });
  });
  for (const kind of ['enemies', 'trinkets', 'items', 'curios', 'locations', 'quests']) {
    collectionRecords(kind).filter(record => encyclopediaSearchText(kind, record, structuredGameContent, heroes).includes(normalizedQuery))
      .forEach(record => results.push({ title: record.name, kind: ({ enemies: 'Enemy', trinkets: 'Trinket', items: 'Item', curios: 'Curio', locations: 'Location', quests: 'Quest' })[kind], href: encyclopediaHref(kind, record) }));
  }
  return {
    status: results.length ? `${results.length} matching ${results.length === 1 ? 'entry' : 'entries'}.` : 'No matching entries in the current content.',
    markup: results.map(result => `<a href="${escapeHtml(result.href)}"><span>${escapeHtml(result.kind)}</span><strong>${escapeHtml(result.title)}</strong><span aria-hidden="true">→</span></a>`).join('')
  };
}

function renderCollection(kind) {
  const isTeams = kind === 'teams';
  const title = isTeams ? 'Team Compositions' : 'Trinkets';
  const note = isTeams ? 'Pick a region or boss to narrow the field, then compare the rear-to-front formation and tactical plan. General-purpose parties stay separate unless a guide records a specific encounter.' :
    'Recommendations collected from available hero guides. Item effects are reference-checked; the installed game patch was not verified.';
  const renderer = isTeams ? renderTeam : renderTrinket;
  const teamIndex = isTeams ? renderTeamCompositionGroups() : null;
  return `<section class="page-intro" aria-labelledby="page-title"><p class="eyebrow">Darkest Dungeon / ${title}</p>
    <h1 id="page-title" tabindex="-1">${title}</h1><p class="lede">${note}</p></section>
    <section class="collection-group" aria-label="Available ${title.toLowerCase()}"><div class="section-heading"><h2>Current entries</h2><span>Collected from implemented guides</span></div>
      ${isTeams ? `<section class="team-index-controls" aria-label="Find a team composition"><div class="composition-search"><label for="team-search-input">Search teams</label><input id="team-search-input" type="search" autocomplete="off" placeholder="Name, hero, boss, or strategy"></div><div><label for="team-region-filter">Region</label><select id="team-region-filter"><option value="all">All supported regions</option>${teamIndex.regionOptions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}</select></div><div><label for="team-boss-filter">Boss</label><select id="team-boss-filter"><option value="all">All associated bosses</option>${teamIndex.bossOptions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}</select></div><div><label for="team-category-filter">Team category</label><select id="team-category-filter"><option value="all">All categories</option>${teamIndex.categoryOptions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}</select></div><p id="team-search-status" class="search-status" role="status" aria-live="polite">${teamIndex.count} compositions available.</p></section><div class="team-composition-groups">${teamIndex.markup}</div><p id="team-empty-state" class="team-empty-state" role="status" hidden>No compositions match those filters. Try another region, boss, category, or search.</p>` : `<div class="two-columns">${getTrinkets().map(renderer).join('')}</div>`}</section>`;
}

function bossCategoryName(categoryId) {
  return structuredGameContent.bossCategories.find(category => category.id === categoryId)?.name || 'Other encounters';
}

function bossSources(boss) {
  const ids = new Set([...(boss.verification?.sourceIds || []), ...(boss.summaryVerification?.sourceIds || []), ...(boss.guideVerification?.sourceIds || [])]);
  for (const field of ['mechanics', 'attacks', 'tacticalConsiderations']) {
    for (const item of boss[field] || []) item.verification?.sourceIds?.forEach(id => ids.add(id));
  }
  for (const variant of boss.variants || []) {
    variant.verification?.sourceIds?.forEach(id => ids.add(id));
    for (const value of Object.values(variant.stats || {})) {
      if (value?.verification) value.verification.sourceIds.forEach(id => ids.add(id));
      else for (const nested of Object.values(value || {})) nested?.verification?.sourceIds?.forEach(id => ids.add(id));
    }
  }
  return [...ids].map(id => structuredGameContent.sources.find(source => source.id === id)).filter(Boolean);
}

function renderBossCard(boss) {
  const categories = boss.categoryIds.map(bossCategoryName).join(' · ');
  const status = boss.guideStatus === 'available' ? 'Guide available' : 'Guide in development';
  const theme = boss.categoryIds[0]?.split(':').at(-1) || 'ruins';
  const regionIds = boss.regionIds.join(' ');
  const searchable = `${boss.name} ${(boss.aliases || []).join(' ')} ${boss.summary} ${boss.regionLabel} ${categories} ${requirementLabel(boss.requirements)}`.toLowerCase();
  return `<a class="boss-card" data-boss-card data-region-ids="${escapeHtml(regionIds)}" data-search-text="${escapeHtml(searchable)}" href="#game/darkest-dungeon/bosses/${escapeHtml(boss.routeId)}">
    ${renderEntryArtwork('bosses', boss, 'thumbnail', `<span class="boss-artwork" data-boss-theme="${escapeHtml(theme)}" role="img" aria-label="Atmospheric placeholder for ${escapeHtml(boss.name)}; no local portrait available"><span aria-hidden="true">${escapeHtml(boss.name.split(/\s+/).map(word => word[0]).join('').slice(0, 3).toUpperCase())}</span><small>Encounter dossier</small></span>`)}
    <span class="boss-card-copy"><span class="boss-card-meta"><span>${escapeHtml(boss.regionLabel)}</span><span>${escapeHtml(requirementLabel(boss.requirements))}</span></span>
      <strong>${escapeHtml(boss.name)}</strong>${boss.aliases?.length ? `<span class="boss-card-alias">Also listed as ${escapeHtml(boss.aliases.join(', '))}</span>` : ''}
      <span class="boss-card-summary">${escapeHtml(boss.summary)}</span>
      <span class="boss-card-footer"><span class="boss-status ${boss.guideStatus === 'available' ? 'is-available' : ''}">${status}</span><span aria-hidden="true">Read entry →</span></span></span>
  </a>`;
}

function renderBossCollection() {
  if (!structuredGameContent) return `<section class="page-intro"><h1 id="page-title" tabindex="-1">Bosses</h1><p class="lede">Boss records could not be loaded. Check the static game data file.</p></section>`;
  const groups = [...structuredGameContent.bossCategories].sort((a, b) => a.order - b.order).map(category => {
    const categoryBosses = structuredGameContent.bosses.filter(boss => boss.categoryIds[0] === category.id);
    if (!categoryBosses.length) return '';
    const cards = categoryBosses.map(renderBossCard).join('');
    const isSpoilerGroup = category.id.endsWith(':darkest-dungeon');
    return isSpoilerGroup
      ? `<details class="boss-group boss-spoiler-group" data-boss-group><summary><span>${escapeHtml(category.name)}</span><small>${categoryBosses.length} entries · open to reveal</small></summary><div class="boss-card-grid">${cards}</div></details>`
      : `<section class="boss-group" data-boss-group aria-labelledby="boss-group-${escapeHtml(category.id.split(':').at(-1))}"><div class="section-heading"><h2 id="boss-group-${escapeHtml(category.id.split(':').at(-1))}">${escapeHtml(category.name)}</h2><span>${categoryBosses.length} entries</span></div><div class="boss-card-grid">${cards}</div></section>`;
  }).join('');
  const regions = structuredGameContent.regions.map(region => `<option value="${escapeHtml(region.id)}">${escapeHtml(region.name)}</option>`).join('');
  return `<section class="page-intro boss-page-intro" aria-labelledby="page-title"><p class="eyebrow">Darkest Dungeon / Encounter index</p><h1 id="page-title" tabindex="-1">Bosses</h1><p class="lede">A sourced index of dungeon, wandering, event, and expansion encounters. Four entries currently have detailed mechanics guides; other pages remain clearly in development.</p></section>
    <section class="boss-index-controls" aria-label="Find a boss"><div><label for="boss-search-input">Search encounters</label><input id="boss-search-input" type="search" autocomplete="off" placeholder="Boss name, region, or alias"></div><div><label for="boss-region-filter">Filter by region</label><select id="boss-region-filter"><option value="all">All regions and events</option>${regions}</select></div><p id="boss-search-status" class="search-status" role="status" aria-live="polite">${structuredGameContent.bosses.length} boss entries.</p></section>
    <div class="boss-groups">${groups}</div><p id="boss-empty-state" class="panel boss-empty-state" hidden>No boss entries match these filters. Try another name or region.</p>`;
}

function formatBossValue(measure) {
  if (!measure || measure.value === null || measure.value === undefined) return 'Not recorded';
  return `${measure.value}${measure.unit === 'percent' ? '%' : ''}`;
}

function renderBossVariants(boss) {
  if (!boss.variants?.length) return '<p class="guide-development-note">Difficulty values and variants have not been verified for this entry.</p>';
  const metrics = [
    ['health', 'HP'], ['dodge', 'Dodge'], ['protection', 'PROT'], ['speed', 'Speed'],
    ['stun', 'Stun RES'], ['blight', 'Blight RES'], ['bleed', 'Bleed RES'], ['debuff', 'Debuff RES'], ['move', 'Move RES']
  ];
    return `<details class="boss-variants"><summary>Show difficulty statistics and resistances</summary><div class="table-scroll"><table><caption>${escapeHtml(boss.name)} · sourced campaign variants</caption><thead><tr><th scope="col">Stat</th>${boss.variants.map(variant => `<th scope="col">${escapeHtml(variant.tier)}<small>${escapeHtml(variant.name)}</small></th>`).join('')}</tr></thead><tbody>${metrics.map(([key,label]) => `<tr><th scope="row">${label}</th>${boss.variants.map(variant => {
    const resistanceKeys = ['stun', 'blight', 'bleed', 'debuff', 'move'];
    const measure = resistanceKeys.includes(key) ? variant.stats.resistances[key] : variant.stats[key];
    return `<td>${escapeHtml(formatBossValue(measure))}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div><p class="guide-data-note">Reference values shown as published; actual status-effect success also depends on the attacker’s chance and the game’s resistance calculation.</p></details>`;
}

function renderBossFactList(items, className = '') {
  if (!items?.length) return '<p class="guide-development-note">No verified details are recorded yet.</p>';
  return `<div class="boss-fact-list ${className}">${items.map(item => `<article class="panel"><h3>${escapeHtml(item.name || item.title || (item.kind === 'editorial' ? 'Tactical consideration' : 'Encounter detail'))}</h3><p>${escapeHtml(item.text)}</p>${item.kind === 'editorial' ? '<span class="editorial-label">Editorial consideration</span>' : ''}</article>`).join('')}</div>`;
}

function renderRelatedBossHeroes(boss) {
  const related = (boss.relatedHeroRouteIds || []).map(id => heroes.find(hero => hero.id === id)).filter(Boolean);
  if (!related.length) return '<p class="guide-development-note">No related hero guides have been documented for this boss.</p>';
  return `<ul class="boss-related-links">${related.map(hero => `<li><a href="#hero/${escapeHtml(hero.id)}/${hero.guide ? 'overview' : 'abilities'}">${escapeHtml(hero.name)} <span aria-hidden="true">→</span></a></li>`).join('')}</ul><p class="guide-data-note">These links provide hero background only; they are not a boss ranking or guaranteed counter list.</p>`;
}

function renderBossCounterPreview(team) {
  const regionId = team.boss.regionIds?.[0] || 'other';
  const positions = [...team.members].sort((left, right) => right.position - left.position).map(member => {
    const hero = heroes.find(entry => entry.id === member.heroRouteId);
    const name = hero?.name || member.heroRouteId;
    return `<li><span class="counter-preview-rank">Rank ${member.position}</span>${renderTeamPortrait(name)}<strong>${renderHeroName(name)}</strong></li>`;
  }).join('');
  const searchText = `${team.name} ${team.category} ${team.boss.name} ${team.boss.regionLabel} ${requirementLabel(team.requirements)} ${team.requirements.dlc.join(' ')} ${team.purpose} ${team.members.map(member => `${member.heroRouteId} ${member.role}`).join(' ')}`;
  const category = teamCategoryLabels[team.category] || team.category;
  const readiness = getTeamEquipmentStats(team);
  return `<article class="panel boss-counter-preview" data-counter-team="${escapeHtml(team.category)}" data-team-id="${escapeHtml(team.id)}" data-team-region="${escapeHtml(regionId)}" data-team-boss="${escapeHtml(team.boss.id)}" data-team-category="${escapeHtml(team.category)}" data-composition-card data-search-text="${escapeHtml(searchText.toLowerCase())}"><p class="eyebrow">${escapeHtml(category)} · ${requirementLabel(team.requirements)}</p><h3>${escapeHtml(team.name)}</h3><p class="team-card-association"><a href="#game/darkest-dungeon/bosses/${escapeHtml(team.boss.routeId)}">${escapeHtml(team.boss.name)}</a><span>${escapeHtml(team.boss.regionLabel)}</span></p><p class="team-card-tier"><strong>Recommended tiers:</strong> ${escapeHtml(team.difficultyRecommendations || 'Not recorded')}</p><ol class="counter-preview-party" aria-label="Formation, rank 4 to rank 1">${positions}</ol><p class="boss-team-equipment-summary" data-team-equipment-summary="${escapeHtml(team.id)}">Equipment checklist: ${readiness.owned}/${readiness.total} recommended trinkets marked owned</p><p class="preview-tactical-edge"><strong>Why this team works</strong>${escapeHtml(team.purpose)}</p><a class="team-details-link" href="#game/darkest-dungeon/teams/${escapeHtml(team.id)}">View full team guide <span aria-hidden="true">→</span></a></article>`;
}

function teamQuickFacts(team) {
  const skillNames = team.members.flatMap(member => member.skills.map(skill => skill.name.toLowerCase()));
  const hasBlight = skillNames.some(name => ['plague grenade', 'noxious blast', 'poison dart'].includes(name));
  const hasBleed = skillNames.some(name => ['bleed out', 'open vein', 'if it bleeds', 'hound’s harry', "hound's harry"].includes(name));
  const hasMark = skillNames.some(name => name.includes('mark') || name === 'target whistle')
    || /\bmark(?:ed|s|ing)?\b/i.test(`${team.purpose} ${team.openingStrategy}`);
  const healer = team.members.find(member => /heal|recovery/i.test(member.role));
  const guardSupport = team.members.some(member => member.skills.some(skill => ['Guard Dog', 'Defender'].includes(skill.name)));
  const damageProfile = ['direct damage', hasMark && 'mark support', hasBlight && 'blight', hasBleed && 'bleed'].filter(Boolean).join(' + ');
  return {
    focus: team.purpose,
    damage: damageProfile,
    survivability: healer ? `${heroes.find(hero => hero.id === healer.heroRouteId)?.name || healer.heroRouteId} recovery` : guardSupport ? 'Guard support; no dedicated healer' : 'No dedicated healer listed'
  };
}

function renderCounterGuideSkills(member) {
  const heroName = heroes.find(hero => hero.id === member.heroRouteId)?.name || member.heroRouteId;
  const abilityDetails = heroAbilities[member.heroRouteId]?.skillDetails || {};
  return `<ul class="counter-guide-skills">${member.skills.map(skill => {
    const icon = abilityDetails[skill.name]?.icon;
    const iconMarkup = icon?.approvedLocal && icon.src
      ? `<img class="counter-guide-skill-icon" src="${escapeHtml(icon.src)}" alt="">`
      : `<span class="counter-guide-skill-icon skill-icon-fallback" aria-hidden="true">✦</span>`;
    const roleNote = abilityDetails[skill.name]?.tacticalNote || abilityDetails[skill.name]?.description || `Selected for ${member.role.toLowerCase()}.`;
    return `<li class="counter-guide-skill">${iconMarkup}<div><strong>${escapeHtml(skill.name)}</strong><span><b>Use from:</b> ${skill.heroPositions.map(position => `rank ${position}`).join(', ')} · <b>Targets:</b> ${escapeHtml(skill.target)}.</span><small>${escapeHtml(roleNote)} Listed for ${escapeHtml(heroName)} in this boss plan.</small></div></li>`;
  }).join('')}</ul>`;
}

const OWNED_TRINKETS_STORAGE_KEY = 'bm-gaming-wiki-owned-trinkets';
let memoryOwnedTrinketIds = [];

function normalizeOwnedTrinketId(value) {
  const trinket = structuredGameContent?.trinkets.find(item => item.id === value || item.routeId === value);
  return trinket?.id || '';
}

function saveOwnedTrinketIds(ids) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(OWNED_TRINKETS_STORAGE_KEY, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}

function getOwnedTrinketIds() {
  try {
    if (typeof localStorage === 'undefined') return [...memoryOwnedTrinketIds];
    const parsed = JSON.parse(localStorage.getItem(OWNED_TRINKETS_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [...memoryOwnedTrinketIds];
    const normalized = [...new Set(parsed.map(normalizeOwnedTrinketId).filter(Boolean))];
    memoryOwnedTrinketIds = normalized;
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) saveOwnedTrinketIds(normalized);
    return [...normalized];
  } catch {
    return [...memoryOwnedTrinketIds];
  }
}

function setOwnedTrinket(id, owned) {
  const stableId = normalizeOwnedTrinketId(id);
  if (!stableId) return { ids: getOwnedTrinketIds(), persisted: false };
  const ids = new Set(getOwnedTrinketIds());
  if (owned) ids.add(stableId);
  else ids.delete(stableId);
  memoryOwnedTrinketIds = [...ids];
  return { ids: [...ids], persisted: saveOwnedTrinketIds(memoryOwnedTrinketIds) };
}

function clearOwnedTrinkets() {
  memoryOwnedTrinketIds = [];
  return { ids: [], persisted: saveOwnedTrinketIds([]) };
}

function renderTrinketOwnershipControl(trinket, className = '') {
  const owned = getOwnedTrinketIds().includes(trinket.id);
  return `<label class="trinket-owned-control ${className}" data-owned-control data-owned="${owned}" title="Saved in this browser only"><input type="checkbox" data-owned-trinket="${escapeHtml(trinket.id)}" aria-label="Mark ${escapeHtml(trinket.name)} as owned"${owned ? ' checked' : ''}><span>Owned</span><small data-owned-state>${owned ? 'Marked owned' : 'Not marked owned'}</small></label>`;
}

function ownershipStorageNotice(persisted) {
  return persisted ? 'Saved in this browser only.' : 'Browser storage is unavailable; this selection will last only for this open session.';
}

function updateOwnershipControls(trinketId, owned) {
  document.querySelectorAll('[data-owned-trinket]').forEach(input => {
    if (input.dataset.ownedTrinket !== trinketId) return;
    input.checked = owned;
    const control = input.closest('[data-owned-control]');
    if (!control) return;
    control.dataset.owned = String(owned);
    const status = control.querySelector('[data-owned-state]');
    if (status) status.textContent = owned ? 'Marked owned' : 'Not marked owned';
    const option = input.closest('[data-trinket-option]');
    if (option) option.dataset.owned = String(owned);
  });
}

function refreshTeamEquipmentReadiness() {
  document.querySelectorAll('[data-team-equipment-readiness]').forEach(section => {
    const team = findBossCounterTeam(section.dataset.teamId);
    if (team) section.innerHTML = renderTeamEquipmentReadinessContent(team);
  });
  document.querySelectorAll('[data-team-equipment-summary]').forEach(summary => {
    const team = findBossCounterTeam(summary.dataset.teamEquipmentSummary);
    if (team) {
      const stats = getTeamEquipmentStats(team);
      summary.textContent = `Equipment checklist: ${stats.owned}/${stats.total} recommended trinkets marked owned`;
    }
  });
}

function getTeamEquipmentStats(team) {
  const owned = new Set(getOwnedTrinketIds());
  const recommended = team.members.flatMap(member => member.trinketIds || []);
  return { owned: recommended.filter(routeId => {
    const item = structuredGameContent.trinkets.find(trinket => trinket.routeId === routeId);
    return item && owned.has(item.id);
  }).length, total: recommended.length };
}

function renderTeamEquipmentReadinessContent(team) {
  const owned = new Set(getOwnedTrinketIds());
  const entries = team.members.flatMap(member => (member.trinketIds || []).map(routeId => ({ member, item: structuredGameContent.trinkets.find(trinket => trinket.routeId === routeId) }))).filter(entry => entry.item);
  const ownedEntries = entries.filter(({ item }) => owned.has(item.id));
  const missingEntries = entries.filter(({ item }) => !owned.has(item.id));
  const heroName = routeId => heroes.find(hero => hero.id === routeId)?.name || routeId;
  const list = (items, empty, showAlternatives = false) => items.length ? `<ul>${items.map(({ member, item }) => {
    const alternatives = showAlternatives ? (member.alternativeTrinketIds || []).map(routeId => structuredGameContent.trinkets.find(trinket => trinket.routeId === routeId)).filter(Boolean) : [];
    const fallback = showAlternatives ? (alternatives.length
      ? `<small class="readiness-alternatives">Alternatives: ${alternatives.map(alternative => `<a href="#game/darkest-dungeon/trinkets/${escapeHtml(alternative.routeId)}">${escapeHtml(alternative.name)}</a> <span>(${escapeHtml(requirementLabel(alternative.requirements))})</span>`).join(' · ')}</small>`
      : `<small class="readiness-alternatives">No verified named alternative recorded. Priorities: ${escapeHtml(member.budgetPriorities || 'Not recorded.')}</small>`) : '';
    return `<li><a href="#game/darkest-dungeon/trinkets/${escapeHtml(item.routeId)}">${escapeHtml(item.name)}</a><span>${escapeHtml(heroName(member.heroRouteId))} · ${escapeHtml(requirementLabel(item.requirements))}</span>${fallback}</li>`;
  }).join('')}</ul>` : `<p>${empty}</p>`;
  const alternativeCount = team.members.reduce((count, member) => count + (member.alternativeTrinketIds || []).filter(id => structuredGameContent.trinkets.some(item => item.routeId === id)).length, 0);
  return `<div class="team-equipment-columns"><section><h3>Marked owned (${ownedEntries.length})</h3>${list(ownedEntries, 'No recommended trinkets marked owned yet.')}</section><section><h3>Not marked owned (${missingEntries.length})</h3>${list(missingEntries, 'All listed recommendations are marked owned.', true)}</section></div><p class="team-equipment-note">${alternativeCount ? `${alternativeCount} verified named alternatives are listed for this composition.` : 'No verified named alternatives are recorded; attribute priorities are shown instead.'} Missing equipment does not make this team unusable. This checklist records ownership only; it does not count copies or rate team power.</p><p data-ownership-storage-status role="status" aria-live="polite">Ownership is stored only in this browser.</p>`;
}

function renderTeamEquipmentReadiness(team) {
  return `<section class="team-equipment-readiness" id="equipment-readiness" data-team-equipment-readiness data-team-id="${escapeHtml(team.id)}"><div class="guide-section-heading"><p class="eyebrow">Personal checklist · local to this browser</p><h2>Equipment Readiness</h2><p>Use this list to plan around what you have. The party and build recommendations remain unchanged.</p></div>${renderTeamEquipmentReadinessContent(team)}</section>`;
}

function renderCounterGuideTrinkets(member) {
  const ownedTrinkets = new Set(getOwnedTrinketIds());
  const trinketUseNote = item => ({
    'focus-ring': 'Improves attack accuracy and critical chance; its Dodge penalty is the tradeoff.',
    'reckless-charm': 'Adds a modest accuracy boost; the Dodge penalty means it favors reliable actions over evasion.',
    'damage-stone': 'Raises direct damage, but lowers Dodge; choose it to shorten exposure rather than for defense.',
    'quick-draw-charm': 'Supports first-round action order and critical chance; its Speed penalty applies after the opening round.',
    'fusemans-matchstick': 'Supports ranged attacks with Speed, damage and critical chance; this trophy is earned from the Champion Brigand Pounder quest.',
    'man-slayer-ring': 'Its bonus applies against Human enemies only; confirm the encounter type before relying on it.',
    'sun-ring': 'Its damage and accuracy benefits require Torchlight above 75 and come with a Stress penalty.'
  })[item.routeId] || 'Check the linked record for this item’s documented effects and encounter limits.';
  const renderOption = id => {
    const item = structuredGameContent.trinkets.find(trinket => trinket.routeId === id);
    if (!item) return `<li class="counter-guide-trinket-missing">Unresolved trinket: ${escapeHtml(id)}</li>`;
    const effects = item.effects.map(effect => effect.text).join(' · ');
    const acquisition = item.acquisition?.text || 'Acquisition method is not recorded; availability is not guaranteed.';
    const checked = ownedTrinkets.has(item.id);
    return `<li class="counter-guide-trinket" data-trinket-option data-owned="${checked}"><a class="counter-guide-trinket-icon" href="#game/darkest-dungeon/trinkets/${escapeHtml(item.routeId)}" aria-label="Open ${escapeHtml(item.name)} entry">${renderEntryArtwork('trinkets', item, 'thumbnail', `<span class="trinket-icon-fallback" aria-hidden="true">◇</span>`)}</a><div><a href="#game/darkest-dungeon/trinkets/${escapeHtml(item.routeId)}">${escapeHtml(item.name)}</a><span>${escapeHtml(effects || 'Effects are not recorded.')}</span><small>${escapeHtml(trinketUseNote(item))}</small><small>${escapeHtml(item.rarity)} · ${escapeHtml(requirementLabel(item.requirements))}</small><small>${escapeHtml(acquisition)}</small>${renderTrinketOwnershipControl(item, 'trinket-build-owned')}</div></li>`;
  };
  const ideal = member.trinketIds.map(renderOption).join('');
  const alternatives = (member.alternativeTrinketIds || []).map(renderOption).join('');
  return `<div class="equipment-recommendations"><section class="equipment-tier"><h5>Recommended</h5><p>${escapeHtml(member.equipmentRationale || `The listed pairing supports ${member.role.toLowerCase()}.`)}</p><ul class="counter-guide-trinkets">${ideal}</ul></section>${alternatives ? `<section class="equipment-tier"><h5>Alternative options</h5><p>Rarity is shown as recorded; an acquisition route may be unknown, so availability is not assumed.</p><ul class="counter-guide-trinkets">${alternatives}</ul></section>` : '<section class="equipment-tier"><h5>Alternative options</h5><p>No verified named alternative is recorded for this role. Use the attribute priorities below.</p></section>'}<p class="equipment-budget-fallback"><strong>Budget fallback:</strong> ${escapeHtml(member.budgetPriorities || 'Use the relevant combat stats for this hero; specific priorities are not recorded.')}</p></div>`;
}

function renderCounterGuideBuild(member) {
  const hero = heroes.find(entry => entry.id === member.heroRouteId);
  const heroName = hero?.name || member.heroRouteId;
  const heroHref = `#hero/${escapeHtml(member.heroRouteId)}/${hero?.guide ? 'overview' : 'abilities'}`;
  const tip = member.tacticalPriority || (member.heroRouteId === 'shieldbreaker' && member.skills.some(skill => skill.name === 'Puncture')
    ? 'At Champion, keep Puncture available to break Bone Defender Guard and pull through protection.'
    : `During the fight, use the listed target ranks to keep ${member.role.toLowerCase()} pressure available as the boss moves.`);
  return `<article class="panel counter-guide-hero"><header class="counter-guide-hero-heading"><span class="counter-guide-rank">Rank ${member.position}</span>${renderTeamPortrait(heroName)}<div><p class="eyebrow">${escapeHtml(member.role)}</p><h3><a href="${heroHref}">${escapeHtml(heroName)}</a></h3><a class="hero-guide-link" href="${heroHref}">Open hero guide →</a></div></header><section class="counter-guide-build-section"><h4>Combat skills</h4>${renderCounterGuideSkills(member)}</section><section class="counter-guide-build-section"><h4>Trinket recommendations</h4>${renderCounterGuideTrinkets(member)}</section><p class="counter-guide-tip"><strong>During the fight</strong>${escapeHtml(tip)}</p></article>`;
}

function renderCounterGuideBattlePlan(team) {
  if (team.battlePlan) {
    const plan = team.battlePlan;
    const stages = [
      ['01 · Before entering', plan.beforeEntering],
      ['02 · Opening turns', plan.openingTurns],
      ['03 · Boss mechanic', plan.bossMechanic],
      ['04 · Guard and control', plan.guardAndControl],
      ['05 · Recovery and limits', plan.recoveryAndLimits]
    ];
    return `<section class="team-guide-battle" id="strategy" aria-labelledby="team-battle-heading"><div class="guide-section-heading"><p class="eyebrow">Encounter field notes</p><h2 id="team-battle-heading">Quick Battle Plan</h2><p>Boss-specific actions with rank and target details from this composition.</p></div><ol class="team-battle-steps">${stages.map(([label, text]) => `<li><span>${escapeHtml(label)}</span><p>${escapeHtml(text)}</p></li>`).join('')}</ol>${plan.detailedNotes?.length ? `<details class="team-battle-detail"><summary>Detailed fight notes</summary><div>${plan.detailedNotes.map(note => `<p>${escapeHtml(note)}</p>`).join('')}</div></details>` : ''}</section>`;
  }
  const specialized = team.category === 'specialized';
  const guardPlan = specialized
    ? 'At Champion, use Shieldbreaker’s Puncture to break a Bone Defender’s Guard and pull through protection. This specialist response is the reason to bring the DLC hero.'
    : 'No dedicated Guard-breaking skill is assigned in this team. Do not assume its listed attacks bypass Guard; keep pressure on the Necromancer when a valid target is available.';
  const healer = team.members.find(member => /healer|recovery/i.test(member.role));
  const recovery = healer
    ? `${heroes.find(hero => hero.id === healer.heroRouteId)?.name || healer.heroRouteId} has the team's recovery role. Heal when damage is meaningful, while the other heroes maintain boss pressure.`
    : 'This composition has no dedicated healer in its listed roles. Use its selected protection and keep the fight focused; no healing guarantee is assumed.';
  return `<section class="team-guide-battle" id="strategy" aria-labelledby="team-battle-heading"><div class="guide-section-heading"><p class="eyebrow">Encounter field notes</p><h2 id="team-battle-heading">Quick Battle Plan</h2><p>Short actions for play; keep rank and target coverage in view.</p></div><ol class="team-battle-steps"><li><span>01 · Before entering</span><p>Equip the four listed skills for each hero and preserve the shown ranks. Check the two recommended trinkets and the requirement badges above; this encounter is in the Ruins. This team data does not specify provision quantities.</p></li><li><span>02 · Opening turns</span><p>${escapeHtml(team.openingStrategy)}</p></li><li><span>03 · Retreats and summons</span><p>${escapeHtml(team.skeletonStrategy)}</p></li><li><span>04 · Guard and higher tiers</span><p>${escapeHtml(guardPlan)} The Specialized plan recommends Veteran and Champion; its Guard counter is specifically called out for Champion.</p></li><li><span>05 · Recovery and limits</span><p>${escapeHtml(recovery)} ${escapeHtml(team.alternatives)}</p></li></ol><details class="team-battle-detail"><summary>Detailed fight notes</summary><div><p>Summoned skeletons are life-linked to the Necromancer and disappear when he dies, so the team notes prioritize boss pressure over clearing each summon. Blinding Gas can stun rear skeletons in the Beginner build, but the boss's high Stun resistance makes repeated stun attempts an unreliable plan.</p><p>At higher difficulty, Bone Soldiers may begin stealthed. The Specialized composition does not assign stealth removal; its recorded plan is to let Stealth expire before targeting them. Team outcomes still depend on upgrades, turn order and status chances.</p></div></details></section>`;
}

function renderCounterGuideSources(team) {
  const sourceIds = [...new Set([...(team.verification?.sourceIds || []), ...(team.strategySourceIds || [])])];
  const sources = sourceIds.map(id => structuredGameContent.sources.find(source => source.id === id)).filter(Boolean);
  if (!sources.length) return '<section class="team-guide-sources" id="sources"><h2>Sources & verification</h2><p class="guide-data-note">Team-specific references have not been recorded.</p></section>';
  return `<section class="team-guide-sources" id="sources"><div class="guide-section-heading"><p class="eyebrow">Evidence and coverage</p><h2>Sources & Verification</h2></div><p class="guide-data-note">Team choices are source-informed and reference-checked; exact outcomes depend on upgrades and battle state. No claim of a mathematically optimal team is made.</p><ul>${sources.map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a><small>${escapeHtml(source.verificationStatus)}</small></li>`).join('')}</ul></section>`;
}

function renderBossCounterGuide(team) {
  const boss = team.boss;
  const facts = teamQuickFacts(team);
  const otherTeams = getBossCounterTeams().filter(other => other.boss.id === boss.id && other.id !== team.id);
  const difficulty = team.category === 'beginner' ? 'Beginner' : team.category === 'balanced' ? 'Intermediate' : 'Advanced';
  const teamNav = `<nav class="team-guide-navigation" aria-label="On this team guide"><a href="#team-overview">Overview</a><a href="#formation">Party formation</a><a href="#equipment-readiness">Equipment</a><a href="#builds">Hero builds</a><a href="#strategy">Battle strategy</a><a href="#sources">Sources</a></nav>`;
  const formation = team.members.map(member => {
    const hero = heroes.find(entry => entry.id === member.heroRouteId);
    const name = hero?.name || member.heroRouteId;
    const href = `#hero/${escapeHtml(member.heroRouteId)}/${hero?.guide ? 'overview' : 'abilities'}`;
    return `<li class="team-formation-card"><span class="formation-rank">Rank ${member.position}</span>${renderTeamPortrait(name)}<strong><a href="${href}">${escapeHtml(name)}</a></strong><span class="formation-role">${escapeHtml(member.role)}</span></li>`;
  }).join('');
  return `<header class="team-guide-hero" id="team-overview"><a class="team-boss-return" href="#game/darkest-dungeon/bosses/${escapeHtml(boss.routeId)}">← ${escapeHtml(boss.name)} boss guide</a><p class="eyebrow">${escapeHtml(boss.regionLabel)} · Boss counter-team guide</p><h1 id="page-title" tabindex="-1">${escapeHtml(team.name)}</h1><p class="team-guide-lede">${escapeHtml(team.purpose)}</p><div class="team-guide-badges"><span>${escapeHtml(team.category)} team · ${difficulty}</span><span>Recommended: ${escapeHtml(team.difficultyRecommendations)}</span><span>${requirementLabel(team.requirements)}</span><span>${escapeHtml(boss.name)} · ${escapeHtml(boss.regionLabel)}</span></div><dl class="team-quick-facts"><div><dt>Team focus</dt><dd>${escapeHtml(facts.focus)}</dd></div><div><dt>Damage profile</dt><dd>${escapeHtml(facts.damage)}</dd></div><div><dt>Survivability</dt><dd>${escapeHtml(facts.survivability)}</dd></div><div><dt>Guide level</dt><dd>${difficulty}</dd></div></dl></header>${teamNav}${renderTeamEquipmentReadiness(team)}<section class="team-guide-formation" id="formation"><div class="guide-section-heading"><p class="eyebrow">Party order · rear to front</p><h2>Party Formation</h2><p>Rank 4 → Rank 1. Keep these positions for the skill selections below.</p></div><ol class="team-guide-party">${formation}</ol></section><section class="team-guide-builds" id="builds"><div class="guide-section-heading"><p class="eyebrow">Skills · trinkets · role</p><h2>Hero Builds</h2></div><div class="team-guide-build-grid">${team.members.map(renderCounterGuideBuild).join('')}</div></section>${renderCounterGuideBattlePlan(team)}${renderCounterGuideSources(team)}<section class="team-guide-related" aria-label="Related guides"><a href="#game/darkest-dungeon/bosses/${escapeHtml(boss.routeId)}">${escapeHtml(boss.name)} boss guide</a><a href="#game/darkest-dungeon/teams">All team compositions</a>${otherTeams.map(other => `<a href="#game/darkest-dungeon/teams/${escapeHtml(other.id)}">${escapeHtml(other.name)}</a>`).join('')}</section>`;
}

function renderRelatedBossTeams(boss) {
  const bossTeams = boss.counterTeams || [];
  if (bossTeams.length) return `<p class="boss-team-intro">Choose a plan that fits your roster. Each guide includes rank-specific skills, trinkets and encounter notes.</p><div class="boss-counter-teams${bossTeams.length >= 4 ? ' boss-counter-teams-rich' : ''}">${bossTeams.map(team => renderBossCounterPreview({ ...team, boss })).join('')}</div>`;
  const teams = getTeams().filter(team => (boss.relatedCompositionIds || []).includes(team.id));
  return teams.length ? `<div class="team-list">${teams.map(renderTeamCard).join('')}</div>` : `<p class="guide-development-note">No boss-specific team compositions are documented yet. <a href="#game/darkest-dungeon/teams">Browse existing compositions</a> (not assessed for this encounter).</p>`;
}

function renderBossSources(boss) {
  const sources = bossSources(boss);
  return sources.length ? `<ul class="boss-source-list">${sources.map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a><small>${escapeHtml(source.verificationStatus)}</small></li>`).join('')}</ul>` : '<p>Source references have not yet been recorded.</p>';
}

function renderBossSequence(boss) {
  const roster = structuredGameContent.bosses;
  const index = roster.findIndex(entry => entry.id === boss.id);
  const previous = roster[(index - 1 + roster.length) % roster.length];
  const next = roster[(index + 1) % roster.length];
  const name = entry => entry.spoilerSensitive && !boss.spoilerSensitive ? 'Spoiler-sensitive encounter' : entry.name;
  return `<nav class="boss-sequence" aria-label="Browse boss entries"><a href="#game/darkest-dungeon/bosses/${escapeHtml(previous.routeId)}"><span>← Previous</span><strong>${escapeHtml(name(previous))}</strong></a><a href="#game/darkest-dungeon/bosses">All bosses</a><a href="#game/darkest-dungeon/bosses/${escapeHtml(next.routeId)}"><span>Next →</span><strong>${escapeHtml(name(next))}</strong></a></nav>`;
}

function renderBossCriticalWarning(boss) {
  if (boss.routeId === 'swine-prince') return `<aside class="boss-critical-warning" role="note" aria-label="Critical Swine Prince warning"><strong>Do not damage Wilbur before defeating the Swine Prince.</strong><p>A damaging hit triggers Enraged Destruction against the whole party. Killing Wilbur first makes the Prince repeat that attack. Keep attacks and automatic Riposte effects on the Prince.</p><details><summary>Advanced exception</summary><p>Some non-damaging control skills can stun Wilbur without triggering retaliation, including Bounty Hunter’s Flashbang and Plague Doctor’s Blinding Gas. This is optional advanced control; the safer default remains focusing the Prince. Rallying Flare clears Mark and Stun from other party members, but not the Arbalest herself.</p></details></aside>`;
  const mistake = boss.commonMistakes?.find(entry => entry.text && entry.verification?.status === 'reference-checked');
  return mistake ? `<aside class="planner-encounter-warning" role="note"><strong>Encounter warning · ${escapeHtml(mistake.name)}</strong><p>${escapeHtml(mistake.text)}</p></aside>` : '';
}

function renderBossDetail(boss) {
  const available = boss.guideStatus === 'available';
  const regionNames = boss.regionIds.map(id => structuredGameContent.regions.find(region => region.id === id)?.name).filter(Boolean);
  const commonMistakes = boss.commonMistakes?.length ? `<section class="boss-detail-section" aria-labelledby="boss-mistakes-heading"><div class="section-heading"><h2 id="boss-mistakes-heading">Common mistakes to avoid</h2><span>Encounter-specific</span></div>${renderBossFactList(boss.commonMistakes, 'boss-mistake-list')}</section>` : '';
  const detail = available ? `<section class="boss-detail-section" aria-labelledby="boss-mechanics-heading"><div class="section-heading"><h2 id="boss-mechanics-heading">Verified mechanics</h2><span>Reference-checked facts</span></div>${renderBossFactList(boss.mechanics)}</section>
    <section class="boss-detail-section" aria-labelledby="boss-difficulty-heading"><div class="section-heading"><h2 id="boss-difficulty-heading">Difficulty, variants & resistances</h2><span>Published campaign values</span></div>${renderBossVariants(boss)}</section>
    <section class="boss-detail-section" aria-labelledby="boss-attacks-heading"><div class="section-heading"><h2 id="boss-attacks-heading">Important attacks</h2><span>Selected encounter moves</span></div>${renderBossFactList(boss.attacks, 'boss-attack-list')}</section>
    <section class="boss-detail-section" aria-labelledby="boss-tactics-heading"><div class="section-heading"><h2 id="boss-tactics-heading">Tactical considerations</h2><span>Editorial · source-informed</span></div>${renderBossFactList(boss.tacticalConsiderations, 'boss-tactics-list')}</section>${commonMistakes}`
    : `<section class="boss-detail-section"><div class="section-heading"><h2>Encounter guide</h2><span>In development</span></div><p class="panel guide-development-note">This entry currently records the boss identity, category, location, and requirements. Mechanics, variants, attacks, resistances, and tactics have not yet been researched for this guide.</p></section>`;
  const dlcLabel = requirementLabel(boss.requirements);
  const titleCategory = boss.categoryIds.map(bossCategoryName).join(' · ');
  const swineWarning = boss.routeId === 'swine-prince' ? renderBossCriticalWarning(boss) : '';
  return `<a class="back-link" href="#game/darkest-dungeon/bosses">← All bosses</a>
    <header class="boss-detail-hero"><div class="boss-detail-copy"><p class="eyebrow">${escapeHtml(titleCategory)} · ${escapeHtml(dlcLabel)}</p><h1 id="page-title" tabindex="-1">${escapeHtml(boss.name)}</h1>${boss.aliases?.length ? `<p class="boss-aliases">Also known as ${escapeHtml(boss.aliases.join(', '))}</p>` : ''}<p class="lede">${escapeHtml(boss.summary)}</p><span class="boss-status ${available ? 'is-available' : ''}">${available ? 'Detailed guide available' : 'Guide in development'}</span></div>${renderEntryArtwork('bosses', boss, 'primary', `<div class="boss-artwork boss-detail-art" data-boss-theme="${escapeHtml(boss.categoryIds[0]?.split(':').at(-1) || 'ruins')}" role="img" aria-label="Atmospheric placeholder for ${escapeHtml(boss.name)}; no local portrait available"><span aria-hidden="true">${escapeHtml(boss.name.split(/\s+/).map(word => word[0]).join('').slice(0, 3).toUpperCase())}</span><small>No local portrait · CSS artwork placeholder</small></div>`)}${renderEntryArtwork('bosses', boss, 'banner')}</header>
    ${swineWarning}<section class="boss-detail-section" aria-labelledby="boss-context-heading"><div class="section-heading"><h2 id="boss-context-heading">Region & encounter context</h2><span>${escapeHtml(boss.regionLabel)}</span></div><div class="boss-context-grid"><article class="panel"><h3>Encounter location</h3><p>${regionNames.length ? escapeHtml(regionNames.join(' · ')) : escapeHtml(boss.regionLabel)}</p></article><article class="panel"><h3>Requirements</h3><p>${escapeHtml(dlcLabel)}</p></article><article class="panel"><h3>Version and source status</h3><p>Campaign reference · not tested against an installed patch</p></article></div></section>
    ${detail}
    <section class="boss-detail-section" aria-labelledby="boss-heroes-heading"><div class="section-heading"><h2 id="boss-heroes-heading">Related hero guides</h2><span>Links for further reading</span></div>${renderRelatedBossHeroes(boss)}</section>
    <section class="boss-detail-section" aria-labelledby="boss-teams-heading"><div class="section-heading"><h2 id="boss-teams-heading">Related team compositions</h2><span>Boss-specific relationship only</span></div>${renderRelatedBossTeams(boss)}</section>
    <section class="boss-detail-section" aria-labelledby="boss-sources-heading"><div class="section-heading"><h2 id="boss-sources-heading">Sources & verification</h2><span>${boss.verification.status}</span></div><p class="guide-data-note">${available ? 'Mechanics and listed values were compared with the linked references. The installed game patch was not tested.' : 'Only the boss listing and encounter grouping are reference-checked; detailed content remains unverified and is not presented as fact.'}</p>${renderBossSources(boss)}</section>
    ${renderBossSequence(boss)}`;
}

function filterBossCollection() {
  const query = document.getElementById('boss-search-input')?.value.trim().toLowerCase() || '';
  const regionId = document.getElementById('boss-region-filter')?.value || 'all';
  const cards = [...document.querySelectorAll('[data-boss-card]')];
  let visible = 0;
  for (const card of cards) {
    const matches = card.dataset.searchText.includes(query) && (regionId === 'all' || card.dataset.regionIds.split(' ').includes(regionId));
    card.hidden = !matches;
    if (matches) visible += 1;
  }
  document.querySelectorAll('[data-boss-group]').forEach(group => {
    const count = group.querySelectorAll('[data-boss-card]:not([hidden])').length;
    group.hidden = count === 0;
    if (group.matches('details.boss-spoiler-group') && query && count) group.open = true;
  });
  const status = document.getElementById('boss-search-status');
  const empty = document.getElementById('boss-empty-state');
  if (status) status.textContent = `${visible} matching ${visible === 1 ? 'boss entry' : 'boss entries'}.`;
  if (empty) empty.hidden = visible > 0;
}

function renderTeamDetail(team) {
  return `<a class="back-link" href="#game/darkest-dungeon/teams">← All team compositions</a>
    <section class="page-intro composition-detail" aria-labelledby="page-title"><p class="eyebrow">Darkest Dungeon / Team composition · ${requirementLabel(team.requirements)}</p>
      <h1 id="page-title" tabindex="-1">${escapeHtml(team.name)}</h1><p class="lede">${escapeHtml(team.build)} · Editorial example, not playtested.</p></section>
    ${renderTeam(team)}
    <p class="composition-meta"><strong>Tier:</strong> No rating assigned <span aria-hidden="true">·</span> <strong>Dungeon suitability:</strong> Not assessed</p>
    <p class="composition-meta">Prepared from the <a href="#hero/${escapeHtml(team.hero.id)}/overview">${escapeHtml(team.hero.name)} guide</a>. Other hero guides are not yet available.</p>`;
}

function renderGallery() {
  return renderHeroGallery(heroes);
}

function renderBuild(build, index) {
  return `<article class="panel build-card"><p class="eyebrow">Build 0${index + 1} / ${escapeHtml(build.label)}</p>
    <h3>${escapeHtml(build.name)}</h3><p class="small-label">${escapeHtml(build.start)}</p><p>${escapeHtml(build.description)}</p>
    <h4>Four selected combat skills</h4><ul class="skill-list">${build.skills.map(skill => `<li><strong>${escapeHtml(skill.name)}</strong><span>${escapeHtml(skill.detail)}</span></li>`).join('')}</ul>
    <h4>How to play</h4><p>${escapeHtml(build.priorities)}</p>
    <h4>Watch for</h4><p>${escapeHtml(build.limitation)}</p>
    <p class="inset-note">${escapeHtml(build.trinkets)}</p></article>`;
}

function parseSkillRanks(value) {
  return (String(value).match(/[1-4]/g) || []).map(Number);
}

function resolveSkillTarget(targets, details) {
  if (details?.target) return details.target;
  const normalized = String(targets).toLowerCase();
  if (normalized === 'self') return { side: 'self', mode: 'self' };
  if (normalized.includes('all ally') || normalized.includes('all party')) return { side: 'ally', mode: 'all' };
  if (/one ally|any ally/.test(normalized)) return { side: 'ally', mode: 'choose-one' };
  if (normalized.includes('ally') || normalized.includes('party')) return { side: 'ally', mode: 'unclassified' };
  return { side: 'enemy', mode: /\+/.test(targets) ? 'simultaneous' : 'choose-one' };
}

function renderPositionDiagram(value, label, orientation, options = {}) {
  const ranks = orientation === 'hero' ? [4, 3, 2, 1] : [1, 2, 3, 4];
  const active = new Set(orientation === 'hero' && /^any$/i.test(String(value).trim()) ? ranks : parseSkillRanks(value));
  const direction = orientation === 'hero' ? 'Rear to front' : 'Front to rear';
  const order = ranks.map(rank => `<span class="position-rank${active.has(rank) ? ' is-active' : ''}" aria-label="Rank ${rank}${active.has(rank) ? ', available' : ', unavailable'}"><span>${rank}</span></span>`).join('');
  const modeText = options.mode === 'simultaneous' ? 'All highlighted ranks at once' : options.mode === 'positions' ? 'Valid launch ranks' : 'Choose one highlighted rank';
  return `<div class="ability-rank-group position-group"><span class="position-label">${escapeHtml(label)}</span><span class="position-direction">${direction}</span><div class="position-diagram ${orientation}-positions" role="img" aria-label="${escapeHtml(label)}: ${ranks.map(rank => `rank ${rank} ${active.has(rank) ? 'available' : 'unavailable'}`).join(', ')}">${order}</div><span class="position-mode">${escapeHtml(modeText)}</span></div>`;
}

function renderAbilityTarget(targets, target, heroName) {
  if (target.side === 'self') return `<div class="ability-rank-group position-group"><span class="position-label">Target</span><span class="position-direction">Self-target</span><div class="special-target" aria-label="Targets the ${escapeHtml(heroName)}">SELF</div><span class="position-mode">Affects the ${escapeHtml(heroName)}</span></div>`;
  if (target.side === 'none') return `<div class="ability-rank-group position-group"><span class="position-label">Target</span><span class="position-direction">No rank target</span><div class="special-target">—</div><span class="position-mode">${escapeHtml(targets)}</span></div>`;
  if (target.mode === 'unclassified') return `<div class="ability-rank-group position-group"><span class="position-label">Target</span><span class="position-direction">Target scope unavailable</span><div class="special-target">${escapeHtml(targets)}</div><span class="position-mode">Rank details are not classified yet</span></div>`;
  if (target.side !== 'ally' && !parseSkillRanks(targets).length) return `<div class="ability-rank-group position-group"><span class="position-label">Target</span><span class="position-direction">No rank diagram</span><div class="special-target">${escapeHtml(targets)}</div><span class="position-mode">Target rank details unavailable</span></div>`;
  const label = target.side === 'ally' ? (target.mode === 'all' ? 'Allies affected' : 'Choose an ally') : 'Enemy ranks';
  const rankValue = target.side === 'ally' ? '4,3,2,1' : targets;
  const mode = target.mode === 'all' ? 'simultaneous' : target.mode;
  return renderPositionDiagram(rankValue, label, target.side === 'ally' ? 'hero' : 'enemy', { mode });
}

function renderAbilityCard(skill, index, entry, heroName) {
  const [name, from, targets, damage, accuracy, crit, effect] = skill;
  const details = entry.skillDetails?.[name];
  const target = resolveSkillTarget(targets, details);
  const isAttack = target.side === 'enemy';
  const statValue = (value, attackStat) => value === '—' ? (isAttack && attackStat ? 'Unavailable' : 'Not applicable') : value;
  const effects = effect.split(';').map(item => item.trim()).filter(Boolean).concat(details?.extraEffects || []);
  const icon = details?.icon?.approvedLocal && details.icon.src
    ? `<img class="ability-icon" src="${escapeHtml(details.icon.src)}" alt="">`
    : '';
  return `<article class="ability-card"><header class="ability-card-heading">${icon}<div><span>${escapeHtml(details?.type || 'Combat skill')} · ${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(name)}</h3></div></header>
    ${details?.description ? `<p class="ability-description">${escapeHtml(details.description)}</p>` : ''}
    <div class="ability-ranks">${renderPositionDiagram(from, 'Use from', 'hero', { mode: 'positions' })}${renderAbilityTarget(targets, target, heroName)}</div>
    <dl class="ability-values"><div><dt>DMG modifier</dt><dd>${escapeHtml(statValue(damage, true))}</dd></div><div><dt>ACC</dt><dd>${escapeHtml(statValue(accuracy, true))}</dd></div><div><dt>CRIT modifier</dt><dd>${escapeHtml(statValue(crit, true))}</dd></div></dl>
    <div class="ability-effect"><strong>Effects</strong>${effects.length ? `<ul>${effects.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No additional effect listed.</p>'}</div>
    ${details?.tacticalNote ? `<p class="ability-tip"><strong>When to use it <span>(tactical suggestion)</span></strong>${escapeHtml(details.tacticalNote)}</p>` : ''}</article>`;
}

function renderAbilities(hero) {
  const entry = heroAbilities[hero.id];
  if (!entry) return '';
  if (entry.loadError) return '<section class="guide-section" aria-labelledby="abilities"><h2 id="abilities" tabindex="-1">Combat abilities</h2><p class="guide-data-note">The Crusader data file could not be loaded. Check that the static data file is present in the published site.</p></section>';
  const legacyNote = !hero.guide && !hero.overview
    ? '<p class="guide-data-note">Existing level-one community reference; details have not been independently verified for this guide.</p>'
    : '';
  return `<section class="guide-section ability-section" aria-labelledby="abilities"><div class="section-heading"><h2 id="abilities" tabindex="-1">Combat abilities</h2><span>07 / ${entry.skills.length} skills · Level 1 reference</span></div>
    <p class="section-intro">Compare launch positions, targets, values, and effects. Values describe skill level 1; skill progression is recorded separately below.</p>${legacyNote}
    <div class="ability-grid">${entry.skills.map((skill, index) => renderAbilityCard(skill, index, entry, hero.name)).join('')}</div>
    <details class="ability-glossary"><summary>How to read combat skills</summary><p>Hero positions run from rear to front (<strong>4 → 1</strong>); enemy positions run from front to rear (<strong>1 → 4</strong>). Crimson ranks are valid positions and muted ranks are unavailable. Enemy skills let you choose one highlighted rank unless marked as hitting all highlighted ranks at once. Ally-target skills show party ranks; <strong>SELF</strong> means the hero is the target.</p><p>Movement labels describe the hero or enemy changing ranks: <strong>forward/back</strong> moves the hero, while <strong>knockback</strong> moves the target enemy. These are separate from the targeting diagram.</p><p><strong>DMG modifier</strong> changes base damage. <strong>ACC</strong> is base accuracy before enemy Dodge. <strong>CRIT modifier</strong> changes critical-hit chance. <strong>PROT</strong> reduces direct damage, not damage over time. <strong>SPD</strong> means Speed. A successful <strong>Stun</strong> makes an enemy lose its next turn. <strong>Bleed</strong> and <strong>Blight</strong> deal damage over multiple rounds. Listed base effect chances are before target resistance, which can reduce the actual chance to apply. <strong>Riposte</strong> lets the hero counter eligible attacks directed at them; Stun disables it.</p><p>${escapeHtml(entry.note || abilityReference.note)}</p></details></section>`;
}

function renderHeroHeader(hero) {
  const role = hero.role || hero.roleTags.join(' · ');
  const summary = hero.summary || `Full ${hero.name} guide details are in development. Current class labels and skill references are shown below with their verification status.`;
  return `<a class="back-link" href="#game/darkest-dungeon/heroes">← All heroes</a>
    <header class="guide-header ability-guide-header"><div><p class="eyebrow">Darkest Dungeon I / ${requirementLabel(hero.requirements)}</p><h1 id="page-title" tabindex="-1">${escapeHtml(hero.name)}</h1>
      ${hero.epithet ? `<p class="epithet">${escapeHtml(hero.epithet)}</p>` : ''}<p class="role">${escapeHtml(role)}</p><p class="lede">${escapeHtml(summary)}</p>
      ${hero.preferredPositions?.length ? `<p class="card-positions">Preferred combat positions <strong>${hero.preferredPositions.join(' · ')}</strong><span>4 = rear · 1 = front</span></p>` : ''}</div>${renderHeroPortrait(hero)}</header>`;
}

function renderHeroOverview(hero) {
  const overview = hero.guide || hero.overview || {};
  const hasOverview = Boolean(overview.strengths?.length || overview.weaknesses?.length);
  const positioning = hero.preferredPositions?.length
    ? `<div class="position-panel"><h3>Where to stand</h3>${renderPositions(hero)}<p>${escapeHtml(overview.positions || 'Preferred positions are shown from available guide data.')}</p></div>`
    : '<p class="guide-data-note">Preferred positions have not yet been verified for this class.</p>';
  return `<section class="guide-section" aria-labelledby="overview"><div class="section-heading"><h2 id="overview" tabindex="-1">Overview & positioning</h2><span>02 / Class profile</span></div>
    ${hasOverview ? `<div class="two-columns"><article class="panel"><h3>Strengths</h3>${renderList(overview.strengths || [])}</article><article class="panel"><h3>Weaknesses</h3>${renderList(overview.weaknesses || [])}</article></div>` : `<article class="panel guide-development"><p>Detailed role, strengths, and weaknesses are still being documented. Gallery role tags are broad capability labels, not a complete build recommendation.</p><strong>Current role tags: ${escapeHtml(hero.roleTags.join(' · '))}</strong></article>`}
    ${positioning}
    ${overview.beginnerAdvice ? `<aside class="inset-note guide-beginner-advice"><strong>Beginner advice</strong><p>${escapeHtml(overview.beginnerAdvice)}</p></aside>` : ''}
  </section>`;
}

function renderGuideDevelopmentSection(id, title, message, linkHref = '', linkLabel = '', number = '', status = 'Guide in development') {
  return `<section class="guide-section" aria-labelledby="${id}"><div class="section-heading"><h2 id="${id}" tabindex="-1">${title}</h2><span>${number}${number ? ' / ' : ''}${status}</span></div>
    <article class="panel guide-development"><p>${escapeHtml(message)}</p>${linkHref ? `<a href="${linkHref}">${escapeHtml(linkLabel)} →</a>` : ''}</article></section>`;
}

function renderHeroTeamSection(hero) {
  const teams = hero.guide?.teams?.map(team => ({ ...team, hero })) || getTeams().filter(team => team.members.includes(hero.name));
  if (!teams.length) return renderGuideDevelopmentSection('teams', 'Featured team compositions', `No existing composition containing ${hero.name} is available yet.`, '#game/darkest-dungeon/teams', 'Browse current compositions', '03');
  return `<section class="guide-section" aria-labelledby="teams"><div class="section-heading"><h2 id="teams" tabindex="-1">Featured team compositions</h2><span>03 / Starting formations</span></div>
    <p class="section-intro">Existing editorial compositions containing ${escapeHtml(hero.name)}. Starting formations read from position 4 at the rear to position 1 at the front.</p><div class="team-list">${teams.map(renderTeamCard).join('')}</div></section>`;
}

function renderBossSection(hero) {
  const recommendations = hero.bossRecommendations || [];
  if (!recommendations.length) return renderGuideDevelopmentSection('bosses', 'Recommended boss matchups', `Boss recommendations for ${hero.name} have not yet been assessed against documented sources.`, '', '', '04', 'Not yet assessed');
  return `<section class="guide-section" aria-labelledby="bosses"><div class="section-heading"><h2 id="bosses" tabindex="-1">Recommended boss matchups</h2><span>04 / Source-backed recommendations</span></div>
    <div class="boss-grid">${recommendations.map(matchup => `<article class="panel boss-card"><p class="eyebrow">${escapeHtml(matchup.assessment || 'Documented matchup')}</p><h3>${escapeHtml(matchup.boss)}</h3><p>${escapeHtml(matchup.reason)}</p>${matchup.source ? `<a href="${escapeHtml(matchup.source)}" target="_blank" rel="noreferrer">Matchup reference ↗</a>` : ''}</article>`).join('')}</div></section>`;
}

function renderHeroTrinketSection(hero) {
  const trinkets = getTrinkets().filter(trinket => trinket.hero.id === hero.id);
  if (!trinkets.length) return renderGuideDevelopmentSection('trinkets', 'Recommended trinkets', `Class-specific equipment recommendations for ${hero.name} are still in development.`, '#game/darkest-dungeon/trinkets', 'Browse available item records', '05');
  return `<section class="guide-section" aria-labelledby="trinkets"><div class="section-heading"><h2 id="trinkets" tabindex="-1">Recommended trinkets</h2><span>05 / Equipment notes</span></div>
    <p class="section-intro">Picks for ${escapeHtml(hero.name)} · ${structuredGameContent ? 'Reference values; installed patch not checked. Availability is not guaranteed. Verified local game icons are shown when available; missing artwork keeps its fallback.' : 'Item effects and availability cannot be shown until the encyclopedia data loads.'}</p><div class="two-columns">${trinkets.map(renderTrinket).join('')}</div>
    <p class="section-intro"><a href="#game/darkest-dungeon/trinkets">Browse available item records →</a></p></section>`;
}

function renderUniqueAttributes(hero) {
  const attributes = hero.uniqueAttributes || [];
  if (!attributes.length) return renderGuideDevelopmentSection('attributes', 'Unique attributes & class mechanics', `No class-specific mechanics are documented for ${hero.name} in this guide yet.`, '', '', '06');
  return `<section class="guide-section" aria-labelledby="attributes"><div class="section-heading"><h2 id="attributes" tabindex="-1">Unique attributes & class mechanics</h2><span>06 / What sets this hero apart</span></div>
    <div class="mechanic-grid">${attributes.map(attribute => `<article class="panel mechanic-card"><h3>${escapeHtml(attribute.name)}</h3><p>${escapeHtml(attribute.description)}</p>${attribute.source ? `<a href="${escapeHtml(attribute.source)}" target="_blank" rel="noreferrer">Mechanics reference ↗</a>` : ''}</article>`).join('')}</div></section>`;
}

function renderProgressionSection(hero) {
  const entry = heroAbilities[hero.id];
  const progression = entry?.progression || [];
  const detail = progression.length
    ? `<div class="table-scroll"><table class="progression-table"><caption>${escapeHtml(hero.name)} combat skill upgrades</caption><thead><tr><th scope="col">Skill</th><th scope="col">Level</th><th scope="col">DMG</th><th scope="col">ACC</th><th scope="col">CRIT</th><th scope="col">Effects</th></tr></thead><tbody>${progression.flatMap(skill => skill.levels.map(level => `<tr><th scope="row">${escapeHtml(skill.name)}</th><td>${escapeHtml(level.level)}</td><td>${escapeHtml(level.damage ?? '—')}</td><td>${escapeHtml(level.accuracy ?? '—')}</td><td>${escapeHtml(level.crit ?? '—')}</td><td>${escapeHtml(level.effects ?? '—')}</td></tr>`)).join('')}</tbody></table></div>`
    : '<p>Level 2–5 values have not yet been verified. Only the level-one reference above is available.</p>';
  return `<section class="guide-section" aria-labelledby="progression"><div class="section-heading"><h2 id="progression" tabindex="-1">Skill upgrades & progression</h2><span>08 / Detailed values</span></div><details class="skill-progression"><summary>Show skill levels 1–5</summary>${detail}</details></section>`;
}

function renderStrategySection(hero) {
  const builds = hero.guide?.builds || [];
  const sourceLinks = new Map();
  const entry = heroAbilities[hero.id];
  if (entry?.source) sourceLinks.set(entry.source, 'Combat skill reference');
  if (entry?.detailsSource) sourceLinks.set(entry.detailsSource, 'Ability descriptions and mechanics');
  if (entry?.strategySource) sourceLinks.set(entry.strategySource, 'Strategy reference');
  if (entry?.mechanicsSource) sourceLinks.set(entry.mechanicsSource, 'Mechanics reference');
  hero.guide?.sourceIds?.forEach(id => {
    const source = sources[id];
    if (source) sourceLinks.set(source.url, source.title);
  });
  const strategy = builds.length
    ? `<p class="section-intro">Existing four-skill builds are editorial recommendations, not playtested guarantees.</p><div class="two-columns">${builds.map(renderBuild).join('')}</div>`
    : '<article class="panel guide-development"><p>Class-specific skill builds and strategy notes are still in development.</p></article>';
  return `<section class="guide-section" aria-labelledby="builds"><div class="section-heading"><h2 id="builds" tabindex="-1">Strategy, limitations & sources</h2><span>09 / Field notes</span></div>
    ${strategy}${hero.guide?.verification ? `<p class="guide-data-note">${escapeHtml(hero.guide.verification)}</p>` : ''}
    <details class="references"><summary>Sources & verification</summary><p>${escapeHtml(entry?.note || abilityReference.note)}</p><p>Level-one combat values are reference snapshots. The installed game version and patch were not tested.</p>${sourceLinks.size ? `<ul>${[...sourceLinks].map(([url, label]) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)} ↗</a></li>`).join('')}</ul>` : '<p>Sources for expanded guide content are still being collected.</p>'}</details>
  </section>`;
}

function renderHeroSequence(hero) {
  const index = heroes.findIndex(entry => entry.id === hero.id);
  const previous = heroes[(index - 1 + heroes.length) % heroes.length];
  const next = heroes[(index + 1) % heroes.length];
  return `<section class="guide-section hero-sequence-section" aria-labelledby="hero-sequence-title"><div class="section-heading"><h2 id="hero-sequence-title">Previous / Next hero</h2><span>10 / Continue the roster</span></div><nav class="hero-sequence" aria-label="Browse heroes"><a href="#hero/${escapeHtml(previous.id)}/overview"><span>← Previous hero</span><strong>${escapeHtml(previous.name)}</strong></a><a href="#game/darkest-dungeon/heroes">All heroes</a><a href="#hero/${escapeHtml(next.id)}/overview"><span>Next hero →</span><strong>${escapeHtml(next.name)}</strong></a></nav></section>`;
}

function renderHeroPage(hero) {
  if (hero.contentUnavailable) return renderContentError('Crusader');
  return `${renderHeroHeader(hero)}${renderHeroGuideNavigation(hero)}
    ${renderHeroOverview(hero)}
    ${renderHeroTeamSection(hero)}
    ${renderBossSection(hero)}
    ${renderHeroTrinketSection(hero)}
    ${renderUniqueAttributes(hero)}
    ${renderAbilities(hero)}
    ${renderProgressionSection(hero)}
    ${renderStrategySection(hero)}
    ${renderHeroSequence(hero)}`;
}

function renderTeamPortrait(name) {
  const hero = heroes.find(entry => entry.name === name);
  const portrait = hero?.portrait || (hero?.galleryArt?.src ? hero.galleryArt : null);
  const initials = name.split(' ').map(word => word[0]).join('');
  const unavailable = `<div class="portrait-unavailable" role="img" aria-label="${escapeHtml(name)} portrait unavailable"><span aria-hidden="true">${escapeHtml(initials)}</span><small>Portrait unavailable</small></div>`;
  // Shieldbreaker's only checked-in legacy portrait is a small, unverified image; keep a clear frame until authentic local art exists.
  const fallback = hero?.id === 'shieldbreaker' ? unavailable : portrait && !portrait.placeholder ? renderImage(portrait, 'team-portrait') : unavailable;
  return hero ? `<span class="team-art">${renderEntryArtwork('heroes', hero, 'thumbnail', fallback)}</span>` : fallback;
}

function renderHeroName(name) {
  const hero = heroes.find(entry => entry.name === name && (entry.guide || heroAbilities[entry.id]));
  return hero
    ? `<a href="#hero/${escapeHtml(hero.id)}/${hero.guide ? 'overview' : 'abilities'}">${escapeHtml(name)}</a>`
    : `<span class="unlinked-hero-name">${escapeHtml(name)}</span>`;
}

// Keep the portrait frame useful if a local image is later moved or removed.
main.addEventListener('error', event => {
  if (!event.target.matches('.guide-portrait img')) return;
  const figure = event.target.closest('.guide-portrait');
  figure.classList.add('image-failed');
  const fallback = figure.querySelector('[data-portrait-fallback]');
  if (fallback) fallback.hidden = false;
}, true);

function renderPartyMembers(team) {
  return `<ol class="party" aria-label="Starting formation, positions 4 through 1">${team.members.map((name, index) => `<li><span>Position ${4 - index}</span>${renderTeamPortrait(name)}<strong>${renderHeroName(name)}</strong></li>`).join('')}</ol>`;
}

function renderTeamCard(team) {
  const searchText = `${team.name} general-purpose unassessed ${team.build} ${requirementLabel(team.requirements)} ${team.members.join(' ')} ${team.synergy}`;
  return `<article class="panel composition-overview-card" data-team-id="${escapeHtml(team.id)}" data-team-region="unassessed" data-team-boss="unassessed" data-team-category="unassessed" data-composition-card data-search-text="${escapeHtml(searchText.toLowerCase())}">
    <p class="eyebrow">General-purpose · Unassessed · ${requirementLabel(team.requirements)}</p>
    <h3><a href="#game/darkest-dungeon/teams/${escapeHtml(team.id)}">${escapeHtml(team.name)}</a></h3>
    <p class="team-card-association">No verified boss or region association</p><p class="team-card-tier"><strong>Difficulty:</strong> Not assessed</p>
    <p class="formation-label">Formation · Ranks 4 → 1</p>${renderPartyMembers(team)}
    <div class="composition-strategy"><h4>Why this team works</h4><p>${escapeHtml(team.synergy)}</p></div>
    <a class="team-details-link" href="#game/darkest-dungeon/teams/${escapeHtml(team.id)}">View full team guide <span aria-hidden="true">→</span></a>
  </article>`;
}

function renderTeam(team) {
  const recommendedBuild = team.hero?.guide.builds.find(build => build.name === team.build);
  return `<article class="panel team-card"><div class="team-card-header"><p class="eyebrow">${requirementLabel(team.requirements)} / ${escapeHtml(team.build)}</p>
    <span class="editorial-label">Editorial example · No tier rating</span></div>
    <h3>${escapeHtml(team.name)}</h3><p class="formation-label">Starting formation · Rear → front</p>
    ${renderPartyMembers(team)}
    <div class="composition-summary"><div><h4>Strategy and synergy</h4><p>${escapeHtml(team.synergy)}</p>
      ${recommendedBuild ? `<h4>${escapeHtml(team.hero.name)} skill set</h4>${renderList(recommendedBuild.skills.map(skill => skill.name))}` : ''}</div>
    <div><h4>Opening priorities</h4>${renderList(team.priorities, true)}</div>
    <div><h4>Strengths</h4>${renderList(team.strengths || [])}<h4>Weaknesses and limitations</h4><p>${escapeHtml(team.limitation)}</p></div></div>
    <p class="composition-meta"><strong>Dungeon suitability:</strong> Not assessed · <strong>Requirements:</strong> ${requirementLabel(team.requirements)}</p></article>`;
}

function renderTrinket(trinket) {
  if (trinket.contentUnavailable) return `<article class="panel trinket-card"><h3>${escapeHtml(trinket.name || trinket.routeId)}</h3><p>Item details are unavailable because the encyclopedia data could not be loaded. Reload the page to try again.</p></article>`;
  return `<article class="panel trinket-card"><div class="trinket-heading">
    ${renderEntryArtwork('trinkets', trinket, 'thumbnail')}
    <div><p class="eyebrow">${escapeHtml(trinket.rarity)}</p><h3>${escapeHtml(trinket.name)}</h3><p class="small-label">${requirementLabel(trinket.requirements)}</p></div></div>
    <p class="selection-label">${escapeHtml(trinket.use)}</p><dl class="effects"><dt>Benefits</dt><dd class="benefits">${trinket.effects.map(escapeHtml).join('<br>')}</dd><dt>Penalties</dt><dd class="penalties">${trinket.drawbacks.map(escapeHtml).join('<br>')}</dd></dl>
    <h4>Why choose it</h4><p>${escapeHtml(trinket.advice)}</p><h4>Accessible alternative</h4><p>${escapeHtml(trinket.alternative)}</p>
    <a class="source-link" href="${escapeHtml(structuredGameContent?.sources.find(source => source.id === trinket.source)?.url || sources[trinket.source]?.url || '#game/darkest-dungeon/trinkets')}">Check item reference ↗</a></article>`;
}

function activeCategoryId(route) {
  if (route.hero) return 'heroes';
  if (route.boss) return 'bosses';
  if (route.kind) return route.kind;
  if (route.view === 'team-detail') return 'teams';
  return ({ game: 'overview', heroes: 'heroes', bosses: 'bosses', teams: 'teams', 'expedition-planner': 'expedition-planner', trinkets: 'trinkets', enemies: 'enemies', items: 'items', curios: 'curios', locations: 'locations', quests: 'quests' })[route.view] || '';
}

function renderGameSidebar(route) {
  const game = games['darkest-dungeon'];
  const currentCategory = activeCategoryId(route);
  const entries = game.categories.map(category => {
    const current = category.id === currentCategory;
    if (category.comingSoon) return `<li><span class="sidebar-coming-soon"><span class="sidebar-icon" aria-hidden="true">${escapeHtml(category.icon)}</span><span>${escapeHtml(category.label)}<small>Coming soon</small></span></span></li>`;
    const href = `#game/${game.id}${category.id === 'overview' ? '' : `/${category.view}`}`;
    return `<li><a href="${href}"${current ? ' aria-current="page"' : ''}><span class="sidebar-icon" aria-hidden="true">${escapeHtml(category.icon)}</span><span>${escapeHtml(category.label)}</span></a></li>`;
  }).join('');
  return `<aside class="game-sidebar" aria-label="${escapeHtml(game.name)} sections" data-game-theme="${escapeHtml(game.theme)}">
    <button class="sidebar-toggle" type="button" aria-expanded="false" aria-controls="game-sidebar-links">Browse Darkest Dungeon</button>
    <nav id="game-sidebar-links" class="game-sidebar-links" aria-label="Darkest Dungeon categories"><ul>${entries}</ul></nav></aside>`;
}

function readRoute(hash) {
  const path = hash.replace(/^#/, '');
  if (!path || path === 'home' || path === 'home/games') return { view: 'home', library: path === 'home/games' };
  // Preserve existing bookmarks without rewriting history entries.
  if (path === 'heroes') return { view: 'heroes', game: true };
  const parts = path.split('/');
  if (!structuredGameContent && parts[0] === 'game' && parts[1] === 'darkest-dungeon'
      && ['bosses', 'enemies', 'trinkets', 'items', 'curios', 'locations', 'quests', 'expedition-planner'].includes(parts[2])
      && parts.length <= 4) return { view: 'content-unavailable', game: true };
  const preview = portalGames.find(game => !game.available && game.id === parts[1]);
  if (parts[0] === 'game' && parts.length === 2 && preview) return { view: 'preview', preview };
  if (parts[0] === 'game' && parts[1] === 'darkest-dungeon' && parts.length <= 3) {
    const view = parts[2] || 'game';
    if (['game', 'heroes', 'bosses', 'teams', 'expedition-planner', 'trinkets', 'enemies', 'items', 'curios', 'locations', 'quests'].includes(view)) return { view, game: true };
  }
  if (parts[0] === 'game' && parts[1] === 'darkest-dungeon' && parts.length === 4) {
    const kind = parts[2];
    if (['enemies','trinkets','items','curios','locations','quests'].includes(kind)) {
      const record = collectionRecords(kind).find(entry => entry.routeId === parts[3]);
      if (record) return { view: `${kind}-detail`, kind, record, game: true };
    }
  }
  if (parts[0] === 'game' && parts[1] === 'darkest-dungeon' && parts[2] === 'bosses' && parts.length === 4) {
    const boss = structuredGameContent?.bosses.find(entry => entry.routeId === parts[3]);
    if (boss) return { view: 'boss-detail', boss, game: true };
  }
  if (parts[0] === 'game' && parts[1] === 'darkest-dungeon' && parts[2] === 'teams' && parts.length === 4) {
    const team = findBossCounterTeam(parts[3]) || getTeams().find(entry => entry.id === parts[3]);
    if (team) return { view: 'team-detail', team, game: true };
  }
  if (parts[0] === 'hero' && parts.length <= 3) {
    const hero = heroes.find(entry => entry.id === parts[1] && (entry.guide || heroAbilities[entry.id]));
    const section = parts[2] || 'overview';
    if (hero && sections.includes(section)) return { view: 'hero', hero, section, game: true };
  }
  return { view: 'missing' };
}

function renderBreadcrumbs(route) {
  if (route.view === 'home') return '';
  const crumbs = [{ label: 'Home', href: '#home' }];
  if (route.game) crumbs.push({ label: 'Darkest Dungeon', href: '#game/darkest-dungeon' });
  if (route.view === 'hero') {
    crumbs.push({ label: 'Heroes', href: '#game/darkest-dungeon/heroes' });
    crumbs.push({ label: route.hero.name });
  } else if (route.view === 'team-detail') {
    crumbs.push({ label: 'Team Compositions', href: '#game/darkest-dungeon/teams' });
    crumbs.push({ label: route.team.name });
  } else if (route.view === 'boss-detail') {
    crumbs.push({ label: 'Bosses', href: '#game/darkest-dungeon/bosses' });
    crumbs.push({ label: route.boss.name });
  } else if (route.kind && route.record) {
    const title = collectionConfig[route.kind].title;
    crumbs.push({ label: title, href: `#game/darkest-dungeon/${route.kind}` });
    crumbs.push({ label: route.record.name });
  } else if (route.view !== 'game') {
    crumbs.push({ label: pageTitles[route.view] });
  }
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${crumbs.map((crumb, index) =>
    `<li>${index === crumbs.length - 1 ? `<span aria-current="page">${escapeHtml(crumb.label)}</span>` : `<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>`}</li>`
  ).join('')}</ol></nav>`;
}

const pageTitles = { 'content-unavailable': 'Encyclopedia unavailable', home: 'Gaming Wiki', game: 'Darkest Dungeon', heroes: 'Heroes', bosses: 'Bosses', 'boss-detail': 'Boss guide', teams: 'Team Compositions', 'team-detail': 'Team composition', 'expedition-planner': 'Expedition Planner', trinkets: 'Trinkets', enemies: 'Enemies', items: 'Items & Provisions', curios: 'Curios', locations: 'Locations', quests: 'Quests', missing: 'Page not found' };

function renderContentError(title = 'Encyclopedia unavailable') {
  return `<section class="page-intro"><h1 id="page-title" tabindex="-1">${escapeHtml(title)}</h1><p class="lede" role="status">The Darkest Dungeon encyclopedia data could not be loaded. Reload the page to try again. Existing hero guides and team compositions are still available.</p><a href="#game/darkest-dungeon/heroes">Browse heroes</a> · <a href="#game/darkest-dungeon/teams">Browse teams</a></section>`;
}

function renderPage(route) {
  if (route.preview) return renderGamePreview(route.preview);
  const views = { 'content-unavailable': renderContentError, home: renderHome, game: renderGameLanding, heroes: renderGallery,
    bosses: renderBossCollection, teams: () => renderCollection('teams'), 'expedition-planner': renderExpeditionPlanner, trinkets: () => renderEncyclopediaCollection('trinkets'),
    enemies: () => renderEncyclopediaCollection('enemies'), items: () => renderEncyclopediaCollection('items'), curios: () => renderEncyclopediaCollection('curios'), locations: () => renderEncyclopediaCollection('locations'), quests: () => renderEncyclopediaCollection('quests') };
  const content = route.hero ? renderHeroPage(route.hero) : route.boss ? renderBossDetail(route.boss) : route.kind && route.record ? renderEncyclopediaDetail(route.kind, route.record) : route.view === 'team-detail' ? (route.team.boss ? renderBossCounterGuide(route.team) : renderTeamDetail(route.team)) : views[route.view] ? views[route.view]() :
    '<section class="empty-state"><h1 id="page-title" tabindex="-1">Page not found</h1><p>This page is not available.</p><a href="#home">Return home</a></section>';
  const page = renderBreadcrumbs(route) + (!structuredGameContent && route.game ? '<p class="guide-data-note" role="status">Encyclopedia data is unavailable. Some records and item details cannot be shown. Reload the page to try again.</p>' : '') + content;
  if (!route.game) return page;
  return `<div class="game-layout" data-game-theme="${escapeHtml(games['darkest-dungeon'].theme)}">${renderGameSidebar(route)}<div class="game-content">${page}</div></div>`;
}

function updateNavigation(route) {
  const activePage = route.game ? 'game' : route.preview || route.library ? 'universes' : route.view;
  document.querySelectorAll('[data-site-page]').forEach(link => {
    const active = link.dataset.sitePage === activePage;
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-section]').forEach(link => {
    if (link.dataset.section === route.section) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function showRoute() {
  commandCenter.close({ restoreFocus: false });
  const route = readRoute(location.hash);
  if (route.preview) selectedPortalGame = portalGames.indexOf(route.preview);
  document.body.classList.toggle('portal-page', route.view === 'home' || route.view === 'preview');
  const viewKey = route.preview ? `preview/${route.preview.id}` : route.hero ? `hero/${route.hero.id}` : route.boss ? `boss/${route.boss.id}` : route.kind && route.record ? `${route.kind}/${route.record.id}` : route.view === 'team-detail' ? `team/${route.team.id}` : route.view;
  const changed = viewKey !== currentView;
  if (changed) {
    main.innerHTML = renderPage(route);
    currentView = viewKey;
  }
  document.title = route.preview ? `${route.preview.name} · BM Gaming Wiki` : route.hero ? `${route.hero.name} · Gaming Wiki` : route.boss ? `${route.boss.name} · Boss Guide · BM Gaming Wiki` : route.kind && route.record ? `${route.record.name} · ${collectionConfig[route.kind].title} · BM Gaming Wiki` : route.view === 'team-detail' ? `${route.team.name} · Team Guide · BM Gaming Wiki` :
    route.view === 'home' ? 'BM Gaming Wiki' : `${pageTitles[route.view] || 'Encyclopedia unavailable'} · Gaming Wiki`;
  updateNavigation(route);
  // Every route change, including Back/Forward, lands keyboard focus in its content.
  const sectionTarget = route.hero && !route.hero.contentUnavailable && (!changed || route.section !== 'overview');
  const target = document.getElementById(route.library ? 'games-heading' : sectionTarget ? route.section : 'page-title');
  target.focus({ preventScroll: true });
  if (sectionTarget || route.library) target.scrollIntoView({ block: 'start' });
  else window.scrollTo(0, 0);
}

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView({ block: 'start' });
});

window.addEventListener('hashchange', showRoute);
window.addEventListener('storage', event => {
  if (event.key === OWNED_TRINKETS_STORAGE_KEY) {
    if (event.newValue === null) memoryOwnedTrinketIds = [];
    memoryOwnedTrinketIds = getOwnedTrinketIds();
    document.querySelectorAll('[data-owned-trinket]').forEach(input => {
      const owned = memoryOwnedTrinketIds.includes(normalizeOwnedTrinketId(input.dataset.ownedTrinket));
      input.checked = owned;
      const control = input.closest('[data-owned-control]');
      if (control) {
        control.dataset.owned = String(owned);
        const state = control.querySelector('[data-owned-state]');
        if (state) state.textContent = owned ? 'Marked owned' : 'Not marked owned';
      }
      const option = input.closest('[data-trinket-option]');
      if (option) option.dataset.owned = String(owned);
    });
    refreshTeamEquipmentReadiness();
  }
  if (event.key === EXPEDITION_ROSTER_STORAGE_KEY) {
    if (event.newValue === null) memoryExpeditionRoster = null;
    const roster = getExpeditionRoster();
    document.querySelectorAll('[data-expedition-hero]').forEach(input => { input.checked = Boolean(roster?.heroIds.includes(input.dataset.expeditionHero)); });
    const status = document.getElementById('planner-roster-status');
    if (status) status.textContent = roster ? `${roster.heroIds.length} heroes marked available. Roster is stored only in this browser.` : 'Roster availability is unknown. Mark heroes to compare teams.';
    const results = document.getElementById('expedition-planner-results');
    if (results) results.innerHTML = renderExpeditionPlannerResults();
  }
});
// Native buttons provide Tab, Enter, Space, and touch selection; mouse hover previews too.
document.addEventListener('pointerover', event => {
  const button = event.target.closest('[data-preview-game]');
  if (button && event.pointerType === 'mouse') selectPortalGame(button);
});
document.addEventListener('focusin', event => {
  const button = event.target.closest('[data-preview-game]');
  if (button) selectPortalGame(button);
});
document.addEventListener('click', event => {
  if (event.target.closest('[data-reset-expedition-roster]')) {
    const persisted = saveExpeditionRoster(null);
    document.querySelectorAll('[data-expedition-hero]').forEach(input => { input.checked = false; });
    const status = document.getElementById('planner-roster-status');
    if (status) status.textContent = persisted ? 'Roster reset. Availability is unknown.' : 'Browser storage is unavailable. Roster reset for this open session.';
    const results = document.getElementById('expedition-planner-results');
    if (results) results.innerHTML = renderExpeditionPlannerResults();
    return;
  }
  const clearOwnedButton = event.target.closest('[data-clear-owned-trinkets]');
  if (clearOwnedButton) {
    const result = clearOwnedTrinkets();
    document.querySelectorAll('[data-owned-trinket]').forEach(input => {
      input.checked = false;
      const control = input.closest('[data-owned-control]');
      if (control) {
        control.dataset.owned = 'false';
        const state = control.querySelector('[data-owned-state]');
        if (state) state.textContent = 'Not marked owned';
      }
      const option = input.closest('[data-trinket-option]');
      if (option) option.dataset.owned = 'false';
    });
    refreshTeamEquipmentReadiness();
    document.querySelectorAll('[data-ownership-storage-status]').forEach(status => { status.textContent = `${ownershipStorageNotice(result.persisted)} Owned list cleared.`; });
    return;
  }
  const previewButton = event.target.closest('[data-preview-game]');
  if (previewButton) {
    selectPortalGame(previewButton);
    return;
  }
  if (event.target.closest('[data-explore-games]')) {
    const heading = document.getElementById('games-heading');
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    return;
  }
  const sidebarToggle = event.target.closest('.sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.setAttribute('aria-expanded', sidebarToggle.getAttribute('aria-expanded') !== 'true' ? 'true' : 'false');
    return;
  }
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a');
  const hash = link?.getAttribute('href');
  // Re-selecting the current route should still return to its heading after scrolling.
  if (hash === location.hash && hash?.startsWith('#') && hash !== '#main-content') {
    event.preventDefault();
    showRoute();
  }
});

document.addEventListener('input', event => {
  if (event.target.id === 'encyclopedia-search') {
    filterEncyclopedia();
    return;
  }
  if (event.target.id === 'boss-search-input') {
    filterBossCollection();
    return;
  }
  if (event.target.id === 'team-search-input') {
    filterTeamCompositions();
    return;
  }
  if (event.target.id !== 'game-search-input') return;
  const results = renderSearchResults(event.target.value);
  document.getElementById('game-search-status').textContent = results.status;
  document.getElementById('game-search-results').innerHTML = results.markup;
});
document.addEventListener('change', event => {
  if (event.target.id === 'planner-region' || event.target.id === 'planner-boss') {
    updateExpeditionPlannerOptions();
    const results = document.getElementById('expedition-planner-results');
    if (results) results.innerHTML = renderExpeditionPlannerResults();
    return;
  }
  if (event.target.id === 'planner-difficulty') {
    const results = document.getElementById('expedition-planner-results');
    if (results) results.innerHTML = renderExpeditionPlannerResults();
    return;
  }
  if (event.target.matches('[data-expedition-hero]')) {
    const roster = getExpeditionRoster();
    const heroIds = new Set(roster?.heroIds || []);
    if (event.target.checked) heroIds.add(event.target.dataset.expeditionHero);
    else heroIds.delete(event.target.dataset.expeditionHero);
    const persisted = saveExpeditionRoster({ initialized: true, heroIds: [...heroIds] });
    const status = document.getElementById('planner-roster-status');
    if (status) status.textContent = persisted ? `${heroIds.size} heroes marked available. Roster is stored only in this browser.` : `${heroIds.size} heroes marked available for this session; browser storage is unavailable.`;
    const results = document.getElementById('expedition-planner-results');
    if (results) results.innerHTML = renderExpeditionPlannerResults();
    return;
  }
  if (event.target.matches('[data-owned-trinket]')) {
    const id = event.target.dataset.ownedTrinket;
    const owned = event.target.checked;
    const result = setOwnedTrinket(id, owned);
    updateOwnershipControls(id, owned);
    refreshTeamEquipmentReadiness();
    document.querySelectorAll('[data-ownership-storage-status]').forEach(status => { status.textContent = ownershipStorageNotice(result.persisted); });
    return;
  }
  if (event.target.id === 'boss-region-filter') filterBossCollection();
  if (event.target.id === 'encyclopedia-filter' || event.target.matches('[data-encyclopedia-filter]')) filterEncyclopedia();
  if (['team-region-filter', 'team-boss-filter', 'team-category-filter'].includes(event.target.id)) filterTeamCompositions();
});
initializeHeroGallery(main, heroes);

// Reuse the router, including its same-route focus/scroll behavior.
const commandCenter = initializeCommandCenter({
  bosses: structuredGameContent?.bosses || [],
  content: structuredGameContent,
  navigate(href) {
    if (location.hash === href) showRoute();
    else location.hash = href;
  }
});
showRoute();
