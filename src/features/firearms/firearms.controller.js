const { sanitizeFirearmInput, validateFirearmInput } = require('./firearms.validators');

function createFirearmsController(firearmsService) {
  return {
    list(req, res) {
      const page = parseInt(req.query.page, 10) || 1;
      const perPage = 25;
      const { items, totalCount } = firearmsService.paginate(page, perPage);
      const totalPages = Math.ceil(totalCount / perPage);
      
      res.render('firearms/index', { 
        items, 
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          perPage,
          hasPrevious: page > 1,
          hasNext: page < totalPages
        }
      });
    },

    exportCsv(req, res) {
      const items = firearmsService.list();
      const csvContent = firearmsService.toCsv(items);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="firearms.csv"');
      res.send(csvContent);
    },

    showNew(req, res) {
      res.render('firearms/new', { item: {}, fieldErrors: {}, error: null });
    },

    create(req, res) {
      const data = sanitizeFirearmInput(req.body);
      const { isValid, fieldErrors } = validateFirearmInput(data);

      if (!isValid) {
        return res.status(400).render('firearms/new', {
          item: data,
          fieldErrors,
          error: 'Please correct the highlighted fields and try again.'
        });
      }

      const id = firearmsService.create(data);
      return res.redirect(`/firearms/${id}`);
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
      return res.render('firearms/edit', { item, fieldErrors: {}, error: null });
    },

    update(req, res) {
      const item = firearmsService.getById(req.params.id);
      if (!item) {
        return res.status(404).send('Not found');
      }

      const data = sanitizeFirearmInput(req.body);
      const { isValid, fieldErrors } = validateFirearmInput(data);

      if (!isValid) {
        return res.status(400).render('firearms/edit', {
          item: { ...item, ...data },
          fieldErrors,
          error: 'Please correct the highlighted fields and try again.'
        });
      }

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
