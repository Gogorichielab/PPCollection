CREATE TABLE ammo_quantity_history (
  id INTEGER PRIMARY KEY,
  ammo_id INTEGER NOT NULL REFERENCES ammo_inventory(id) ON DELETE CASCADE,
  previous_rounds INTEGER NOT NULL,
  new_rounds INTEGER NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_ammo_quantity_history_lot ON ammo_quantity_history(ammo_id, id);
