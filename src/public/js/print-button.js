// Binds [data-print] buttons to window.print().
// Needed because the default Helmet CSP blocks inline event handlers.
(function () {
  document.querySelectorAll('[data-print]').forEach((button) => {
    button.addEventListener('click', () => window.print());
  });
})();
