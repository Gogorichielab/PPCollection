(function () {
  const form = document.querySelector('[data-guard-edits]');
  if (!form) return;
  const snapshot = () => JSON.stringify(Array.from(new FormData(form)));
  const original = snapshot();
  const dialog = document.getElementById('discard-dialog');
  let destination;
  function beforeUnload(event) {
    if (snapshot() === original) return;
    event.preventDefault();
    event.returnValue = '';
  }
  function updateGuard() {
    if (snapshot() === original) window.removeEventListener('beforeunload', beforeUnload);
    else window.addEventListener('beforeunload', beforeUnload);
  }
  form.addEventListener('input', updateGuard);
  form.addEventListener('change', updateGuard);
  form.addEventListener('submit', () => window.removeEventListener('beforeunload', beforeUnload));
  window.addEventListener('pageshow', updateGuard);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey ||
        event.altKey || link.target === '_blank' || link.hasAttribute('download') || snapshot() === original) return;
    const url = new URL(link.href);
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    event.preventDefault();
    destination = url.href;
    dialog.showModal();
  });
  dialog.querySelector('[data-discard]').addEventListener('click', () => {
    window.removeEventListener('beforeunload', beforeUnload);
    dialog.close();
    location.assign(destination);
  });
})();
