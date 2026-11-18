const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createAmmoRepository } = require('../../src/infra/db/repositories/ammo.repository');
const { createAmmoService, CSV_HEADERS, MAX_IMPORT_ROWS } = require('../../src/features/ammo/ammo.service');

const HEADER = CSV_HEADERS.join(',');

// Inventory fixture from issue #568.
const FIXTURE = [
  HEADER,
  'Blazer,Brass FMJ,9mm Luger,115,FMJ,8,50,0,400,,',
  'Blazer,Aluminum FMJ,9mm Luger,115,FMJ,2,50,0,100,,',
  "Herter's,FMJ,9mm Luger,115,FMJ,4,50,0,200,,",
  'Remington,Military/Law Enforcement Training FMJ,9mm Luger,115,FMJ,4,50,0,200,,',
  'Veteran Ammo,Brass FMJ,9mm Luger,115,FMJ,2,50,0,100,,',
  'Speer,Gold Dot Duty Ammunition,9mm Luger,,JHP,1,50,0,50,,',
  'Speer,Gold Dot Personal Protection GDHP,9mm Luger,124,JHP,2,20,0,40,,',
  'Federal,Premium Copper-Plated Buckshot,12 Gauge,,Buckshot,1,5,0,5,,',
  'Federal,Power-Shok Sabot Slug,12 Gauge,,Sabot Slug,1,5,0,5,,',
  'Federal,#7.5 Shot,12 Gauge,,1 1/8 oz #7.5,0,0,24,24,,',
  'Winchester,Extra-Lite #7.5 Shot,12 Gauge,,#7.5 Shot,0,0,2,2,,'
].join('\n');

describe('ammoService.importFromCsv', () => {
  let db;
  let dbPath;
  let service;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-ammo-import-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    service = createAmmoService(createAmmoRepository(db));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  test('imports the #568 fixture with correct totals', () => {
    const result = service.importFromCsv(FIXTURE, 1);

    expect(result).toEqual({ imported: 11, failed: 0, errors: [] });
    expect(service.getTotalRounds(1)).toBe(1126);
    const byCaliber = Object.fromEntries(service.getCaliberBreakdown(1).map((c) => [c.caliber, c.rounds]));
    expect(byCaliber).toEqual({ '9mm Luger': 1090, '12 Gauge': 36 });
    const speer = service.list(1).find((i) => i.product_line === 'Gold Dot Duty Ammunition');
    expect(speer.grain).toBeNull();
  });

  test('computes Total Rounds when the column is blank or missing', () => {
    const csv = ['Manufacturer,Caliber,Boxes,Rounds Per Box,Loose Rounds', 'CCI,22 LR,3,100,7'].join('\n');

    expect(service.importFromCsv(csv, 1).imported).toBe(1);
    expect(service.list(1)[0].total_rounds).toBe(307);
  });

  test('matches headers case-insensitively', () => {
    const csv = ['  MANUFACTURER , caliber ', 'Hornady,6.5 Creedmoor'].join('\n');

    expect(service.importFromCsv(csv, 1).imported).toBe(1);
  });

  test('reports bad rows with row numbers and still imports valid rows', () => {
    const csv = [
      HEADER,
      'Good,Ammo,9mm,115,FMJ,1,50,0,50,,',
      'Bad,Negative,9mm,115,FMJ,-1,50,0,,,',
      'Bad,Fraction,9mm,115,FMJ,1,50,1.5,,,',
      'Bad,Mismatch,9mm,115,FMJ,2,50,0,999,,',
      ',Missing,,,,,,,,,'
    ].join('\n');

    const result = service.importFromCsv(csv, 1);

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(4);
    expect(result.errors.map((e) => e.row)).toEqual([3, 4, 5, 6]);
    expect(result.errors[0].errors[0].field).toBe('boxes');
    expect(result.errors[1].errors[0].field).toBe('loose_rounds');
    expect(result.errors[2].errors[0]).toEqual({
      field: 'total_rounds',
      message: 'Total Rounds is 999 but Boxes × Rounds Per Box + Loose Rounds is 100.'
    });
    expect(result.errors[3].errors.map((e) => e.field)).toEqual(['manufacturer', 'caliber']);
    expect(service.getTotalRounds(1)).toBe(50);
  });

  test('scopes imported rows to the importing user', () => {
    service.importFromCsv(FIXTURE, 2);

    expect(service.list(1)).toHaveLength(0);
    expect(service.list(2)).toHaveLength(11);
  });

  test('export round-trips into an empty inventory', () => {
    service.importFromCsv(FIXTURE, 1);
    service.create({
      manufacturer: 'Quote "Co", Inc.', product_line: '', caliber: '.45 ACP', grain: 230, load_type: '',
      boxes: 1, rounds_per_box: 50, loose_rounds: 3, location: 'Safe, top shelf', notes: 'line one\nline two'
    }, 1);
    let csv = '';
    service.streamCsv((chunk) => { csv += chunk; }, 1);

    expect(csv.split('\n')[0]).toBe(HEADER);
    expect(service.importFromCsv(csv, 2)).toEqual({ imported: 12, failed: 0, errors: [] });
    const strip = ({ id, user_id, created_at, updated_at, ...rest }) => rest; // eslint-disable-line no-unused-vars
    expect(service.list(2).map(strip)).toEqual(service.list(1).map(strip));
  });

  test('returns zero counts for a header-only file', () => {
    expect(service.importFromCsv(HEADER, 1)).toEqual({ imported: 0, failed: 0, errors: [] });
  });

  test('rejects files over the row limit without inserting', () => {
    const csv = [HEADER, ...Array(MAX_IMPORT_ROWS + 1).fill('A,B,9mm,,,1,1,0,,,')].join('\n');

    const result = service.importFromCsv(csv, 1);

    expect(result.tooManyRows).toBe(true);
    expect(result.rowCount).toBe(MAX_IMPORT_ROWS + 1);
    expect(service.list(1)).toHaveLength(0);
  });
});
