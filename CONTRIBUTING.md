# Contributing to PPCollection

Thank you for your interest in contributing to PPCollection!

## Development Workflow

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Commit using conventional commit messages
5. Push to your fork
6. Open a Pull Request

## Commit Message Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

### Format

```
<type>(<scope>): <subject>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style/formatting changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes

### Examples

```bash
feat: add user authentication
fix: correct validation logic
docs: update API documentation
```

### Breaking Changes

For breaking changes, add `!` after the type or add `BREAKING CHANGE:` in the footer:

```bash
feat!: remove legacy API
```

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update documentation as needed
3. Use conventional commit messages
4. Wait for CI checks to pass
5. Request review from maintainers

## Release Process

Releases are automated using semantic-release:
- Merges to `main` trigger the release workflow
- Version numbers are determined from commit messages
- Changelogs are auto-generated
- Docker containers are built and published to GitHub Container Registry
- Packages are published automatically

### Automated Docker Container Publishing

Every merge to `main` triggers:
1. **Build**: Docker image is built using the latest code
2. **Tag**: Image is tagged with multiple identifiers:
   - Semantic version (e.g., `v1.0.0`, `1.0.0`, `1.0`, `1`)
   - Git SHA (e.g., `sha-abc123`)
   - Branch name (`main`)
   - `latest` tag
3. **Push**: Container is published to `ghcr.io/gogorichielab/ppcollection`

Users can pull the container using:
```bash
docker pull ghcr.io/gogorichielab/ppcollection:latest
```

## Dependency Management

This project uses [Dependabot](https://docs.github.com/en/code-security/dependabot) to keep dependencies up to date:

- **npm packages**: Checked weekly on Mondays
- **GitHub Actions**: Checked weekly on Mondays
- **Docker base images**: Checked weekly on Mondays

Dependabot will automatically create pull requests for updates. Review and merge these PRs to keep dependencies current.

## Questions?

Feel free to open an issue for any questions or concerns!
