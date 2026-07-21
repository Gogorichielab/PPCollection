const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createApp } = require('../../src/app/createApp');

describe('structured request logging', () => {
  let app;
  let dbPath;
  let tempDir;
  let originalNodeEnv;
  let accessLogStream;

  beforeEach(async () => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-logging-'));
    dbPath = path.join(tempDir, 'test.db');
    accessLogStream = { write: jest.fn() };
    app = await createApp({
      config: {
        port: 0,
        sessionSecret: 'structured-logging-test-secret',
        adminUser: 'admin',
        adminPass: 'password123',
        databasePath: dbPath,
        trustProxy: false,
        secureCookies: false,
        isProduction: true,
        updateCheck: false
      },
      accessLogStream
    });
  });

  afterEach(() => {
    app.locals.db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('generates a request ID and exposes it on the health response', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(accessLogStream.write).not.toHaveBeenCalled();
  });

  test('preserves a valid caller-provided request ID end to end', async () => {
    const response = await request(app)
      .get('/login')
      .set('X-Request-ID', 'caller-request_123:abc')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('caller-request_123:abc');
    const entry = JSON.parse(accessLogStream.write.mock.calls[0][0]);
    expect(entry).toMatchObject({
      level: 'info',
      event: 'http.request',
      id: 'caller-request_123:abc',
      method: 'GET',
      url: '/login',
      status: 200
    });
    expect(entry.durationMs).toEqual(expect.any(Number));
  });

  test('replaces an invalid caller-provided request ID', async () => {
    const response = await request(app)
      .get('/login')
      .set('X-Request-ID', 'invalid request id')
      .expect(200);

    expect(response.headers['x-request-id']).not.toBe('invalid request id');
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
