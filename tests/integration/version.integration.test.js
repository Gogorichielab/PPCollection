const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const https = require('https');
const EventEmitter = require('events');

const { createApp } = require('../../src/app/createApp');

function testConfig(databasePath, updateCheck = true) {
  return {
    port: 0,
    sessionSecret: 'test-secret',
    adminUser: 'admin',
    adminPass: 'password123',
    databasePath,
    updateCheck
  };
}

function extractCsrfToken(html) {
  const match = html.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

function mockGithubResponse({ payload, error, statusCode = 200 }) {
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
      response.statusCode = statusCode;
      callback(response);
      response.emit('data', JSON.stringify(payload));
      response.emit('end');
    });

    return request;
  });
}

describe('version indicator integration', () => {
  let app;
  let dbPath;
  let agent;

  afterEach(() => {
    if (app && app.locals.db) {
      app.locals.db.close();
    }
    if (dbPath) {
      const dir = path.dirname(dbPath);
      fs.rmSync(dir, { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  async function setupAuthenticatedAgent(appInstance) {
    const testAgent = request.agent(appInstance);

    const loginPage = await testAgent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await testAgent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const changePasswordPage = await testAgent.get('/change-password');
    const changeCsrfToken = extractCsrfToken(changePasswordPage.text);

    await testAgent
      .post('/change-password')
      .type('form')
      .send({
        current_password: 'password123',
        new_password: 'newSecurePassword123',
        confirm_password: 'newSecurePassword123',
        _csrf: changeCsrfToken
      });

    return testAgent;
  }

  test('version indicator middleware sets versionInfo in res.locals', async () => {
    mockGithubResponse({ payload: { tag_name: 'v1.10.3' } });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-version-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
    agent = await setupAuthenticatedAgent(app);

    const response = await agent.get('/firearms');

    expect(response.status).toBe(200);
    // Verify versionInfo is present in the rendered HTML via version indicator
    expect(response.text).toContain('version-indicator');
    expect(response.text).toContain('v1.10.2');
  });

  test('version indicator renders correctly when update is available', async () => {
    mockGithubResponse({ payload: { tag_name: 'v1.11.0' } });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-version-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
    agent = await setupAuthenticatedAgent(app);

    const response = await agent.get('/firearms');

    expect(response.status).toBe(200);
    expect(response.text).toContain('version-indicator');
    expect(response.text).toContain('update-available');
    expect(response.text).toContain('v1.10.2 → v1.11.0 available');
    expect(response.text).toContain('https://github.com/Gogorichielab/PPCollection/releases/latest');
  });

  test('version indicator renders correctly when no update is available', async () => {
    mockGithubResponse({ payload: { tag_name: 'v1.10.2' } });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-version-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
    agent = await setupAuthenticatedAgent(app);

    const response = await agent.get('/firearms');

    expect(response.status).toBe(200);
    expect(response.text).toContain('version-indicator');
    expect(response.text).toContain('v1.10.2');
    expect(response.text).not.toContain('update-available');
    expect(response.text).not.toContain('→');
  });

  test('version indicator still renders when update check is disabled', async () => {
    const getSpy = jest.spyOn(https, 'get');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-version-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath, false) });
    agent = await setupAuthenticatedAgent(app);

    const response = await agent.get('/firearms');

    expect(response.status).toBe(200);
    expect(response.text).toContain('version-indicator');
    expect(response.text).toContain('v1.10.2');
    expect(response.text).not.toContain('update-available');
    expect(getSpy).not.toHaveBeenCalled();
  });

  test('version indicator handles API errors gracefully', async () => {
    mockGithubResponse({ error: new Error('network error') });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-version-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
    agent = await setupAuthenticatedAgent(app);

    const response = await agent.get('/firearms');

    expect(response.status).toBe(200);
    expect(response.text).toContain('version-indicator');
    expect(response.text).toContain('v1.10.2');
    expect(response.text).not.toContain('update-available');
  });

  test('version indicator is visible on all authenticated pages', async () => {
    mockGithubResponse({ payload: { tag_name: 'v1.10.2' } });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-version-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
    agent = await setupAuthenticatedAgent(app);

    // Test multiple pages
    const pages = ['/', '/firearms', '/firearms/new', '/profile'];

    for (const page of pages) {
      const response = await agent.get(page);
      expect(response.status).toBe(200);
      expect(response.text).toContain('version-indicator');
      expect(response.text).toContain('v1.10.2');
    }
  });

  test('version indicator link points to releases page', async () => {
    mockGithubResponse({ payload: { tag_name: 'v1.10.2' } });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-version-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
    agent = await setupAuthenticatedAgent(app);

    const response = await agent.get('/firearms');

    expect(response.status).toBe(200);
    expect(response.text).toContain('https://github.com/Gogorichielab/PPCollection/releases');
  });

  test('version indicator has proper ARIA labels for accessibility', async () => {
    mockGithubResponse({ payload: { tag_name: 'v1.11.0' } });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-version-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
    agent = await setupAuthenticatedAgent(app);

    const response = await agent.get('/firearms');

    expect(response.status).toBe(200);
    expect(response.text).toContain('aria-live="polite"');
    expect(response.text).toContain('aria-label');
    expect(response.text).toContain('Update available: v1.10.2 to v1.11.0');
  });
});
