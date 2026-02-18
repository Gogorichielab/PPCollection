# Contributing to PPCollection

Thank you for your interest in contributing to PPCollection! This guide will help you get up and running quickly and make sure your contributions fit smoothly into the project.

---

## Where to Start

Check the [GitHub Issues](https://github.com/Gogorichielab/PPCollection/issues) page for open tasks. Issues tagged `good first issue` are a great starting point if you're new to the codebase.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm v10 or later
- [Docker](https://www.docker.com/) (optional, for container-based development)

---

## Local Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/PPCollection.git
cd PPCollection

# 2. Install dependencies
npm install

# 3. Generate a session secret
SESSION_SECRET=$(openssl rand -hex 32)

# 4. Set environment variables and start the app
export PORT=3000
export SESSION_SECRET="$SESSION_SECRET"
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=changeme
export DATABASE_PATH="$PWD/data/app.db"

npm start
```

Then open `http://localhost:3000` in your browser.

---

## Project Architecture

PPCollection follows a strict layered architecture. Please respect these boundaries when making changes:

```
src/
├── app/
│   ├── createApp.js          # App factory — wires all layers together
│   ├── middleware/           # Express middleware (auth, etc.)
│   └── routes/               # Route registration
├── features/
│   └── <feature>/
│       ├── <feature>.controller.js   # HTTP layer — req/res only
│       ├── <feature>.routes.js       # Route definitions
│       ├── <feature>.service.js      # Business logic
│       └── <feature>.validators.js   # Input sanitization
├── infra/
│   ├── config/               # Environment variable config
│   └── db/
│       ├── client.js         # SQLite connection
│       ├── migrate.js        # Migration runner
│       ├── migrations/       # SQL migration files (numbered, e.g. 001_*.sql)
│       └── repositories/     # Database access layer
├── shared/                   # Shared utilities
└── views/                    # EJS templates
```

**Key rules:**
- Controllers handle HTTP only — no business logic
- Services contain business logic — no direct database queries
- Repositories handle database access — SQL only, no business logic
- Do not add inline styles to EJS templates — use `src/public/css/styles.css`

---

## Testing

Run the full test suite before opening a PR:

```bash
npm test
```

**Test structure:**
- `tests/unit/` — unit tests for services and repositories
- `tests/integration/` — integration tests for routes and controllers

When adding a new feature, please include unit tests for any new service or repository functions. Integration tests are expected for new routes.

---

## CSS Conventions

- All styles belong in `src/public/css/styles.css` — do not add inline styles to EJS templates
- All mobile overrides must be added inside the existing `@media (max-width: 640px)` block at the bottom of `styles.css` — do not create additional media query blocks
- Always verify style changes in both dark and light mode
- There is no frontend build step — do not introduce bundlers or transpilers

---

## Database Migrations

- All schema changes must be a new numbered SQL file in `src/infra/db/migrations/` (e.g. `002_my_change.sql`)
- Never modify an existing migration file
- Never add columns via `ensureLegacyColumns` in `migrate.js` — this pattern is being phased out

---

## Development Workflow

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Add or update tests as needed
5. Commit using conventional commit messages (see below)
6. Push to your fork
7. Open a Pull Request

---

## Commit Message Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

### Format

```
<type>(<optional scope>): <short description>
```

### Types

| Type | Release | Use for |
|------|---------|---------|
| `feat` | minor | New features |
| `fix` | patch | Bug fixes |
| `style` | patch | CSS / formatting changes |
| `refactor` | patch | Code restructuring without behaviour change |
| `test` | patch | Adding or updating tests |
| `docs` | patch | Documentation only |
| `perf` | patch | Performance improvements |
| `ci` | patch | CI/CD changes |
| `chore` | none | Maintenance tasks with no release impact |

### Examples

```bash
feat(firearms): add status badge column to inventory table
fix(auth): redirect to login on expired session
style(mobile): stack action bar buttons on small viewports
refactor(migrate): move legacy columns to sql migration file
test(firearms): add unit tests for firearms service
```

### Breaking Changes

Add `BREAKING CHANGE:` in the commit footer to trigger a major release:

```bash
feat!: remove legacy API

BREAKING CHANGE: the /api/v1 endpoint has been removed
```

---

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Add or update tests for any behaviour changes
3. Update `README.md` if your change affects installation, configuration, or usage
4. Use conventional commit messages
5. Keep PRs focused — one logical change per PR
6. Wait for CI checks to pass
7. Reference any related issues in the PR description

---

## Release Process

Releases are automated using semantic-release:

- Merges to `main` trigger the release workflow
- Version numbers are determined from commit messages
- Changelogs are auto-generated — do not edit `CHANGELOG.md` manually
- Docker containers are built and published to GitHub Container Registry

### Automated Docker Container Publishing

Every merge to `main` triggers:

1. **Build**: Docker image is built using the latest code
2. **Tag**: Image is tagged with multiple identifiers:
   - Semantic version (e.g., `v1.0.0`, `1.0.0`, `1.0`, `1`)
   - Git SHA (e.g., `sha-abc123`)
   - Branch name (`main`)
   - `latest` tag
3. **Push**: Container is published to `ghcr.io/gogorichielab/ppcollection`

---

## Dependency Management

This project uses [Dependabot](https://docs.github.com/en/code-security/dependabot) to keep dependencies up to date:

- **npm packages**: Checked weekly on Mondays
- **GitHub Actions**: Checked weekly on Mondays
- **Docker base images**: Checked weekly on Mondays

Dependabot will automatically create pull requests for updates. Review and merge these PRs to keep dependencies current.

---

## Questions?

Feel free to open an issue for any questions or concerns!
