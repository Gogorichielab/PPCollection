# Architecture

PPCollection is organized by layer and feature to keep HTTP handling, business logic, and persistence isolated.

## Directory layout

- `src/app`: Express app composition (`createApp`), global middleware, and route registration.
- `src/features`: Feature modules (`auth`, `firearms`) split into routes, controllers, services, and validators.
- `src/infra`: Infrastructure concerns such as environment config and SQLite client/migrations/repositories.
- `src/shared`: Reusable utilities and shared error types.
- `src/views`: EJS templates grouped by feature (`auth`, `firearms`, `errors`) and shared partials.
- `src/public`: Static frontend assets.

## Request flow

1. `src/server.js` loads configuration and creates the app.
2. `src/app/createApp.js` initializes DB, runs migrations, and wires middleware + routes.
3. Feature route modules map URLs to controllers.
4. Controllers delegate to services.
5. Services call repositories/utilities and return data for rendering.

## Database flow

- Connection is created in `src/infra/db/client.js`.
- Startup migration runner (`src/infra/db/migrate.js`) applies SQL files in `src/infra/db/migrations` and legacy column guards.
- Repositories in `src/infra/db/repositories` encapsulate SQL queries.
