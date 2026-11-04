// Personal state stays outside public game data. Failed writes retain a session copy.
export function personalStore(key, fallback, storage = () => globalThis.localStorage) {
  let memory = fallback;
  let sessionOnly = false;
  return {
    read() {
      if (sessionOnly) return memory;
      try { const raw = storage()?.getItem(key); if (raw) memory = JSON.parse(raw); }
      catch { sessionOnly = true; }
      return memory;
    },
    write(value) {
      memory = value;
      try { const target = storage(); if (!target) throw new Error('Unavailable'); target.setItem(key, JSON.stringify(value)); sessionOnly = false; return true; }
      catch { sessionOnly = true; return false; }
    }
  };
}
export const quantityStore = personalStore('bm-gaming-wiki-trinket-quantities-v1', {});
export function copyQuantity(id, owned, quantities = quantityStore.read()) {
  if (!owned.includes(id)) return 0;
  const value = quantities?.[id];
  return Number.isSafeInteger(value) && value >= 1 ? value : 1;
}
export function compatibleTrinket(item, heroId) {
  return !!item && (!item.classRestrictionHeroRouteIds?.length || item.classRestrictionHeroRouteIds.includes(heroId));
}
export function emptyBuild() {
  return { id: '', name: '', bossId: '', tier: '', party: Array.from({ length: 4 }, () => ({ heroId: '', skills: [], trinkets: ['', ''] })) };
}
export function normalizeBuild(record) {
  const build = emptyBuild();
  for (const key of ['id', 'name', 'bossId', 'tier']) if (typeof record?.[key] === 'string') build[key] = record[key];
  build.party = build.party.map((slot, index) => {
    const saved = record?.party?.[index];
    return { heroId: typeof saved?.heroId === 'string' ? saved.heroId : '',
      skills: Array.isArray(saved?.skills) ? [...new Set(saved.skills.filter(id => typeof id === 'string'))] : [],
      trinkets: [0, 1].map(i => typeof saved?.trinkets?.[i] === 'string' ? saved.trinkets[i] : '') };
  });
  return build;
}
export function selectHero(build, index, heroId) {
  if (!Number.isInteger(index) || index < 0 || index > 3) return;
  const other = build.party.findIndex(slot => heroId && slot.heroId === heroId);
  if (other >= 0) [build.party[index], build.party[other]] = [build.party[other], build.party[index]];
  else build.party[index] = { heroId, skills: [], trinkets: ['', ''] };
}
export function combatSkills(heroId, pack, abilities) {
  const canonical = pack.heroes.find(hero => hero.routeId === heroId)?.id;
  const records = pack.combatSkills.filter(skill => skill.heroId === canonical);
  if (records.length) return records.map(skill => ({ id: skill.id, name: skill.name, ranks: skill.rankRules?.heroPositions || [], targetRules: skill.rankRules?.target, category: skill.category,
    damaging: /attack/i.test(skill.category || '') && typeof skill.level1?.damageModifier?.value === 'number' && skill.level1.damageModifier.value > -100,
    target: `${skill.rankRules?.target?.side || 'Unknown'}: ${skill.rankRules?.target?.ranks?.join(', ') || skill.rankRules?.target?.mode || 'Unknown'}`,
    effects: (skill.level1?.effects || []).map(effect => effect.text).join(' '), verified: skill.level1?.verification?.status === 'reference-checked' }));
  return (abilities[heroId]?.skills || []).map((row, index) => {
    const detail = abilities[heroId]?.skillDetails?.[row[0]];
    const numericTargets = /^[1-4](?:\s*[, +]\s*[1-4])*$/.test(row[2] || '');
    const targetRules = numericTargets ? {
      side: 'enemy', ranks: row[2].match(/[1-4]/g).map(Number),
      mode: /random target/i.test(row[6] || '') ? 'random' : detail?.target?.mode || (row[2].includes('+') ? 'simultaneous' : 'choose-one')
    } : detail?.target ? { ...detail.target, ranks: [] } : null;
    return { id: `reference:${heroId}:${index}:${row[0]}`, name: row[0],
      ranks: row[1] === 'Any' ? [4, 3, 2, 1] : String(row[1] || '').split(',').map(Number).filter(rank => rank >= 1 && rank <= 4),
      target: row[2] || 'Unknown', targetRules, category: detail?.type,
      damaging: numericTargets && (row[3] === '—' || Number.parseFloat(row[3]) > -100),
      effects: row[6] || '', verified: false };
  });
}
export function skillWorks(skill, rank) { return !!skill?.ranks?.includes(rank); }
export function reviewBuild(build, context) {
  const { heroes, pack, abilities, owned, quantities, roster } = context;
  const groups = { critical: [], skills: [], equipment: [], missing: [], reminders: [] };
  const add = (group, code, text, links = []) => groups[group].push({ code, text, links });
  const heroLink = hero => ({ label: `${hero.name} skills`, href: `#hero/${hero.id}/abilities` });
  const itemLink = item => ({ label: item.name, href: `#game/darkest-dungeon/trinkets/${item.routeId}` });
  const boss = pack.bosses.find(boss => boss.id === build.bossId);
  const bossLinks = boss ? [{ label: `${boss.name} guide`, href: `#game/darkest-dungeon/bosses/${boss.routeId}` }] : [];
  const used = new Map();
  const seen = new Set();
  const incomplete = [];
  const emptyRanks = [];
  const emptyEquipment = [];
  const selected = [];
  if (!boss) add('missing', 'boss-missing', 'Choose a boss; the saved boss may be missing.');
  if (build.tier && !boss?.variants?.some(variant => variant.tier === build.tier)) add('missing', 'tier-missing', 'Saved campaign difficulty is unavailable.', bossLinks);

  function alternatives(heroId) {
    const ids = (boss?.counterTeams || []).flatMap(team => team.members.filter(member => member.heroRouteId === heroId).flatMap(member => member.alternativeTrinketIds || []));
    return pack.trinkets.filter(item => ids.some(id => id === item.id || id === item.routeId) && compatibleTrinket(item, heroId) && item.verification?.status === 'reference-checked').map(item => ({ ...itemLink(item), label: `Documented alternative: ${item.name}` }));
  }
  build.party.forEach((slot, index) => {
    const rank = 4 - index;
    const hero = heroes.find(hero => hero.id === slot.heroId);
    const name = hero?.name || `Rank ${rank} (${slot.heroId || 'no hero'})`;
    const links = hero ? [heroLink(hero)] : [];
    if (!hero) emptyRanks.push(`rank ${rank}${slot.heroId ? `: ${slot.heroId}` : ''}`);
    else {
      if (seen.has(hero.id)) add('skills', 'duplicate-hero', `Duplicate hero: ${name}.`, links);
      seen.add(hero.id);
      if (roster?.initialized && !roster.heroIds.includes(hero.id)) add('missing', 'roster', `${name} is not marked available in your expedition roster.`, links);
      const skills = combatSkills(hero.id, pack, abilities);
      if (slot.skills.length !== 4) add('skills', 'skill-count', `${name}: choose exactly four combat skills (${slot.skills.length} selected).`, links);
      if (skills.length < 7 || skills.some(skill => !skill.verified || !skill.targetRules || !skill.ranks.length) || hero.id === 'abomination') incomplete.push(hero);
      for (const id of slot.skills) {
        const skill = skills.find(skill => skill.id === id);
        if (!skill) add('missing', 'skill-missing', `${name}: unavailable saved skill ${id}.`, links);
        else {
          selected.push({ skill, hero, rank });
          if (!skill.ranks.length) add('missing', 'ranks-missing', `${name}: ${skill.name} has no recorded usable ranks.`, links);
          else if (!skillWorks(skill, rank)) add('skills', 'invalid-rank', `${name}: ${skill.name} cannot be used from rank ${rank}; requires ${skill.ranks.join(', ')}.${skill.verified ? '' : ' Older reference; confirm in the hero guide.'}`, links);
        }
      }
    }
    if (hero && slot.trinkets.some(id => !id)) emptyEquipment.push(name);
    if (slot.trinkets[0] && slot.trinkets[0] === slot.trinkets[1]) add('equipment', 'duplicate-item', `${name}: duplicate trinket in both slots; select distinct items.`, links);
    for (const id of slot.trinkets.filter(Boolean)) {
      const item = pack.trinkets.find(item => item.id === id);
      if (!item) { add('equipment', 'item-missing', `${name}: unavailable saved trinket ${id}.`, [...links, ...alternatives(slot.heroId)]); continue; }
      const references = [...links, itemLink(item), ...alternatives(slot.heroId).filter(link => link.href !== itemLink(item).href)];
      if (hero && !compatibleTrinket(item, hero.id)) add('equipment', 'class-restriction', `${name}: ${item.name} is restricted to ${item.classRestrictionHeroRouteIds.map(id => heroes.find(entry => entry.id === id)?.name || id).join(', ')}.`, references);
      const users = used.get(id) || []; users.push({ name, heroId: slot.heroId }); used.set(id, users);
      const dlc = item.requirements?.dlc || [];
      const mods = item.requirements?.mods || [];
      if (dlc.length) add('missing', 'dlc-required', `${name} — ${item.name} requires DLC: ${dlc.map(id => pack.dlcs.find(entry => entry.id === id)?.name || id).join(', ')}. Active DLC is not recorded; confirm it is enabled.`, [itemLink(item)]);
      if (mods.length) add('missing', 'mod-required', `${name} — ${item.name} requires mods: ${mods.join(', ')}. Active mods are not recorded.`, [itemLink(item)]);
    }
  });
  if (emptyRanks.length) add('missing', 'hero-missing', `Choose heroes for ${emptyRanks.join('; ')}; a saved hero may be missing.`);
  if (emptyEquipment.length) add('missing', 'empty-equipment', `Empty trinket slots: ${emptyEquipment.join(', ')}. Equipment is optional; review before leaving.`);
  if (incomplete.length) add('missing', 'incomplete-skills', `Incomplete skill validation: ${incomplete.map(hero => hero.name).join(', ')}. Older references or missing structured data limit coverage checks.${incomplete.some(hero => hero.id === 'abomination') ? ' Abomination form and transformation rules are not modeled.' : ''}`, incomplete.map(heroLink));
  for (const [id, users] of used) {
    const item = pack.trinkets.find(item => item.id === id);
    const count = copyQuantity(id, owned, quantities);
    if (users.length > count) add('equipment', 'quantity-conflict', `Quantity conflict: ${item.name} needs ${users.length} copies; recorded ${count}. Equipped by ${users.map(user => user.name).join(', ')}.`, [itemLink(item), ...new Map(users.flatMap(user => alternatives(user.heroId)).filter(link => link.href !== itemLink(item).href).map(link => [link.href, link])).values()]);
  }
  reviewEncounter(boss, build.tier, selected, add, bossLinks, heroLink);
  reviewCoverage(boss, selected, incomplete.length > 0 || emptyRanks.length > 0 || groups.missing.some(item => ['skill-missing', 'ranks-missing'].includes(item.code)), add, bossLinks, heroLink);
  return groups;
}

function reviewEncounter(boss, tier, selected, add, bossLinks, heroLink) {
  if (!boss) return;
  const checked = item => item.verification?.status === 'reference-checked';
  const mechanics = (boss.mechanics || []).filter(checked);
  const advice = (boss.tacticalConsiderations || []).filter(checked);
  if (!mechanics.length) add('missing', 'boss-coverage', 'Verified encounter mechanics are not recorded for this boss.', bossLinks);
  if (boss.routeId === 'swine-prince') {
    const retaliation = mechanics.find(item => /Damaging Wilbur/.test(item.text));
    if (retaliation) add('critical', 'wilbur', `Do not damage Wilbur before defeating the Prince. ${retaliation.text}`, bossLinks);
    // The recorded formation is used only for this encounter, never as a universal boss rank.
    const formation = mechanics.some(item => /Wilbur stands in rank 4/.test(item.text));
    const riposteAdvice = advice.some(item => /Riposte/.test(item.text));
    for (const { skill, hero, rank } of selected) {
      const references = [heroLink(hero), ...bossLinks];
      const qualifier = skillWorks(skill, rank) ? '' : ' Not usable from the starting rank; this risk applies if repositioned.';
      if (retaliation && riposteAdvice && /activate Riposte/i.test(skill.effects)) add('critical', 'wilbur-riposte', `${hero.name} — ${skill.name}: recorded Riposte can automatically counter Wilbur and trigger retaliation.${qualifier}`, references);
      if (!retaliation || !formation || !skill.damaging || skill.targetRules?.side !== 'enemy' || !skill.targetRules.ranks?.includes(4)) continue;
      const mode = skill.targetRules.mode;
      if (mode === 'simultaneous' || mode === 'random') add('critical', 'wilbur-area', `${hero.name} — ${skill.name}: ${mode === 'random' ? 'random targeting can hit' : 'the recorded area includes'} Wilbur in rank 4. Damaging him while the Prince lives triggers retaliation.${qualifier}`, references);
      else if (mode === 'choose-one') add('reminders', 'wilbur-aim', `${hero.name} — ${skill.name} can target rank 4. Aim at the Prince, not Wilbur; this is a chosen target, not an automatic hit.${qualifier}`, references);
    }
  }
  // Keep sourced editorial guidance labeled as advice, not a validated custom-team counter.
  for (const item of advice) {
    if (boss.routeId === 'swine-prince' && (!/Champion/.test(item.text) || tier !== 'Champion')) continue;
    add('reminders', 'boss-advice', item.text, bossLinks);
  }
}

function reviewCoverage(boss, selected, incomplete, add, bossLinks, heroLink) {
  const usable = selected.filter(({ skill, rank }) => skillWorks(skill, rank));
  const coverage = usable.filter(({ skill }) => skill.targetRules && skill.category);
  const heroIds = [...new Set(coverage.map(({ hero }) => hero.id))];
  for (const id of heroIds) {
    const entries = coverage.filter(({ hero }) => hero.id === id);
    const hero = entries[0].hero;
    const attacks = entries.filter(({ skill }) => skill.damaging && skill.targetRules.side === 'enemy');
    const support = entries.filter(({ skill }) => /heal|defen|guard/i.test(skill.category));
    const parts = [];
    if (attacks.length) parts.push(`Enemy reach: ${attacks.map(({ skill }) => `${skill.name} → ${skill.targetRules.ranks.join(', ')}${skill.targetRules.mode === 'random' ? ' (random)' : ''}`).join('; ')}.`);
    if (support.length) parts.push(`Recovery / defense selected: ${support.map(({ skill }) => skill.name).join(', ')}.`);
    if (parts.length) add('reminders', 'coverage', `${hero.name} — ${parts.join(' ')}${entries.some(({ skill }) => !skill.verified) ? ' Reference data; not fully validated.' : ''} Starting ranks only; this does not measure effectiveness.`, [heroLink(hero)]);
  }
  if (boss?.routeId === 'necromancer' && boss.mechanics?.some(item => item.verification?.status === 'reference-checked' && /moves him back/.test(item.text))) {
    const reachesRear = usable.some(({ skill }) => skill.damaging && skill.targetRules?.side === 'enemy' && skill.targetRules.ranks.includes(4));
    if (!reachesRear && selected.length) add(incomplete ? 'missing' : 'skills', 'rear-reach', `No selected rank-usable attack records enemy rank 4 reach. The Necromancer retreats behind summons.${incomplete ? ' Incomplete data prevents confirming a coverage gap.' : ' Review the boss guide’s rear-rank advice.'}`, bossLinks);
  }
}

// Retain the original plain-text analysis API for existing callers.
export function analyzeBuild(build, context) {
  return Object.values(reviewBuild(build, context)).flat().map(item => item.text);
}

export function renderTeamReview(review, escape) {
  const labels = { critical: ['Warning', 'Critical encounter warnings'], skills: ['Check', 'Skill and position problems'], equipment: ['Conflict', 'Equipment conflicts'], missing: ['Info', 'Missing information'], reminders: ['Reference', 'Useful verified tactical reminders'] };
  return `<div class="team-review" aria-labelledby="team-review-heading"><h4 id="team-review-heading">Review My Team</h4><p>Checks use recorded data and your starting formation. Collapse a group to reduce detail; its findings remain available.</p>${Object.entries(labels).filter(([key]) => review[key].length).map(([key, [severity, label]]) => {
    const findings = review[key];
    return `<details class="team-review-group team-review-${key}" data-review-group="${key}" data-review-signature="${escape(JSON.stringify(findings))}"${key !== 'reminders' ? ' open' : ''}><summary><span class="team-review-severity">${severity}</span> ${label} (${findings.length})</summary><ul>${findings.map(item => `<li><p>${escape(item.text)}</p>${item.links.length ? `<p class="team-review-links">${item.links.map(link => `<a href="${escape(link.href)}">${escape(link.label)}</a>`).join(' · ')}</p>` : ''}</li>`).join('')}</ul></details>`;
  }).join('')}<p>No score or win guarantee. Skill unlocks, movement and conditional effects still need in-game review. Unfinished drafts can be saved.</p></div>`;
}

export function buildLibrary(store = personalStore('bm-gaming-wiki-custom-teams-v1', []), makeId = () => globalThis.crypto.randomUUID()) {
  const list = () => { const records = store.read(); return Array.isArray(records) ? records.filter(record => record && typeof record.id === 'string' && record.id).map(normalizeBuild) : []; };
  return { list, load: id => list().find(record => record.id === id),
    save(build) { const record = normalizeBuild(build); record.id ||= makeId(); const records = list().filter(item => item.id !== record.id); return { record, persisted: store.write([...records, record]) }; },
    remove(id) { return store.write(list().filter(record => record.id !== id)); }
  };
}

export function createCustomTeamBuilder(options) {
  const { pack, heroes, abilities, escapeHtml: escape, portrait, bossReminder, requirements, getOwned, getRoster, setOwned } = options;
  const library = buildLibrary();
  let build = emptyBuild();
  let notice = '';
  let showAll = false;
  let compatibleOnly = true;
  const context = () => ({ pack, heroes, abilities, owned: getOwned(), quantities: quantityStore.read(), roster: getRoster() });
  const option = (value, label, selected, disabled = false) => `<option value="${escape(value)}"${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}>${escape(label)}</option>`;
  function heroHeading(slot, index) {
    const hero = heroes.find(hero => hero.id === slot.heroId);
    return `<h4>Rank ${4 - index} · ${escape(hero?.name || slot.heroId || 'Choose hero')}</h4>`;
  }
  function renderSkills(slot, index) {
    const skills = combatSkills(slot.heroId, pack, abilities);
    return `<fieldset>${heroHeading(slot, index)}<p>${slot.skills.length}/4 selected. Rank checks describe the starting formation; movement can change it.</p>${skills.length ? skills.map(skill => {
      const checked = slot.skills.includes(skill.id);
      return `<label class="custom-skill"><input type="checkbox" data-custom-skill="${escape(skill.id)}" data-slot="${index}"${checked ? ' checked' : ''}${!checked && slot.skills.length >= 4 ? ' disabled' : ''}><span><strong>${escape(skill.name)}</strong> · ${skillWorks(skill, 4 - index) ? 'Usable here' : `Unavailable here: requires rank ${skill.ranks.join(', ')}`}<small>Targets: ${escape(skill.target)} · ${skill.verified ? 'Reference-checked' : 'Older reference; incomplete validation'}</small><small>${escape(skill.effects)}</small></span></label>`;
    }).join('') : '<p>Combat skill data is missing. This hero cannot be validated.</p>'}${slot.skills.filter(id => !skills.some(skill => skill.id === id)).map(id => `<label class="custom-skill"><input type="checkbox" data-custom-skill="${escape(id)}" data-slot="${index}" checked>Unavailable saved skill: ${escape(id)} (uncheck to remove)</label>`).join('')}<a href="#hero/${escape(slot.heroId)}/abilities">Full skill reference and sources →</a></fieldset>`;
  }
  function renderEquipment(slot, index) {
    const ctx = context();
    const items = pack.trinkets.filter(item => (!compatibleOnly || compatibleTrinket(item, slot.heroId)) && (showAll || ctx.owned.includes(item.id) || slot.trinkets.includes(item.id)));
    return `<fieldset>${heroHeading(slot, index)}${slot.trinkets.map((id, equipmentIndex) => {
      const item = pack.trinkets.find(item => item.id === id);
      const details = item ? `<p>${escape(item.effects.map(effect => `${effect.text}${effect.condition ? ` (${effect.condition})` : ''} [${effect.verification?.status || 'unverified'}]`).join('; '))}</p><p>${requirements(item.requirements)} · Class restriction: ${escape(item.classRestrictionHeroRouteIds?.join(', ') || 'None recorded')}</p><a href="#game/darkest-dungeon/trinkets/${escape(item.routeId)}">Trinket reference →</a>` : '';
      return `<label>Trinket slot ${equipmentIndex + 1}<select data-custom-equipment="${equipmentIndex}" data-slot="${index}">${option('', 'Empty slot', !id)}${id && !items.some(item => item.id === id) ? option(id, `Unavailable: ${id}`, true) : ''}${items.map(item => {
        const count = copyQuantity(item.id, ctx.owned, ctx.quantities);
        const elsewhere = build.party.reduce((sum, member, memberIndex) => sum + member.trinkets.filter((value, i) => value === item.id && !(memberIndex === index && i === equipmentIndex)).length, 0);
        return option(item.id, `${item.name} · ${count} owned · ${elsewhere} assigned`, item.id === id, item.id !== id && (!compatibleTrinket(item, slot.heroId) || elsewhere >= count || slot.trinkets[1 - equipmentIndex] === item.id));
      }).join('')}</select></label>${details}`;
    }).join('')}<details><summary>Documented alternatives for this hero</summary>${alternatives(slot.heroId)}</details></fieldset>`;
  }
  function alternatives(heroId) {
    const boss = pack.bosses.find(boss => boss.id === build.bossId);
    const teams = (boss?.counterTeams || []).filter(team => team.members.some(member => member.heroRouteId === heroId));
    return teams.map(team => {
      const member = team.members.find(member => member.heroRouteId === heroId);
      const names = (member.alternativeTrinketIds || []).map(id => pack.trinkets.find(item => item.id === id || item.routeId === id)?.name || `${id} (missing reference)`);
      return `<p>${escape(names.join(', ') || 'No alternatives recorded')} — <a href="#game/darkest-dungeon/teams/${escape(team.id)}">${escape(team.name)}</a></p>`;
    }).join('') || '<p>No boss-team alternatives documented for this hero. <a href="#game/darkest-dungeon/trinkets">Browse the collection</a>.</p>';
  }
  function render() {
    if (!pack) return '<p>Custom builder unavailable: game data failed to load.</p>';
    const boss = pack.bosses.find(boss => boss.id === build.bossId);
    const ctx = context();
    const review = reviewBuild(build, ctx);
    return `<div class="custom-team-builder"><p>Plan a custom party independently of the recommended teams below. All five sections stay available.</p>
      <section><h3>1. Select Boss</h3><label>Boss<select data-custom-boss>${option('', 'Choose a boss', !boss)}${pack.bosses.map(item => option(item.id, `${item.name}${item.variants?.length ? ` / ${item.variants.map(variant => variant.name).join(' / ')}` : ''} · ${item.regionLabel}`, item.id === build.bossId)).join('')}</select></label><label>Campaign difficulty<select data-custom-tier>${option('', 'Not selected / not recorded', !build.tier)}${(boss?.variants || []).map(variant => option(variant.tier, `${variant.tier} · ${variant.name}`, variant.tier === build.tier)).join('')}</select></label>${boss ? `<p>${escape(boss.regionLabel)} · ${requirements(boss.requirements)}</p>${bossReminder(boss, build.tier)}<details><summary>All recorded tactical considerations</summary><ul>${(boss.tacticalConsiderations || []).map(item => `<li>${escape(item.text)} [${escape(item.verification?.status || 'unverified')}]</li>`).join('') || '<li>Not recorded.</li>'}</ul></details>` : ''}</section>
      <section><h3>2. Select Four Heroes</h3><p>Rear rank 4 → front rank 1. Choosing a hero already in the party swaps their positions and equipment. Unavailable heroes remain selectable.</p><div class="custom-party">${build.party.map((slot, index) => {
        const hero = heroes.find(hero => hero.id === slot.heroId);
        return `<article>${heroHeading(slot, index)}${hero ? portrait(hero.name) : '<div class="custom-empty-portrait">Empty rank</div>'}<label>Hero in rank ${4 - index}<select data-custom-hero="${index}">${option('', 'Choose hero', !slot.heroId)}${slot.heroId && !hero ? option(slot.heroId, `Missing: ${slot.heroId}`, true) : ''}${heroes.map(hero => option(hero.id, `${hero.name}${ctx.roster?.initialized && !ctx.roster.heroIds.includes(hero.id) ? ' · not marked available' : ''}`, hero.id === slot.heroId)).join('')}</select></label>${hero?.requirements ? `<p>${requirements(hero.requirements)}</p>` : ''}</article>`;
      }).join('')}</div></section>
      <section><h3>3. Choose Skills</h3><p>Choose four skills per hero. Values use the existing level-1 references; upgrade values and dynamic combat conditions are not simulated. Abomination form rules are not modeled.</p><div class="custom-build-grid">${build.party.map((slot, index) => slot.heroId ? renderSkills(slot, index) : '').join('')}</div></section>
      <section><h3>4. Equip Trinkets</h3><p>Previously owned items count as one copy unless you record more. Unowned and exhausted items can be viewed but cannot be equipped.</p><label><input type="checkbox" data-custom-all${showAll ? ' checked' : ''}> View other available trinkets</label><label><input type="checkbox" data-custom-compatible${compatibleOnly ? ' checked' : ''}> Filter by hero compatibility</label><details><summary>Manage collection copies</summary><p>Zero removes ownership. Counts are shared with your personal collection.</p><div class="custom-quantities">${pack.trinkets.map(item => `<label>${escape(item.name)} <a href="#game/darkest-dungeon/trinkets/${escape(item.routeId)}">Effects & restrictions</a><small>${escape(item.effects.map(effect => effect.text + (effect.condition ? ` (${effect.condition})` : '')).join('; '))} · ${escape(item.verification?.status || 'unverified')} · ${requirements(item.requirements)} · Class: ${escape(item.classRestrictionHeroRouteIds?.join(', ') || 'unrestricted')}</small><input type="number" min="0" step="1" max="999" data-custom-quantity="${escape(item.id)}" value="${copyQuantity(item.id, ctx.owned, ctx.quantities)}"></label>`).join('')}</div></details><div class="custom-build-grid">${build.party.map((slot, index) => slot.heroId ? renderEquipment(slot, index) : '').join('')}</div></section>
      <section><h3>5. Review and Save</h3>${renderTeamReview(review, escape)}<details><summary>Selected party, skills and equipment</summary><ol class="custom-review">${build.party.map((slot, index) => `<li>${heroHeading(slot, index)}<p>Skills: ${escape(slot.skills.map(id => combatSkills(slot.heroId, pack, abilities).find(skill => skill.id === id)?.name || `Missing: ${id}`).join(', ') || 'None')}</p><p>Trinkets: ${escape(slot.trinkets.map(id => pack.trinkets.find(item => item.id === id)?.name || (id ? `Missing: ${id}` : 'Empty')).join(', '))}</p></li>`).join('')}</ol></details><label>Composition name<input data-custom-name maxlength="100" value="${escape(build.name)}"></label><div class="custom-actions"><button type="button" data-custom-action="save">${build.id ? 'Save changes' : 'Save composition'}</button><button type="button" data-custom-action="new">New composition</button></div><label>Saved compositions<select data-custom-saved>${option('', 'Select a saved composition', !build.id)}${library.list().map(record => option(record.id, record.name, record.id === build.id)).join('')}</select></label><div class="custom-actions"><button type="button" data-custom-action="load">Load selected</button><button type="button" data-custom-action="delete">Delete selected</button></div><p role="status" aria-live="polite" id="custom-build-status">${escape(notice || 'Personal builds are stored only in this browser.')}</p></section></div>`;
  }
  function refresh() {
    const target = document.getElementById('custom-team-content');
    if (!target) return;
    // Preserve keyboard focus and open disclosure panels when controls are redrawn.
    const active = document.activeElement;
    const focusData = active?.dataset ? { ...active.dataset } : null;
    const open = [...target.querySelectorAll('details:not([data-review-group])')].map(element => element.open);
    const reviewState = new Map([...target.querySelectorAll('[data-review-group]')].map(element => [element.dataset.reviewGroup, { open: element.open, signature: element.dataset.reviewSignature }]));
    target.innerHTML = render();
    target.querySelectorAll('details:not([data-review-group])').forEach((element, index) => { element.open = !!open[index]; });
    target.querySelectorAll('[data-review-group]').forEach(element => {
      const previous = reviewState.get(element.dataset.reviewGroup);
      if (previous?.signature === element.dataset.reviewSignature) element.open = previous.open;
    });
    if (focusData) [...target.querySelectorAll('input, select, button')].find(element => Object.keys(focusData).length && Object.entries(focusData).every(([key, value]) => element.dataset[key] === value))?.focus({ preventScroll: true });
  }
  function change(event) {
    const input = event.target;
    const data = input.dataset;
    if (!input.closest('#custom-team-content')) return;
    if ('customName' in data) { build.name = input.value; return; }
    if ('customSaved' in data) return;
    if ('customHero' in data) selectHero(build, Number(data.customHero), input.value);
    if ('customBoss' in data) { build.bossId = input.value; build.tier = ''; }
    if ('customTier' in data) build.tier = input.value;
    if ('customAll' in data) showAll = input.checked;
    if ('customCompatible' in data) compatibleOnly = input.checked;
    if ('customSkill' in data) {
      const slot = build.party[Number(data.slot)];
      if (input.checked && slot.skills.length < 4) slot.skills.push(data.customSkill);
      else if (!input.checked) slot.skills = slot.skills.filter(id => id !== data.customSkill);
    }
    if ('customEquipment' in data) {
      const slot = build.party[Number(data.slot)];
      const index = Number(data.customEquipment);
      const item = pack.trinkets.find(item => item.id === input.value);
      const count = build.party.flatMap(member => member.trinkets).filter(id => id === input.value).length;
      if (!input.value || (compatibleTrinket(item, slot.heroId) && slot.trinkets[1 - index] !== input.value && count < copyQuantity(input.value, getOwned()))) slot.trinkets[index] = input.value;
      else notice = 'Equipment rejected: check compatibility and recorded copies.';
    }
    if ('customQuantity' in data) {
      const count = Number(input.value);
      if (!Number.isSafeInteger(count) || count < 0 || count > 999) { notice = 'Enter a whole copy count from 0 to 999.'; refresh(); return; }
      const persisted = quantityStore.write({ ...quantityStore.read(), [data.customQuantity]: count });
      const ownership = setOwned(data.customQuantity, count > 0);
      notice = persisted && ownership.persisted ? 'Collection copies saved.' : 'Storage unavailable: collection changes last only for this session.';
    }
    refresh();
  }
  function click(event) {
    const button = event.target.closest('[data-custom-action]');
    if (!button) return;
    const action = button.dataset.customAction;
    const selectedId = document.querySelector('[data-custom-saved]')?.value;
    if (action === 'new') { build = emptyBuild(); notice = 'New draft.'; }
    if (action === 'save') {
      build.name = document.querySelector('[data-custom-name]')?.value.trim() || '';
      if (!build.name) { notice = 'Enter a composition name before saving.'; refresh(); return; }
      const result = library.save(build); build = result.record;
      notice = result.persisted ? 'Composition saved locally.' : 'Storage unavailable: build saved for this session only.';
    }
    if (action === 'load') { const saved = library.load(selectedId); if (saved) { build = saved; notice = 'Composition loaded. Review warnings for stale data and collection changes.'; } }
    if (action === 'delete' && selectedId) { const persisted = library.remove(selectedId); if (build.id === selectedId) build.id = ''; notice = persisted ? 'Saved composition deleted; current draft retained.' : 'Deleted for this session only; browser storage is unavailable.'; }
    refresh();
  }
  return { render, refresh, change, click };
}
