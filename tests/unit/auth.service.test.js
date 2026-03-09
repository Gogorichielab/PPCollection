const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createSettingsRepository } = require('../../src/infra/db/repositories/settings.repository');
const { createAuthService } = require('../../src/features/auth/auth.service');

describe('auth service', () => {
  let db;
  let dbPath;
  let settingsRepo;
  let authService;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-auth-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    settingsRepo = createSettingsRepository(db);
    authService = createAuthService({ adminUser: 'admin', settingsRepository: settingsRepo });
  });

  afterEach(() => {
    db.close();
    const dir = path.dirname(dbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('username management', () => {
    test('getUsername returns admin username when no value is stored', () => {
      expect(authService.getUsername()).toBe('admin');
    });

    test('updateUsername persists username when valid', () => {
      const result = authService.updateUsername('range_admin');

      expect(result).toEqual({ success: true, username: 'range_admin' });
      expect(authService.getUsername()).toBe('range_admin');
    });

    test('updateUsername rejects usernames shorter than 3 characters', () => {
      const result = authService.updateUsername('ab');

      expect(result).toEqual({ success: false, error: 'Username must be at least 3 characters.' });
      expect(authService.getUsername()).toBe('admin');
    });
  });

  describe('credential validation with lockout', () => {
    beforeEach(async () => {
      await authService.initializePasswordHash('password123');
    });

    test('validateCredentials returns { valid: true } for correct credentials', async () => {
      const result = await authService.validateCredentials('admin', 'password123');
      expect(result).toEqual({ valid: true });
    });

    test('validateCredentials returns { valid: false } for wrong password', async () => {
      const result = await authService.validateCredentials('admin', 'wrong');
      expect(result).toEqual({ valid: false });
    });

    test('validateCredentials returns { valid: false } for wrong username', async () => {
      const result = await authService.validateCredentials('notadmin', 'password123');
      expect(result).toEqual({ valid: false });
    });

    test('account locks after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await authService.validateCredentials('admin', 'wrong');
      }
      const result = await authService.validateCredentials('admin', 'wrong');
      expect(result.valid).toBe(false);
      expect(result.lockedUntil).toBeInstanceOf(Date);
      expect(result.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    test('locked account rejects even correct password', async () => {
      for (let i = 0; i < 5; i++) {
        await authService.validateCredentials('admin', 'wrong');
      }
      const result = await authService.validateCredentials('admin', 'password123');
      expect(result.valid).toBe(false);
      expect(result.lockedUntil).toBeInstanceOf(Date);
    });

    test('successful login resets failed attempt counter', async () => {
      for (let i = 0; i < 4; i++) {
        await authService.validateCredentials('admin', 'wrong');
      }
      await authService.validateCredentials('admin', 'password123');
      const result = await authService.validateCredentials('admin', 'wrong');
      expect(result.valid).toBe(false);
      expect(result.lockedUntil).toBeUndefined();
    });

    test('lockout clears after expiry', async () => {
      for (let i = 0; i < 5; i++) {
        await authService.validateCredentials('admin', 'wrong');
      }
      settingsRepo.set('login_lockout_until', new Date(Date.now() - 1000).toISOString());
      const result = await authService.validateCredentials('admin', 'password123');
      expect(result).toEqual({ valid: true });
    });
  });

  describe('session version management', () => {
    beforeEach(async () => {
      await authService.initializePasswordHash('password123');
    });

    test('getSessionVersion returns "0" by default', () => {
      expect(authService.getSessionVersion()).toBe('0');
    });

    test('session version increments after password change', async () => {
      await authService.changePassword('password123', 'newSecurePassword123');
      expect(authService.getSessionVersion()).toBe('1');
    });

    test('session version increments again on second password change', async () => {
      await authService.changePassword('password123', 'newSecurePassword123');
      await authService.changePassword('newSecurePassword123', 'anotherSecurePass123');
      expect(authService.getSessionVersion()).toBe('2');
    });
  });

  describe('theme management', () => {
    test('getTheme returns dark by default', () => {
      const theme = authService.getTheme();
      expect(theme).toBe('dark');
    });

    test('setTheme updates theme to light', () => {
      authService.setTheme('light');
      const theme = authService.getTheme();
      expect(theme).toBe('light');
    });

    test('setTheme updates theme to dark', () => {
      authService.setTheme('light');
      authService.setTheme('dark');
      const theme = authService.getTheme();
      expect(theme).toBe('dark');
    });

    test('setTheme throws error for invalid theme', () => {
      expect(() => authService.setTheme('invalid')).toThrow('Invalid theme value');
    });

    test('theme persists across service instances', () => {
      authService.setTheme('light');

      const newAuthService = createAuthService({ adminUser: 'admin', settingsRepository: settingsRepo });
      const theme = newAuthService.getTheme();

      expect(theme).toBe('light');
    });
  });
});
