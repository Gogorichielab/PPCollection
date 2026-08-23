// SQL only. Expiry comparisons live here so a caller can never read a row that
// has already lapsed; interpretation of the payload belongs to the store.
function createSessionsRepository(db) {
  return {
    get(sid, now) {
      const row = db
        .prepare('SELECT data FROM sessions WHERE sid = ? AND expires_at > ?')
        .get(sid, now);
      return row ? row.data : null;
    },

    upsert(sid, data, expiresAt) {
      db.prepare(
        'INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?) ' +
          'ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at'
      ).run(sid, data, expiresAt);
    },

    // Extends an existing, unexpired session without rewriting its payload.
    // Reports whether a live row was actually touched.
    touch(sid, expiresAt, now) {
      const result = db
        .prepare('UPDATE sessions SET expires_at = ? WHERE sid = ? AND expires_at > ?')
        .run(expiresAt, sid, now);
      return result.changes === 1;
    },

    destroy(sid) {
      db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
    },

    clear() {
      db.prepare('DELETE FROM sessions').run();
    },

    count(now) {
      const row = db.prepare('SELECT COUNT(*) AS total FROM sessions WHERE expires_at > ?').get(now);
      return row.total;
    },

    all(now) {
      return db.prepare('SELECT sid, data FROM sessions WHERE expires_at > ?').all(now);
    },

    deleteExpired(now) {
      return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now).changes;
    }
  };
}

module.exports = { createSessionsRepository };
