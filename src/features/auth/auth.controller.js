function createAuthController(authService) {
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

      req.session.user = { username };
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
    }
  };
}

module.exports = { createAuthController };
