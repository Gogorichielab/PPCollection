# Configuration

All configuration is via environment variables, read once at startup by
`src/infra/config/index.js`. The published Docker image always sets
`NODE_ENV=production`, which tightens several defaults.

## Reference table

| Variable | Purpose | Default | Notes |
|---|---|---|---|
| `PORT` | HTTP port the server listens on | `3000` | |
| `SESSION_SECRET` | Session + CSRF cookie signing key | generated on first start | **Optional.** Leave unset and the app generates a strong key and stores it at `<DATA_DIR>/session-secret` (mode `0600`), reusing it across restarts and upgrades. Set it only to manage the key yourself. Production still refuses the published example value `ppcollection_dev_secret`. |
| `ADMIN_USERNAME` | Initial admin username for the unattended path | `admin` | Only read when `ADMIN_PASSWORD` is also set. Otherwise the username is chosen on the setup page. Can be changed later from **Profile**. |
| `ADMIN_PASSWORD` | Initial admin password | unset | **Optional.** Leave unset to create the administrator through the first-run setup page. Setting it seeds the account from the environment instead, skipping setup: hashed with bcrypt (cost 12) on first boot, then only the hash is kept, and a change is forced on first login. Production refuses to start if it is set to `changeme`. |
| `DATABASE_PATH` | SQLite file location | `/data/app.db` in Docker, `<cwd>/data/app.db` otherwise | Must stay inside `DATA_DIR`. |
| `DATA_DIR` | Base data directory | `/data` in Docker, `<cwd>/data` otherwise | Holds the database (including server-side sessions), `photos/`, and the generated `session-secret`. Also the path-traversal guard for `DATABASE_PATH`. Must be writable by the container user (uid 1000). |
| `NODE_ENV` | Runtime mode | unset | `production` enables the default-password guard and secure-cookie defaults. |
| `TRUST_PROXY` | Honor `X-Forwarded-Proto` from a reverse proxy | `false` | Set to `true` behind nginx, Caddy, or Traefik. Without it, secure cookies will silently fail behind a TLS terminator. |
| `SECURE_COOKIES` | Force the `Secure` flag on session and CSRF cookies | `true` when `NODE_ENV=production`, else `false` | Set to `false` only for plain-HTTP production deployments. |
| `UPDATE_CHECK` | Opt-in GitHub Releases lookup | `false` | Cached for 14 days. The only outbound network call the app makes. |
| `AUDIT_VERBOSE` | Include username and serial in audit log lines | `false` | Keep disabled to minimize sensitive metadata on disk. |

## Production checklist

```bash
NODE_ENV=production
TRUST_PROXY=true            # if behind nginx/Caddy/Traefik over HTTPS
SECURE_COOKIES=true         # the production default; explicit doesn't hurt
UPDATE_CHECK=false          # leave off unless you want the GitHub call
```

Nothing is mandatory. The session key is generated for you and the administrator
is created through the [first-run setup page](Installation#first-run-setup).
The settings above depend only on your deployment shape — see
[Security](Security).

To provision without touching a browser, set `ADMIN_USERNAME` and
`ADMIN_PASSWORD` instead; the account is seeded from the environment and the
setup page never appears.

## Development defaults

When `NODE_ENV` is unset (or anything other than `production`):

- `SESSION_SECRET` is generated into `./data/session-secret` on first run, the
  same as in production. Delete that file to roll the key.
- `SECURE_COOKIES` defaults to `false`, so cookies work over plain HTTP at
  `localhost:3000`.
- The default-password guard is relaxed, so `ADMIN_PASSWORD=changeme` will seed
  the database. Change it in real deployments, or leave `ADMIN_PASSWORD` unset
  and use the setup page as production does.

## How the app reads config

- `src/infra/config/index.js` parses `process.env` once at startup and exposes
  a `getConfig()` function. Nothing else reads `process.env` directly.
- The config layer warns when a misconfig is detected (e.g. `SECURE_COOKIES=true`
  without `TRUST_PROXY=true` behind a proxy).
- `src/infra/config/session-secret.js` resolves the signing key: `SESSION_SECRET`
  when set, otherwise the stored key, otherwise a newly generated one. It aborts
  startup instead of falling back to an in-memory key, so a key never silently
  changes out from under live sessions.
- Sensitive values (`SESSION_SECRET`, `ADMIN_PASSWORD`) are never logged.

See also: [Security](Security), [Operations](Operations), [Upgrading](Upgrading).
