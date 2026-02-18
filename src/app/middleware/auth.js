function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  if (req.session.mustChangePassword && req.path !== '/change-password') {
    return res.redirect('/change-password');
  }

  return next();
}

module.exports = { requireAuth };
