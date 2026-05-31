# Contributing

Thanks for considering a contribution. The canonical contributor guide lives
in the repo at
[CONTRIBUTING.md](https://github.com/Gogorichielab/PPCollection/blob/main/CONTRIBUTING.md);
this page is a higher-level overview.

## Before you start

- **File an issue first** for anything non-trivial. A short discussion up
  front avoids reworking a PR that has the wrong shape.
- **Stay inside the project values.** Privacy, offline-first, self-hosted
  simplicity. See [Home](Home) and the project's `CLAUDE.md` / `AGENTS.md`
  for the long form.
- **Don't add a build step.** No bundlers, no transpilers, no frontend
  frameworks. Plain CSS, vanilla JS, server-rendered EJS.

## Local development

Requires Node.js `>=20.0.0 <25.0.0` (the repo pins Node 20 via `.nvmrc`).

```bash
git clone https://github.com/Gogorichielab/PPCollection.git
cd PPCollection
nvm use
npm ci
npm run dev
```

The dev server runs at <http://localhost:3000>. SQLite is created at
`./data/app.db`; migrations run automatically on boot.

## Tests

| Command | What it does |
|---|---|
| `npm test` | Unit + integration, no coverage |
| `npm run test:unit` | Unit only |
| `npm run test:integration` | Integration only |
| `npm run test:ci` | Coverage + thresholds (what CI runs) |
| `npm run test:watch` | TDD loop |
| `npm run lint` | ESLint over `src` and `tests` |

`--runInBand` is mandatory — SQLite + Jest deadlock if you parallelize.
The npm scripts already pass it.

Coverage thresholds (enforced in `test:ci`):

- statements / lines / functions ≥ 90%
- branches ≥ 75%

## Where to put a test

- `tests/unit/` — pure logic, single repository, or a single service in
  isolation.
- `tests/integration/` — anything that needs the full Express app via
  Supertest.

## Architecture rules

- Controllers → services → repositories → SQL. Don't shortcut the layers.
- No inline styles in EJS. Use `src/public/css/styles.css`.
- Mobile overrides go inside the existing `@media (max-width: 640px)` block.
  Don't add new media query blocks.
- New schema goes in a new numbered migration file under
  `src/infra/db/migrations/`. Never edit a migration that has shipped.

See [Architecture](Architecture) for the full layout.

## Commit convention

Semantic Release with conventional commits:

```
<type>(<scope>): <description>
```

| Type | Release | Use for |
|---|---|---|
| `feat` | minor | New features |
| `fix` | patch | Bug fixes |
| `style` | patch | CSS / formatting |
| `refactor` | patch | Restructuring without behaviour change |
| `perf` | patch | Performance improvements |
| `test` | patch | Tests |
| `docs` | patch | Documentation |
| `ci` | patch | CI/CD changes |
| `chore` | none | Maintenance |

`BREAKING CHANGE:` in the footer triggers a major release.

## What CI checks

Every PR to `main` runs:

- ESLint
- `npm run test:ci` with coverage gates
- `npm audit --audit-level=high --omit=dev`
- Trivy filesystem CVE scan (fails on HIGH / CRITICAL fixable issues)
- Hadolint Dockerfile lint (threshold `error`)
- CodeQL via GitHub's default Code Scanning setup

Coverage reports are uploaded as a workflow artifact.

## Releases

- `release.yml` runs semantic-release on merge to `main`. It opens a release
  PR with the version bump and changelog; once merged, it builds and pushes
  the multi-arch image to `ghcr.io/gogorichielab/ppcollection` and tags the
  GitHub release.
- Maintainers don't tag by hand. Conventional commits drive the version.

## Filing a good issue

- Version (`docker inspect` or `/health`)
- How you're running it (Docker run line, Compose file, behind a proxy?)
- What you expected vs. what happened
- Relevant lines from the container log (redact serials if you don't have
  `AUDIT_VERBOSE` off)
