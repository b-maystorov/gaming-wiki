export function initializeUtilityBar({ navigate, documentObject = globalThis.document } = {}) {
  const bar = documentObject?.getElementById('site-utility-bar');
  const dialog = documentObject?.getElementById('utility-dialog');
  const title = documentObject?.getElementById('utility-title');
  const closeButton = documentObject?.getElementById('close-utility-dialog');
  const databaseButton = documentObject?.getElementById('utility-database');
  if (!bar || !dialog || !title || !closeButton || !databaseButton || typeof navigate !== 'function') return false;

  const panels = [...dialog.querySelectorAll('[data-utility-content]')];
  let returnTarget = null;
  let restoreFocusOnClose = true;

  function close({ restoreFocus = true } = {}) {
    if (!dialog.open) return;
    restoreFocusOnClose = restoreFocus;
    dialog.close();
  }

  bar.querySelectorAll('[data-utility-panel]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const panel = panels.find(item => item.dataset.utilityContent === trigger.dataset.utilityPanel);
      if (!panel || dialog.open) return;
      returnTarget = trigger;
      restoreFocusOnClose = true;
      panels.forEach(item => { item.hidden = item !== panel; });
      title.textContent = panel.dataset.utilityTitle;
      dialog.showModal(); // Native modal behavior contains keyboard focus and makes background controls inert.
      documentObject.body.classList.add('utility-open');
      closeButton.focus({ preventScroll: true });
    });
  });

  databaseButton.addEventListener('click', () => {
    navigate('#game/world-of-warcraft/database');
  });
  closeButton.addEventListener('click', () => close());
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    documentObject.body.classList.remove('utility-open');
    if (restoreFocusOnClose && returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('a[href]')) close({ restoreFocus: false });
  });
  dialog.addEventListener('keydown', event => {
    // Keep the global search shortcut from opening another modal over this one.
    if (event.key === '/') event.preventDefault();
    if (event.key !== 'Tab') return;
    const links = panels.find(panel => !panel.hidden)?.querySelectorAll('a[href]') || [];
    const first = closeButton;
    const last = [...links].at(-1) || closeButton;
    if (event.shiftKey && documentObject.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && documentObject.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  return true;
}
