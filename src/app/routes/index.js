function registerRoutes(app, { authRoutes, homeRoutes, firearmsRoutes, maintenanceRoutes, rangeSessionsRoutes, photosRoutes, reportsRoutes }) {
  app.use('/', authRoutes);
  app.use('/', homeRoutes);
  app.use('/firearms', firearmsRoutes);
  app.use('/firearms', maintenanceRoutes);
  app.use('/firearms', rangeSessionsRoutes);
  app.use('/firearms', photosRoutes);
  app.use('/', reportsRoutes);
}

module.exports = { registerRoutes };
