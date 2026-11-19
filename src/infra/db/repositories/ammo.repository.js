// SQL only. `total_rounds` is treated as authoritative here — the range-session
// deduction feature (a later PR) writes to it directly with an atomic
// decrement, so nothing in this repository should try to derive it at read
// time.
function createAmmoRepository(db) {
  const insertStmt = db.prepare(`
    INSERT INTO ammo_inventory (
      user_id, manufacturer, product_line, caliber, grain, load_type,
      boxes, rounds_per_box, loose_rounds, total_rounds, location, notes
    ) VALUES (
      @user_id, @manufacturer, @product_line, @caliber, @grain, @load_type,
      @boxes, @rounds_per_box, @loose_rounds, @total_rounds, @location, @notes
    )
  `);
  const insertAll = db.transaction((rows) => {
    for (const row of rows) insertStmt.run(row);
  });

  return {
    // caliber is optional; matching ignores case and surrounding whitespace.
    paginate(page, perPage, userId, caliber = '') {
      const offset = (page - 1) * perPage;
      const where = caliber ? 'user_id = ? AND LOWER(TRIM(caliber)) = LOWER(TRIM(?))' : 'user_id = ?';
      const params = caliber ? [userId, caliber] : [userId];
      const items = db
        .prepare(`SELECT * FROM ammo_inventory WHERE ${where} ORDER BY manufacturer, product_line, id LIMIT ? OFFSET ?`)
        .all(...params, perPage, offset);
      const { totalCount } = db
        .prepare(`SELECT COUNT(*) AS totalCount FROM ammo_inventory WHERE ${where}`)
        .get(...params);
      return { items, totalCount };
    },

    getCaliberSummary(caliber, userId) {
      return db
        .prepare(
          `SELECT COUNT(*) AS lots, COALESCE(SUM(total_rounds), 0) AS rounds
           FROM ammo_inventory WHERE user_id = ? AND LOWER(TRIM(caliber)) = LOWER(TRIM(?))`
        )
        .get(userId, caliber);
    },

    all(userId) {
      return db
        .prepare('SELECT * FROM ammo_inventory WHERE user_id = ? ORDER BY manufacturer, product_line, id')
        .all(userId);
    },

    iterate(userId) {
      return db
        .prepare('SELECT * FROM ammo_inventory WHERE user_id = ? ORDER BY manufacturer, product_line, id')
        .iterate(userId);
    },

    get(id, userId) {
      return db.prepare('SELECT * FROM ammo_inventory WHERE id = ? AND user_id = ?').get(id, userId);
    },

    create(data) {
      const stmt = db.prepare(`
        INSERT INTO ammo_inventory (
          user_id, manufacturer, product_line, caliber, grain, load_type,
          boxes, rounds_per_box, loose_rounds, total_rounds, location, notes
        ) VALUES (
          @user_id, @manufacturer, @product_line, @caliber, @grain, @load_type,
          @boxes, @rounds_per_box, @loose_rounds, @total_rounds, @location, @notes
        )
      `);
      const info = stmt.run({
        manufacturer: '',
        product_line: '',
        caliber: '',
        grain: null,
        load_type: '',
        boxes: 0,
        rounds_per_box: 0,
        loose_rounds: 0,
        total_rounds: 0,
        location: '',
        notes: '',
        ...data
      });
      return info.lastInsertRowid;
    },

    bulkCreate(items) {
      insertAll(items);
    },

    update(id, data, userId) {
      db.prepare(
        `
        UPDATE ammo_inventory SET
          manufacturer = @manufacturer,
          product_line = @product_line,
          caliber = @caliber,
          grain = @grain,
          load_type = @load_type,
          boxes = @boxes,
          rounds_per_box = @rounds_per_box,
          loose_rounds = @loose_rounds,
          total_rounds = @total_rounds,
          location = @location,
          notes = @notes,
          updated_at = datetime('now')
        WHERE id = @id AND user_id = @userId
      `
      ).run({ ...data, id, userId });
    },

    remove(id, userId) {
      db.prepare('DELETE FROM ammo_inventory WHERE id = ? AND user_id = ?').run(id, userId);
    },

    getCaliberBreakdown(userId) {
      return db
        .prepare(
          `
          SELECT caliber, SUM(total_rounds) AS rounds, COUNT(*) AS records
          FROM ammo_inventory
          WHERE user_id = ? AND caliber != ''
          GROUP BY caliber
          ORDER BY rounds DESC
        `
        )
        .all(userId);
    },

    getTotalRounds(userId) {
      const row = db
        .prepare('SELECT COALESCE(SUM(total_rounds), 0) AS total FROM ammo_inventory WHERE user_id = ?')
        .get(userId);
      return row.total;
    }
  };
}

module.exports = { createAmmoRepository };
