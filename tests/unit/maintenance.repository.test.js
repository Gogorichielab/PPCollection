const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createFirearmsRepository } = require('../../src/infra/db/repositories/firearms.repository');
const { createMaintenanceRepository } = require('../../src/infra/db/repositories/maintenance.repository');

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

describe('maintenance repository', () => {
  let db;
  let dbPath;
  let firearmsRepo;
  let maintenanceRepo;
  let firearmId;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-maint-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    firearmsRepo = createFirearmsRepository(db);
    maintenanceRepo = createMaintenanceRepository(db);
    firearmId = firearmsRepo.create({ ...MINIMAL_FIREARM });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  function insertRangeSession(targetFirearmId, date, roundsFired = 50) {
    db.prepare('INSERT INTO range_sessions (firearm_id, date, rounds_fired) VALUES (?, ?, ?)').run(
      targetFirearmId,
      date,
      roundsFired
    );
  }

  test('create returns the new id and listByFirearm orders by date descending', () => {
    const older = maintenanceRepo.create({ firearm_id: firearmId, date: '2025-01-01', type: 'Cleaning' });
    const newer = maintenanceRepo.create({ firearm_id: firearmId, date: '2025-06-01', type: 'Repair', notes: 'Barrel' });

    expect(older).toBeGreaterThan(0);
    expect(newer).toBeGreaterThan(older);

    const rows = maintenanceRepo.listByFirearm(firearmId);
    expect(rows.map((r) => r.date)).toEqual(['2025-06-01', '2025-01-01']);
    expect(rows[0].notes).toBe('Barrel');
    expect(rows[1].round_count_delta).toBeNull();
  });

  test('same-date entries order newest-inserted first', () => {
    const first = maintenanceRepo.create({ firearm_id: firearmId, date: '2025-03-01', type: 'Cleaning' });
    const second = maintenanceRepo.create({ firearm_id: firearmId, date: '2025-03-01', type: 'Inspection' });

    const rows = maintenanceRepo.listByFirearm(firearmId);
    expect(rows.map((r) => r.id)).toEqual([second, first]);
  });

  test('get and remove are scoped to the firearm', () => {
    const otherFirearmId = firearmsRepo.create({ ...MINIMAL_FIREARM, make: 'Sig', model: 'P320' });
    const logId = maintenanceRepo.create({ firearm_id: firearmId, date: '2025-02-02', type: 'Cleaning' });

    expect(maintenanceRepo.get(logId, firearmId)).toBeTruthy();
    expect(maintenanceRepo.get(logId, otherFirearmId)).toBeUndefined();

    maintenanceRepo.remove(logId, otherFirearmId);
    expect(maintenanceRepo.get(logId, firearmId)).toBeTruthy();

    maintenanceRepo.remove(logId, firearmId);
    expect(maintenanceRepo.get(logId, firearmId)).toBeUndefined();
  });

  test('getCleaningStatus reports null dates when nothing is logged', () => {
    const rows = maintenanceRepo.getCleaningStatus(1);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: firearmId,
      make: 'Glock',
      model: '19',
      status: 'Active',
      last_cleaned: null,
      last_range: null
    });
  });

  test('getCleaningStatus picks the latest Cleaning log and ignores other types', () => {
    maintenanceRepo.create({ firearm_id: firearmId, date: '2025-01-05', type: 'Cleaning' });
    maintenanceRepo.create({ firearm_id: firearmId, date: '2025-02-10', type: 'Cleaning' });
    maintenanceRepo.create({ firearm_id: firearmId, date: '2025-05-01', type: 'Repair' });

    const rows = maintenanceRepo.getCleaningStatus(1);
    expect(rows[0].last_cleaned).toBe('2025-02-10');
  });

  test('getCleaningStatus surfaces the latest range session date', () => {
    insertRangeSession(firearmId, '2025-03-15');
    insertRangeSession(firearmId, '2025-04-20');

    const rows = maintenanceRepo.getCleaningStatus(1);
    expect(rows[0].last_range).toBe('2025-04-20');
  });

  test('getCleaningStatus ignores zero-round sessions but counts unknown-round sessions', () => {
    insertRangeSession(firearmId, '2025-03-15', 50);
    insertRangeSession(firearmId, '2025-04-20', 0);

    expect(maintenanceRepo.getCleaningStatus(1)[0].last_range).toBe('2025-03-15');
    expect(maintenanceRepo.getFirearmCleaningDates(firearmId).last_range).toBe('2025-03-15');

    insertRangeSession(firearmId, '2025-05-01', null);
    expect(maintenanceRepo.getCleaningStatus(1)[0].last_range).toBe('2025-05-01');
  });

  test('getCleaningStatus only includes firearms for the given user', () => {
    firearmsRepo.create({ ...MINIMAL_FIREARM, make: 'CZ', model: '75', user_id: 2 });

    const userOneRows = maintenanceRepo.getCleaningStatus(1);
    const userTwoRows = maintenanceRepo.getCleaningStatus(2);

    expect(userOneRows.map((r) => r.make)).toEqual(['Glock']);
    expect(userTwoRows.map((r) => r.make)).toEqual(['CZ']);
  });

  test('getFirearmCleaningDates returns both dates for one firearm', () => {
    maintenanceRepo.create({ firearm_id: firearmId, date: '2025-01-01', type: 'Cleaning' });
    insertRangeSession(firearmId, '2025-02-01');

    expect(maintenanceRepo.getFirearmCleaningDates(firearmId)).toEqual({
      last_cleaned: '2025-01-01',
      last_range: '2025-02-01'
    });
  });

  test('deleting a firearm cascades to its maintenance logs', () => {
    const logId = maintenanceRepo.create({ firearm_id: firearmId, date: '2025-01-01', type: 'Cleaning' });

    firearmsRepo.remove(firearmId, 1);

    expect(maintenanceRepo.get(logId, firearmId)).toBeUndefined();
  });
});
