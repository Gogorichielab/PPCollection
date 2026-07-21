const express = require('express');
const { requireAuth } = require('../../app/middleware/auth');

function createMaintenanceRoutes(maintenanceController) {
  const router = express.Router();

  router.post('/:firearmId/maintenance', requireAuth, maintenanceController.create);
  router.post('/:firearmId/maintenance/:logId/delete', requireAuth, maintenanceController.remove);

  return router;
}

module.exports = { createMaintenanceRoutes };
