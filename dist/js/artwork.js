// Presentation metadata stays separate from gameplay records and legacy portraits.
let artworkRecords = new Map();
const privateRoot = 'assets/games/darkest-dungeon-1/private/';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function setArtworkManifest(manifest) {
  artworkRecords = new Map((manifest?.records || []).map(record => [record.recordId, record]));
}

export async function loadArtworkManifest() {
  try {
    const response = await fetch(new URL('../data/games/darkest-dungeon-1-artwork.json', import.meta.url));
    if (response.ok) setArtworkManifest(await response.json());
  } catch {
    // The public site also works without the optional artwork registry.
  }
}

export function artworkCandidates(category, record, slot = 'primary') {
  const id = category === 'heroes' && !record.id.includes(':') ? `darkest-dungeon-1:hero:${record.id}` : record.id;
  const entry = artworkRecords.get(id);
  const slots = slot === 'thumbnail' ? ['thumbnail', 'primary'] : [slot];
  return [...new Set(slots.map(key => entry?.[key]).filter(asset =>
    asset?.exists && asset.verifiedAuthentic && asset.verificationSource?.trim()
    && asset.path.startsWith(privateRoot) && !asset.path.split('/').includes('..')
  ).map(asset => asset.path))];
}

function renderVisual(asset, index, fallbackAlt) {
  const alt = asset.alt || fallbackAlt;
  const frame = asset.frame;
  let visual;
  if (frame) {
    // Atlas rotation is packing metadata, not the character's intended orientation.
    const transform = frame.rotated ? `translate(${frame.width} 0) rotate(90)` : '';
    visual = `<svg viewBox="0 0 ${frame.width} ${frame.height}" role="img" aria-label="${escape(alt)}" preserveAspectRatio="xMidYMid meet"><g transform="${transform}"><image data-entry-image href="${escape(asset.path)}" x="${-frame.x}" y="${-frame.y}" width="${asset.imageWidth}" height="${asset.imageHeight}"></image></g></svg>`;
  } else {
    visual = `<img data-entry-image src="${escape(asset.path)}" alt="${escape(alt)}"${asset.imageWidth ? ` width="${asset.imageWidth}" height="${asset.imageHeight}"` : ''}>`;
  }
  return `<span data-art-visual${index ? ' hidden' : ''}>${visual}</span>`;
}

export function renderEntryArtwork(category, record, slot = 'primary', fallback = '', overlay = '') {
  const paths = artworkCandidates(category, record, slot);
  if (slot !== 'banner' && record.assetPath && !paths.includes(record.assetPath)) paths.push(record.assetPath);
  if (!fallback && slot !== 'banner') fallback = `<span class="encyclopedia-mark" role="img" aria-label="${escape(record.name)} artwork unavailable"><span aria-hidden="true">${escape(record.name.split(/\s+/).map(word => word[0]).join('').slice(0, 3))}</span><small>No local art</small></span>`;
  if (!paths.length) return fallback;
  const id = category === 'heroes' && !record.id.includes(':') ? `darkest-dungeon-1:hero:${record.id}` : record.id;
  const entry = artworkRecords.get(id);
  const visuals = paths.map((path, index) => {
    const asset = [entry?.[slot], entry?.primary].find(asset => asset?.path === path) || { path };
    return renderVisual(asset, index, `${record.name} artwork; origin unverified`);
  }).join('');
  return `<span class="entry-art entry-art-${category} entry-art-${slot}" data-entry-art>${visuals}${overlay}<span data-art-fallback hidden>${fallback}</span></span>`;
}

export function handleArtworkError(event) {
  const image = event.target;
  if (!image.matches('[data-entry-image]')) return;
  const visual = image.closest('[data-art-visual]');
  visual.dataset.artFailed = 'true';
  // Hidden fallback candidates may fail before the visible image finishes loading.
  if (visual.hidden) return;
  visual.hidden = true;
  const frame = image.closest('[data-entry-art]');
  const next = [...frame.querySelectorAll('[data-art-visual]')].find(candidate => !candidate.dataset.artFailed);
  if (next) {
    next.hidden = false;
    return;
  }
  frame.classList.add('image-failed');
  frame.querySelector('[data-art-fallback]').hidden = false;
}
