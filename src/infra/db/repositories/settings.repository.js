function createSettingsRepository(db) {
  return {
    get(key) {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return row ? row.value : null;
    },

    set(key, value) {
      db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
      ).run(key, value, value);
    },

    // Writes only when the key is absent, reporting whether this call was the
    // one that created it. Used to claim single-owner keys without a
    // check-then-write race.
    insertIfAbsent(key, value) {
      const result = db
        .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING')
        .run(key, value);
      return result.changes === 1;
    },

    exists(key) {
      const row = db.prepare('SELECT 1 FROM settings WHERE key = ? LIMIT 1').get(key);
      return !!row;
    },

    // better-sqlite3 transactions are synchronous, so `fn` must not be async.
    // Do any awaiting (bcrypt, I/O) before calling this.
    transaction(fn) {
      return db.transaction(fn)();
    }
  };
}

module.exports = { createSettingsRepository };
