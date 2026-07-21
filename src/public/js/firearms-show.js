// Delete confirmation modal behavior for firearm details page
(function() {
  const deleteForm = document.getElementById('delete-form');
  const modal = document.querySelector('[data-delete-modal]');
  const openButton = document.querySelector('[data-delete-open]');
  const cancelButton = document.querySelector('[data-delete-cancel]');
  const confirmButton = document.querySelector('[data-delete-confirm]');

  if (!deleteForm || !modal || !openButton || !cancelButton || !confirmButton) {
    return;
  }

  let previousFocus = null;

  function openModal() {
    previousFocus = document.activeElement;
    modal.classList.add('modal-active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const firstFocusable = getFocusableElements()[0] || cancelButton;
    firstFocusable.focus();
  }

  function closeModal() {
    modal.classList.remove('modal-active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    const target = previousFocus && typeof previousFocus.focus === 'function'
      ? previousFocus
      : openButton;
    target.focus();
    previousFocus = null;
  }

  function getFocusableElements() {
    return Array.from(
      modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.disabled);
  }

  openButton.addEventListener('click', openModal);
  cancelButton.addEventListener('click', closeModal);
  confirmButton.addEventListener('click', () => deleteForm.submit());

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!modal.classList.contains('modal-active')) return;

    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = getFocusableElements();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  });
})();

// Prefill log-form date inputs with the browser-local date. Done client-side
// because the server clock (often UTC in Docker) can be a day off from the
// user's timezone; without JS the fields stay blank and required.
(function() {
  const inputs = document.querySelectorAll('input[type="date"][data-default-today]');
  if (!inputs.length) return;

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');

  inputs.forEach((input) => {
    if (!input.value) input.value = today;
  });
})();
