const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createApp } = require('../../src/app/createApp');
const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createSettingsRepository } = require('../../src/infra/db/repositories/settings.repository');

const SETUP_CODE = 'ABCD-EFGH-JKMN';
const PASSWORD = 'CorrectHorseBattery';

// No adminPass: this is the zero-configuration first run that the wizard exists for.
function zeroConfigConfig(databasePath) {
  return {
    port: 0,
    sessionSecret: 'test-secret',
    adminUser: 'admin',
    databasePath
  };
}

function extractCsrfToken(html) {
  const match = html.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

async function submitSetup(agent, overrides = {}) {
  const page = await agent.get('/setup');
  return agent
    .post('/setup')
    .type('form')
    .send({
      _csrf: extractCsrfToken(page.text),
      setup_code: SETUP_CODE,
      username: 'range.boss',
      password: PASSWORD,
      confirm_password: PASSWORD,
      ...overrides
    });
}

describe('first-run setup wizard', () => {
  let app;
  let dbPath;
  let tempDir;
  let logSpy;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-setup-'));
    dbPath = path.join(tempDir, 'app.db');
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    app = await createApp({ config: zeroConfigConfig(dbPath), setupCode: SETUP_CODE });
  });

  afterEach(() => {
    app.locals.db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  describe('before setup', () => {
    test.each([['/'], ['/login'], ['/firearms'], ['/profile'], ['/reports']])(
      'redirects %s to /setup',
      async (route) => {
        const response = await request(app).get(route);
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/setup');
      }
    );

    test('serves the setup page itself', async () => {
      const response = await request(app).get('/setup');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Create Administrator');
    });

    test('leaves /health reachable for container health checks', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('renders a CSRF token on the setup form', async () => {
      const response = await request(app).get('/setup');
      expect(extractCsrfToken(response.text)).toBeTruthy();
    });

    test('never renders the setup code in the page', async () => {
      const response = await request(app).get('/setup');
      expect(response.text).not.toContain(SETUP_CODE);
    });

    test('announces the code on startup without writing it to the rendered page', () => {
      const logged = logSpy.mock.calls.map(([line]) => line).join('\n');
      expect(logged).toContain('setup.code_issued');
      expect(logged).toContain(SETUP_CODE);
    });
  });

  describe('completing setup', () => {
    test('creates the account, signs in, and redirects to the dashboard', async () => {
      const agent = request.agent(app);

      const response = await submitSetup(agent);
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/');

      const dashboard = await agent.get('/');
      expect(dashboard.status).toBe(200);
      expect(dashboard.text).toContain('Logout (range.boss)');
    });

    test('does not force a password change afterwards', async () => {
      const agent = request.agent(app);
      await submitSetup(agent);

      const changePassword = await agent.get('/change-password');
      expect(changePassword.status).toBe(200);

      const dashboard = await agent.get('/');
      expect(dashboard.status).toBe(200);
    });

    test('persists credentials that work on a fresh login', async () => {
      await submitSetup(request.agent(app));

      const agent = request.agent(app);
      const loginPage = await agent.get('/login');
      const response = await agent
        .post('/login')
        .type('form')
        .send({ username: 'range.boss', password: PASSWORD, _csrf: extractCsrfToken(loginPage.text) });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/');
    });

    test('accepts the code lowercased and without dashes', async () => {
      const response = await submitSetup(request.agent(app), { setup_code: 'abcdefghjkmn' });
      expect(response.status).toBe(302);
    });

    test('stores only a bcrypt hash', async () => {
      await submitSetup(request.agent(app));

      const settings = createSettingsRepository(app.locals.db);
      expect(settings.get('password_hash')).toMatch(/^\$2[aby]\$12\$/);
      expect(settings.get('password_hash')).not.toContain(PASSWORD);
    });
  });

  describe('rejections', () => {
    test('rejects a POST with no CSRF token', async () => {
      const response = await request(app)
        .post('/setup')
        .type('form')
        .send({ setup_code: SETUP_CODE, username: 'range.boss', password: PASSWORD, confirm_password: PASSWORD });

      expect(response.status).toBe(403);
    });

    test.each([
      ['a wrong code', { setup_code: 'ZZZZ-ZZZZ-ZZZZ' }, /setup code is not valid/],
      ['a missing code', { setup_code: '' }, /setup code is not valid/],
      ['a short password', { password: 'short', confirm_password: 'short' }, /at least 12/],
      ['a mismatched confirmation', { confirm_password: 'DifferentPassword1' }, /do not match/],
      ['a short username', { username: 'ab' }, /at least 3/]
    ])('rejects %s', async (_label, overrides, pattern) => {
      const response = await submitSetup(request.agent(app), overrides);

      expect(response.status).toBe(400);
      expect(response.text).toMatch(pattern);

      const settings = createSettingsRepository(app.locals.db);
      expect(settings.exists('password_hash')).toBe(false);
    });

    test('a rejected attempt leaves the code usable', async () => {
      await submitSetup(request.agent(app), { setup_code: 'ZZZZ-ZZZZ-ZZZZ' });

      const response = await submitSetup(request.agent(app));
      expect(response.status).toBe(302);
    });

    test('preserves the submitted username when re-rendering an error', async () => {
      const response = await submitSetup(request.agent(app), {
        username: 'keep.me',
        setup_code: 'ZZZZ-ZZZZ-ZZZZ'
      });

      expect(response.text).toContain('value="keep.me"');
    });

    test('rate limits repeated attempts', async () => {
      const agent = request.agent(app);
      const statuses = [];

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await submitSetup(agent, { setup_code: 'ZZZZ-ZZZZ-ZZZZ' });
        statuses.push(response.status);
      }

      expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
      expect(statuses[5]).toBe(429);
    });
  });

  describe('after setup', () => {
    let agent;

    beforeEach(async () => {
      agent = request.agent(app);
      await submitSetup(agent);
    });

    test('GET /setup is permanently unavailable', async () => {
      const response = await request(app).get('/setup');
      expect(response.status).toBe(404);
    });

    test('POST /setup is unavailable even with a valid token and the original code', async () => {
      // The agent is signed in after setup, so /login redirects; take the token
      // from the dashboard layout instead.
      const dashboard = await agent.get('/');
      const response = await agent
        .post('/setup')
        .type('form')
        .send({
          _csrf: extractCsrfToken(dashboard.text),
          setup_code: SETUP_CODE,
          username: 'second.admin',
          password: 'AnotherPassword123',
          confirm_password: 'AnotherPassword123'
        });

      expect(response.status).toBe(404);

      const settings = createSettingsRepository(app.locals.db);
      expect(settings.get('username')).toBe('range.boss');
    });

    test('unauthenticated requests go back to /login, not /setup', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });

    test('stays closed across a restart, and no new code is issued', async () => {
      app.locals.db.close();
      logSpy.mockClear();

      const restarted = await createApp({ config: zeroConfigConfig(dbPath) });
      try {
        const logged = logSpy.mock.calls.map(([line]) => line).join('\n');
        expect(logged).not.toContain('setup.code_issued');

        await request(restarted).get('/setup').expect(404);
        await request(restarted).get('/login').expect(200);
      } finally {
        restarted.locals.db.close();
      }

      // Keep afterEach's close() harmless now that the original handle is gone.
      app.locals.db = { close: () => {} };
    });
  });
});

describe('existing installations', () => {
  let tempDir;
  let dbPath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-setup-existing-'));
    dbPath = path.join(tempDir, 'app.db');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('an install with a saved administrator skips setup entirely', async () => {
    // Stand in for a deployment that predates the wizard.
    const seed = createDbClient(dbPath);
    migrate(seed);
    const settings = createSettingsRepository(seed);
    settings.set('username', 'legacy.admin');
    settings.set('password_hash', '$2b$12$abcdefghijklmnopqrstuuM/T7lGZcZjV0L9j3gqpcgZMQzFvE.4Qm');
    settings.set('must_change_password', '0');
    seed.close();

    const app = await createApp({ config: zeroConfigConfig(dbPath) });
    try {
      await request(app).get('/setup').expect(404);

      const response = await request(app).get('/');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');

      const settingsAfter = createSettingsRepository(app.locals.db);
      expect(settingsAfter.get('username')).toBe('legacy.admin');
      expect(settingsAfter.get('password_hash')).toBe(
        '$2b$12$abcdefghijklmnopqrstuuM/T7lGZcZjV0L9j3gqpcgZMQzFvE.4Qm'
      );
    } finally {
      app.locals.db.close();
    }
  });

  test('ADMIN_PASSWORD still seeds the account and bypasses the wizard', async () => {
    const app = await createApp({
      config: { ...zeroConfigConfig(dbPath), adminUser: 'env.admin', adminPass: 'password123' }
    });

    try {
      await request(app).get('/setup').expect(404);

      const agent = request.agent(app);
      const loginPage = await agent.get('/login');
      const response = await agent
        .post('/login')
        .type('form')
        .send({ username: 'env.admin', password: 'password123', _csrf: extractCsrfToken(loginPage.text) });

      // The env-seeded path still forces a password change on first login.
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/change-password');
    } finally {
      app.locals.db.close();
    }
  });
});
