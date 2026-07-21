const {
  createMaintenanceService,
  parseMaintenanceDueDays,
  DEFAULT_CLEANING_DUE_DAYS
} = require('../../src/features/maintenance/maintenance.service');

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function buildService({ statusRows = [], firearmDates = null, dueDaysSetting = null } = {}) {
  const maintenanceRepository = {
    listByFirearm: jest.fn(() => []),
    get: jest.fn(),
    create: jest.fn(() => 42),
    remove: jest.fn(),
    getCleaningStatus: jest.fn(() => statusRows),
    getFirearmCleaningDates: jest.fn(() => firearmDates)
  };
  const settingsRepository = {
    get: jest.fn(() => dueDaysSetting)
  };
  return {
    service: createMaintenanceService(maintenanceRepository, settingsRepository),
    maintenanceRepository,
    settingsRepository
  };
}

describe('parseMaintenanceDueDays', () => {
  test('returns the parsed value when in range', () => {
    expect(parseMaintenanceDueDays('30')).toBe(30);
    expect(parseMaintenanceDueDays('365')).toBe(365);
    expect(parseMaintenanceDueDays('1')).toBe(1);
  });

  test.each([null, undefined, '', '0', '366', '-5', 'abc', '30.5'])(
    'falls back to the default for %s',
    (raw) => {
      expect(parseMaintenanceDueDays(raw)).toBe(DEFAULT_CLEANING_DUE_DAYS);
    }
  );
});

describe('maintenance service CRUD passthrough', () => {
  test('create attaches the firearm id and returns the new row id', () => {
    const { service, maintenanceRepository } = buildService();

    const id = service.create(7, { date: '2025-01-01', type: 'Cleaning', notes: '', round_count_delta: null });

    expect(id).toBe(42);
    expect(maintenanceRepository.create).toHaveBeenCalledWith({
      firearm_id: 7,
      date: '2025-01-01',
      type: 'Cleaning',
      notes: '',
      round_count_delta: null
    });
  });

  test('listByFirearm, get, and remove delegate to the repository', () => {
    const { service, maintenanceRepository } = buildService();

    service.listByFirearm(7);
    service.get(3, 7);
    service.remove(3, 7);

    expect(maintenanceRepository.listByFirearm).toHaveBeenCalledWith(7);
    expect(maintenanceRepository.get).toHaveBeenCalledWith(3, 7);
    expect(maintenanceRepository.remove).toHaveBeenCalledWith(3, 7);
  });
});

describe('getDueForCleaning', () => {
  function row(overrides = {}) {
    return {
      id: 1,
      make: 'Glock',
      model: '19',
      status: 'Active',
      last_cleaned: null,
      last_range: null,
      ...overrides
    };
  }

  test('flags a firearm cleaned past the default threshold', () => {
    const { service } = buildService({
      statusRows: [row({ last_cleaned: isoDaysAgo(91) })]
    });

    const result = service.getDueForCleaning(1);

    expect(result.count).toBe(1);
    expect(result.thresholdDays).toBe(DEFAULT_CLEANING_DUE_DAYS);
    expect(result.items[0]).toMatchObject({ id: 1, label: 'Glock 19', daysSince: 91 });
    expect(result.items[0].reason).toBe('Last cleaned 91 days ago');
  });

  test('does not flag a firearm cleaned within the threshold', () => {
    const { service } = buildService({
      statusRows: [row({ last_cleaned: isoDaysAgo(89) })]
    });

    expect(service.getDueForCleaning(1).count).toBe(0);
  });

  test('honours a custom threshold from settings', () => {
    const { service, settingsRepository } = buildService({
      statusRows: [row({ last_cleaned: isoDaysAgo(31) })],
      dueDaysSetting: '30'
    });

    const result = service.getDueForCleaning(1);

    expect(settingsRepository.get).toHaveBeenCalledWith('maintenance_due_days');
    expect(result.thresholdDays).toBe(30);
    expect(result.count).toBe(1);
  });

  test('flags a range session newer than the last cleaning', () => {
    const { service } = buildService({
      statusRows: [row({ last_cleaned: isoDaysAgo(10), last_range: isoDaysAgo(5) })]
    });

    const result = service.getDueForCleaning(1);

    expect(result.count).toBe(1);
    expect(result.items[0].reason).toBe('Range session since last cleaning');
  });

  test('flags a firearm that was fired but never cleaned', () => {
    const { service } = buildService({
      statusRows: [row({ last_range: isoDaysAgo(2) })]
    });

    const result = service.getDueForCleaning(1);

    expect(result.count).toBe(1);
    expect(result.items[0].daysSince).toBeNull();
  });

  test('does not flag when the last cleaning is newer than the last range session', () => {
    const { service } = buildService({
      statusRows: [row({ last_cleaned: isoDaysAgo(3), last_range: isoDaysAgo(5) })]
    });

    expect(service.getDueForCleaning(1).count).toBe(0);
  });

  test('skips disposed firearms and firearms with no activity', () => {
    const { service } = buildService({
      statusRows: [
        row({ id: 1, status: 'Sold', last_cleaned: isoDaysAgo(400) }),
        row({ id: 2, status: 'Lost/Stolen', last_range: isoDaysAgo(1) }),
        row({ id: 3 })
      ]
    });

    expect(service.getDueForCleaning(1).count).toBe(0);
  });

  test('passes the user id through to the repository', () => {
    const { service, maintenanceRepository } = buildService();

    service.getDueForCleaning(5);

    expect(maintenanceRepository.getCleaningStatus).toHaveBeenCalledWith(5);
  });
});

describe('getCleaningStatusForFirearm', () => {
  test('reports due with a reason for an overdue cleaning', () => {
    const lastCleaned = isoDaysAgo(120);
    const { service } = buildService({ firearmDates: { last_cleaned: lastCleaned, last_range: null } });

    const result = service.getCleaningStatusForFirearm(7, 'Active');

    expect(result.due).toBe(true);
    expect(result.reason).toBe('Last cleaned 120 days ago');
    expect(result.lastCleaned).toBe(lastCleaned);
  });

  test('reports not due for a recently cleaned firearm', () => {
    const { service } = buildService({
      firearmDates: { last_cleaned: isoDaysAgo(5), last_range: isoDaysAgo(30) }
    });

    const result = service.getCleaningStatusForFirearm(7, 'Active');

    expect(result.due).toBe(false);
    expect(result.reason).toBeNull();
  });

  test('never reports due for a disposed firearm', () => {
    const { service, maintenanceRepository } = buildService();

    const result = service.getCleaningStatusForFirearm(7, 'Sold');

    expect(result.due).toBe(false);
    expect(maintenanceRepository.getFirearmCleaningDates).not.toHaveBeenCalled();
  });

  test('tolerates a missing dates row', () => {
    const { service } = buildService({ firearmDates: undefined });

    const result = service.getCleaningStatusForFirearm(7, 'Active');

    expect(result.due).toBe(false);
    expect(result.lastCleaned).toBeNull();
  });
});
