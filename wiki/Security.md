# Security

Pew Pew Collection is designed for a single trusted operator running on
hardware they control. The security model is centered on protecting the local
admin session, not on multi-tenant isolation.

## Authentication

- **Bcrypt password hashing** at cost 12. `auth.service.js` uses
  `bcrypt.compare` / `bcrypt.hash`. The plain `ADMIN_PASSWORD` env var, when
  used at all, is only read on the very first boot to seed the hash.
- **Forced password change on first login** for accounts seeded from
  `ADMIN_PASSWORD`. The `must_change_password` flag is set when the hash is
  seeded; `requireAuth` redirects to `/change-password` until cleared. Accounts
  created through the setup page skip this — the password was chosen by the
  operator, not the environment.
- **Single admin user.** No registration flow, no public signups, no API keys.

## First-run setup

A fresh install has no administrator and no default credential to guess. Until
one exists, every route redirects to `/setup`, and creating the account requires
a **one-time setup code** generated at startup and written to the container
logs. Someone who can reach the port but not the logs cannot claim the account.

- The code is 12 characters from a 30-symbol alphabet (~59 bits), drawn from
  `crypto.randomInt`, and excludes characters that are easy to misread.
- It lives for the lifetime of the process. A restart before setup completes
  issues a new one; finishing setup consumes it, so it can never be replayed.
- It is compared in constant time, after normalising case and dashes.
- `POST /setup` is rate limited to 5 attempts per 15 minutes, counting every
  attempt, and is protected by the same CSRF checks as every other form.
- Availability is decided per request from the presence of a password hash, so
  the route returns 404 the instant an account exists — including for requests
  already in flight — and stays closed across restarts.
- The account is claimed with a conditional insert inside a transaction, so two
  simultaneous submissions cannot both succeed.

Because the operator chooses the password directly, no password change is forced
afterwards.

## Unattended provisioning guard

Setting `ADMIN_PASSWORD` seeds the account from the environment and bypasses the
setup page. On that path, in production (`NODE_ENV=production`), the app refuses
to start if:

- `ADMIN_PASSWORD` is equal to `changeme`, **and**
- there is no existing password hash in `settings`.

This prevents the documented default from ever shipping live. Once the admin
hash exists in the database, subsequent restarts ignore `ADMIN_PASSWORD`
entirely. Accounts seeded this way are still forced to change their password on
first login.

## Session lifecycle

- **The session id is regenerated on every privilege transition** — after a
  successful login, after completing first-run setup, and after a password
  change. A session id fixed by an attacker before sign-in is therefore never
  valid afterwards.
- **A password change invalidates every session, everywhere.** All stored records
  are cleared and the user who made the change is issued a fresh one, so a
  stolen cookie on another device stops working the moment the password is
  rotated — and the person doing the rotating is not signed out by their own
  action. A *rejected* change (wrong current password) leaves sessions alone.
- **Logout destroys the server-side record and clears the client cookie**, so
  neither half of the pair survives.
- Session records that cannot be decoded fail closed — see
  [Session storage](#session-storage).

Because regeneration issues a new session identifier, CSRF tokens minted against
the previous one stop validating. That is intended: a page held open across a
password change must be reloaded before it can submit again.

## Audit log

Security-relevant actions are written to stdout as one JSON record per line, for
collection by Docker or journald. `auditLog` is in `src/services/audit.service.js`.

| Event | Raised when |
|---|---|
| `setup.success` | First-run administrator created |
| `setup.failure` | Setup rejected — reason is `invalid_code` or `invalid_input` |
| `setup.rejected` | Setup attempted after an administrator already exists |
| `login.success` / `login.failure` | Sign-in accepted / refused |
| `logout` | Session ended by the user |
| `password.change` | Administrator password changed |
| `session.invalidated_all` | Every session cleared, with the reason |
| `username.change` | Administrator username changed |
| `firearm.create` / `.update` / `.delete` / `.import` | Inventory changes |
| `photo.upload` / `.delete` | Photo attachment changes |
| `maintenance.create` / `.delete` | Maintenance log changes |
| `rangeSession.create` / `.delete` | Range session log changes |

### Never logged

These must not appear in any record, and are covered by tests:

- Passwords, in any form, and password hashes.
- The session secret, and the contents of a session record.
- Session identifiers and cookie values.
- Whether a rejected setup code was close to correct — `setup.failure` records
  only `invalid_code` or `invalid_input`.

The one-time setup code is the deliberate exception: `setup.code_issued` prints
it exactly once at startup, and only while an install has no administrator,
because the container log *is* how the operator receives it. It appears in no
other record, and never in one describing a setup attempt. Treat the startup log
of an un-configured instance as a credential.

`username` and `serial` are treated as sensitive by default and stripped unless
`AUDIT_VERBOSE=true`, so the standard log stream carries no inventory PII. Turn it
on deliberately, and only where the log destination is as protected as the data.

## Session storage

Sessions are stored server-side in the application SQLite database, in a
`sessions` table alongside the rest of your data.

- A restart or image upgrade keeps people signed in: the browser's existing
  cookie still resolves to a live record. Sessions previously lived in memory,
  so every restart logged everyone out.
- Each record holds a session id, a JSON payload, and an absolute expiry. Reads
  filter on expiry, so a lapsed record can never authenticate even before it is
  swept away.
- Logging out deletes the record. The cookie is dead immediately and stays dead
  across restarts — there is nothing left server-side to resolve it to.
- A record that cannot be decoded is discarded and treated as no session, so a
  corrupted row fails closed rather than authenticating anyone or 500ing.
- Payloads are capped (16 KB) so a request cannot bloat the database through the
  session.
- Expired rows are swept on a background interval that never runs on the request
  path, so no request waits for cleanup.

Because sessions live in the data volume, the same backup that protects your
inventory also protects your logins — and anyone who can read `app.db` can read
session records. Keep the data directory off shared storage.

## Session secret

The key that signs session cookies and keys CSRF tokens is generated by the app,
not supplied by the operator:

- On first start, 48 bytes from `crypto.randomBytes` are written to
  `<DATA_DIR>/session-secret` with mode `0600`, and reused on every later boot.
- The file is created with an **exclusive** open, so two processes starting at
  the same instant converge on one key rather than overwriting each other. The
  loser adopts the winner's key.
- A stored key is **validated before use**. It must be unpadded Base64URL
  (`A-Z a-z 0-9 - _`), at least 43 characters (256 bits), and contain at least
  16 distinct characters. Generated keys are 64 characters with ~30 distinct
  symbols, so they clear these bounds comfortably.
- If the file cannot be written, **startup fails**. The app never falls back to
  an in-memory key, because that would silently invalidate every session on each
  restart. The usual cause is a data volume the container user cannot write —
  fix it with `chown -R 1000:1000 /srv/ppcollection/data`.
- `SESSION_SECRET` remains available as an override for operators who manage
  keys themselves. Production still refuses to start if it is set to the
  published example value `ppcollection_dev_secret`.

### Invalid key files fail closed

An empty, truncated, malformed, or low-entropy `session-secret` file **stops the
boot**. The app does not replace it, and the file is left exactly as found.

This is deliberate. Silently generating a replacement would sign new sessions
with a different key, logging every user out and invalidating every CSRF token
with no explanation — turning a recoverable file problem into a mystery. Losing
the key should be an explicit decision, so the app reports the problem and lets
the operator choose. A `session_secret.invalid` record names the shape problem
(never the contents), and the startup error names the file and the three ways
out: restore it from a backup, delete it to have a new key generated (everyone
signs in again), or set `SESSION_SECRET`.

### Permission policy

Owner-only permissions are mandatory, not best-effort. A key other local users
can read is a key that can forge sessions.

- A file found group- or world-readable is reset to `0600`, and a
  `session_secret.permissions_repaired` warning is logged.
- If `0600` **cannot be applied** — a filesystem without Unix permissions, such
  as some bind mounts or exFAT — the app **fails closed** rather than leaving the
  key exposed. Move the data directory to a filesystem that supports permissions,
  or set `SESSION_SECRET` so no file is written at all.

To roll the key, delete `<DATA_DIR>/session-secret` and restart. Every existing
session is invalidated and users log in again.

## CSRF protection

- `csrf-csrf` double-submit cookie pattern. Token is set in a cookie and
  surfaced to templates as `res.locals.csrfToken`.
- Every state-changing form embeds the token in a hidden input; rejected
  requests render `errors/403.ejs`.

## Rate limiting

`express-rate-limit` is applied on:

| Endpoint | Limit |
|---|---|
| `POST /login` (failed only) | 10 per 15 min per IP |
| `POST /change-password` | 20 per 15 min per IP |

Successful logins do not count against the limit.

## Cookies

| Flag | Value |
|---|---|
| `httpOnly` | always |
| `sameSite` | `lax` |
| `Secure` | `true` when `NODE_ENV=production` (or when `SECURE_COOKIES=true`) |

## Reverse proxy

If you put the app behind nginx, Caddy, or Traefik with HTTPS:

| Your setup | What to set |
|---|---|
| HTTPS reverse proxy in front of the app | `TRUST_PROXY=true` |
| Plain HTTP in production (no TLS terminator) | `SECURE_COOKIES=false` |
| Both `NODE_ENV=production` and a TLS proxy | `TRUST_PROXY=true` and accept the default `SECURE_COOKIES=true` |
| Local dev at `http://localhost:3000` | Nothing — defaults are correct |

Without `TRUST_PROXY=true`, Express will see the proxied request as plain
HTTP, browsers will refuse to send the `Secure` cookie back, and sessions
will silently fail to persist.

### Example: nginx

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Pair with `TRUST_PROXY=true` on the app side.

## HTTP hardening

- `helmet` middleware with the default Content Security Policy enabled.
- `method-override` only honors the `_method` hidden form field — no query
  string overrides.
- Request logging via `morgan`; the `/health` endpoint is excluded.

## Audit logs

Login, logout, password change, and firearm create/update/delete/import events
are emitted as structured JSON on stdout. By default, usernames and serials
are redacted; set `AUDIT_VERBOSE=true` if you need them in the log.

Ship the container's stdout to your host log collector — `journalctl`, the
Docker `json-file` driver, Loki, etc.

## Input validation

`firearms.validators.js` enforces field length limits and numeric bounds
before anything reaches the repository layer. The repository layer is SQL only
and uses parameterized queries throughout. The `serial` column has a
database-level `UNIQUE` constraint, enforced for both form submission and CSV
import.

## What's intentionally out of scope

- Multi-user / role-based access control. Premium SaaS-style features are
  noted in the roadmap but not built into the core app.
- Network-level isolation. Run the app on a private network or behind a
  reverse proxy with auth in front if you want defense in depth.
- Encryption at rest. SQLite is plain on disk — encrypt the host volume if you
  need that.

See also: [Configuration](Configuration), [Upgrading](Upgrading).
