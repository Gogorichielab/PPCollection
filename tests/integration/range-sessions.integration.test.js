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

describe('range sessions routes', () => {
  let app;
  let dbPath;
  let agent;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-range-sessions-'));
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
    const dir = path.dirname(dbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  async function createFirearm(overrides = {}) {
    const newPage = await agent.get('/firearms/new');
    const csrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Glock',
        model: '19',
        serial: '',
        caliber: '9mm',
        condition: 'New',
        location: 'Safe',
        status: 'Active',
        firearm_type: 'Pistol',
        _csrf: csrfToken,
        ...overrides
      });

    expect(response.status).toBe(302);
    return Number(response.headers.location.split('/').pop());
  }

  async function getCsrfTokenFromShowPage(firearmId) {
    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.status).toBe(200);
    return { token: extractCsrfToken(showPage.text), html: showPage.text };
  }

  test('detail page renders the range sessions section with an empty state', async () => {
    const firearmId = await createFirearm();

    const { html } = await getCsrfTokenFromShowPage(firearmId);

    expect(html).toContain('Range Sessions');
    expect(html).toContain(`action="/firearms/${firearmId}/range-sessions"`);
    expect(html).toContain('No range sessions logged yet.');
    expect(html).toContain('0 sessions · 0 rounds');
  });

  test('adds a range session and shows it with updated totals', async () => {
    const firearmId = await createFirearm();
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    const response = await agent
      .post(`/firearms/${firearmId}/range-sessions`)
      .type('form')
      .send({
        date: '2025-06-01',
        location: 'Indoor Range',
        rounds_fired: '150',
        notes: 'Zeroed the red dot',
        _csrf: token
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`/firearms/${firearmId}#range-sessions`);

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Range session added.');
    expect(showPage.text).toContain('Indoor Range');
    expect(showPage.text).toContain('Zeroed the red dot');
    expect(showPage.text).toContain('1 session · 150 rounds');
  });

  test('rejects invalid input with an error flash', async () => {
    const firearmId = await createFirearm();
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    const response = await agent
      .post(`/firearms/${firearmId}/range-sessions`)
      .type('form')
      .send({ date: '2025-06-01', rounds_fired: '-5', _csrf: token });

    expect(response.status).toBe(302);

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Rounds fired cannot be negative.');
    expect(showPage.text).toContain('No range sessions logged yet.');
  });

  test('deletes a range session', async () => {
    const firearmId = await createFirearm();
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    await agent
      .post(`/firearms/${firearmId}/range-sessions`)
      .type('form')
      .send({ date: '2025-06-01', rounds_fired: '50', _csrf: token });

    const sessionId = app.locals.db
      .prepare('SELECT id FROM range_sessions WHERE firearm_id = ?')
      .get(firearmId).id;

    const { token: deleteToken } = await getCsrfTokenFromShowPage(firearmId);
    const response = await agent
      .post(`/firearms/${firearmId}/range-sessions/${sessionId}/delete`)
      .type('form')
      .send({ _csrf: deleteToken });

    expect(response.status).toBe(302);

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Range session deleted.');
    expect(showPage.text).toContain('No range sessions logged yet.');
  });

  test('returns 404 for a nonexistent firearm', async () => {
    const firearmId = await createFirearm();
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    const response = await agent
      .post('/firearms/9999/range-sessions')
      .type('form')
      .send({ date: '2025-06-01', _csrf: token });

    expect(response.status).toBe(404);
  });

  test('returns 404 when deleting a session that belongs to another firearm', async () => {
    const firearmId = await createFirearm();
    const otherFirearmId = await createFirearm({ make: 'Sig', model: 'P320' });
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    await agent
      .post(`/firearms/${firearmId}/range-sessions`)
      .type('form')
      .send({ date: '2025-06-01', _csrf: token });

    const sessionId = app.locals.db
      .prepare('SELECT id FROM range_sessions WHERE firearm_id = ?')
      .get(firearmId).id;

    const { token: deleteToken } = await getCsrfTokenFromShowPage(otherFirearmId);
    const response = await agent
      .post(`/firearms/${otherFirearmId}/range-sessions/${sessionId}/delete`)
      .type('form')
      .send({ _csrf: deleteToken });

    expect(response.status).toBe(404);
    expect(app.locals.db.prepare('SELECT COUNT(*) AS count FROM range_sessions').get().count).toBe(1);
  });

  test('requires authentication', async () => {
    const response = await request(app).post('/firearms/1/range-sessions').type('form').send({});

    expect(response.status).toBe(403);
  });
});
