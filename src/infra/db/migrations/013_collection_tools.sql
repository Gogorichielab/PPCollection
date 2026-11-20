CREATE TABLE import_batches (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('firearms','ammo')),
  filename TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  undone_at TEXT
);
CREATE INDEX idx_batches_owner ON import_batches(user_id, kind, id);
ALTER TABLE firearms ADD COLUMN import_batch_id INTEGER REFERENCES import_batches(id);
ALTER TABLE ammo_inventory ADD COLUMN import_batch_id INTEGER REFERENCES import_batches(id);
CREATE TABLE import_members (
  batch_id INTEGER NOT NULL REFERENCES import_batches(id),
  record_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  edited INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(batch_id, record_id)
);
CREATE TRIGGER imported_firearm AFTER INSERT ON firearms WHEN NEW.import_batch_id IS NOT NULL BEGIN
  INSERT INTO import_members(batch_id,record_id,label) VALUES(NEW.import_batch_id,NEW.id,trim(NEW.make || ' ' || NEW.model));
END;
CREATE TRIGGER imported_ammo AFTER INSERT ON ammo_inventory WHEN NEW.import_batch_id IS NOT NULL BEGIN
  INSERT INTO import_members(batch_id,record_id,label) VALUES(NEW.import_batch_id,NEW.id,trim(NEW.manufacturer || ' ' || NEW.caliber));
END;
CREATE TRIGGER edited_imported_firearm AFTER UPDATE ON firearms WHEN OLD.import_batch_id IS NOT NULL BEGIN
  UPDATE import_members SET edited=1 WHERE batch_id=OLD.import_batch_id AND record_id=OLD.id;
END;
CREATE TRIGGER edited_imported_ammo AFTER UPDATE ON ammo_inventory WHEN OLD.import_batch_id IS NOT NULL BEGIN
  UPDATE import_members SET edited=1 WHERE batch_id=OLD.import_batch_id AND record_id=OLD.id;
END;
CREATE TABLE saved_inventory_views (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE,
  query TEXT NOT NULL,
  UNIQUE(user_id,kind,name)
);
CREATE TABLE firearm_documents (
  id INTEGER PRIMARY KEY,
  firearm_id INTEGER NOT NULL REFERENCES firearms(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('Receipt','Appraisal')),
  filename TEXT NOT NULL,
  contents BLOB NOT NULL
);
CREATE INDEX idx_documents_firearm ON firearm_documents(firearm_id);

CREATE TRIGGER protect_import_on_firearm_documents AFTER INSERT ON firearm_documents BEGIN
  UPDATE import_members SET edited=1 WHERE record_id=NEW.firearm_id
    AND batch_id=(SELECT import_batch_id FROM firearms WHERE id=NEW.firearm_id);
END;

CREATE TRIGGER protect_import_on_firearm_photos AFTER INSERT ON firearm_photos BEGIN
  UPDATE import_members SET edited=1 WHERE record_id=NEW.firearm_id
    AND batch_id=(SELECT import_batch_id FROM firearms WHERE id=NEW.firearm_id);
END;

CREATE TRIGGER protect_import_on_maintenance_logs AFTER INSERT ON maintenance_logs BEGIN
  UPDATE import_members SET edited=1 WHERE record_id=NEW.firearm_id
    AND batch_id=(SELECT import_batch_id FROM firearms WHERE id=NEW.firearm_id);
END;

CREATE TRIGGER protect_import_on_range_sessions AFTER INSERT ON range_sessions BEGIN
  UPDATE import_members SET edited=1 WHERE record_id=NEW.firearm_id
    AND batch_id=(SELECT import_batch_id FROM firearms WHERE id=NEW.firearm_id);
END;
