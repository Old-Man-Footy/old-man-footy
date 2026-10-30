# AGENTS.md — `migrations/`

## 1. Module Context

Ordered, immutable database schema history. Executed by Umzug from `config/database.mjs` (`setupDatabase()`) on **every application startup**, including production, and by `npm run migrate`. Applied migrations are recorded by filename in `SequelizeMeta`.

## 2. Tech Stack & Tooling

Sequelize `QueryInterface` ^6.37.7, Umzug ^3.8.2, SQLite3. Files use `.js` extension with ESM syntax (`"type": "module"`).

## 3. Architectural Standards

- File format (mandatory):
  ```js
  'use strict';

  /** @type {import('sequelize-cli').Migration} */
  export const up = async (queryInterface, Sequelize) => { /* ... */ };
  export const down = async (queryInterface, Sequelize) => { /* ... */ };
  ```
  `module.exports` is prohibited. If generated with `npx sequelize-cli migration:generate --name <slug>`, convert the template to the ESM form above.
- Every migration implements a working `down` that reverses `up`.
- Migrations are immutable once merged to `main`: never edit, rename, reorder or delete an existing file. Fix forward with a new migration.
- Additive changes (new table, nullable column, index) are preferred. Columns added to populated tables must be nullable or carry a `defaultValue`.
- SQLite constraints: column alteration recreates tables; wrap multi-step changes in `queryInterface.sequelize.transaction()` and verify foreign keys survive.
- Migrations must be idempotent-safe where feasible (check `describeTable` before `addColumn` when repairing drift).
- Data backfills are kept minimal and deterministic; no external calls, no model imports that may change later (use `queryInterface` directly).

## 4. Coding Conventions

- Filename: `YYYYMMDDHHMMSS-<kebab-case-description>.js` using UTC time of creation; timestamp must be later than every existing migration.
- Table names `snake_case`; column names `camelCase`, matching models.
- Include `createdAt`/`updatedAt` with defaults on new tables (see `20250924120000-fix-timestamp-defaults.js`).
- Add indexes for new foreign keys and frequent filter columns.
- Validation: run `npm run test` (test DB) after adding a migration; model tests must pass against the migrated schema.

## 5. Workflow Policies

- Entire directory is CODEOWNERS-sensitive.
- PR description must state: tables/columns affected, reversibility, data impact, and estimated runtime on production data.
- Branch as `feat/<slug>` or `fix/db-<slug>`.

## 6. Agent Directives

- Never run migrations against `data/dev-old-man-footy.db` or `data/old-man-footy.db` without explicit instruction; never run `db:migrate:undo` without explicit instruction.
- Manual architectural review required for any migration that drops/renames/retypes columns or tables, modifies existing data, or alters constraints/keys.
- A migration must accompany every model attribute change; reference the model file in the migration header comment.
