const express = require('express');

function createAuthRoutes(authController) {
  const router = express.Router();

  router.get('/login', authController.showLogin);
  router.post('/login', authController.login);
  router.post('/logout', authController.logout);

  return router;
}

module.exports = { createAuthRoutes };
