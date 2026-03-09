const express = require('express');
const { requireAuth } = require('../../app/middleware/auth');
const { loginRateLimiter } = require('../../app/middleware/rateLimiter');

function createAuthRoutes(authController) {
  const router = express.Router();

  router.get('/login', authController.showLogin);
  router.post('/login', loginRateLimiter, authController.login);
  router.post('/logout', authController.logout);

  router.get('/change-password', requireAuth, authController.showChangePassword);
  router.post('/change-password', requireAuth, authController.changePassword);

  router.get('/profile', requireAuth, authController.showProfile);
  router.post('/profile/username', requireAuth, authController.updateUsername);
  router.post('/profile/password', requireAuth, authController.updatePassword);
  router.post('/profile/preferences', requireAuth, authController.updatePreferences);

  router.post('/toggle-theme', requireAuth, authController.toggleTheme);

  return router;
}

module.exports = { createAuthRoutes };
