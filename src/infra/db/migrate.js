const fs = require('fs');
const path = require('path');

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function applySqlMigrations(db, migrationsDir) {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const hasMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ? LIMIT 1');
  const markMigration = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');

  for (const file of files) {
    const alreadyApplied = hasMigration.get(file);
    if (alreadyApplied) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const runMigration = db.transaction(() => {
      db.exec(sql);
      markMigration.run(file);
    });

    runMigration();
  }
}

function migrate(db) {
  const migrationsDir = path.join(__dirname, 'migrations');
  ensureMigrationsTable(db);
  applySqlMigrations(db, migrationsDir);
}

module.exports = { migrate };
