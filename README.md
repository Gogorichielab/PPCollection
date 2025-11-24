# Pew Pew Collection

Pew Pew Collection is a self-hosted web app for tracking a personal firearms inventory. The app runs entirely offline and stores records in a local SQLite database.

[![CI & Release](https://github.com/Gogorichielab/PPCollection/actions/workflows/release.yml/badge.svg)](https://github.com/Gogorichielab/PPCollection/actions/workflows/release.yml)
![GitHub License](https://img.shields.io/github/license/gogorichielab/PPCollection)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
![GitHub Release](https://img.shields.io/github/v/release/gogorichielab/PPCollection)
![GitHub repo size](https://img.shields.io/github/repo-size/gogorichielab/PPCollection)


## Features
- Catalog firearms with basic identifying information
- Runs in Docker with no external dependencies
- Ships with a default admin account that can be customized via environment variables
- Password recovery system for users who forget their password

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
  -e SESSION_COOKIE_SECURE=false \
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
export SESSION_COOKIE_SECURE=false # Set to true when serving over HTTPS
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=changeme
export DATABASE_PATH="$PWD/data/app.db"
npm start
```

**Cookie security**

Set `SESSION_COOKIE_SECURE=true` when running behind HTTPS or a reverse proxy that terminates TLS. Leave it `false` (the default) for plain HTTP setups so the login session cookie can be set correctly.

Then open <http://localhost:3000> in your browser.

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

