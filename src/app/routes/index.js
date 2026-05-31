function registerRoutes(app, { authRoutes, homeRoutes, firearmsRoutes, reportsRoutes }) {
  app.use('/', authRoutes);
  app.use('/', homeRoutes);
  app.use('/firearms', firearmsRoutes);
  app.use('/', reportsRoutes);
}

module.exports = { registerRoutes };
