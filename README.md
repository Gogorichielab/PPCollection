# PPCollection

Pew Pew Collection

[![Release](https://github.com/Gogorichielab/PPCollection/actions/workflows/release.yml/badge.svg)](https://github.com/Gogorichielab/PPCollection/actions/workflows/release.yml)

## Local App (Docker)

This repo includes a simple local-only web app to catalog your firearms collection. It runs fully offline in a Docker container and stores data in a local SQLite database.

### Quick Start

1. Ensure Docker is installed.
2. Start the app:

   ```bash
   docker compose up --build
   ```

3. Open `http://localhost:3000` and log in.

### Defaults and Credentials

- Username: `admin`
- Password: `changeme`

Change these via environment variables in `docker-compose.yml` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) or set them when launching:

```bash
ADMIN_USERNAME=me ADMIN_PASSWORD=strongpass docker compose up --build
```

### Data Persistence

- SQLite file is stored in `./data/app.db` (mapped into the container at `/data/app.db`).
- Stop/start the container without losing data.

### Development (without Docker)

```bash
npm install
set PORT=3000
set SESSION_SECRET=devsecret
set ADMIN_USERNAME=admin
set ADMIN_PASSWORD=changeme
set DATABASE_PATH=%cd%\data\app.db
npm start
```

Then open `http://localhost:3000`.

## CI/CD Pipeline

This repository uses automated semantic versioning and release management powered by [semantic-release](https://github.com/semantic-release/semantic-release).

### How It Works

1. **Conventional Commits**: Use conventional commit messages to trigger automatic versioning
2. **Semantic Versioning**: Version numbers are automatically determined based on commit types
3. **Release Notes**: Changelogs and release notes are automatically generated
4. **Package Publishing**: Packages are automatically published to npm on release

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Commit Types

- `feat:` - A new feature (triggers MINOR version bump)
- `fix:` - A bug fix (triggers PATCH version bump)
- `perf:` - Performance improvement (triggers PATCH version bump)
- `docs:` - Documentation changes (triggers PATCH version bump)
- `style:` - Code style changes (triggers PATCH version bump)
- `refactor:` - Code refactoring (triggers PATCH version bump)
- `test:` - Test changes (triggers PATCH version bump)
- `build:` - Build system changes (triggers PATCH version bump)
- `ci:` - CI/CD changes (triggers PATCH version bump)
- `chore:` - Other changes (no version bump)

#### Breaking Changes

Add `BREAKING CHANGE:` in the commit footer or use `!` after the type/scope to trigger a MAJOR version bump:

```
feat!: remove deprecated API
```

or

```
feat: add new feature

BREAKING CHANGE: This removes the old API
```

### Examples

```bash
# Patch release (0.0.0 -> 0.0.1)
git commit -m "fix: correct calculation error"

# Minor release (0.0.1 -> 0.1.0)
git commit -m "feat: add new feature"

# Major release (0.1.0 -> 1.0.0)
git commit -m "feat!: redesign API"
```

### Release Process

Releases are automatically created when changes are pushed to the `main` branch:

1. Commits are analyzed to determine the next version number
2. A changelog is generated from commit messages
3. The version in `package.json` is updated
4. A git tag is created
5. A GitHub release is created with release notes
6. The package is published to npm (if NPM_TOKEN is configured)

### Setup Requirements

For npm publishing, add the `NPM_TOKEN` secret to your repository:

1. Generate an npm access token at https://www.npmjs.com/settings/tokens
2. Add it as a secret named `NPM_TOKEN` in your GitHub repository settings
3. Go to: Settings → Secrets and variables → Actions → New repository secret

The `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### Workflow File

The release workflow is defined in `.github/workflows/release.yml` and runs on every push to the `main` branch.

## Examples

For detailed examples and troubleshooting, see [PIPELINE_EXAMPLES.md](PIPELINE_EXAMPLES.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

