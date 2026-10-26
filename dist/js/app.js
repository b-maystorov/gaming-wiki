import { heroes, sources } from './heroes.js';
import { games } from './games.js';

const main = document.querySelector('main');
const sections = ['overview', 'builds', 'teams', 'trinkets'];
let currentView = '';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function requirementLabel(requirements) {
  const labels = [];
  if (requirements.baseGame) labels.push('Base game');
  labels.push(...requirements.dlc.map(name => `DLC: ${name}`));
  labels.push(...requirements.mods.map(name => `Mod: ${name}`));
  return labels.map(escapeHtml).join(' · ');
}

function renderImage(image, className = '') {
  const animationClass = image.animated ? ' animated-image' : '';
  const reducedMotionAlternative = image.animated
    ? `<span class="motion-alternative" role="img" aria-label="${escapeHtml(image.reducedMotionLabel)}">Animation paused for reduced motion</span>`
    : '';
  const artworkClass = image.animated ? ' animated-artwork' : '';
  return `<figure class="artwork ${className}${artworkClass}">
    <img class="image-content${animationClass}" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" width="${image.width || 320}" height="${image.height || 320}">
    ${reducedMotionAlternative}
    ${image.placeholder ? '<figcaption>Placeholder · Not game art</figcaption>' : ''}
  </figure>`;
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
  return `<section class="page-intro" aria-labelledby="page-title">
    <p class="eyebrow">Personal guides / Better-prepared adventures</p>
    <h1 id="page-title" tabindex="-1">Gaming Wiki</h1>
    <p class="lede">Practical guides for the games you play.</p>
  </section>
  <section aria-labelledby="games-heading"><div class="section-heading"><h2 id="games-heading">Choose your game</h2></div>
    <div class="game-grid">
      <a class="navigation-card available-game" href="#game/darkest-dungeon"><span class="status-label">Available</span><h3>Darkest Dungeon</h3><p>Hero guides, team compositions, and trinkets for the original campaign.</p><span class="card-action">Explore game <span aria-hidden="true">→</span></span></a>
      ${['Darkest Dungeon II', 'WoW: Forever', 'League of Legends'].map(name => `<article class="navigation-card coming-soon"><span class="status-label">Coming soon</span><h3>${name}</h3><p>Guides are not available yet.</p></article>`).join('')}
    </div>
  </section>`;
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

function getTrinkets() {
  return heroes.flatMap(hero => hero.guide ? hero.guide.trinkets.map(trinket => ({ ...trinket, hero })) : []);
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
    hero.guide.trinkets.forEach(trinket => {
      if (`${trinket.name} ${trinket.use}`.toLowerCase().includes(normalizedQuery)) {
        results.push({ title: trinket.name, kind: 'Trinket recommendation', href: '#game/darkest-dungeon/trinkets' });
      }
    });
  });
  getTeams().forEach(team => {
    if (`${team.name} ${team.build} ${team.synergy} ${team.members.join(' ')}`.toLowerCase().includes(normalizedQuery)) {
      results.push({ title: team.name, kind: 'Team composition', href: `#game/darkest-dungeon/teams/${team.id}` });
    }
  });
  return {
    status: results.length ? `${results.length} matching ${results.length === 1 ? 'entry' : 'entries'}.` : 'No matching entries in the current content.',
    markup: results.map(result => `<a href="${escapeHtml(result.href)}"><span>${escapeHtml(result.kind)}</span><strong>${escapeHtml(result.title)}</strong><span aria-hidden="true">→</span></a>`).join('')
  };
}

function renderCollection(kind) {
  const isTeams = kind === 'teams';
  const title = isTeams ? 'Team Compositions' : 'Trinkets';
  const note = isTeams ? 'Editorial formations from the available hero guides. Read positions 4–3–2–1 from rear to front; no tier ratings or location assessments are recorded.' :
    'Recommendations collected from available hero guides. Item effects are reference-checked; the installed game patch was not verified.';
  const renderer = isTeams ? renderTeam : renderTrinket;
  return `<section class="page-intro" aria-labelledby="page-title"><p class="eyebrow">Darkest Dungeon / ${title}</p>
    <h1 id="page-title" tabindex="-1">${title}</h1><p class="lede">${note}</p></section>
    <section class="collection-group" aria-label="Available ${title.toLowerCase()}"><div class="section-heading"><h2>Current entries</h2><span>Collected from implemented guides</span></div>
      ${isTeams ? `<div class="composition-search"><label for="team-search-input">Find a composition</label><input id="team-search-input" type="search" autocomplete="off" placeholder="Search names, heroes, or strategy"><p id="team-search-status" class="search-status" aria-live="polite">${getTeams().length} compositions available.</p></div>` : ''}
      <div class="${isTeams ? 'team-list' : 'two-columns'}">${(isTeams ? getTeams() : getTrinkets()).map(entry => isTeams ? renderTeamCard(entry) : renderer(entry)).join('')}</div></section>`;
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
  return `<section class="gallery-intro" aria-labelledby="page-title">
    <p class="eyebrow">Darkest Dungeon / Campaign guides</p>
    <h1 id="page-title" tabindex="-1">Heroes</h1>
    <p class="lede">Find your hero’s role, build a party, and choose the right trinkets.</p>
    <div class="intro-rule"><span>Campaign guides</span><span>${heroes.filter(hero => hero.guide).length} guide available</span></div>
  </section>
  <section aria-labelledby="gallery-heading">
    <div class="section-heading"><h2 id="gallery-heading">Available guides</h2><span>Base game · No DLC or mods required</span></div>
    <div class="hero-gallery">${heroes.map(hero => {
      const tag = hero.guide ? 'a' : 'article';
      const destination = hero.guide ? ` href="#hero/${escapeHtml(hero.id)}/overview"` : '';
      return `<${tag}${destination} class="hero-card">
        ${renderImage(hero.portrait, 'gallery-portrait')}
        <div class="hero-card-copy"><p class="eyebrow">${requirementLabel(hero.requirements)}</p>
          <h3>${escapeHtml(hero.name)}</h3><p class="role">${escapeHtml(hero.role)}</p>
          <p>${escapeHtml(hero.summary)}</p>
          <p class="card-positions">Preferred positions <strong>${hero.preferredPositions.join(' · ')}</strong><span>1 = front</span></p>
          ${hero.guide ? `<ul class="card-strengths">${hero.guide.strengths.map(strength => `<li>${escapeHtml(strength)}</li>`).join('')}</ul>` : ''}
          <span class="card-action">${hero.guide ? 'Read the guide <span aria-hidden="true">↗</span>' : 'Guide not yet available'}</span>
        </div>
      </${tag}>`;
    }).join('')}</div>
    <p class="scope-note">Currently available: Highwayman, two builds, two parties, and four trinket options.</p>
  </section>`;
}

function renderBuild(build, index) {
  return `<article class="panel build-card"><p class="eyebrow">Build 0${index + 1} / ${escapeHtml(build.label)}</p>
    <h3>${escapeHtml(build.name)}</h3><p class="small-label">${escapeHtml(build.start)}</p><p>${escapeHtml(build.description)}</p>
    <h4>Four selected combat skills</h4><ul class="skill-list">${build.skills.map(skill => `<li><strong>${escapeHtml(skill.name)}</strong><span>${escapeHtml(skill.detail)}</span></li>`).join('')}</ul>
    <h4>How to play</h4><p>${escapeHtml(build.priorities)}</p>
    <h4>Watch for</h4><p>${escapeHtml(build.limitation)}</p>
    <p class="inset-note">${escapeHtml(build.trinkets)}</p></article>`;
}

function renderTeamPortrait(name) {
  const portrait = heroes.find(hero => hero.name === name)?.portrait;
  if (portrait && !portrait.placeholder) return renderImage(portrait, 'team-portrait');
  const initials = name.split(' ').map(word => word[0]).join('');
  return `<div class="portrait-unavailable" role="img" aria-label="${escapeHtml(name)} portrait unavailable"><span aria-hidden="true">${escapeHtml(initials)}</span><small>Portrait unavailable</small></div>`;
}

function renderHeroName(name) {
  const hero = heroes.find(entry => entry.name === name && entry.guide);
  return hero
    ? `<a href="#hero/${escapeHtml(hero.id)}/overview">${escapeHtml(name)}</a>`
    : `<span class="unlinked-hero-name">${escapeHtml(name)}</span>`;
}

function renderPartyMembers(team) {
  return `<ol class="party" aria-label="Starting formation, positions 4 through 1">${team.members.map((name, index) => `<li><span>Position ${4 - index}</span>${renderTeamPortrait(name)}<strong>${renderHeroName(name)}</strong></li>`).join('')}</ol>`;
}

function renderTeamCard(team) {
  const searchText = `${team.name} ${team.build} ${team.members.join(' ')} ${team.synergy}`;
  return `<article class="panel composition-overview-card" data-composition-card data-search-text="${escapeHtml(searchText.toLowerCase())}">
    <p class="eyebrow">${requirementLabel(team.requirements)} · Editorial example</p>
    <h3><a href="#game/darkest-dungeon/teams/${escapeHtml(team.id)}">${escapeHtml(team.name)}</a></h3>
    <p class="formation-label">Starting formation · Rear → front</p>${renderPartyMembers(team)}
    <div class="composition-strategy"><h4>Main strategy</h4><p>${escapeHtml(team.synergy)}</p></div>
    <a class="team-details-link" href="#game/darkest-dungeon/teams/${escapeHtml(team.id)}">View full strategy <span aria-hidden="true">→</span></a>
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
  return `<article class="panel trinket-card"><div class="trinket-heading">
    ${renderImage(trinket.image, 'trinket-art')}
    <div><p class="eyebrow">${escapeHtml(trinket.rarity)}</p><h3>${escapeHtml(trinket.name)}</h3><p class="small-label">${requirementLabel(trinket.requirements)}</p></div></div>
    <p class="selection-label">${escapeHtml(trinket.use)}</p><dl class="effects"><dt>Benefits</dt><dd class="benefits">${trinket.effects.map(escapeHtml).join('<br>')}</dd><dt>Penalties</dt><dd class="penalties">${trinket.drawbacks.map(escapeHtml).join('<br>')}</dd></dl>
    <h4>Why choose it</h4><p>${escapeHtml(trinket.advice)}</p><h4>Accessible alternative</h4><p>${escapeHtml(trinket.alternative)}</p>
    <a class="source-link" href="${escapeHtml(sources[trinket.source].url)}">Check item reference ↗</a></article>`;
}

function renderGuide(hero) {
  const guide = hero.guide;
  return `<a class="back-link" href="#game/darkest-dungeon/heroes">← All heroes</a>
    <header class="guide-header"><div><p class="eyebrow">Darkest Dungeon I / ${requirementLabel(hero.requirements)}</p>
      <h1 id="page-title" tabindex="-1">${escapeHtml(hero.name)}</h1><p class="epithet">${escapeHtml(hero.epithet)}</p>
      <p class="role">${escapeHtml(hero.role)}</p><p class="lede">${escapeHtml(hero.summary)}</p>
      <p class="card-positions">Preferred positions <strong>${hero.preferredPositions.join(' · ')}</strong><span>1 = front</span></p></div>${renderImage(hero.portrait, 'guide-portrait')}</header>
    <nav class="guide-nav" aria-label="Guide sections">${sections.map((section, index) => `<a href="#hero/${escapeHtml(hero.id)}/${section}" data-section="${section}"><span aria-hidden="true">0${index + 1}</span> ${section[0].toUpperCase() + section.slice(1)}</a>`).join('')}</nav>
    <section class="guide-section" aria-labelledby="overview"><div class="section-heading"><h2 id="overview" tabindex="-1">Overview</h2><span>01 / Know your role</span></div>
      <div class="two-columns"><article class="panel"><h3>Strengths</h3>${renderList(guide.strengths)}</article><article class="panel"><h3>Weaknesses</h3>${renderList(guide.weaknesses)}</article></div>
      <div class="position-panel"><h3>Where to stand</h3>${renderPositions(hero)}<p>${escapeHtml(guide.positions)}</p></div>
    </section>
    <section class="guide-section" aria-labelledby="builds"><div class="section-heading"><h2 id="builds" tabindex="-1">Builds</h2><span>02 / Choose your approach</span></div>
      <p class="section-intro">Suggested builds · Not playtested. Four skills each; rank lists show your position → enemy targets.</p><div class="two-columns">${guide.builds.map(renderBuild).join('')}</div></section>
    <section class="guide-section" aria-labelledby="teams"><div class="section-heading"><h2 id="teams" tabindex="-1">Teams</h2><span>03 / Company for the road</span></div>
      <p class="section-intro">Parties for ${escapeHtml(hero.name)} · Suggested, not playtested. Read 4–3–2–1 from rear to front; adapt to actual turn order.</p><div class="team-list">${guide.teams.map(team => renderTeamCard({ ...team, hero })).join('')}</div></section>
    <section class="guide-section" aria-labelledby="trinkets"><div class="section-heading"><h2 id="trinkets" tabindex="-1">Trinkets</h2><span>04 / Equip with intent</span></div>
      <p class="section-intro">Picks for ${escapeHtml(hero.name)} · Reference values; installed patch not checked. Availability is not guaranteed. The two supplied game icons have unverified provenance; the other two remain labeled placeholders.</p><div class="two-columns">${guide.trinkets.map(renderTrinket).join('')}</div></section>
    <details class="references"><summary>Sources & verification</summary><p>${escapeHtml(guide.verification)}</p><p>Campaign only; no DLC or mods required. Supplied character and item artwork has unverified original sources and reuse terms. See <code>docs/content-sources.md</code>.</p><ul>${guide.sourceIds.map(id => `<li><a href="${escapeHtml(sources[id].url)}">${escapeHtml(sources[id].title)} ↗</a></li>`).join('')}</ul><p>Image research and provenance: <code>docs/content-sources.md</code> in the source repository.</p></details>`;
}

function activeCategoryId(route) {
  if (route.hero) return 'heroes';
  if (route.view === 'team-detail') return 'teams';
  return ({ game: 'overview', heroes: 'heroes', teams: 'teams', trinkets: 'trinkets' })[route.view] || '';
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
  if (!path || path === 'home') return { view: 'home' };
  // Preserve existing bookmarks without rewriting history entries.
  if (path === 'heroes') return { view: 'heroes', game: true };
  const parts = path.split('/');
  if (parts[0] === 'game' && parts[1] === 'darkest-dungeon' && parts.length <= 3) {
    const view = parts[2] || 'game';
    if (['game', 'heroes', 'teams', 'trinkets'].includes(view)) return { view, game: true };
  }
  if (parts[0] === 'game' && parts[1] === 'darkest-dungeon' && parts[2] === 'teams' && parts.length === 4) {
    const team = getTeams().find(entry => entry.id === parts[3]);
    if (team) return { view: 'team-detail', team, game: true };
  }
  if (parts[0] === 'hero' && parts.length <= 3) {
    const hero = heroes.find(entry => entry.id === parts[1] && entry.guide);
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
  } else if (route.view !== 'game') {
    crumbs.push({ label: pageTitles[route.view] });
  }
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${crumbs.map((crumb, index) =>
    `<li>${index === crumbs.length - 1 ? `<span aria-current="page">${escapeHtml(crumb.label)}</span>` : `<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>`}</li>`
  ).join('')}</ol></nav>`;
}

const pageTitles = { home: 'Gaming Wiki', game: 'Darkest Dungeon', heroes: 'Heroes', teams: 'Team Compositions', 'team-detail': 'Team composition', trinkets: 'Trinkets', missing: 'Page not found' };

function renderPage(route) {
  const views = { home: renderHome, game: renderGameLanding, heroes: renderGallery,
    teams: () => renderCollection('teams'), trinkets: () => renderCollection('trinkets') };
  const content = route.hero ? renderGuide(route.hero) : route.view === 'team-detail' ? renderTeamDetail(route.team) : views[route.view] ? views[route.view]() :
    '<section class="empty-state"><h1 id="page-title" tabindex="-1">Page not found</h1><p>This page is not available.</p><a href="#home">Return home</a></section>';
  const page = renderBreadcrumbs(route) + content;
  if (!route.game) return page;
  return `<div class="game-layout" data-game-theme="${escapeHtml(games['darkest-dungeon'].theme)}">${renderGameSidebar(route)}<div class="game-content">${page}</div></div>`;
}

function updateNavigation(route) {
  document.querySelectorAll('[data-site-page]').forEach(link => {
    const active = link.dataset.sitePage === (route.game ? 'game' : route.view);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-section]').forEach(link => {
    if (link.dataset.section === route.section) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function showRoute() {
  const route = readRoute(location.hash);
  const viewKey = route.hero ? `hero/${route.hero.id}` : route.view === 'team-detail' ? `team/${route.team.id}` : route.view;
  const changed = viewKey !== currentView;
  if (changed) {
    main.innerHTML = renderPage(route);
    currentView = viewKey;
  }
  document.title = route.hero ? `${route.hero.name} · Gaming Wiki` : route.view === 'team-detail' ? `${route.team.name} · Gaming Wiki` :
    route.view === 'home' ? 'Gaming Wiki' : `${pageTitles[route.view]} · Gaming Wiki`;
  updateNavigation(route);
  // Every route change, including Back/Forward, lands keyboard focus in its content.
  const sectionTarget = route.hero && (!changed || route.section !== 'overview');
  const target = document.getElementById(sectionTarget ? route.section : 'page-title');
  target.focus({ preventScroll: true });
  if (sectionTarget) target.scrollIntoView({ block: 'start' });
  else window.scrollTo(0, 0);
}

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView({ block: 'start' });
});

window.addEventListener('hashchange', showRoute);
document.addEventListener('click', event => {
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
  if (event.target.id === 'team-search-input') {
    const query = event.target.value.trim().toLowerCase();
    const cards = [...document.querySelectorAll('[data-composition-card]')];
    let visibleCount = 0;
    cards.forEach(card => {
      const matches = card.dataset.searchText.includes(query);
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    const status = document.getElementById('team-search-status');
    status.textContent = query
      ? `${visibleCount} matching ${visibleCount === 1 ? 'composition' : 'compositions'}.`
      : `${visibleCount} compositions available.`;
    return;
  }
  if (event.target.id !== 'game-search-input') return;
  const results = renderSearchResults(event.target.value);
  document.getElementById('game-search-status').textContent = results.status;
  document.getElementById('game-search-results').innerHTML = results.markup;
});
showRoute();
