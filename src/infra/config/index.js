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
  const adminPass = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET;

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
        'ADMIN_PASSWORD is unset or using the documented default. ' +
        'Set ADMIN_PASSWORD to a strong value before exposing the app. ' +
        'In production, the app will refuse to seed an admin account with this value.'
    });
  }

  if (sessionSecret === DEFAULT_SESSION_SECRET) {
    if (isProduction) {
      throw new Error(
        '[config] FATAL: SESSION_SECRET is unset or matches the insecure default. ' +
          'Set SESSION_SECRET to a random value (e.g. `openssl rand -base64 48`) before starting in production.'
      );
    }
    logger.warn('config.default_session_secret', {
      message:
        'SESSION_SECRET is unset or using the insecure default. ' +
        'Set SESSION_SECRET to a strong random value before exposing the app.'
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

module.exports = { getConfig, DEFAULT_ADMIN_PASSWORD };
