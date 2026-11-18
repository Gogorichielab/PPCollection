const { sanitizeAmmoInput, validateAmmoInput } = require('./ammo.validators');
const { auditLog } = require('../../services/audit.service');
const { CSV_HEADERS } = require('./ammo.service');

function createAmmoController(ammoService) {
  return {
    list(req, res) {
      const userId = req.session.user?.id ?? 1;
      const perPage = 25;
      const requestedPage = parseInt(req.query.page, 10) || 1;
      const { totalCount } = ammoService.paginate(1, perPage, userId);
      const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
      const page = Math.max(1, Math.min(requestedPage, totalPages));
      const { items } = ammoService.paginate(page, perPage, userId);
      const caliberBreakdown = ammoService.getCaliberBreakdown(userId);
      const totalRounds = ammoService.getTotalRounds(userId);

      res.render('ammo/index', {
        pageTitle: 'Ammo',
        items,
        caliberBreakdown,
        totalRounds,
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

    showNew(req, res) {
      res.render('ammo/new', { pageTitle: 'Add Ammo', item: {}, fieldErrors: {}, error: null });
    },

    create(req, res) {
      const userId = req.session.user?.id ?? 1;
      const data = sanitizeAmmoInput(req.body);
      const { isValid, fieldErrors } = validateAmmoInput(data);

      if (!isValid) {
        return res
          .status(400)
          .render('ammo/new', {
            pageTitle: 'Add Ammo',
            item: data,
            fieldErrors,
            error: 'Please correct the highlighted fields and try again.'
          });
      }

      const id = ammoService.create(data, userId);
      if (req.session) req.session.flash = { type: 'success', message: 'Ammo added.' };
      auditLog('ammo.create', { id: req.id, ip: req.ip, ammoId: id });
      return res.redirect('/ammo');
    },

    showEdit(req, res) {
      const userId = req.session.user?.id ?? 1;
      const item = ammoService.getById(req.params.id, userId);
      if (!item) {
        return res.status(404).render('errors/404');
      }
      return res.render('ammo/edit', { pageTitle: 'Edit Ammo', item, fieldErrors: {}, error: null });
    },

    update(req, res) {
      const userId = req.session.user?.id ?? 1;
      const existing = ammoService.getById(req.params.id, userId);
      if (!existing) {
        return res.status(404).render('errors/404');
      }

      const data = sanitizeAmmoInput(req.body);
      const { isValid, fieldErrors } = validateAmmoInput(data);

      if (!isValid) {
        return res
          .status(400)
          .render('ammo/edit', {
            pageTitle: 'Edit Ammo',
            item: { ...data, id: existing.id },
            fieldErrors,
            error: 'Please correct the highlighted fields and try again.'
          });
      }

      ammoService.update(req.params.id, data, userId);
      if (req.session) req.session.flash = { type: 'success', message: 'Ammo updated.' };
      auditLog('ammo.update', { id: req.id, ip: req.ip, ammoId: req.params.id });
      return res.redirect('/ammo');
    },

    showImport(req, res) {
      res.render('ammo/import', { pageTitle: 'Import Ammunition' });
    },

    downloadTemplate(req, res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ammo-import-template.csv"');
      res.send(`${CSV_HEADERS.join(',')}\n`);
    },

    importCsv(req, res) {
      const userId = req.session.user?.id ?? 1;
      const csvText = typeof req.body === 'string' ? req.body : '';
      if (!csvText.trim()) {
        return res.status(400).json({ error: 'No CSV data received.' });
      }
      const results = ammoService.importFromCsv(csvText, userId);
      if (results.tooManyRows) {
        return res.status(400).json({
          error: `Import limited to ${results.maxRows} rows per file (received ${results.rowCount}).`
        });
      }
      auditLog('ammo.import', {
        id: req.id,
        ip: req.ip,
        imported: results.imported,
        failed: results.failed
      });
      return res.json(results);
    },

    remove(req, res) {
      const userId = req.session.user?.id ?? 1;
      const existing = ammoService.getById(req.params.id, userId);
      if (!existing) {
        return res.status(404).render('errors/404');
      }

      ammoService.remove(req.params.id, userId);
      if (req.session) req.session.flash = { type: 'success', message: 'Ammo deleted.' };
      auditLog('ammo.delete', { id: req.id, ip: req.ip, ammoId: req.params.id });
      return res.redirect('/ammo');
    }
  };
}

module.exports = { createAmmoController };
