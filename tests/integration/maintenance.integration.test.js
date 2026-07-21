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

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe('maintenance routes', () => {
  let app;
  let dbPath;
  let agent;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-maintenance-'));
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

  test('detail page renders the maintenance section with an empty state', async () => {
    const firearmId = await createFirearm();

    const { html } = await getCsrfTokenFromShowPage(firearmId);

    expect(html).toContain('Maintenance Log');
    expect(html).toContain(`action="/firearms/${firearmId}/maintenance"`);
    expect(html).toContain('No maintenance logged yet.');
    expect(html).not.toContain('Cleaning due');
  });

  test('adds a maintenance entry and shows it on the detail page', async () => {
    const firearmId = await createFirearm();
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    const response = await agent
      .post(`/firearms/${firearmId}/maintenance`)
      .type('form')
      .send({
        date: '2025-06-01',
        type: 'Repair',
        notes: 'Replaced trigger spring',
        round_count_delta: '250',
        _csrf: token
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`/firearms/${firearmId}#maintenance`);

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Maintenance entry added.');
    expect(showPage.text).toContain('2025-06-01');
    expect(showPage.text).toContain('Repair');
    expect(showPage.text).toContain('Replaced trigger spring');
    expect(showPage.text).toContain('250');
  });

  test('rejects an invalid date with an error flash', async () => {
    const firearmId = await createFirearm();
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    const response = await agent
      .post(`/firearms/${firearmId}/maintenance`)
      .type('form')
      .send({ date: '2025-13-40', type: 'Cleaning', _csrf: token });

    expect(response.status).toBe(302);

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Date must be a valid date in YYYY-MM-DD format.');
    expect(showPage.text).toContain('No maintenance logged yet.');
  });

  test('deletes a maintenance entry', async () => {
    const firearmId = await createFirearm();
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    await agent
      .post(`/firearms/${firearmId}/maintenance`)
      .type('form')
      .send({ date: '2025-06-01', type: 'Cleaning', _csrf: token });

    const logId = app.locals.db
      .prepare('SELECT id FROM maintenance_logs WHERE firearm_id = ?')
      .get(firearmId).id;

    const { token: deleteToken } = await getCsrfTokenFromShowPage(firearmId);
    const response = await agent
      .post(`/firearms/${firearmId}/maintenance/${logId}/delete`)
      .type('form')
      .send({ _csrf: deleteToken });

    expect(response.status).toBe(302);

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Maintenance entry deleted.');
    expect(showPage.text).toContain('No maintenance logged yet.');
  });

  test('returns 404 for a nonexistent firearm', async () => {
    const firearmId = await createFirearm();
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    const response = await agent
      .post('/firearms/9999/maintenance')
      .type('form')
      .send({ date: '2025-06-01', type: 'Cleaning', _csrf: token });

    expect(response.status).toBe(404);
  });

  test('returns 404 when deleting a log that belongs to another firearm', async () => {
    const firearmId = await createFirearm();
    const otherFirearmId = await createFirearm({ make: 'Sig', model: 'P320' });
    const { token } = await getCsrfTokenFromShowPage(firearmId);

    await agent
      .post(`/firearms/${firearmId}/maintenance`)
      .type('form')
      .send({ date: '2025-06-01', type: 'Cleaning', _csrf: token });

    const logId = app.locals.db
      .prepare('SELECT id FROM maintenance_logs WHERE firearm_id = ?')
      .get(firearmId).id;

    const { token: deleteToken } = await getCsrfTokenFromShowPage(otherFirearmId);
    const response = await agent
      .post(`/firearms/${otherFirearmId}/maintenance/${logId}/delete`)
      .type('form')
      .send({ _csrf: deleteToken });

    expect(response.status).toBe(404);
    expect(app.locals.db.prepare('SELECT COUNT(*) AS count FROM maintenance_logs').get().count).toBe(1);
  });

  test('shows the cleaning-due badge and home dashboard stat for an overdue firearm', async () => {
    const firearmId = await createFirearm();

    app.locals.db
      .prepare('INSERT INTO maintenance_logs (firearm_id, date, type) VALUES (?, ?, ?)')
      .run(firearmId, isoDaysAgo(120), 'Cleaning');

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Cleaning due');
    expect(showPage.text).toContain('Last cleaned 120 days ago');

    const homePage = await agent.get('/');
    expect(homePage.text).toContain('Due for cleaning');
    expect(homePage.text).toContain('Due for Cleaning');
    expect(homePage.text).toContain('Glock 19');
  });

  test('flags a firearm fired since its last cleaning', async () => {
    const firearmId = await createFirearm();

    app.locals.db
      .prepare('INSERT INTO maintenance_logs (firearm_id, date, type) VALUES (?, ?, ?)')
      .run(firearmId, isoDaysAgo(10), 'Cleaning');
    app.locals.db
      .prepare('INSERT INTO range_sessions (firearm_id, date, rounds_fired) VALUES (?, ?, ?)')
      .run(firearmId, isoDaysAgo(2), 100);

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Cleaning due');
    expect(showPage.text).toContain('Range session since last cleaning');
  });

  test('honours the profile cleaning-reminder threshold', async () => {
    const firearmId = await createFirearm();

    app.locals.db
      .prepare('INSERT INTO maintenance_logs (firearm_id, date, type) VALUES (?, ?, ?)')
      .run(firearmId, isoDaysAgo(45), 'Cleaning');

    let showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).not.toContain('Cleaning due');

    const profilePage = await agent.get('/profile');
    expect(profilePage.text).toContain('name="maintenance_due_days"');
    const profileCsrfToken = extractCsrfToken(profilePage.text);

    const preferencesResponse = await agent
      .post('/profile/preferences')
      .type('form')
      .send({ theme: 'dark', maintenance_due_days: '30', _csrf: profileCsrfToken });

    expect(preferencesResponse.status).toBe(200);
    expect(preferencesResponse.text).toContain('Display preferences updated successfully');

    showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Cleaning due');
    expect(showPage.text).toContain('Last cleaned 45 days ago');
  });

  test('rejects an out-of-range cleaning-reminder threshold', async () => {
    const profilePage = await agent.get('/profile');
    const profileCsrfToken = extractCsrfToken(profilePage.text);

    const response = await agent
      .post('/profile/preferences')
      .type('form')
      .send({ theme: 'dark', maintenance_due_days: '0', _csrf: profileCsrfToken });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Cleaning reminder must be a whole number of days between 1 and 365.');
  });

  test('requires authentication', async () => {
    const response = await request(app).post('/firearms/1/maintenance').type('form').send({});

    expect(response.status).toBe(403);

    const getResponse = await request(app).get('/firearms/1');
    expect(getResponse.status).toBe(302);
    expect(getResponse.headers.location).toBe('/login');
  });
});
