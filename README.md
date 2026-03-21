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
- **Dashboard** — Collection overview with recent activity feed, type breakdown chart, and purchase-value-by-year chart
- **Search & filter** — Real-time search across all fields; filter by status, condition, and firearm type; sort by any column
- **CSV export** — Download your entire inventory with one click
- **Bcrypt authentication** — Session-based login with bcrypt-hashed passwords and a forced password change on first login
- **Dark & light mode** — Theme preference persists per user across sessions
- **CSRF protection** — All forms protected via the double-submit cookie pattern
- **Fully offline** — Zero internet requirement at runtime; no telemetry, no external services
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

| Variable | Default | Description |
|---|---|---|
| `SESSION_SECRET` | `ppcollection_dev_secret` | **Required in production.** Generate with `openssl rand -hex 32` |
| `ADMIN_USERNAME` | `admin` | Username for the admin account |
| `ADMIN_PASSWORD` | `changeme` | Initial password — a change is forced on first login |
| `PORT` | `3000` | HTTP port the server listens on |
| `DATABASE_PATH` | `/data/app.db` | Path to the SQLite database file |

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
