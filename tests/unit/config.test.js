const { getConfig } = require('../../src/infra/config');

describe('getConfig', () => {
  const originalEnv = { ...process.env };
  let warnSpy;

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SECURE_COOKIES;
    delete process.env.TRUST_PROXY;
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
});
