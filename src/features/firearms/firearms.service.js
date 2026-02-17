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
  'Notes'
];

function createFirearmsService(firearmsRepository) {
  return {
    list() {
      return firearmsRepository.all();
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
      const rows = items.map((item) => [
        item.make || '',
        item.model || '',
        item.serial || '',
        item.caliber || '',
        item.purchase_date || '',
        item.purchase_price ?? '',
        item.condition || '',
        item.location || '',
        item.status || '',
        item.notes || ''
      ]);

      return toCsv(CSV_HEADERS, rows);
    }
  };
}

module.exports = { createFirearmsService };
