const { getConfig, DEFAULT_PORT, DEFAULT_SESSION_SECRET } = require('../../src/infra/config');

describe('getConfig', () => {
  const originalEnv = { ...process.env };
  let warnSpy;

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SECURE_COOKIES;
    delete process.env.TRUST_PROXY;
    process.env.ADMIN_PASSWORD = 'test-strong-password-not-default';
    process.env.SESSION_SECRET = 'test-strong-session-secret-not-default';
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    warnSpy.mockRestore();
  });

  describe('secureCookies', () => {
    test('defaults to true when NODE_ENV=production and SECURE_COOKIES is unset', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRUST_PROXY = 'true';
      const config = getConfig();
      expect(config.secureCookies).toBe(true);
    });

    test('defaults to false when NODE_ENV is not production and SECURE_COOKIES is unset', () => {
      process.env.NODE_ENV = 'development';
      const config = getConfig();
      expect(config.secureCookies).toBe(false);
    });

    test('SECURE_COOKIES=true forces on regardless of NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      process.env.SECURE_COOKIES = 'true';
      process.env.TRUST_PROXY = 'true';
      const config = getConfig();
      expect(config.secureCookies).toBe(true);
    });

    test('SECURE_COOKIES=false forces off in production (escape hatch)', () => {
      process.env.NODE_ENV = 'production';
      process.env.SECURE_COOKIES = 'false';
      const config = getConfig();
      expect(config.secureCookies).toBe(false);
    });

    test('warns when secure cookies are enabled but trust proxy is not', () => {
      process.env.NODE_ENV = 'production';
      // TRUST_PROXY left unset → false
      getConfig();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('TRUST_PROXY'));
    });

    test('does not warn when secure cookies are disabled', () => {
      process.env.NODE_ENV = 'development';
      getConfig();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('PORT', () => {
    beforeEach(() => {
      delete process.env.PORT;
    });

    test('defaults to 3000 when unset', () => {
      expect(getConfig().port).toBe(DEFAULT_PORT);
      expect(getConfig().port).toBe(3000);
    });

    test('defaults to 3000 when set to an empty value', () => {
      process.env.PORT = '';
      expect(getConfig().port).toBe(DEFAULT_PORT);
    });

    test('parses a valid port as a number', () => {
      process.env.PORT = '3008';
      expect(getConfig().port).toBe(3008);
    });

    test('tolerates surrounding whitespace', () => {
      process.env.PORT = '  3008  ';
      expect(getConfig().port).toBe(3008);
    });

    test.each(['abc', '30O8', '3008.5', '-1', '0', '65536', 'NaN'])(
      'throws instead of binding a random port for PORT=%s',
      (value) => {
        process.env.PORT = value;
        expect(() => getConfig()).toThrow(/PORT/);
      }
    );

    test('names the rejected value in the error', () => {
      process.env.PORT = '30O8';
      expect(() => getConfig()).toThrow(/30O8/);
    });

    test('warns but still returns a privileged port', () => {
      process.env.PORT = '80';
      expect(getConfig().port).toBe(80);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('privileged'));
    });

    test('does not warn for an unprivileged port', () => {
      process.env.PORT = '3008';
      getConfig();
      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('privileged'));
    });
  });

  describe('isProduction', () => {
    test('is true when NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRUST_PROXY = 'true';
      expect(getConfig().isProduction).toBe(true);
    });

    test('is false when NODE_ENV is anything else', () => {
      process.env.NODE_ENV = 'test';
      expect(getConfig().isProduction).toBe(false);
    });

    test('is false when NODE_ENV is unset', () => {
      expect(getConfig().isProduction).toBe(false);
    });
  });

  describe('DATABASE_PATH guard', () => {
    afterEach(() => {
      delete process.env.DATABASE_PATH;
      delete process.env.DATA_DIR;
    });

    test('accepts a path inside the default data directory', () => {
      const path = require('path');
      process.env.DATABASE_PATH = path.join(process.cwd(), 'data', 'app.db');
      expect(() => getConfig()).not.toThrow();
    });

    test('rejects a path-traversal attempt outside the allowed base', () => {
      process.env.DATABASE_PATH = '/etc/passwd';
      expect(() => getConfig()).toThrow(/DATABASE_PATH/);
    });

    test('honours a custom DATA_DIR for non-default deployment layouts', () => {
      const path = require('path');
      const os = require('os');
      const fs = require('fs');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-config-'));
      process.env.DATA_DIR = tmpDir;
      process.env.DATABASE_PATH = path.join(tmpDir, 'custom.db');
      expect(() => getConfig()).not.toThrow();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('defaults the database file inside DATA_DIR when only DATA_DIR is set', () => {
      const path = require('path');
      process.env.DATA_DIR = '/data';
      const config = getConfig();
      expect(config.databasePath).toBe(path.resolve('/data/app.db'));
    });

    test('accepts the bundled Docker defaults (DATA_DIR=/data, DATABASE_PATH=/data/app.db)', () => {
      process.env.DATA_DIR = '/data';
      process.env.DATABASE_PATH = '/data/app.db';
      expect(() => getConfig()).not.toThrow();
    });
  });

  describe('data and photos directories', () => {
    afterEach(() => {
      delete process.env.DATA_DIR;
    });

    test('derives dataDir and photosDir from the default data directory', () => {
      const path = require('path');
      const config = getConfig();
      expect(config.dataDir).toBe(path.join(process.cwd(), 'data'));
      expect(config.photosDir).toBe(path.join(process.cwd(), 'data', 'photos'));
    });

    test('derives dataDir and photosDir from DATA_DIR when set', () => {
      const path = require('path');
      process.env.DATA_DIR = '/data';
      const config = getConfig();
      expect(config.dataDir).toBe(path.resolve('/data'));
      expect(config.photosDir).toBe(path.resolve('/data/photos'));
    });
  });

  describe('SESSION_SECRET', () => {
    test('uses provided SESSION_SECRET', () => {
      process.env.SESSION_SECRET = 'my-strong-secret';
      expect(getConfig().sessionSecret).toBe('my-strong-secret');
    });

    test('reports null when unset so createApp generates and persists one', () => {
      delete process.env.SESSION_SECRET;
      expect(getConfig().sessionSecret).toBeNull();
    });

    test('does not throw in production when unset — zero-config start is supported', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRUST_PROXY = 'true';
      delete process.env.SESSION_SECRET;
      expect(() => getConfig()).not.toThrow();
    });

    test('does not warn when unset', () => {
      delete process.env.SESSION_SECRET;
      getConfig();
      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET'));
    });

    test('warns in development when SESSION_SECRET matches the published example value', () => {
      process.env.SESSION_SECRET = DEFAULT_SESSION_SECRET;
      getConfig();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET'));
    });

    test('throws in production when SESSION_SECRET matches the published example value', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRUST_PROXY = 'true';
      process.env.SESSION_SECRET = DEFAULT_SESSION_SECRET;
      expect(() => getConfig()).toThrow(/SESSION_SECRET/);
    });

    test('does not warn when SESSION_SECRET is a custom value', () => {
      process.env.SESSION_SECRET = 'my-strong-secret';
      getConfig();
      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET'));
    });
  });
});
