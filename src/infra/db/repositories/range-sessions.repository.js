function createRangeSessionsRepository(db) {
  return {
    listByFirearm(firearmId) {
      return db
        .prepare('SELECT * FROM range_sessions WHERE firearm_id = ? ORDER BY date DESC, id DESC')
        .all(firearmId);
    },
    get(id, firearmId) {
      return db
        .prepare('SELECT * FROM range_sessions WHERE id = ? AND firearm_id = ?')
        .get(id, firearmId);
    },
    create(data) {
      const stmt = db.prepare(`
        INSERT INTO range_sessions (firearm_id, date, location, rounds_fired, notes)
        VALUES (@firearm_id, @date, @location, @rounds_fired, @notes)
      `);
      const info = stmt.run({ location: '', rounds_fired: null, notes: '', ...data });
      return info.lastInsertRowid;
    },
    remove(id, firearmId) {
      db.prepare('DELETE FROM range_sessions WHERE id = ? AND firearm_id = ?').run(id, firearmId);
    },
    totalsForFirearm(firearmId) {
      return db
        .prepare(`
          SELECT COUNT(*) AS session_count, COALESCE(SUM(rounds_fired), 0) AS total_rounds
          FROM range_sessions
          WHERE firearm_id = ?
        `)
        .get(firearmId);
    }
  };
}

module.exports = { createRangeSessionsRepository };
