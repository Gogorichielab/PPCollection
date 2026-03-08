const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createFirearmsRepository } = require('../../src/infra/db/repositories/firearms.repository');

describe('firearms repository chart queries', () => {
  let db;
  let dbPath;
  let firearmsRepo;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-firearms-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    firearmsRepo = createFirearmsRepository(db);
  });

  afterEach(() => {
    db.close();
    const dir = path.dirname(dbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('getTypeBreakdown returns firearm counts by type', () => {
    firearmsRepo.create({
      make: 'Glock',
      model: '19',
      serial: '',
      caliber: '9mm',
      purchase_date: '2024-01-01',
      purchase_price: 500,
      condition: 'New',
      location: 'Safe',
      status: 'Owned',
      notes: '',
      gun_warranty: 0,
      firearm_type: 'Pistol'
    });

    firearmsRepo.create({
      make: 'Smith & Wesson',
      model: '686',
      serial: '',
      caliber: '.357',
      purchase_date: '2024-02-01',
      purchase_price: 900,
      condition: 'Used',
      location: 'Safe',
      status: 'Owned',
      notes: '',
      gun_warranty: 0,
      firearm_type: 'Revolver'
    });

    firearmsRepo.create({
      make: 'CZ',
      model: 'P-10',
      serial: '',
      caliber: '9mm',
      purchase_date: '2024-03-01',
      purchase_price: 600,
      condition: 'New',
      location: 'Safe',
      status: 'Owned',
      notes: '',
      gun_warranty: 0,
      firearm_type: 'Pistol'
    });

    const result = firearmsRepo.getTypeBreakdown();

    expect(result).toEqual([
      { firearm_type: 'Pistol', count: 2 },
      { firearm_type: 'Revolver', count: 1 }
    ]);
  });

  test('getValueByYear groups only records with purchase date and price', () => {
    firearmsRepo.create({
      make: 'Glock',
      model: '19',
      serial: '',
      caliber: '9mm',
      purchase_date: '2023-01-10',
      purchase_price: 500,
      condition: 'New',
      location: 'Safe',
      status: 'Owned',
      notes: '',
      gun_warranty: 0,
      firearm_type: 'Pistol'
    });

    firearmsRepo.create({
      make: 'Remington',
      model: '870',
      serial: '',
      caliber: '12ga',
      purchase_date: '2023-05-22',
      purchase_price: 850,
      condition: 'Used',
      location: 'Safe',
      status: 'Owned',
      notes: '',
      gun_warranty: 0,
      firearm_type: 'Shotgun'
    });

    firearmsRepo.create({
      make: 'Ruger',
      model: 'AR-556',
      serial: '',
      caliber: '.223',
      purchase_date: '2024-03-11',
      purchase_price: 1100,
      condition: 'New',
      location: 'Safe',
      status: 'Owned',
      notes: '',
      gun_warranty: 0,
      firearm_type: 'Rifle'
    });

    firearmsRepo.create({
      make: 'No Date',
      model: 'X',
      serial: '',
      caliber: '',
      purchase_date: null,
      purchase_price: 999,
      condition: '',
      location: '',
      status: '',
      notes: '',
      gun_warranty: 0,
      firearm_type: 'Other'
    });

    firearmsRepo.create({
      make: 'No Price',
      model: 'Y',
      serial: '',
      caliber: '',
      purchase_date: '2024-08-09',
      purchase_price: null,
      condition: '',
      location: '',
      status: '',
      notes: '',
      gun_warranty: 0,
      firearm_type: 'Other'
    });

    const result = firearmsRepo.getValueByYear();

    expect(result).toEqual([
      { year: '2023', total_value: 1350 },
      { year: '2024', total_value: 1100 }
    ]);
  });
});
