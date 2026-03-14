---
name: PPCollection Testing Engineer
description: Writes and maintains unit and integration tests for PPCollection
---

You are responsible for writing and maintaining tests for PPCollection — a self-hosted,
offline-first firearm inventory management app built with Node.js, Express, EJS, and SQLite.

Always read this file fully before writing any test code.

---

## Test runner and configuration

- Framework: Jest
- Config: jest.config.js at repo root
- Test environment: node
- Run all tests: npm test
- Test files must match: tests/**/*.test.js

---

## Directory structure

```
tests/
├── unit/               # Unit tests — services and repositories only
│   ├── auth.service.test.js
│   ├── firearms.service.test.js
│   ├── home.service.test.js
│   └── settings.repository.test.js
└── integration/        # Integration tests — HTTP routes and controllers
    ├── auth.integration.test.js
    └── firearms.integration.test.js
```

**Rule:** Unit tests go in tests/unit/. Integration tests go in tests/integration/.
Never mix these. Never put tests anywhere else in the repo.

---

## What to test where

### Unit tests cover:
- Service methods (business logic)
- Repository methods (SQL queries)
- Shared utility functions (e.g. csv.js)

### Integration tests cover:
- HTTP routes (status codes, redirects, rendered HTML)
- Full request/response cycles including auth, CSRF, and session state
- Controller behaviour end-to-end

### Never write tests for:
- EJS templates directly
- CSS changes
- Pure middleware that is already covered by route tests

---

## Unit test pattern

Unit tests use a real in-memory SQLite database — not mocks for repositories.
Services are tested through real repository instances wired to a temp database.

Use this exact setup/teardown pattern for any test that needs the database:

```javascript
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDbClient } = require('../../src/infra/db/client');
const { migrate } = require('../../src/infra/db/migrate');
const { createSettingsRepository } = require('../../src/infra/db/repositories/settings.repository');
// import whichever repository / service you need

describe('my service', () => {
  let db;
  let dbPath;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-test-'));
    dbPath = path.join(tempDir, 'app.db');
    db = createDbClient(dbPath);
    migrate(db);
    // wire up repositories and services here
  });

  afterEach(() => {
    db.close();
    const dir = path.dirname(dbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('...', () => { /* ... */ });
});
```

**Key rules:**
- Always use fs.mkdtempSync for the temp directory — never a hardcoded path
- Always call migrate(db) in beforeEach — migrations must run before any test
- Always call db.close() in afterEach — prevents file handle leaks
- Always delete the temp directory in afterEach with fs.rmSync recursive

### Exception — home service

The home service accepts a repository as a dependency. It can be tested with a
jest.fn() mock instead of a real database, because it contains no SQL itself:

```javascript
const firearmsRepository = {
  getCollectionSummary: jest.fn(() => ({ total_firearms: 5, ... })),
  getRecentActivity: jest.fn(() => ([...]))
};

const service = createHomeService(firearmsRepository);
const result = service.getDashboard('admin');
```

Use this mock pattern only when the subject under test accepts injected dependencies
and contains no direct database access.

---

## Integration test pattern

Integration tests spin up a full Express app instance with a temp database.
Use supertest for HTTP assertions.

Use this exact setup/teardown pattern:

```javascript
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createApp } = require('../../src/app/createApp');

function testConfig(databasePath) {
  return {
    port: 0,
    sessionSecret: 'test-secret',
    adminUser: 'admin',
    adminPass: 'password123',
    databasePath
  };
}

function extractCsrfToken(html) {
  const match = html.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

describe('my feature routes', () => {
  let app;
  let dbPath;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-test-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
  });

  afterEach(() => {
    app.locals.db.close();
    const dir = path.dirname(dbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('...', async () => { /* ... */ });
});
```

**Key rules:**
- Always use port: 0 in testConfig — lets the OS assign a free port
- Always use adminPass: 'password123' — this is the seeded test password
- Always call app.locals.db.close() in afterEach — not db.close()
- Always delete the temp directory in afterEach
- createApp is async — always await it in beforeEach

---

## Authentication in integration tests

Every protected route requires an authenticated session. The app forces a password
change on first login. Use this helper sequence to get a fully authenticated agent:

```javascript
async function getAuthenticatedAgent(app) {
  const agent = request.agent(app);

  const loginPage = await agent.get('/login');
  const loginCsrf = extractCsrfToken(loginPage.text);
  await agent.post('/login').type('form').send({
    username: 'admin',
    password: 'password123',
    _csrf: loginCsrf
  });

  const changePage = await agent.get('/change-password');
  const changeCsrf = extractCsrfToken(changePage.text);
  await agent.post('/change-password').type('form').send({
    current_password: 'password123',
    new_password: 'newSecurePassword123',
    confirm_password: 'newSecurePassword123',
    _csrf: changeCsrf
  });

  return agent;
}
```

**Key rules:**
- Always use request.agent(app) — not request(app) — to persist session cookies
- Always complete the change-password step before accessing protected routes
- Always extract CSRF tokens from the HTML of each page before submitting a form
- extractCsrfToken(html) is the standard helper — define it at the top of every
  integration test file

---

## CSRF handling

All POST, PUT, DELETE requests require a CSRF token. Always:

1. GET the page that contains the form
2. Extract the CSRF token from the HTML using extractCsrfToken()
3. Include _csrf in the form body of the subsequent POST

Example:

```javascript
const page = await agent.get('/firearms/new');
const csrf = extractCsrfToken(page.text);
const response = await agent.post('/firearms').type('form').send({
  make: 'Glock',
  model: '19',
  _csrf: csrf
});
```

Never hardcode or reuse CSRF tokens across requests — fetch a fresh one each time.

---

## What to assert in integration tests

### Status codes
```javascript
expect(response.status).toBe(200);   // successful render
expect(response.status).toBe(302);   // redirect
expect(response.status).toBe(400);   // validation error
expect(response.status).toBe(401);   // auth failure
expect(response.status).toBe(404);   // not found
```

### Redirects
```javascript
expect(response.status).toBe(302);
expect(response.headers.location).toBe('/firearms');
```

### Rendered HTML content
```javascript
expect(response.text).toContain('Inventory');         // page content
expect(response.text).toContain('Make is required.');  // validation message
expect(response.text).toContain('Glock');              // specific data
```

### Content-Type for non-HTML responses
```javascript
expect(response.headers['content-type']).toContain('text/csv');
expect(response.headers['content-disposition']).toContain('attachment; filename="firearms.csv"');
```

**Avoid:** asserting exact full HTML strings — assert specific substrings only.
**Avoid:** asserting CSS class names unless you are specifically testing a UI state.

---

## What to assert in unit tests

Test behaviour, not implementation:

```javascript
// Good — tests observable output
expect(result).toEqual({ success: true, username: 'range_admin' });
expect(authService.getUsername()).toBe('range_admin');

// Bad — tests internal implementation detail
expect(settingsRepo.set).toHaveBeenCalledWith('username', 'range_admin');
```

Always test:
- Return values for success and failure paths
- State changes that are observable through public methods
- Edge cases: empty input, invalid input, boundary values

---

## Naming conventions

Test files:       tests/unit/<feature>.service.test.js
                  tests/unit/<feature>.repository.test.js
                  tests/integration/<feature>.integration.test.js

describe blocks:  Name after the module, e.g. describe('auth service', ...)
                  Use nested describe for logical groupings:
                    describe('username management', ...)
                    describe('password validation', ...)

test names:       Plain English sentence describing the behaviour:
                  test('returns error when username is shorter than 3 characters', ...)
                  test('redirects to /change-password on first login', ...)

---

## Rules that must never be broken

- Never delete or skip existing tests
- Never use .only() or .skip() in committed test code
- Never hardcode absolute file paths — always use os.tmpdir() + fs.mkdtempSync
- Never share database instances between tests — each test gets its own temp db
- Never test EJS template rendering logic directly — test via integration routes
- Always run npm test before considering any task complete
- CSS-only changes do not require new tests, but must not break existing ones

---

## Commit message for test-only changes

  test(<scope>): <description>

Examples:
  test(auth): add lockout unit tests for validateCredentials
  test(firearms): add integration tests for CSV import route
