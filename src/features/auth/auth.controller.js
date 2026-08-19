const { auditLog } = require('../../services/audit.service');

// The name express-session uses when no `name` is configured.
const SESSION_COOKIE_NAME = 'connect.sid';

// Establishes a brand-new session id and re-seeds it, so nothing from the
// pre-authentication session survives. Used after login and after a password
// change; without it a session id fixed by an attacker before sign-in would
// still be valid afterwards.
function regenerateSession(req, user, mustChangePassword, callback) {
  return req.session.regenerate((regenerateError) => {
    if (regenerateError) return callback(regenerateError);

    req.session.user = user;
    req.session.mustChangePassword = mustChangePassword;

    return req.session.save(callback);
  });
}

// A password change invalidates every session, everywhere — including this one
// and any on other devices — then issues the current user a fresh one so they
// are not signed out by their own action.
function rotateAllSessions(req, callback) {
  return req.sessionStore.clear((clearError) => {
    if (clearError) return callback(clearError);
    return regenerateSession(req, req.session.user, false, callback);
  });
}


function createAuthController(authService) {
  function createProfileViewModel(overrides = {}) {
    return {
      pageTitle: 'Profile',
      usernameError: null,
      usernameSuccess: null,
      passwordError: null,
      passwordSuccess: null,
      preferencesError: null,
      preferencesSuccess: null,
      usernameValue: authService.getUsername(),
      themeValue: authService.getTheme(),
      updateCheckEnabled: authService.getUpdateCheckEnabled(),
      maintenanceDueDaysValue: authService.getMaintenanceDueDays(),
      ...overrides
    };
  }

  return {
    showLogin(req, res) {
      if (req.session.user) {
        return res.redirect('/');
      }
      return res.render('auth/login', { pageTitle: 'Login', error: null });
    },

    async login(req, res, next) {
      const { username, password } = req.body;
      const valid = await authService.validateCredentials(username, password);

      if (!valid) {
        auditLog('login.failure', { id: req.id, ip: req.ip, username });
        return res.status(401).render('auth/login', { pageTitle: 'Login', error: 'Invalid credentials' });
      }

      const mustChangePassword = authService.mustChangePassword();

      return regenerateSession(req, { username, id: 1 }, mustChangePassword, (error) => {
        if (error) return next(error);

        auditLog('login.success', { id: req.id, ip: req.ip, username });

        if (mustChangePassword) {
          return res.redirect('/change-password');
        }

        return res.redirect('/');
      });
    },

    logout(req, res) {
      const username = req.session?.user?.username;
      req.session.destroy(() => {
        // The server-side record is gone; clear the client's cookie too so a
        // stale identifier is not presented on every later request.
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
        auditLog('logout', { id: req.id, ip: req.ip, username });
        res.redirect('/login');
      });
    },

    showChangePassword(req, res) {
      return res.render('auth/change-password', { pageTitle: 'Change Password', error: null });
    },

    async changePassword(req, res, next) {
      const { current_password, new_password, confirm_password } = req.body;

      if (new_password !== confirm_password) {
        return res.render('auth/change-password', { pageTitle: 'Change Password', error: 'Passwords do not match.' });
      }

      const result = await authService.changePassword(current_password, new_password);

      if (!result.success) {
        return res.render('auth/change-password', { pageTitle: 'Change Password', error: result.error });
      }

      const username = req.session?.user?.username;

      return rotateAllSessions(req, (error) => {
        if (error) return next(error);

        auditLog('password.change', { id: req.id, ip: req.ip, username });
        auditLog('session.invalidated_all', { id: req.id, ip: req.ip, reason: 'password_change' });
        return res.redirect('/');
      });
    },

    showProfile(req, res) {
      return res.render('auth/profile', createProfileViewModel());
    },

    updateUsername(req, res) {
      const result = authService.updateUsername(req.body.username);

      if (!result.success) {
        return res.status(400).render('auth/profile', createProfileViewModel({ usernameError: result.error }));
      }

      const previous = req.session?.user?.username;
      req.session.user = { ...req.session.user, username: result.username };
      res.locals.user = req.session.user;
      auditLog('username.change', { id: req.id, ip: req.ip, previous, username: result.username });

      return res.render(
        'auth/profile',
        createProfileViewModel({ usernameSuccess: 'Username updated successfully.', usernameValue: result.username })
      );
    },

    async updatePassword(req, res, next) {
      const { current_password, new_password, confirm_password } = req.body;

      if (new_password !== confirm_password) {
        return res.status(400).render(
          'auth/profile',
          createProfileViewModel({ passwordError: 'Passwords do not match.' })
        );
      }

      const result = await authService.changePassword(current_password, new_password);

      if (!result.success) {
        return res.status(400).render('auth/profile', createProfileViewModel({ passwordError: result.error }));
      }

      const username = req.session?.user?.username;

      return rotateAllSessions(req, (error) => {
        if (error) return next(error);

        auditLog('password.change', { id: req.id, ip: req.ip, username });
        auditLog('session.invalidated_all', { id: req.id, ip: req.ip, reason: 'password_change' });
        return res.render(
          'auth/profile',
          createProfileViewModel({ passwordSuccess: 'Password updated successfully. Other devices have been signed out.' })
        );
      });
    },

    updatePreferences(req, res) {
      const { theme, update_check_enabled, maintenance_due_days } = req.body;

      try {
        authService.setTheme(theme);
        if (maintenance_due_days !== undefined) {
          authService.setMaintenanceDueDays(maintenance_due_days);
        }
        if (res.locals.updateCheckAllowed) {
          authService.setUpdateCheckEnabled(update_check_enabled === '1');
        }
      } catch (error) {
        return res.status(400).render('auth/profile', createProfileViewModel({ preferencesError: error.message }));
      }

      res.locals.theme = theme;

      return res.render(
        'auth/profile',
        createProfileViewModel({ themeValue: theme, preferencesSuccess: 'Display preferences updated successfully.' })
      );
    },

    toggleTheme(req, res) {
      const currentTheme = authService.getTheme();
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      authService.setTheme(newTheme);
      res.json({ theme: newTheme });
    }
  };
}

module.exports = { createAuthController };
