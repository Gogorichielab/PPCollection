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

function expectNotFoundPage(response) {
  expect(response.status).toBe(404);
  expect(response.text).toContain('Not Found');
}

describe('ammo routes', () => {
  let app;
  let dbPath;
  let agent;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-ammo-'));
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
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  test('unauthenticated GET /ammo redirects to login', async () => {
    const unauthed = request(app);
    const response = await unauthed.get('/ammo');
    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/\/login/);
  });

  test('CRUD happy path', async () => {
    const newPage = await agent.get('/ammo/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const createResponse = await agent
      .post('/ammo')
      .type('form')
      .send({
        manufacturer: 'Federal',
        product_line: 'American Eagle',
        caliber: '9mm Luger',
        grain: '115',
        load_type: 'FMJ',
        boxes: '4',
        rounds_per_box: '50',
        loose_rounds: '12',
        location: 'Safe',
        notes: 'Range ammo',
        _csrf: createCsrfToken
      });

    expect(createResponse.status).toBe(302);
    expect(createResponse.headers.location).toBe('/ammo');

    const listResponse = await agent.get('/ammo');
    expect(listResponse.status).toBe(200);
    expect(listResponse.text).toContain('Federal');
    expect(listResponse.text).toContain('American Eagle');

    const editLinkMatch = listResponse.text.match(/\/ammo\/(\d+)\/edit/);
    expect(editLinkMatch).toBeTruthy();
    const ammoId = editLinkMatch[1];

    const editPage = await agent.get(`/ammo/${ammoId}/edit`);
    expect(editPage.status).toBe(200);
    expect(editPage.text).toMatch(/name="manufacturer"[^>]*value="Federal"/);
    const updateCsrfToken = extractCsrfToken(editPage.text);

    const updateResponse = await agent
      .put(`/ammo/${ammoId}`)
      .type('form')
      .send({
        manufacturer: 'Federal',
        product_line: 'American Eagle',
        caliber: '9mm Luger',
        grain: '115',
        load_type: 'FMJ',
        boxes: '10',
        rounds_per_box: '50',
        loose_rounds: '0',
        location: 'Safe',
        notes: 'Updated',
        _csrf: updateCsrfToken
      });

    expect(updateResponse.status).toBe(302);
    expect(updateResponse.headers.location).toBe('/ammo');

    const updatedList = await agent.get('/ammo');
    expect(updatedList.text).toContain('500'); // 10 boxes * 50 rounds/box

    const deleteResponse = await agent
      .post(`/ammo/${ammoId}/delete`)
      .type('form')
      .send({ _csrf: updateCsrfToken });

    expect(deleteResponse.status).toBe(302);
    expect(deleteResponse.headers.location).toBe('/ammo');

    const finalList = await agent.get('/ammo');
    expect(finalList.text).toContain('No ammo yet');
  });

  test('create rejects missing manufacturer and caliber with inline errors', async () => {
    const newPage = await agent.get('/ammo/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .post('/ammo')
      .type('form')
      .send({ manufacturer: '   ', caliber: '', _csrf: createCsrfToken });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Please correct the highlighted fields and try again.');
    expect(response.text).toContain('Manufacturer is required.');
    expect(response.text).toContain('Caliber is required.');

    const listResponse = await agent.get('/ammo');
    expect(listResponse.text).toContain('No ammo yet');
  });

  test('create rejects negative quantities and does not persist', async () => {
    const newPage = await agent.get('/ammo/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .post('/ammo')
      .type('form')
      .send({
        manufacturer: 'Federal',
        caliber: '9mm Luger',
        boxes: '-1',
        rounds_per_box: '50',
        loose_rounds: '0',
        _csrf: createCsrfToken
      });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Boxes cannot be negative.');

    const listResponse = await agent.get('/ammo');
    expect(listResponse.text).toContain('No ammo yet');
  });

  test('edit validation failure preserves entered values without persisting', async () => {
    const newPage = await agent.get('/ammo/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    await agent
      .post('/ammo')
      .type('form')
      .send({ manufacturer: 'Federal', caliber: '9mm Luger', _csrf: createCsrfToken });

    const listResponse = await agent.get('/ammo');
    const ammoId = listResponse.text.match(/\/ammo\/(\d+)\/edit/)[1];

    const editPage = await agent.get(`/ammo/${ammoId}/edit`);
    const updateCsrfToken = extractCsrfToken(editPage.text);

    const response = await agent
      .put(`/ammo/${ammoId}`)
      .type('form')
      .send({
        manufacturer: 'Winchester',
        caliber: '9mm Luger',
        boxes: '-5',
        rounds_per_box: '50',
        loose_rounds: '0',
        _csrf: updateCsrfToken
      });

    expect(response.status).toBe(400);
    expect(response.text).toMatch(/name="manufacturer"[^>]*value="Winchester"/);
    expect(response.text).toContain('Boxes cannot be negative.');

    const afterEditPage = await agent.get(`/ammo/${ammoId}/edit`);
    expect(afterEditPage.text).toMatch(/name="manufacturer"[^>]*value="Federal"/);
  });

  test('total_rounds is recomputed server-side after create and after an edit', async () => {
    const newPage = await agent.get('/ammo/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const createResponse = await agent
      .post('/ammo')
      .type('form')
      .send({
        manufacturer: 'Federal',
        caliber: '9mm Luger',
        boxes: '2',
        rounds_per_box: '50',
        loose_rounds: '3',
        total_rounds: '999999',
        _csrf: createCsrfToken
      });
    expect(createResponse.status).toBe(302);

    const listResponse = await agent.get('/ammo');
    expect(listResponse.text).not.toContain('999999');
    expect(listResponse.text).toContain('103'); // 2*50+3

    const ammoId = listResponse.text.match(/\/ammo\/(\d+)\/edit/)[1];
    const editPage = await agent.get(`/ammo/${ammoId}/edit`);
    const updateCsrfToken = extractCsrfToken(editPage.text);

    await agent
      .put(`/ammo/${ammoId}`)
      .type('form')
      .send({
        manufacturer: 'Federal',
        caliber: '9mm Luger',
        boxes: '1',
        rounds_per_box: '20',
        loose_rounds: '0',
        total_rounds: '999999',
        _csrf: updateCsrfToken
      });

    const updatedList = await agent.get('/ammo');
    expect(updatedList.text).not.toContain('999999');
    expect(updatedList.text).toContain('20'); // 1*20+0
  });

  test('grain omitted or blank saves as null with no error', async () => {
    const newPage = await agent.get('/ammo/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .post('/ammo')
      .type('form')
      .send({
        manufacturer: 'Federal',
        caliber: '12 Gauge',
        grain: '',
        load_type: 'Buckshot',
        _csrf: createCsrfToken
      });

    expect(response.status).toBe(302);

    const listResponse = await agent.get('/ammo');
    expect(listResponse.text).toContain('12 Gauge');
    expect(listResponse.text).toContain('Buckshot');
  });

  test('showEdit returns 404 for a nonexistent ammo id', async () => {
    const response = await agent.get('/ammo/99999/edit');
    expectNotFoundPage(response);
  });

  test('update returns 404 for a nonexistent ammo id', async () => {
    const newPage = await agent.get('/ammo/new');
    const csrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .put('/ammo/99999')
      .type('form')
      .send({ manufacturer: 'Federal', caliber: '9mm Luger', _csrf: csrfToken });

    expectNotFoundPage(response);
  });

  test('delete returns 404 for a nonexistent ammo id', async () => {
    const newPage = await agent.get('/ammo/new');
    const csrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .post('/ammo/99999/delete')
      .type('form')
      .send({ _csrf: csrfToken });

    expectNotFoundPage(response);
  });

  test('list page renders the caliber-subtotal stat strip and total-rounds figure', async () => {
    const newPage = await agent.get('/ammo/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    await agent
      .post('/ammo')
      .type('form')
      .send({
        manufacturer: 'Federal',
        caliber: '9mm Luger',
        boxes: '2',
        rounds_per_box: '50',
        loose_rounds: '0',
        _csrf: createCsrfToken
      });

    await agent
      .post('/ammo')
      .type('form')
      .send({
        manufacturer: 'Hornady',
        caliber: '.223 Remington',
        boxes: '1',
        rounds_per_box: '20',
        loose_rounds: '0',
        _csrf: createCsrfToken
      });

    const response = await agent.get('/ammo');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Total rounds on hand');
    expect(response.text).toContain('120'); // 100 + 20
    expect(response.text).toContain('9mm Luger');
    expect(response.text).toContain('.223 Remington');
    expect(response.text).toContain('Calibers tracked');
  });

  test('nav renders an Ammo link, active only on /ammo routes', async () => {
    const ammoResponse = await agent.get('/ammo');
    expect(ammoResponse.text).toMatch(/class="nav-link active"\s*\n\s*href="\/ammo"/);

    const homeResponse = await agent.get('/');
    expect(homeResponse.text).toContain('>Ammo</a>');
    expect(homeResponse.text).not.toMatch(/class="nav-link active"\s*\n\s*href="\/ammo"/);
  });
});
