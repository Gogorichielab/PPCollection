CREATE TABLE IF NOT EXISTS ammo_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  manufacturer TEXT NOT NULL DEFAULT '',
  product_line TEXT NOT NULL DEFAULT '',
  caliber TEXT NOT NULL DEFAULT '',
  grain INTEGER,
  load_type TEXT NOT NULL DEFAULT '',
  boxes INTEGER NOT NULL DEFAULT 0,
  rounds_per_box INTEGER NOT NULL DEFAULT 0,
  loose_rounds INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ammo_inventory_user_id ON ammo_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_ammo_inventory_caliber ON ammo_inventory(user_id, caliber);
