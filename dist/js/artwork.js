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

export function renderEntryArtwork(category, record, slot = 'primary', fallback = '', overlay = '') {
  const paths = artworkCandidates(category, record, slot);
  if (slot !== 'banner' && record.assetPath) paths.push(record.assetPath);
  if (!fallback && slot !== 'banner') fallback = `<span class="encyclopedia-mark" role="img" aria-label="${escape(record.name)} artwork unavailable"><span aria-hidden="true">${escape(record.name.split(/\s+/).map(word => word[0]).join('').slice(0, 3))}</span><small>No local art</small></span>`;
  if (!paths.length) return fallback;
  const id = category === 'heroes' && !record.id.includes(':') ? `darkest-dungeon-1:hero:${record.id}` : record.id;
  const entry = artworkRecords.get(id);
  const asset = [entry?.[slot], entry?.primary].find(asset => asset?.path === paths[0]);
  return `<span class="entry-art entry-art-${category} entry-art-${slot}" data-entry-art><img data-entry-image data-art-remaining="${escape(JSON.stringify(paths.slice(1)))}" src="${escape(paths[0])}" alt="${escape(asset?.alt || `${record.name} artwork; origin unverified`)}">${overlay}<span data-art-fallback hidden>${fallback}</span></span>`;
}

export function handleArtworkError(event) {
  const image = event.target;
  if (!image.matches('[data-entry-image]')) return;
  const remaining = JSON.parse(image.dataset.artRemaining || '[]');
  if (remaining.length) {
    image.dataset.artRemaining = JSON.stringify(remaining.slice(1));
    image.src = remaining[0];
    return;
  }
  image.hidden = true;
  const frame = image.closest('[data-entry-art]');
  frame.classList.add('image-failed');
  frame.querySelector('[data-art-fallback]').hidden = false;
}
