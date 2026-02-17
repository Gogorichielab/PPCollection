const { sanitizeFirearmInput } = require('./firearms.validators');

function createFirearmsController(firearmsService) {
  return {
    list(req, res) {
      const items = firearmsService.list();
      res.render('firearms/index', { items });
    },

    exportCsv(req, res) {
      const items = firearmsService.list();
      const csvContent = firearmsService.toCsv(items);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="firearms.csv"');
      res.send(csvContent);
    },

    showNew(req, res) {
      res.render('firearms/new', { item: {} });
    },

    create(req, res) {
      const data = sanitizeFirearmInput(req.body);
      const id = firearmsService.create(data);
      res.redirect(`/firearms/${id}`);
    },

    show(req, res) {
      const item = firearmsService.getById(req.params.id);
      if (!item) {
        return res.status(404).send('Not found');
      }
      return res.render('firearms/show', { item });
    },

    showEdit(req, res) {
      const item = firearmsService.getById(req.params.id);
      if (!item) {
        return res.status(404).send('Not found');
      }
      return res.render('firearms/edit', { item });
    },

    update(req, res) {
      const item = firearmsService.getById(req.params.id);
      if (!item) {
        return res.status(404).send('Not found');
      }

      const data = sanitizeFirearmInput(req.body);
      firearmsService.update(req.params.id, data);
      return res.redirect(`/firearms/${req.params.id}`);
    },

    remove(req, res) {
      firearmsService.remove(req.params.id);
      res.redirect('/firearms');
    }
  };
}

module.exports = { createFirearmsController };
