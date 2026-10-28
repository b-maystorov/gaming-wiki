import { heroes, sources } from './heroes.js';
import { games, portalGames } from './games.js';
import { initializeCommandCenter } from './command-center.js';
import { renderHeroGallery, initializeHeroGallery } from './hero-gallery.js';
import { heroAbilities, abilityReference } from './hero-abilities.js';

const main = document.querySelector('main');
const sections = ['overview', 'abilities', 'builds', 'teams', 'trinkets'];
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
  const active = new Set(parseSkillRanks(value));
  const direction = orientation === 'hero' ? 'Rear to front' : 'Front to rear';
  const order = ranks.map(rank => `<span class="position-rank${active.has(rank) ? ' is-active' : ''}" aria-label="Rank ${rank}${active.has(rank) ? ', available' : ', unavailable'}"><span>${rank}</span></span>`).join('');
  const modeText = options.mode === 'simultaneous' ? 'All highlighted ranks at once' : 'Choose one highlighted rank';
  return `<div class="ability-rank-group position-group"><span class="position-label">${escapeHtml(label)}</span><span class="position-direction">${direction}</span><div class="position-diagram ${orientation}-positions" role="img" aria-label="${escapeHtml(label)}: ${ranks.map(rank => `rank ${rank} ${active.has(rank) ? 'available' : 'unavailable'}`).join(', ')}">${order}</div><span class="position-mode">${escapeHtml(modeText)}</span></div>`;
}

function renderAbilityTarget(targets, target, heroName) {
  if (target.side === 'self') return `<div class="ability-rank-group position-group"><span class="position-label">Target</span><span class="position-direction">Self-target</span><div class="special-target" aria-label="Targets the ${escapeHtml(heroName)}">SELF</div><span class="position-mode">Affects the ${escapeHtml(heroName)}</span></div>`;
  if (target.side === 'none') return `<div class="ability-rank-group position-group"><span class="position-label">Target</span><span class="position-direction">No rank target</span><div class="special-target">—</div><span class="position-mode">${escapeHtml(targets)}</span></div>`;
  if (target.mode === 'unclassified') return `<div class="ability-rank-group position-group"><span class="position-label">Target</span><span class="position-direction">Target scope unavailable</span><div class="special-target">${escapeHtml(targets)}</div><span class="position-mode">Rank details are not classified yet</span></div>`;
  if (!parseSkillRanks(targets).length) return `<div class="ability-rank-group position-group"><span class="position-label">Target</span><span class="position-direction">No rank diagram</span><div class="special-target">${escapeHtml(targets)}</div><span class="position-mode">Target rank details unavailable</span></div>`;
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
  return `<article class="ability-card"><header class="ability-card-heading"><span>${escapeHtml(details?.type || 'Combat skill')} · ${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(name)}</h3></header>
    ${details?.description ? `<p class="ability-description">${escapeHtml(details.description)}</p>` : ''}
    <div class="ability-ranks">${renderPositionDiagram(from, 'Use from', 'hero')}${renderAbilityTarget(targets, target, heroName)}</div>
    <dl class="ability-values"><div><dt>DMG modifier</dt><dd>${escapeHtml(statValue(damage, true))}</dd></div><div><dt>ACC</dt><dd>${escapeHtml(statValue(accuracy, true))}</dd></div><div><dt>CRIT modifier</dt><dd>${escapeHtml(statValue(crit, true))}</dd></div></dl>
    <div class="ability-effect"><strong>Effects</strong>${effects.length ? `<ul>${effects.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No additional effect listed.</p>'}</div>
    ${details?.tacticalNote ? `<p class="ability-tip"><strong>When to use it <span>(tactical suggestion)</span></strong>${escapeHtml(details.tacticalNote)}</p>` : ''}</article>`;
}

function renderAbilities(hero) {
  const entry = heroAbilities[hero.id];
  if (!entry) return '';
  return `<section class="guide-section ability-section" aria-labelledby="abilities"><div class="section-heading"><h2 id="abilities" tabindex="-1">Combat skills</h2><span>${entry.skills.length} abilities / Skill level 1</span></div>
    <p class="section-intro">Compare each skill’s positions, targets, values, and effects. Figures shown are for skill level 1.</p>
    <div class="ability-grid">${entry.skills.map((skill, index) => renderAbilityCard(skill, index, entry, hero.name)).join('')}</div>
    <details class="ability-glossary"><summary>How to read combat skills</summary><p>Hero positions run from rear to front (<strong>4 → 1</strong>); enemy positions run from front to rear (<strong>1 → 4</strong>). Crimson ranks are valid positions and muted ranks are unavailable. Enemy skills let you choose one highlighted rank unless marked as hitting all highlighted ranks at once. Ally-target skills show party ranks; <strong>SELF</strong> means the hero is the target.</p><p>Movement labels describe the hero or enemy changing ranks: <strong>forward/back</strong> moves the hero, while <strong>knockback</strong> moves the target enemy. These are separate from the targeting diagram.</p><p><strong>DMG modifier</strong> changes base damage. <strong>ACC</strong> is base accuracy before enemy Dodge. <strong>CRIT modifier</strong> changes critical-hit chance. <strong>PROT</strong> reduces direct damage, not damage over time. <strong>SPD</strong> means Speed. A successful <strong>Stun</strong> makes an enemy lose its next turn. <strong>Bleed</strong> deals damage over multiple rounds; Bleed resistance affects its chance to land. <strong>Riposte</strong> lets the hero counter eligible attacks directed at them; Stun disables it.</p><p>${escapeHtml(entry.note || abilityReference.note)}</p></details>
    <p class="ability-source">Values: <a href="${escapeHtml(entry.source)}" target="_blank" rel="noreferrer">Combat skill table ↗</a>${entry.detailsSource ? ` · Descriptions and mechanics: <a href="${escapeHtml(entry.detailsSource)}" target="_blank" rel="noreferrer">Crusader reference ↗</a>` : ''}${entry.strategySource ? ` · Tactical suggestions: <a href="${escapeHtml(entry.strategySource)}" target="_blank" rel="noreferrer">Strategy reference ↗</a>` : ''}${entry.mechanicsSource ? ` · Riposte mechanics: <a href="${escapeHtml(entry.mechanicsSource)}" target="_blank" rel="noreferrer">Riposte reference ↗</a>` : ''}</p></section>`;
}

function renderAbilityPage(hero) {
  const portrait = hero.portrait || (hero.galleryArt?.src ? { ...hero.galleryArt, width: 236, height: 356 } : null);
  return `<a class="back-link" href="#game/darkest-dungeon/heroes">← All heroes</a>
    <header class="guide-header ability-guide-header"><div><p class="eyebrow">Darkest Dungeon I / ${requirementLabel(hero.requirements)}</p><h1 id="page-title" tabindex="-1">${escapeHtml(hero.name)}</h1>
      <p class="role">${escapeHtml(hero.roleTags.join(' · '))}</p><p class="lede">Combat skill reference. Full strategy, builds, teams, and equipment recommendations are still in development.</p>
      <p class="card-positions">Hero positions are listed <strong>4 · 3 · 2 · 1</strong><span>4 = rear · 1 = front</span></p></div>${portrait ? renderImage(portrait, 'guide-portrait') : '<div class="ability-hero-mark" aria-hidden="true">' + escapeHtml(hero.galleryArt.monogram) + '</div>'}</header>
    <nav class="guide-nav" aria-label="Hero reference sections"><a href="#game/darkest-dungeon/heroes"><span aria-hidden="true">←</span> All heroes</a></nav>
    ${renderAbilities(hero)}
    <details class="references"><summary>Sources & verification</summary><p>${escapeHtml(abilityReference.note)}</p><p>Values are a level-one snapshot. This reference does not claim the installed game version was tested.</p><p><a href="${escapeHtml(heroAbilities[hero.id].source)}" target="_blank" rel="noreferrer">Open source table ↗</a></p></details>`;
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
      <nav class="guide-nav" aria-label="Guide sections">${sections.map((section, index) => `<a href="#hero/${escapeHtml(hero.id)}/${section}" data-section="${section}"><span aria-hidden="true">0${index + 1}</span> ${section === 'abilities' ? 'Combat skills' : section[0].toUpperCase() + section.slice(1)}</a>`).join('')}</nav>
    <section class="guide-section" aria-labelledby="overview"><div class="section-heading"><h2 id="overview" tabindex="-1">Overview</h2><span>01 / Know your role</span></div>
      <div class="two-columns"><article class="panel"><h3>Strengths</h3>${renderList(guide.strengths)}</article><article class="panel"><h3>Weaknesses</h3>${renderList(guide.weaknesses)}</article></div>
      <div class="position-panel"><h3>Where to stand</h3>${renderPositions(hero)}<p>${escapeHtml(guide.positions)}</p></div>
    </section>
    ${renderAbilities(hero)}
    <section class="guide-section" aria-labelledby="builds"><div class="section-heading"><h2 id="builds" tabindex="-1">Builds</h2><span>03 / Choose your approach</span></div>
      <p class="section-intro">Suggested builds · Not playtested. Four skills each; rank lists show your position → enemy targets.</p><div class="two-columns">${guide.builds.map(renderBuild).join('')}</div></section>
    <section class="guide-section" aria-labelledby="teams"><div class="section-heading"><h2 id="teams" tabindex="-1">Teams</h2><span>04 / Company for the road</span></div>
      <p class="section-intro">Parties for ${escapeHtml(hero.name)} · Suggested, not playtested. Read 4–3–2–1 from rear to front; adapt to actual turn order.</p><div class="team-list">${guide.teams.map(team => renderTeamCard({ ...team, hero })).join('')}</div></section>
    <section class="guide-section" aria-labelledby="trinkets"><div class="section-heading"><h2 id="trinkets" tabindex="-1">Trinkets</h2><span>05 / Equip with intent</span></div>
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
  if (!path || path === 'home' || path === 'home/games') return { view: 'home', library: path === 'home/games' };
  // Preserve existing bookmarks without rewriting history entries.
  if (path === 'heroes') return { view: 'heroes', game: true };
  const parts = path.split('/');
  const preview = portalGames.find(game => !game.available && game.id === parts[1]);
  if (parts[0] === 'game' && parts.length === 2 && preview) return { view: 'preview', preview };
  if (parts[0] === 'game' && parts[1] === 'darkest-dungeon' && parts.length <= 3) {
    const view = parts[2] || 'game';
    if (['game', 'heroes', 'teams', 'trinkets'].includes(view)) return { view, game: true };
  }
  if (parts[0] === 'game' && parts[1] === 'darkest-dungeon' && parts[2] === 'teams' && parts.length === 4) {
    const team = getTeams().find(entry => entry.id === parts[3]);
    if (team) return { view: 'team-detail', team, game: true };
  }
  if (parts[0] === 'hero' && parts.length <= 3) {
    const hero = heroes.find(entry => entry.id === parts[1] && (entry.guide || heroAbilities[entry.id]));
    const section = parts[2] || 'overview';
    if (hero && (hero.guide ? sections.includes(section) : section === 'abilities')) return { view: 'hero', hero, section, game: true };
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
  if (route.preview) return renderGamePreview(route.preview);
  const views = { home: renderHome, game: renderGameLanding, heroes: renderGallery,
    teams: () => renderCollection('teams'), trinkets: () => renderCollection('trinkets') };
  const content = route.hero ? (route.hero.guide ? renderGuide(route.hero) : renderAbilityPage(route.hero)) : route.view === 'team-detail' ? renderTeamDetail(route.team) : views[route.view] ? views[route.view]() :
    '<section class="empty-state"><h1 id="page-title" tabindex="-1">Page not found</h1><p>This page is not available.</p><a href="#home">Return home</a></section>';
  const page = renderBreadcrumbs(route) + content;
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
  const viewKey = route.preview ? `preview/${route.preview.id}` : route.hero ? `hero/${route.hero.id}` : route.view === 'team-detail' ? `team/${route.team.id}` : route.view;
  const changed = viewKey !== currentView;
  if (changed) {
    main.innerHTML = renderPage(route);
    currentView = viewKey;
  }
  document.title = route.preview ? `${route.preview.name} · BM Gaming Wiki` : route.hero ? `${route.hero.name} · Gaming Wiki` : route.view === 'team-detail' ? `${route.team.name} · Gaming Wiki` :
    route.view === 'home' ? 'BM Gaming Wiki' : `${pageTitles[route.view]} · Gaming Wiki`;
  updateNavigation(route);
  // Every route change, including Back/Forward, lands keyboard focus in its content.
  const sectionTarget = route.hero && (!changed || route.section !== 'overview');
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
initializeHeroGallery(main, heroes);

// Reuse the router, including its same-route focus/scroll behavior.
const commandCenter = initializeCommandCenter({
  navigate(href) {
    if (location.hash === href) showRoute();
    else location.hash = href;
  }
});
showRoute();
