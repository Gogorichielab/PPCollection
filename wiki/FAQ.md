# FAQ

## Is my data sent anywhere?

No. The app runs entirely on your machine, against a local SQLite file. The
only outbound network call the app can make is the optional GitHub Releases
update check, which is **off** by default and must be enabled with
`UPDATE_CHECK=true`. There is no telemetry, no analytics, and no
phone-home.

## Where is my data stored?

In `data/app.db` on the host. With the recommended Docker run line, that's
`./data/app.db` in your current working directory at the time you ran the
container. To back up your collection, back up that file. See
[Operations → Backup and restore](Operations#backup-and-restore).

## Can I run this without Docker?

Yes — see [Installation → From source](Installation#from-source-contributors).
Docker is the supported path, but a `node`-based install works too.

## Why SQLite instead of Postgres / MySQL?

SQLite fits the project's offline-first, single-operator model. One file is
trivial to back up, restore, and version. There is no separate database
process to run, secure, or upgrade. Postgres would add operational surface
area without adding value for a personal inventory.

## Can multiple people use the same instance?

Not as of today. The auth model is a single local admin. Multi-user / RBAC
is on the [roadmap](Home#project-links) but isn't built into the core app.
A workaround is to run separate containers per user, each with their own
data volume.

## Can I host this on the public internet?

You can, but always put it behind an HTTPS reverse proxy and set
`TRUST_PROXY=true`. The auth model is built for a single trusted operator;
exposing it directly to the internet without TLS or proxy-level
authentication is not recommended. See [Security → Reverse
proxy](Security#reverse-proxy).

## Sessions aren't sticking when I log in behind nginx / Caddy / Traefik

You almost certainly need `TRUST_PROXY=true`. Without it, Express sees the
proxied request as plain HTTP, the browser refuses to send `Secure` cookies
back, and your session is silently dropped on every request. See
[Upgrading → v2.0.0](Upgrading#v200--secure-cookies-default-admin_password-required-for-first-run).

## The app refuses to start with "SESSION_SECRET is required"

Set `SESSION_SECRET` to a random 32-byte string:

```bash
SESSION_SECRET="$(openssl rand -hex 32)"
```

The production guard refuses to boot with the documented default. See
[Security → Session secret guard](Security#session-secret-guard).

## The app refuses to start with "ADMIN_PASSWORD must be changed"

You're on a fresh install and `ADMIN_PASSWORD` is unset or `changeme`. Set a
strong value before the first boot:

```bash
ADMIN_PASSWORD="$(openssl rand -base64 24)"
```

This only blocks brand-new installs — existing deployments with a hash
already in `app.db` are unaffected.

## I forgot the admin password

Stop the container, then either:

1. Restore an `app.db` backup taken before you lost the password, or
2. Open `app.db` with the `sqlite3` CLI and delete the
   `password_hash` row from the `settings` table, then start the app with
   `ADMIN_PASSWORD` set — the app will re-seed and force a password change
   on next login.

## Can I import my existing inventory?

Yes — the importer accepts CSV. Download the template from **Inventory →
Import CSV**, fill it in, and upload. Disposition fields round-trip with
the exporter.

## Are there mobile apps?

No. The web UI is responsive and works in mobile browsers. Inventory rows
collapse into cards under 640px wide.

## How do I report a bug or request a feature?

Open an issue at <https://github.com/Gogorichielab/PPCollection/issues>.
See [Contributing](Contributing) for guidelines.
