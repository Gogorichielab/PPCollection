const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');

describe('migrate', () => {
  test('is idempotent and applies all migrations', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-migrate-'));
    const dbPath = path.join(tempDir, 'app.db');
    const db = createDbClient(dbPath);

    migrate(db);
    migrate(db);

    const migrationCount = db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get();
    const migrationFiles = fs
      .readdirSync(path.join(__dirname, '../../src/infra/db/migrations'))
      .filter((file) => file.endsWith('.sql'));
    expect(migrationCount.count).toBe(migrationFiles.length);

    const columns = db.prepare("PRAGMA table_info('firearms')").all();
    const columnNames = columns.map((column) => column.name);

    expect(columnNames).toContain('location');
    expect(columnNames).toContain('gun_warranty');
    expect(columnNames).toContain('firearm_type');

    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
