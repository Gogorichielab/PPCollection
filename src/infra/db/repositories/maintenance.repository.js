function createMaintenanceRepository(db) {
  return {
    listByFirearm(firearmId) {
      return db
        .prepare('SELECT * FROM maintenance_logs WHERE firearm_id = ? ORDER BY date DESC, id DESC')
        .all(firearmId);
    },
    get(id, firearmId) {
      return db
        .prepare('SELECT * FROM maintenance_logs WHERE id = ? AND firearm_id = ?')
        .get(id, firearmId);
    },
    create(data) {
      const stmt = db.prepare(`
        INSERT INTO maintenance_logs (firearm_id, date, type, notes, round_count_delta)
        VALUES (@firearm_id, @date, @type, @notes, @round_count_delta)
      `);
      const info = stmt.run({ notes: '', round_count_delta: null, ...data });
      return info.lastInsertRowid;
    },
    remove(id, firearmId) {
      db.prepare('DELETE FROM maintenance_logs WHERE id = ? AND firearm_id = ?').run(id, firearmId);
    },
    getCleaningStatus(userId = 1) {
      return db.prepare(`
        SELECT
          f.id,
          f.make,
          f.model,
          f.status,
          (SELECT MAX(m.date) FROM maintenance_logs m WHERE m.firearm_id = f.id AND m.type = 'Cleaning') AS last_cleaned,
          (SELECT MAX(r.date) FROM range_sessions r
            WHERE r.firearm_id = f.id
              AND (r.rounds_fired IS NULL OR r.rounds_fired != 0)) AS last_range
        FROM firearms f
        WHERE f.user_id = ?
        ORDER BY f.make, f.model, f.id
      `).all(userId);
    },
    getFirearmCleaningDates(firearmId) {
      return db.prepare(`
        SELECT
          (SELECT MAX(m.date) FROM maintenance_logs m WHERE m.firearm_id = @firearmId AND m.type = 'Cleaning') AS last_cleaned,
          (SELECT MAX(r.date) FROM range_sessions r
            WHERE r.firearm_id = @firearmId
              AND (r.rounds_fired IS NULL OR r.rounds_fired != 0)) AS last_range
      `).get({ firearmId });
    }
  };
}

module.exports = { createMaintenanceRepository };
