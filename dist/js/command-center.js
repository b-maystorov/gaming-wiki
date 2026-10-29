import { encyclopediaSearchText } from './encyclopedia.js';
import { games, portalGames } from './games.js';
import { heroes } from './heroes.js';
import { heroAbilities } from './hero-abilities.js';

function normalizeSearch(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function createSearchIndex(bosses = [], content = null) {
  const entries = portalGames.map(game => ({
    title: game.name, type: game.available ? 'Game wiki' : 'Game preview', icon: '◈',
    detail: game.available ? 'Guides available' : 'In development · Preview only', href: game.href,
    keywords: `${game.id} ${game.description} ${game.categories?.join(' ') || ''}`
  }));
  const game = games['darkest-dungeon'];
  for (const hero of heroes.filter(hero => hero.guide)) {
    const context = `${game.name} ${hero.name}`;
    entries.push({ title: hero.name, type: 'Hero guide', icon: '♟', detail: game.name,
      href: `#hero/${hero.id}/overview`, keywords: `${context} ${hero.role} ${hero.summary}` });
    for (const build of hero.guide.builds) {
      entries.push({ title: build.name, type: 'Build', icon: '⚒', detail: `${hero.name} · Opens Builds`,
        href: `#hero/${hero.id}/builds`,
        keywords: `${context} ${build.id} ${build.label} ${build.description} ${build.skills.map(skill => skill.name).join(' ')}` });
    }
    for (const team of hero.guide.teams) {
      entries.push({ title: team.name, type: 'Team composition', icon: '◉', detail: game.name,
        href: `#game/${game.id}/teams/${team.id}`,
        keywords: `${context} ${team.build} ${team.members.join(' ')} ${team.synergy}` });
    }
    for (const trinket of hero.guide.trinkets) {
      const record = content?.trinkets.find(item => item.routeId === trinket.routeId);
      if (!record) continue;
      entries.push({ title: record.name, type: 'Trinket', icon: '◇', detail: `${hero.name} · Opens Trinkets`,
        href: `#game/${game.id}/trinkets/${record.routeId}`,
        keywords: `${context} equipment item ${record.rarity} ${trinket.use} ${record.effects.map(effect => effect.text).join(' ')}` });
    }
  }
  for (const hero of heroes) {
    const abilityEntry = heroAbilities[hero.id];
    if (!abilityEntry) continue;
    for (const [name, from, targets, damage, accuracy, crit, effect] of abilityEntry.skills) {
      entries.push({ title: name, type: `${hero.name} combat skill`, icon: '✦', detail: `${hero.name} · Opens Combat skills`,
        href: `#hero/${hero.id}/abilities`, keywords: `${game.name} ${hero.name} ${from} ${targets} ${damage} ${accuracy} ${crit} ${effect}` });
    }
  }
  for (const boss of bosses) {
    const categoryNames = boss.categoryIds.map(id => id.split(':').at(-1).replaceAll('-', ' ')).join(' ');
    const status = boss.guideStatus === 'available' ? 'Guide available' : 'Guide in development';
    entries.push({
      title: boss.name,
      type: boss.guideStatus === 'available' ? 'Boss guide' : 'Boss · In development',
      icon: '♜',
      detail: `${boss.regionLabel} · ${status}`,
      href: `#game/darkest-dungeon/bosses/${boss.routeId}`,
      keywords: `${boss.name} ${(boss.aliases || []).join(' ')} ${boss.summary} ${boss.regionLabel} ${categoryNames}`
    });
  }
  if (content) {
    const collections = [
      ['enemies', 'Enemy', '⚔'], ['trinkets', 'Trinket', '◇'],
      ['items', 'Provision', '▧'], ['curios', 'Curio', '▤'],
      ['locations', 'Location', '⌖'], ['quests', 'Quest', '☷']
    ];
    for (const [key, type, icon] of collections) {
      for (const record of content[key] || []) {
        entries.push({ title: record.name, type, icon, detail: `Darkest Dungeon · ${record.verification?.status || 'in development'}`,
          href: `#game/darkest-dungeon/${key}/${record.routeId}`, keywords: encyclopediaSearchText(key, record, content, heroes) });
      }
    }
  }
  // Future guides may recommend the same item or party; show each destination/title once.
  return entries.filter((entry, index) => entries.findIndex(other => other.title === entry.title && other.href === entry.href) === index)
    .map(entry => ({ ...entry, searchText: normalizeSearch(`${entry.title} ${entry.type} ${entry.detail} ${entry.keywords}`) }));
}

export function searchEntries(entries, query) {
  const normalized = normalizeSearch(query);
  if (!normalized) return entries;
  const terms = normalized.split(' ');
  return entries.filter(entry => terms.every(term => entry.searchText.split(' ').some(word => word.startsWith(term))))
    .sort((a, b) => score(b) - score(a));

  function score(entry) {
    const title = normalizeSearch(entry.title);
    return title === normalized ? 3 : title.startsWith(normalized) ? 2 : title.includes(normalized) ? 1 : 0;
  }
}

export function initializeCommandCenter({ navigate, bosses = [], content = null }) {
  const dialog = document.getElementById('command-center');
  const trigger = document.getElementById('open-command-center');
  const closeButton = document.getElementById('close-command-center');
  const input = document.getElementById('command-input');
  const results = document.getElementById('command-results');
  const status = document.getElementById('command-status');
  const empty = document.getElementById('command-empty');
  const index = createSearchIndex(bosses, content);
  let matches = [];
  let selectedIndex = -1;
  let returnTarget = trigger;

  function selectResult(nextIndex, scroll = true) {
    selectedIndex = matches.length ? (nextIndex + matches.length) % matches.length : -1;
    [...results.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === selectedIndex)));
    const option = results.children[selectedIndex];
    if (option) {
      input.setAttribute('aria-activedescendant', option.id);
      if (scroll) option.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    } else input.removeAttribute('aria-activedescendant');
  }

  function updateResults() {
    matches = searchEntries(index, input.value);
    results.replaceChildren(...matches.map((entry, index) => {
      const option = document.createElement('div');
      option.id = `command-result-${index}`;
      option.className = 'command-result';
      option.dataset.resultIndex = String(index);
      option.setAttribute('role', 'option');
      const icon = document.createElement('span');
      icon.className = 'command-result-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = entry.icon;
      const copy = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = entry.title;
      const detail = document.createElement('small');
      detail.textContent = `${entry.type} · ${entry.detail}`;
      copy.append(title, detail);
      option.append(icon, copy);
      return option;
    }));
    empty.hidden = matches.length > 0;
    status.textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'}${input.value.trim() ? '' : ' · Browse all indexed content'}.`
      : 'No matching entries.';
    results.scrollTop = 0;
    selectResult(0, false);
  }

  function open() {
    if (dialog.open) return;
    returnTarget = document.activeElement;
    input.value = '';
    updateResults();
    dialog.showModal(); // Native modal semantics also make the rest of the page inert.
    document.body.classList.add('command-open');
    input.setAttribute('aria-expanded', 'true');
    input.focus({ preventScroll: true });
  }

  function close({ restoreFocus = true } = {}) {
    if (!dialog.open) return;
    dialog.close();
    document.body.classList.remove('command-open');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    if (restoreFocus) (returnTarget?.isConnected ? returnTarget : trigger).focus({ preventScroll: true });
  }

  function activateResult(index) {
    const entry = matches[index];
    if (!entry) return;
    close({ restoreFocus: false });
    navigate(entry.href);
  }

  trigger.addEventListener('click', open);
  closeButton.addEventListener('click', () => close());
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  input.addEventListener('input', updateResults);
  results.addEventListener('click', event => {
    const option = event.target.closest('[data-result-index]');
    if (option) activateResult(Number(option.dataset.resultIndex));
  });
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectResult(selectedIndex + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activateResult(selectedIndex);
    }
  });
  dialog.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    // Results use virtual focus through the combobox; Tab cycles the two real controls.
    if (event.key === 'Tab') {
      event.preventDefault();
      (document.activeElement === input ? closeButton : input).focus();
    }
  });
  document.addEventListener('keydown', event => {
    const target = event.target;
    const editing = target.isContentEditable || target.closest('input, textarea, select, [role="textbox"], [role="combobox"]');
    if (event.key === '/' && !dialog.open && !editing && !event.defaultPrevented && !event.repeat &&
        !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) {
      event.preventDefault();
      open();
    }
  });
  return { close };
}
