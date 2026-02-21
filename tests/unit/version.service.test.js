const EventEmitter = require('events');
const https = require('https');

const { CACHE_TTL_MS, createVersionService } = require('../../src/services/version.service');

function mockGithubResponse({ payload, error }) {
  jest.spyOn(https, 'get').mockImplementation((_url, _options, callback) => {
    const request = new EventEmitter();
    request.destroy = jest.fn();
    request.setTimeout = jest.fn();

    process.nextTick(() => {
      if (error) {
        request.emit('error', error);
        return;
      }

      const response = new EventEmitter();
      callback(response);
      response.emit('data', JSON.stringify(payload));
      response.emit('end');
    });

    return request;
  });
}

describe('version service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns updateAvailable=true when newer version exists and caches for 24 hours', async () => {
    mockGithubResponse({ payload: { tag_name: 'v1.10.0' } });

    let nowMs = 1000;
    const service = createVersionService({
      currentVersion: '1.9.1',
      enabled: true,
      now: () => nowMs
    });

    const firstResult = await service.getVersionInfo();
    const secondResult = await service.getVersionInfo();

    expect(firstResult).toEqual({ currentVersion: '1.9.1', latestVersion: '1.10.0', updateAvailable: true });
    expect(secondResult).toEqual(firstResult);
    expect(https.get).toHaveBeenCalledTimes(1);

    nowMs += CACHE_TTL_MS + 1;
    await service.getVersionInfo();

    expect(https.get).toHaveBeenCalledTimes(2);
  });

  test('returns updateAvailable=false when current version is up to date', async () => {
    mockGithubResponse({ payload: { tag_name: 'v1.9.1' } });

    const service = createVersionService({ currentVersion: '1.9.1', enabled: true });
    const result = await service.getVersionInfo();

    expect(result).toEqual({ currentVersion: '1.9.1', latestVersion: '1.9.1', updateAvailable: false });
    expect(https.get).toHaveBeenCalledTimes(1);
  });

  test('returns no update info and does not call network when disabled', async () => {
    const getSpy = jest.spyOn(https, 'get');
    const service = createVersionService({ currentVersion: '1.9.1', enabled: false });

    const result = await service.getVersionInfo();

    expect(result).toEqual({ currentVersion: '1.9.1', latestVersion: null, updateAvailable: false });
    expect(getSpy).not.toHaveBeenCalled();
  });

  test('fails silently on network errors', async () => {
    mockGithubResponse({ error: new Error('network down') });
    const service = createVersionService({ currentVersion: '1.9.1', enabled: true });

    await expect(service.getVersionInfo()).resolves.toEqual({
      currentVersion: '1.9.1',
      latestVersion: null,
      updateAvailable: false
    });
    expect(https.get).toHaveBeenCalledTimes(1);
  });
});
