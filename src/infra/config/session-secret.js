const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const logger = require('../../services/logger.service');

const SESSION_SECRET_FILENAME = 'session-secret';
const SECRET_FILE_MODE = 0o600;
const SECRET_BYTES = 48;

// Base64URL, unpadded — the encoding produced by randomBytes().toString('base64url').
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
// 43 characters is 32 bytes of Base64URL, the smallest key we will sign with.
const MIN_SECRET_LENGTH = 43;
// A genuinely random 43-character Base64URL string draws ~31 distinct symbols;
// falling under 16 means the file is hand-written or patterned, not random.
const MIN_DISTINCT_CHARACTERS = 16;

function remediation(filePath) {
  return (
    `Refusing to start with the session secret at ${filePath}. ` +
    'The app will not silently replace it: rotating the key invalidates every active session ' +
    'and every CSRF token, so a corrupted file must be an explicit decision. ' +
    'Restore the file from a backup, or delete it to have a new key generated on the next start ' +
    '(everyone will need to sign in again), or set SESSION_SECRET to manage the key yourself.'
  );
}

function fatal(message) {
  return new Error(`[config] FATAL: ${message}`);
}

function writeFailure(filePath, code, cause) {
  const error = fatal(
    `Could not persist the session secret to ${filePath} (${code}). ` +
      'Pew Pew Collection stores its session key in the data directory so it survives restarts ' +
      'and upgrades; it will not fall back to a temporary key. ' +
      'Make sure the data volume exists and is writable by the container user (uid 1000), ' +
      'for example `chown -R 1000:1000 /srv/ppcollection/data`. ' +
      'To supply your own key instead, set SESSION_SECRET.'
  );
  error.cause = cause;
  return error;
}

// Reports why a stored secret is unusable, or null when it is fine. The reasons
// are deliberately about shape alone — the value itself is never included.
function describeInvalidSecret(secret) {
  if (secret.length === 0) return 'the file is empty';
  if (!BASE64URL_PATTERN.test(secret)) {
    return 'the file does not contain a Base64URL key (expected only A-Z, a-z, 0-9, - and _)';
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    return `the key is ${secret.length} characters, short of the ${MIN_SECRET_LENGTH} required for 256 bits of entropy`;
  }
  if (new Set(secret).size < MIN_DISTINCT_CHARACTERS) {
    return 'the key repeats too few distinct characters to be randomly generated';
  }
  return null;
}

// Applying 0600 is mandatory, not best-effort: a session key other local users
// can read is a key that can forge sessions. A filesystem that cannot express
// the permission fails the boot rather than leaving the key exposed. Operators
// on such filesystems should set SESSION_SECRET instead.
function enforceOwnerOnlyMode(filePath) {
  try {
    fs.chmodSync(filePath, SECRET_FILE_MODE);
  } catch (error) {
    throw fatal(
      `Could not restrict permissions on the session secret at ${filePath} (${error.code}). ` +
        'The key must not be readable by other users on the host. ' +
        'Move the data directory to a filesystem that supports Unix permissions, ' +
        'or set SESSION_SECRET to manage the key yourself.'
    );
  }
}

// Returns the stored secret, or null when no file exists. A file that exists but
// does not hold a usable key aborts the boot — it is never silently replaced.
function readSecretFile(filePath) {
  let contents;
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    // ENOENT is a first start. ENOTDIR means a path component is not a directory,
    // so there is no file to read either — both fall through to creation, which
    // reports the data-directory problem with the remediation that actually fits.
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw fatal(
      `Could not read the session secret at ${filePath} (${error.code}). ` +
        'Make sure the data volume is readable by the container user (uid 1000), ' +
        'for example `chown -R 1000:1000 /srv/ppcollection/data`.'
    );
  }

  const secret = contents.trim();
  const problem = describeInvalidSecret(secret);
  if (problem) {
    logger.error('session_secret.invalid', { path: filePath, reason: problem });
    throw fatal(`${remediation(filePath)} Detected: ${problem}.`);
  }

  const { mode } = fs.statSync(filePath);
  if ((mode & 0o077) !== 0) {
    enforceOwnerOnlyMode(filePath);
    logger.warn('session_secret.permissions_repaired', {
      path: filePath,
      message: 'The session secret file was readable by other users; permissions reset to 0600.'
    });
  }

  return secret;
}

function createSecretFile(filePath) {
  const secret = randomBytes(SECRET_BYTES).toString('base64url');

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    // `wx` is an exclusive create: a second process starting at the same instant
    // fails with EEXIST rather than truncating a key already in use. A write torn
    // by a crash is not repaired here either — it is caught by validation on the
    // next start, which reports it instead of quietly minting a replacement.
    fs.writeFileSync(filePath, secret, { mode: SECRET_FILE_MODE, flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') {
      // Lost the race. Adopt the winner's key; if what they wrote is unusable,
      // readSecretFile aborts rather than overwriting it.
      const existing = readSecretFile(filePath);
      if (existing) return existing;
      throw fatal(remediation(filePath));
    }
    throw writeFailure(filePath, error.code, error);
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
// in-memory fallback and no silent rotation: an unwritable data directory or an
// unusable key file fails the boot instead of invalidating every live session.
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

module.exports = {
  resolveSessionSecret,
  SESSION_SECRET_FILENAME,
  MIN_SECRET_LENGTH,
  MIN_DISTINCT_CHARACTERS
};
