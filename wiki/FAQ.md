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

## Do I still need to set `SESSION_SECRET`?

No. If it is unset the app generates a strong key on first start and stores it
at `<DATA_DIR>/session-secret` with owner-only permissions, reusing it across
restarts and upgrades. Set the variable only if you want to manage the key
yourself. See [Security → Session secret](Security#session-secret).

## The app refuses to start with "Could not persist the session secret"

The data directory is not writable by the container user. The app deliberately
fails rather than fall back to a throwaway key that would log everyone out on
every restart. The image runs as uid 1000, so a bind-mounted host directory
created by root needs:

```bash
chown -R 1000:1000 /srv/ppcollection/data
```

The error message names the exact path it tried to write.

## The app refuses to start with "Refusing to start with the session secret"

The stored `session-secret` file exists but does not hold a usable key — it is
empty, truncated, contains characters outside Base64URL, or is too short or too
repetitive to be randomly generated. The error names the specific problem.

The app deliberately does **not** replace it, because generating a new key would
log every user out without explaining why. Pick one:

1. **Restore the file** from a backup of your data directory, if the original key
   still matters to you.
2. **Delete it** and restart — a fresh key is generated and everyone signs in
   again:

   ```bash
   docker compose down
   rm /srv/ppcollection/data/session-secret
   docker compose up -d
   ```

3. **Set `SESSION_SECRET`** to manage the key yourself. No file is read or
   written in that case, so it also works as an immediate way out.

Your inventory is untouched either way — the key only signs sessions and CSRF
tokens, never your data.

## The app refuses to start with "Could not restrict permissions"

The data directory is on a filesystem that cannot apply Unix permissions (some
bind mounts, exFAT, certain network shares), so the session key cannot be made
owner-only. The app fails rather than leaving a session-forging key readable by
other users on the host. Move the data directory to a filesystem that supports
permissions, or set `SESSION_SECRET` so no key file is written.

## How do I rotate the session secret?

Stop the container, delete `<DATA_DIR>/session-secret`, and start it again. A
fresh key is generated on the next boot and every existing session is
invalidated, so you will log in again. Setting `SESSION_SECRET` to a new value
has the same effect without touching the file.

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
   on next login. Leave `session-secret` alone; deleting it only logs out any
   live sessions.

## Can I import my existing inventory?

Yes — the importer accepts CSV. Download the template from **Inventory →
Import CSV**, fill it in, and upload. Disposition fields round-trip with
the exporter.

## How does the maintenance log work?

Each firearm has a dedicated Maintenance Log section on its detail page. You
can log cleaning, repair, and part-replacement entries with a type, date, and
optional notes. A firearm is flagged **due for cleaning** when its most recent
cleaning entry is older than the configurable threshold (set on your Profile
page, default 90 days), or when a new range session is logged after the last
cleaning. Overdue firearms appear in the cleaning-due list on the dashboard.

## How do range sessions work?

The Range Sessions section on the firearm detail page lets you log trips to
the range — date, location, rounds fired, and notes. Lifetime rounds fired are
tallied automatically. Range sessions also factor into the cleaning-due
calculation: if you fire a gun after the last cleaning, it becomes due again.

## How do photo attachments work?

Each firearm supports up to 12 photo attachments (JPEG, PNG, WebP, or GIF,
up to 10 MB each). Upload from the Photos section on the firearm detail page.
Images are stored locally in the data volume at `/data/photos` and are never
accessible without authentication. Deleting a photo or its parent firearm also
removes the file from disk. Back up the entire `data/` directory (database
and photos) rather than just `app.db` if you use photo attachments. See
[Operations → Backup and restore](Operations#backup-and-restore).

## Are there mobile apps?

No. The web UI is responsive and works in mobile browsers. Inventory rows
collapse into cards under 640px wide.

## How do I report a bug or request a feature?

Open an issue at <https://github.com/Gogorichielab/PPCollection/issues>.
See [Contributing](Contributing) for guidelines.
