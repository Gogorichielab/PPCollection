# Installation

Pew Pew Collection ships as a multi-arch container image published to GHCR.
Docker is the supported install path; the from-source workflow exists for
contributors.

## Docker (one-liner)

```bash
docker run -d \
  --name ppcollection \
  -p 3000:3000 \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=YourSecurePassword \
  -v "$(pwd)/data:/data" \
  --restart unless-stopped \
  ghcr.io/gogorichielab/ppcollection:latest
```

Open <http://localhost:3000> and log in with the username and password you
supplied. The app will force a password change before letting you continue.

> **Your data lives in `./data/app.db` on the host.** The `-v "$(pwd)/data:/data"`
> bind mount is what persists your inventory across container updates. Back up
> the `data/` directory to back up your collection. `docker run` requires an
> absolute host path — a bare `./data` is interpreted as an anonymous volume,
> which Docker discards every time the container is recreated. If you prefer a
> managed volume instead of a host directory, use `-v ppcollection_data:/data`.

## Docker Compose

```yaml
services:
  ppcollection:
    image: ghcr.io/gogorichielab/ppcollection:latest
    container_name: ppcollection
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      SESSION_SECRET: ${SESSION_SECRET}
      ADMIN_USERNAME: admin
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    volumes:
      - ./data:/data
    stop_grace_period: 15s
```

Generate secrets and bring it up:

```bash
export SESSION_SECRET="$(openssl rand -hex 32)"
export ADMIN_PASSWORD="$(openssl rand -base64 24)"
docker compose up -d
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

## First-run checklist

1. The container or process must start with `SESSION_SECRET` and
   `ADMIN_PASSWORD` set to non-default values when `NODE_ENV=production`. The
   app refuses to boot otherwise — this is the [first-run guard](Security#first-run-guard).
2. Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`. The app immediately
   redirects to `/change-password`.
3. Set a new password (bcrypt cost 12). The `must_change_password` flag is
   cleared and you land on the dashboard.
4. From **Profile**, optionally change the username, toggle the theme, and
   enable update notifications.

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
