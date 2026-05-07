const { auditLog } = require('../../src/services/audit.service');

describe('auditLog', () => {
  let originalEnv;
  let logSpy;

  beforeEach(() => {
    originalEnv = { NODE_ENV: process.env.NODE_ENV, AUDIT_VERBOSE: process.env.AUDIT_VERBOSE };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    if (originalEnv.AUDIT_VERBOSE === undefined) {
      delete process.env.AUDIT_VERBOSE;
    } else {
      process.env.AUDIT_VERBOSE = originalEnv.AUDIT_VERBOSE;
    }
    logSpy.mockRestore();
  });

  test('skips logging entirely when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';
    auditLog('login.success', { ip: '127.0.0.1', username: 'admin' });
    expect(logSpy).not.toHaveBeenCalled();
  });

  test('emits structured JSON with timestamp and event', () => {
    process.env.NODE_ENV = 'production';
    auditLog('firearm.create', { ip: '10.0.0.1', id: 7 });
    expect(logSpy).toHaveBeenCalledTimes(1);

    const entry = JSON.parse(logSpy.mock.calls[0][0]);
    expect(entry.event).toBe('firearm.create');
    expect(entry.ip).toBe('10.0.0.1');
    expect(entry.id).toBe(7);
    expect(entry.ts).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  test('strips username and serial when AUDIT_VERBOSE is not true', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AUDIT_VERBOSE;
    auditLog('login.success', { ip: '127.0.0.1', username: 'admin', serial: 'ABC123' });

    const entry = JSON.parse(logSpy.mock.calls[0][0]);
    expect(entry.username).toBeUndefined();
    expect(entry.serial).toBeUndefined();
    expect(entry.ip).toBe('127.0.0.1');
  });

  test('keeps username and serial when AUDIT_VERBOSE=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUDIT_VERBOSE = 'true';
    auditLog('login.success', { ip: '127.0.0.1', username: 'admin', serial: 'ABC123' });

    const entry = JSON.parse(logSpy.mock.calls[0][0]);
    expect(entry.username).toBe('admin');
    expect(entry.serial).toBe('ABC123');
  });
});
