# PPCollection

Pew Pew Collection is a self-hosted web app for tracking a personal firearms inventory. The app runs entirely offline and stores records in a local SQLite database.

## Features
- Catalog firearms with basic identifying information
- Runs in Docker with no external dependencies
- Ships with a default admin account that can be customized via environment variables

## Run with Docker

### Using Pre-built Image from GitHub Container Registry

**Recommended (Secure): Use a pre-hashed password**

First, generate a password hash:
```bash
node scripts/hash-password.js your-secure-password
```

Then use the generated hash:
```bash
docker run -d \
  -p 3000:3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD_HASH='$2a$10$...' \
  -e SESSION_SECRET=your-secret-here \
  -v ./data:/data \
  ghcr.io/gogorichielab/ppcollection:latest
```

**Alternative (Migration): Use plain-text password (deprecated)**

> ⚠️ **Security Warning**: Plain-text passwords via `ADMIN_PASSWORD` are deprecated and will show a warning. Use `ADMIN_PASSWORD_HASH` instead.

```bash
docker run -d \
  -p 3000:3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=changeme \
  -e SESSION_SECRET=your-secret-here \
  -v ./data:/data \
  ghcr.io/gogorichielab/ppcollection:latest
```

Then visit <http://localhost:3000> and log in with your credentials.

### Using Docker Compose

1. Install Docker and Docker Compose.
2. From the repository root, build and start the stack:
   ```bash
   docker compose up --build
   ```
3. Visit <http://localhost:3000> and log in with the default credentials.

### Default credentials
- Username: `admin`
- Password: `changeme`

### Customizing credentials

**Recommended (Secure)**: Generate a password hash and set `ADMIN_PASSWORD_HASH`:
```bash
# Generate hash
node scripts/hash-password.js your-secure-password

# Set in docker-compose.yml
ADMIN_PASSWORD_HASH: "$2a$10$..."
```

**Alternative (Migration)**: Override `ADMIN_PASSWORD` in `docker-compose.yml` or when launching:
```bash
ADMIN_USERNAME=me ADMIN_PASSWORD=strongpass docker compose up --build
```

> ⚠️ **Security Warning**: Using `ADMIN_PASSWORD` is deprecated. Prefer `ADMIN_PASSWORD_HASH` to prevent credentials from being directly usable if environment variables are leaked.

### Data persistence
The SQLite database lives at `./data/app.db` on the host (mounted to `/data/app.db` in the container), so you can restart the stack without losing entries.

## Local development

**Using hashed password (recommended):**
```bash
npm install
# Generate a password hash
node scripts/hash-password.js changeme
export PORT=3000
export SESSION_SECRET=devsecret
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD_HASH='$2a$10$...'  # Use the hash from the script
export DATABASE_PATH="$PWD/data/app.db"
npm start
```

**Using plain-text password (deprecated):**
```bash
npm install
export PORT=3000
export SESSION_SECRET=devsecret
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=changeme
export DATABASE_PATH="$PWD/data/app.db"
npm start
```

Then open <http://localhost:3000> in your browser.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

