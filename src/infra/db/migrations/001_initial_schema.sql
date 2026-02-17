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
  gun_warranty INTEGER DEFAULT 0,
  firearm_type TEXT,
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
