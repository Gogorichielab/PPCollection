const path = require('path');
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');

const { getConfig } = require('../infra/config');
const { createVersionService } = require('../services/version.service');
const { version } = require('../../package.json');
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
const { createHomeService } = require('../features/home/home.service');
const { createHomeController } = require('../features/home/home.controller');
const { createHomeRoutes } = require('../features/home/home.routes');

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

  const updateCheckEnabled = Boolean(config.updateCheck && authService.getUpdateCheckEnabled());
  const versionService = createVersionService({ currentVersion: version, enabled: updateCheckEnabled });
  if (updateCheckEnabled) versionService.getVersionInfo().catch(() => {});

  const authController = createAuthController(authService);
  const firearmsService = createFirearmsService(firearmsRepository);
  const firearmsController = createFirearmsController(firearmsService);
  const homeService = createHomeService(firearmsRepository);
  const homeController = createHomeController(homeService);

  const app = express();

  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');

  app.locals.db = db;

  if (config.trustProxy) {
    app.set('trust proxy', true);
  }

  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(methodOverride('_method'));
  app.use(morgan('dev'));
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 8,
        httpOnly: true,
        sameSite: 'lax',
        secure: !!config.secureCookies
      }
    })
  );

  // Configure CSRF protection using csrf-csrf
  const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => config.sessionSecret,
    getSessionIdentifier: (req) => {
      // Ensure we have a session
      if (!req.session.csrfIdentifier) {
        req.session.csrfIdentifier = Math.random().toString(36).substring(2);
      }
      return req.session.csrfIdentifier;
    },
    cookieName: 'x-csrf-token',
    cookieOptions: {
      sameSite: 'lax',
      path: '/',
      secure: !!config.secureCookies,
      httpOnly: true
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => {
      // Check header first (for AJAX requests)
      const headerToken = req.headers['x-csrf-token'];
      if (headerToken) return headerToken;
      // Then check body (for form submissions)
      return req.body?._csrf;
    }
  });

  app.use(doubleCsrfProtection);

  app.use('/', express.static(path.join(__dirname, '..', 'public')));
  app.use('/static', express.static(path.join(__dirname, '..', 'public')));

  app.use(async (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.currentPath = req.path;
    res.locals.csrfToken = generateCsrfToken(req, res);
    res.locals.theme = authService.getTheme();
    res.locals.updateCheckAllowed = config.updateCheck;
    res.locals.updateCheckEnabled = authService.getUpdateCheckEnabled();
    try {
      res.locals.versionInfo = config.updateCheck
        ? await versionService.getVersionInfo()
        : { currentVersion: version, latestVersion: null, updateAvailable: false };
    } catch {
      res.locals.versionInfo = { currentVersion: version, latestVersion: null, updateAvailable: false };
    }
    next();
  });

  registerRoutes(app, {
    authRoutes: createAuthRoutes(authController),
    homeRoutes: createHomeRoutes(homeController),
    firearmsRoutes: createFirearmsRoutes(firearmsController)
  });

  app.use((req, res) => {
    res.status(404).render('errors/404');
  });

  return app;
}

module.exports = { createApp };
