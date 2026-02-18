const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createSettingsRepository } = require('../../src/infra/db/repositories/settings.repository');

describe('settings repository', () => {
  let db;
  let dbPath;
  let settingsRepo;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-settings-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    settingsRepo = createSettingsRepository(db);
  });

  afterEach(() => {
    db.close();
    const dir = path.dirname(dbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('get returns null for non-existent key', () => {
    const value = settingsRepo.get('nonexistent');
    expect(value).toBeNull();
  });

  test('set and get a value', () => {
    settingsRepo.set('test_key', 'test_value');
    const value = settingsRepo.get('test_key');
    expect(value).toBe('test_value');
  });

  test('set updates existing value', () => {
    settingsRepo.set('test_key', 'initial_value');
    settingsRepo.set('test_key', 'updated_value');
    const value = settingsRepo.get('test_key');
    expect(value).toBe('updated_value');
  });

  test('exists returns false for non-existent key', () => {
    expect(settingsRepo.exists('nonexistent')).toBe(false);
  });

  test('exists returns true for existing key', () => {
    settingsRepo.set('test_key', 'test_value');
    expect(settingsRepo.exists('test_key')).toBe(true);
  });
});
