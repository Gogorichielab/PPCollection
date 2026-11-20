const { createHash } = require('node:crypto');
const { parseCsv, escapeCsvValue } = require('../../shared/utils/csv');
const { sanitizeAmmoInput, validateAmmoInput } = require('./ammo.validators');

const MAX_IMPORT_ROWS = 5000;

const CSV_HEADERS = [
  'Manufacturer',
  'Product',
  'Caliber',
  'Grain',
  'Load Type',
  'Boxes',
  'Rounds Per Box',
  'Loose Rounds',
  'Total Rounds',
  'Location',
  'Notes'
];

function computeTotalRounds(data) {
  return data.boxes * data.rounds_per_box + data.loose_rounds;
}

function parseImport(csvText, userId) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { validRows: [], errors: [] };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1);

  if (dataRows.length > MAX_IMPORT_ROWS) {
    return {
      validRows: [],
      errors: [],
      tooManyRows: true,
      maxRows: MAX_IMPORT_ROWS,
      rowCount: dataRows.length
    };
  }

  const validRows = [];
  const errors = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const get = (name) => (r[headers.indexOf(name)] || '').trim();

    const data = sanitizeAmmoInput({
      manufacturer: get('manufacturer'),
      product_line: get('product'),
      caliber: get('caliber'),
      grain: get('grain'),
      load_type: get('load type'),
      boxes: get('boxes'),
      rounds_per_box: get('rounds per box'),
      loose_rounds: get('loose rounds'),
      location: get('location'),
      notes: get('notes')
    });
    const { isValid, fieldErrors } = validateAmmoInput(data);

    if (!isValid) {
      errors.push({
        row: i + 2,
        errors: Object.entries(fieldErrors).map(([field, message]) => ({ field, message }))
      });
      continue;
    }

    const total_rounds = computeTotalRounds(data);
    const suppliedTotal = get('total rounds');
    // The file's total is only a cross-check; a mismatch means the components are wrong or the total is.
    if (suppliedTotal !== '' && Number(suppliedTotal) !== total_rounds) {
      errors.push({
        row: i + 2,
        errors: [{
          field: 'total_rounds',
          message: `Total Rounds is ${suppliedTotal} but Boxes × Rounds Per Box + Loose Rounds is ${total_rounds}.`
        }]
      });
      continue;
    }

    validRows.push({ ...data, total_rounds, user_id: userId });
  }

  return { validRows, errors };
}

function createAmmoService(ammoRepository) {
  return {
    search(userId, query) {
      return ammoRepository.search(userId, query);
    },

    paginate(page, perPage, userId, caliber) {
      return ammoRepository.paginate(page, perPage, userId, caliber);
    },

    getCaliberSummary(caliber, userId) {
      return ammoRepository.getCaliberSummary(caliber, userId);
    },

    list(userId) {
      return ammoRepository.all(userId);
    },

    getById(id, userId) {
      return ammoRepository.get(id, userId);
    },

    // total_rounds is never trusted from the caller — it is always recomputed
    // here from the structural fields, so the HTML form and CSV
    // import can never write an inconsistent value.
    create(data, userId) {
      const total_rounds = computeTotalRounds(data);
      return ammoRepository.create({ ...data, total_rounds, user_id: userId });
    },

    quantityHistory(id, userId) {
      return ammoRepository.quantityHistory(id, userId);
    },

    update(id, data, userId, reason = '') {
      const total_rounds = computeTotalRounds(data);
      ammoRepository.update(id, { ...data, total_rounds }, userId, reason);
    },

    remove(id, userId) {
      ammoRepository.remove(id, userId);
    },

    importFromCsv(csvText, userId, { preview = false, expectedCount = 0, filename = 'import.csv' } = {}) {
      const parsed = parseImport(csvText, userId);
      if (parsed.tooManyRows) {
        return { imported: 0, failed: 0, errors: [], tooManyRows: true, maxRows: MAX_IMPORT_ROWS, rowCount: parsed.rowCount };
      }
      const { validRows, errors } = parsed;
      const digest = createHash('sha256').update(csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')).digest('hex');
      if (preview) {
        return {
          lots: validRows.length,
          rounds: validRows.reduce((sum, row) => sum + row.total_rounds, 0),
          previousImports: ammoRepository.importCount(userId, digest),
          failed: errors.length,
          errors
        };
      }
      if (validRows.length && !ammoRepository.saveImport(validRows, userId, digest, expectedCount, filename)) {
        return { duplicate: true };
      }
      return { imported: validRows.length, failed: errors.length, errors };
    },

    streamCsv(writeChunk, userId, query) {
      writeChunk(`${CSV_HEADERS.join(',')}\n`);
      const rows = query ? ammoRepository.search(userId, query, true) : ammoRepository.iterate(userId);
      for (const item of rows) {
        const row = [
          item.manufacturer,
          item.product_line,
          item.caliber,
          item.grain ?? '',
          item.load_type,
          item.boxes,
          item.rounds_per_box,
          item.loose_rounds,
          item.total_rounds,
          item.location,
          item.notes
        ];
        writeChunk(`${row.map(escapeCsvValue).join(',')}\n`);
      }
    },

    getCaliberBreakdown(userId) {
      return ammoRepository.getCaliberBreakdown(userId);
    },

    getRoundStats(userId) {
      const byCaliber = ammoRepository.getCaliberBreakdown(userId, { includeUnspecified: true });
      const totalRounds = byCaliber.reduce((sum, row) => sum + row.rounds, 0);
      return { totalRounds, byCaliber };
    },

    getTotalRounds(userId) {
      return ammoRepository.getTotalRounds(userId);
    }
  };
}

module.exports = { createAmmoService, CSV_HEADERS, MAX_IMPORT_ROWS };
