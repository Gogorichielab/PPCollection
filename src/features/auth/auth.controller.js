const { auditLog } = require('../../services/audit.service');

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

    async login(req, res) {
      const { username, password } = req.body;
      const valid = await authService.validateCredentials(username, password);

      if (!valid) {
        auditLog('login.failure', { id: req.id, ip: req.ip, username });
        return res.status(401).render('auth/login', { pageTitle: 'Login', error: 'Invalid credentials' });
      }

      req.session.user = { username, id: 1 };
      req.session.mustChangePassword = authService.mustChangePassword();
      auditLog('login.success', { id: req.id, ip: req.ip, username });

      if (req.session.mustChangePassword) {
        return res.redirect('/change-password');
      }

      return res.redirect('/');
    },

    logout(req, res) {
      const username = req.session?.user?.username;
      req.session.destroy(() => {
        auditLog('logout', { id: req.id, ip: req.ip, username });
        res.redirect('/login');
      });
    },

    showChangePassword(req, res) {
      return res.render('auth/change-password', { pageTitle: 'Change Password', error: null });
    },

    async changePassword(req, res) {
      const { current_password, new_password, confirm_password } = req.body;

      if (new_password !== confirm_password) {
        return res.render('auth/change-password', { pageTitle: 'Change Password', error: 'Passwords do not match.' });
      }

      const result = await authService.changePassword(current_password, new_password);

      if (!result.success) {
        return res.render('auth/change-password', { pageTitle: 'Change Password', error: result.error });
      }

      req.session.mustChangePassword = false;
      auditLog('password.change', { id: req.id, ip: req.ip, username: req.session?.user?.username });
      return res.redirect('/');
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

    async updatePassword(req, res) {
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

      req.session.mustChangePassword = false;
      auditLog('password.change', { id: req.id, ip: req.ip, username: req.session?.user?.username });
      return res.render('auth/profile', createProfileViewModel({ passwordSuccess: 'Password updated successfully.' }));
    },

    updatePreferences(req, res) {
      const { theme, update_check_enabled } = req.body;

      try {
        authService.setTheme(theme);
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
