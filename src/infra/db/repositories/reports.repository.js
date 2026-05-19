function createReportsRepository(db) {
  return {
    getCollectionSummary() {
      return db.prepare(`
        SELECT
          COUNT(*) AS total_firearms,
          ROUND(SUM(CASE WHEN purchase_price IS NOT NULL THEN purchase_price ELSE 0 END), 2) AS total_value,
          ROUND(SUM(CASE WHEN status = 'Active' AND purchase_price IS NOT NULL THEN purchase_price ELSE 0 END), 2) AS active_value,
          ROUND(SUM(CASE WHEN status = 'Sold' AND purchase_price IS NOT NULL THEN purchase_price ELSE 0 END), 2) AS sold_value,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) AS active_count,
          COUNT(CASE WHEN status = 'Sold' THEN 1 END) AS sold_count,
          COUNT(CASE WHEN status = 'Lost' THEN 1 END) AS lost_count,
          COUNT(CASE WHEN status = 'In Repair' THEN 1 END) AS repair_count,
          COUNT(CASE WHEN status = 'In Transit' THEN 1 END) AS transit_count
        FROM firearms
      `).get();
    },

    getBreakdownByType() {
      return db.prepare(`
        SELECT
          COALESCE(NULLIF(TRIM(firearm_type), ''), 'Unknown') AS label,
          COUNT(*) AS count
        FROM firearms
        GROUP BY label
        ORDER BY count DESC, label ASC
      `).all();
    },

    getBreakdownByCaliber() {
      return db.prepare(`
        SELECT
          COALESCE(NULLIF(TRIM(caliber), ''), 'Unknown') AS label,
          COUNT(*) AS count
        FROM firearms
        GROUP BY label
        ORDER BY count DESC, label ASC
        LIMIT 15
      `).all();
    },

    getBreakdownByMake() {
      return db.prepare(`
        SELECT
          COALESCE(NULLIF(TRIM(make), ''), 'Unknown') AS label,
          COUNT(*) AS count
        FROM firearms
        GROUP BY label
        ORDER BY count DESC, label ASC
        LIMIT 15
      `).all();
    },

    getAcquisitionByMonth() {
      return db.prepare(`
        SELECT
          strftime('%Y-%m', purchase_date) AS month,
          COUNT(*) AS count
        FROM firearms
        WHERE purchase_date IS NOT NULL
          AND TRIM(purchase_date) != ''
        GROUP BY month
        ORDER BY month ASC
      `).all();
    },

    getAvgPriceByYear() {
      return db.prepare(`
        SELECT
          strftime('%Y', purchase_date) AS year,
          ROUND(AVG(purchase_price), 2) AS avg_price,
          COUNT(*) AS count
        FROM firearms
        WHERE purchase_date IS NOT NULL
          AND TRIM(purchase_date) != ''
          AND purchase_price IS NOT NULL
        GROUP BY year
        ORDER BY year ASC
      `).all();
    },

    getDispositionStats() {
      return db.prepare(`
        SELECT
          COUNT(*) AS disposed_count,
          ROUND(SUM(CASE WHEN purchase_price IS NOT NULL THEN purchase_price ELSE 0 END), 2) AS total_proceeds,
          ROUND(AVG(
            CASE
              WHEN disposition_date IS NOT NULL
                AND TRIM(disposition_date) != ''
                AND purchase_date IS NOT NULL
                AND TRIM(purchase_date) != ''
              THEN julianday(disposition_date) - julianday(purchase_date)
            END
          ), 1) AS avg_hold_days
        FROM firearms
        WHERE status IN ('Sold', 'Transferred')
      `).get();
    },

    getConditionBreakdown() {
      return db.prepare(`
        SELECT
          COALESCE(NULLIF(TRIM(condition), ''), 'Unknown') AS label,
          COUNT(*) AS count
        FROM firearms
        GROUP BY label
        ORDER BY count DESC, label ASC
      `).all();
    }
  };
}

module.exports = { createReportsRepository };
