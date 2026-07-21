const { getConfig } = require('../../src/infra/config');

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
      process.env.DATABASE_PATH = '/data/app.db';
      const config = getConfig();
      delete process.env.DATABASE_PATH;
      expect(config.dataDir).toBe(path.resolve('/data'));
      expect(config.photosDir).toBe(path.resolve('/data/photos'));
    });
  });

  describe('SESSION_SECRET guard', () => {
    test('uses provided SESSION_SECRET', () => {
      process.env.SESSION_SECRET = 'my-strong-secret';
      expect(getConfig().sessionSecret).toBe('my-strong-secret');
    });

    test('warns in development when SESSION_SECRET is unset', () => {
      delete process.env.SESSION_SECRET;
      getConfig();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET'));
    });

    test('warns in development when SESSION_SECRET matches the known default', () => {
      process.env.SESSION_SECRET = 'ppcollection_dev_secret';
      getConfig();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET'));
    });

    test('throws in production when SESSION_SECRET is unset', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRUST_PROXY = 'true';
      delete process.env.SESSION_SECRET;
      expect(() => getConfig()).toThrow(/SESSION_SECRET/);
    });

    test('throws in production when SESSION_SECRET matches the known default', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRUST_PROXY = 'true';
      process.env.SESSION_SECRET = 'ppcollection_dev_secret';
      expect(() => getConfig()).toThrow(/SESSION_SECRET/);
    });

    test('does not warn when SESSION_SECRET is a custom value', () => {
      process.env.SESSION_SECRET = 'my-strong-secret';
      getConfig();
      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET'));
    });
  });
});
