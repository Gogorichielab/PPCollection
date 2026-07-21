// Photo upload for the firearm detail page. The CSRF token travels in a
// header because multipart bodies are parsed after the CSRF check runs.
(function () {
  const input = document.querySelector('[data-photo-input]');
  const button = document.querySelector('[data-photo-upload]');
  const errorEl = document.querySelector('[data-photo-error]');
  if (!input || !button) return;

  const csrfToken = document.getElementById('csrf-token').value;
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — matches the server upload limit

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  button.addEventListener('click', function () {
    const file = input.files[0];
    if (!file) {
      showError('Choose an image first.');
      return;
    }
    if (file.size > MAX_BYTES) {
      showError('Photos must be 10 MB or smaller.');
      return;
    }

    errorEl.hidden = true;
    button.disabled = true;
    button.textContent = 'Uploading…';

    const formData = new FormData();
    formData.append('photo', file);

    fetch(button.getAttribute('data-photo-url'), {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken },
      body: formData
    })
      .then(function (response) {
        if (response.ok) {
          window.location.reload();
          return null;
        }
        return response.json().then(function (data) {
          showError((data && data.error) || 'Upload failed. Please try again.');
        });
      })
      .catch(function () {
        showError('Upload failed. Please try again.');
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = 'Upload';
      });
  });
}());
