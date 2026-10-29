import { renderEntryArtwork } from './artwork.js';
import { heroAbilities } from './hero-abilities.js';

function escapeGalleryText(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function normalizeGalleryText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function matchesHero(hero, query, role) {
  const text = normalizeGalleryText(`${hero.name} ${hero.roleTags.join(' ')}`);
  return (!role || hero.roleTags.includes(role)) && normalizeGalleryText(query).split(' ').every(term => text.includes(term));
}

function renderClassArtwork(hero) {
  const art = hero.galleryArt;
  const dlc = hero.requirements.dlc;
  // Permission is explicit: an existing file or source URL alone does not grant reuse.
  const usable = ['permitted', 'user-provided'].includes(art.permission) && art.src;
  const dlcBadge = dlc.length ? `<span class="class-art-dlc" data-dlc="${dlc.some(name => name.includes('Crimson Court')) ? 'crimson-court' : 'shieldbreaker'}" aria-label="Downloadable content required: ${dlc.map(escapeGalleryText).join(', ')}"><span aria-hidden="true">•</span> ${dlc.map(name => escapeGalleryText(name.replace(/^The /, ''))).join(' · ')}</span>` : '';
  const fallback = `<figure class="class-art${usable ? ' has-image' : ''}${art.animated ? ' animated-class-art' : ''}">
    <div class="class-monogram" aria-hidden="true"><span>${escapeGalleryText(art.monogram)}</span><small>${escapeGalleryText(hero.name)}</small></div>
    ${usable ? `<img src="${escapeGalleryText(art.src)}" alt="${escapeGalleryText(art.alt || `${hero.name} portrait`)}" loading="lazy">` : ''}
    ${dlcBadge}
    <figcaption><span class="class-placeholder-label">Class monogram · Illustration unavailable</span>${usable ? `<span class="class-image-credit">${escapeGalleryText(art.credit || 'Image source unverified')}</span>` : ''}</figcaption>
  </figure>`;
  return renderEntryArtwork('heroes', hero, 'thumbnail', fallback, dlcBadge);
}

function renderClassCard(hero) {
  const hasAbilityPage = Boolean(heroAbilities[hero.id]);
  const navigable = hero.guide || hasAbilityPage;
  const tag = navigable ? 'a' : 'article';
  const destination = hero.guide ? `#hero/${hero.id}/overview` : `#hero/${hero.id}/abilities`;
  const availabilityClass = hero.guide ? ' class-guide-available' : hasAbilityPage ? ' class-skills-available' : '';
  return `<${tag} class="class-card${availabilityClass}" data-hero-id="${escapeGalleryText(hero.id)}"${navigable ? ` href="${escapeGalleryText(destination)}"` : ''}>
    ${renderClassArtwork(hero)}
    <div class="class-card-copy"><h3>${escapeGalleryText(hero.name)}</h3>
      <ul class="class-role-tags" aria-label="Combat capabilities">${hero.roleTags.map(role => `<li>${escapeGalleryText(role)}</li>`).join('')}</ul>
      <p class="class-guide-status">${hero.guide ? `Read ${escapeGalleryText(hero.name)} guide <span aria-hidden="true">↗</span>` : hasAbilityPage ? `View combat skills · Full guide in development <span aria-hidden="true">↗</span>` : 'Guide in development'}</p>
    </div>
  </${tag}>`;
}

export function renderHeroGallery(heroes) {
  const roster = [...heroes].sort((a, b) => a.name.localeCompare(b.name));
  const roles = [...new Set(roster.flatMap(hero => hero.roleTags))].sort();
  return `<div class="class-codex">
    <section class="class-intro" aria-labelledby="page-title"><p class="eyebrow">Darkest Dungeon I / The hero codex</p>
      <h1 id="page-title" tabindex="-1">Heroes</h1><p class="lede">Different strengths. Shared resolve. Find the class your expedition needs.</p>
      <div class="class-roster-summary"><span>${roster.length} original classes</span><span>${roster.filter(hero => hero.guide).length} guide available</span><span>No mods required</span></div>
    </section>
    <section aria-labelledby="gallery-heading"><div class="section-heading"><h2 id="gallery-heading">Choose your hero</h2></div>
      <div class="class-filters"><div><label for="class-search">Search classes</label><input id="class-search" type="search" placeholder="Name or combat role" autocomplete="off"></div>
        <div><label for="class-role">Combat role</label><select id="class-role"><option value="">All roles</option>${roles.map(role => `<option value="${escapeGalleryText(role)}">${escapeGalleryText(role)}</option>`).join('')}</select></div>
        <button type="button" data-clear-classes>Clear filters</button></div>
      <p id="class-results-status" class="class-results-status" role="status" aria-live="polite">Showing ${roster.length} of ${roster.length} classes.</p>
      <div class="class-grid">${roster.map(renderClassCard).join('')}</div>
      <div id="class-empty" class="class-empty" hidden><h3>No classes match</h3><p>Try a different name or role, or clear the filters.</p></div>
    </section>
    <details class="class-scope"><summary>Roster scope, roles & artwork</summary>
      <p>This gallery covers the original 15 base-game classes plus Flagellant (The Crimson Court) and Shieldbreaker (The Shieldbreaker). The Musketeer variant and later additions are outside this 17-class milestone.</p>
      <p>Role tags summarize combat capabilities, not strength ratings or complete builds. All 17 classes have a combat-skill reference; only Highwayman has a full strategy guide. User-supplied portrait sources and public reuse terms remain unverified.</p>
      <p>References: <a href="https://darkestdungeon.wiki.gg/wiki/Getting_Started">Class roles</a> · <a href="https://store.steampowered.com/app/580100/Darkest_Dungeon_The_Crimson_Court/">The Crimson Court</a> · <a href="https://store.steampowered.com/app/702540/Darkest_Dungeon_The_Shieldbreaker/">The Shieldbreaker</a>. Source and artwork records: <code>docs/content-sources.md</code>.</p>
    </details>
  </div>`;
}

export function initializeHeroGallery(root, heroes) {
  function filterGallery() {
    const search = root.querySelector('#class-search');
    if (!search) return;
    const role = root.querySelector('#class-role').value;
    let count = 0;
    root.querySelectorAll('[data-hero-id]').forEach(card => {
      const hero = heroes.find(hero => hero.id === card.dataset.heroId);
      card.hidden = !matchesHero(hero, search.value, role);
      if (!card.hidden) count += 1;
    });
    root.querySelector('#class-results-status').textContent = `Showing ${count} of ${heroes.length} classes.`;
    root.querySelector('#class-empty').hidden = count !== 0;
  }
  root.addEventListener('input', event => { if (event.target.id === 'class-search') filterGallery(); });
  root.addEventListener('change', event => { if (event.target.id === 'class-role') filterGallery(); });
  root.addEventListener('click', event => {
    if (!event.target.closest('[data-clear-classes]')) return;
    const search = root.querySelector('#class-search');
    search.value = '';
    root.querySelector('#class-role').value = '';
    filterGallery();
    search.focus();
  });
  // Image errors do not bubble, so capture them; retain the monogram under future licensed art.
  root.addEventListener('error', event => {
    if (event.target.matches('.class-art img')) event.target.closest('.class-art').classList.add('image-failed');
  }, true);
}
