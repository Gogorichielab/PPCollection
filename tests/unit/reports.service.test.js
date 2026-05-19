const { createReportsService } = require('../../src/features/reports/reports.service');

function makeRepository(overrides = {}) {
  return {
    getCollectionSummary: jest.fn(() => ({
      total_firearms: 10,
      total_value: 12000,
      active_value: 8000,
      sold_value: 4000,
      active_count: 7,
      sold_count: 2,
      lost_count: 1,
      repair_count: 0,
      transit_count: 0
    })),
    getBreakdownByType: jest.fn(() => ([{ label: 'Pistol', count: 6 }, { label: 'Rifle', count: 4 }])),
    getBreakdownByCaliber: jest.fn(() => ([{ label: '9mm', count: 5 }])),
    getBreakdownByMake: jest.fn(() => ([{ label: 'Glock', count: 4 }])),
    getAcquisitionByMonth: jest.fn(() => ([{ month: '2024-01', count: 3 }])),
    getAvgPriceByYear: jest.fn(() => ([{ year: '2024', avg_price: 1200, count: 3 }])),
    getDispositionStats: jest.fn(() => ({
      disposed_count: 2,
      total_proceeds: 4000,
      avg_hold_days: 365.5
    })),
    getConditionBreakdown: jest.fn(() => ([{ label: 'Excellent', count: 5 }])),
    ...overrides
  };
}

describe('reports service', () => {
  test('returns formatted report data', () => {
    const repo = makeRepository();
    const service = createReportsService(repo);
    const result = service.getReports();

    expect(result.summary.totalFirearms).toBe(10);
    expect(result.summary.totalValue).toBe(12000);
    expect(result.summary.activeCount).toBe(7);
    expect(result.summary.activeValue).toBe(8000);
    expect(result.summary.soldCount).toBe(2);
    expect(result.summary.soldValue).toBe(4000);
    expect(result.summary.lostCount).toBe(1);
    expect(result.summary.repairCount).toBe(0);
    expect(result.summary.transitCount).toBe(0);
  });

  test('returns chart data arrays', () => {
    const repo = makeRepository();
    const service = createReportsService(repo);
    const result = service.getReports();

    expect(result.charts.byType).toHaveLength(2);
    expect(result.charts.byCaliber).toHaveLength(1);
    expect(result.charts.byMake).toHaveLength(1);
    expect(result.charts.acquisitionByMonth).toHaveLength(1);
    expect(result.charts.avgPriceByYear).toHaveLength(1);
    expect(result.charts.byCondition).toHaveLength(1);
  });

  test('returns formatted disposition data', () => {
    const repo = makeRepository();
    const service = createReportsService(repo);
    const result = service.getReports();

    expect(result.disposition.disposedCount).toBe(2);
    expect(result.disposition.totalProceeds).toBe(4000);
    expect(result.disposition.avgHoldDays).toBe(365.5);
  });

  test('isEmpty is false when collection has firearms', () => {
    const repo = makeRepository();
    const service = createReportsService(repo);
    const result = service.getReports();

    expect(result.isEmpty).toBe(false);
  });

  test('isEmpty is true when collection is empty', () => {
    const repo = makeRepository({
      getCollectionSummary: jest.fn(() => ({
        total_firearms: 0,
        total_value: 0,
        active_value: 0,
        sold_value: 0,
        active_count: 0,
        sold_count: 0,
        lost_count: 0,
        repair_count: 0,
        transit_count: 0
      }))
    });
    const service = createReportsService(repo);
    const result = service.getReports();

    expect(result.isEmpty).toBe(true);
  });

  test('handles null summary values gracefully', () => {
    const repo = makeRepository({
      getCollectionSummary: jest.fn(() => ({
        total_firearms: null,
        total_value: null,
        active_value: null,
        sold_value: null,
        active_count: null,
        sold_count: null,
        lost_count: null,
        repair_count: null,
        transit_count: null
      })),
      getDispositionStats: jest.fn(() => ({
        disposed_count: null,
        total_proceeds: null,
        avg_hold_days: null
      }))
    });
    const service = createReportsService(repo);
    const result = service.getReports();

    expect(result.summary.totalFirearms).toBe(0);
    expect(result.summary.totalValue).toBe(0);
    expect(result.disposition.disposedCount).toBe(0);
    expect(result.disposition.totalProceeds).toBe(0);
    expect(result.disposition.avgHoldDays).toBeNull();
    expect(result.isEmpty).toBe(true);
  });
});
