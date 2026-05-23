const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createFirearmsRepository } = require('../../src/infra/db/repositories/firearms.repository');
const { createReportsRepository } = require('../../src/infra/db/repositories/reports.repository');

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

describe('reports repository', () => {
  let db;
  let dbPath;
  let firearmsRepo;
  let reportsRepo;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-reports-repo-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    firearmsRepo = createFirearmsRepository(db);
    reportsRepo = createReportsRepository(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  describe('getCollectionSummary', () => {
    test('returns zeros when no firearms exist', () => {
      const result = reportsRepo.getCollectionSummary(1);
      expect(result.total_firearms).toBe(0);
      expect(result.total_value).toBeNull();
      expect(result.active_count).toBe(0);
    });

    test('counts only the authenticated user\'s firearms', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Active', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Active', user_id: 2 });

      const result = reportsRepo.getCollectionSummary(1);
      expect(result.total_firearms).toBe(1);
      expect(result.active_count).toBe(1);
    });

    test('counts status categories correctly', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Active', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Sold', purchase_price: 600, user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Lost/Stolen', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Under Repair', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'In Transit', user_id: 1 });

      const result = reportsRepo.getCollectionSummary(1);
      expect(result.total_firearms).toBe(5);
      expect(result.active_count).toBe(1);
      expect(result.sold_count).toBe(1);
      expect(result.lost_count).toBe(1);
      expect(result.repair_count).toBe(1);
      expect(result.transit_count).toBe(1);
    });

    test('calculates total value and sold value', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Active', purchase_price: 500, user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Sold', purchase_price: 700, user_id: 1 });

      const result = reportsRepo.getCollectionSummary(1);
      expect(result.total_value).toBe(1200);
      expect(result.active_value).toBe(500);
      expect(result.sold_value).toBe(700);
    });
  });

  describe('getBreakdownByType', () => {
    test('returns empty array when no firearms exist for the user', () => {
      const result = reportsRepo.getBreakdownByType(1);
      expect(result).toEqual([]);
    });

    test('groups by firearm type only for the given user', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, firearm_type: 'Pistol', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, firearm_type: 'Pistol', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, firearm_type: 'Rifle', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, firearm_type: 'Shotgun', user_id: 2 });

      const result = reportsRepo.getBreakdownByType(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ label: 'Pistol', count: 2 });
      expect(result[1]).toEqual({ label: 'Rifle', count: 1 });
    });
  });

  describe('getBreakdownByCaliber', () => {
    test('groups by caliber only for the given user', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, caliber: '9mm', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, caliber: '9mm', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, caliber: '.45 ACP', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, caliber: '.308', user_id: 2 });

      const result = reportsRepo.getBreakdownByCaliber(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ label: '9mm', count: 2 });
      expect(result[1]).toEqual({ label: '.45 ACP', count: 1 });
    });
  });

  describe('getBreakdownByMake', () => {
    test('groups by make only for the given user', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, make: 'Glock', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, make: 'Glock', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, make: 'Sig Sauer', user_id: 2 });

      const result = reportsRepo.getBreakdownByMake(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ label: 'Glock', count: 2 });
    });
  });

  describe('getAcquisitionByMonth', () => {
    test('groups purchases by month only for the given user', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, purchase_date: '2024-01-15', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, purchase_date: '2024-01-20', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, purchase_date: '2024-03-05', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, purchase_date: '2024-02-10', user_id: 2 });

      const result = reportsRepo.getAcquisitionByMonth(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ month: '2024-01', count: 2 });
      expect(result[1]).toEqual({ month: '2024-03', count: 1 });
    });

    test('excludes firearms with null purchase date', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, purchase_date: null, user_id: 1 });
      const result = reportsRepo.getAcquisitionByMonth(1);
      expect(result).toEqual([]);
    });
  });

  describe('getAvgPriceByYear', () => {
    test('calculates average price by year for the given user', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, purchase_date: '2024-01-01', purchase_price: 500, user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, purchase_date: '2024-06-01', purchase_price: 700, user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, purchase_date: '2023-03-01', purchase_price: 1000, user_id: 2 });

      const result = reportsRepo.getAvgPriceByYear(1);
      expect(result).toHaveLength(1);
      expect(result[0].year).toBe('2024');
      expect(result[0].avg_price).toBe(600);
      expect(result[0].count).toBe(2);
    });
  });

  describe('getDispositionStats', () => {
    test('returns zeros when no disposed firearms for the user', () => {
      const result = reportsRepo.getDispositionStats(1);
      expect(result.disposed_count).toBe(0);
      expect(result.total_proceeds).toBeNull();
    });

    test('sums disposed firearms only for the given user', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Sold', purchase_price: 600, user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Transferred', purchase_price: 400, user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, status: 'Sold', purchase_price: 800, user_id: 2 });

      const result = reportsRepo.getDispositionStats(1);
      expect(result.disposed_count).toBe(2);
      expect(result.total_proceeds).toBe(1000);
    });
  });

  describe('getConditionBreakdown', () => {
    test('groups by condition only for the given user', () => {
      firearmsRepo.create({ ...MINIMAL_FIREARM, condition: 'New', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, condition: 'New', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, condition: 'Used', user_id: 1 });
      firearmsRepo.create({ ...MINIMAL_FIREARM, condition: 'Excellent', user_id: 2 });

      const result = reportsRepo.getConditionBreakdown(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ label: 'New', count: 2 });
      expect(result[1]).toEqual({ label: 'Used', count: 1 });
    });
  });
});
