const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { databasePath } = require('./config');

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(databasePath);
const db = new Database(databasePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS firearms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  serial TEXT,
  caliber TEXT,
  purchase_date TEXT,
  purchase_price REAL,
  condition TEXT,
  location TEXT,
  status TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firearm_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  type TEXT,
  notes TEXT,
  round_count_delta INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (firearm_id) REFERENCES firearms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS range_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firearm_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  rounds_fired INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (firearm_id) REFERENCES firearms(id) ON DELETE CASCADE
);
`);

function ensureLocationColumn() {
  const firearmColumns = db.prepare("PRAGMA table_info('firearms')").all();
  const hasLocation = firearmColumns.some((col) => col.name === 'location');


  if (!hasLocation) {
    db.exec('ALTER TABLE firearms ADD COLUMN location TEXT;');
  }
}

ensureLocationColumn();

const firearms = {
  all() {
    return db.prepare('SELECT * FROM firearms ORDER BY make, model, id').all();
  },
  get(id) {
    return db.prepare('SELECT * FROM firearms WHERE id = ?').get(id);
  },
  create(data) {
    const stmt = db.prepare(`INSERT INTO firearms (make, model, serial, caliber, purchase_date, purchase_price, condition, location, status, notes)
      VALUES (@make, @model, @serial, @caliber, @purchase_date, @purchase_price, @condition, @location, @status, @notes)`);
    const info = stmt.run(data);
    return info.lastInsertRowid;
  },
  update(id, data) {
    const stmt = db.prepare(`UPDATE firearms SET make=@make, model=@model, serial=@serial, caliber=@caliber, purchase_date=@purchase_date,
      purchase_price=@purchase_price, condition=@condition, location=@location, status=@status, notes=@notes, updated_at = datetime('now') WHERE id=@id`);
    stmt.run({ ...data, id });
  },
  remove(id) {
    db.prepare('DELETE FROM firearms WHERE id = ?').run(id);
  }
};

module.exports = { db, firearms };

