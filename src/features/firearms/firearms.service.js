const { parseCsv, escapeCsvValue } = require('../../shared/utils/csv');
const { sanitizeFirearmInput, validateFirearmInput, isDispositionStatus } = require('./firearms.validators');

const MAX_IMPORT_ROWS = 5000;

const CSV_HEADERS = [
  'Make',
  'Model',
  'Serial',
  'Caliber',
  'Purchase Date',
  'Purchase Price',
  'Condition',
  'Location',
  'Status',
  'Disposition Name',
  'Disposition Address',
  'Disposition Date',
  'Disposition Reason',
  'Firearm Type',
  'Gun Warranty',
  'Notes'
];

function createFirearmsService(firearmsRepository) {
  return {
    list(userId = 1) {
      return firearmsRepository.all(userId);
    },

    paginate(page = 1, perPage = 25, userId = 1) {
      return firearmsRepository.paginate(page, perPage, userId);
    },

    getById(id, userId = 1) {
      return firearmsRepository.get(id, userId);
    },

    create(data, userId = 1) {
      if (data.serial && firearmsRepository.findBySerial(data.serial, null, userId)) {
        throw Object.assign(new Error('Serial number already exists.'), { code: 'DUPLICATE_SERIAL' });
      }
      return firearmsRepository.create({ ...data, user_id: userId });
    },

    update(id, data, userId = 1) {
      if (data.serial && firearmsRepository.findBySerial(data.serial, id, userId)) {
        throw Object.assign(new Error('Serial number already exists.'), { code: 'DUPLICATE_SERIAL' });
      }
      firearmsRepository.update(id, data, userId);
    },

    remove(id, userId = 1) {
      firearmsRepository.remove(id, userId);
    },

    importFromCsv(csvText, userId = 1) {
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

      const col = (name) => headers.indexOf(name);

      const seenSerials = new Set();
      const validRows = [];
      const errors = [];

      for (let i = 0; i < dataRows.length; i++) {
        const r = dataRows[i];
        const get = (name) => (r[col(name)] || '').trim();

        const rawWarranty = get('gun warranty');
        const body = {
          make: get('make'),
          model: get('model'),
          serial: get('serial'),
          caliber: get('caliber'),
          purchase_date: get('purchase date'),
          purchase_price: get('purchase price'),
          condition: get('condition'),
          location: get('location'),
          status: get('status'),
          disposition_name: get('disposition name'),
          disposition_address: get('disposition address'),
          disposition_date: get('disposition date'),
          disposition_reason: get('disposition reason'),
          firearm_type: get('firearm type'),
          gun_warranty: rawWarranty.toLowerCase() === 'yes' ? '1' : '',
          notes: get('notes')
        };

        const data = sanitizeFirearmInput(body);
        const { isValid, fieldErrors } = validateFirearmInput(data);

        if (!isValid) {
          errors.push({
            row: i + 2,
            errors: Object.entries(fieldErrors).map(([field, message]) => ({ field, message }))
          });
          continue;
        }

        if (data.serial) {
          if (seenSerials.has(data.serial)) {
            errors.push({
              row: i + 2,
              errors: [{ field: 'serial', message: 'Duplicate serial number in this import.' }]
            });
            continue;
          }
          if (firearmsRepository.findBySerial(data.serial, null, userId)) {
            errors.push({
              row: i + 2,
              errors: [{ field: 'serial', message: 'Serial number already exists.' }]
            });
            continue;
          }
          seenSerials.add(data.serial);
        }

        validRows.push({ ...data, user_id: userId });
      }

      if (validRows.length > 0) {
        firearmsRepository.bulkCreate(validRows);
      }

      return { imported: validRows.length, failed: errors.length, errors };
    },

    streamCsv(writeChunk, userId = 1) {
      writeChunk(`${CSV_HEADERS.map(escapeCsvValue).join(',')}\n`);
      for (const item of firearmsRepository.iterate(userId)) {
        const row = itemToCsvRow(item);
        writeChunk(`${row.map(escapeCsvValue).join(',')}\n`);
      }
    }
  };
}

function itemToCsvRow(item) {
  let warrantyLabel = '';
  if (item.gun_warranty === 1) warrantyLabel = 'Yes';
  else if (item.gun_warranty === 0) warrantyLabel = 'No';

  const isDisposition = isDispositionStatus(item.status);

  return [
    item.make || '',
    item.model || '',
    item.serial || '',
    item.caliber || '',
    item.purchase_date || '',
    item.purchase_price ?? '',
    item.condition || '',
    item.location || '',
    item.status || '',
    isDisposition ? item.disposition_name || '' : '',
    isDisposition ? item.disposition_address || '' : '',
    isDisposition ? item.disposition_date || '' : '',
    isDisposition ? item.disposition_reason || '' : '',
    item.firearm_type || '',
    warrantyLabel,
    item.notes || ''
  ];
}

module.exports = { createFirearmsService, CSV_HEADERS, MAX_IMPORT_ROWS };
