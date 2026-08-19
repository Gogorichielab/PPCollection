const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const logger = require('../../services/logger.service');

const SESSION_SECRET_FILENAME = 'session-secret';
const SECRET_FILE_MODE = 0o600;
const SECRET_BYTES = 48;

function fatal(filePath, code, cause) {
  const error = new Error(
    `[config] FATAL: Could not persist the session secret to ${filePath} (${code}). ` +
      'Pew Pew Collection stores its session key in the data directory so it survives restarts ' +
      'and upgrades; it will not fall back to a temporary key. ' +
      'Make sure the data volume exists and is writable by the container user (uid 1000), ' +
      'for example `chown -R 1000:1000 /srv/ppcollection/data`. ' +
      'To supply your own key instead, set SESSION_SECRET.'
  );
  error.cause = cause;
  return error;
}

// The 0600 mode passed to writeFileSync is masked by the process umask, so the
// permissions are always re-applied explicitly. Filesystems that do not support
// chmod (some bind mounts, exFAT) warn rather than abort — the secret itself is
// already written and usable at that point.
function enforceOwnerOnlyMode(filePath) {
  try {
    fs.chmodSync(filePath, SECRET_FILE_MODE);
    return true;
  } catch (error) {
    logger.warn('session_secret.chmod_failed', {
      path: filePath,
      code: error.code,
      message:
        'Could not set owner-only permissions on the session secret file. ' +
        'Restrict it manually if the data directory is shared with other users.'
    });
    return false;
  }
}

function readSecretFile(filePath) {
  let contents;
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw fatal(filePath, error.code, error);
  }

  const secret = contents.trim();
  // A truncated write or a manually emptied file is treated as absent so the
  // next branch regenerates rather than signing sessions with an empty key.
  if (!secret) return null;

  try {
    const { mode } = fs.statSync(filePath);
    if ((mode & 0o077) !== 0) {
      if (enforceOwnerOnlyMode(filePath)) {
        logger.warn('session_secret.permissions_repaired', {
          path: filePath,
          message: 'The session secret file was readable by other users; permissions reset to 0600.'
        });
      }
    }
  } catch {
    // stat failing after a successful read is not worth aborting a boot over.
  }

  return secret;
}

function createSecretFile(filePath) {
  const secret = randomBytes(SECRET_BYTES).toString('base64url');

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    // `wx` fails instead of truncating, so a second process starting at the same
    // moment loses the race rather than replacing a secret already in use.
    fs.writeFileSync(filePath, secret, { mode: SECRET_FILE_MODE, flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') {
      const existing = readSecretFile(filePath);
      // A concurrent starter beat us to it — adopt its secret.
      if (existing) return existing;
      // The file is present but empty or truncated, so nothing is in use yet
      // and it is safe to replace outright.
      try {
        fs.writeFileSync(filePath, secret, { mode: SECRET_FILE_MODE });
      } catch (replaceError) {
        throw fatal(filePath, replaceError.code, replaceError);
      }
    } else {
      throw fatal(filePath, error.code, error);
    }
  }

  enforceOwnerOnlyMode(filePath);
  logger.info('session_secret.generated', {
    path: filePath,
    message: 'Generated a session secret and stored it in the data directory. Set SESSION_SECRET to override it.'
  });

  return secret;
}

// Resolves the key used to sign session cookies and CSRF tokens. SESSION_SECRET
// wins when set; otherwise the secret is generated once and reused from
// <dataDir>/session-secret on every later boot. There is deliberately no
// in-memory fallback: an unwritable data directory fails the boot instead of
// silently invalidating every session on the next restart.
function resolveSessionSecret({ dataDir, envSecret } = {}) {
  if (envSecret) {
    return { secret: envSecret, source: 'env' };
  }

  if (!dataDir) {
    throw new Error('[config] FATAL: resolveSessionSecret requires a dataDir when SESSION_SECRET is unset.');
  }

  const filePath = path.join(dataDir, SESSION_SECRET_FILENAME);
  const existing = readSecretFile(filePath);
  if (existing) {
    return { secret: existing, source: 'file' };
  }

  return { secret: createSecretFile(filePath), source: 'generated' };
}

module.exports = { resolveSessionSecret, SESSION_SECRET_FILENAME };
