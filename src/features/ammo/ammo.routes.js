const express = require('express');
const { requireAuth } = require('../../app/middleware/auth');

function createAmmoRoutes(ammoController) {
  const router = express.Router();

  router.get('/', requireAuth, ammoController.list);
  router.get('/new', requireAuth, ammoController.showNew);
  router.get('/export', requireAuth, ammoController.exportCsv);
  router.get('/import/template', requireAuth, ammoController.downloadTemplate);
  router.get('/import', requireAuth, ammoController.showImport);
  router.post('/import', requireAuth, express.text({ limit: '2mb', type: 'text/plain' }), ammoController.importCsv);
  router.post('/', requireAuth, ammoController.create);
  router.get('/:id/edit', requireAuth, ammoController.showEdit);
  router.put('/:id', requireAuth, ammoController.update);
  router.post('/:id/delete', requireAuth, ammoController.remove);

  return router;
}

module.exports = { createAmmoRoutes };
