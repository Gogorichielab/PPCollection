'use strict';

const https = require('https');
const { createVersionService } = require('../../src/services/version.service');

jest.mock('https');

function mockHttpsGet(statusCode, body) {
  https.get.mockImplementation((url, options, callback) => {
    const res = {
      statusCode,
      on: jest.fn((event, handler) => {
        if (event === 'data') handler(typeof body === 'string' ? body : JSON.stringify(body));
        if (event === 'end') handler();
      })
    };
    callback(res);
    return { on: jest.fn() };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('update available when latest tag differs from current version', async () => {
  mockHttpsGet(200, { tag_name: 'v2.0.0' });
  const service = createVersionService({ currentVersion: '1.0.0', enabled: true });
  const info = await service.getVersionInfo();
  expect(info.updateAvailable).toBe(true);
  expect(info.latestVersion).toBe('2.0.0');
  expect(info.currentVersion).toBe('1.0.0');
});

test('up to date when latest tag matches current version', async () => {
  mockHttpsGet(200, { tag_name: 'v1.0.0' });
  const service = createVersionService({ currentVersion: '1.0.0', enabled: true });
  const info = await service.getVersionInfo();
  expect(info.updateAvailable).toBe(false);
  expect(info.latestVersion).toBe('1.0.0');
});

test('returns no update info and does not fetch when disabled', async () => {
  const service = createVersionService({ currentVersion: '1.0.0', enabled: false });
  const info = await service.getVersionInfo();
  expect(info.updateAvailable).toBe(false);
  expect(info.latestVersion).toBeNull();
  expect(https.get).not.toHaveBeenCalled();
});

test('resolves silently on network failure', async () => {
  https.get.mockImplementation((url, options, callback) => {
    const req = { on: jest.fn((event, handler) => { if (event === 'error') handler(new Error('ECONNREFUSED')); }) };
    return req;
  });
  const service = createVersionService({ currentVersion: '1.0.0', enabled: true });
  const info = await service.getVersionInfo();
  expect(info.updateAvailable).toBe(false);
  expect(info.latestVersion).toBeNull();
});

test('reuses cache within TTL and only fetches once', async () => {
  mockHttpsGet(200, { tag_name: 'v2.0.0' });
  const service = createVersionService({ currentVersion: '1.0.0', enabled: true });
  await service.getVersionInfo();
  await service.getVersionInfo();
  expect(https.get).toHaveBeenCalledTimes(1);
});
