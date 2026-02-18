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
    adminPass: 'changeme',
    databasePath
  };
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
    const loginCsrfToken = loginPage.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    await agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'changeme', _csrf: loginCsrfToken });

    const changePage = await agent.get('/change-password');
    const changeCsrfToken = changePage.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    await agent
      .post('/change-password')
      .type('form')
      .send({
        current_password: 'changeme',
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
    const csrfToken = newPage.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

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
        _csrf: csrfToken
      });

    expect(createResponse.status).toBe(302);
    expect(createResponse.headers.location).toMatch(/^\/firearms\/\d+$/);

    const firearmPath = createResponse.headers.location;
    const firearmId = firearmPath.split('/').pop();

    const showResponse = await agent.get(firearmPath);
    expect(showResponse.status).toBe(200);
    expect(showResponse.text).toContain('Glock 19');

    const editPage = await agent.get(`/firearms/${firearmId}/edit`);
    const editCsrfToken = editPage.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

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
        _csrf: editCsrfToken
      });

    expect(updateResponse.status).toBe(302);
    expect(updateResponse.headers.location).toBe(`/firearms/${firearmId}`);

    const updatedShowResponse = await agent.get(`/firearms/${firearmId}`);
    expect(updatedShowResponse.status).toBe(200);
    expect(updatedShowResponse.text).toContain('Glock 19X');

    const showPageForDelete = await agent.get(`/firearms/${firearmId}`);
    const deleteCsrfToken = showPageForDelete.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    const deleteResponse = await agent.post(`/firearms/${firearmId}/delete`).type('form').send({ _csrf: deleteCsrfToken });
    expect(deleteResponse.status).toBe(302);
    expect(deleteResponse.headers.location).toBe('/firearms');

    const listResponse = await agent.get('/firearms');
    expect(listResponse.status).toBe(200);
    expect(listResponse.text).toContain('No firearms yet');
  });

  test('CSV export returns download headers and content', async () => {
    const newPage = await agent.get('/firearms/new');
    const csrfToken = newPage.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Smith & Wesson',
        model: 'M&P',
        purchase_price: '0',
        _csrf: csrfToken
      });

    const response = await agent.get('/firearms/export');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment; filename="firearms.csv"');
    expect(response.text).toContain('Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Notes');
    expect(response.text).toContain('Smith & Wesson,M&P');
  });
});
