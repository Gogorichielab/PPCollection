function createFirearmsRepository(db) {
  return {
    all() {
      return db.prepare('SELECT * FROM firearms ORDER BY make, model, id').all();
    },
    paginate(page = 1, perPage = 25) {
      const offset = (page - 1) * perPage;
      const items = db.prepare('SELECT * FROM firearms ORDER BY make, model, id LIMIT ? OFFSET ?')
        .all(perPage, offset);
      const totalCount = db.prepare('SELECT COUNT(*) as count FROM firearms').get().count;
      return { items, totalCount, page, perPage };
    },
    get(id) {
      return db.prepare('SELECT * FROM firearms WHERE id = ?').get(id);
    },
    create(data) {
      const stmt = db.prepare(`
        INSERT INTO firearms (
          make,
          model,
          serial,
          caliber,
          purchase_date,
          purchase_price,
          condition,
          location,
          status,
          notes,
          gun_warranty,
          firearm_type
        )
        VALUES (
          @make,
          @model,
          @serial,
          @caliber,
          @purchase_date,
          @purchase_price,
          @condition,
          @location,
          @status,
          @notes,
          @gun_warranty,
          @firearm_type
        )
      `);
      const info = stmt.run(data);
      return info.lastInsertRowid;
    },
    update(id, data) {
      const stmt = db.prepare(`
        UPDATE firearms
        SET
          make = @make,
          model = @model,
          serial = @serial,
          caliber = @caliber,
          purchase_date = @purchase_date,
          purchase_price = @purchase_price,
          condition = @condition,
          location = @location,
          status = @status,
          notes = @notes,
          gun_warranty = @gun_warranty,
          firearm_type = @firearm_type,
          updated_at = datetime('now')
        WHERE id = @id
      `);
      stmt.run({ ...data, id });
    },
    remove(id) {
      db.prepare('DELETE FROM firearms WHERE id = ?').run(id);
    },
    getCollectionSummary() {
      return db.prepare(`
        SELECT
          COUNT(*) AS total_firearms,
          SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN 1 ELSE 0 END) AS this_month,
          COUNT(DISTINCT firearm_type) AS categories,
          CAST((julianday('now') - julianday(MAX(updated_at))) AS INTEGER) AS last_update_days
        FROM firearms
      `).get();
    },
    getRecentActivity(limit = 5) {
      return db.prepare(`
        SELECT id, make, model, created_at, updated_at
        FROM firearms
        ORDER BY datetime(updated_at) DESC
        LIMIT ?
      `).all(limit);
    }
  };
}

module.exports = { createFirearmsRepository };
