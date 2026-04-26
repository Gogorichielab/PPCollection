const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createFirearmsRepository } = require('../../src/infra/db/repositories/firearms.repository');
const { createFirearmsService } = require('../../src/features/firearms/firearms.service');

describe('firearmsService.importFromCsv', () => {
  let db;
  let dbPath;
  let service;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-import-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    const repo = createFirearmsRepository(db);
    service = createFirearmsService(repo);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  test('imports valid rows and returns correct counts', () => {
    const csv = [
      'Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes',
      'Glock,19,ABC123,9mm,2023-01-15,500,New,Safe,Active,,,,,Pistol,Yes,First handgun',
      'Remington,870,XYZ789,12ga,2022-06-10,850,Used,Cabinet,Active,,,,,Shotgun,No,'
    ].join('\n');

    const result = service.importFromCsv(csv);

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);

    const all = db.prepare('SELECT * FROM firearms ORDER BY id').all();
    expect(all).toHaveLength(2);
    expect(all[0].make).toBe('Glock');
    expect(all[0].model).toBe('19');
    expect(all[0].purchase_price).toBe(500);
    expect(all[0].gun_warranty).toBe(1);
    expect(all[1].make).toBe('Remington');
    expect(all[1].gun_warranty).toBe(0);
  });

  test('skips rows missing required Make field and reports error', () => {
    const csv = [
      'Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes',
      ',19,,,,,,,,,,,,,,'
    ].join('\n');

    const result = service.importFromCsv(csv);

    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].errors).toMatch(/Make is required/);
  });

  test('imports valid rows and skips invalid ones', () => {
    const csv = [
      'Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes',
      'Glock,19,,,,,,,,,,,,,',
      ',BadRow,,,,,,,,,,,,,,',
      'Sig,P320,,,,,,,,,,,,,,,'
    ].join('\n');

    const result = service.importFromCsv(csv);

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors[0].row).toBe(3);
  });

  test('returns zero counts for CSV with only a header row', () => {
    const csv = 'Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes\n';
    const result = service.importFromCsv(csv);
    expect(result.imported).toBe(0);
    expect(result.failed).toBe(0);
  });

  test('returns zero counts for empty input', () => {
    const result = service.importFromCsv('');
    expect(result.imported).toBe(0);
    expect(result.failed).toBe(0);
  });

  test('handles quoted fields with commas in notes', () => {
    const csv = [
      'Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes',
      'Glock,19,,,,,,,,,,,,,,"Bought at, local shop"'
    ].join('\n');

    const result = service.importFromCsv(csv);
    expect(result.imported).toBe(1);

    const item = db.prepare('SELECT notes FROM firearms').get();
    expect(item.notes).toBe('Bought at, local shop');
  });

  test('clears disposition fields when status is not a disposition status', () => {
    const csv = [
      'Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes',
      'Glock,19,,,,,,,,John Doe,123 Main St,2024-01-01,Sold it,,,'
    ].join('\n');

    const result = service.importFromCsv(csv);
    expect(result.imported).toBe(1);

    const item = db.prepare('SELECT * FROM firearms').get();
    expect(item.disposition_name).toBe('');
    expect(item.disposition_address).toBe('');
  });

  test('valid rows are inserted atomically — a DB error rolls back all inserts', () => {
    const repo = createFirearmsRepository(db);
    jest.spyOn(repo, 'bulkCreate').mockImplementationOnce(() => {
      throw new Error('simulated DB error');
    });
    const svc = createFirearmsService(repo);

    const csv = [
      'Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes',
      'Glock,19,,,,,,,,,,,,,,',
      'Sig,P320,,,,,,,,,,,,,,'
    ].join('\n');

    expect(() => svc.importFromCsv(csv)).toThrow('simulated DB error');
    const all = db.prepare('SELECT * FROM firearms').all();
    expect(all).toHaveLength(0);
  });

  test('preserves disposition fields when status is a disposition status', () => {
    const csv = [
      'Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes',
      'Glock,19,,,,,,,Sold,John Doe,123 Main St,2024-01-01,Sold to friend,Pistol,,'
    ].join('\n');

    const result = service.importFromCsv(csv);
    expect(result.imported).toBe(1);

    const item = db.prepare('SELECT * FROM firearms').get();
    expect(item.disposition_name).toBe('John Doe');
    expect(item.status).toBe('Sold');
  });
});
