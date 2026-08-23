const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createApp } = require('../../src/app/createApp');
const { createSessionsRepository } = require('../../src/infra/db/repositories/sessions.repository');

const PASSWORD = 'password123';
const ROTATED = 'RotatedPassword123';

function testConfig(databasePath) {
  return {
    port: 0,
    sessionSecret: 'session-lifecycle-test-secret',
    adminUser: 'admin',
    adminPass: PASSWORD,
    databasePath
  };
}

function extractCsrfToken(html) {
  const match = html.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

function sidFrom(setCookie) {
  if (!setCookie) return null;
  const entry = setCookie.find((value) => value.startsWith('connect.sid='));
  return entry ? entry.split(';')[0].slice('connect.sid='.length) : null;
}

function cookieHeader(setCookie) {
  return setCookie.map((entry) => entry.split(';')[0]).join('; ');
}

describe('session lifecycle', () => {
  let app;
  let tempDir;
  let dbPath;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-lifecycle-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
  });

  afterEach(() => {
    app.locals.sessionStore?.stopCleanup?.();
    app.locals.db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function signIn(agent, password = PASSWORD) {
    const page = await agent.get('/login');
    return agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password, _csrf: extractCsrfToken(page.text) });
  }

  async function completeForcedChange(agent) {
    const page = await agent.get('/change-password');
    return agent
      .post('/change-password')
      .type('form')
      .send({
        current_password: PASSWORD,
        new_password: ROTATED,
        confirm_password: ROTATED,
        _csrf: extractCsrfToken(page.text)
      });
  }

  describe('session fixation', () => {
    test('login issues a different session id than the pre-login session', async () => {
      const agent = request.agent(app);

      // Touching /login mints an anonymous session (the CSRF identifier is
      // written to it), which is exactly the id an attacker would try to fix.
      const page = await agent.get('/login');
      const preLoginSid = sidFrom(page.headers['set-cookie']);
      expect(preLoginSid).toBeTruthy();

      const login = await agent
        .post('/login')
        .type('form')
        .send({ username: 'admin', password: PASSWORD, _csrf: extractCsrfToken(page.text) });

      expect(sidFrom(login.headers['set-cookie'])).toBeTruthy();
      expect(sidFrom(login.headers['set-cookie'])).not.toBe(preLoginSid);
    });

    test('the pre-login session id cannot be used after login', async () => {
      const agent = request.agent(app);
      const page = await agent.get('/login');
      const preLoginCookies = cookieHeader(page.headers['set-cookie']);

      await agent
        .post('/login')
        .type('form')
        .send({ username: 'admin', password: PASSWORD, _csrf: extractCsrfToken(page.text) });

      const response = await request(app).get('/').set('Cookie', preLoginCookies);
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });

    test('a failed login does not regenerate or authenticate', async () => {
      const agent = request.agent(app);
      const page = await agent.get('/login');

      const response = await agent
        .post('/login')
        .type('form')
        .send({ username: 'admin', password: 'wrong-password', _csrf: extractCsrfToken(page.text) });

      expect(response.status).toBe(401);

      const sessions = createSessionsRepository(app.locals.db);
      const stored = sessions.all(Date.now());
      expect(stored.every((row) => !JSON.parse(row.data).user)).toBe(true);
    });
  });

  describe('password change invalidates every session', () => {
    test('a session on another device stops working', async () => {
      const first = request.agent(app);
      await signIn(first);
      await completeForcedChange(first);

      // A second browser signs in with the rotated password.
      const second = request.agent(app);
      const secondLogin = await signIn(second, ROTATED);
      const secondCookies = cookieHeader(secondLogin.headers['set-cookie']);
      await request(app).get('/').set('Cookie', secondCookies).expect(200);

      // The first browser changes the password again from its profile.
      const profile = await first.get('/profile');
      await first
        .post('/profile/password')
        .type('form')
        .send({
          current_password: ROTATED,
          new_password: 'ThirdPassword12345',
          confirm_password: 'ThirdPassword12345',
          _csrf: extractCsrfToken(profile.text)
        });

      const response = await request(app).get('/').set('Cookie', secondCookies);
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });

    test('the user who changed the password keeps a working session', async () => {
      const agent = request.agent(app);
      await signIn(agent);
      await completeForcedChange(agent);

      const response = await agent.get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Logout (admin)');
    });

    test('their session id is rotated rather than reused', async () => {
      const agent = request.agent(app);
      const login = await signIn(agent);
      const beforeSid = sidFrom(login.headers['set-cookie']);

      const change = await completeForcedChange(agent);

      expect(sidFrom(change.headers['set-cookie'])).toBeTruthy();
      expect(sidFrom(change.headers['set-cookie'])).not.toBe(beforeSid);
    });

    test('exactly one session record survives the change', async () => {
      const first = request.agent(app);
      await signIn(first);
      await completeForcedChange(first);

      const second = request.agent(app);
      await signIn(second, ROTATED);

      const sessions = createSessionsRepository(app.locals.db);
      expect(sessions.count(Date.now())).toBeGreaterThan(1);

      const profile = await first.get('/profile');
      await first
        .post('/profile/password')
        .type('form')
        .send({
          current_password: ROTATED,
          new_password: 'ThirdPassword12345',
          confirm_password: 'ThirdPassword12345',
          _csrf: extractCsrfToken(profile.text)
        });

      expect(sessions.count(Date.now())).toBe(1);
    });

    test('a rejected password change leaves sessions intact', async () => {
      const agent = request.agent(app);
      await signIn(agent);
      await completeForcedChange(agent);

      const other = request.agent(app);
      const otherLogin = await signIn(other, ROTATED);
      const otherCookies = cookieHeader(otherLogin.headers['set-cookie']);

      const profile = await agent.get('/profile');
      await agent
        .post('/profile/password')
        .type('form')
        .send({
          current_password: 'wrong-current-password',
          new_password: 'ThirdPassword12345',
          confirm_password: 'ThirdPassword12345',
          _csrf: extractCsrfToken(profile.text)
        });

      await request(app).get('/').set('Cookie', otherCookies).expect(200);
    });
  });

  describe('logout', () => {
    test('destroys the server-side record', async () => {
      const agent = request.agent(app);
      await signIn(agent);
      await completeForcedChange(agent);

      const sessions = createSessionsRepository(app.locals.db);
      expect(sessions.count(Date.now())).toBe(1);

      const page = await agent.get('/');
      await agent.post('/logout').type('form').send({ _csrf: extractCsrfToken(page.text) });

      expect(sessions.count(Date.now())).toBe(0);
    });

    test('clears the client cookie', async () => {
      const agent = request.agent(app);
      await signIn(agent);
      await completeForcedChange(agent);

      const page = await agent.get('/');
      const logout = await agent
        .post('/logout')
        .type('form')
        .send({ _csrf: extractCsrfToken(page.text) });

      const cleared = (logout.headers['set-cookie'] || []).find((entry) =>
        entry.startsWith('connect.sid=')
      );
      expect(cleared).toBeTruthy();
      // An immediate expiry is how a cookie is deleted.
      expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
    });
  });
});
