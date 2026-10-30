# AGENTS.md — `config/`

## 1. Module Context

Configuration and infrastructure bootstrap. Owns environment loading, the Sequelize connection, migration execution, query optimisation, and application-wide constants. Imported by every other server layer; must not import from `controllers/`, `routes/`, `services/` or `views/`.

| File | Responsibility |
|---|---|
| `config.mjs` | `setEnvironmentVariables()` loads `.env.<NODE_ENV>` then `.env`; `getCurrentConfig()` exposes validated settings |
| `database.mjs` | Sequelize instance (`sequelize`), per-environment SQLite path, Umzug migration runner, `setupDatabase()`, `closeConnection()` |
| `database-optimizer.mjs` | Indexing/performance helpers |
| `constants.mjs` | Enumerations and upload/gallery configuration (`AUSTRALIAN_STATES`, `SPONSORSHIP_LEVELS`, `APPROVAL_STATUS`, `FORM_UPLOAD_CONFIG`, `FEATURE_FLAGS`, etc.) |
| `config.cjs` | CommonJS config consumed **only** by sequelize-cli via `.sequelizerc` |

Database files: `data/dev-old-man-footy.db`, `data/test-old-man-footy.db`, `data/old-man-footy.db` (production).

## 2. Tech Stack & Tooling

- Node.js ESM (`.mjs`); `config.cjs` is the sole CommonJS exception.
- Sequelize ^6.37.7, sqlite3 ^5.1.7, Umzug ^3.8.2 (`SequelizeStorage`, table `SequelizeMeta`), dotenv ^17.2.2 (dynamic import).

## 3. Architectural Standards

- `setEnvironmentVariables()` must run before any module reads `process.env` (enforced by top-level `await` in `app.mjs`). Modules that depend on env at import time must be imported dynamically after it.
- `setupDatabase()` runs pending migrations on every startup, including production. Anything added to it executes against live data.
- Constants are the single source of truth for enums. Models, validators, controllers and views import them; never duplicate literals.
- Each constant enum is exported as both an object (`X`) and an array (`X_ARRAY = Object.values(X)`).
- Environment path resolution for SQLite must stay consistent between `database.mjs` and `config.cjs`.
- `pg`/`pg-hstore` are installed but unused; the dialect is SQLite. Do not switch dialects.

## 4. Coding Conventions

- New env vars: read through `getEnvVar(key, fallback, required)` semantics in `config.mjs`; production-required variables must fail fast when missing; fallbacks are permitted only for development/test.
- Every new env var must be documented in README "Configuration" and, if used in deployment, added to both compose files (via `yq`).
- JSDoc on every export. Constants carry a one-line JSDoc describing domain meaning.
- Tests: `tests/config/` (e.g., `database.test.mjs`).

## 5. Workflow Policies

- All changes in this directory are CODEOWNERS-sensitive and require maintainer review.
- Branch as `chore/config-<slug>` or `feat/<slug>`; PR must list added/changed env vars and defaults.

## 6. Agent Directives

- Do not modify `database.mjs` migration resolution, storage table name, or DB file paths without manual architectural review.
- Do not add synchronous `fs` reads of `.env` files or bypass `setEnvironmentVariables()`.
- Do not print `process.env` or `getCurrentConfig()` output.
- Adding a value to an existing constant enum requires checking every consumer (`grep -rn "<CONST_NAME>"`) including views, validators and migrations; removing or renaming a value requires manual review and a data migration.
