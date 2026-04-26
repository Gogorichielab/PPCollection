const path = require('path');

function getConfig() {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const secureCookies = process.env.SECURE_COOKIES === 'true';

  if (secureCookies && !trustProxy) {
    console.warn(
      '[config] WARNING: SECURE_COOKIES=true but TRUST_PROXY is not enabled. ' +
        'Secure cookies require Express to recognize the request as HTTPS (trust proxy). ' +
        'Sessions may fail to persist. Set TRUST_PROXY=true when running behind an HTTPS reverse proxy.'
    );
  }

  return {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    sessionSecret: process.env.SESSION_SECRET || 'ppcollection_dev_secret',
    adminUser: process.env.ADMIN_USERNAME || 'admin',
    adminPass: process.env.ADMIN_PASSWORD || 'changeme',
    databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db'),
    trustProxy,
    secureCookies,
    updateCheck: process.env.UPDATE_CHECK === 'true'
  };
}

module.exports = { getConfig };
