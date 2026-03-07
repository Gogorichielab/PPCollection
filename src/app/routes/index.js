function registerRoutes(app, { authRoutes, homeRoutes, firearmsRoutes }) {
  app.use('/', authRoutes);
  app.use('/', homeRoutes);
  app.use('/firearms', firearmsRoutes);
}

module.exports = { registerRoutes };
