function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

function checkPasswordChangeRequired(req, res, next) {
  if (req.session && req.session.user && req.session.user.requiresPasswordChange) {
    return res.redirect('/change-credentials');
  }
  return next();
}

module.exports = { requireAuth, checkPasswordChangeRequired };

