const express = require('express');
const { requireAuth } = require('../../app/middleware/auth');

function createFirearmsRoutes(firearmsController) {
  const router = express.Router();

  router.get('/', requireAuth, firearmsController.list);
  router.get('/export', requireAuth, firearmsController.exportCsv);
  router.get('/new', requireAuth, firearmsController.showNew);
  router.post('/', requireAuth, firearmsController.create);
  router.get('/:id', requireAuth, firearmsController.show);
  router.get('/:id/edit', requireAuth, firearmsController.showEdit);
  router.put('/:id', requireAuth, firearmsController.update);
  router.post('/:id/delete', requireAuth, firearmsController.remove);

  return router;
}

module.exports = { createFirearmsRoutes };
