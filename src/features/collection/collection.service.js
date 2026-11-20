function uploadName(header, fallback) {
  try {
    const name = decodeURIComponent(header || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim();
    return name.slice(0, 200) || fallback;
  } catch {
    return fallback;
  }
}

function createCollectionService(repository, inventories) {
  return {
    ...repository,
    saveSelection(userId, kind, name, query) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) return 'Enter a name of 1 to 80 characters.';
      const selection = inventories[kind].search(userId, query).queryString;
      if (!repository.saveView(userId, kind, name.trim(), selection)) return 'A view with this name already exists.';
      return '';
    },
    attach(userId, firearmId, category, filename, bytes) {
      if (!['Receipt', 'Appraisal'].includes(category) || !Buffer.isBuffer(bytes) || bytes.subarray(0,5).toString() !== '%PDF-') {
        return 'Choose a receipt or appraisal in PDF format.';
      }
      if (!repository.addDocument(userId, firearmId, category, uploadName(filename, 'document.pdf'), bytes)) return 'Record unavailable.';
      return '';
    }
  };
}

module.exports = { createCollectionService, uploadName };
