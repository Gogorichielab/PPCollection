const { createHomeService } = require('../../src/features/home/home.service');

describe('home service', () => {
  test('builds dashboard data with summary, chart data, and recent activity labels', () => {
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const firearmsRepository = {
      getCollectionSummary: jest.fn(() => ({
        total_firearms: 24,
        this_month: 3,
        categories: 6,
        last_update_days: 2
      })),
      getRecentActivity: jest.fn(() => ([
        {
          id: 1,
          make: 'Glock',
          model: '19 Gen 5',
          created_at: oneHourAgo,
          updated_at: oneHourAgo
        },
        {
          id: 2,
          make: 'Remington',
          model: '870',
          created_at: twoDaysAgo,
          updated_at: oneHourAgo
        }
      ])),
      getTypeBreakdown: jest.fn(() => ([
        { firearm_type: 'Pistol', count: 10 }
      ])),
      getValueByYear: jest.fn(() => ([
        { year: '2024', total_value: 5400 }
      ]))
    };

    const service = createHomeService(firearmsRepository);
    const result = service.getDashboard('admin');

    expect(result.username).toBe('admin');
    expect(result.stats).toEqual({
      totalFirearms: 24,
      thisMonth: 3,
      categories: 6,
      lastUpdateDays: '2d'
    });

    expect(result.charts).toEqual({
      typeBreakdown: [{ firearm_type: 'Pistol', count: 10 }],
      valueByYear: [{ year: '2024', total_value: 5400 }]
    });

    expect(result.recentActivity[0].description).toBe('Added Glock 19 Gen 5');
    expect(result.recentActivity[0].isRecent).toBe(true);
    expect(result.recentActivity[1].description).toBe('Updated Remington 870');

    expect(firearmsRepository.getRecentActivity).toHaveBeenCalledWith(5);
    expect(firearmsRepository.getTypeBreakdown).toHaveBeenCalledTimes(1);
    expect(firearmsRepository.getValueByYear).toHaveBeenCalledTimes(1);
  });
});
