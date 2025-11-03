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

## Application Testing Results

The application has been thoroughly tested and verified to work correctly. Below are the test results and screenshots demonstrating the functionality.

### Test Summary

✅ **Authentication**
- Login with valid credentials works correctly
- Logout functionality works as expected
- Invalid credentials are rejected
- Session management is working properly

✅ **Firearm Management**
- Create new firearm records with all fields
- View firearm details
- Edit existing firearm records
- Delete firearm records
- All CRUD operations validated

✅ **List and Sorting**
- Display firearms in a sortable table
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
![Login Page](https://github.com/user-attachments/assets/d41c3134-2e97-43cf-b450-c1319506e46d)

The login page provides a clean, simple interface for authentication with username and password fields.

#### Empty Collection View
![Empty Firearms List](https://github.com/user-attachments/assets/14b570f7-37cb-4432-93c8-ef896cc283ed)

When no firearms are in the collection, users see a helpful message prompting them to add their first firearm.

#### Add Firearm Form
![Add Firearm Form](https://github.com/user-attachments/assets/0a542b95-8d03-4c46-b053-4cc18b3edba4)

The form includes fields for all firearm details including make, model, serial number, caliber, purchase information, condition, location, status, and notes.

#### Firearm Detail View
![Firearm Detail](https://github.com/user-attachments/assets/b2f5ecab-d7dd-415c-880a-79c371a6bf53)

Individual firearm records display all information in an organized, easy-to-read format with options to edit or delete.

#### Firearms Collection List
![Firearms List](https://github.com/user-attachments/assets/f64ccf8d-a33a-4655-831c-6c5339798a64)

The main collection view shows all firearms in a sortable table with quick access to view details. The table supports sorting by multiple columns.

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
   - Verify successful redirect to firearms list

3. **Test Adding Firearms**:
   - Click "Add Firearm" button
   - Fill in required fields (Make and Model)
   - Optionally fill in other fields
   - Click "Create" to save
   - Verify firearm appears in the list

4. **Test Viewing and Editing**:
   - Click "View" on any firearm in the list
   - Verify all details are displayed correctly
   - Click "Edit" to modify the record
   - Make changes and click "Save"
   - Verify changes are persisted

5. **Test Sorting**:
   - Click column headers in the firearms list
   - Verify the list sorts by that column
   - Click again to reverse sort order

6. **Test CSV Export**:
   - Click "Download as Spreadsheet"
   - Verify CSV file downloads
   - Open in spreadsheet software to verify data

7. **Test Validation**:
   - Try to create a firearm without Make or Model
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

