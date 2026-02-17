function createAuthController(authService) {
  return {
    showLogin(req, res) {
      if (req.session.user) {
        return res.redirect('/');
      }
      return res.render('auth/login', { error: null });
    },

    login(req, res) {
      const { username, password } = req.body;
      if (authService.validateCredentials(username, password)) {
        req.session.user = { username };
        return res.redirect('/');
      }

      return res.status(401).render('auth/login', { error: 'Invalid credentials' });
    },

    logout(req, res) {
      req.session.destroy(() => {
        res.redirect('/login');
      });
    }
  };
}

module.exports = { createAuthController };
