// CSV import UI: file selection, drag-and-drop, and POST to /firearms/import.
// Used by /firearms/import.
(function () {
  const fileInput = document.getElementById('csv-file');
  const uploadArea = document.getElementById('upload-area');
  const uploadText = document.getElementById('upload-text');
  const importBtn = document.getElementById('import-btn');
  const resultsCard = document.getElementById('results-card');
  const resultsSummary = document.getElementById('results-summary');
  const resultsErrors = document.getElementById('results-errors');
  const csrfToken = document.getElementById('csrf-token').value;

  fileInput.addEventListener('change', function () {
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
    if (e.dataTransfer.files.length > 0) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });

  importBtn.addEventListener('click', function () {
    const file = fileInput.files[0];
    if (!file) return;

    importBtn.disabled = true;
    importBtn.textContent = 'Importing…';

    const reader = new FileReader();
    reader.onload = function (e) {
      fetch('/firearms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'x-csrf-token': csrfToken },
        body: e.target.result
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.error) {
            resultsSummary.textContent = data.error;
            resultsErrors.hidden = true;
          } else {
            const plural = data.imported === 1 ? 'record' : 'records';
            const tail = data.failed > 0 ? `, ${data.failed} skipped due to errors.` : '.';
            resultsSummary.textContent = `${data.imported} ${plural} imported successfully${tail}`;

            if (data.errors && data.errors.length > 0) {
              resultsErrors.innerHTML = data.errors.map(function (rowErr) {
                return `<li>Row ${rowErr.row}: ${rowErr.errors}</li>`;
              }).join('');
              resultsErrors.hidden = false;
            } else {
              resultsErrors.hidden = true;
            }
          }
          resultsCard.hidden = false;
          resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        })
        .catch(function () {
          resultsSummary.textContent = 'An unexpected error occurred. Please try again.';
          resultsErrors.hidden = true;
          resultsCard.hidden = false;
        })
        .finally(function () {
          importBtn.disabled = false;
          importBtn.textContent = 'Import';
        });
    };
    reader.readAsText(file);
  });
}());
