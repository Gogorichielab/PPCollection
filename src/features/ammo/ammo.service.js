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

function createAmmoService(ammoRepository) {
  return {
    paginate(page, perPage, userId) {
      return ammoRepository.paginate(page, perPage, userId);
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

    update(id, data, userId) {
      const total_rounds = computeTotalRounds(data);
      ammoRepository.update(id, { ...data, total_rounds }, userId);
    },

    remove(id, userId) {
      ammoRepository.remove(id, userId);
    },

    importFromCsv(csvText, userId) {
      const rows = parseCsv(csvText);
      if (rows.length < 2) {
        return { imported: 0, failed: 0, errors: [] };
      }

      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const dataRows = rows.slice(1);

      if (dataRows.length > MAX_IMPORT_ROWS) {
        return {
          imported: 0,
          failed: 0,
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

      if (validRows.length > 0) {
        ammoRepository.bulkCreate(validRows);
      }

      return { imported: validRows.length, failed: errors.length, errors };
    },

    streamCsv(writeChunk, userId) {
      writeChunk(`${CSV_HEADERS.join(',')}\n`);
      for (const item of ammoRepository.iterate(userId)) {
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

    getTotalRounds(userId) {
      return ammoRepository.getTotalRounds(userId);
    }
  };
}

module.exports = { createAmmoService, CSV_HEADERS, MAX_IMPORT_ROWS };
