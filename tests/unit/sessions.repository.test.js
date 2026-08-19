const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createSessionsRepository } = require('../../src/infra/db/repositories/sessions.repository');

const NOW = 1_700_000_000_000;
const HOUR = 1000 * 60 * 60;

describe('sessions repository', () => {
  let tempDir;
  let db;
  let sessions;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-sessions-repo-'));
    db = createDbClient(path.join(tempDir, 'app.db'));
    migrate(db);
    sessions = createSessionsRepository(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns null for an unknown sid', () => {
    expect(sessions.get('missing', NOW)).toBeNull();
  });

  test('stores and reads back a payload', () => {
    sessions.upsert('abc', '{"user":"admin"}', NOW + HOUR);
    expect(sessions.get('abc', NOW)).toBe('{"user":"admin"}');
  });

  test('replaces the payload and expiry on a repeat upsert', () => {
    sessions.upsert('abc', '{"n":1}', NOW + HOUR);
    sessions.upsert('abc', '{"n":2}', NOW + 2 * HOUR);

    expect(sessions.get('abc', NOW)).toBe('{"n":2}');
    expect(sessions.count(NOW)).toBe(1);
  });

  test('hides a row whose expiry has passed', () => {
    sessions.upsert('abc', '{}', NOW - 1);
    expect(sessions.get('abc', NOW)).toBeNull();
  });

  test('treats expiry as exclusive at the boundary', () => {
    sessions.upsert('abc', '{}', NOW);
    expect(sessions.get('abc', NOW)).toBeNull();
    expect(sessions.get('abc', NOW - 1)).toBe('{}');
  });

  test('touch extends a live row and reports success', () => {
    sessions.upsert('abc', '{}', NOW + HOUR);

    expect(sessions.touch('abc', NOW + 5 * HOUR, NOW)).toBe(true);
    expect(sessions.get('abc', NOW + 4 * HOUR)).toBe('{}');
  });

  test('touch does not revive an expired row', () => {
    sessions.upsert('abc', '{}', NOW - 1);

    expect(sessions.touch('abc', NOW + HOUR, NOW)).toBe(false);
    expect(sessions.get('abc', NOW)).toBeNull();
  });

  test('touch reports failure for an unknown sid', () => {
    expect(sessions.touch('missing', NOW + HOUR, NOW)).toBe(false);
  });

  test('destroy removes a single row', () => {
    sessions.upsert('a', '{}', NOW + HOUR);
    sessions.upsert('b', '{}', NOW + HOUR);

    sessions.destroy('a');

    expect(sessions.get('a', NOW)).toBeNull();
    expect(sessions.get('b', NOW)).toBe('{}');
  });

  test('destroy on an unknown sid is a no-op', () => {
    expect(() => sessions.destroy('missing')).not.toThrow();
  });

  test('clear removes every row', () => {
    sessions.upsert('a', '{}', NOW + HOUR);
    sessions.upsert('b', '{}', NOW + HOUR);

    sessions.clear();

    expect(sessions.count(NOW)).toBe(0);
  });

  test('count and all only report live rows', () => {
    sessions.upsert('live', '{"k":1}', NOW + HOUR);
    sessions.upsert('dead', '{"k":2}', NOW - 1);

    expect(sessions.count(NOW)).toBe(1);
    expect(sessions.all(NOW)).toEqual([{ sid: 'live', data: '{"k":1}' }]);
  });

  test('deleteExpired removes lapsed rows and leaves live ones', () => {
    sessions.upsert('live', '{}', NOW + HOUR);
    sessions.upsert('dead1', '{}', NOW - 1);
    sessions.upsert('dead2', '{}', NOW - HOUR);

    expect(sessions.deleteExpired(NOW)).toBe(2);
    expect(sessions.count(NOW)).toBe(1);
    expect(sessions.get('live', NOW)).toBe('{}');
  });

  test('a sid containing SQL metacharacters is handled as data', () => {
    const hostile = "'; DROP TABLE sessions; --";
    sessions.upsert(hostile, '{"ok":true}', NOW + HOUR);

    expect(sessions.get(hostile, NOW)).toBe('{"ok":true}');
    // The table is still there, which is the point.
    expect(sessions.count(NOW)).toBe(1);
  });
});
