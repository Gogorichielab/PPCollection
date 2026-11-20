// Binds [data-print] buttons to window.print().
// Needed because the default Helmet CSP blocks inline event handlers.
(function () {
  if (document.body.classList.contains('print-report') && new URLSearchParams(location.search).get('print') === '1') {
    window.addEventListener('load', () => window.print(), { once: true });
  }
  document.querySelectorAll('[data-print]').forEach((button) => {
    button.addEventListener('click', () => window.print());
  });
})();
