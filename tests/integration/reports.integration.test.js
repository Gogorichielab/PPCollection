const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createAmmoRepository } = require('../../src/infra/db/repositories/ammo.repository');
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
    expect(res.text).toContain('<title>Collection Stats — Pew Pew Collection</title>');
  });

  test('GET /reports shows empty state when no firearms exist', async () => {
    const res = await agent.get('/reports');

    expect(res.status).toBe(200);
    expect(res.text).toContain('No firearm records yet');
    expect(res.text).toContain('No ammunition recorded yet');
    expect(res.text).toMatch(/Total rounds on hand<\/span>\s*<strong[^>]*>0<\/strong>/);
    expect(res.text).toContain('Add your first firearm');
  });

  test('GET /reports shows the signed-in user’s ammunition even without firearms', async () => {
    const ammo = createAmmoRepository(app.locals.db);
    const userId = 1;
    ammo.create({ user_id: userId, caliber: '9mm', total_rounds: 1000 });
    ammo.create({ user_id: userId, caliber: ' 9MM ', total_rounds: 50 });
    ammo.create({ user_id: userId, caliber: '.22 LR', total_rounds: 25 });
    ammo.create({ user_id: userId, caliber: '', total_rounds: 3 });
    ammo.create({ user_id: userId + 1, caliber: 'Other caliber', total_rounds: 99 });

    const res = await agent.get('/reports').expect(200);

    expect(res.text).toContain('Rounds by caliber');
    expect(res.text).toMatch(/Total rounds on hand<\/span>\s*<strong[^>]*>1,078<\/strong>/);
    expect(res.text).toMatch(/>9mm<\/a><\/td>\s*<td[^>]*>1,050<\/td>/i);
    expect(res.text).toMatch(/>\.22 LR<\/a><\/td>\s*<td[^>]*>25<\/td>/);
    expect(res.text).toMatch(/>Unspecified<\/a><\/td>\s*<td[^>]*>3<\/td>/);
    expect(res.text).not.toContain('Other caliber');
    expect(res.text).toContain('href="/firearms/report"');
    expect(res.text).toContain('href="/ammo?caliber=.22%20LR"');
    expect(res.text).toContain('href="/ammo?unspecified=1"');
    const overview = await agent.get('/').expect(200);
    expect(overview.text).toContain('Rounds on hand');
    expect(overview.text).toContain('>1,078</span>');
    expect(overview.text).not.toContain('Every collection starts');
    const unspecified = await agent.get('/ammo?unspecified=1').expect(200);
    expect(unspecified.text).toContain('Unspecified caliber');
    expect(unspecified.text).toMatch(/stat-value mono">3<\/span>/);

  });

  test('previews selected insurance fields and links missing records to the same CSV selection', async () => {
    const insert = app.locals.db.prepare('INSERT INTO firearms (make, model, serial, purchase_price, location, firearm_type) VALUES (?, ?, ?, ?, ?, ?)');
    insert.run('Complete', 'One', 'PRIVATE123', 125, 'PRIVATE_STORAGE', 'Pistol');
    insert.run('Incomplete', 'Two', '', null, '', 'Pistol');
    const preview = await agent.get('/firearms/report?custom=1').expect(200);
    expect(preview.text).not.toContain('PRIVATE123');
    expect(preview.text).not.toContain('PRIVATE_STORAGE');
    expect(preview.text).not.toContain('Total Purchase Value');
    const selected = await agent.get('/firearms/report?custom=1&location=1&value=1').expect(200);
    expect(selected.text).toContain('PRIVATE_STORAGE');
    expect(selected.text).toContain('$125.00');
    const home = await agent.get('/').expect(200);
    expect(home.text).toContain('1 record missing a serial number');
    expect(home.text).toContain('2 records missing a photo');
    const csv = await agent.get('/firearms/export?missing=value').expect(200);
    expect(csv.text).toContain('Incomplete');
    expect(csv.text).not.toContain('Complete');
    const charts = await agent.get('/reports').expect(200);
    expect(charts.text).toContain('<caption>Collection by firearm type</caption>');
    expect(charts.text).toContain('<th scope="row">Pistol</th>');
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
