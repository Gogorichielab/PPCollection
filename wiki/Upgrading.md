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

### v2.5.1 — stored session keys are validated on start

The generated `session-secret` file is now checked before use. It must be
unpadded Base64URL, at least 43 characters, and contain at least 16 distinct
characters. Keys this app generated (64 characters) pass unchanged, so a normal
upgrade needs no action.

What changed is the response to a **bad** file. Previously an empty or truncated
key was silently replaced; now it stops the boot with the problem named and the
file left untouched. Silent replacement logged every user out with no
explanation, which made a recoverable file problem look like data loss.

This only affects you if you hand-wrote a short key into the file yourself. If
the app refuses to start after upgrading, either delete the file (a new key is
generated and everyone signs in again) or set `SESSION_SECRET` to that value
instead — see [the FAQ](FAQ#the-app-refuses-to-start-with-refusing-to-start-with-the-session-secret).

Owner-only permissions are now mandatory rather than best-effort: if `0600`
cannot be applied to the key file, startup fails instead of leaving it readable
by other users on the host.

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
