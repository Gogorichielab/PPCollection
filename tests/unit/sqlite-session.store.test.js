const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createSessionsRepository } = require('../../src/infra/db/repositories/sessions.repository');
const {
  createSqliteSessionStore,
  MAX_SESSION_BYTES
} = require('../../src/infra/session/sqlite-session.store');

const HOUR = 1000 * 60 * 60;

function sessionWith(overrides = {}) {
  return { cookie: { maxAge: 8 * HOUR }, user: { username: 'admin', id: 1 }, ...overrides };
}

describe('sqlite session store', () => {
  let tempDir;
  let db;
  let sessions;
  let clock;
  let store;
  let warnSpy;
  let logSpy;

  // Promisified so each test reads as a straight sequence rather than nested
  // callbacks; the store's own contract stays callback-based.
  let get;
  let set;
  let touch;
  let destroy;
  let clear;
  let length;
  let all;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-session-store-'));
    db = createDbClient(path.join(tempDir, 'app.db'));
    migrate(db);
    sessions = createSessionsRepository(db);
    clock = 1_700_000_000_000;
    store = createSqliteSessionStore({ db, now: () => clock, cleanupIntervalMs: 0 });

    get = promisify(store.get.bind(store));
    set = promisify(store.set.bind(store));
    touch = promisify(store.touch.bind(store));
    destroy = promisify(store.destroy.bind(store));
    clear = promisify(store.clear.bind(store));
    length = promisify(store.length.bind(store));
    all = promisify(store.all.bind(store));

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    store.stopCleanup();
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('CRUD', () => {
    test('returns null for an unknown session', async () => {
      await expect(get('missing')).resolves.toBeNull();
    });

    test('round-trips a session', async () => {
      await set('abc', sessionWith());
      await expect(get('abc')).resolves.toEqual(sessionWith());
    });

    test('overwrites an existing session', async () => {
      await set('abc', sessionWith({ user: { username: 'first', id: 1 } }));
      await set('abc', sessionWith({ user: { username: 'second', id: 1 } }));

      const stored = await get('abc');
      expect(stored.user.username).toBe('second');
      await expect(length()).resolves.toBe(1);
    });

    test('destroy removes the session', async () => {
      await set('abc', sessionWith());
      await destroy('abc');

      await expect(get('abc')).resolves.toBeNull();
    });

    test('destroying an unknown session is not an error', async () => {
      await expect(destroy('missing')).resolves.toBeUndefined();
    });

    test('clear removes every session', async () => {
      await set('a', sessionWith());
      await set('b', sessionWith());

      await clear();

      await expect(length()).resolves.toBe(0);
    });

    test('length counts only live sessions', async () => {
      await set('live', sessionWith());
      await set('dead', sessionWith({ cookie: { maxAge: 1 } }));
      clock += 1000;

      await expect(length()).resolves.toBe(1);
    });

    test('all returns the decoded live sessions', async () => {
      await set('a', sessionWith());
      const listed = await all();

      expect(listed).toHaveLength(1);
      expect(listed[0].user.username).toBe('admin');
    });
  });

  describe('expiry', () => {
    test('honours cookie.maxAge', async () => {
      await set('abc', sessionWith({ cookie: { maxAge: HOUR } }));

      clock += HOUR - 1;
      await expect(get('abc')).resolves.not.toBeNull();

      clock += 2;
      await expect(get('abc')).resolves.toBeNull();
    });

    test('prefers an absolute cookie.expires over maxAge', async () => {
      const expires = new Date(clock + 2 * HOUR);
      await set('abc', sessionWith({ cookie: { expires, maxAge: HOUR } }));

      clock += HOUR + 1;
      await expect(get('abc')).resolves.not.toBeNull();
    });

    test('accepts a serialized cookie.expires string', async () => {
      const expires = new Date(clock + 2 * HOUR).toISOString();
      await set('abc', sessionWith({ cookie: { expires } }));

      clock += HOUR;
      await expect(get('abc')).resolves.not.toBeNull();
    });

    test('falls back to the configured TTL with no cookie hints', async () => {
      const shortTtl = createSqliteSessionStore({
        db,
        now: () => clock,
        ttlMs: HOUR,
        cleanupIntervalMs: 0
      });
      const shortSet = promisify(shortTtl.set.bind(shortTtl));
      const shortGet = promisify(shortTtl.get.bind(shortTtl));

      await shortSet('abc', { user: { username: 'admin' } });
      clock += HOUR + 1;

      await expect(shortGet('abc')).resolves.toBeNull();
      shortTtl.stopCleanup();
    });

    test('an expired session cannot authenticate even though the row remains', async () => {
      await set('abc', sessionWith({ cookie: { maxAge: HOUR } }));
      clock += HOUR + 1;

      await expect(get('abc')).resolves.toBeNull();
      // The row is still on disk until a sweep, but it is unreadable.
      expect(db.prepare('SELECT COUNT(*) AS c FROM sessions').get().c).toBe(1);
    });
  });

  describe('touch', () => {
    test('extends the life of a live session', async () => {
      await set('abc', sessionWith({ cookie: { maxAge: HOUR } }));

      clock += HOUR - 1;
      await touch('abc', sessionWith({ cookie: { maxAge: HOUR } }));

      clock += HOUR - 1;
      await expect(get('abc')).resolves.not.toBeNull();
    });

    test('does not resurrect an expired session', async () => {
      await set('abc', sessionWith({ cookie: { maxAge: HOUR } }));
      clock += HOUR + 1;

      await touch('abc', sessionWith({ cookie: { maxAge: HOUR } }));

      await expect(get('abc')).resolves.toBeNull();
    });

    test('does not create a session that was never set', async () => {
      await touch('missing', sessionWith());
      await expect(get('missing')).resolves.toBeNull();
    });

    test('leaves the stored payload untouched', async () => {
      await set('abc', sessionWith({ user: { username: 'admin', id: 1 } }));
      await touch('abc', sessionWith({ user: { username: 'tampered', id: 9 } }));

      const stored = await get('abc');
      expect(stored.user.username).toBe('admin');
    });
  });

  describe('corrupted records', () => {
    test('a row that will not decode yields no session', async () => {
      sessions.upsert('abc', 'not json at all', clock + HOUR);

      await expect(get('abc')).resolves.toBeNull();
    });

    test('the undecodable row is discarded so it cannot be retried', async () => {
      sessions.upsert('abc', '{"truncated":', clock + HOUR);

      await get('abc');

      expect(db.prepare('SELECT COUNT(*) AS c FROM sessions').get().c).toBe(0);
    });

    test('logs the discard without echoing the payload', async () => {
      sessions.upsert('abc', '{"secret-ish":', clock + HOUR);

      await get('abc');

      const logged = warnSpy.mock.calls.map(([line]) => line).join('\n');
      expect(logged).toContain('session.corrupt_record');
      expect(logged).not.toContain('secret-ish');
    });

    test('all skips undecodable rows rather than failing the listing', async () => {
      await set('good', sessionWith());
      sessions.upsert('bad', 'nope', clock + HOUR);

      await expect(all()).resolves.toHaveLength(1);
    });
  });

  describe('size limits', () => {
    test('refuses to persist a session larger than the limit', async () => {
      const huge = sessionWith({ blob: 'x'.repeat(MAX_SESSION_BYTES + 1) });

      await expect(set('abc', huge)).rejects.toThrow(/maximum size/);
      await expect(get('abc')).resolves.toBeNull();
    });

    test('accepts a session comfortably inside the limit', async () => {
      await expect(set('abc', sessionWith({ blob: 'x'.repeat(1024) }))).resolves.toBeUndefined();
    });

    test('an oversized write does not clobber the existing session', async () => {
      await set('abc', sessionWith({ user: { username: 'admin', id: 1 } }));

      await expect(
        set('abc', sessionWith({ blob: 'x'.repeat(MAX_SESSION_BYTES + 1) }))
      ).rejects.toThrow();

      const stored = await get('abc');
      expect(stored.user.username).toBe('admin');
    });

    test('honours a custom limit', async () => {
      const tiny = createSqliteSessionStore({ db, now: () => clock, maxBytes: 32, cleanupIntervalMs: 0 });
      const tinySet = promisify(tiny.set.bind(tiny));

      await expect(tinySet('abc', sessionWith())).rejects.toThrow(/maximum size of 32 bytes/);
      tiny.stopCleanup();
    });
  });

  describe('cleanup', () => {
    test('removes expired rows and reports the count', async () => {
      await set('live', sessionWith({ cookie: { maxAge: 8 * HOUR } }));
      await set('dead1', sessionWith({ cookie: { maxAge: HOUR } }));
      await set('dead2', sessionWith({ cookie: { maxAge: HOUR } }));
      clock += HOUR + 1;

      expect(store.cleanup()).toBe(2);
      expect(db.prepare('SELECT COUNT(*) AS c FROM sessions').get().c).toBe(1);
    });

    test('leaves live rows alone and stays quiet when there is nothing to do', async () => {
      await set('live', sessionWith());
      logSpy.mockClear();

      expect(store.cleanup()).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });

    test('runs on an interval that never holds the process open', () => {
      jest.useFakeTimers();
      try {
        const timed = createSqliteSessionStore({ db, now: () => clock, cleanupIntervalMs: 1000 });
        const spy = jest.spyOn(timed, 'cleanup');

        timed.startCleanup();
        expect(timed.cleanupTimer.unref).toBeDefined();

        jest.advanceTimersByTime(3000);
        expect(spy).toHaveBeenCalledTimes(3);

        timed.stopCleanup();
        jest.advanceTimersByTime(3000);
        expect(spy).toHaveBeenCalledTimes(3);
      } finally {
        jest.useRealTimers();
      }
    });

    test('startCleanup is idempotent', () => {
      jest.useFakeTimers();
      try {
        const timed = createSqliteSessionStore({ db, now: () => clock, cleanupIntervalMs: 1000 });
        timed.startCleanup();
        const first = timed.cleanupTimer;
        timed.startCleanup();

        expect(timed.cleanupTimer).toBe(first);
        timed.stopCleanup();
      } finally {
        jest.useRealTimers();
      }
    });

    test('a cleanup failure stops the timer instead of throwing repeatedly', () => {
      const closed = createDbClient(path.join(tempDir, 'closed.db'));
      migrate(closed);
      const orphan = createSqliteSessionStore({ db: closed, now: () => clock, cleanupIntervalMs: 1000 });
      orphan.startCleanup();
      closed.close();

      expect(() => orphan.cleanup()).not.toThrow();
      expect(orphan.cleanupTimer).toBeNull();
    });

    test('stopCleanup is safe to call when never started', () => {
      expect(() => store.stopCleanup()).not.toThrow();
    });
  });

  describe('database errors', () => {
    test('surface through the callback rather than throwing', async () => {
      const broken = createDbClient(path.join(tempDir, 'broken.db'));
      migrate(broken);
      const brokenStore = createSqliteSessionStore({ db: broken, cleanupIntervalMs: 0 });
      const brokenGet = promisify(brokenStore.get.bind(brokenStore));
      broken.close();

      await expect(brokenGet('abc')).rejects.toThrow();
      brokenStore.stopCleanup();
    });
  });
});
