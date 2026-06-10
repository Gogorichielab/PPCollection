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
>
> **Important when updating:** reuse the exact same host directory or named
> volume every time you recreate the container. If the app asks you to change the
> initial admin password again after an update, it is almost always running
> against a new empty `/data` mount instead of your existing `app.db`. Stop the
> container and restore the previous mount before adding new records.

### Docker update data check

If an updated container looks like a brand-new install, do **not** complete the
first-run password flow or add new inventory yet. That means the container is
not seeing the same SQLite file it used before the update. Check the active
mount and database file first:

```bash
docker inspect ppcollection --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
ls -lh ./data/app.db
```

For Docker Compose, run updates from the same directory that owns the original
`./data` folder, or change the compose file to an absolute bind mount such as
`/srv/ppcollection/data:/data`. For `docker run`, always reuse the same
absolute bind mount (`-v /srv/ppcollection/data:/data`) or the same named volume
(`-v ppcollection_data:/data`). Recreating the container without that mount
creates a fresh database at `/data/app.db`, which makes the app correctly behave
like a first-time install.

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

Licensed under the [Business Source License 1.1](LICENSE). Personal, non-commercial, self-hosted use is permitted at no charge. The license converts to Apache 2.0 on 2029-05-13.
