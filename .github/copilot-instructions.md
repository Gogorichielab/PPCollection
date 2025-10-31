# Copilot Instructions for PPCollection

This guide provides essential context and conventions for AI coding agents working in the PPCollection codebase. Follow these instructions to maximize productivity and maintain project standards.

## Project Overview
- **Purpose:** Local-only web app for cataloging firearms collections, running offline in Docker with SQLite persistence.
- **Stack:** Node.js (Express), EJS views, SQLite database, Docker for deployment.
- **Main entry:** `src/server.js` (Express app), with routes in `src/routes/` and views in `src/views/`.

## Architecture & Data Flow
- **Express server** (`src/server.js`) handles HTTP requests, authentication, and routing.
- **Authentication:** Custom middleware in `src/middleware/auth.js` and routes in `src/routes/auth.js`.
- **Firearms catalog:** CRUD routes in `src/routes/firearms.js`, EJS views in `src/views/firearms/`.
- **Database:** SQLite file at `./data/app.db`, accessed via logic in `src/db.js`.
- **Static assets:** Served from `src/public/` (e.g., CSS in `src/public/css/styles.css`).

## Developer Workflows
- **Run locally (no Docker):**
  ```powershell
  npm install
  set PORT=3000
  set SESSION_SECRET=devsecret
  set ADMIN_USERNAME=admin
  set ADMIN_PASSWORD=changeme
  set DATABASE_PATH=%cd%\data\app.db
  npm start
  ```
- **Run in Docker:**
  ```powershell
  docker compose up --build
  ```
- **Default credentials:** Username: `admin`, Password: `changeme` (override via env vars or `docker-compose.yml`).
- **Data persistence:** SQLite DB is mapped to `./data/app.db` for local and Docker use.

## CI/CD & Versioning
- **Semantic-release:** Automated versioning and changelog via Conventional Commits. See `README.md` for commit types and examples.
- **Release workflow:** Defined in `.github/workflows/release.yml`, triggers on push to `main`.
- **Non-NPM project:** Uses semantic-release for versioning without NPM publishing.
- **GitHub Actions:** Multiple workflows for security scanning, code quality, Docker testing, and PR assistance.
- **Auto-assignment:** PRs automatically assign reviewers and labels based on changed files.

## Project-Specific Conventions
- **Commit messages:** Must follow Conventional Commits for CI/CD automation.
- **Views:** Use EJS partials in `src/views/partials/layout.ejs` for consistent layout.
- **Routes:** Organize by resource (`auth.js`, `firearms.js`) in `src/routes/`.
- **Middleware:** Place custom logic in `src/middleware/`.
- **Config:** Centralized in `src/config.js`.

## Integration Points
- **External dependencies:** Express, EJS, SQLite, Docker.
- **Environment variables:** Used for secrets and config; set in shell or `docker-compose.yml`.
- **GitHub Actions:** Handles releases and versioning; no manual version bumps needed.

## Key Files & Directories
- `src/server.js` — Express app entry point
- `src/routes/` — Route handlers
- `src/views/` — EJS templates
- `src/db.js` — Database logic
- `src/middleware/` — Custom middleware
- `src/public/` — Static assets
- `docker-compose.yml` — Docker config
- `.github/workflows/` — GitHub Actions (CI/CD, security, code quality)
- `.github/auto-assign.yml` — PR reviewer auto-assignment
- `.github/labeler.yml` — Automatic PR labeling

## Examples & Troubleshooting
- See `PIPELINE_EXAMPLES.md` for CI/CD and workflow examples.
- See `CONTRIBUTING.md` for contribution guidelines.
- **CI/CD Issues:** Check GitHub Actions tab for workflow runs with debug output.
- **Release Problems:** Ensure commits follow Conventional Commits format and push to `main` branch.

---

**Feedback:** If any section is unclear or missing, please provide feedback to improve these instructions.