function createAuthController(authService) {
  function createProfileViewModel(overrides = {}) {
    return {
      usernameError: null,
      usernameSuccess: null,
      passwordError: null,
      passwordSuccess: null,
      preferencesError: null,
      preferencesSuccess: null,
      usernameValue: authService.getUsername(),
      themeValue: authService.getTheme(),
      ...overrides
    };
  }

  return {
    showLogin(req, res) {
      if (req.session.user) {
        return res.redirect('/');
      }
      return res.render('auth/login', { error: null });
    },

    async login(req, res) {
      const { username, password } = req.body;
      const valid = await authService.validateCredentials(username, password);

      if (!valid) {
        return res.status(401).render('auth/login', { error: 'Invalid credentials' });
      }

      req.session.user = { username: authService.getUsername() };
      req.session.mustChangePassword = authService.mustChangePassword();

      if (req.session.mustChangePassword) {
        return res.redirect('/change-password');
      }

      return res.redirect('/');
    },

    logout(req, res) {
      req.session.destroy(() => {
        res.redirect('/login');
      });
    },

    showChangePassword(req, res) {
      return res.render('auth/change-password', { error: null });
    },

    async changePassword(req, res) {
      const { current_password, new_password, confirm_password } = req.body;

      if (new_password !== confirm_password) {
        return res.render('auth/change-password', { error: 'Passwords do not match.' });
      }

      const result = await authService.changePassword(current_password, new_password);

      if (!result.success) {
        return res.render('auth/change-password', { error: result.error });
      }

      req.session.mustChangePassword = false;
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

      req.session.user = { ...req.session.user, username: result.username };
      res.locals.user = req.session.user;

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
      return res.render('auth/profile', createProfileViewModel({ passwordSuccess: 'Password updated successfully.' }));
    },

    updatePreferences(req, res) {
      const { theme } = req.body;

      try {
        authService.setTheme(theme);
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
