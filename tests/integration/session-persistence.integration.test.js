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
    sessionSecret: 'persistent-session-test-secret',
    adminUser: 'admin',
    adminPass: PASSWORD,
    databasePath
  };
}

function extractCsrfToken(html) {
  const match = html.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

// The browser's view of the session: the raw Set-Cookie values, replayed by hand
// so a request can be made to a *different* app instance on the same database.
function cookieHeader(setCookie) {
  return setCookie.map((entry) => entry.split(';')[0]).join('; ');
}

describe('session persistence across restarts', () => {
  let tempDir;
  let dbPath;
  let apps;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-session-persist-'));
    dbPath = path.join(tempDir, 'app.db');
    apps = [];
  });

  afterEach(() => {
    for (const app of apps) {
      app.locals.sessionStore?.stopCleanup?.();
      try {
        app.locals.db.close();
      } catch {
        // Already closed by a restart simulation.
      }
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function boot() {
    const app = await createApp({ config: testConfig(dbPath) });
    apps.push(app);
    return app;
  }

  // Stands in for `docker restart`: the process and its in-memory state go away,
  // the data volume does not.
  async function restart(app) {
    app.locals.sessionStore?.stopCleanup?.();
    app.locals.db.close();
    return boot();
  }

  async function signIn(app) {
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const login = await agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: PASSWORD, _csrf: extractCsrfToken(loginPage.text) });

    // The seeded account is forced through a password change before it is usable.
    const changePage = await agent.get('/change-password');
    await agent
      .post('/change-password')
      .type('form')
      .send({
        current_password: PASSWORD,
        new_password: ROTATED,
        confirm_password: ROTATED,
        _csrf: extractCsrfToken(changePage.text)
      });

    return { agent, cookies: cookieHeader(login.headers['set-cookie']) };
  }

  test('a login is written to the sessions table', async () => {
    const app = await boot();
    await signIn(app);

    const sessions = createSessionsRepository(app.locals.db);
    expect(sessions.count(Date.now())).toBe(1);
  });

  test('the same cookie still authenticates after a restart', async () => {
    const app = await boot();
    const { cookies } = await signIn(app);

    const restarted = await restart(app);

    const response = await request(restarted).get('/').set('Cookie', cookies);
    expect(response.status).toBe(200);
    expect(response.text).toContain('Logout (admin)');
  });

  test('the session survives two consecutive restarts', async () => {
    const app = await boot();
    const { cookies } = await signIn(app);

    const once = await restart(app);
    const twice = await restart(once);

    await request(twice).get('/').set('Cookie', cookies).expect(200);
  });

  test('the rotated password persists alongside the session', async () => {
    const app = await boot();
    await signIn(app);
    const restarted = await restart(app);

    const agent = request.agent(restarted);
    const loginPage = await agent.get('/login');
    const response = await agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: ROTATED, _csrf: extractCsrfToken(loginPage.text) });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/');
  });

  test('logging out deletes the record and the cookie is dead after a restart', async () => {
    const app = await boot();
    const { agent, cookies } = await signIn(app);

    const page = await agent.get('/');
    await agent.post('/logout').type('form').send({ _csrf: extractCsrfToken(page.text) });

    const sessions = createSessionsRepository(app.locals.db);
    expect(sessions.count(Date.now())).toBe(0);

    const restarted = await restart(app);
    const response = await request(restarted).get('/').set('Cookie', cookies);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test('an expired record cannot authenticate after a restart', async () => {
    const app = await boot();
    const { cookies } = await signIn(app);

    // Age the stored session past its expiry without touching the cookie.
    app.locals.db.prepare('UPDATE sessions SET expires_at = ?').run(Date.now() - 1000);

    const restarted = await restart(app);
    const response = await request(restarted).get('/').set('Cookie', cookies);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test('a corrupted record cannot authenticate and is discarded', async () => {
    const app = await boot();
    const { cookies } = await signIn(app);

    app.locals.db.prepare('UPDATE sessions SET data = ?').run('{ not valid json');

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const restarted = await restart(app);
      const response = await request(restarted).get('/').set('Cookie', cookies);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');

      // The bad row is gone. A row does exist again, but it is the fresh
      // anonymous session this request was issued — not the corrupted one.
      const remaining = restarted.locals.db.prepare('SELECT data FROM sessions').all();
      expect(remaining.every((row) => row.data !== '{ not valid json')).toBe(true);
      expect(remaining.every((row) => !JSON.parse(row.data).user)).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('a deleted record cannot authenticate', async () => {
    const app = await boot();
    const { cookies } = await signIn(app);

    app.locals.db.prepare('DELETE FROM sessions').run();

    const response = await request(app).get('/').set('Cookie', cookies);
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test('a forged session id cannot authenticate', async () => {
    const app = await boot();
    await signIn(app);

    const response = await request(app).get('/').set('Cookie', 'connect.sid=s%3Aforged.signature');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test('two signed-in browsers get two independent records', async () => {
    const app = await boot();
    await signIn(app);

    const second = request.agent(app);
    const loginPage = await second.get('/login');
    await second
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: ROTATED, _csrf: extractCsrfToken(loginPage.text) });

    const sessions = createSessionsRepository(app.locals.db);
    expect(sessions.count(Date.now())).toBe(2);
  });

  test('the store is exposed for shutdown so the sweep timer can be stopped', async () => {
    const app = await boot();
    expect(typeof app.locals.sessionStore.stopCleanup).toBe('function');
  });
});
