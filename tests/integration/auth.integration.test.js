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



  test('GET / redirects to login when unauthenticated', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test('GET / renders dashboard after authentication', async () => {
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

    const response = await agent.get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Collection Overview');
    expect(response.text).toContain('Recent Activity');
    expect(response.text).toContain('Collection Value by Year');
    expect(response.text).toContain('Collection by Type');
    expect(response.text).toContain('class="app-hero');
    expect(response.text).toContain('href="https://github.com/Gogorichielab/PPCollection/issues"');
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

  test('POST /login fails with unknown username (no user enumeration)', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const csrfToken = extractCsrfToken(loginPage.text);

    const response = await agent
      .post('/login')
      .type('form')
      .send({ username: 'no-such-user', password: 'wrong-password', _csrf: csrfToken });

    expect(response.status).toBe(401);
    expect(response.text).toContain('Invalid credentials');
  });

  test('GET /health returns ok without auth and is excluded from auth redirects', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.version).toBeDefined();
    expect(typeof response.body.uptime).toBe('number');
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

  test('GET /change-password new and confirm password inputs enforce minlength=12 (issue #386)', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent.post('/login').type('form').send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const response = await agent.get('/change-password');
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/name="new_password"[^>]*minlength="12"/);
    expect(response.text).toMatch(/name="confirm_password"[^>]*minlength="12"/);
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

  test('POST /toggle-theme toggles theme dark→light then light→dark', async () => {
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
    const toggleToLight = await agent
      .post('/toggle-theme')
      .set('x-csrf-token', changeCsrfToken);

    expect(toggleToLight.status).toBe(200);
    expect(toggleToLight.body).toEqual({ theme: 'light' });

    const firearmsPageLight = await agent.get('/firearms');
    expect(firearmsPageLight.text).toContain('data-theme="light"');

    // Toggle back to dark
    const toggleToDark = await agent
      .post('/toggle-theme')
      .set('x-csrf-token', changeCsrfToken);

    expect(toggleToDark.status).toBe(200);
    expect(toggleToDark.body).toEqual({ theme: 'dark' });

    const firearmsPageDark = await agent.get('/firearms');
    expect(firearmsPageDark.text).toContain('data-theme="dark"');
  });


  test('GET /profile shows profile sections when authenticated', async () => {
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

    const response = await agent.get('/profile');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Profile Settings');
    expect(response.text).toContain('Change Password');
    expect(response.text).toContain('action="/profile/username"');
    expect(response.text).toContain('action="/profile/password"');
    expect(response.text).toContain('action="/profile/preferences"');
    expect(response.text).toContain('settings-grid');
    expect(response.text).toContain('card-wide');
    expect(response.text).toContain('class="app-hero');
  });

  test('GET /firearms/new renders standardized page header', async () => {
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

    const response = await agent.get('/firearms/new');
    expect(response.status).toBe(200);
    expect(response.text).toContain('class="app-hero');
    expect(response.text).toContain('Add Firearm');
  });

  test('GET /unknown renders 404 recovery actions', async () => {
    const response = await request(app).get('/unknown-page');
    expect(response.status).toBe(404);
    expect(response.text).toContain('class="card empty-state"');
    expect(response.text).toContain('Go Home');
    expect(response.text).toContain('Open Inventory');
  });

  test('POST /profile/username updates current session username and login username', async () => {
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

    const profilePage = await agent.get('/profile');
    const profileCsrfToken = extractCsrfToken(profilePage.text);

    const updateResponse = await agent
      .post('/profile/username')
      .type('form')
      .send({ username: 'range_admin', _csrf: profileCsrfToken });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.text).toContain('Username updated successfully');
    expect(updateResponse.text).toContain('Logout (range_admin)');

    const logoutCsrfToken = extractCsrfToken(updateResponse.text);
    await agent.post('/logout').type('form').send({ _csrf: logoutCsrfToken });

    const reloginPage = await agent.get('/login');
    const reloginCsrfToken = extractCsrfToken(reloginPage.text);

    const reloginResponse = await agent
      .post('/login')
      .type('form')
      .send({ username: 'range_admin', password: 'newSecurePassword123', _csrf: reloginCsrfToken });

    expect(reloginResponse.status).toBe(302);
    expect(reloginResponse.headers.location).toBe('/');
  });

  test('POST /profile/username returns HTTP 400 on validation failure (issue #385)', async () => {
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

    const profilePage = await agent.get('/profile');
    const profileCsrfToken = extractCsrfToken(profilePage.text);

    const response = await agent
      .post('/profile/username')
      .type('form')
      .send({ username: 'ab', _csrf: profileCsrfToken });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Username must be at least 3 characters');
  });

  test('POST /profile/password shows inline success without redirect', async () => {
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

    const profilePage = await agent.get('/profile');
    const profileCsrfToken = extractCsrfToken(profilePage.text);

    const response = await agent
      .post('/profile/password')
      .type('form')
      .send({
        current_password: 'newSecurePassword123',
        new_password: 'updatedSecurePassword123',
        confirm_password: 'updatedSecurePassword123',
        _csrf: profileCsrfToken
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('Password updated successfully');
    expect(response.text).toContain('<title>Profile — Pew Pew Collection</title>');
  });

  test('POST /profile/preferences updates theme and persists on next page load', async () => {
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

    const profilePage = await agent.get('/profile');
    const profileCsrfToken = extractCsrfToken(profilePage.text);

    const response = await agent
      .post('/profile/preferences')
      .type('form')
      .send({ theme: 'light', _csrf: profileCsrfToken });

    expect(response.status).toBe(200);
    expect(response.text).toContain('Display preferences updated successfully');
    expect(response.text).toContain('data-theme="light"');

    const firearmsResponse = await agent.get('/firearms');
    expect(firearmsResponse.text).toContain('data-theme="light"');
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

describe('cookie security flags', () => {
  let dbPath;

  afterEach(() => {
    if (dbPath) {
      const dir = path.dirname(dbPath);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function secureConfig(databasePath) {
    return {
      port: 0,
      sessionSecret: 'test-secret',
      adminUser: 'admin',
      adminPass: 'password123',
      databasePath,
      trustProxy: true,
      secureCookies: true
    };
  }

  test('session cookie has Secure flag when secureCookies=true', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-cookie-'));
    dbPath = path.join(tempDir, 'app.db');
    const app = await createApp({ config: secureConfig(dbPath) });

    // Simulate a proxied HTTPS request so express-session considers the connection secure
    const response = await request(app).get('/login').set('X-Forwarded-Proto', 'https');

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const sessionCookie = cookies.find((c) => c.startsWith('connect.sid'));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie.toLowerCase()).toContain('secure');
    expect(sessionCookie.toLowerCase()).toContain('httponly');

    app.locals.db.close();
  });

  test('CSRF cookie has Secure flag when secureCookies=true', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-cookie-'));
    dbPath = path.join(tempDir, 'app.db');
    const app = await createApp({ config: secureConfig(dbPath) });

    // Simulate a proxied HTTPS request so csrf-csrf sets the Secure attribute on the cookie
    const response = await request(app).get('/login').set('X-Forwarded-Proto', 'https');

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const csrfCookie = cookies.find((c) => c.startsWith('x-csrf-token'));
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie.toLowerCase()).toContain('secure');
    expect(csrfCookie.toLowerCase()).toContain('httponly');

    app.locals.db.close();
  });

  test('session cookie does NOT have Secure flag when secureCookies=false', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-cookie-'));
    dbPath = path.join(tempDir, 'app.db');
    const app = await createApp({ config: testConfig(dbPath) });

    const response = await request(app).get('/login');

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const sessionCookie = cookies.find((c) => c.startsWith('connect.sid'));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie.toLowerCase()).not.toContain('secure');

    app.locals.db.close();
  });
});

describe('CSRF rejection rendering', () => {
  let dbPath;

  afterEach(() => {
    if (dbPath) {
      const dir = path.dirname(dbPath);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('renders friendly 403 page when CSRF token is missing', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-csrf-'));
    dbPath = path.join(tempDir, 'app.db');
    const app = await createApp({ config: testConfig(dbPath) });

    const response = await request(app).post('/login').type('form').send({ username: 'admin', password: 'password123' });

    expect(response.status).toBe(403);
    expect(response.text).toContain('Request Blocked');
    expect(response.text).toContain('href="/login"');
    expect(response.text).not.toContain('Operator hint');

    app.locals.db.close();
  });

  test('shows operator hint when secureCookies=true and trustProxy=false', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-csrf-'));
    dbPath = path.join(tempDir, 'app.db');
    const app = await createApp({
      config: {
        port: 0,
        sessionSecret: 'test-secret',
        adminUser: 'admin',
        adminPass: 'password123',
        databasePath: dbPath,
        trustProxy: false,
        secureCookies: true
      }
    });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(app)
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .type('form')
      .send({ username: 'admin', password: 'password123' });

    expect(response.status).toBe(403);
    expect(response.text).toContain('Operator hint');
    expect(response.text).toContain('TRUST_PROXY=true');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('TRUST_PROXY=true'));

    errorSpy.mockRestore();
    app.locals.db.close();
  });
});
