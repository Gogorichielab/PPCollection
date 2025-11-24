const path = require('path');
const DEFAULT_ADMIN_PASSWORD = 'changeme';
const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

module.exports = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  sessionSecret: process.env.SESSION_SECRET || 'ppcollection_dev_secret',
  adminUser: process.env.ADMIN_USERNAME || 'admin',
  adminPassword,
  // Explicit toggle for secure cookies so deployments behind HTTP can still log in.
  sessionCookieSecure: ['true', '1', 'yes'].includes(
    String(process.env.SESSION_COOKIE_SECURE || '').trim().toLowerCase()
  ),
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db'),
  // User sync interval in milliseconds (default: 10 minutes)
  userSyncInterval: process.env.USER_SYNC_INTERVAL ? Number(process.env.USER_SYNC_INTERVAL) : 10 * 60 * 1000
};

