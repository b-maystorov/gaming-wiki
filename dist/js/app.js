import { heroes, sources } from './heroes.js';

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
  return `<figure class="artwork ${className}">
    <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" width="${image.width || 320}" height="${image.height || 320}">
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
  const guideCount = heroes.filter(hero => hero.guide).length;
  const teamCount = heroes.reduce((count, hero) => count + (hero.guide?.teams.length || 0), 0);
  const trinketCount = heroes.reduce((count, hero) => count + (hero.guide?.trinkets.length || 0), 0);
  const entries = [
    { path: 'heroes', title: 'Heroes', description: `${guideCount} guide available. Explore Highwayman’s role, positions, and builds.` },
    { path: 'teams', title: 'Team Compositions', description: `${teamCount} example parties with formations, opening priorities, and limitations.` },
    { path: 'trinkets', title: 'Trinkets', description: `${trinketCount} recommendations with benefits, penalties, and accessible alternatives.` }
  ];
  return `<section class="page-intro" aria-labelledby="page-title"><p class="eyebrow">Original game / Campaign</p>
    <h1 id="page-title" tabindex="-1">Darkest Dungeon</h1><p class="lede">Plan your party and equipment. All current content uses the base game.</p></section>
    <section aria-label="Explore Darkest Dungeon" class="landing-grid">${entries.map(entry => `<a class="navigation-card" href="#game/darkest-dungeon/${entry.path}"><h2>${entry.title}</h2><p>${entry.description}</p><span class="card-action">Browse ${entry.title.toLowerCase()} <span aria-hidden="true">→</span></span></a>`).join('')}</section>`;
}

function renderCollection(kind) {
  const isTeams = kind === 'teams';
  const title = isTeams ? 'Team Compositions' : 'Trinkets';
  const note = isTeams ? 'Suggested formations, not playtested. Read positions 4–3–2–1 from rear to front.' :
    'Campaign item values checked against references; the installed patch was not verified. Icons remain placeholders.';
  const renderer = isTeams ? renderTeam : renderTrinket;
  return `<section class="page-intro" aria-labelledby="page-title"><p class="eyebrow">Darkest Dungeon / ${title}</p>
    <h1 id="page-title" tabindex="-1">${title}</h1><p class="lede">${note}</p></section>
    ${heroes.filter(hero => hero.guide).map(hero => `<section class="collection-group" aria-label="${escapeHtml(hero.name)} recommendations"><div class="section-heading"><h2>From the ${escapeHtml(hero.name)} guide</h2><a href="#hero/${escapeHtml(hero.id)}/overview">View hero guide →</a></div>
      <div class="${isTeams ? 'team-list' : 'two-columns'}">${hero.guide[kind].map(renderer).join('')}</div></section>`).join('')}`;
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

function renderTeam(team) {
  return `<article class="panel team-card"><p class="eyebrow">${requirementLabel(team.requirements)} / ${escapeHtml(team.build)}</p>
    <h3>${escapeHtml(team.name)}</h3><p class="formation-label">Starting formation · Rear → front</p>
    <ol class="party">${team.members.map((name, index) => `<li><span>Position ${4 - index}</span>${renderTeamPortrait(name)}<strong>${escapeHtml(name)}</strong></li>`).join('')}</ol>
    <h4>Why it fits</h4><p>${escapeHtml(team.synergy)}</p>
    <h4>Opening priorities</h4>${renderList(team.priorities, true)}
    <h4>Limitations</h4><p>${escapeHtml(team.limitation)}</p></article>`;
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
      <p class="section-intro">Parties for ${escapeHtml(hero.name)} · Suggested, not playtested. Read 4–3–2–1 from rear to front; adapt to actual turn order.</p><div class="team-list">${guide.teams.map(renderTeam).join('')}</div></section>
    <section class="guide-section" aria-labelledby="trinkets"><div class="section-heading"><h2 id="trinkets" tabindex="-1">Trinkets</h2><span>04 / Equip with intent</span></div>
      <p class="section-intro">Picks for ${escapeHtml(hero.name)} · Reference values; installed patch not checked. Availability is not guaranteed. Icons remain labeled placeholders.</p><div class="two-columns">${guide.trinkets.map(renderTrinket).join('')}</div></section>
    <details class="references"><summary>Sources & verification</summary><p>${escapeHtml(guide.verification)}</p><p>Campaign only; no DLC or mods required. Game-art redistribution permission is unverified, so portraits and icons remain placeholders.</p><ul>${guide.sourceIds.map(id => `<li><a href="${escapeHtml(sources[id].url)}">${escapeHtml(sources[id].title)} ↗</a></li>`).join('')}</ul><p>Image research and provenance: <code>docs/content-sources.md</code> in the source repository.</p></details>`;
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
  } else if (route.view !== 'game') {
    crumbs.push({ label: pageTitles[route.view] });
  }
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${crumbs.map((crumb, index) =>
    `<li>${index === crumbs.length - 1 ? `<span aria-current="page">${escapeHtml(crumb.label)}</span>` : `<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>`}</li>`
  ).join('')}</ol></nav>`;
}

const pageTitles = { home: 'Gaming Wiki', game: 'Darkest Dungeon', heroes: 'Heroes', teams: 'Team Compositions', trinkets: 'Trinkets', missing: 'Page not found' };

function renderPage(route) {
  const views = { home: renderHome, game: renderGameLanding, heroes: renderGallery,
    teams: () => renderCollection('teams'), trinkets: () => renderCollection('trinkets') };
  const content = route.hero ? renderGuide(route.hero) : views[route.view] ? views[route.view]() :
    '<section class="empty-state"><h1 id="page-title" tabindex="-1">Page not found</h1><p>This page is not available.</p><a href="#home">Return home</a></section>';
  return renderBreadcrumbs(route) + content;
}

function updateNavigation(route) {
  document.querySelector('.game-nav').hidden = !route.game;
  document.querySelectorAll('[data-site-page]').forEach(link => {
    const active = link.dataset.sitePage === (route.game ? 'game' : route.view);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-game-section]').forEach(link => {
    const active = link.dataset.gameSection === (route.hero ? 'heroes' : route.view);
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
  const viewKey = route.hero ? `hero/${route.hero.id}` : route.view;
  const changed = viewKey !== currentView;
  if (changed) {
    main.innerHTML = renderPage(route);
    currentView = viewKey;
  }
  document.title = route.hero ? `${route.hero.name} · Gaming Wiki` :
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
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a');
  const hash = link?.getAttribute('href');
  // Re-selecting the current route should still return to its heading after scrolling.
  if (hash === location.hash && hash?.startsWith('#') && hash !== '#main-content') {
    event.preventDefault();
    showRoute();
  }
});
showRoute();
