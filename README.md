# PPCollection

Pew Pew Collection is a self-hosted web app for tracking a personal firearms inventory. The app runs entirely offline and stores records in a local SQLite database.

## Features
- Catalog firearms with basic identifying information
- Runs in Docker with no external dependencies
- Ships with a default admin account that can be customized via environment variables

## Run with Docker

### Using Pre-built Image from GitHub Container Registry

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

Override these values in `docker-compose.yml` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) or when launching the container:
```bash
ADMIN_USERNAME=me ADMIN_PASSWORD=strongpass docker compose up --build
```

### Data persistence
The SQLite database lives at `./data/app.db` on the host (mounted to `/data/app.db` in the container), so you can restart the stack without losing entries.

## Local development
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

