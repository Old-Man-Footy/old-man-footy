# AGENTS.md — Repository Root

Scope: entire repository. Directory-level `AGENTS.md` files refine these rules for their subtree; on conflict, the more specific file governs within its directory. `.github/copilot-instructions.md` is legacy guidance; where it conflicts with an `AGENTS.md`, the `AGENTS.md` governs (the `AGENTS.md` files record what the codebase actually does).

## 1. Module Context

Old Man Footy is a server-rendered web platform for Rugby League Masters carnival management (carnivals, clubs, players, sponsors, galleries, email notifications, MySideline.com.au data sync). Production URL: `https://oldmanfooty.au`. Single deployable Node.js process; no microservices, no separate SPA.

Layer map (request flow top to bottom):

| Path | Layer | Responsibility |
|---|---|---|
| `app.mjs` | Composition root | Env load, middleware order, route mounting, central error handler, startup/shutdown |
| `routes/` | HTTP routing | URL → middleware chain → controller; express-validator chains |
| `middleware/` | Cross-cutting | Auth, security, CSRF, rate limiting, uploads, flash, site modes |
| `controllers/` | Request orchestration | Thin handlers; render views or return JSON |
| `services/` | Domain/integration | Email, MySideline sync, image handling, audit, scheduling |
| `models/` | Persistence/domain | Sequelize models, associations, model-level business rules |
| `migrations/` | Schema | Forward/backward schema changes (auto-applied on startup) |
| `config/` | Configuration | Env loading, DB connection, Umzug, shared constants |
| `utils/` | Pure helpers | Date, upload, view and logging helpers |
| `views/` | Presentation | EJS templates |
| `public/` | Static assets | Client-side ES modules, CSS, runtime uploads |
| `docs/` | Content | In-app help markdown (seeded to DB), plans |
| `scripts/` | Operations | Migrations, seeding, sync tooling, maintenance |
| `tests/` | Verification | Vitest suites (Node + jsdom) |

Out of scope for agents: `data/` (SQLite databases), `logs/`, `public/uploads/` (user content), `node_modules/`, `.env*` files.

## 2. Tech Stack & Tooling

| Concern | Technology | Version (package.json) |
|---|---|---|
| Runtime | Node.js | 22 (Docker `node:22-alpine`); local dev ≥ 20 |
| Language | JavaScript ES2022, **ESM only** (`"type": "module"`) | — |
| Web framework | Express | ^5.1.0 |
| ORM / DB | Sequelize / SQLite3 | ^6.37.7 / ^5.1.7 |
| Migrations runtime | Umzug (via `config/database.mjs`) | ^3.8.2 |
| Templating | EJS + express-ejs-layouts | ^3.1.10 / ^2.5.1 |
| UI | Bootstrap 5.3 + Bootstrap Icons (CDN) | 5.3.0 |
| Validation | express-validator | ^7.2.1 |
| Security | helmet, express-rate-limit, custom CSRF, Cloudflare Turnstile | ^8.1.0 / ^8.1.0 |
| Sessions | express-session + connect-session-sequelize | ^1.18.1 / ^8.0.2 |
| Uploads | multer | ^2.0.1 |
| Email | Resend | ^4.8.0 |
| Scraping | Playwright (system Chromium in Docker) | ^1.55.0 |
| Scheduling | node-cron | ^4.2.1 |
| Tests | Vitest + @vitest/coverage-v8, jsdom, supertest | ^3.2.4 |
| Formatting | Prettier (`.prettierrc`: 2 spaces, single quotes, semi, width 100, LF) | — |
| Container | Docker multi-stage (`test`, `production` targets) | — |

TypeScript is prohibited. No bundler/transpiler exists; client code is shipped as authored.

## 3. Architectural Standards

- Strict layering: `routes → middleware → controllers → services/models`. Views receive only controller-supplied locals. No layer may import from a layer above it (e.g., models must not import controllers or services that import controllers).
- All persistence goes through Sequelize model APIs. Raw SQL (`sequelize.query`) is prohibited outside `migrations/` and `config/database*.mjs`.
- All schema changes go through a new file in `migrations/`. `sequelize.sync({ alter })` is prohibited.
- Configuration is read from `process.env` through `config/config.mjs`; enumerations come from `config/constants.mjs`. No hardcoded secrets, URLs that vary by environment, or duplicated enum literals.
- Middleware order in `app.mjs` is load-bearing: static → body parsing → method-override → session → session auth → flash → `applySecurity` → maintenance → coming-soon → template locals → routes → 404 → error handler.
- Feature toggles are environment flags (`FEATURE_*`, `MYSIDELINE_*`, `ENABLE_RATE_LIMITING`). New behaviour that can affect production traffic must be gated by a flag.
- State: server state lives in SQLite (via models) and the session store. No in-process global caches except those already in `middleware/failureCounterStore.mjs`. Client state lives in each manager object's `state` property.

## 4. Coding Conventions

- Modules: `.mjs` for all server code; `.js` for `public/js/` and `migrations/` (both are ESM under `"type": "module"`). `config/config.cjs` and `.sequelizerc` are the only CommonJS files and exist solely for sequelize-cli.
- Naming: variables/functions `camelCase`; classes/models `PascalCase`; constants `UPPER_SNAKE_CASE`; DB columns `camelCase`; table names `snake_case` plural (e.g., `contact_submissions`).
- File naming is per-directory; see each directory's `AGENTS.md`.
- JSDoc is required on every exported function, class and public method.
- Error handling: async route handlers are wrapped with `asyncHandler` and propagate via `next(error)`. Set `error.status` for non-500 errors. Never swallow errors silently.
- Response contracts (do not introduce a third shape):
  - Central handler / auth / controllers: `{ success: boolean, message: string, data?: any }`.
  - Security/CSRF middleware: `{ error: { status, message } }`.
  - HTML requests: `req.flash('<type>_msg', ...)` + redirect, or `res.render`.
- Logging: `console.*` with the existing emoji prefixes (✅ ❌ ⚠️ 🔄 📧). Never log secrets, passwords, tokens or full session objects.
- Testing: Vitest, Arrange-Act-Assert, mirrored under `tests/`. New or changed business logic in models, controllers, services or middleware requires tests. Coverage threshold: 70% lines/functions/branches/statements.
- Language: Australian English in user-facing copy (e.g., "organiser", "colour").

## 5. Workflow Policies

- Repository-first: the repository is the source of truth. Read the target files, the governing `AGENTS.md`, and existing tests before proposing changes. Do not rely on external docs where code shows the actual convention.
- Branching:
  - `main` is protected and deployable. No direct commits or force-pushes to `main`.
  - Work branches: `feat/<slug>`, `fix/<slug>`, `refactor/<slug>`, `test/<slug>`, `docs/<slug>`, `chore/<slug>`. Lowercase kebab-case slugs.
  - One concern per branch. Rebase on `main` before opening a PR.
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), imperative mood, matching existing history.
- Pull requests: required for all merges to `main`. PR must state scope, migration impact, new env vars, and test evidence (`npm run test:all` output).
- CODEOWNERS: `.github/CODEOWNERS` does not yet exist. Until a maintainer creates it, every PR requires approval from an Old-Man-Footy repository maintainer. When created, it must assign owners for at minimum: `app.mjs`, `middleware/auth.mjs`, `middleware/security.mjs`, `config/`, `migrations/`, `models/index.mjs`, `Dockerfile`, `docker-compose.*.yml`, `package.json`, `package-lock.json`. Agents must not create or edit `CODEOWNERS`.
- Required checks before PR: `npm run test` and `npm run test:js` pass; no new Prettier violations in touched files; README updated when scripts, env vars or routes change.

## 6. Agent Directives

Hard constraints:

1. Never run `npm start`, `npm run dev`, `npm run dev:debug`, `node app.mjs`, or any `docker:run:*` script. Ask the human to start/restart the site.
2. Never read, print, create or modify `.env`, `.env.*`, `data/*.db`, `logs/`, or `public/uploads/`. `.env.development` is tracked; never add secrets to it.
3. Implement only what was requested. Suggest enhancements; do not implement them without approval. If requirements are ambiguous, restate understanding and ask before writing code.
4. Never commit, push, merge, or open PRs unless explicitly instructed. Never commit to `main`.
5. Never add, remove or upgrade a dependency without explicit approval.
6. Never weaken security controls (CSRF, rate limits, helmet/CSP, auth middleware, input validation, escaping) to make a feature or test pass.
7. Never disable, skip (`it.skip`, `describe.skip`) or delete failing tests to obtain a green run. Never lower coverage thresholds.

Plans:

- Plain checklists explicitly requested as "plans" live in `docs/plans/` (see `docs/AGENTS.md`).

YQ:

- Use `yq` (mikefarah v4) for all reads and edits of YAML: `docker-compose.prod.yml`, `docker-compose.test.yml`, and any `.github/**/*.yml`. Prefer targeted in-place expressions (`yq -i '.services.app.environment += ["KEY=${KEY:-default}"]' docker-compose.prod.yml`) over free-text rewrites. Validate after edit with `yq eval '.' <file> > /dev/null`.
- Use `yq --front-matter=extract` to read/validate front matter in `docs/help/*.md`.

Manual architectural review required (stop and request human approval before implementing):

- Changes to `app.mjs` middleware order, session configuration, or route mount points.
- Any change to `middleware/auth.mjs`, `middleware/security.mjs`, `middleware/turnstile.mjs`, CSP/helmet configuration, or CSRF handling.
- New migrations that drop, rename or change the type of columns/tables, or that modify data.
- Changes to model associations in `models/index.mjs`.
- New dependencies, new external integrations, or changes to MySideline scraping targets/schedules.
- Changes to email-sending conditions or recipients.
- Changes to response contract shapes, role/permission semantics, `Dockerfile`, compose files, or test/coverage configuration.
- Any change touching more than three layers in one PR.
