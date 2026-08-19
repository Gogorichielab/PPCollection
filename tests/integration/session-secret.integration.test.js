const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createApp } = require('../../src/app/createApp');
const { SESSION_SECRET_FILENAME } = require('../../src/infra/config/session-secret');

// Deliberately omits sessionSecret so createApp exercises the generate-and-persist
// path the way a zero-configuration `docker run` does.
function zeroConfigConfig(dataDir) {
  return {
    port: 0,
    adminUser: 'admin',
    adminPass: 'password123',
    dataDir,
    databasePath: path.join(dataDir, 'app.db'),
    photosDir: path.join(dataDir, 'photos')
  };
}

function extractCsrfToken(html) {
  const match = html.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

describe('session secret persistence', () => {
  let dataDir;
  let apps;
  let logSpy;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-session-secret-'));
    apps = [];
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    for (const app of apps) {
      app.locals.db.close();
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  async function boot(config) {
    const app = await createApp({ config });
    apps.push(app);
    return app;
  }

  test('creates an owner-only secret file on first start', async () => {
    await boot(zeroConfigConfig(dataDir));

    const secretFile = path.join(dataDir, SESSION_SECRET_FILENAME);
    expect(fs.existsSync(secretFile)).toBe(true);
    expect(fs.statSync(secretFile).mode & 0o777).toBe(0o600);
    expect(fs.readFileSync(secretFile, 'utf8').trim().length).toBeGreaterThanOrEqual(64);
  });

  test('boots with no SESSION_SECRET and serves a working login and CSRF round-trip', async () => {
    const app = await boot(zeroConfigConfig(dataDir));
    const agent = request.agent(app);

    const loginPage = await agent.get('/login');
    expect(loginPage.status).toBe(200);

    const csrfToken = extractCsrfToken(loginPage.text);
    expect(csrfToken).toBeTruthy();

    const response = await agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'password123', _csrf: csrfToken });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/change-password');
  });

  test('rejects a POST without the CSRF token, proving the generated secret is enforced', async () => {
    const app = await boot(zeroConfigConfig(dataDir));

    const response = await request(app)
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'password123' });

    expect(response.status).toBe(403);
  });

  test('reuses the same secret across restarts and upgrades', async () => {
    await boot(zeroConfigConfig(dataDir));
    const secretFile = path.join(dataDir, SESSION_SECRET_FILENAME);
    const afterFirstBoot = fs.readFileSync(secretFile);

    // A second createApp against the same data directory stands in for a
    // container restart or an image upgrade.
    await boot(zeroConfigConfig(dataDir));

    expect(fs.readFileSync(secretFile)).toEqual(afterFirstBoot);

    const generatedEvents = logSpy.mock.calls
      .map(([line]) => line)
      .filter((line) => line.includes('session_secret.generated'));
    expect(generatedEvents).toHaveLength(1);
  });

  test('an explicit sessionSecret keeps an existing install byte-for-byte unchanged', async () => {
    await boot({ ...zeroConfigConfig(dataDir), sessionSecret: 'operator-supplied-secret' });

    expect(fs.existsSync(path.join(dataDir, SESSION_SECRET_FILENAME))).toBe(false);
  });

  test('falls back to the database directory when the config carries no dataDir', async () => {
    const databasePath = path.join(dataDir, 'app.db');
    await boot({ port: 0, adminUser: 'admin', adminPass: 'password123', databasePath });

    expect(fs.existsSync(path.join(dataDir, SESSION_SECRET_FILENAME))).toBe(true);
  });
});
