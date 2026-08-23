const session = require('express-session');
const logger = require('../../services/logger.service');
const { createSessionsRepository } = require('../db/repositories/sessions.repository');

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 8;
const DEFAULT_CLEANUP_INTERVAL_MS = 1000 * 60 * 15;
// Sessions here hold a username, a couple of flags, a CSRF identifier and at
// most one flash message. 16 KB is far above that and well below anything that
// could bloat the database if a request tried to stuff the session.
const MAX_SESSION_BYTES = 16 * 1024;

// express-session's own MemoryStore defers its callbacks; matching that keeps
// callers from being invoked synchronously on some paths and not others.
const defer = typeof setImmediate === 'function' ? setImmediate : process.nextTick;

function createSqliteSessionStore({
  db,
  ttlMs = DEFAULT_TTL_MS,
  cleanupIntervalMs = DEFAULT_CLEANUP_INTERVAL_MS,
  maxBytes = MAX_SESSION_BYTES,
  now = () => Date.now()
} = {}) {
  const sessions = createSessionsRepository(db);

  class SqliteSessionStore extends session.Store {
    constructor() {
      super();
      this.cleanupTimer = null;
    }

    // Prefers the cookie's own expiry so a session outlives exactly as long as
    // the cookie the browser holds, falling back to the configured TTL.
    expiryFor(sess) {
      const expires = sess?.cookie?.expires;
      if (expires) {
        const parsed = expires instanceof Date ? expires.getTime() : new Date(expires).getTime();
        if (Number.isFinite(parsed)) return parsed;
      }

      const maxAge = sess?.cookie?.maxAge;
      if (Number.isFinite(maxAge)) return now() + maxAge;

      return now() + ttlMs;
    }

    get(sid, callback) {
      let data;
      try {
        data = sessions.get(sid, now());
      } catch (error) {
        return defer(callback, error);
      }

      // Absent or lapsed: no session, so the request is unauthenticated.
      if (data === null) return defer(callback, null, null);

      try {
        return defer(callback, null, JSON.parse(data));
      } catch {
        // A row that will not parse can never authenticate anyone. Drop it and
        // report no session rather than surfacing a 500 the user cannot act on.
        logger.warn('session.corrupt_record', {
          message: 'Discarded a session record that could not be decoded.'
        });
        try {
          sessions.destroy(sid);
        } catch {
          // Best effort — the read already failed closed.
        }
        return defer(callback, null, null);
      }
    }

    set(sid, sess, callback) {
      let data;
      try {
        data = JSON.stringify(sess);
      } catch (error) {
        return defer(callback, error);
      }

      if (Buffer.byteLength(data, 'utf8') > maxBytes) {
        logger.warn('session.too_large', {
          bytes: Buffer.byteLength(data, 'utf8'),
          maxBytes,
          message: 'Refused to persist a session larger than the configured limit.'
        });
        return defer(callback, new Error(`Session exceeds the maximum size of ${maxBytes} bytes`));
      }

      try {
        sessions.upsert(sid, data, this.expiryFor(sess));
      } catch (error) {
        return defer(callback, error);
      }

      return defer(callback, null);
    }

    touch(sid, sess, callback) {
      try {
        sessions.touch(sid, this.expiryFor(sess), now());
      } catch (error) {
        return defer(callback, error);
      }
      return defer(callback, null);
    }

    destroy(sid, callback) {
      try {
        sessions.destroy(sid);
      } catch (error) {
        return defer(callback, error);
      }
      return defer(callback, null);
    }

    clear(callback) {
      try {
        sessions.clear();
      } catch (error) {
        return defer(callback, error);
      }
      return defer(callback, null);
    }

    length(callback) {
      try {
        return defer(callback, null, sessions.count(now()));
      } catch (error) {
        return defer(callback, error);
      }
    }

    all(callback) {
      let rows;
      try {
        rows = sessions.all(now());
      } catch (error) {
        return defer(callback, error);
      }

      const parsed = [];
      for (const row of rows) {
        try {
          parsed.push(JSON.parse(row.data));
        } catch {
          // Skip undecodable rows rather than failing the whole listing.
        }
      }
      return defer(callback, null, parsed);
    }

    // Removes lapsed rows. Reads already filter on expiry, so this is only about
    // keeping the table from growing without bound.
    cleanup() {
      try {
        const removed = sessions.deleteExpired(now());
        if (removed > 0) {
          logger.info('session.cleanup', { removed });
        }
        return removed;
      } catch (error) {
        // The database is typically closing during shutdown. Stop rather than
        // let a detached timer keep throwing.
        this.stopCleanup();
        logger.warn('session.cleanup_failed', { message: error.message });
        return 0;
      }
    }

    // The timer is unref'd so it never holds the process open, and it runs off
    // the request path entirely — no request ever waits on a sweep.
    startCleanup() {
      if (this.cleanupTimer || cleanupIntervalMs <= 0) return;
      this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
      if (typeof this.cleanupTimer.unref === 'function') this.cleanupTimer.unref();
    }

    stopCleanup() {
      if (!this.cleanupTimer) return;
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  return new SqliteSessionStore();
}

module.exports = {
  createSqliteSessionStore,
  DEFAULT_TTL_MS,
  DEFAULT_CLEANUP_INTERVAL_MS,
  MAX_SESSION_BYTES
};
