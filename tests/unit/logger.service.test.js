const logger = require('../../src/services/logger.service');

describe('logger service', () => {
  let logSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('emits one structured JSON line for informational events', () => {
    logger.info('server.started', { port: 3000 });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(logSpy.mock.calls[0][0]);
    expect(entry).toMatchObject({ level: 'info', event: 'server.started', port: 3000 });
    expect(entry.ts).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  test('uses the matching console stream for warning and error events', () => {
    logger.warn('config.warning', { message: 'check configuration' });
    logger.error('server.failed', { message: 'startup failed' });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(warnSpy.mock.calls[0][0]).level).toBe('warn');
    expect(JSON.parse(errorSpy.mock.calls[0][0]).level).toBe('error');
  });

  test('does not allow metadata to replace core log fields', () => {
    logger.info('expected.event', { event: 'spoofed.event', level: 'error', ts: 'invalid' });

    expect(JSON.parse(logSpy.mock.calls[0][0])).toMatchObject({
      event: 'expected.event',
      level: 'info'
    });
  });
});
