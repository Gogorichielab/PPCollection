CREATE TABLE ammo_import_history (
  user_id INTEGER NOT NULL,
  file_hash TEXT NOT NULL,
  import_count INTEGER NOT NULL,
  PRIMARY KEY (user_id, file_hash)
);
