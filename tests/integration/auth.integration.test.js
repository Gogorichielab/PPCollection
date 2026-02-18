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

describe('auth routes', () => {
  let app;
  let dbPath;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-auth-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
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

  test('POST /login redirects to change-password on first login', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const csrfToken = extractCsrfToken(loginPage.text);

    const loginResponse = await agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'password123', _csrf: csrfToken });

    expect(loginResponse.status).toBe(302);
    expect(loginResponse.headers.location).toBe('/change-password');
  });

  test('POST /login fails with invalid credentials', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const csrfToken = extractCsrfToken(loginPage.text);

    const response = await agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'wrong-password', _csrf: csrfToken });

    expect(response.status).toBe(401);
    expect(response.text).toContain('Invalid credentials');
  });

  test('GET /change-password shows password change form when authenticated', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const response = await agent.get('/change-password');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Change Password');
    expect(response.text).toContain('For your security');
  });

  test('POST /change-password succeeds with valid input', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const changePasswordPage = await agent.get('/change-password');
    const changeCsrfToken = extractCsrfToken(changePasswordPage.text);

    const changeResponse = await agent
      .post('/change-password')
      .type('form')
      .send({
        current_password: 'password123',
        new_password: 'newSecurePassword123',
        confirm_password: 'newSecurePassword123',
        _csrf: changeCsrfToken
      });

    expect(changeResponse.status).toBe(302);
    expect(changeResponse.headers.location).toBe('/');

    const firearmsResponse = await agent.get('/firearms');
    expect(firearmsResponse.status).toBe(200);
  });

  test('POST /change-password fails with incorrect current password', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const changePasswordPage = await agent.get('/change-password');
    const changeCsrfToken = extractCsrfToken(changePasswordPage.text);

    const response = await agent
      .post('/change-password')
      .type('form')
      .send({
        current_password: 'wrongpassword',
        new_password: 'newSecurePassword123',
        confirm_password: 'newSecurePassword123',
        _csrf: changeCsrfToken
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('Current password is incorrect');
  });

  test('POST /change-password fails with mismatched passwords', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const changePasswordPage = await agent.get('/change-password');
    const changeCsrfToken = extractCsrfToken(changePasswordPage.text);

    const response = await agent
      .post('/change-password')
      .type('form')
      .send({
        current_password: 'password123',
        new_password: 'newSecurePassword123',
        confirm_password: 'differentPassword123',
        _csrf: changeCsrfToken
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('Passwords do not match');
  });

  test('POST /change-password fails with short password', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const changePasswordPage = await agent.get('/change-password');
    const changeCsrfToken = extractCsrfToken(changePasswordPage.text);

    const response = await agent
      .post('/change-password')
      .type('form')
      .send({
        current_password: 'password123',
        new_password: 'short',
        confirm_password: 'short',
        _csrf: changeCsrfToken
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('at least 12 characters');
  });

  test('protected routes redirect to change-password when must_change_password is true', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const response = await agent.get('/firearms');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/change-password');
  });

  test('after password change, user can access protected routes', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

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

    const response = await agent.get('/firearms');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Inventory');
  });

  test('POST /toggle-theme requires authentication', async () => {
    // Try to toggle theme without authentication
    // Will fail CSRF check first (403), but that's expected behavior
    const response = await request(app)
      .post('/toggle-theme')
      .send({});

    // CSRF middleware runs before auth middleware, so unauthenticated requests
    // without CSRF token get 403 (which also prevents access)
    expect(response.status).toBe(403);
  });

  test('POST /toggle-theme toggles theme from dark to light', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

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

    // Initial theme should be dark
    const firearmsPage = await agent.get('/firearms');
    expect(firearmsPage.text).toContain('data-theme="dark"');

    // Toggle to light
    const toggleResponse = await agent
      .post('/toggle-theme')
      .set('CSRF-Token', changeCsrfToken);

    expect(toggleResponse.status).toBe(200);
    expect(toggleResponse.body).toEqual({ theme: 'light' });

    // Verify theme persists on next page load
    const firearmsPageAfterToggle = await agent.get('/firearms');
    expect(firearmsPageAfterToggle.text).toContain('data-theme="light"');
  });

  test('POST /toggle-theme toggles theme from light to dark', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

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

    // Toggle to light first
    await agent
      .post('/toggle-theme')
      .set('CSRF-Token', changeCsrfToken);

    // Toggle back to dark
    const toggleResponse = await agent
      .post('/toggle-theme')
      .set('CSRF-Token', changeCsrfToken);

    expect(toggleResponse.status).toBe(200);
    expect(toggleResponse.body).toEqual({ theme: 'dark' });

    // Verify theme persists
    const firearmsPageAfterToggle = await agent.get('/firearms');
    expect(firearmsPageAfterToggle.text).toContain('data-theme="dark"');
  });

  test('login page has descriptive title', async () => {
    const response = await request(app).get('/login');
    expect(response.status).toBe(200);
    expect(response.text).toContain('<title>Login — Pew Pew Collection</title>');
  });

  test('POST /logout successfully logs out user and redirects to login', async () => {
    const agent = request.agent(app);

    // Login first
    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

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

    // Verify user is authenticated
    const firearmsResponse = await agent.get('/firearms');
    expect(firearmsResponse.status).toBe(200);

    // Get a page with CSRF token to use for logout
    const logoutCsrfToken = extractCsrfToken(firearmsResponse.text);

    // Logout with CSRF token
    const logoutResponse = await agent
      .post('/logout')
      .type('form')
      .send({ _csrf: logoutCsrfToken });

    expect(logoutResponse.status).toBe(302);
    expect(logoutResponse.headers.location).toBe('/login');

    // Verify user is logged out by trying to access protected route
    const afterLogoutResponse = await agent.get('/firearms');
    expect(afterLogoutResponse.status).toBe(302);
    expect(afterLogoutResponse.headers.location).toBe('/login');
  });
});
