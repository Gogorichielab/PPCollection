const { Router } = require('express');
const { requireAuth } = require('../../app/middleware/auth');

function createReportsRoutes(reportsController) {
  const router = Router();

  router.get('/reports', requireAuth, reportsController.index);

  return router;
}

module.exports = { createReportsRoutes };
