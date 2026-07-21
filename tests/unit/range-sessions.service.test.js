const { createRangeSessionsService } = require('../../src/features/range-sessions/range-sessions.service');

describe('range sessions service', () => {
  let rangeSessionsRepository;
  let service;

  beforeEach(() => {
    rangeSessionsRepository = {
      listByFirearm: jest.fn(() => []),
      get: jest.fn(),
      create: jest.fn(() => 11),
      remove: jest.fn(),
      totalsForFirearm: jest.fn(() => ({ session_count: 2, total_rounds: 300 }))
    };
    service = createRangeSessionsService(rangeSessionsRepository);
  });

  test('create attaches the firearm id and returns the new row id', () => {
    const id = service.create(4, { date: '2025-01-01', location: '', rounds_fired: 100, notes: '' });

    expect(id).toBe(11);
    expect(rangeSessionsRepository.create).toHaveBeenCalledWith({
      firearm_id: 4,
      date: '2025-01-01',
      location: '',
      rounds_fired: 100,
      notes: ''
    });
  });

  test('listByFirearm, get, remove, and totalsForFirearm delegate to the repository', () => {
    service.listByFirearm(4);
    service.get(9, 4);
    service.remove(9, 4);

    expect(service.totalsForFirearm(4)).toEqual({ session_count: 2, total_rounds: 300 });
    expect(rangeSessionsRepository.listByFirearm).toHaveBeenCalledWith(4);
    expect(rangeSessionsRepository.get).toHaveBeenCalledWith(9, 4);
    expect(rangeSessionsRepository.remove).toHaveBeenCalledWith(9, 4);
    expect(rangeSessionsRepository.totalsForFirearm).toHaveBeenCalledWith(4);
  });
});
