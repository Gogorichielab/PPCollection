# CI/CD Pipeline Examples

This document provides examples of how the automated release pipeline works.

## How Releases are Triggered

Releases are automatically triggered when commits are pushed to the `main` branch. The version number is determined by analyzing commit messages using the Conventional Commits format.

## Version Bump Examples

### Patch Release (0.0.0 → 0.0.1)

Bug fixes and minor changes trigger patch releases:

```bash
git commit -m "fix: correct typo in documentation"
git commit -m "docs: update README with examples"
git commit -m "perf: optimize data processing"
```

### Minor Release (0.0.1 → 0.1.0)

New features trigger minor releases:

```bash
git commit -m "feat: add user authentication"
git commit -m "feat: implement data export functionality"
```

### Major Release (0.1.0 → 1.0.0)

Breaking changes trigger major releases:

```bash
git commit -m "feat!: redesign API endpoints"
```

or with detailed description:

```bash
git commit -m "feat: redesign API

BREAKING CHANGE: The API endpoints have been restructured.
Use /api/v2/ instead of /api/v1/ for all requests."
```

## Release Notes Generation

The changelog is automatically generated from your commit messages. For best results:

1. Use clear, descriptive commit messages
2. Follow the conventional commit format
3. Group related changes in the commit body
4. Use the scope to indicate which part of the codebase is affected

Example with scope:

```bash
git commit -m "feat(auth): add OAuth2 support"
git commit -m "fix(ui): correct button alignment"
git commit -m "docs(api): add endpoint documentation"
```

## Complete Workflow Example

1. **Make changes to your code**
   ```bash
   # Edit files
   vim src/feature.js
   ```

2. **Commit with conventional format**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push to main branch**
   ```bash
   git push origin main
   ```

4. **Automated pipeline runs:**
   - Analyzes commits since last release
   - Determines version bump (major/minor/patch)
   - Generates changelog
   - Updates package.json version
   - Creates git tag
   - Creates GitHub release with notes
   - Publishes to npm (if configured)

## Release Output

After a successful release, you'll see:

- **New Git Tag**: e.g., `v1.0.0`
- **GitHub Release**: With auto-generated release notes
- **Updated Files**: `package.json` and `CHANGELOG.md` updated automatically
- **NPM Package**: Published to npm registry (if NPM_TOKEN is configured)

## Multi-Commit Releases

If you have multiple commits since the last release:

```bash
git commit -m "fix: correct validation bug"
git commit -m "feat: add new export format"
git commit -m "docs: update API documentation"
git push origin main
```

The pipeline will:
- Detect the highest version bump needed (feat = minor)
- Include all commits in the release notes
- Group them by type (Features, Bug Fixes, Documentation)

## Skipping CI

To push changes without triggering a release (e.g., for README updates):

```bash
git commit -m "docs: update README [skip ci]"
```

## Troubleshooting

### No release created

**Possible reasons:**
- Commits don't follow conventional commit format
- Only commits with type `chore` (which don't trigger releases)
- No commits since last release

**Solution:**
- Check commit messages follow the format: `type: description`
- Use release-triggering types: `feat`, `fix`, `perf`, etc.

### NPM publish fails

**Possible reasons:**
- NPM_TOKEN not configured
- Package name already exists on npm
- Package version already published

**Solution:**
- Add NPM_TOKEN to repository secrets
- Choose a unique package name in package.json
- Ensure semantic-release is handling version bumps

## Manual Testing (Local)

You can test the semantic-release configuration locally:

```bash
# Install dependencies
npm install

# Dry run (doesn't publish)
npx semantic-release --dry-run
```

This will show you what version would be released and what the changelog would look like.
