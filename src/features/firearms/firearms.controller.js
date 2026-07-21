const { sanitizeFirearmInput, validateFirearmInput } = require('./firearms.validators');
const { CSV_HEADERS } = require('./firearms.service');
const { MAINTENANCE_TYPES } = require('../maintenance/maintenance.validators');
const { auditLog } = require('../../services/audit.service');

function createFirearmsController(firearmsService, { maintenanceService } = {}) {
  return {
    list(req, res) {
      const userId = req.session.user?.id ?? 1;
      const perPage = 25;
      const requestedPage = parseInt(req.query.page, 10) || 1;
      const { totalCount } = firearmsService.paginate(1, perPage, userId);
      const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
      const page = Math.max(1, Math.min(requestedPage, totalPages));
      const { items } = firearmsService.paginate(page, perPage, userId);

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
      const userId = req.session.user?.id ?? 1;
      const date = new Date().toISOString().slice(0, 10);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="firearms-${date}.csv"`);
      res.setHeader('Transfer-Encoding', 'chunked');

      firearmsService.streamCsv((chunk) => res.write(chunk), userId);
      res.end();
    },

    insuranceReport(req, res) {
      const userId = req.session.user?.id ?? 1;
      const items = firearmsService.list(userId);
      const totalValue = items.reduce((sum, i) => sum + (i.purchase_price || 0), 0);
      const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      res.render('firearms/insurance-report', { items, totalValue, reportDate });
    },

    showNew(req, res) {
      res.render('firearms/new', { pageTitle: 'Add Firearm', item: {}, fieldErrors: {}, error: null });
    },

    create(req, res) {
      const userId = req.session.user?.id ?? 1;
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

      try {
        const id = firearmsService.create(data, userId);
        if (req.session) req.session.flash = { type: 'success', message: 'Firearm added.' };
        auditLog('firearm.create', { id: req.id, ip: req.ip, firearmId: id });
        return res.redirect(`/firearms/${id}`);
      } catch (err) {
        if (err.code === 'DUPLICATE_SERIAL') {
          return res.status(400).render('firearms/new', {
            pageTitle: 'Add Firearm',
            item: data,
            fieldErrors: { serial: err.message },
            error: 'Please correct the highlighted fields and try again.'
          });
        }
        throw err;
      }
    },

    show(req, res) {
      const userId = req.session.user?.id ?? 1;
      const item = firearmsService.getById(req.params.id, userId);
      if (!item) {
        return res.status(404).render('errors/404');
      }
      const viewModel = { pageTitle: `${item.make} ${item.model}`, item };
      if (maintenanceService) {
        viewModel.maintenance = maintenanceService.listByFirearm(item.id);
        viewModel.cleaningStatus = maintenanceService.getCleaningStatusForFirearm(item.id, item.status);
        viewModel.maintenanceTypes = MAINTENANCE_TYPES;
      }
      return res.render('firearms/show', viewModel);
    },

    duplicate(req, res) {
      const userId = req.session.user?.id ?? 1;
      const item = firearmsService.getById(req.params.id, userId);
      if (!item) {
        return res.status(404).render('errors/404');
      }
      const { make, model, caliber, purchase_date, purchase_price, condition, location, status, notes, gun_warranty, firearm_type } = item;
      const newId = firearmsService.create({ make, model, serial: '', caliber, purchase_date, purchase_price, condition, location, status, notes, gun_warranty, firearm_type }, userId);
      return res.redirect(`/firearms/${newId}`);
    },

    showEdit(req, res) {
      const userId = req.session.user?.id ?? 1;
      const item = firearmsService.getById(req.params.id, userId);
      if (!item) {
        return res.status(404).render('errors/404');
      }
      return res.render('firearms/edit', { pageTitle: `Edit ${item.make} ${item.model}`, item, fieldErrors: {}, error: null });
    },

    update(req, res) {
      const userId = req.session.user?.id ?? 1;
      const item = firearmsService.getById(req.params.id, userId);
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

      try {
        firearmsService.update(req.params.id, data, userId);
        if (req.session) req.session.flash = { type: 'success', message: 'Firearm updated.' };
        auditLog('firearm.update', { id: req.id, ip: req.ip, firearmId: req.params.id });
        return res.redirect(`/firearms/${req.params.id}`);
      } catch (err) {
        if (err.code === 'DUPLICATE_SERIAL') {
          return res.status(400).render('firearms/edit', {
            pageTitle: `Edit ${item.make} ${item.model}`,
            item: { ...item, ...data },
            fieldErrors: { serial: err.message },
            error: 'Please correct the highlighted fields and try again.'
          });
        }
        throw err;
      }
    },

    remove(req, res) {
      const userId = req.session.user?.id ?? 1;
      const item = firearmsService.getById(req.params.id, userId);
      if (!item) {
        return res.status(404).render('errors/404');
      }
      firearmsService.remove(req.params.id, userId);
      if (req.session) req.session.flash = { type: 'success', message: 'Firearm deleted.' };
      auditLog('firearm.delete', { id: req.id, ip: req.ip, firearmId: req.params.id });
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
      const userId = req.session.user?.id ?? 1;
      const csvText = typeof req.body === 'string' ? req.body : '';
      if (!csvText.trim()) {
        return res.status(400).json({ error: 'No CSV data received.' });
      }
      const results = firearmsService.importFromCsv(csvText, userId);
      if (results.tooManyRows) {
        return res.status(400).json({
          error: `Import limited to ${results.maxRows} rows per file (received ${results.rowCount}).`
        });
      }
      auditLog('firearm.import', {
        id: req.id,
        ip: req.ip,
        imported: results.imported,
        failed: results.failed
      });
      return res.json(results);
    }
  };
}

module.exports = { createFirearmsController };
