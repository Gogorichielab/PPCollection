# Pew Pew Collection

Pew Pew Collection (PPCollection) is a self-hosted web application for tracking and managing a personal firearms inventory. The app runs entirely offline, requiring no internet connection or external services, and stores all records in a local SQLite database.

[![CI & Release](https://github.com/Gogorichielab/PPCollection/actions/workflows/release.yml/badge.svg)](https://github.com/Gogorichielab/PPCollection/actions/workflows/release.yml)
![GitHub License](https://img.shields.io/github/license/gogorichielab/PPCollection)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
![GitHub Release](https://img.shields.io/github/v/release/gogorichielab/PPCollection)
![GitHub repo size](https://img.shields.io/github/repo-size/gogorichielab/PPCollection)

## Overview

PPCollection is a simple, privacy-focused inventory management system for firearm collectors. It provides an easy-to-use web interface for cataloging firearms with detailed information including:

- **Basic Information**: Make, model, serial number, caliber, and firearm type
- **Purchase Details**: Date, price, and purchase condition
- **Storage & Status**: Storage location and ownership status
- **Warranty Tracking**: Track warranty status for each firearm
- **Notes**: Custom notes and observations for each firearm

The application emphasizes:
- **Privacy**: All data stays local on your machine
- **Simplicity**: Clean, intuitive web interface with dark mode
- **Offline**: No internet connection required
- **Portability**: Runs in Docker containers for easy deployment

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite with better-sqlite3
- **Authentication**: Session-based with single admin user
- **Security**: Helmet for HTTP headers, secure session cookies
- **Frontend**: Server-side rendering with EJS templates
- **Deployment**: Docker and Docker Compose
- **Features**: CSV export, search/filter, sortable tables


## Features

- **Comprehensive Cataloging**: Store detailed information including make, model, serial number, caliber, firearm type, and warranty status
- **Purchase Tracking**: Record purchase date, price, and purchase condition
- **Storage Management**: Track storage location for each firearm
- **Status Tracking**: Monitor ownership status (Active, Sold, Lost/Stolen, Under Repair)
- **Search & Filter**: Powerful search across all fields or specific attributes
- **Sortable Tables**: Click column headers to sort inventory by any field
- **CSV Export**: Export your entire inventory to CSV format for backup or external use
- **Custom Notes**: Add detailed notes and observations for each firearm
- **Offline Operation**: Runs completely offline with no external dependencies
- **Docker Ready**: Pre-built Docker images available on GitHub Container Registry
- **Data Persistence**: SQLite database ensures data survives container restarts
- **Dark Mode UI**: Modern, easy-on-the-eyes dark theme interface

## Screenshots

### Login Page
![Login Page](https://github.com/user-attachments/assets/e18fe175-7bda-4865-b4b2-f4d83dccb49b)

Modern, secure login interface with session-based authentication.

### Empty Inventory
![Empty Inventory](https://github.com/user-attachments/assets/e2415217-958f-42fe-80d2-aec3f0d826da)

Clean starting point when you first set up your collection.

### Add Firearm Form
![Add Firearm Form](https://github.com/user-attachments/assets/78f56622-66e0-4d89-ab03-5339cbb425d1)

Comprehensive form capturing all firearm details including make, model, serial, caliber, firearm type, purchase information, location, status, warranty, and notes.

### Firearm Detail View
![Firearm Detail](https://github.com/user-attachments/assets/ff472193-01e7-484c-9511-1c1f4e77d49c)

Complete information display with edit and delete options.

### Inventory List
![Inventory List](https://github.com/user-attachments/assets/4eb3706f-6273-48ae-afb8-dc2f2940a78a)

Searchable, sortable table with CSV export functionality.

## Configuration

The application is configured through environment variables:

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `PORT` | HTTP port the server listens on | `3000` | Change if you need a different host port mapping |
| `SESSION_SECRET` | Secret used to sign session cookies | `ppcollection_dev_secret` | **Required for production** - use a long random value |
| `ADMIN_USERNAME` | Admin username for login | `admin` | Single admin user for authentication |
| `ADMIN_PASSWORD` | Admin password (plain text) | `changeme` | **Change immediately** - stored in plain text |
| `DATABASE_PATH` | Location of SQLite database | `<project>/data/app.db` | In Docker: `/data/app.db` |

### Security Notes

⚠️ **Important Security Considerations:**

1. **Change default credentials immediately** - The default `admin`/`changeme` is insecure
2. **Generate a strong SESSION_SECRET** - Use `openssl rand -hex 32` to generate one
3. **Password is stored in plain text** - Protect your database file and environment variables
4. **Restrict database access** - Only the hosting user/container should access the `data/` directory
5. **Back up regularly** - The `app.db` file is your single source of truth

## Getting Started

### Using Docker (Recommended)

The easiest way to run PPCollection is with Docker:

#### Step 1: Create a data directory

```bash
mkdir -p ./data
chmod 750 ./data
```

#### Step 2: Run the container

First, generate a secure session secret:
```bash
SESSION_SECRET=$(openssl rand -hex 32)
```

Then run the container:
```bash
docker run -d \
  --name ppcollection \
  -p 3000:3000 \
  -e SESSION_SECRET="$SESSION_SECRET" \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=YourSecurePassword \
  -v ./data:/data \
  --restart unless-stopped \
  ghcr.io/gogorichielab/ppcollection:latest
```

#### Step 3: Access the application

Open your browser and navigate to `http://localhost:3000`

**Default credentials** (change immediately for security):
- Username: `admin`
- Password: `changeme`

### Using Docker Compose

#### Step 1: Clone the repository

```bash
git clone https://github.com/Gogorichielab/PPCollection.git
cd PPCollection
```

#### Step 2: (Optional) Create a `.env` file

```bash
SESSION_SECRET=your-random-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword
```

#### Step 3: Start the application

```bash
docker compose up -d
```

The application will be available at `http://localhost:3000`

### Container Management

**View logs:**
```bash
docker logs ppcollection
```

**Stop the container:**
```bash
docker stop ppcollection
```

**Start the container:**
```bash
docker start ppcollection
```

**Update to latest version:**
```bash
docker pull ghcr.io/gogorichielab/ppcollection:latest
docker stop ppcollection
docker rm ppcollection
# Run the docker run command again with your settings
```

## Local Development

If you want to run PPCollection without Docker:

```bash
# Install dependencies
npm install

# Generate a secure session secret
SESSION_SECRET=$(openssl rand -hex 32)

# Set environment variables and start
export PORT=3000
export SESSION_SECRET="$SESSION_SECRET"
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=changeme
export DATABASE_PATH="$PWD/data/app.db"

# Start the application
npm start
```

Then open `http://localhost:3000` in your browser.

## Database Schema

PPCollection uses SQLite for data storage with the following main table:

### `firearms` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-incrementing unique identifier |
| `make` | TEXT NOT NULL | Manufacturer name (e.g., "Glock", "Smith & Wesson") |
| `model` | TEXT NOT NULL | Model name/number (e.g., "19", "M&P Shield") |
| `serial` | TEXT | Serial number |
| `caliber` | TEXT | Caliber or gauge (e.g., "9mm", ".45 ACP", "12 gauge") |
| `firearm_type` | TEXT | Type of firearm (Rifle, Pistol, Shotgun, Revolver, Other) |
| `purchase_date` | TEXT | Date of purchase (ISO 8601 format: YYYY-MM-DD) |
| `purchase_price` | REAL | Purchase price in dollars |
| `condition` | TEXT | Purchase condition (New, Used, Broken) |
| `location` | TEXT | Storage location (e.g., "Safe #1", "Gun room") |
| `status` | TEXT | Ownership status (Active, Sold, Lost/Stolen, Under Repair) |
| `gun_warranty` | INTEGER | Warranty status (0 = No, 1 = Yes) |
| `notes` | TEXT | Additional notes and observations |
| `created_at` | TEXT | Record creation timestamp |
| `updated_at` | TEXT | Last update timestamp |

**Note**: The database also includes `maintenance_logs` and `range_sessions` tables for future features that are not yet implemented in the UI.

## Data Backup

### Backing Up Your Database

Since all data is stored in a single SQLite database file, backing up is straightforward:

**Docker users:**
```bash
# Copy database to backup location
cp ./data/app.db ./backup/app.db.$(date +%Y%m%d)
```

**Automated backups:**
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
cp ./data/app.db "$BACKUP_DIR/app.db.$DATE"
# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "app.db.*" -mtime +30 -delete
```

### Restoring from Backup

```bash
# Stop the application
docker stop ppcollection

# Restore the database file
cp ./backup/app.db.20231201 ./data/app.db

# Start the application
docker start ppcollection
```

## Advanced Configuration

### Running Behind a Reverse Proxy

If you're running PPCollection behind a reverse proxy (Nginx, Apache, Traefik, Caddy):

**Example Nginx configuration:**
```nginx
server {
    listen 443 ssl;
    server_name firearms.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Running on a Different Port

Map host port 8080 to container port 3000:

```bash
# Generate a secure session secret first
SESSION_SECRET=$(openssl rand -hex 32)

# Run with custom port
docker run -d \
  -p 8080:3000 \
  -e SESSION_SECRET="$SESSION_SECRET" \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=changeme \
  -v ./data:/data \
  ghcr.io/gogorichielab/ppcollection:latest
```

Access at `http://localhost:8080`

## Troubleshooting

### Application Won't Start

**Check Docker logs:**
```bash
docker logs ppcollection
```

**Common issues:**
- Port 3000 already in use: Change the port mapping to `-p 8080:3000`
- Permission issues with data directory: `chmod 750 ./data`
- Missing `SESSION_SECRET`: Set this environment variable
- Invalid environment variables: Check for typos

### Cannot Log In

**Verify credentials:**
- Default is `admin` / `changeme` unless customized
- Check environment variables are set correctly

**Reset to defaults:**
```bash
# Stop container
docker stop ppcollection

# Remove database (WARNING: This deletes all data!)
rm ./data/app.db

# Restart container
docker start ppcollection
```

### Database Errors

**Restore from backup:**
```bash
docker stop ppcollection
cp ./backup/app.db.YYYYMMDD ./data/app.db
docker start ppcollection
```

### Cannot Access from Other Devices

- Ensure firewall allows port 3000
- Verify container binds to `0.0.0.0`, not `127.0.0.1`
- Check Docker network settings
- Use the server's IP address instead of `localhost`

### Getting Help

If you encounter issues:

1. Check [GitHub Issues](https://github.com/Gogorichielab/PPCollection/issues)
2. Review container logs: `docker logs ppcollection`
3. Verify environment variables are set correctly
4. Ensure you're using a compatible Docker version
5. Open a new issue with:
   - Description of the problem
   - Steps to reproduce
   - Container logs
   - Docker and OS versions

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

