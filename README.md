# Pew Pew Collection

Pew Pew Collection (PPCollection) is a self-hosted web application designed for tracking and managing a personal firearms inventory. The app runs entirely offline, requiring no internet connection or external services, and stores all records in a local SQLite database.

## What is PPCollection?

PPCollection is a privacy-focused, secure inventory management system specifically designed for firearm collectors. It provides a simple, intuitive interface for cataloging firearms with detailed information including:

- **Basic Information**: Make, model, serial number, caliber, and type
- **Purchase Details**: Date, price, and location of purchase
- **Ownership Status**: Current condition and status (owned, sold, etc.)
- **Sale Records**: Buyer information and sale date (if applicable)
- **Notes**: Custom notes and observations for each firearm

The application emphasizes:
- **Privacy**: All data stays local on your machine
- **Security**: Bcrypt password hashing, CSRF protection, rate limiting, and secure session management
- **Simplicity**: Easy-to-use web interface accessible from any browser
- **Portability**: Runs in Docker containers for consistent deployment across platforms

## How It Works

PPCollection is built with modern web technologies and follows a client-server architecture:

### Technology Stack

- **Backend**: Node.js with Express.js web framework
- **Database**: SQLite with better-sqlite3 for fast, reliable data storage
- **Authentication**: bcryptjs for password hashing, express-session for session management
- **Security**: Helmet for HTTP headers, Lusca for CSRF protection, express-rate-limit for brute-force protection
- **Frontend**: EJS templating engine with server-side rendering
- **Container**: Docker and Docker Compose for easy deployment

### Application Flow

1. **Authentication**: Users log in with username and password. Sessions are maintained using secure HTTP-only cookies.
2. **Data Management**: After login, users can create, read, update, and delete firearm records through a web interface.
3. **Data Storage**: All data is stored in a SQLite database file (`app.db`) that persists across container restarts.
4. **Export**: Users can export their collection to CSV format for backup or analysis.
5. **Multi-User**: Support for multiple users with invite-based registration and password reset functionality.

[![CI & Release](https://github.com/Gogorichielab/PPCollection/actions/workflows/release.yml/badge.svg)](https://github.com/Gogorichielab/PPCollection/actions/workflows/release.yml)
![GitHub License](https://img.shields.io/github/license/gogorichielab/PPCollection)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
![GitHub Release](https://img.shields.io/github/v/release/gogorichielab/PPCollection)
![GitHub repo size](https://img.shields.io/github/repo-size/gogorichielab/PPCollection)


## Features

### Core Functionality
- **Catalog Firearms**: Store detailed information including make, model, serial number, caliber, type, and more
- **Purchase Tracking**: Record purchase date, price, and location for each item
- **Sale Records**: Track sales with buyer information and sale dates
- **Search & Sort**: Easily find items by searching across multiple fields and sorting by any column
- **CSV Export**: Export your entire collection to a spreadsheet for backup or analysis
- **Custom Notes**: Add detailed notes and observations for each firearm

### Security & Privacy
- **Offline First**: Runs completely offline with no external dependencies or internet requirements
- **Bcrypt Password Hashing**: Industry-standard password protection
- **CSRF Protection**: Prevents cross-site request forgery attacks
- **Rate Limiting**: Protects against brute-force login attempts
- **Secure Sessions**: HTTP-only cookies prevent XSS attacks
- **Multi-User Support**: Invite-based user registration with role management

### Deployment
- **Docker Ready**: Pre-built Docker images available on GitHub Container Registry
- **Easy Setup**: Run with a single Docker command or docker-compose
- **Data Persistence**: SQLite database stored in mounted volume survives container restarts
- **Password Recovery**: Built-in password reset system for self-hosted environments
- **Environment Configuration**: Customize via environment variables

## Environment Variables Reference

PPCollection can be configured using environment variables. Here's a complete reference:

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SESSION_SECRET` | Secret key for signing session cookies. **MUST be changed in production!** | `ppcollection_dev_secret` | `your-random-secret-key-here` |

### Authentication Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ADMIN_USERNAME` | Username for the default admin account | `admin` | `myadmin` |
| `ADMIN_PASSWORD_HASH` | **Recommended**: Bcrypt hash of admin password | Hash of `changeme` | `$2a$10$...` |
| `ADMIN_PASSWORD` | **Deprecated**: Plain-text admin password (use `ADMIN_PASSWORD_HASH` instead) | `changeme` | `mypassword` |
| `SESSION_COOKIE_SECURE` | Set to `true` when using HTTPS, `false` for HTTP | `false` | `true` |

### Application Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Port the application listens on | `3000` | `8080` |
| `DATABASE_PATH` | Path to SQLite database file | `./data/app.db` | `/data/app.db` |
| `NODE_ENV` | Node environment (set to `production` in Docker) | Not set | `production` |

### Security Best Practices

1. **Always change `SESSION_SECRET`**: Use a long, random string (at least 32 characters)
2. **Use `ADMIN_PASSWORD_HASH`**: Never use plain-text passwords in production
3. **Generate secure hashes**: Use the provided script: `node scripts/hash-password.js your-password`
4. **Enable secure cookies**: Set `SESSION_COOKIE_SECURE=true` when running behind HTTPS/TLS
5. **Keep credentials private**: Never commit environment variables to version control

### Example: Generate Password Hash

```bash
# Install dependencies (if not using Docker)
npm install

# Generate a secure password hash
node scripts/hash-password.js MySecurePassword123

# Output will be:
# ADMIN_PASSWORD_HASH="$2a$10$..."
```

## Run with Docker

PPCollection is designed to run in Docker containers for easy, consistent deployment. You can use pre-built images from GitHub Container Registry with Docker or docker-compose, or build from source using Docker Compose.

### Prerequisites

- Docker Engine 20.10 or later
- Docker Compose v2.0 or later (if using docker-compose)
- At least 100MB of available disk space
- A directory for persistent data storage

### Using Pre-built Image from GitHub Container Registry

This is the recommended method for most users. The image is automatically built and published with each release.

#### Step 1: Create a data directory

```bash
mkdir -p ./data
# Use appropriate permissions - container runs as 'node' user (UID 1000)
chmod 750 ./data
# If permission issues occur, you may need: sudo chown 1000:1000 ./data
```

#### Step 2: Generate a secure password hash

**Recommended (Secure): Use a pre-hashed password**

First, generate a password hash:
```bash
# Download and run the hash generation script
docker run --rm ghcr.io/gogorichielab/ppcollection:latest node scripts/hash-password.js your-secure-password

# Or if you have Node.js installed locally:
node scripts/hash-password.js your-secure-password
```

#### Step 3: Run the container

Then use the generated hash:
```bash
docker run -d \
  --name ppcollection \
  -p 3000:3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD_HASH='$2a$10$...' \
  -e SESSION_SECRET=your-secret-here \
  -v ./data:/data \
  --restart unless-stopped \
  ghcr.io/gogorichielab/ppcollection:latest
```

**Parameter Explanations:**
- `-d`: Run container in detached mode (background)
- `--name ppcollection`: Give the container a friendly name
- `-p 3000:3000`: Map port 3000 on host to port 3000 in container
- `-e ADMIN_USERNAME=admin`: Set the admin username
- `-e ADMIN_PASSWORD_HASH='...'`: Set the password hash (use single quotes to preserve special characters)
- `-e SESSION_SECRET=...`: Set a secret key for session encryption (use a long random string)
- `-v ./data:/data`: Mount local ./data directory to /data in container for persistence
- `--restart unless-stopped`: Automatically restart container on system reboot

#### Step 4: Access the application

Then visit <http://localhost:3000> and log in with your credentials.

**Alternative (Migration): Use plain-text password (deprecated)**

> ⚠️ **Security Warning**: Plain-text passwords via `ADMIN_PASSWORD` are deprecated and will show a warning. Use `ADMIN_PASSWORD_HASH` instead.

```bash
 docker run -d \
  -p 3000:3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=changeme \
  -e SESSION_SECRET=your-secret-here \
  -e SESSION_COOKIE_SECURE=false \
  -v ./data:/data \
  ghcr.io/gogorichielab/ppcollection:latest
```

Then visit <http://localhost:3000> and log in with your credentials.

#### Container Management

**View container logs:**
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

**Remove the container:**
```bash
docker stop ppcollection
docker rm ppcollection
```

**Update to latest version:**
```bash
docker pull ghcr.io/gogorichielab/ppcollection:latest
docker stop ppcollection
docker rm ppcollection
# Then run the docker run command again with your settings
```

### Using Docker Compose

Docker Compose provides a simpler way to manage the application, especially for development or when you want to customize the setup.

#### Step 1: Clone the repository

```bash
git clone https://github.com/Gogorichielab/PPCollection.git
cd PPCollection
```

#### Step 2: (Optional) Customize environment variables

Edit `docker-compose.yml` to customize your settings, or create a `.env` file:

```bash
# .env file
SESSION_SECRET=your-random-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$...
```

#### Step 3: Start the application

1. Install Docker and Docker Compose.
2. From the repository root, build and start the stack:
   ```bash
   docker compose up --build
   ```
   
   Or run in detached mode:
   ```bash
   docker compose up -d --build
   ```

#### Step 4: Access the application

3. Visit <http://localhost:3000> and log in with the default credentials.

### Default credentials

**Default Login Credentials:**
- Username: `admin`
- Password: `changeme`

> ⚠️ **Security Warning**: Change these default credentials immediately after first login! The application will prompt you to change the password on first login when using default credentials.

### How to Login

#### First Time Login

1. **Start the application** using one of the methods above (Docker or Docker Compose)
2. **Open your web browser** and navigate to `http://localhost:3000`
   - If running on a different port, use `http://localhost:<PORT>`
   - If accessing from another device on your network, use `http://<server-ip>:3000`
3. **Enter credentials** on the login page:
   - Username: `admin` (or your custom username)
   - Password: `changeme` (or your custom password)
4. **Click "Login"**
5. **Change your password** when prompted (if using default credentials)

#### Subsequent Logins

1. Navigate to `http://localhost:3000`
2. Enter your username and password
3. Click "Login"
4. You'll be redirected to your firearms library

#### Troubleshooting Login Issues

**Cannot access the login page:**
- Verify the container is running: `docker ps`
- Check container logs: `docker logs ppcollection`
- Ensure port 3000 is not in use by another application
- If using a firewall, ensure port 3000 is open

**Login credentials not working:**
- Verify you're using the correct username and password
- Check that environment variables are set correctly
- If you forgot your password, see the "Password Recovery" section below
- For password hash issues, regenerate using `node scripts/hash-password.js`

**Session expires immediately:**
- Check that `SESSION_SECRET` is set and consistent across restarts
- Ensure your browser accepts cookies
- If using HTTPS, you must explicitly set `SESSION_COOKIE_SECURE=true` (the default is `false`)

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
export SESSION_COOKIE_SECURE=false # Set to true when serving over HTTPS
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=changeme
export DATABASE_PATH="$PWD/data/app.db"
npm start
```

**Cookie security**

Set `SESSION_COOKIE_SECURE=true` when running behind HTTPS or a reverse proxy that terminates TLS. Leave it `false` (the default) for plain HTTP setups so the login session cookie can be set correctly.

Then open <http://localhost:3000> in your browser.

## Application Architecture

PPCollection follows a traditional server-side rendered web application architecture:

### Directory Structure

```
PPCollection/
├── src/
│   ├── config.js              # Application configuration and environment variables
│   ├── db.js                  # Database initialization and queries
│   ├── server.js              # Express application setup and middleware
│   ├── db/
│   │   └── users.js           # User management functions
│   ├── middleware/
│   │   ├── auth.js            # Authentication middleware
│   │   └── rateLimiter.js     # Rate limiting for login attempts
│   ├── routes/
│   │   ├── auth.js            # Authentication routes (login, logout, register)
│   │   ├── library.js         # Firearm library routes (CRUD operations)
│   │   └── profile.js         # User profile and password management
│   ├── views/
│   │   ├── library/           # Library page templates
│   │   ├── auth/              # Authentication page templates
│   │   ├── profile/           # Profile page templates
│   │   └── partials/          # Reusable template components
│   └── public/                # Static assets (CSS, client-side JS)
├── scripts/
│   └── hash-password.js       # Utility to generate password hashes
├── data/
│   └── app.db                 # SQLite database (created on first run)
├── docker-compose.yml         # Docker Compose configuration
├── Dockerfile                 # Docker image build instructions
└── package.json               # Node.js dependencies

```

### Request Flow

1. **HTTP Request** → User accesses the application via web browser
2. **Express Middleware** → Security headers (Helmet), CSRF protection (Lusca), session management
3. **Authentication** → Checks if user is logged in, redirects to login if needed
4. **Route Handler** → Processes the request and interacts with database
5. **Database Query** → Reads/writes data to SQLite database
6. **Template Rendering** → Server renders EJS template with data
7. **HTTP Response** → HTML page sent back to browser

### Security Layers

1. **Helmet**: Sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
2. **CSRF Protection**: Prevents cross-site request forgery attacks using tokens
3. **Rate Limiting**: Limits login attempts to prevent brute-force attacks
4. **Password Hashing**: Uses bcrypt with salt rounds=10 for password storage
5. **Session Management**: Secure HTTP-only cookies with configurable security settings
6. **Input Validation**: Joi schema validation for all user inputs
7. **SQL Injection Prevention**: Parameterized queries throughout the application

## Database Schema

PPCollection uses SQLite for data storage. The database consists of the following tables:

### `firearms` Table

Stores all firearm records in your collection.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-incrementing unique identifier |
| `make` | TEXT NOT NULL | Manufacturer name (e.g., "Colt", "Smith & Wesson") |
| `model` | TEXT NOT NULL | Model name/number (e.g., "1911", "M&P Shield") |
| `serial` | TEXT | Serial number |
| `caliber` | TEXT | Caliber or gauge (e.g., ".45 ACP", "9mm", "12 gauge") |
| `type` | TEXT | Type of firearm (e.g., "Pistol", "Rifle", "Shotgun") |
| `purchase_date` | TEXT | Date of purchase (ISO 8601 format) |
| `purchase_price` | REAL | Purchase price in dollars |
| `purchase_location` | TEXT | Where the firearm was purchased |
| `condition` | TEXT | Current condition (e.g., "Excellent", "Good", "Fair") |
| `status` | TEXT | Ownership status (e.g., "Owned", "Sold", "Transferred") |
| `notes` | TEXT | Additional notes and observations |
| `buyer_name` | TEXT | Name of buyer (if sold) |
| `buyer_address` | TEXT | Address of buyer (if sold) |
| `sold_date` | TEXT | Date sold (ISO 8601 format) |
| `created_at` | TEXT | Record creation timestamp |
| `updated_at` | TEXT | Last update timestamp |

### `users` Table

Stores user accounts for multi-user access.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique user identifier |
| `username` | TEXT NOT NULL UNIQUE | Username for login |
| `password_hash` | TEXT NOT NULL | Bcrypt hashed password |
| `invited_by` | INTEGER | ID of user who invited this user |
| `requires_password_change` | INTEGER | Flag indicating password must be changed |
| `created_at` | TEXT | Account creation timestamp |
| `updated_at` | TEXT | Last update timestamp |

### `user_invites` Table

Manages invitation tokens for new user registration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique invite identifier |
| `token` | TEXT NOT NULL UNIQUE | Secure random token |
| `email` | TEXT | Email address (optional) |
| `invited_by` | INTEGER | ID of user who created invite |
| `expires_at` | TEXT | Expiration timestamp |
| `accepted_at` | TEXT | When invite was accepted |
| `accepted_user_id` | INTEGER | ID of user who accepted invite |
| `created_at` | TEXT | Invite creation timestamp |

### `password_reset_tokens` Table

Manages password reset tokens for password recovery.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique token identifier |
| `token` | TEXT NOT NULL UNIQUE | Secure random token |
| `user_id` | INTEGER NOT NULL | ID of user resetting password |
| `created_by` | INTEGER | ID of admin who created token |
| `expires_at` | TEXT | Expiration timestamp |
| `used_at` | TEXT | When token was used |
| `created_at` | TEXT | Token creation timestamp |

### Future Feature Tables

The database also includes two tables reserved for future maintenance tracking and range session features:

#### `maintenance_logs` Table
Will track firearm maintenance history including cleaning, repairs, and part replacements.

#### `range_sessions` Table
Will track range usage including rounds fired, location, and performance notes.

These tables are created during database initialization but are not yet used by the application interface.

### Data Persistence

- Database file is stored at `/data/app.db` inside the container
- Mounted to `./data/app.db` on the host via Docker volume
- Uses SQLite's Write-Ahead Logging (WAL) mode for better concurrent access
- Foreign keys are enforced for referential integrity
- Automatic migrations handle schema changes across versions

## Password Recovery

If a user forgets their password, an administrator can generate a password reset token for them. This is suitable for self-hosted environments where users have direct access to the administrators.

### How to reset a forgotten password

**For Administrators:**

1. Log in to the application
2. Navigate to **Profile** from the top navigation menu
3. Scroll down to the **Password Recovery** section
4. Click **Generate Password Reset Token**
5. Select the user who needs to reset their password
6. Optionally set an expiration time (in hours) for the token
7. Click **Generate Reset Token**
8. Share the generated reset link with the user (via a secure channel)

**For Users:**

1. Receive the password reset link from your administrator
2. Click the link or paste it into your browser
3. Enter your new password (must be at least 8 characters)
4. Confirm your new password
5. Click **Reset Password**
6. You'll be automatically logged in with your new password

### Password Reset Token Security

- Tokens are cryptographically secure random strings
- Tokens can have optional expiration times
- Each token can only be used once
- After a successful password reset, the token is marked as used and cannot be reused
- Users are automatically logged in after successfully resetting their password

## Data Backup and Export

### Backing Up Your Database

Since all data is stored in a single SQLite database file, backing up is straightforward:

**Docker users:**
```bash
# Copy database from container volume to backup location
docker cp ppcollection:/data/app.db ./backup/app.db.$(date +%Y%m%d)

# Or if using volume mount, simply copy the file
cp ./data/app.db ./backup/app.db.$(date +%Y%m%d)
```

**Automated backups:**
```bash
# Create a backup script (backup.sh)
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

### Exporting to CSV

PPCollection includes a built-in CSV export feature:

1. Log in to the application
2. Click **"Export"** in the navigation menu
3. A CSV file named `library-collection.csv` will be downloaded
4. Open in Excel, Google Sheets, or any spreadsheet application

The CSV export includes all firearm records with the following columns:
- Make, Model, Serial, Caliber, Type
- Purchase Date, Purchase Price, Purchase Location
- Condition, Status, Notes
- Buyer Name, Buyer Address, Sold Date

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

**Set environment variable:**
```bash
SESSION_COOKIE_SECURE=true
```

### Running on a Different Port

```bash
docker run -d \
  -p 8080:3000 \
  -e PORT=3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD_HASH='$2a$10$...' \
  -e SESSION_SECRET=your-secret-here \
  -v ./data:/data \
  ghcr.io/gogorichielab/ppcollection:latest
```

This maps host port 8080 to container port 3000. Access at `http://localhost:8080`.

### Multi-User Setup

PPCollection supports multiple users with invite-based registration:

1. **Log in as admin**
2. **Navigate to Profile**
3. **Scroll to "User Management"**
4. **Click "Create Invitation"**
5. **Set optional expiration time**
6. **Share the invitation link** with the new user
7. **New user** clicks link and creates their account

Users can also be invited to reset forgotten passwords via the password recovery system.

## Troubleshooting

### Application won't start

**Check Docker logs:**
```bash
docker logs ppcollection
```

**Common issues:**
- Port 3000 already in use: Change the port mapping `-p 8080:3000`
- Permission issues with data directory: `chmod 750 ./data` or `sudo chown 1000:1000 ./data`
- Invalid environment variables: Check for typos in variable names
- Missing `SESSION_SECRET`: This must be set for the application to start

### Cannot log in

**Verify credentials:**
- Check that you're using the correct username and password
- Default is `admin` / `changeme` unless customized

**Reset password:**
- Stop container: `docker stop ppcollection`
- Delete database: `rm ./data/app.db`
- Restart container: `docker start ppcollection`
- Database will be recreated with default credentials

**Check password hash:**
```bash
# Regenerate the hash
node scripts/hash-password.js your-password
# Update environment variable with new hash
```

### Database errors

**Corrupt database:**
```bash
# Restore from backup
docker stop ppcollection
cp ./backup/app.db.YYYYMMDD ./data/app.db
docker start ppcollection
```

**Migration issues:**
- Check logs for migration errors: `docker logs ppcollection`
- Ensure you're using a compatible version
- Restore from backup if problems persist

### Performance issues

**Slow queries:**
- SQLite performs well for collections up to 100,000+ records
- Ensure database is stored on fast storage (SSD recommended)
- Check available disk space

**Memory issues:**
- Default Node.js memory limits should be sufficient
- If needed, increase with: `docker run -e NODE_OPTIONS="--max-old-space-size=2048"`

### Container issues

**Container keeps restarting:**
```bash
# Check what's failing
docker logs ppcollection

# Common causes:
# - Missing environment variables
# - Permission issues with /data volume
# - Port conflicts
```

**Cannot access from other devices:**
- Ensure firewall allows port 3000
- Verify container is binding to 0.0.0.0, not 127.0.0.1
- Check Docker network settings

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/Gogorichielab/PPCollection/issues) for similar problems
2. Review container logs: `docker logs ppcollection`
3. Verify environment variables are set correctly
4. Ensure you're using a compatible Docker version
5. Open a new issue with:
   - Description of the problem
   - Steps to reproduce
   - Container logs
   - Your Docker and OS versions

## Application Testing Results

The application has been thoroughly tested and verified to work correctly. Below are the test results and screenshots demonstrating the functionality.

### Test Summary

✅ **Authentication**
- Login with valid credentials works correctly
- Logout functionality works as expected
- Invalid credentials are rejected
- Session management is working properly

✅ **Item Management**
- Create new firearm records with all fields
- View item details
- Edit existing records
- Delete records
- All CRUD operations validated

✅ **List and Sorting**
- Display items in a sortable table
- Sort by Make, Model, Caliber, and Serial number
- Both ascending and descending sort orders work
- Empty state displays helpful message

✅ **Data Export**
- CSV export generates properly formatted spreadsheet
- All fields are correctly exported
- Special characters and commas are properly escaped
- File downloads with appropriate headers

✅ **Data Validation**
- Required fields (Make and Model) are enforced
- Purchase price validates as a positive number
- Form validation provides clear error messages

### Screenshots

#### Login Page
![Login Page](https://github.com/user-attachments/assets/21bfa744-71b7-4801-8084-2623584bd3db)

The login page provides a clean, simple interface for authentication with username and password fields.

#### Empty Library View
![Empty Library](https://github.com/user-attachments/assets/01a298de-26fc-4836-8d86-56e67e977123)

When no items are in the library, users see a helpful message prompting them to add their first item.

#### Add Item Form
![Add Item Form](https://github.com/user-attachments/assets/5d489018-54f4-47ea-9d1e-6f41e2d6fb2b)

The form includes fields for all firearm details including make, model, serial number, caliber, purchase information, condition, status, and notes. The form also includes a section for recording sold information.

#### Item Detail View
![Item Detail](https://github.com/user-attachments/assets/392424e5-a922-4804-8a2f-8e64110e16f7)

Individual firearm records display all information in an organized, easy-to-read format with options to edit or delete.

#### Library Collection List
![Library List](https://github.com/user-attachments/assets/2b5420bc-264c-47d6-a354-d1aa71586a4c)

The main library view shows all firearms in a sortable table with quick access to view details. The table supports sorting by multiple columns including make, model, caliber, and serial number.

### Manual Testing Steps

To manually test the application:

1. **Start the application** using Docker Compose or npm:
   ```bash
   docker compose up --build
   # or
   npm start
   ```

2. **Test Authentication**:
   - Navigate to http://localhost:3000
   - Log in with username `admin` and password `changeme`
   - Verify successful redirect to library

3. **Test Adding Items**:
   - Click "Add Item" button
   - Fill in required fields (Make and Model)
   - Optionally fill in other fields
   - Click "Create" to save
   - Verify item appears in the list

4. **Test Viewing and Editing**:
   - Click "View" on any item in the list
   - Verify all details are displayed correctly
   - Click "Edit" to modify the record
   - Make changes and click "Save"
   - Verify changes are persisted

5. **Test Sorting**:
   - Click column headers in the library list
   - Verify the list sorts by that column
   - Click again to reverse sort order

6. **Test CSV Export**:
   - Click "Export" in the navigation menu
   - Verify CSV file downloads
   - Open in spreadsheet software to verify data

7. **Test Validation**:
   - Try to create an item without Make or Model
   - Verify validation error is displayed
   - Enter invalid purchase price (negative number)
   - Verify appropriate error message

8. **Test Logout**:
   - Click "Logout" button
   - Verify redirect to login page
   - Verify cannot access protected pages without login

### Test Environment

Tests were conducted with:
- Node.js v20.19.5
- npm 10.8.2
- SQLite database (better-sqlite3 v12.4.1)
- Express v5.1.0

All features are working as expected with no critical issues found.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

