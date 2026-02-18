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
  expect(response.text).toContain('The page you requested was not found.');
}

describe('firearms routes', () => {
  let app;
  let dbPath;
  let agent;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-firearms-'));
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

  test('CRUD happy path', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const createResponse = await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Glock',
        model: '19',
        serial: 'ABC123',
        caliber: '9mm',
        purchase_date: '2025-01-01',
        purchase_price: '500',
        condition: 'New',
        location: 'Safe',
        status: 'Active',
        notes: 'Test firearm',
        firearm_type: 'Pistol',
        gun_warranty: 'on',
        _csrf: createCsrfToken
      });

    expect(createResponse.status).toBe(302);
    expect(createResponse.headers.location).toMatch(/^\/firearms\/\d+$/);

    const firearmPath = createResponse.headers.location;
    const firearmId = firearmPath.split('/').pop();

    const showResponse = await agent.get(firearmPath);
    expect(showResponse.status).toBe(200);
    expect(showResponse.text).toContain('Glock 19');

    const editPage = await agent.get(`/firearms/${firearmId}/edit`);
    const updateCsrfToken = extractCsrfToken(editPage.text);

    const updateResponse = await agent
      .put(`/firearms/${firearmId}`)
      .type('form')
      .send({
        make: 'Glock',
        model: '19X',
        serial: 'ABC123',
        caliber: '9mm',
        purchase_date: '2025-01-01',
        purchase_price: '550',
        condition: 'Used',
        location: 'Safe',
        status: 'Active',
        notes: 'Updated firearm',
        firearm_type: 'Pistol',
        gun_warranty: 'on',
        _csrf: updateCsrfToken
      });

    expect(updateResponse.status).toBe(302);
    expect(updateResponse.headers.location).toBe(`/firearms/${firearmId}`);

    const updatedShowResponse = await agent.get(`/firearms/${firearmId}`);
    expect(updatedShowResponse.status).toBe(200);
    expect(updatedShowResponse.text).toContain('Glock 19X');

    const showPageForDelete = await agent.get(`/firearms/${firearmId}`);
    const deleteCsrfToken = extractCsrfToken(showPageForDelete.text);

    const deleteResponse = await agent
      .post(`/firearms/${firearmId}/delete`)
      .type('form')
      .send({ _csrf: deleteCsrfToken });
    expect(deleteResponse.status).toBe(302);
    expect(deleteResponse.headers.location).toBe('/firearms');

    const listResponse = await agent.get('/firearms');
    expect(listResponse.status).toBe(200);
    expect(listResponse.text).toContain('No firearms yet');
  });
  test('create rejects missing make and model with inline errors', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const createResponse = await agent
      .post('/firearms')
      .type('form')
      .send({
        make: '   ',
        model: '',
        serial: 'ABC123',
        _csrf: createCsrfToken
      });

    expect(createResponse.status).toBe(400);
    expect(createResponse.text).toContain('Please correct the highlighted fields and try again.');
    expect(createResponse.text).toContain('Make is required.');
    expect(createResponse.text).toContain('Model is required.');

    const listResponse = await agent.get('/firearms');
    expect(listResponse.status).toBe(200);
    expect(listResponse.text).toContain('No firearms yet');
  });

  test('CSV export returns download headers and content', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Smith & Wesson',
        model: 'M&P',
        purchase_price: '0',
        _csrf: createCsrfToken
      });

    const response = await agent.get('/firearms/export');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment; filename="firearms.csv"');
    expect(response.text).toContain('Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Notes');
    expect(response.text).toContain('Smith & Wesson,M&P');
  });

  test('show returns 404 page when firearm not found', async () => {
    const response = await agent.get('/firearms/99999');

    expectNotFoundPage(response);
  });

  test('showEdit returns 404 page when firearm not found', async () => {
    const response = await agent.get('/firearms/99999/edit');

    expectNotFoundPage(response);
  });

  test('update returns 404 page when firearm not found', async () => {
    const newPage = await agent.get('/firearms/new');
    const csrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .put('/firearms/99999')
      .type('form')
      .send({
        make: 'Glock',
        model: '19',
        _csrf: csrfToken
      });

    expectNotFoundPage(response);
  });
});
