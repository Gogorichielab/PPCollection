# Security

Pew Pew Collection is designed for a single trusted operator running on
hardware they control. The security model is centered on protecting the local
admin session, not on multi-tenant isolation.

## Authentication

- **Bcrypt password hashing** at cost 12. `auth.service.js` uses
  `bcrypt.compare` / `bcrypt.hash`. The plain `ADMIN_PASSWORD` env var is only
  read on the very first boot to seed the hash.
- **Forced password change on first login.** The `must_change_password` flag
  is set when the hash is seeded; `requireAuth` redirects to
  `/change-password` until cleared.
- **Single admin user.** No registration flow, no public signups, no API keys.

## First-run guard

In production (`NODE_ENV=production`), the app refuses to start if:

- `ADMIN_PASSWORD` is unset or equal to `changeme`, **and**
- there is no existing password hash in `settings`.

This prevents the default credential from ever shipping live. Once the admin
hash exists in the database, subsequent restarts no longer need
`ADMIN_PASSWORD` set.

## Session secret guard

The app refuses to start in production if `SESSION_SECRET` is unset or equals
the documented default (`ppcollection_dev_secret`). Generate one with:

```bash
openssl rand -hex 32
```

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
