const fs = require('fs');
const os = require('os');
const path = require('path');

const { createApp } = require('../../src/app/createApp');
const { DEFAULT_ADMIN_PASSWORD } = require('../../src/infra/config');
const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createSettingsRepository } = require('../../src/infra/db/repositories/settings.repository');

function freshDbPath() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-bootguard-'));
  return path.join(tempDir, 'app.db');
}

function cleanup(dbPath, app) {
  if (app && app.locals && app.locals.db) {
    app.locals.db.close();
  }
  fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
}

describe('boot guard — default ADMIN_PASSWORD in production', () => {
  test('refuses to start in production with default password and no seeded hash', async () => {
    const dbPath = freshDbPath();
    const config = {
      port: 0,
      sessionSecret: 'test-secret',
      adminUser: 'admin',
      adminPass: DEFAULT_ADMIN_PASSWORD,
      databasePath: dbPath,
      isProduction: true
    };

    await expect(createApp({ config })).rejects.toThrow(/ADMIN_PASSWORD/);

    cleanup(dbPath);
  });

  test('starts in production when password_hash is already seeded, even with default password', async () => {
    const dbPath = freshDbPath();
    // Pre-seed a hash so this looks like an existing deployment.
    const db = createDbClient(dbPath);
    migrate(db);
    const settings = createSettingsRepository(db);
    settings.set('password_hash', '$2b$12$seededhashvaluefornullop');
    settings.set('username', 'admin');
    db.close();

    const config = {
      port: 0,
      sessionSecret: 'test-secret',
      adminUser: 'admin',
      adminPass: DEFAULT_ADMIN_PASSWORD,
      databasePath: dbPath,
      isProduction: true
    };

    const app = await createApp({ config });
    expect(app).toBeDefined();
    cleanup(dbPath, app);
  });

  test('starts in non-production with default password and no seeded hash', async () => {
    const dbPath = freshDbPath();
    const config = {
      port: 0,
      sessionSecret: 'test-secret',
      adminUser: 'admin',
      adminPass: DEFAULT_ADMIN_PASSWORD,
      databasePath: dbPath,
      isProduction: false
    };

    const app = await createApp({ config });
    expect(app).toBeDefined();
    cleanup(dbPath, app);
  });

  test('starts in production with a non-default password', async () => {
    const dbPath = freshDbPath();
    const config = {
      port: 0,
      sessionSecret: 'test-secret',
      adminUser: 'admin',
      adminPass: 'a-real-strong-password-set-by-the-operator',
      databasePath: dbPath,
      isProduction: true
    };

    const app = await createApp({ config });
    expect(app).toBeDefined();
    cleanup(dbPath, app);
  });
});
