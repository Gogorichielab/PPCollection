function registerRoutes(app, { setupRoutes, authRoutes, homeRoutes, firearmsRoutes, maintenanceRoutes, rangeSessionsRoutes, photosRoutes, reportsRoutes }) {
  app.use('/', setupRoutes);
  app.use('/', authRoutes);
  app.use('/', homeRoutes);
  app.use('/firearms', firearmsRoutes);
  app.use('/firearms', maintenanceRoutes);
  app.use('/firearms', rangeSessionsRoutes);
  app.use('/firearms', photosRoutes);
  app.use('/', reportsRoutes);
}

module.exports = { registerRoutes };
