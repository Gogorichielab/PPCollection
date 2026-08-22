const express = require('express');
const { requireAuth } = require('../../app/middleware/auth');

function createAmmoRoutes(ammoController) {
  const router = express.Router();

  router.get('/', requireAuth, ammoController.list);
  router.get('/new', requireAuth, ammoController.showNew);
  router.post('/', requireAuth, ammoController.create);
  router.get('/:id/edit', requireAuth, ammoController.showEdit);
  router.put('/:id', requireAuth, ammoController.update);
  router.post('/:id/delete', requireAuth, ammoController.remove);

  return router;
}

module.exports = { createAmmoRoutes };
