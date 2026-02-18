const express = require('express');
const { requireAuth } = require('../../app/middleware/auth');

function createAuthRoutes(authController) {
  const router = express.Router();

  router.get('/login', authController.showLogin);
  router.post('/login', authController.login);
  router.post('/logout', authController.logout);

  router.get('/change-password', requireAuth, authController.showChangePassword);
  router.post('/change-password', requireAuth, authController.changePassword);

  return router;
}

module.exports = { createAuthRoutes };
