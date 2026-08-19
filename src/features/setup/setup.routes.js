const express = require('express');
const rateLimit = require('express-rate-limit');

function createSetupRoutes(setupController, setupService) {
  // Tighter than the login limiter: the setup code is the only thing standing
  // between anyone who can reach the port and a brand-new admin account, and
  // every attempt counts because a rejected submission re-renders with 400.
  const setupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many setup attempts. Please try again in 15 minutes.'
  });

  // Evaluated per request, so the route disappears permanently the moment an
  // administrator exists — including on later boots, since the check reads the
  // database rather than any process state.
  function onlyBeforeSetup(req, res, next) {
    if (!setupService.isAvailable()) {
      return res.status(404).render('errors/404');
    }
    return next();
  }

  const router = express.Router();

  router.get('/setup', onlyBeforeSetup, setupController.showSetup);
  router.post('/setup', onlyBeforeSetup, setupLimiter, setupController.completeSetup);

  return router;
}

module.exports = { createSetupRoutes };
