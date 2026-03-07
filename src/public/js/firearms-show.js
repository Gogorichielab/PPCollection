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

  function openModal() {
    modal.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
    cancelButton.focus();
  }

  function closeModal() {
    modal.classList.remove('modal-active');
    document.body.style.overflow = '';
    openButton.focus();
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
    if (event.key === 'Escape' && modal.classList.contains('modal-active')) {
      closeModal();
    }
  });
})();
