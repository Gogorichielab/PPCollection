const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createApp } = require('../../src/app/createApp');
const { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_FIREARM } = require('../../src/features/photos/photos.service');

function testConfig(databasePath, photosDir) {
  return {
    port: 0,
    sessionSecret: 'test-secret',
    adminUser: 'admin',
    adminPass: 'password123',
    databasePath,
    photosDir
  };
}

function extractCsrfToken(html) {
  const match = html.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

describe('photos routes', () => {
  let app;
  let dbPath;
  let photosDir;
  let agent;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-photos-int-'));
    dbPath = path.join(tempDir, 'app.db');
    photosDir = path.join(tempDir, 'photos');
    app = await createApp({ config: testConfig(dbPath, photosDir) });
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
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  async function createFirearm(overrides = {}) {
    const newPage = await agent.get('/firearms/new');
    const csrfToken = extractCsrfToken(newPage.text);

    const response = await agent
      .post('/firearms')
      .type('form')
      .send({
        make: 'Glock',
        model: '19',
        serial: '',
        caliber: '9mm',
        condition: 'New',
        location: 'Safe',
        status: 'Active',
        firearm_type: 'Pistol',
        _csrf: csrfToken,
        ...overrides
      });

    expect(response.status).toBe(302);
    return Number(response.headers.location.split('/').pop());
  }

  async function getCsrfToken(firearmId) {
    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.status).toBe(200);
    return extractCsrfToken(showPage.text);
  }

  function uploadPhoto(firearmId, token, { filename = 'pic.jpg', contentType = 'image/jpeg', buffer = Buffer.from('fake image bytes') } = {}) {
    return agent
      .post(`/firearms/${firearmId}/photos`)
      .set('x-csrf-token', token)
      .attach('photo', buffer, { filename, contentType });
  }

  test('uploads a photo, stores the file, and renders the gallery', async () => {
    const firearmId = await createFirearm();
    const token = await getCsrfToken(firearmId);

    const response = await uploadPhoto(firearmId, token);

    expect(response.status).toBe(201);
    expect(response.body.id).toBeGreaterThan(0);

    const files = fs.readdirSync(photosDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^[a-f0-9]{32}\.jpg$/);

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain(`src="/firearms/${firearmId}/photos/${response.body.id}"`);
    expect(showPage.text).toContain(`1 / ${MAX_PHOTOS_PER_FIREARM}`);
  });

  test('serves an uploaded photo with its content type', async () => {
    const firearmId = await createFirearm();
    const token = await getCsrfToken(firearmId);
    const uploadResponse = await uploadPhoto(firearmId, token);

    const response = await agent.get(`/firearms/${firearmId}/photos/${uploadResponse.body.id}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/jpeg');
    expect(response.headers['cache-control']).toBe('private, max-age=86400');
    expect(response.body.toString()).toBe('fake image bytes');
  });

  test('returns 404 when serving a photo through a different firearm', async () => {
    const firearmId = await createFirearm();
    const otherFirearmId = await createFirearm({ make: 'Sig', model: 'P320' });
    const token = await getCsrfToken(firearmId);
    const uploadResponse = await uploadPhoto(firearmId, token);

    const response = await agent.get(`/firearms/${otherFirearmId}/photos/${uploadResponse.body.id}`);

    expect(response.status).toBe(404);
  });

  test('returns 404 when uploading to a nonexistent firearm', async () => {
    const firearmId = await createFirearm();
    const token = await getCsrfToken(firearmId);

    const response = await uploadPhoto(9999, token);

    expect(response.status).toBe(404);
  });

  test('rejects an upload without the CSRF header', async () => {
    const firearmId = await createFirearm();

    const response = await agent
      .post(`/firearms/${firearmId}/photos`)
      .attach('photo', Buffer.from('fake image bytes'), { filename: 'pic.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(403);
    expect(fs.readdirSync(photosDir)).toHaveLength(0);
  });

  test('rejects a disallowed file type', async () => {
    const firearmId = await createFirearm();
    const token = await getCsrfToken(firearmId);

    const response = await uploadPhoto(firearmId, token, { filename: 'notes.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Only JPEG, PNG, WebP, and GIF images are allowed.');
    expect(fs.readdirSync(photosDir)).toHaveLength(0);
  });

  test('rejects an oversized upload', async () => {
    const firearmId = await createFirearm();
    const token = await getCsrfToken(firearmId);

    const response = await uploadPhoto(firearmId, token, { buffer: Buffer.alloc(MAX_PHOTO_BYTES + 1) });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Photos must be 10 MB or smaller.');
    expect(fs.readdirSync(photosDir)).toHaveLength(0);
  });

  test('rejects an upload past the per-firearm cap', async () => {
    const firearmId = await createFirearm();
    const token = await getCsrfToken(firearmId);

    const insert = app.locals.db.prepare(
      'INSERT INTO firearm_photos (firearm_id, filename, mime, size) VALUES (?, ?, ?, ?)'
    );
    for (let i = 0; i < MAX_PHOTOS_PER_FIREARM; i += 1) {
      insert.run(firearmId, `${crypto.randomBytes(16).toString('hex')}.jpg`, 'image/jpeg', 10);
    }

    const response = await uploadPhoto(firearmId, token);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(`A firearm can have at most ${MAX_PHOTOS_PER_FIREARM} photos.`);
  });

  test('deletes a photo (row and file)', async () => {
    const firearmId = await createFirearm();
    const token = await getCsrfToken(firearmId);
    const uploadResponse = await uploadPhoto(firearmId, token);

    const deleteToken = await getCsrfToken(firearmId);
    const response = await agent
      .post(`/firearms/${firearmId}/photos/${uploadResponse.body.id}/delete`)
      .type('form')
      .send({ _csrf: deleteToken });

    expect(response.status).toBe(302);
    expect(fs.readdirSync(photosDir)).toHaveLength(0);
    expect(app.locals.db.prepare('SELECT COUNT(*) AS count FROM firearm_photos').get().count).toBe(0);

    const showPage = await agent.get(`/firearms/${firearmId}`);
    expect(showPage.text).toContain('Photo deleted.');
    expect(showPage.text).toContain('No photos yet.');
  });

  test('deleting a firearm removes its photo files from disk', async () => {
    const firearmId = await createFirearm();
    const token = await getCsrfToken(firearmId);
    await uploadPhoto(firearmId, token);
    await uploadPhoto(firearmId, token, { filename: 'second.png', contentType: 'image/png' });

    expect(fs.readdirSync(photosDir)).toHaveLength(2);

    const deleteToken = await getCsrfToken(firearmId);
    const response = await agent
      .post(`/firearms/${firearmId}/delete`)
      .type('form')
      .send({ _csrf: deleteToken });

    expect(response.status).toBe(302);
    expect(fs.readdirSync(photosDir)).toHaveLength(0);
    expect(app.locals.db.prepare('SELECT COUNT(*) AS count FROM firearm_photos').get().count).toBe(0);
  });

  test('requires authentication to view a photo', async () => {
    const firearmId = await createFirearm();
    const token = await getCsrfToken(firearmId);
    const uploadResponse = await uploadPhoto(firearmId, token);

    const response = await request(app).get(`/firearms/${firearmId}/photos/${uploadResponse.body.id}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });
});
