const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createAmmoRepository } = require('../../src/infra/db/repositories/ammo.repository');

const MINIMAL_AMMO = {
  manufacturer: 'Federal',
  product_line: 'American Eagle',
  caliber: '9mm Luger',
  grain: 115,
  load_type: 'FMJ',
  boxes: 4,
  rounds_per_box: 50,
  loose_rounds: 12,
  total_rounds: 212,
  location: 'Safe',
  notes: ''
};

describe('ammo repository', () => {
  let db;
  let dbPath;
  let ammoRepo;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-ammo-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    ammoRepo = createAmmoRepository(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  test('create inserts scoped to user_id and returns lastInsertRowid', () => {
    const id = ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1 });

    expect(typeof id).toBe('number');
    const row = ammoRepo.get(id, 1);
    expect(row.manufacturer).toBe('Federal');
    expect(row.user_id).toBe(1);
  });

  test('get returns the owner row and undefined for a different userId', () => {
    const id = ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1 });

    expect(ammoRepo.get(id, 1)).toBeTruthy();
    expect(ammoRepo.get(id, 2)).toBeUndefined();
  });

  test('paginate returns items and totalCount, ordered by manufacturer/product_line/id', () => {
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1, manufacturer: 'Winchester', product_line: 'White Box' });
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1, manufacturer: 'Federal', product_line: 'American Eagle' });
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 2, manufacturer: 'Other User' });

    const { items, totalCount } = ammoRepo.paginate(1, 10, 1);

    expect(totalCount).toBe(2);
    expect(items).toHaveLength(2);
    expect(items[0].manufacturer).toBe('Federal');
    expect(items[1].manufacturer).toBe('Winchester');
  });

  test('paginate respects limit and offset', () => {
    for (let i = 0; i < 5; i += 1) {
      ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1, manufacturer: `Mfr${i}` });
    }

    const page1 = ammoRepo.paginate(1, 2, 1);
    const page2 = ammoRepo.paginate(2, 2, 1);

    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page1.items[0].manufacturer).not.toBe(page2.items[0].manufacturer);
  });

  test('all scopes by userId', () => {
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1 });
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 2 });

    expect(ammoRepo.all(1)).toHaveLength(1);
    expect(ammoRepo.all(2)).toHaveLength(1);
  });

  test('update updates every field, bumps updated_at, and is scoped by user_id', () => {
    const id = ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1 });
    const before = ammoRepo.get(id, 1);

    ammoRepo.update(
      id,
      { ...MINIMAL_AMMO, manufacturer: 'Hornady', boxes: 10, total_rounds: 512 },
      1
    );

    const after = ammoRepo.get(id, 1);
    expect(after.manufacturer).toBe('Hornady');
    expect(after.boxes).toBe(10);
    expect(after.total_rounds).toBe(512);
    expect(after.updated_at).toBeTruthy();
    expect(before.updated_at).toBeTruthy();

    // Update from a different user_id should not apply.
    ammoRepo.update(id, { ...MINIMAL_AMMO, manufacturer: 'Should Not Apply' }, 2);
    expect(ammoRepo.get(id, 1).manufacturer).toBe('Hornady');
  });

  test('remove deletes only the owner row', () => {
    const id = ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1 });

    ammoRepo.remove(id, 2);
    expect(ammoRepo.get(id, 1)).toBeTruthy();

    ammoRepo.remove(id, 1);
    expect(ammoRepo.get(id, 1)).toBeUndefined();
  });

  test('getCaliberBreakdown sums per caliber, scoped, excludes blank caliber, ordered descending', () => {
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1, caliber: '9mm Luger', total_rounds: 100 });
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1, caliber: '9mm Luger', total_rounds: 50 });
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1, caliber: '.223 Remington', total_rounds: 300 });
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1, caliber: '', total_rounds: 999 });
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 2, caliber: '9mm Luger', total_rounds: 1000 });

    const breakdown = ammoRepo.getCaliberBreakdown(1);

    expect(breakdown).toEqual([
      { caliber: '.223 Remington', rounds: 300, records: 1 },
      { caliber: '9mm Luger', rounds: 150, records: 2 }
    ]);
  });

  test('getTotalRounds sums across a user rows and returns 0 when empty', () => {
    expect(ammoRepo.getTotalRounds(1)).toBe(0);

    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1, total_rounds: 200 });
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 1, total_rounds: 50 });
    ammoRepo.create({ ...MINIMAL_AMMO, user_id: 2, total_rounds: 9999 });

    expect(ammoRepo.getTotalRounds(1)).toBe(250);
  });
});
