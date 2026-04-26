const { parseCsv, toCsv } = require('../../shared/utils/csv');
const { sanitizeFirearmInput, validateFirearmInput, isDispositionStatus } = require('./firearms.validators');

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
    list() {
      return firearmsRepository.all();
    },

    paginate(page = 1, perPage = 25) {
      return firearmsRepository.paginate(page, perPage);
    },

    getById(id) {
      return firearmsRepository.get(id);
    },

    create(data) {
      return firearmsRepository.create(data);
    },

    update(id, data) {
      firearmsRepository.update(id, data);
    },

    remove(id) {
      firearmsRepository.remove(id);
    },

    importFromCsv(csvText) {
      const rows = parseCsv(csvText);
      if (rows.length < 2) {
        return { imported: 0, failed: 0, errors: [] };
      }

      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const dataRows = rows.slice(1);

      const col = (name) => headers.indexOf(name);

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
          errors.push({ row: i + 2, errors: Object.values(fieldErrors).join(', ') });
        } else {
          validRows.push(data);
        }
      }

      if (validRows.length > 0) {
        firearmsRepository.bulkCreate(validRows);
      }

      return { imported: validRows.length, failed: errors.length, errors };
    },

    toCsv(items) {
      const rows = items.map((item) => {
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
      });

      return toCsv(CSV_HEADERS, rows);
    }
  };
}

module.exports = { createFirearmsService, CSV_HEADERS };
