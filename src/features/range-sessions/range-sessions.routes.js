const express = require('express');
const { requireAuth } = require('../../app/middleware/auth');

function createRangeSessionsRoutes(rangeSessionsController) {
  const router = express.Router();

  router.post('/:firearmId/range-sessions', requireAuth, rangeSessionsController.create);
  router.post('/:firearmId/range-sessions/:sessionId/delete', requireAuth, rangeSessionsController.remove);

  return router;
}

module.exports = { createRangeSessionsRoutes };
