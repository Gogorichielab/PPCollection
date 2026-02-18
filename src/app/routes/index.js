const { requireAuth } = require('../middleware/auth');

function registerRoutes(app, { authRoutes, firearmsRoutes }) {
  app.use('/', authRoutes);

  app.get('/', requireAuth, (req, res) => res.redirect('/firearms'));
  app.use('/firearms', requireAuth, firearmsRoutes);
}

module.exports = { registerRoutes };
