# Configuration

All configuration is via environment variables, read once at startup by
`src/infra/config/index.js`. The published Docker image always sets
`NODE_ENV=production`, which tightens several defaults.

## Reference table

| Variable | Purpose | Default | Notes |
|---|---|---|---|
| `PORT` | HTTP port the server listens on | `3000` | |
| `SESSION_SECRET` | Session + CSRF cookie signing key | `ppcollection_dev_secret` | **Required in production.** Generate with `openssl rand -hex 32`. Production refuses to start if unset or equal to the default. |
| `ADMIN_USERNAME` | Initial admin username | `admin` | Used to seed the local admin on first boot. Can be changed later from **Profile**. |
| `ADMIN_PASSWORD` | Initial admin password | `changeme` | **Required for first-run in production.** Hashed with bcrypt (cost 12) on first boot, then only the hash is kept. A change is forced on first login. |
| `DATABASE_PATH` | SQLite file location | `/data/app.db` in Docker, `<cwd>/data/app.db` otherwise | Must stay inside `DATA_DIR`. |
| `DATA_DIR` | Allowed base directory for database files | `/data` in Docker, `<cwd>/data` otherwise | Path-traversal guard for `DATABASE_PATH`. |
| `NODE_ENV` | Runtime mode | unset | `production` enables the first-run admin guard, the `SESSION_SECRET` guard, and secure-cookie defaults. |
| `TRUST_PROXY` | Honor `X-Forwarded-Proto` from a reverse proxy | `false` | Set to `true` behind nginx, Caddy, or Traefik. Without it, secure cookies will silently fail behind a TLS terminator. |
| `SECURE_COOKIES` | Force the `Secure` flag on session and CSRF cookies | `true` when `NODE_ENV=production`, else `false` | Set to `false` only for plain-HTTP production deployments. |
| `UPDATE_CHECK` | Opt-in GitHub Releases lookup | `false` | Cached for 14 days. The only outbound network call the app makes. |
| `AUDIT_VERBOSE` | Include username and serial in audit log lines | `false` | Keep disabled to minimize sensitive metadata on disk. |

## Production checklist

```bash
NODE_ENV=production
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -base64 24)
TRUST_PROXY=true            # if behind nginx/Caddy/Traefik over HTTPS
SECURE_COOKIES=true         # the production default; explicit doesn't hurt
UPDATE_CHECK=false          # leave off unless you want the GitHub call
```

The first three are mandatory. The rest depend on your deployment shape — see
[Security](Security).

## Development defaults

When `NODE_ENV` is unset (or anything other than `production`):

- `SESSION_SECRET` falls back to `ppcollection_dev_secret`. Fine for local dev,
  fatal in production.
- `SECURE_COOKIES` defaults to `false`, so cookies work over plain HTTP at
  `localhost:3000`.
- The first-run admin guard is relaxed. `admin` / `changeme` will seed the
  database. Change them in real deployments.

## How the app reads config

- `src/infra/config/index.js` parses `process.env` once at startup and exposes
  a `getConfig()` function. Nothing else reads `process.env` directly.
- The config layer warns when a misconfig is detected (e.g. `SECURE_COOKIES=true`
  without `TRUST_PROXY=true` behind a proxy).
- Sensitive values (`SESSION_SECRET`, `ADMIN_PASSWORD`) are never logged.

See also: [Security](Security), [Operations](Operations), [Upgrading](Upgrading).
