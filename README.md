# Pew Pew Collection

Self-hosted, offline-first firearm inventory app — track and manage a personal
collection locally with no cloud dependency. Node.js / Express + SQLite, no
build step, one Docker command to run.

[![Release](https://github.com/Gogorichielab/PPCollection/actions/workflows/Release.yml/badge.svg)](https://github.com/Gogorichielab/PPCollection/actions/workflows/Release.yml)
[![CI](https://github.com/Gogorichielab/PPCollection/actions/workflows/Ci.yml/badge.svg)](https://github.com/Gogorichielab/PPCollection/actions/workflows/Ci.yml)
![GitHub Release](https://img.shields.io/github/v/release/gogorichielab/PPCollection)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

![Dashboard](docs/screenshots/dashboard.png)

## What it does

- **Inventory CRUD** — add, edit, duplicate, and delete firearm records with
  make, model, serial, caliber, type, condition, status, location, purchase
  details, warranty, and notes
- **Disposition tracking** — records sold/lost/stolen items with transferee,
  date, and reason; included in CSV exports
- **Dashboard and stats** — recent activity, type/caliber/make breakdowns,
  acquisition trends, average price by year
- **Insurance report** — print-friendly inventory with total purchase value
- **Search, filter, sort** — real-time across all fields; mobile rows collapse
  to cards
- **CSV import & export** — round-trippable, with a template
- **Single-admin auth** — bcrypt-hashed password, forced change on first
  login, CSRF on every form
- **Fully offline** — zero internet at runtime; the GitHub Releases update
  check is opt-in
- **One SQLite file** — back up your whole collection with `cp`
- **Docker ready** — multi-arch image on GHCR

## Quick start

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

Open <http://localhost:3000> and log in. You will be prompted to change the
password on first login. Your data lives in `./data/app.db` on the host —
back up that directory to back up your collection.

> Use an absolute host path for the volume (or a named volume like
> `-v ppcollection_data:/data`). Docker treats a bare `./data` as an
> anonymous volume and discards it whenever the container is recreated.

## Documentation

Full docs live in the [wiki](https://github.com/Gogorichielab/PPCollection/wiki):

- **[Installation](https://github.com/Gogorichielab/PPCollection/wiki/Installation)** — Docker, Docker Compose, and from-source setups
- **[Configuration](https://github.com/Gogorichielab/PPCollection/wiki/Configuration)** — every environment variable, with production defaults
- **[Security](https://github.com/Gogorichielab/PPCollection/wiki/Security)** — reverse-proxy setup, `TRUST_PROXY`, secure cookies, CSRF, audit logs
- **[Operations](https://github.com/Gogorichielab/PPCollection/wiki/Operations)** — health probe, graceful shutdown, backup and restore
- **[Upgrading](https://github.com/Gogorichielab/PPCollection/wiki/Upgrading)** — version-specific notes (v2.0.0 secure-cookies default, v2.0.1 session-secret guard)
- **[Architecture](https://github.com/Gogorichielab/PPCollection/wiki/Architecture)** — code layout and request lifecycle
- **[Screenshots](https://github.com/Gogorichielab/PPCollection/wiki/Screenshots)** — full gallery
- **[FAQ](https://github.com/Gogorichielab/PPCollection/wiki/FAQ)** — common questions and recovery procedures

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Contributing page](https://github.com/Gogorichielab/PPCollection/wiki/Contributing)
in the wiki. The project uses `.github/CODEOWNERS` to request maintainer
review automatically, especially for GitHub Actions, Docker runtime files,
release configuration, and database migrations.

## License

Licensed under GNU GPL v3 or later — see [LICENSE](LICENSE).
