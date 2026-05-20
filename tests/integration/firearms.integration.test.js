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
  expect(response.text).toContain('The page you requested could not be located.');
  expect(response.text).toContain('Go Home');
  expect(response.text).toContain('Open Inventory');
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
    expect(listResponse.text).toContain('<title>Inventory — Pew Pew Collection</title>');
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

  test('GET /firearms/import renders the upload form', async () => {
    const response = await agent.get('/firearms/import');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Import Firearms');
    expect(response.text).toContain('id="csv-file"');
  });

  test('GET /firearms/import/template returns the CSV template', async () => {
    const response = await agent.get('/firearms/import/template');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.headers['content-disposition']).toMatch(/firearms-import-template\.csv/);
    expect(response.text).toContain('Make,Model,Serial');
  });

  test('POST /firearms/import imports valid CSV rows', async () => {
    const newPage = await agent.get('/firearms/new');
    const csrfToken = extractCsrfToken(newPage.text);
    const csv = [
      'Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes',
      'Glock,19,,,,,,,,,,,,,,'
    ].join('\n');

    const response = await agent
      .post('/firearms/import')
      .set('Content-Type', 'text/plain')
      .set('x-csrf-token', csrfToken)
      .send(csv);

    expect(response.status).toBe(200);
    expect(response.body.imported).toBe(1);
  });

  test('POST /firearms/import rejects empty body', async () => {
    const newPage = await agent.get('/firearms/new');
    const csrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .post('/firearms/import')
      .set('Content-Type', 'text/plain')
      .set('x-csrf-token', csrfToken)
      .send('   ');

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/No CSV data received/);
  });

  test('preserves entered values on create validation failure (issue #396)', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Glock',
        model: '',
        serial: 'ABC123',
        caliber: '9mm',
        notes: 'special note',
        _csrf: createCsrfToken
      });

    expect(response.status).toBe(400);
    expect(response.text).toMatch(/name="make"[^>]*value="Glock"/);
    expect(response.text).toMatch(/name="serial"[^>]*value="ABC123"/);
    expect(response.text).toMatch(/name="caliber"[^>]*value="9mm"/);
    expect(response.text).toContain('special note');
  });

  test('preserves entered values on update validation failure (issue #396)', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const createResponse = await agent
      .post('/firearms')
      .type('form')
      .send({ make: 'Glock', model: '19', _csrf: createCsrfToken });

    const firearmId = createResponse.headers.location.split('/').pop();
    const editPage = await agent.get(`/firearms/${firearmId}/edit`);
    const updateCsrfToken = extractCsrfToken(editPage.text);

    const response = await agent
      .put(`/firearms/${firearmId}`)
      .type('form')
      .send({
        make: 'Sig',
        model: '',
        serial: 'XYZ789',
        _csrf: updateCsrfToken
      });

    expect(response.status).toBe(400);
    expect(response.text).toMatch(/name="make"[^>]*value="Sig"/);
    expect(response.text).toMatch(/name="serial"[^>]*value="XYZ789"/);
  });

  test('rejects firearm with status=Sold but missing disposition fields (issue #395)', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Glock',
        model: '19',
        status: 'Sold',
        _csrf: createCsrfToken
      });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Transferred/Sold To is required');
    expect(response.text).toContain('Date of Transfer is required');
  });

  test('flash success message renders on detail page after create (issue #389)', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const createResponse = await agent
      .post('/firearms')
      .type('form')
      .send({ make: 'Glock', model: '19', _csrf: createCsrfToken });

    const showResponse = await agent.get(createResponse.headers.location);
    expect(showResponse.status).toBe(200);
    expect(showResponse.text).toContain('Firearm added.');

    const showAgain = await agent.get(createResponse.headers.location);
    expect(showAgain.text).not.toContain('Firearm added.');
  });

  test('update rejects missing make and model with inline errors', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    const createResponse = await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Glock',
        model: '19',
        _csrf: createCsrfToken
      });

    expect(createResponse.status).toBe(302);
    const firearmPath = createResponse.headers.location;
    const firearmId = firearmPath.split('/').pop();

    const editPage = await agent.get(`/firearms/${firearmId}/edit`);
    const updateCsrfToken = extractCsrfToken(editPage.text);

    const updateResponse = await agent
      .put(`/firearms/${firearmId}`)
      .type('form')
      .send({
        make: '',
        model: '   ',
        _csrf: updateCsrfToken
      });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.text).toContain('Please correct the highlighted fields and try again.');
    expect(updateResponse.text).toContain('Make is required.');
    expect(updateResponse.text).toContain('Model is required.');

    const showResponse = await agent.get(`/firearms/${firearmId}`);
    expect(showResponse.status).toBe(200);
    expect(showResponse.text).toContain('Glock 19');
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
    expect(response.headers['content-disposition']).toMatch(/attachment; filename="firearms-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(response.text).toContain('Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Disposition Name,Disposition Address,Disposition Date,Disposition Reason,Firearm Type,Gun Warranty,Notes');
    expect(response.text).toContain('Smith & Wesson,M&P');
  });

  test('inventory table displays status and type columns with badges', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Remington',
        model: '870',
        status: 'Active',
        firearm_type: 'Shotgun',
        _csrf: createCsrfToken
      });

    await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Ruger',
        model: '10/22',
        status: 'Sold',
        disposition_name: 'Friend',
        disposition_date: '2024-06-01',
        firearm_type: 'Rifle',
        _csrf: createCsrfToken
      });

    const listResponse = await agent.get('/firearms');
    expect(listResponse.status).toBe(200);

    // Check for Status column header
    expect(listResponse.text).toContain('<span>Status</span>');
    
    // Check for Type column header
    expect(listResponse.text).toContain('<span>Type</span>');
    
    // Check for status badges with correct styling
    expect(listResponse.text).toContain('badge badge-accent');
    expect(listResponse.text).toContain('>Active<');
    expect(listResponse.text).toContain('>Sold<');
    
    // Check for type badges with correct styling
    expect(listResponse.text).toContain('badge badge-outline');
    expect(listResponse.text).toContain('>Shotgun<');
    expect(listResponse.text).toContain('>Rifle<');
  });

  test('pagination displays 25 items per page and preserves page state in URL', async () => {
    const newPage = await agent.get('/firearms/new');
    const createCsrfToken = extractCsrfToken(newPage.text);

    // Create 30 firearms
    for (let i = 1; i <= 30; i++) {
      await agent
        .post('/firearms')
        .type('form')
        .send({
          make: `Make${i}`,
          model: `Model${i}`,
          serial: `SN${i}`,
          _csrf: createCsrfToken
        });
    }

    // Test page 1
    const page1Response = await agent.get('/firearms');
    expect(page1Response.status).toBe(200);
    expect(page1Response.text).toContain('Showing 1 to 25 of 30');
    expect(page1Response.text).toContain('Page 1 of 2');
    expect(page1Response.text).toContain('Next →');
    expect(page1Response.text).toContain('<button class="btn btn-secondary pagination-btn" disabled>← Previous</button>');

    // Test page 2
    const page2Response = await agent.get('/firearms?page=2');
    expect(page2Response.status).toBe(200);
    expect(page2Response.text).toContain('Showing 26 to 30 of 30');
    expect(page2Response.text).toContain('Page 2 of 2');
    expect(page2Response.text).toContain('← Previous');
    expect(page2Response.text).toContain('<button class="btn btn-secondary pagination-btn" disabled>Next →</button>');
    expect(page2Response.text).toContain('?page=1');
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

  describe('GET /firearms/:id/duplicate', () => {
    test('returns 404 page when firearm not found', async () => {
      const response = await agent.get('/firearms/99999/duplicate');
      expectNotFoundPage(response);
    });

    test('creates a new firearm with same fields and a cleared serial', async () => {
      const newPage = await agent.get('/firearms/new');
      const createCsrfToken = extractCsrfToken(newPage.text);

      const createResponse = await agent
        .post('/firearms')
        .type('form')
        .send({
          make: 'Glock',
          model: '19',
          serial: 'ORIGINAL-SERIAL',
          caliber: '9mm',
          condition: 'New',
          status: 'Active',
          firearm_type: 'Pistol',
          notes: 'master copy',
          _csrf: createCsrfToken
        });

      expect(createResponse.status).toBe(302);
      const originalId = createResponse.headers.location.split('/').pop();

      const duplicateResponse = await agent.get(`/firearms/${originalId}/duplicate`);
      expect(duplicateResponse.status).toBe(302);
      expect(duplicateResponse.headers.location).toMatch(/^\/firearms\/\d+$/);

      const duplicateId = duplicateResponse.headers.location.split('/').pop();
      expect(duplicateId).not.toBe(originalId);

      const showResponse = await agent.get(duplicateResponse.headers.location);
      expect(showResponse.status).toBe(200);
      expect(showResponse.text).toContain('Glock 19');
      expect(showResponse.text).toContain('master copy');
      expect(showResponse.text).not.toContain('ORIGINAL-SERIAL');
    });

    test('duplicating a duplicate works and produces a third record', async () => {
      const newPage = await agent.get('/firearms/new');
      const createCsrfToken = extractCsrfToken(newPage.text);

      const createResponse = await agent
        .post('/firearms')
        .type('form')
        .send({ make: 'Sig', model: 'P320', _csrf: createCsrfToken });

      const firstId = createResponse.headers.location.split('/').pop();
      const firstDup = await agent.get(`/firearms/${firstId}/duplicate`);
      const secondId = firstDup.headers.location.split('/').pop();
      const secondDup = await agent.get(`/firearms/${secondId}/duplicate`);

      expect(secondDup.status).toBe(302);
      const thirdId = secondDup.headers.location.split('/').pop();
      expect(new Set([firstId, secondId, thirdId]).size).toBe(3);
    });
  });

  describe('DELETE /firearms/:id', () => {
    test('returns 404 page when firearm does not exist', async () => {
      const newPage = await agent.get('/firearms/new');
      const csrfToken = extractCsrfToken(newPage.text);

      const response = await agent
        .post('/firearms/99999/delete')
        .type('form')
        .send({ _csrf: csrfToken });

      expectNotFoundPage(response);
    });
  });

  describe('GET /firearms pagination edge cases', () => {
    async function seedFirearms(count) {
      const newPage = await agent.get('/firearms/new');
      const csrfToken = extractCsrfToken(newPage.text);
      for (let i = 1; i <= count; i++) {
        await agent
          .post('/firearms')
          .type('form')
          .send({ make: `Make${i}`, model: `Model${i}`, _csrf: csrfToken });
      }
    }

    test('out-of-range page parameter is clamped to the last page', async () => {
      await seedFirearms(30);

      const response = await agent.get('/firearms?page=999999');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Showing 26 to 30 of 30');
      expect(response.text).toContain('Page 2 of 2');
    });

    test('negative page parameter is clamped to page 1', async () => {
      await seedFirearms(30);

      const response = await agent.get('/firearms?page=-5');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Showing 1 to 25 of 30');
      expect(response.text).toContain('Page 1 of 2');
    });

    test('non-numeric page parameter falls back to page 1', async () => {
      const response = await agent.get('/firearms?page=abc');
      // Empty inventory hides pagination entirely (totalPages === 1) — but the
      // request still succeeds rather than throwing on a NaN page number.
      expect(response.status).toBe(200);
    });
  });

  describe('GET /firearms/report', () => {
    test('returns 200 with Insurance Report heading', async () => {
      const response = await agent.get('/firearms/report');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Insurance Report');
    });

    test('shows generated date and item count', async () => {
      const response = await agent.get('/firearms/report');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Generated:');
      expect(response.text).toContain('0 items');
    });

    test('shows firearm data and total value', async () => {
      const newPage = await agent.get('/firearms/new');
      const csrfToken = extractCsrfToken(newPage.text);
      await agent
        .post('/firearms')
        .type('form')
        .send({
          make: 'Ruger',
          model: '10/22',
          serial: 'SN99',
          caliber: '.22 LR',
          purchase_date: '2024-06-01',
          purchase_price: '350',
          condition: 'Excellent',
          status: 'Active',
          firearm_type: 'Rifle',
          _csrf: csrfToken
        });

      const response = await agent.get('/firearms/report');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Ruger');
      expect(response.text).toContain('10/22');
      expect(response.text).toContain('SN99');
      expect(response.text).toContain('350.00');
    });

    test('redirects unauthenticated users to login', async () => {
      const unauthed = request(app);
      const response = await unauthed.get('/firearms/report');
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/\/login/);
    });
  });
});
