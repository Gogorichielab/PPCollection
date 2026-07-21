const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createFirearmsRepository } = require('../../src/infra/db/repositories/firearms.repository');
const { createPhotosRepository } = require('../../src/infra/db/repositories/photos.repository');

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

function photoRow(overrides = {}) {
  return {
    firearm_id: 1,
    filename: `${'a'.repeat(32)}.jpg`,
    original_name: 'my-pistol.jpg',
    mime: 'image/jpeg',
    size: 1024,
    ...overrides
  };
}

describe('photos repository', () => {
  let db;
  let dbPath;
  let firearmsRepo;
  let photosRepo;
  let firearmId;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-photos-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    firearmsRepo = createFirearmsRepository(db);
    photosRepo = createPhotosRepository(db);
    firearmId = firearmsRepo.create({ ...MINIMAL_FIREARM });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  test('create returns the new id and listByFirearm returns rows in insertion order', () => {
    const first = photosRepo.create(photoRow({ firearm_id: firearmId, filename: `${'a'.repeat(32)}.jpg` }));
    const second = photosRepo.create(photoRow({ firearm_id: firearmId, filename: `${'b'.repeat(32)}.png`, mime: 'image/png' }));

    const rows = photosRepo.listByFirearm(firearmId);
    expect(rows.map((r) => r.id)).toEqual([first, second]);
    expect(rows[0].original_name).toBe('my-pistol.jpg');
    expect(rows[1].mime).toBe('image/png');
  });

  test('countForFirearm counts only that firearm', () => {
    const otherFirearmId = firearmsRepo.create({ ...MINIMAL_FIREARM, make: 'Sig', model: 'P320' });
    photosRepo.create(photoRow({ firearm_id: firearmId, filename: `${'a'.repeat(32)}.jpg` }));
    photosRepo.create(photoRow({ firearm_id: otherFirearmId, filename: `${'b'.repeat(32)}.jpg` }));

    expect(photosRepo.countForFirearm(firearmId)).toBe(1);
    expect(photosRepo.countForFirearm(otherFirearmId)).toBe(1);
  });

  test('get and remove are scoped to the firearm', () => {
    const otherFirearmId = firearmsRepo.create({ ...MINIMAL_FIREARM, make: 'Sig', model: 'P320' });
    const photoId = photosRepo.create(photoRow({ firearm_id: firearmId }));

    expect(photosRepo.get(photoId, firearmId)).toBeTruthy();
    expect(photosRepo.get(photoId, otherFirearmId)).toBeUndefined();

    photosRepo.remove(photoId, otherFirearmId);
    expect(photosRepo.get(photoId, firearmId)).toBeTruthy();

    photosRepo.remove(photoId, firearmId);
    expect(photosRepo.get(photoId, firearmId)).toBeUndefined();
  });

  test('rejects duplicate filenames', () => {
    photosRepo.create(photoRow({ firearm_id: firearmId }));

    expect(() => photosRepo.create(photoRow({ firearm_id: firearmId }))).toThrow(/UNIQUE/);
  });

  test('createIfUnderCap inserts below the cap and returns null at the cap', () => {
    const first = photosRepo.createIfUnderCap(photoRow({ firearm_id: firearmId, filename: `${'a'.repeat(32)}.jpg` }), 2);
    const second = photosRepo.createIfUnderCap(photoRow({ firearm_id: firearmId, filename: `${'b'.repeat(32)}.jpg` }), 2);
    const third = photosRepo.createIfUnderCap(photoRow({ firearm_id: firearmId, filename: `${'c'.repeat(32)}.jpg` }), 2);

    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeNull();
    expect(photosRepo.countForFirearm(firearmId)).toBe(2);
  });

  test('removeByFirearm deletes all rows for the firearm', () => {
    photosRepo.create(photoRow({ firearm_id: firearmId, filename: `${'a'.repeat(32)}.jpg` }));
    photosRepo.create(photoRow({ firearm_id: firearmId, filename: `${'b'.repeat(32)}.jpg` }));

    photosRepo.removeByFirearm(firearmId);

    expect(photosRepo.countForFirearm(firearmId)).toBe(0);
  });

  test('deleting a firearm cascades to its photo rows', () => {
    const photoId = photosRepo.create(photoRow({ firearm_id: firearmId }));

    firearmsRepo.remove(firearmId, 1);

    expect(photosRepo.get(photoId, firearmId)).toBeUndefined();
  });
});
