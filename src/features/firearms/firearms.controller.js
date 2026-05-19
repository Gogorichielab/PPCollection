const { sanitizeFirearmInput, validateFirearmInput } = require('./firearms.validators');
const { CSV_HEADERS } = require('./firearms.service');
const { auditLog } = require('../../services/audit.service');

function createFirearmsController(firearmsService) {
  return {
    list(req, res) {
      const perPage = 25;
      const requestedPage = parseInt(req.query.page, 10) || 1;
      const { totalCount } = firearmsService.paginate(1, perPage);
      const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
      const page = Math.max(1, Math.min(requestedPage, totalPages));
      const { items } = firearmsService.paginate(page, perPage);

      res.render('firearms/index', {
        pageTitle: 'Inventory',
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
      const date = new Date().toISOString().slice(0, 10);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="firearms-${date}.csv"`);
      res.setHeader('Transfer-Encoding', 'chunked');

      firearmsService.streamCsv((chunk) => res.write(chunk));
      res.end();
    },

    showNew(req, res) {
      res.render('firearms/new', { pageTitle: 'Add Firearm', item: {}, fieldErrors: {}, error: null });
    },

    create(req, res) {
      const data = sanitizeFirearmInput(req.body);
      const { isValid, fieldErrors } = validateFirearmInput(data);

      if (!isValid) {
        return res.status(400).render('firearms/new', {
          pageTitle: 'Add Firearm',
          item: data,
          fieldErrors,
          error: 'Please correct the highlighted fields and try again.'
        });
      }

      const id = firearmsService.create(data);
      if (req.session) req.session.flash = { type: 'success', message: 'Firearm added.' };
      auditLog('firearm.create', { ip: req.ip, id });
      return res.redirect(`/firearms/${id}`);
    },

    show(req, res) {
      const item = firearmsService.getById(req.params.id);
      if (!item) {
        return res.status(404).render('errors/404');
      }
      return res.render('firearms/show', { pageTitle: `${item.make} ${item.model}`, item });
    },

    duplicate(req, res) {
      const item = firearmsService.getById(req.params.id);
      if (!item) {
        return res.status(404).render('errors/404');
      }
      const { make, model, caliber, purchase_date, purchase_price, condition, location, status, notes, gun_warranty, firearm_type } = item;
      const newId = firearmsService.create({ make, model, serial: '', caliber, purchase_date, purchase_price, condition, location, status, notes, gun_warranty, firearm_type });
      return res.redirect(`/firearms/${newId}`);
    },

    showEdit(req, res) {
      const item = firearmsService.getById(req.params.id);
      if (!item) {
        return res.status(404).render('errors/404');
      }
      return res.render('firearms/edit', { pageTitle: `Edit ${item.make} ${item.model}`, item, fieldErrors: {}, error: null });
    },

    update(req, res) {
      const item = firearmsService.getById(req.params.id);
      if (!item) {
        return res.status(404).render('errors/404');
      }

      const data = sanitizeFirearmInput(req.body);
      const { isValid, fieldErrors } = validateFirearmInput(data);

      if (!isValid) {
        return res.status(400).render('firearms/edit', {
          pageTitle: `Edit ${item.make} ${item.model}`,
          item: { ...item, ...data },
          fieldErrors,
          error: 'Please correct the highlighted fields and try again.'
        });
      }

      firearmsService.update(req.params.id, data);
      if (req.session) req.session.flash = { type: 'success', message: 'Firearm updated.' };
      auditLog('firearm.update', { ip: req.ip, id: req.params.id });
      return res.redirect(`/firearms/${req.params.id}`);
    },

    remove(req, res) {
      const item = firearmsService.getById(req.params.id);
      if (!item) {
        return res.status(404).render('errors/404');
      }
      firearmsService.remove(req.params.id);
      if (req.session) req.session.flash = { type: 'success', message: 'Firearm deleted.' };
      auditLog('firearm.delete', { ip: req.ip, id: req.params.id });
      return res.redirect('/firearms');
    },

    showImport(req, res) {
      res.render('firearms/import', { pageTitle: 'Import Firearms', results: null });
    },

    downloadTemplate(req, res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="firearms-import-template.csv"');
      res.send(`${CSV_HEADERS.join(',')}\n`);
    },

    importCsv(req, res) {
      const csvText = typeof req.body === 'string' ? req.body : '';
      if (!csvText.trim()) {
        return res.status(400).json({ error: 'No CSV data received.' });
      }
      const results = firearmsService.importFromCsv(csvText);
      if (results.tooManyRows) {
        return res.status(400).json({
          error: `Import limited to ${results.maxRows} rows per file (received ${results.rowCount}).`
        });
      }
      auditLog('firearm.import', {
        ip: req.ip,
        imported: results.imported,
        failed: results.failed
      });
      return res.json(results);
    }
  };
}

module.exports = { createFirearmsController };
