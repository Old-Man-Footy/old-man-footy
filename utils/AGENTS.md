# AGENTS.md — `utils/`

## 1. Module Context

Stateless helper functions shared across server layers: `dateUtils.mjs` (date parsing incl. Excel serial dates, timezone handling), `uploadProcessor.mjs` (post-multer file processing), `viewHelpers.mjs` / `uiHelpers.mjs` (view formatting), `sequelizeLogger.mjs` (query logging / slow-query reporting via `SLOW_QUERY_THRESHOLD_MS`).

## 2. Tech Stack & Tooling

Node.js ESM `.mjs`; Node built-ins only unless the helper already depends on a library.

## 3. Architectural Standards

- Pure functions preferred; no database access, no Express `req`/`res` handling, no imports from `controllers/`, `routes/`, `services/`.
- Filesystem side effects are permitted only in `uploadProcessor.mjs` and must use paths from `config/constants.mjs`.
- Default timezone is `Australia/Sydney` (`TZ`); date helpers must not assume server-local time.
- Promote a helper here only when used by two or more modules; otherwise keep it local.

## 4. Coding Conventions

- File naming: `camelCase.mjs`. Named exports only.
- JSDoc with parameter and return types on every export.
- Tests: `tests/utils/<file>.test.mjs`; cover edge cases (null, invalid input, DST boundaries for dates).

## 5. Workflow Policies

Standard root policies apply. Branch as `refactor/<slug>` or `fix/<slug>`.

## 6. Agent Directives

- Do not change the signature or return shape of an existing export without updating every caller (`grep -rn "<fnName>"`) in the same change.
- Changes to `sequelizeLogger.mjs` logging content require confirming no sensitive values are logged.
