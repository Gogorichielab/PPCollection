# Upgrading

Pew Pew Collection follows semantic versioning. Patch releases are always safe
to take as a drop-in image swap. Minor releases never remove features. Major
releases call out breaking changes here.

## Standard upgrade (Docker)

```bash
docker pull ghcr.io/gogorichielab/ppcollection:latest
docker stop ppcollection
docker rm ppcollection
# re-run your original `docker run` (the volume keeps your data)
```

If you use Docker Compose:

```bash
docker compose pull
docker compose up -d
```

Migrations run automatically on boot. The `schema_migrations` table records
which files have been applied; never modify or rename a migration that has
shipped.

## Existing deployments

Existing deployments continue to work without configuration changes. The
v2.x guards only affect **new installations** that have never seeded an admin
account. If you've been running the app, your account hash is already stored
in `app.db` and no action is required.

## Version-specific notes

### v2.6.0 — zero-configuration first run; sessions survive restarts

Two changes ship together in this release.

**A fresh install creates its administrator through a `/setup` page**, using a
one-time code printed to the container logs, instead of `ADMIN_USERNAME` /
`ADMIN_PASSWORD`. Together with the generated session secret in v2.5.0, the app
starts with no environment variables at all:

```bash
docker run -d --name ppcollection -p 3000:3000 \
  -v /srv/ppcollection/data:/data --restart unless-stopped \
  ghcr.io/gogorichielab/ppcollection:latest
```

**Existing installations are unaffected.** If `app.db` already holds a password
hash, the setup page never appears and your username and password are unchanged.

`ADMIN_USERNAME` and `ADMIN_PASSWORD` remain supported for unattended installs:
setting `ADMIN_PASSWORD` seeds the account exactly as before and skips the setup
page. They are no longer required in Compose files or the documented `docker run`
command, and will be removed in a future major release.

One behaviour difference worth knowing: accounts created through the setup page
are **not** forced to change their password on first login, because the operator
chose it directly. Accounts seeded from `ADMIN_PASSWORD` still are.

**Sessions now live in the application database** instead of process memory, so a
container restart or image upgrade no longer signs everyone out. A `sessions`
table is added by migration `009_sessions.sql` on first boot; no existing data is
touched and no configuration changes.

Two things follow from that move:

- Anyone signed in when you upgrade will be signed out **once**, because the old
  in-memory sessions do not survive the restart that applies the upgrade. From
  then on, restarts preserve logins.
- Sessions are now part of your data volume. The backup that protects your
  inventory protects your logins too, and anyone who can read `app.db` can read
  session records — keep the data directory off shared storage.

Logging out deletes the server-side record, so a logged-out cookie stays dead
across restarts rather than only until the process ends.

### v2.5.0 — `SESSION_SECRET` is generated automatically

`SESSION_SECRET` is no longer required. When it is unset the app generates a
strong key on first start, writes it to `<DATA_DIR>/session-secret` with mode
`0600`, and reuses it on every later boot. This supersedes the v2.0.1 guard.

Nothing changes for existing deployments: if you already pass `SESSION_SECRET`,
it still wins and no file is written. To stop managing the key yourself, drop
the variable — the app generates one on the next start and everyone logs in
again once.

Two things to know before upgrading:

- The data directory must be writable by the container user (uid 1000). The app
  refuses to start rather than fall back to a throwaway key. If a root-owned
  bind mount has been working for you until now, fix it first with
  `chown -R 1000:1000 /srv/ppcollection/data`.
- `SESSION_SECRET=ppcollection_dev_secret` is still refused in production. That
  value is published in this repository, so any deployment using it should
  either unset the variable or replace it.

### v2.0.1 — `SESSION_SECRET` required in production

> Superseded by v2.5.0 — the secret is now generated for you.


The app refuses to start if `SESSION_SECRET` is unset or matches the
hard-coded default. Generate one with:

```bash
SESSION_SECRET="$(openssl rand -hex 32)"
```

### v2.0.0 — Secure cookies default; `ADMIN_PASSWORD` required for first-run

> The `ADMIN_PASSWORD` requirement is superseded by v2.6.0 — a fresh install
> now uses the setup page instead.

**Secure cookies.** Session and CSRF cookies now have the `Secure` flag
enabled by default when `NODE_ENV=production`. The published Docker image
always sets that. Before v2.0.0 the flag was opt-in.

| If you run the app... | What you need to do |
|---|---|
| Behind an HTTPS reverse proxy with `TRUST_PROXY=true` | Nothing. |
| Behind an HTTPS reverse proxy without `TRUST_PROXY` | Set `TRUST_PROXY=true` so Express honors the `X-Forwarded-Proto` header. |
| On plain HTTP in production (no TLS) | Add `SECURE_COOKIES=false` to restore plain cookies; otherwise sessions silently fail. |
| Locally (any non-production `NODE_ENV`) | No change. Default is still off. |

**`ADMIN_PASSWORD` required for first-run.** The app refuses to start on a
fresh install if `ADMIN_PASSWORD` is unset or `changeme`. Set a strong value
before the first boot:

```bash
ADMIN_PASSWORD="$(openssl rand -base64 24)"
```

This only applies to brand-new installs. Existing deployments with a hash
already in the database are unaffected.

## Backups before upgrading

```bash
docker exec ppcollection sqlite3 /data/app.db ".backup /data/app.db.bak"
cp ./data/app.db.bak /your/backup/location/
```

A patch upgrade should not need a rollback, but the database file is small
and the cost of a snapshot is near zero.

## Rolling back

Pin to the previous tag and redeploy:

```bash
docker pull ghcr.io/gogorichielab/ppcollection:vX.Y.Z
```

Schema migrations are forward-only. If you need to roll back across a
migration boundary, restore your pre-upgrade `app.db` from a snapshot.
