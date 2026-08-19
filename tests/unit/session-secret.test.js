const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveSessionSecret, SESSION_SECRET_FILENAME } = require('../../src/infra/config/session-secret');

function freshDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-secret-'));
}

function secretPath(dataDir) {
  return path.join(dataDir, SESSION_SECRET_FILENAME);
}

function modeOf(filePath) {
  return fs.statSync(filePath).mode & 0o777;
}

const runningAsRoot = typeof process.getuid === 'function' && process.getuid() === 0;

describe('resolveSessionSecret', () => {
  let dataDir;
  let logSpy;
  let warnSpy;

  beforeEach(() => {
    dataDir = freshDataDir();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
    logSpy.mockRestore();
    warnSpy.mockRestore();
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

    test('generates a long, high-entropy secret', () => {
      const { secret } = resolveSessionSecret({ dataDir });

      expect(secret.length).toBeGreaterThanOrEqual(64);
      expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
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

    test('logs that a secret was generated without logging the secret itself', () => {
      const { secret } = resolveSessionSecret({ dataDir });

      const logged = logSpy.mock.calls.map(([line]) => line).join('\n');
      expect(logged).toContain('session_secret.generated');
      expect(logged).not.toContain(secret);
    });
  });

  describe('persistence', () => {
    test('reuses the stored secret on the next call', () => {
      const first = resolveSessionSecret({ dataDir });
      const second = resolveSessionSecret({ dataDir });

      expect(second.secret).toBe(first.secret);
      expect(second.source).toBe('file');
    });

    test('does not rewrite the file when a secret already exists', () => {
      resolveSessionSecret({ dataDir });
      const before = fs.readFileSync(secretPath(dataDir));

      resolveSessionSecret({ dataDir });

      expect(fs.readFileSync(secretPath(dataDir))).toEqual(before);
    });

    test('tolerates a trailing newline in a hand-written secret file', () => {
      fs.writeFileSync(secretPath(dataDir), 'operator-written-secret\n', { mode: 0o600 });

      expect(resolveSessionSecret({ dataDir }).secret).toBe('operator-written-secret');
    });

    test('replaces an empty secret file rather than signing with an empty key', () => {
      fs.writeFileSync(secretPath(dataDir), '   \n', { mode: 0o600 });

      const { secret, source } = resolveSessionSecret({ dataDir });

      expect(source).toBe('generated');
      expect(secret.length).toBeGreaterThanOrEqual(64);
    });
  });

  describe('environment override', () => {
    test('returns the environment secret and writes no file', () => {
      const { secret, source } = resolveSessionSecret({ dataDir, envSecret: 'operator-supplied' });

      expect(secret).toBe('operator-supplied');
      expect(source).toBe('env');
      expect(fs.existsSync(secretPath(dataDir))).toBe(false);
    });

    test('takes precedence over an already stored secret', () => {
      const stored = resolveSessionSecret({ dataDir }).secret;
      const { secret } = resolveSessionSecret({ dataDir, envSecret: 'operator-supplied' });

      expect(secret).toBe('operator-supplied');
      expect(fs.readFileSync(secretPath(dataDir), 'utf8')).toBe(stored);
    });

    test('does not require a dataDir when the environment supplies the secret', () => {
      expect(() => resolveSessionSecret({ envSecret: 'operator-supplied' })).not.toThrow();
    });
  });

  describe('permission repair', () => {
    const maybe = runningAsRoot ? test.skip : test;

    maybe('resets a group- or world-readable file to 0600 and keeps its value', () => {
      const { secret } = resolveSessionSecret({ dataDir });
      fs.chmodSync(secretPath(dataDir), 0o644);

      expect(resolveSessionSecret({ dataDir }).secret).toBe(secret);
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
  });

  describe('unwritable data directory', () => {
    test('throws instead of falling back to a temporary secret', () => {
      // A regular file cannot become a directory, so mkdir fails for any uid.
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

      expect(() => resolveSessionSecret({ dataDir: target })).toThrow(
        new RegExp(secretPath(target).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
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
      resolveSessionSecret({ dataDir });
      fs.chmodSync(secretPath(dataDir), 0o000);
      try {
        expect(() => resolveSessionSecret({ dataDir })).toThrow(/Could not persist the session secret/);
      } finally {
        fs.chmodSync(secretPath(dataDir), 0o600);
      }
    });
  });

  test('requires a dataDir when no environment secret is supplied', () => {
    expect(() => resolveSessionSecret({})).toThrow(/dataDir/);
  });
});
