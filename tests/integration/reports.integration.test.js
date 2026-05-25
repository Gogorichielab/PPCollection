const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createApp } = require('../../src/app/createApp');

function testConfig(databasePath) {
  return {
    port: 0,
    sessionSecret: 'test-secret',
    adminUser: 'admin',
    adminPass: 'password123',
    databasePath
  };
}

function extractCsrfToken(html) {
  const match = html.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

describe('reports routes', () => {
  let app;
  let dbPath;
  let agent;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-reports-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
    agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const changePasswordPage = await agent.get('/change-password');
    const changeCsrfToken = extractCsrfToken(changePasswordPage.text);

    await agent
      .post('/change-password')
      .type('form')
      .send({
        current_password: 'password123',
        new_password: 'newSecurePassword123',
        confirm_password: 'newSecurePassword123',
        _csrf: changeCsrfToken
      });
  });

  afterEach(() => {
    app.locals.db.close();
    try {
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  test('GET /reports renders with page title', async () => {
    const res = await agent.get('/reports');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Stats — Pew Pew Collection');
  });

  test('GET /reports shows empty state when no firearms exist', async () => {
    const res = await agent.get('/reports');

    expect(res.status).toBe(200);
    expect(res.text).toContain('No data yet');
    expect(res.text).toContain('Add your first firearm');
  });

  test('GET /reports redirects to login when unauthenticated', async () => {
    const unauthAgent = request.agent(app);
    const res = await unauthAgent.get('/reports');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('GET /reports shows nav link to Reports', async () => {
    const res = await agent.get('/reports');

    expect(res.status).toBe(200);
    expect(res.text).toContain('href="/reports"');
  });
});
