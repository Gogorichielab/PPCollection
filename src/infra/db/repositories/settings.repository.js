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

    exists(key) {
      const row = db.prepare('SELECT 1 FROM settings WHERE key = ? LIMIT 1').get(key);
      return !!row;
    }
  };
}

module.exports = { createSettingsRepository };
