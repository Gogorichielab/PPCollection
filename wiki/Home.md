# Pew Pew Collection Wiki

**Pew Pew Collection** is a self-hosted, offline-first web app for managing a
personal firearm inventory. Your data lives on your machine — no cloud, no
telemetry, no accounts beyond the single local admin user.

This wiki is the long-form documentation for installing, configuring, securing,
and operating the app. The repo [README](https://github.com/Gogorichielab/PPCollection/blob/main/README.md)
keeps just the elevator pitch and a 60-second Docker quick start.

---

## Getting started

- **[Installation](Installation)** — Docker, Docker Compose, and from-source
  setups, plus the data volume layout and backup model.
- **[Quick Start](Installation#docker-one-liner)** — copy/paste Docker command
  to get running in under a minute.
- **[First-run checklist](Installation#first-run-checklist)** — what the
  app prompts you for the first time you log in.

## Running it well

- **[Configuration](Configuration)** — every environment variable, what it
  does, and what changes between development and production defaults.
- **[Security](Security)** — secure cookies, reverse-proxy guidance,
  `TRUST_PROXY`, CSRF, rate limiting, and audit logs.
- **[Operations](Operations)** — health probe, container healthcheck,
  graceful shutdown, audit log format, and backup/restore.
- **[Upgrading](Upgrading)** — version-specific upgrade notes, including the
  v2.0.0 secure-cookies default and the v2.0.1 `SESSION_SECRET` guard.

## Reference

- **[Architecture](Architecture)** — the layered structure: routes →
  controllers → services → repositories → SQLite.
- **[Screenshots](Screenshots)** — full gallery of dashboard, inventory,
  stats, insurance report, and the firearm detail view.
- **[FAQ](FAQ)** — answers to the questions that come up most often.
- **[Contributing](Contributing)** — how to file issues, propose changes,
  and what the CI pipeline checks before a PR can land.

## Project links

- Source: <https://github.com/Gogorichielab/PPCollection>
- Container image: `ghcr.io/gogorichielab/ppcollection`
- Issues: <https://github.com/Gogorichielab/PPCollection/issues>
- License: [Business Source License 1.1](https://github.com/Gogorichielab/PPCollection/blob/main/LICENSE) — free for personal, non-commercial, self-hosted use; conversion to Apache 2.0 is defined in the LICENSE text
