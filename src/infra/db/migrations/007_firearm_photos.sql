CREATE TABLE IF NOT EXISTS firearm_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firearm_id INTEGER NOT NULL,
  filename TEXT NOT NULL UNIQUE,
  original_name TEXT,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (firearm_id) REFERENCES firearms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_firearm_photos_firearm_id ON firearm_photos(firearm_id);
