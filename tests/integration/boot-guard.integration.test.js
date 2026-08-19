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
  test('refuses to start in production when ADMIN_PASSWORD is explicitly the documented default', async () => {
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

// The guard above only applies when ADMIN_PASSWORD is supplied. With it absent
// there is nothing to guard: the account is created through /setup instead, so
// a bare `docker run` with no -e flags must boot rather than refuse.
describe('zero-configuration boot', () => {
  let stdoutSpy;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  test('starts in production with no ADMIN_PASSWORD and no seeded hash', async () => {
    const dbPath = freshDbPath();
    const config = {
      port: 0,
      sessionSecret: 'test-secret',
      adminUser: 'admin',
      databasePath: dbPath,
      isProduction: true
    };

    const app = await createApp({ config });
    expect(app).toBeDefined();

    // No account was seeded — the wizard owns account creation now.
    const settings = createSettingsRepository(app.locals.db);
    expect(settings.exists('password_hash')).toBe(false);

    cleanup(dbPath, app);
  });

  test('prints a setup code banner an operator can read out of the container logs', async () => {
    const dbPath = freshDbPath();
    const config = {
      port: 0,
      sessionSecret: 'test-secret',
      adminUser: 'admin',
      databasePath: dbPath,
      isProduction: true
    };

    const app = await createApp({ config, setupCode: 'ABCD-EFGH-JKMN' });

    const printed = stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(printed).toContain('ABCD-EFGH-JKMN');
    expect(printed).toContain('/setup');

    cleanup(dbPath, app);
  });

  test('does not announce a setup code when an administrator already exists', async () => {
    const dbPath = freshDbPath();
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
      databasePath: dbPath,
      isProduction: true
    };

    const app = await createApp({ config, setupCode: 'ABCD-EFGH-JKMN' });

    const printed = stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(printed).not.toContain('ABCD-EFGH-JKMN');

    cleanup(dbPath, app);
  });
});
