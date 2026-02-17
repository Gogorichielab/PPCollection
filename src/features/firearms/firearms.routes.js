const express = require('express');

function createFirearmsRoutes(firearmsController) {
  const router = express.Router();

  router.get('/', firearmsController.list);
  router.get('/export', firearmsController.exportCsv);
  router.get('/new', firearmsController.showNew);
  router.post('/', firearmsController.create);
  router.get('/:id', firearmsController.show);
  router.get('/:id/edit', firearmsController.showEdit);
  router.put('/:id', firearmsController.update);
  router.post('/:id/delete', firearmsController.remove);

  return router;
}

module.exports = { createFirearmsRoutes };
