const catalogs = {
  firearms: {
    table: 'firearms', defaultSort: 'make, model, id',
    fields: ['make', 'model', 'caliber', 'serial', 'purchase_date', 'status', 'condition', 'firearm_type'],
    facets: ['status', 'condition', 'firearm_type'],
    numeric: []
  },
  ammo: {
    table: 'ammo_inventory', defaultSort: 'manufacturer, product_line, id',
    fields: ['manufacturer', 'product_line', 'caliber', 'load_type', 'location', 'grain', 'boxes', 'total_rounds'],
    facets: ['manufacturer', 'caliber', 'load_type', 'location'],
    numeric: ['grain', 'boxes', 'total_rounds']
  }
};

function createInventorySearch(db, kind) {
  const { table, defaultSort, fields, facets, numeric } = catalogs[kind];
  const perPage = 25;
  return db.transaction((userId, query = {}) => {
    const params = new URLSearchParams();
    const base = ['user_id = ?'];
    const baseArgs = [userId];
    const caliberFilter = kind === 'ammo' && typeof query.caliber === 'string' ? query.caliber.trim() : '';
    const unspecified = kind === 'ammo' && !caliberFilter && query.unspecified === '1';
    if (caliberFilter || unspecified) {
      base.push("TRIM(COALESCE(caliber, '')) = ? COLLATE NOCASE");
      baseArgs.push(caliberFilter);
      params.set(unspecified ? 'unspecified' : 'caliber', unspecified ? '1' : caliberFilter);
    }

    const conditions = [...base];
    const args = [...baseArgs];
    const field = fields.includes(query.field) ? query.field : 'all';
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    if (field !== 'all') params.set('field', field);
    if (q) {
      const columns = field === 'all' ? fields : [field];
      conditions.push(`(${columns.map(c => `instr(lower(${c}), lower(?)) > 0`).join(' OR ')})`);
      args.push(...columns.map(() => q));
      params.set('q', q);
    }

    const facetOptions = {};
    const selected = {};
    for (const facet of facets) {
      const key = `filter_${facet}`;
      const legacy = facet !== 'caliber' && typeof query[facet] === 'string' ? query[facet].split(',') : [];
      const raw = query[key] ?? legacy;
      const values = (Array.isArray(raw) ? raw : [raw]).filter(v => typeof v === 'string' && v.trim());
      selected[facet] = [...new Set(values.map(value => value.trim().toLowerCase()))];
      const options = db.prepare(`SELECT MAX(TRIM(${facet})) AS value FROM ${table}
        WHERE ${base.join(' AND ')} AND TRIM(${facet}) != ''
        GROUP BY LOWER(TRIM(${facet})) ORDER BY value COLLATE NOCASE`).all(...baseArgs);
      facetOptions[facet] = options.map(row => row.value);
      if (selected[facet].length) {
        conditions.push(`LOWER(TRIM(${facet})) IN (${selected[facet].map(() => '?').join(',')})`);
        args.push(...selected[facet]);
        for (const value of selected[facet]) params.append(key, value);
      }
    }

    const [sort, direction] = typeof query.sort === 'string' ? query.sort.split(':') : [];
    let order = defaultSort;
    if (fields.includes(sort) && ['asc', 'desc'].includes(direction)) {
      order = `${sort}${numeric.includes(sort) ? '' : ' COLLATE NOCASE'} ${direction}, id`;
      params.set('sort', `${sort}:${direction}`);
    }
    const where = conditions.join(' AND ');
    const totalCount = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).get(...args).n;
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
    const currentPage = Math.max(1, Math.min(totalPages, parseInt(query.page, 10) || 1));
    const items = db.prepare(`SELECT * FROM ${table} WHERE ${where}
      ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args, perPage, (currentPage - 1) * perPage);
    const result = {
      items, fields, facetOptions, selected, q, field, caliberFilter, unspecified,
      sort: params.get('sort') || '',
      hasFilters: Boolean(q || caliberFilter || unspecified || facets.some(f => selected[f].length)),
      pagination: { totalCount, totalPages, currentPage, perPage, hasNext: currentPage < totalPages, hasPrevious: currentPage > 1 },
      queryString: params.toString()
    };
    if (kind === 'ammo') {
      result.caliberBreakdown = db.prepare(`SELECT MAX(TRIM(caliber)) AS caliber, SUM(total_rounds) AS rounds, COUNT(*) AS records
        FROM ammo_inventory WHERE ${where} GROUP BY LOWER(TRIM(caliber))
        ORDER BY rounds DESC, caliber COLLATE NOCASE`).all(...args);
      result.totalRounds = result.caliberBreakdown.reduce((sum, row) => sum + row.rounds, 0);
    }
    return result;
  });
}

module.exports = { createInventorySearch };
