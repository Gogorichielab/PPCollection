const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../../app/middleware/auth');

function createAuthRoutes(authController) {
  // Limiters are created per-app so each createApp() call gets its own in-memory
  // store. Login limiter only counts failed attempts (skipSuccessfulRequests),
  // since successful logins return 302. Password change limiter counts every
  // attempt since failed re-renders return 200 OK with an inline error.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  });

  const passwordChangeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many password change attempts. Please try again in 15 minutes.'
  });

  const logoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many logout attempts. Please try again in 15 minutes.'
  });

  const router = express.Router();

  router.get('/login', authController.showLogin);
  router.post('/login', loginLimiter, authController.login);
  router.post('/logout', logoutLimiter, authController.logout);

  router.get('/change-password', requireAuth, authController.showChangePassword);
  router.post('/change-password', requireAuth, passwordChangeLimiter, authController.changePassword);

  router.get('/profile', requireAuth, authController.showProfile);
  router.post('/profile/username', requireAuth, authController.updateUsername);
  router.post('/profile/password', requireAuth, passwordChangeLimiter, authController.updatePassword);
  router.post('/profile/preferences', requireAuth, authController.updatePreferences);

  router.post('/toggle-theme', requireAuth, authController.toggleTheme);

  return router;
}

module.exports = { createAuthRoutes };
