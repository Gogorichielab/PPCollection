const tables = { firearms: 'firearms', ammo: 'ammo_inventory' };

function beginImport(db, userId, kind, filename) {
  return db.prepare('INSERT INTO import_batches(user_id,kind,filename) VALUES(?,?,?)')
    .run(userId, kind, filename).lastInsertRowid;
}

function createCollectionRepository(db) {
  function batch(userId, kind, id) {
    return db.prepare('SELECT * FROM import_batches WHERE user_id=? AND kind=? AND id=?').get(userId, kind, id);
  }

  function members(userId, kind, id) {
    const related = kind === 'firearms' ? ['firearm_photos', 'range_sessions', 'maintenance_logs', 'firearm_documents']
      .map(table => `EXISTS(SELECT 1 FROM ${table} WHERE firearm_id=r.id)`).join(' OR ') : '0';
    return db.prepare(`SELECT m.record_id, m.label,
      CASE WHEN r.id IS NULL THEN 'Absent' WHEN m.edited OR ${related} THEN 'Keep' ELSE 'Remove' END AS action
      FROM import_members m LEFT JOIN ${tables[kind]} r ON r.id=m.record_id AND r.user_id=? AND r.import_batch_id=m.batch_id
      WHERE m.batch_id=? ORDER BY m.record_id`).all(userId, id);
  }

  return {
    batch,
    members,
    batches(userId, kind) {
      return db.prepare(`SELECT b.*, COUNT(m.record_id) AS records FROM import_batches b
        JOIN import_members m ON m.batch_id=b.id WHERE b.user_id=? AND b.kind=?
        GROUP BY b.id ORDER BY b.id DESC`).all(userId, kind);
    },
    undo: db.transaction((userId, kind, id) => {
      const entry = batch(userId, kind, id);
      if (!entry || entry.undone_at) return false;
      const remove = db.prepare(`DELETE FROM ${tables[kind]} WHERE user_id=? AND id=? AND import_batch_id=?`);
      for (const row of members(userId, kind, id)) {
        if (row.action === 'Remove') remove.run(userId, row.record_id, id);
      }
      db.prepare('UPDATE import_batches SET undone_at=CURRENT_TIMESTAMP WHERE id=?').run(id);
      return true;
    }).immediate,
    views(userId, kind) {
      return db.prepare('SELECT id,name,query FROM saved_inventory_views WHERE user_id=? AND kind=? ORDER BY name').all(userId, kind);
    },
    saveView(userId, kind, name, query) {
      return db.prepare('INSERT OR IGNORE INTO saved_inventory_views(user_id,kind,name,query) VALUES(?,?,?,?)')
        .run(userId,kind,name,query).changes;
    },
    deleteView(userId, kind, id) {
      db.prepare('DELETE FROM saved_inventory_views WHERE id=? AND kind=? AND user_id=?').run(id,kind,userId);
    },
    documents(userId, firearmId = null) {
      return db.prepare(`SELECT d.id,d.firearm_id,d.category,d.filename,f.make,f.model,length(d.contents) AS size
        FROM firearm_documents d JOIN firearms f ON f.id=d.firearm_id
        WHERE f.user_id=? AND (? IS NULL OR f.id=?) ORDER BY f.make,f.model,d.id`).all(userId,firearmId,firearmId);
    },
    addDocument(userId, firearmId, category, filename, contents) {
      return db.prepare(`INSERT INTO firearm_documents(firearm_id,category,filename,contents)
        SELECT id,?,?,? FROM firearms WHERE id=? AND user_id=?`).run(category,filename,contents,firearmId,userId).changes;
    },
    document(userId, id) {
      return db.prepare(`SELECT d.* FROM firearm_documents d JOIN firearms f ON f.id=d.firearm_id
        WHERE f.user_id=? AND d.id=?`).get(userId,id);
    },
    deleteDocument(userId, firearmId, id) {
      return db.prepare(`DELETE FROM firearm_documents WHERE id=? AND firearm_id=? AND firearm_id IN
        (SELECT id FROM firearms WHERE user_id=?)`).run(id,firearmId,userId).changes;
    }
  };
}

module.exports = { beginImport, createCollectionRepository };
