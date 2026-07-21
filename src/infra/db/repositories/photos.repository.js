function createPhotosRepository(db) {
  return {
    listByFirearm(firearmId) {
      return db
        .prepare('SELECT * FROM firearm_photos WHERE firearm_id = ? ORDER BY created_at ASC, id ASC')
        .all(firearmId);
    },
    get(id, firearmId) {
      return db
        .prepare('SELECT * FROM firearm_photos WHERE id = ? AND firearm_id = ?')
        .get(id, firearmId);
    },
    countForFirearm(firearmId) {
      return db
        .prepare('SELECT COUNT(*) AS count FROM firearm_photos WHERE firearm_id = ?')
        .get(firearmId).count;
    },
    create(data) {
      const stmt = db.prepare(`
        INSERT INTO firearm_photos (firearm_id, filename, original_name, mime, size)
        VALUES (@firearm_id, @filename, @original_name, @mime, @size)
      `);
      const info = stmt.run({ original_name: '', ...data });
      return info.lastInsertRowid;
    },
    remove(id, firearmId) {
      db.prepare('DELETE FROM firearm_photos WHERE id = ? AND firearm_id = ?').run(id, firearmId);
    },
    removeByFirearm(firearmId) {
      db.prepare('DELETE FROM firearm_photos WHERE firearm_id = ?').run(firearmId);
    }
  };
}

module.exports = { createPhotosRepository };
