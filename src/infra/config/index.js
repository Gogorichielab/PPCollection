const path = require('path');
const logger = require('../../services/logger.service');

const DEFAULT_ADMIN_PASSWORD = 'changeme';
const DEFAULT_SESSION_SECRET = 'ppcollection_dev_secret';

function resolveSecureCookies(envValue, isProduction) {
  if (envValue === 'true') return true;
  if (envValue === 'false') return false;
  return isProduction;
}

function getConfig() {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const secureCookies = resolveSecureCookies(process.env.SECURE_COOKIES, isProduction);
  // Null when unset: createApp then leaves the account to the /setup wizard
  // instead of seeding one. Setting it keeps the pre-wizard seeding behaviour.
  const adminPass = process.env.ADMIN_PASSWORD || null;
  // Left null when unset: createApp then generates and persists one under dataDir.
  const sessionSecret = process.env.SESSION_SECRET || null;

  if (secureCookies && !trustProxy) {
    logger.warn('config.secure_cookies_without_trust_proxy', {
      message:
        'Secure cookies are enabled but TRUST_PROXY is not. ' +
        'When the app sits behind an HTTPS reverse proxy, Express needs to recognize the request ' +
        'as HTTPS for the cookie to be sent. Sessions may silently fail to persist. ' +
        'Set TRUST_PROXY=true, or set SECURE_COOKIES=false to disable secure cookies for this deployment.'
    });
  }

  if (adminPass === DEFAULT_ADMIN_PASSWORD) {
    logger.warn('config.default_admin_password', {
      message:
        'ADMIN_PASSWORD is set to the documented default. ' +
        'Unset it to create the administrator through the first-run setup page, ' +
        'or set a strong value. In production, the app refuses to seed an account with this value.'
    });
  }

  // Unset is the supported path — the secret is generated on first start. Only
  // the value published in this repository is still refused, because an existing
  // deployment carrying it has a signing key that anyone can read.
  if (sessionSecret === DEFAULT_SESSION_SECRET) {
    if (isProduction) {
      throw new Error(
        '[config] FATAL: SESSION_SECRET is set to the documented example value, which is public. ' +
          'Unset SESSION_SECRET to let the app generate and persist its own key, ' +
          'or set it to a random value (e.g. `openssl rand -base64 48`).'
      );
    }
    logger.warn('config.default_session_secret', {
      message:
        'SESSION_SECRET is set to the documented example value, which is public. ' +
        'Unset it to let the app generate its own key, or set a strong random value.'
    });
  }

  const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
  const databasePath = resolveDatabasePath(process.env.DATABASE_PATH, process.env.DATA_DIR);

  return {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    sessionSecret,
    adminUser: process.env.ADMIN_USERNAME || 'admin',
    adminPass,
    databasePath,
    dataDir,
    photosDir: path.join(dataDir, 'photos'),
    trustProxy,
    secureCookies,
    isProduction,
    updateCheck: process.env.UPDATE_CHECK === 'true'
  };
}

function resolveDatabasePath(rawPath, rawDataDir) {
  const defaultDir = path.join(process.cwd(), 'data');
  const allowed = path.resolve(rawDataDir || defaultDir);
  // Default the database file inside the allowed base so setting DATA_DIR
  // alone works without also having to set DATABASE_PATH.
  const resolved = path.resolve(rawPath || path.join(allowed, 'app.db'));

  if (resolved !== allowed && !resolved.startsWith(allowed + path.sep)) {
    throw new Error(
      `[config] FATAL: DATABASE_PATH (${resolved}) must be inside the allowed data directory (${allowed}). ` +
        'Set DATA_DIR to override the allowed base path, or move the database file inside the existing one.'
    );
  }

  return resolved;
}

module.exports = { getConfig, DEFAULT_ADMIN_PASSWORD, DEFAULT_SESSION_SECRET };
