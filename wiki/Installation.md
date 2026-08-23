# Installation

Pew Pew Collection ships as a multi-arch container image published to GHCR.
Docker is the supported install path; the from-source workflow exists for
contributors.

## Docker (one-liner)

```bash
docker run -d \
  --name ppcollection \
  -p 3000:3000 \
  -v /srv/ppcollection/data:/data \
  --restart unless-stopped \
  ghcr.io/gogorichielab/ppcollection:latest
```

Open <http://localhost:3000>. On a fresh install it redirects to the setup page,
where you create your administrator account using the one-time code printed in
the container logs (`docker logs ppcollection`). See
[First-run setup](#first-run-setup) below.

> **Your data lives in the mounted directory on the host** — `app.db`, the
> `photos/` folder, and the generated `session-secret`. The bind mount is what
> persists your inventory across container updates. Back up that one directory
> to back up your collection. `docker run` requires an absolute host path — a
> bare `./data` is interpreted as an anonymous volume, which Docker discards
> every time the container is recreated. If you prefer a managed volume instead
> of a host directory, use `-v ppcollection_data:/data`.
>
> **No environment variables are required.** The app generates its own session
> key on first start and stores it in the data directory, and the administrator
> is created through the setup page. Because it refuses to fall back to a
> throwaway key, a bind-mounted host directory must be writable by the container
> user (uid 1000): `chown -R 1000:1000 /srv/ppcollection/data`.

## Docker Compose

```yaml
services:
  ppcollection:
    image: ghcr.io/gogorichielab/ppcollection:latest
    container_name: ppcollection
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    stop_grace_period: 15s
```

Bring it up and read the setup code:

```bash
docker compose up -d
docker compose logs ppcollection
```

## From source (contributors)

Requires Node.js `>=20.0.0 <25.0.0`. The repo pins Node 20 via `.nvmrc`.

```bash
git clone https://github.com/Gogorichielab/PPCollection.git
cd PPCollection
nvm use            # picks up .nvmrc
npm ci
npm run dev        # or: npm start
```

The dev server runs at <http://localhost:3000>. The SQLite database is created
at `./data/app.db` and migrations run automatically on boot.

## First-run setup

1. Start the container with no credentials. `SESSION_SECRET` is generated
   automatically — see [Session secret](Security#session-secret).
2. Open <http://localhost:3000>. Every route redirects to `/setup` until an
   administrator exists.
3. Read the one-time setup code from the container logs:

   ```bash
   docker logs ppcollection
   ```

   It is printed in a banner and as a `setup.code_issued` log record. The code
   is valid until setup completes or the container restarts; a restart simply
   prints a new one.
4. Enter the code and choose your username and password (minimum 12
   characters). The account is hashed with bcrypt at cost 12, you are signed in
   immediately, and `/setup` returns 404 from then on — permanently, across
   restarts and upgrades.
5. From **Profile**, optionally change the username, toggle the theme, and
   enable update notifications.

### Unattended installs

To provision without a browser, set `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The
account is seeded from the environment on first boot, the setup page never
appears, and a password change is forced on first login. Production refuses to
start if `ADMIN_PASSWORD` is `changeme` — see
[Unattended provisioning guard](Security#unattended-provisioning-guard).

### Existing installations

An install that already has an administrator skips all of this. The setup page
is never shown, and existing databases, usernames, and passwords are untouched.

## Reverse proxy

If you put the app behind nginx, Caddy, or Traefik with HTTPS, set
`TRUST_PROXY=true`. The [Security page](Security#reverse-proxy) covers the
full reverse-proxy configuration matrix.

## Backups

The entire inventory lives in `data/app.db`. To back up:

```bash
docker exec ppcollection sqlite3 /data/app.db ".backup /data/app.db.bak"
cp ./data/app.db.bak /your/backup/location/
```

A plain `cp` of the file works when the container is stopped. While the
container is running, prefer the `.backup` form above so SQLite quiesces
writes before copying.
