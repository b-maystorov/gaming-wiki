export function initializeSiteNavigation(documentObject = globalThis.document) {
  const header = documentObject?.getElementById('site-header-inner');
  const navigation = documentObject?.getElementById('primary-navigation');
  const menuToggle = documentObject?.getElementById('mobile-navigation-toggle');
  const dropdown = documentObject?.getElementById('universes-menu');
  const summary = dropdown?.querySelector('summary');
  if (!header || !navigation || !menuToggle || !dropdown || !summary) return false;

  const setMenuOpen = open => {
    header.dataset.menuOpen = String(open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };

  dropdown.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(dropdown.open)));
  menuToggle.addEventListener('click', () => setMenuOpen(header.dataset.menuOpen !== 'true'));
  navigation.addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    dropdown.open = false;
    setMenuOpen(false);
  });
  documentObject.addEventListener('click', event => {
    if (!dropdown.contains(event.target)) dropdown.open = false;
    if (!navigation.contains(event.target) && event.target !== menuToggle) setMenuOpen(false);
  });
  documentObject.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (dropdown.open) {
      dropdown.open = false;
      summary.focus();
    } else if (header.dataset.menuOpen === 'true') {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
  return true;
}
