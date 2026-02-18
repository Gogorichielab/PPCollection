const path = require('path');
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const helmet = require('helmet');
const morgan = require('morgan');

const { getConfig } = require('../infra/config');
const { createDbClient } = require('../infra/db/client');
const { migrate } = require('../infra/db/migrate');
const { createFirearmsRepository } = require('../infra/db/repositories/firearms.repository');
const { createSettingsRepository } = require('../infra/db/repositories/settings.repository');
const { registerRoutes } = require('./routes');
const { createAuthService } = require('../features/auth/auth.service');
const { createAuthController } = require('../features/auth/auth.controller');
const { createAuthRoutes } = require('../features/auth/auth.routes');
const { createFirearmsService } = require('../features/firearms/firearms.service');
const { createFirearmsController } = require('../features/firearms/firearms.controller');
const { createFirearmsRoutes } = require('../features/firearms/firearms.routes');

async function createApp(options = {}) {
  const config = options.config || getConfig();
  const db = options.db || createDbClient(config.databasePath);

  if (options.runMigrations !== false) {
    migrate(db);
  }

  const settingsRepository = createSettingsRepository(db);
  const firearmsRepository = createFirearmsRepository(db);
  const authService = createAuthService({ adminUser: config.adminUser, settingsRepository });

  await authService.initializePasswordHash(config.adminPass);

  const authController = createAuthController(authService);
  const firearmsService = createFirearmsService(firearmsRepository);
  const firearmsController = createFirearmsController(firearmsService);

  const app = express();

  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');

  app.locals.db = db;

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.urlencoded({ extended: true }));
  app.use(methodOverride('_method'));
  app.use(morgan('dev'));
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 1000 * 60 * 60 * 8 }
    })
  );

  app.use('/static', express.static(path.join(__dirname, '..', 'public')));

  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.currentPath = req.path;
    next();
  });

  registerRoutes(app, {
    authRoutes: createAuthRoutes(authController),
    firearmsRoutes: createFirearmsRoutes(firearmsController)
  });

  app.use((req, res) => {
    res.status(404).render('errors/404');
  });

  return app;
}

module.exports = { createApp };
