const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createFirearmsRepository } = require('../../src/infra/db/repositories/firearms.repository');
const { createRangeSessionsRepository } = require('../../src/infra/db/repositories/range-sessions.repository');

const MINIMAL_FIREARM = {
  make: 'Glock',
  model: '19',
  serial: '',
  caliber: '9mm',
  purchase_date: '2024-01-01',
  purchase_price: 500,
  condition: 'New',
  location: 'Safe',
  status: 'Active',
  notes: '',
  gun_warranty: 0,
  firearm_type: 'Pistol'
};

describe('range sessions repository', () => {
  let db;
  let dbPath;
  let firearmsRepo;
  let rangeSessionsRepo;
  let firearmId;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-range-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    firearmsRepo = createFirearmsRepository(db);
    rangeSessionsRepo = createRangeSessionsRepository(db);
    firearmId = firearmsRepo.create({ ...MINIMAL_FIREARM });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  test('create returns the new id and listByFirearm orders by date descending', () => {
    rangeSessionsRepo.create({ firearm_id: firearmId, date: '2025-01-01', location: 'Indoor Range', rounds_fired: 100 });
    rangeSessionsRepo.create({ firearm_id: firearmId, date: '2025-05-01', rounds_fired: 50, notes: 'Windy' });

    const rows = rangeSessionsRepo.listByFirearm(firearmId);
    expect(rows.map((r) => r.date)).toEqual(['2025-05-01', '2025-01-01']);
    expect(rows[0].notes).toBe('Windy');
    expect(rows[0].location).toBe('');
    expect(rows[1].location).toBe('Indoor Range');
  });

  test('get and remove are scoped to the firearm', () => {
    const otherFirearmId = firearmsRepo.create({ ...MINIMAL_FIREARM, make: 'Sig', model: 'P320' });
    const sessionId = rangeSessionsRepo.create({ firearm_id: firearmId, date: '2025-02-02' });

    expect(rangeSessionsRepo.get(sessionId, firearmId)).toBeTruthy();
    expect(rangeSessionsRepo.get(sessionId, otherFirearmId)).toBeUndefined();

    rangeSessionsRepo.remove(sessionId, otherFirearmId);
    expect(rangeSessionsRepo.get(sessionId, firearmId)).toBeTruthy();

    rangeSessionsRepo.remove(sessionId, firearmId);
    expect(rangeSessionsRepo.get(sessionId, firearmId)).toBeUndefined();
  });

  test('totalsForFirearm sums rounds and treats missing counts as zero', () => {
    rangeSessionsRepo.create({ firearm_id: firearmId, date: '2025-01-01', rounds_fired: 100 });
    rangeSessionsRepo.create({ firearm_id: firearmId, date: '2025-02-01', rounds_fired: null });
    rangeSessionsRepo.create({ firearm_id: firearmId, date: '2025-03-01', rounds_fired: 50 });

    expect(rangeSessionsRepo.totalsForFirearm(firearmId)).toEqual({
      session_count: 3,
      total_rounds: 150
    });
  });

  test('totalsForFirearm returns zeros when nothing is logged', () => {
    expect(rangeSessionsRepo.totalsForFirearm(firearmId)).toEqual({
      session_count: 0,
      total_rounds: 0
    });
  });

  test('deleting a firearm cascades to its range sessions', () => {
    const sessionId = rangeSessionsRepo.create({ firearm_id: firearmId, date: '2025-01-01' });

    firearmsRepo.remove(firearmId, 1);

    expect(rangeSessionsRepo.get(sessionId, firearmId)).toBeUndefined();
  });
});
