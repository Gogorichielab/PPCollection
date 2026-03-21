const { toCsv } = require('../../shared/utils/csv');

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

    toCsv(items) {
      const rows = items.map((item) => {
        let warrantyLabel = '';
        if (item.gun_warranty === 1) warrantyLabel = 'Yes';
        else if (item.gun_warranty === 0) warrantyLabel = 'No';

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
          item.disposition_name || '',
          item.disposition_address || '',
          item.disposition_date || '',
          item.disposition_reason || '',
          item.firearm_type || '',
          warrantyLabel,
          item.notes || ''
        ];
      });

      return toCsv(CSV_HEADERS, rows);
    }
  };
}

module.exports = { createFirearmsService };
