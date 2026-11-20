(function () {
  const form = document.querySelector('[data-document-upload]');
  if (!form) return;
  const feedback = form.querySelector('[role=status]');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const file = form.elements.document.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      feedback.textContent = 'Choose a PDF smaller than 5 MB.';
      return;
    }
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch(`${form.action}?category=${encodeURIComponent(form.elements.category.value)}`, {
        method: 'POST', body: file, headers: { 'Content-Type': 'application/pdf', 'x-document-name': encodeURIComponent(file.name),
          'x-csrf-token': document.getElementById('csrf-token').value }
      });
      if (!response.ok || response.redirected) throw new Error('Upload failed. Check the PDF and try again.');
      location.reload();
    } catch (error) {
      feedback.textContent = error.message;
      button.disabled = false;
    }
  });
})();
