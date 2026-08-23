-- Server-side session storage. Sessions previously lived in memory, so every
-- restart logged all users out; keeping them beside the rest of the data means a
-- container restart or image upgrade preserves logins.
CREATE TABLE IF NOT EXISTS sessions (
  sid        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Expiry drives both the validity check on every read and the periodic sweep.
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
