const { requireAuth } = require('../middleware/auth');

function registerRoutes(app, { authRoutes, homeRoutes, firearmsRoutes }) {
  app.use('/', authRoutes);
  app.use('/', requireAuth, homeRoutes);
  app.use('/firearms', requireAuth, firearmsRoutes);
}

module.exports = { registerRoutes };
