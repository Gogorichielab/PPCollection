const path = require('path');

const DEFAULT_ADMIN_PASSWORD = 'changeme';

function getConfig() {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const secureCookies = process.env.SECURE_COOKIES === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const adminPass = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

  if (secureCookies && !trustProxy) {
    console.warn(
      '[config] WARNING: SECURE_COOKIES=true but TRUST_PROXY is not enabled. ' +
        'Secure cookies require Express to recognize the request as HTTPS (trust proxy). ' +
        'Sessions may fail to persist. Set TRUST_PROXY=true when running behind an HTTPS reverse proxy.'
    );
  }

  if (adminPass === DEFAULT_ADMIN_PASSWORD) {
    console.warn(
      '[config] WARNING: ADMIN_PASSWORD is unset or using the documented default. ' +
        'Set ADMIN_PASSWORD to a strong value before exposing the app. ' +
        'In production, the app will refuse to seed an admin account with this value.'
    );
  }

  return {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    sessionSecret: process.env.SESSION_SECRET || 'ppcollection_dev_secret',
    adminUser: process.env.ADMIN_USERNAME || 'admin',
    adminPass,
    databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db'),
    trustProxy,
    secureCookies,
    isProduction,
    updateCheck: process.env.UPDATE_CHECK === 'true'
  };
}

module.exports = { getConfig, DEFAULT_ADMIN_PASSWORD };
