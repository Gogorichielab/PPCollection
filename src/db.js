const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { adminUser, adminPasswordHash, databasePath } = require('./config');

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
  type TEXT,
  purchase_date TEXT,
  purchase_price REAL,
  purchase_location TEXT,
  condition TEXT,
  status TEXT,
  notes TEXT,
  buyer_name TEXT,
  buyer_address TEXT,
  sold_date TEXT,
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

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  invited_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  email TEXT,
  invited_by INTEGER,
  expires_at TEXT,
  accepted_at TEXT,
  accepted_user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (accepted_user_id) REFERENCES users(id) ON DELETE SET NULL
);
`);

// Migration: Add new columns if they don't exist
const migrateFirearmsTable = () => {
  const tableInfo = db.prepare("PRAGMA table_info(firearms)").all();
  const columnNames = tableInfo.map(col => col.name);
  
  // Add type column if it doesn't exist
  if (!columnNames.includes('type')) {
    db.exec('ALTER TABLE firearms ADD COLUMN type TEXT');
  }
  
  // Add purchase_location column if it doesn't exist
  if (!columnNames.includes('purchase_location')) {
    db.exec('ALTER TABLE firearms ADD COLUMN purchase_location TEXT');
    // Migrate data from old 'location' column if it exists
    if (columnNames.includes('location')) {
      db.exec('UPDATE firearms SET purchase_location = location WHERE purchase_location IS NULL');
    }
  }
  
  // Add sold section columns if they don't exist
  if (!columnNames.includes('buyer_name')) {
    db.exec('ALTER TABLE firearms ADD COLUMN buyer_name TEXT');
  }
  if (!columnNames.includes('buyer_address')) {
    db.exec('ALTER TABLE firearms ADD COLUMN buyer_address TEXT');
  }
  if (!columnNames.includes('sold_date')) {
    db.exec('ALTER TABLE firearms ADD COLUMN sold_date TEXT');
  }
};

migrateFirearmsTable();

const ensureAdmin = () => {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUser);
  if (!existing) {
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(adminUser, adminPasswordHash);
  }
};

ensureAdmin();

const firearms = {
  all(sortBy = 'make', sortDir = 'asc') {
    // Prevent SQL injection by validating column and direction against whitelists
    const validColumns = ['make', 'model', 'caliber', 'serial', 'type', 'purchase_date', 'purchase_price', 'condition', 'purchase_location', 'status'];
    const validDirections = ['asc', 'desc'];
    
    // Use whitelist validation - only allow known columns and directions
    const column = validColumns.includes(sortBy) ? sortBy : 'make';
    const direction = validDirections.includes(sortDir.toLowerCase()) ? sortDir.toLowerCase() : 'asc';
    
    // Safe to use template literals here since column and direction are validated against whitelists
    // Secondary sort by id always uses ASC for predictable ordering
    const query = `SELECT * FROM firearms ORDER BY ${column} ${direction.toUpperCase()}, id ASC`;
    return db.prepare(query).all();
  },
  get(id) {
    return db.prepare('SELECT * FROM firearms WHERE id = ?').get(id);
  },
  create(data) {
    const stmt = db.prepare(`INSERT INTO firearms (make, model, serial, caliber, type, purchase_date, purchase_price, purchase_location, condition, status, notes, buyer_name, buyer_address, sold_date)
      VALUES (@make, @model, @serial, @caliber, @type, @purchase_date, @purchase_price, @purchase_location, @condition, @status, @notes, @buyer_name, @buyer_address, @sold_date)`);
    const info = stmt.run(data);
    return info.lastInsertRowid;
  },
  update(id, data) {
    const stmt = db.prepare(`UPDATE firearms SET make=@make, model=@model, serial=@serial, caliber=@caliber, type=@type, purchase_date=@purchase_date,
      purchase_price=@purchase_price, purchase_location=@purchase_location, condition=@condition, status=@status, notes=@notes, buyer_name=@buyer_name, buyer_address=@buyer_address, sold_date=@sold_date, updated_at = datetime('now') WHERE id=@id`);
    stmt.run({ ...data, id });
  },
  remove(id) {
    db.prepare('DELETE FROM firearms WHERE id = ?').run(id);
  }
};

module.exports = { db, firearms };

