# Update Plan: DatabaseOptimizer (config/database-optimizer.mjs)

## Required Updates & Improvements

- [x] **Security:**
  - [x] Ensure all raw SQL queries use parameterized inputs or Sequelize query methods to prevent SQL injection.
  - [x] Remove any direct string interpolation in SQL queries.
  - [x] Validate and sanitize all environment variable usage.

- [x] **Strict MVC Compliance:**
  - [x] Move any business logic that belongs in models out of DatabaseOptimizer.
  - [x] Ensure DatabaseOptimizer does not interact with Express req/res objects.
  - [x] Refactor any logic that mixes concerns.

- [x] **Clarity & Documentation:**
  - [x] Add or update JSDoc comments for all public methods and the class itself.
  - [x] Improve inline comments for complex logic blocks.

- [x] **Error Handling:**
  - [x] Ensure all errors are handled consistently and logged securely.
  - [x] Refactor error messages to follow the project's error response format if exposed to controllers.

- [x] **Test-Driven Development:**
  - [x] Create unit tests for all business logic in DatabaseOptimizer (in /tests/services/database-optimizer.test.mjs).
  - [x] Mock Sequelize and file system operations in tests.

- [x] **Code Quality:**
  - [x] Remove unused or obsolete methods.
  - [x] Refactor for ES2020+ syntax and clarity.
  - [x] Ensure all async methods use top-level await where appropriate.
  - [x] Remove hardcoded values; use config/constants where possible.

- [x] **Project Conventions:**
  - [x] Ensure all imports use ES Modules syntax.
  - [x] Ensure file naming and structure matches project standards.

## When & Where to Call DatabaseOptimizer

DatabaseOptimizer should be called from the application's initialization and maintenance scripts, not directly from controllers or views. Recommended usage:

- **Initialization:** Call relevant optimization/setup methods (e.g., createIndexes, setupMonitoring) after database migrations and before the app starts serving requests.
- **Maintenance:** Schedule regular calls to performMaintenance and backupDatabase via a cron job or background service to ensure ongoing database health and performance.
- **Testing:** Use analyzePerformance in test scripts to validate database statistics and index coverage.

> **Note:** DatabaseOptimizer should never be called from request/response cycles to avoid performance bottlenecks and maintain strict MVC separation.
