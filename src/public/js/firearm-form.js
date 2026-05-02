// Toggles the disposition section visibility based on the firearm status.
// Used by /firearms/new and /firearms/:id/edit forms.
(function () {
  const statusSelect = document.querySelector('select[name="status"]');
  const dispositionSection = document.querySelector('.disposition-section');

  function toggleDisposition() {
    const showStatuses = ['Sold', 'Lost/Stolen'];
    const show = showStatuses.includes(statusSelect.value);
    dispositionSection.classList.toggle('hidden', !show);
    dispositionSection.querySelectorAll('input').forEach(function (input) {
      input.disabled = !show;
    });
  }

  if (statusSelect && dispositionSection) {
    statusSelect.addEventListener('change', toggleDisposition);
    toggleDisposition();
  }
})();
