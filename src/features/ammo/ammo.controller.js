const { sanitizeAmmoInput, validateAmmoInput } = require('./ammo.validators');
const { uploadName } = require('../collection/collection.service');
const { auditLog } = require('../../services/audit.service');
const { CSV_HEADERS } = require('./ammo.service');

function createAmmoController(ammoService, collection) {
  return {
    list(req, res) {
      const userId = req.session.user?.id ?? 1;
      return res.render('ammo/index', { ...ammoService.search(userId, req.query), savedViews: collection.views(userId, 'ammo') });
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
      return res.render('ammo/edit', { pageTitle: 'Edit Ammo', item, history: ammoService.quantityHistory(item.id, userId), reason: '', fieldErrors: {}, error: null });
    },

    update(req, res) {
      const userId = req.session.user?.id ?? 1;
      const existing = ammoService.getById(req.params.id, userId);
      if (!existing) {
        return res.status(404).render('errors/404');
      }

      const data = sanitizeAmmoInput(req.body);
      const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
      const { isValid, fieldErrors } = validateAmmoInput(data);
      if (reason.length > 500) fieldErrors.reason = 'Use 500 characters or fewer.';

      if (!isValid || fieldErrors.reason) {
        return res
          .status(400)
          .render('ammo/edit', {
            pageTitle: 'Edit Ammo',
            item: { ...data, id: existing.id },
            history: ammoService.quantityHistory(existing.id, userId), reason,
            fieldErrors,
            error: 'Please correct the highlighted fields and try again.'
          });
      }

      ammoService.update(req.params.id, data, userId, reason);
      if (req.session) req.session.flash = { type: 'success', message: 'Ammo updated.' };
      auditLog('ammo.update', { id: req.id, ip: req.ip, ammoId: req.params.id });
      return res.redirect('/ammo');
    },

    exportCsv(req, res) {
      const userId = req.session.user?.id ?? 1;
      const date = new Date().toISOString().slice(0, 10);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ammo-${date}.csv"`);
      ammoService.streamCsv((chunk) => res.write(chunk), userId, req.query);
      res.end();
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
      const preview = req.query.preview === '1';
      const expectedCount = Number(req.get('x-confirm-import-count') || 0);
      const results = ammoService.importFromCsv(csvText, userId, { preview, expectedCount, filename: uploadName(req.get('x-import-name'), 'import.csv') });
      if (results.duplicate) {
        return res.status(409).json({ error: 'This file has already been imported. Preview it again to confirm another shipment.' });
      }
      if (results.tooManyRows) {
        return res.status(400).json({
          error: `Import limited to ${results.maxRows} rows per file (received ${results.rowCount}).`
        });
      }
      if (preview) return res.json(results);
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
