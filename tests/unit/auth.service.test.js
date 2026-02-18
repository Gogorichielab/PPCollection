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
      
      // Create a new auth service instance with same repository
      const newAuthService = createAuthService({ adminUser: 'admin', settingsRepository: settingsRepo });
      const theme = newAuthService.getTheme();
      
      expect(theme).toBe('light');
    });
  });
});
