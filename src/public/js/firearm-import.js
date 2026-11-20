// CSV import UI: file selection, drag-and-drop, and POST to the button's data-import-url.
// Used by /firearms/import and /ammo/import.
(function () {
  const fileInput = document.getElementById('csv-file');
  const uploadArea = document.getElementById('upload-area');
  const uploadText = document.getElementById('upload-text');
  const importBtn = document.getElementById('import-btn');
  const importSpinner = document.getElementById('import-spinner');
  const resultsCard = document.getElementById('results-card');
  const resultsSummary = document.getElementById('results-summary');
  const resultsErrors = document.getElementById('results-errors');
  const csrfToken = document.getElementById('csrf-token').value;

  const confirmBtn = document.getElementById('confirm-import');
  const resultTitle = document.getElementById('import-result-title');
  let previewCount = null;

  fileInput.addEventListener('change', function () {
    previewCount = null;
    if (confirmBtn) confirmBtn.hidden = true;
    resultsCard.hidden = true;
    if (this.files.length > 0) {
      uploadText.textContent = this.files[0].name;
      uploadArea.classList.add('upload-area--selected');
      importBtn.disabled = false;
    } else {
      uploadText.textContent = 'Choose a CSV file or drag and drop';
      uploadArea.classList.remove('upload-area--selected');
      importBtn.disabled = true;
    }
  });

  uploadArea.addEventListener('dragover', function (e) { e.preventDefault(); uploadArea.classList.add('upload-area--drag'); });
  uploadArea.addEventListener('dragenter', function (e) { e.preventDefault(); uploadArea.classList.add('upload-area--drag'); });
  uploadArea.addEventListener('dragleave', function () { uploadArea.classList.remove('upload-area--drag'); });
  uploadArea.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadArea.classList.remove('upload-area--drag');
    if (!fileInput.disabled && e.dataTransfer.files.length > 0) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });

  function renderRowErrors(errors) {
    resultsErrors.replaceChildren();
    errors.forEach(function (rowErr) {
      const li = document.createElement('li');
      const rowLabel = document.createElement('strong');
      rowLabel.textContent = `Row ${rowErr.row}: `;
      li.appendChild(rowLabel);

      if (Array.isArray(rowErr.errors)) {
        const sub = document.createElement('ul');
        rowErr.errors.forEach(function (e) {
          const subLi = document.createElement('li');
          if (e && typeof e === 'object' && e.field) {
            const field = document.createElement('strong');
            field.textContent = `${e.field}: `;
            subLi.appendChild(field);
            subLi.appendChild(document.createTextNode(e.message || ''));
          } else {
            subLi.textContent = String(e);
          }
          sub.appendChild(subLi);
        });
        li.appendChild(sub);
      } else {
        li.appendChild(document.createTextNode(String(rowErr.errors)));
      }

      resultsErrors.appendChild(li);
    });
    resultsErrors.hidden = errors.length === 0;
  }

  async function submit(preview) {
    const file = fileInput.files[0];
    if (!file || fileInput.disabled) return;
    const expectedCount = previewCount;
    previewCount = null;
    if (confirmBtn) confirmBtn.hidden = true;
    if (resultTitle) resultTitle.textContent = preview ? 'Import preview' : 'Import results';
    fileInput.disabled = true;
    importBtn.disabled = true;
    if (importSpinner) importSpinner.hidden = false;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('File too large. Maximum size is 2 MB.');
      const headers = { 'Content-Type': 'text/plain', 'x-csrf-token': csrfToken };
      if (!preview && expectedCount !== null) headers['x-confirm-import-count'] = String(expectedCount);
      const response = await fetch(preview ? importBtn.dataset.previewUrl : importBtn.dataset.importUrl, {
        method: 'POST', headers, body: await file.text()
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || 'Import failed. Please try again.');
      renderRowErrors(result.errors || []);
      const skipped = result.failed ? ` ${result.failed} invalid row(s) skipped.` : '';
      if (preview) {
        previewCount = result.previousImports;
        const warning = previewCount ? ' This file was previously imported. Confirm only for another shipment.' : '';
        resultsSummary.textContent = `${result.lots} lot(s) · ${result.rounds.toLocaleString()} rounds to add.${skipped}${warning}`;
        confirmBtn.textContent = previewCount ? 'Import identical shipment again' : 'Confirm import';
        confirmBtn.hidden = !result.lots;
      } else {
        resultsSummary.textContent = `${result.imported} record(s) imported.${skipped}`;
      }
    } catch (error) {
      resultsSummary.textContent = error.message || 'An unexpected error occurred. Please try again.';
      resultsErrors.hidden = true;
    } finally {
      resultsCard.hidden = false;
      resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      fileInput.disabled = false;
      importBtn.disabled = false;
      if (importSpinner) importSpinner.hidden = true;
    }
  }
  importBtn.addEventListener('click', () => submit(Boolean(importBtn.dataset.previewUrl)));
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (previewCount !== null) submit(false);
    });
  }
}());
