# Pew Pew Collection

Pew Pew Collection (PPCollection) is a self-hosted, offline-first firearm inventory app for tracking and managing a personal collection locally with no cloud dependency, built with Node.js/Express and SQLite.

[![Release](https://github.com/Gogorichielab/PPCollection/actions/workflows/Release.yml/badge.svg)](https://github.com/Gogorichielab/PPCollection/actions/workflows/Release.yml)
[![CI](https://github.com/Gogorichielab/PPCollection/actions/workflows/Ci.yml/badge.svg)](https://github.com/Gogorichielab/PPCollection/actions/workflows/Ci.yml)
![GitHub Release](https://img.shields.io/github/v/release/gogorichielab/PPCollection)
![GitHub License](https://img.shields.io/github/license/gogorichielab/PPCollection)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

![Dashboard](docs/screenshots/dashboard.png)

## Features

- **Full inventory CRUD** — Add, edit, duplicate, and delete firearm records with make, model, serial, caliber, type, condition, status, location, purchase details, warranty, and notes
- **Disposition tracking** — Records sold/lost/stolen firearms with transferee name, address, date, and reason; disposition fields are included in CSV exports
- **Dashboard** — Collection overview with recent activity feed, type breakdown chart, and purchase-value-by-year chart
- **Search & filter** — Real-time search across all fields; filter by status, condition, and firearm type; sort by any column
- **CSV export & import** — Download your entire inventory with one click, or bulk-import records from a CSV file (template provided)
- **Bcrypt authentication** — Session-based login with bcrypt-hashed passwords and a forced password change on first login
- **Profile management** — Update username, change password, and toggle display preferences from the profile page
- **Dark & light mode** — Theme preference persists per user across sessions
- **CSRF protection** — All forms protected via the double-submit cookie pattern
- **Fully offline** — Zero internet requirement at runtime; no telemetry, no external services
- **Optional update notifications** — Opt-in check against GitHub Releases (14-day cached); disabled by default
- **Single SQLite file** — All data in one portable file; backup with a single `cp` command
- **Docker ready** — Up and running in under 60 seconds from GHCR

## Quick Start (Docker)

```bash
docker run -d \
  --name ppcollection \
  -p 3000:3000 \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=YourSecurePassword \
  -v ./data:/data \
  --restart unless-stopped \
  ghcr.io/gogorichielab/ppcollection:latest
```

Open `http://localhost:3000`. On first login you will be prompted to change the default password.

## Configuration

| Variable | Purpose | Default | Notes |
|---|---|---|---|
| `SESSION_SECRET` | Session signing secret | `ppcollection_dev_secret` | **Required in production.** Generate with `openssl rand -hex 32` |
| `ADMIN_USERNAME` | Username for the admin account | `admin` | Used for initial login |
| `ADMIN_PASSWORD` | Initial admin password | `changeme` | **Required in production for first-run.** A change is forced on first login. The app refuses to seed a fresh deployment with the documented default. |
| `PORT` | HTTP port the server listens on | `3000` | Runtime server port |
| `DATABASE_PATH` | Path to the SQLite database file | `/data/app.db` | Defaults to `/data` in Docker |
| `TRUST_PROXY` | Trust `X-Forwarded-Proto` from a reverse proxy | `false` | Set to `true` when running behind nginx, Caddy, or Traefik |
| `SECURE_COOKIES` | Set the `Secure` flag on session cookies | `false` | Requires `TRUST_PROXY=true`; only enable when HTTPS is in use |
| `UPDATE_CHECK` | Check GitHub Releases for new versions | `false` | Set to `true` to enable in-app update notifications; results are cached for 14 days |

## Security Notes

> **Reverse proxy users:** If you are running PPCollection behind nginx,
> Caddy, or Traefik with HTTPS, set `TRUST_PROXY=true` and
> `SECURE_COOKIES=true` to enable full cookie security. Do not set
> `SECURE_COOKIES=true` without a working HTTPS reverse proxy — sessions
> will silently break.

> **`ADMIN_PASSWORD` is required for first-run in production.** When
> `NODE_ENV=production` (which is the default in the published Docker
> image), the app refuses to start if `ADMIN_PASSWORD` is unset or
> matches the documented default of `changeme`. Existing deployments
> are unaffected — the env var is only used to seed the bcrypt hash on
> first run, so once your `app.db` has been seeded the value is no
> longer read at startup. Upgrading users will see the warning in the
> startup log but the app will keep running.

## Upgrading

Existing deployments continue to work without configuration changes.
The first-run `ADMIN_PASSWORD` guard introduced in v2.x only affects
deployments that have **never seeded** an admin account — practically,
that means new installations. If you've been running the app, your
admin account hash is already stored in `app.db`, the env var is no
longer consulted at startup, and no action is required.

If you are starting fresh (no `app.db`), set `ADMIN_PASSWORD` to a
strong value before the first start:

```bash
ADMIN_PASSWORD="$(openssl rand -base64 24)"
```

## Screenshots

| Inventory | Firearm Detail |
|---|---|
| ![Inventory](docs/screenshots/inventory.png) | ![Firearm Detail](docs/screenshots/firearm-detail.png) |

| Add Firearm | Profile |
|---|---|
| ![Add Firearm](docs/screenshots/add-firearm.png) | ![Profile](docs/screenshots/profile.png) |

## Documentation

Full documentation: [https://gogorichielab.github.io/PPCollection/](https://gogorichielab.github.io/PPCollection/)

## Contributing

Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)

## License

Licensed under GNU GPL v3 or later: [LICENSE](LICENSE)
