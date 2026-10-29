# AGENTS.md — `scripts/`

## 1. Module Context

Operational CLI scripts executed with `node scripts/<file>.mjs` or via `npm run`. Some are imported by the application at runtime (`seed-help-content.mjs` runs on startup). Scripts may use models, services and config; application layers must not import scripts except the existing `seed-help-content.mjs` dependency.

| Script | Purpose | Risk |
|---|---|---|
| `run-migrations.mjs` (`npm run migrate`) | Applies pending migrations via `setupDatabase()` | High |
| `seed-database.mjs` (`npm run seed`) | Seeds dev/test fixtures (`fixtures/`, `utilities/*Seeder.mjs`) | High outside dev |
| `purge-seed-data.mjs` | Removes seed data, preserves real data | High |
| `seed-help-content.mjs` | Upserts `docs/help/*.md` into `HelpContent` | Low |
| `manual-mysideline-sync.mjs`, `check-sync-status.mjs`, `capture-mysideline-data.mjs` | MySideline operations | Medium (live network) |
| `scheduled-maintenance.mjs` | Maintenance tasks | Medium |
| `generate-secret.mjs` | Generates session secret | Low |
| `smoke-health.mjs` | Container `/health` smoke check | Low |
| `utilities/` | Backup, cleanup, env validation, seeders | Varies |
| `tests/` | Ad-hoc diagnostic scripts (not part of Vitest) | Low |

## 2. Tech Stack & Tooling

Node.js ESM `.mjs`, Sequelize models, Playwright (MySideline scripts). Some files carry `#!/usr/bin/env node`.

## 3. Architectural Standards

- Each script: load config, perform work in `async function main()`, set `process.exitCode` (do not call `process.exit()` mid-flight), and close the DB connection (`closeConnection()`) in `finally`.
- Destructive scripts must check `NODE_ENV` and refuse to run against production unless an explicit confirmation flag is passed.
- Exported functions (e.g., `seedHelpContent`) must be side-effect free on import.
- Reuse services for business operations; do not duplicate service logic in scripts.

## 4. Coding Conventions

- File naming: `kebab-case.mjs`; utilities `camelCase.mjs`; fixtures `<entity>Fixtures.mjs`.
- Emoji-prefixed console output consistent with the codebase.
- Header JSDoc block describing purpose, usage and environment requirements.
- Tests for importable script functions in `tests/scripts/`.

## 5. Workflow Policies

- New scripts exposed via `package.json` require README "Installation/Scripts" update and approval (package.json is CODEOWNERS-sensitive).

## 6. Agent Directives

- Never execute `run-migrations.mjs`, `seed-database.mjs`, `purge-seed-data.mjs`, `utilities/dataCleanup.mjs`, `utilities/databaseBackup.mjs`, `scheduled-maintenance.mjs` or any MySideline script without explicit instruction naming the script and target environment.
- Never run scripts that contact external services (MySideline, Resend) during routine development.
- New operational scripts that modify data require manual architectural review.
