# AGENTS.md — `tests/`

## 1. Module Context

Automated verification for server and client code. Two independent Vitest suites:

| Suite | Config | Command | Environment | Scope |
|---|---|---|---|---|
| Server | `vitest.config.mjs` | `npm run test` | node, single fork | `tests/**/*.test.mjs` excluding `tests/js/` |
| Client | `vitest.config.js.mjs` | `npm run test:js` | jsdom | `tests/js/**/*.test.mjs` |

`npm run test:all` runs both. Support files: `setup.mjs` (global DB connection check), `teardown.mjs`, `vitest.env.mjs` (forces `NODE_ENV=test`, filters console), `vitest.setup.mjs`, `fixtures/`.

## 2. Tech Stack & Tooling

Vitest ^3.2.4 (`describe`, `it`, `expect`, `vi`), @vitest/coverage-v8, jsdom ^26.1.0, supertest ^7.0.0, SQLite test DB `data/test-old-man-footy.db`. Aliases: `@` → repo root, `@tests` → `tests/`.

## 3. Architectural Standards

- Directory structure mirrors source: `controllers/`, `middleware/`, `models/`, `services/`, `services/email/`, `config/`, `utils/`, `views/`, `scripts/`, `integration/`, `js/<domain>/`.
- Unit tests isolate the unit: controllers mock `models/index.mjs`, services and `asyncHandler`; services mock Resend, Playwright, HTTP and filesystem. Model tests use the real SQLite test database.
- `vi.mock(...)` calls precede imports of the module under test.
- Server suite runs serially (`singleFork`) because of the shared SQLite file; tests must clean up rows they create and not depend on execution order.
- Coverage scope: `controllers/`, `services/`, `models/`, `middleware/` with 70% global thresholds.
- Integration tests use captured fixtures (`fixtures/mysideline-captured-data.mjs`); no live network.

## 4. Coding Conventions

- Naming: `<unit>.test.mjs`; controllers `<resource>.controller.test.mjs` or `<resource>.<feature>.test.mjs`; models `<lowercasemodel>.model.test.mjs`; client tests named after the `public/js` file.
- Arrange-Act-Assert with blank-line separation; one behaviour per `it`; descriptive `it('should ...')` names.
- Required cases for request handlers: success, validation failure, not found, unauthorised/forbidden, AJAX (JSON) and HTML (redirect/render) branches.
- Mock factories (`createMockX(overrides)`) for repeated fixtures.
- No real timers for scheduled code; use `vi.useFakeTimers()`.

## 5. Workflow Policies

- Every PR that changes logic includes or updates tests; PR includes `npm run test:all` summary.
- Branch as `test/<slug>` for test-only changes.
- Duplicate suites exist (`middleware/gallery-upload.test.mjs` and `middleware/galleryUpload.test.mjs`); consolidate only when instructed.

## 6. Agent Directives

- Never use `.skip`, `.only`, `.todo` in committed tests, delete failing tests, or weaken assertions to make them pass. Report failing tests with output.
- Never point tests at the development or production database.
- Never change `vitest.config*.mjs`, coverage thresholds, `setup.mjs` or `teardown.mjs` without manual architectural review.
