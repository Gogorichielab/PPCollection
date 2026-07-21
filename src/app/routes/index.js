function registerRoutes(app, { authRoutes, homeRoutes, firearmsRoutes, maintenanceRoutes, reportsRoutes }) {
  app.use('/', authRoutes);
  app.use('/', homeRoutes);
  app.use('/firearms', firearmsRoutes);
  app.use('/firearms', maintenanceRoutes);
  app.use('/', reportsRoutes);
}

module.exports = { registerRoutes };
