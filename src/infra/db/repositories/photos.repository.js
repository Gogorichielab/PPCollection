function createPhotosRepository(db) {
  function insertPhoto(data) {
    const stmt = db.prepare(`
      INSERT INTO firearm_photos (firearm_id, filename, original_name, mime, size)
      VALUES (@firearm_id, @filename, @original_name, @mime, @size)
    `);
    const info = stmt.run({ original_name: '', ...data });
    return info.lastInsertRowid;
  }

  function countPhotos(firearmId) {
    return db
      .prepare('SELECT COUNT(*) AS count FROM firearm_photos WHERE firearm_id = ?')
      .get(firearmId).count;
  }

  // Count + insert run inside one transaction so concurrent uploads cannot
  // both pass the cap check. Returns null when the firearm is at the cap.
  const insertIfUnderCap = db.transaction((data, maxPerFirearm) => {
    if (countPhotos(data.firearm_id) >= maxPerFirearm) {
      return null;
    }
    return insertPhoto(data);
  });

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
      return countPhotos(firearmId);
    },
    create(data) {
      return insertPhoto(data);
    },
    createIfUnderCap(data, maxPerFirearm) {
      return insertIfUnderCap(data, maxPerFirearm);
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
