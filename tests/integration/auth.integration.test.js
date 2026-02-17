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

describe('auth routes', () => {
  let app;
  let dbPath;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-auth-'));
    dbPath = path.join(tempDir, 'app.db');
    app = createApp({ config: testConfig(dbPath) });
  });

  afterEach(() => {
    app.locals.db.close();
    const dir = path.dirname(dbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('GET /firearms redirects to login when unauthenticated', async () => {
    const response = await request(app).get('/firearms');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test('POST /login succeeds with valid credentials', async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'password123' });

    expect(loginResponse.status).toBe(302);
    expect(loginResponse.headers.location).toBe('/');

    const firearmsResponse = await agent.get('/firearms');
    expect(firearmsResponse.status).toBe(200);
    expect(firearmsResponse.text).toContain('Inventory');
  });

  test('POST /login fails with invalid credentials', async () => {
    const response = await request(app)
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.text).toContain('Invalid credentials');
  });
});
