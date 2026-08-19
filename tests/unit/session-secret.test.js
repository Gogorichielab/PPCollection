const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomBytes } = require('crypto');

const {
  resolveSessionSecret,
  SESSION_SECRET_FILENAME,
  MIN_SECRET_LENGTH,
  MIN_DISTINCT_CHARACTERS
} = require('../../src/infra/config/session-secret');

function freshDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-secret-'));
}

function secretPath(dataDir) {
  return path.join(dataDir, SESSION_SECRET_FILENAME);
}

function modeOf(filePath) {
  return fs.statSync(filePath).mode & 0o777;
}

function validSecret() {
  return randomBytes(48).toString('base64url');
}

function writeSecretFile(dataDir, contents, mode = 0o600) {
  fs.writeFileSync(secretPath(dataDir), contents, { mode });
}

const runningAsRoot = typeof process.getuid === 'function' && process.getuid() === 0;

describe('resolveSessionSecret', () => {
  let dataDir;
  let logSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    dataDir = freshDataDir();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('generation', () => {
    test('generates a secret and writes it to <dataDir>/session-secret', () => {
      const { secret, source } = resolveSessionSecret({ dataDir });

      expect(source).toBe('generated');
      expect(fs.readFileSync(secretPath(dataDir), 'utf8')).toBe(secret);
    });

    test('creates the data directory when it does not exist yet', () => {
      const nested = path.join(dataDir, 'nested', 'data');
      const { secret } = resolveSessionSecret({ dataDir: nested });

      expect(fs.readFileSync(secretPath(nested), 'utf8')).toBe(secret);
    });

    test('writes the file with owner-only permissions', () => {
      resolveSessionSecret({ dataDir });
      expect(modeOf(secretPath(dataDir))).toBe(0o600);
    });

    test('generates a key that its own validator accepts on the next start', () => {
      const first = resolveSessionSecret({ dataDir });
      const second = resolveSessionSecret({ dataDir });

      expect(second.secret).toBe(first.secret);
      expect(second.source).toBe('file');
    });

    test('generates a Base64URL key well above the minimum length and entropy', () => {
      const { secret } = resolveSessionSecret({ dataDir });

      expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(secret.length).toBeGreaterThanOrEqual(MIN_SECRET_LENGTH);
      expect(new Set(secret).size).toBeGreaterThanOrEqual(MIN_DISTINCT_CHARACTERS);
    });

    test('generates a different secret for each data directory', () => {
      const otherDir = freshDataDir();
      try {
        const first = resolveSessionSecret({ dataDir });
        const second = resolveSessionSecret({ dataDir: otherDir });
        expect(first.secret).not.toBe(second.secret);
      } finally {
        fs.rmSync(otherDir, { recursive: true, force: true });
      }
    });
  });

  describe('persistence', () => {
    test('reuses a valid stored secret unchanged after a restart', () => {
      const stored = validSecret();
      writeSecretFile(dataDir, stored);

      const { secret, source } = resolveSessionSecret({ dataDir });

      expect(secret).toBe(stored);
      expect(source).toBe('file');
      expect(fs.readFileSync(secretPath(dataDir), 'utf8')).toBe(stored);
    });

    test('does not rewrite the file when a secret already exists', () => {
      resolveSessionSecret({ dataDir });
      const before = fs.readFileSync(secretPath(dataDir));

      resolveSessionSecret({ dataDir });

      expect(fs.readFileSync(secretPath(dataDir))).toEqual(before);
    });

    test('tolerates a trailing newline around a valid key', () => {
      const stored = validSecret();
      writeSecretFile(dataDir, `${stored}\n`);

      expect(resolveSessionSecret({ dataDir }).secret).toBe(stored);
    });
  });

  describe('invalid stored secrets', () => {
    // Every case here must abort the boot. Silently regenerating would sign new
    // sessions with a different key and log every user out with no explanation.
    test.each([
      ['an empty file', '', /the file is empty/],
      ['a whitespace-only file', '   \n\t ', /the file is empty/],
      ['a truncated key', validSecret().slice(0, MIN_SECRET_LENGTH - 1), /short of the 43/],
      ['a key with characters outside Base64URL', `${validSecret()}!!`, /does not contain a Base64URL key/],
      ['a repeated-character key', 'A'.repeat(64), /too few distinct characters/],
      ['a two-character pattern', 'ab'.repeat(32), /too few distinct characters/]
    ])('refuses to start on %s', (_label, contents, reasonPattern) => {
      writeSecretFile(dataDir, contents);

      expect(() => resolveSessionSecret({ dataDir })).toThrow(reasonPattern);
    });

    test('names the file and the remediation options', () => {
      writeSecretFile(dataDir, '');

      expect(() => resolveSessionSecret({ dataDir })).toThrow(
        new RegExp(secretPath(dataDir).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
      expect(() => resolveSessionSecret({ dataDir })).toThrow(/delete it|restore|SESSION_SECRET/i);
    });

    test('leaves the invalid file untouched rather than replacing it', () => {
      writeSecretFile(dataDir, 'too-short');

      expect(() => resolveSessionSecret({ dataDir })).toThrow();
      expect(fs.readFileSync(secretPath(dataDir), 'utf8')).toBe('too-short');
    });

    test('logs the shape problem without echoing the file contents', () => {
      writeSecretFile(dataDir, 'ab'.repeat(32));

      expect(() => resolveSessionSecret({ dataDir })).toThrow();

      const logged = errorSpy.mock.calls.map(([line]) => line).join('\n');
      expect(logged).toContain('session_secret.invalid');
      expect(logged).not.toContain('ab'.repeat(32));
    });

    test('a valid key that is only just long enough is accepted', () => {
      // Guards the boundary from drifting: exactly MIN_SECRET_LENGTH must pass.
      let candidate = validSecret().slice(0, MIN_SECRET_LENGTH);
      while (new Set(candidate).size < MIN_DISTINCT_CHARACTERS) {
        candidate = validSecret().slice(0, MIN_SECRET_LENGTH);
      }
      writeSecretFile(dataDir, candidate);

      expect(resolveSessionSecret({ dataDir }).secret).toBe(candidate);
    });
  });

  describe('environment override', () => {
    test('returns the environment secret and writes no file', () => {
      const { secret, source } = resolveSessionSecret({ dataDir, envSecret: 'operator-supplied' });

      expect(secret).toBe('operator-supplied');
      expect(source).toBe('env');
      expect(fs.existsSync(secretPath(dataDir))).toBe(false);
    });

    test('takes precedence over a stored secret', () => {
      const stored = validSecret();
      writeSecretFile(dataDir, stored);

      expect(resolveSessionSecret({ dataDir, envSecret: 'operator-supplied' }).secret).toBe('operator-supplied');
      expect(fs.readFileSync(secretPath(dataDir), 'utf8')).toBe(stored);
    });

    test('bypasses an unusable file entirely, so it is a way out of a bad state', () => {
      writeSecretFile(dataDir, '');

      expect(() => resolveSessionSecret({ dataDir, envSecret: 'operator-supplied' })).not.toThrow();
    });

    test('does not require a dataDir', () => {
      expect(() => resolveSessionSecret({ envSecret: 'operator-supplied' })).not.toThrow();
    });
  });

  describe('concurrent first start', () => {
    // Simulates losing the exclusive-create race: the file is absent when this
    // process reads, and present by the time it writes.
    function simulateLostRace(onDiskContents) {
      writeSecretFile(dataDir, onDiskContents);

      const realReadFileSync = fs.readFileSync;
      let firstRead = true;
      jest.spyOn(fs, 'readFileSync').mockImplementation((...args) => {
        if (firstRead && args[0] === secretPath(dataDir)) {
          firstRead = false;
          const error = new Error('ENOENT');
          error.code = 'ENOENT';
          throw error;
        }
        return realReadFileSync(...args);
      });
    }

    test('adopts the winner\'s secret instead of overwriting it', () => {
      const winner = validSecret();
      simulateLostRace(winner);

      const { secret } = resolveSessionSecret({ dataDir });

      expect(secret).toBe(winner);
      expect(fs.readFileSync.mock).toBeDefined();
    });

    test('never truncates the file the winner already wrote', () => {
      const winner = validSecret();
      simulateLostRace(winner);

      resolveSessionSecret({ dataDir });

      jest.restoreAllMocks();
      expect(fs.readFileSync(secretPath(dataDir), 'utf8')).toBe(winner);
    });

    test('aborts rather than repairing a partial write from the winner', () => {
      simulateLostRace('');

      expect(() => resolveSessionSecret({ dataDir })).toThrow(/the file is empty/);

      jest.restoreAllMocks();
      expect(fs.readFileSync(secretPath(dataDir), 'utf8')).toBe('');
    });
  });

  describe('permissions', () => {
    const maybe = runningAsRoot ? test.skip : test;

    maybe('resets a group- or world-readable file to 0600 and keeps its value', () => {
      const stored = validSecret();
      writeSecretFile(dataDir, stored, 0o644);

      expect(resolveSessionSecret({ dataDir }).secret).toBe(stored);
      expect(modeOf(secretPath(dataDir))).toBe(0o600);
      expect(warnSpy.mock.calls.map(([line]) => line).join('\n')).toContain(
        'session_secret.permissions_repaired'
      );
    });

    maybe('leaves an already-restricted file untouched and stays quiet', () => {
      resolveSessionSecret({ dataDir });
      warnSpy.mockClear();

      resolveSessionSecret({ dataDir });

      expect(warnSpy).not.toHaveBeenCalled();
    });

    test('fails closed when owner-only permissions cannot be applied on creation', () => {
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {
        const error = new Error('operation not permitted');
        error.code = 'EPERM';
        throw error;
      });

      expect(() => resolveSessionSecret({ dataDir })).toThrow(/Could not restrict permissions/);
    });

    test('fails closed when an over-permissive stored file cannot be restricted', () => {
      writeSecretFile(dataDir, validSecret(), 0o644);
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {
        const error = new Error('operation not permitted');
        error.code = 'EPERM';
        throw error;
      });

      expect(() => resolveSessionSecret({ dataDir })).toThrow(/Could not restrict permissions/);
    });

    test('the permission failure points at SESSION_SECRET as the way out', () => {
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {
        const error = new Error('operation not permitted');
        error.code = 'EPERM';
        throw error;
      });

      expect(() => resolveSessionSecret({ dataDir })).toThrow(/SESSION_SECRET/);
    });
  });

  describe('unwritable data directory', () => {
    test('throws instead of falling back to a temporary secret', () => {
      const blocker = path.join(dataDir, 'blocker');
      fs.writeFileSync(blocker, 'not a directory');

      expect(() => resolveSessionSecret({ dataDir: path.join(blocker, 'data') })).toThrow(
        /Could not persist the session secret/
      );
    });

    test('names the path and points at the chown fix', () => {
      const blocker = path.join(dataDir, 'blocker');
      fs.writeFileSync(blocker, 'not a directory');
      const target = path.join(blocker, 'data');

      expect(() => resolveSessionSecret({ dataDir: target })).toThrow(/chown/);
    });

    const maybe = runningAsRoot ? test.skip : test;

    maybe('throws when the data directory exists but is not writable', () => {
      fs.chmodSync(dataDir, 0o500);
      try {
        expect(() => resolveSessionSecret({ dataDir })).toThrow(/Could not persist the session secret/);
      } finally {
        fs.chmodSync(dataDir, 0o700);
      }
    });

    maybe('throws when the stored secret cannot be read back', () => {
      writeSecretFile(dataDir, validSecret());
      fs.chmodSync(secretPath(dataDir), 0o000);
      try {
        expect(() => resolveSessionSecret({ dataDir })).toThrow(/Could not read the session secret/);
      } finally {
        fs.chmodSync(secretPath(dataDir), 0o600);
      }
    });
  });

  describe('log redaction', () => {
    test('never writes the generated secret to the logs', () => {
      const { secret } = resolveSessionSecret({ dataDir });

      const logged = [logSpy, warnSpy, errorSpy]
        .flatMap((spy) => spy.mock.calls.map(([line]) => String(line)))
        .join('\n');

      expect(logged).toContain('session_secret.generated');
      expect(logged).not.toContain(secret);
    });

    test('never writes a stored secret to the logs when repairing permissions', () => {
      const stored = validSecret();
      writeSecretFile(dataDir, stored, 0o644);

      resolveSessionSecret({ dataDir });

      const logged = [logSpy, warnSpy, errorSpy]
        .flatMap((spy) => spy.mock.calls.map(([line]) => String(line)))
        .join('\n');

      expect(logged).not.toContain(stored);
    });

    test('never includes the key in the error raised for an invalid file', () => {
      const nearMiss = `${validSecret()}!!`;
      writeSecretFile(dataDir, nearMiss);

      expect(() => resolveSessionSecret({ dataDir })).toThrow();
      try {
        resolveSessionSecret({ dataDir });
      } catch (error) {
        expect(error.message).not.toContain(nearMiss);
      }
    });
  });

  test('requires a dataDir when no environment secret is supplied', () => {
    expect(() => resolveSessionSecret({})).toThrow(/dataDir/);
  });
});
