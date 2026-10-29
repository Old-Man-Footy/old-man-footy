# AGENTS.md — `controllers/`

## 1. Module Context

Request orchestration layer. Controllers read validated request input, invoke models/services, and produce an HTTP response (render, redirect, or JSON). They contain no SQL, no complex business rules, and no presentation markup.

Files: `admin`, `auth`, `carnival`, `carnivalClub`, `carnivalSponsor`, `club`, `clubPlayer`, `comingSoon`, `help`, `main`, `maintenance`, `subscription` (`*.controller.mjs`), and `api/subscription.controller.mjs` for JSON-only endpoints.

## 2. Tech Stack & Tooling

Express ^5.1.0 req/res, express-validator `validationResult`, Sequelize models via `models/index.mjs`, services from `services/`. ESM `.mjs`.

## 3. Architectural Standards

- Canonical structure (see `carnival.controller.mjs`):
  ```js
  const showCarnivalHandler = async (req, res) => { /* ... */ };
  export const show = asyncHandler(showCarnivalHandler);
  ```
  Internal handlers are `<verb><Resource>Handler`; exported names are the route-facing action (`list`, `show`, `getNew`, `postNew`, `getEdit`, `postEdit`, `delete`). All exported request handlers must be wrapped with `asyncHandler`. Legacy unwrapped exports (e.g., `carnivalSponsor.controller.mjs`) must be wrapped when touched.
- No `try/catch` for flow control in handlers; throw or let rejections propagate to the central error handler. `try/catch` is permitted only to translate a specific expected error into a user-facing response.
- Import models from `../models/index.mjs` only (guarantees associations are registered).
- Logic exceeding simple orchestration (multi-entity transactions, external calls, scoring/sorting, email) belongs in `services/` or a model static method.
- Check `validationResult(req)` before acting on input. Validation chains themselves live in `routes/`.
- Resource-level authorisation (e.g., "user belongs to this club") is checked in the controller after route guards; return 403/redirect with `error_msg`.
- Audit significant state changes via `AuditService` using `AuditService.ACTIONS.*`.
- Rendering contract: `res.render('<dir>/<view>', { title, ...data, additionalCSS: ['/styles/x.styles.css'], additionalJS: ['/js/x.js'] })`.
- Dual-mode responses: detect AJAX (`req.xhr`, `x-requested-with`, `accept: application/json`) and return `{ success, message, data? }`; otherwise flash + redirect.
- Flash keys: `success_msg`, `error_msg`, `warning_msg`, `info_msg`. Do not add new uses of the bare `success`/`error`/`warning` keys.

## 4. Coding Conventions

- File naming: `<resource>.controller.mjs` with `camelCase` resource (`carnivalClub.controller.mjs`). The kebab-case form in legacy guidance is incorrect.
- HTTP status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 201 created.
- JSDoc on every handler.
- Tests: `tests/controllers/<resource>.controller.test.mjs` (or `<resource>.<feature>.test.mjs`). Mock `models/index.mjs`, services, and `asyncHandler` (`asyncHandler: (fn) => fn`). Cover success, validation failure, not-found, forbidden, and AJAX vs HTML branches.

## 5. Workflow Policies

- New controllers or new actions require a corresponding route change and README "API Reference" update.
- See `docs/plans/controller-standardization-plan.md` for the ongoing standardisation effort; align new code with its target state.

## 6. Agent Directives

- Do not query with `sequelize.query` or construct SQL strings.
- Do not pass raw Sequelize instances containing sensitive fields (`passwordHash`, tokens) to views or JSON; select/omit attributes explicitly.
- Do not send email or call external HTTP directly; use services.
- Feature work spanning controller + model/service: begin with `/speckit.specify`.
- Changing a JSON response shape consumed by `public/js/` requires updating the client module and its jsdom test in the same change, and manual review if the shape is shared.
