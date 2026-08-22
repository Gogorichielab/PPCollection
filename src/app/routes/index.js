function registerRoutes(
  app,
  {
    setupRoutes,
    authRoutes,
    homeRoutes,
    firearmsRoutes,
    maintenanceRoutes,
    rangeSessionsRoutes,
    photosRoutes,
    reportsRoutes,
    ammoRoutes
  }
) {
  app.use('/', setupRoutes);
  app.use('/', authRoutes);
  app.use('/', homeRoutes);
  app.use('/firearms', firearmsRoutes);
  app.use('/firearms', maintenanceRoutes);
  app.use('/firearms', rangeSessionsRoutes);
  app.use('/firearms', photosRoutes);
  app.use('/', reportsRoutes);
  app.use('/ammo', ammoRoutes);
}

module.exports = { registerRoutes };
