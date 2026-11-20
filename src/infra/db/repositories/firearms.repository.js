const { beginImport } = require('./collection.repository');
const { createInventorySearch, missingFields } = require('./inventory-search');

function createFirearmsRepository(db) {
  const bulkInsertStmt = db.prepare(`
    INSERT INTO firearms (
      import_batch_id, user_id,
      make,
      model,
      serial,
      caliber,
      purchase_date,
      purchase_price,
      condition,
      location,
      status,
      disposition_name,
      disposition_address,
      disposition_date,
      disposition_reason,
      notes,
      gun_warranty,
      firearm_type
    )
    VALUES (
      @import_batch_id, @user_id,
      @make,
      @model,
      @serial,
      @caliber,
      @purchase_date,
      @purchase_price,
      @condition,
      @location,
      @status,
      @disposition_name,
      @disposition_address,
      @disposition_date,
      @disposition_reason,
      @notes,
      @gun_warranty,
      @firearm_type
    )
  `);
  const insertAll = db.transaction((rows, filename) => {
    const batchId = filename && rows.length ? beginImport(db, rows[0].user_id, 'firearms', filename) : null;
    for (const row of rows) {
      bulkInsertStmt.run({
        import_batch_id: batchId, user_id: 1,
        disposition_name: '',
        disposition_address: '',
        disposition_date: '',
        disposition_reason: '',
        ...row
      });
    }
  });

  return {
    search: createInventorySearch(db, 'firearms'),

    all(userId = 1) {
      return db.prepare('SELECT * FROM firearms WHERE user_id = ? ORDER BY make, model, id').all(userId);
    },
    iterate(userId = 1) {
      return db.prepare('SELECT * FROM firearms WHERE user_id = ? ORDER BY make, model, id').iterate(userId);
    },
    paginate(page = 1, perPage = 25, userId = 1) {
      const offset = (page - 1) * perPage;
      const items = db
        .prepare('SELECT * FROM firearms WHERE user_id = ? ORDER BY make, model, id LIMIT ? OFFSET ?')
        .all(userId, perPage, offset);
      const totalCount = db
        .prepare('SELECT COUNT(*) as count FROM firearms WHERE user_id = ?')
        .get(userId).count;
      return { items, totalCount, page, perPage };
    },
    get(id, userId = 1) {
      return db.prepare('SELECT * FROM firearms WHERE id = ? AND user_id = ?').get(id, userId);
    },
    findBySerial(serial, excludeId = null, userId = 1) {
      if (!serial) return undefined;
      if (excludeId != null) {
        return db
          .prepare("SELECT id FROM firearms WHERE serial = ? AND serial != '' AND id != ? AND user_id = ?")
          .get(serial, excludeId, userId);
      }
      return db.prepare("SELECT id FROM firearms WHERE serial = ? AND serial != '' AND user_id = ?").get(serial, userId);
    },
    create(data) {
      const stmt = db.prepare(`
        INSERT INTO firearms (
          user_id,
          make,
          model,
          serial,
          caliber,
          purchase_date,
          purchase_price,
          condition,
          location,
          status,
          disposition_name,
          disposition_address,
          disposition_date,
          disposition_reason,
          notes,
          gun_warranty,
          firearm_type
        )
        VALUES (
          @user_id,
          @make,
          @model,
          @serial,
          @caliber,
          @purchase_date,
          @purchase_price,
          @condition,
          @location,
          @status,
          @disposition_name,
          @disposition_address,
          @disposition_date,
          @disposition_reason,
          @notes,
          @gun_warranty,
          @firearm_type
        )
      `);
      const info = stmt.run({
        user_id: 1,
        disposition_name: '',
        disposition_address: '',
        disposition_date: '',
        disposition_reason: '',
        ...data
      });
      return info.lastInsertRowid;
    },
    bulkCreate(items, filename) {
      insertAll(items, filename);
    },
    update(id, data, userId = 1) {
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
          disposition_name = @disposition_name,
          disposition_address = @disposition_address,
          disposition_date = @disposition_date,
          disposition_reason = @disposition_reason,
          notes = @notes,
          gun_warranty = @gun_warranty,
          firearm_type = @firearm_type,
          updated_at = datetime('now')
        WHERE id = @id AND user_id = @user_id
      `);
      stmt.run({
        disposition_name: '',
        disposition_address: '',
        disposition_date: '',
        disposition_reason: '',
        ...data,
        id,
        user_id: userId
      });
    },
    remove(id, userId = 1) {
      db.prepare('DELETE FROM firearms WHERE id = ? AND user_id = ?').run(id, userId);
    },
    getCollectionSummary(userId = 1) {
      return db.prepare(`
        SELECT
          COUNT(*) AS total_firearms,
          COUNT(CASE WHEN ${missingFields.serial} THEN 1 END) AS missing_serial,
          COUNT(CASE WHEN ${missingFields.value} THEN 1 END) AS missing_value,
          COUNT(CASE WHEN ${missingFields.photo} THEN 1 END) AS missing_photo,
          SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN 1 ELSE 0 END) AS this_month,
          COUNT(DISTINCT firearm_type) AS categories,
          CAST((julianday('now') - julianday(MAX(updated_at))) AS INTEGER) AS last_update_days
        FROM firearms WHERE user_id = ?
      `).get(userId);
    },
    getRecentActivity(limit = 5, userId = 1) {
      return db.prepare(`
        SELECT id, make, model, created_at, updated_at
        FROM firearms WHERE user_id = ?
        ORDER BY datetime(updated_at) DESC
        LIMIT ?
      `).all(userId, limit);
    },
    getTypeBreakdown(userId = 1) {
      return db.prepare(`
        SELECT firearm_type, COUNT(*) AS count
        FROM firearms
        WHERE user_id = ? AND firearm_type IS NOT NULL
          AND TRIM(firearm_type) != ''
        GROUP BY firearm_type
        ORDER BY count DESC, firearm_type ASC
      `).all(userId);
    },
    getValueByYear(userId = 1) {
      return db.prepare(`
        SELECT
          year,
          ROUND(SUM(total_value) OVER (ORDER BY year), 2) AS total_value
        FROM (
          SELECT
            strftime('%Y', purchase_date) AS year,
            SUM(purchase_price) AS total_value
          FROM firearms
          WHERE user_id = ? AND purchase_date IS NOT NULL
            AND TRIM(purchase_date) != ''
            AND purchase_price IS NOT NULL
          GROUP BY year
        )
        ORDER BY year ASC
      `).all(userId);
    }
  };
}

module.exports = { createFirearmsRepository };
