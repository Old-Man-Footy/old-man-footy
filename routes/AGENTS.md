# AGENTS.md — `routes/`

## 1. Module Context

HTTP routing layer. Maps URLs to ordered middleware chains terminating in a controller function. Owns request validation chains (express-validator). Contains no business logic and no database access.

Mount points (defined in `app.mjs`; changes require architectural review):

| Mount | File |
|---|---|
| `/` | `index.mjs` |
| `/auth` | `auth.mjs` |
| `/carnivals` | `carnivals.mjs`, `carnivalClubs.mjs` |
| `/carnival-sponsors` | `carnivalSponsors.mjs` |
| `/clubs` | `clubs.mjs` (+ `clubPlayers.mjs` sub-router) |
| `/admin` | `admin.mjs` |
| `/api` | `api/index.mjs` → `sponsors`, `images`, `help`, `subscriptions` |
| `/api/subscribe` | `subscription.mjs` |

## 2. Tech Stack & Tooling

Express ^5.1.0 `Router`, express-validator ^7.2.1, multer (via `middleware/formUpload.mjs`, `middleware/galleryUpload.mjs`). ESM `.mjs`.

## 3. Architectural Standards

- Every router applies the security bundle first: `router.use(applySecurity)` for HTML routers; `router.use(applyApiSecurity)` for `api/` routers; `applyAuthSecurity` / `applyAdminSecurity` where applicable.
- Chain order: auth guard (`ensureAuthenticated`, `ensureAdmin`, `requireAdmin`, `requireAdminOrPrimaryDelegate`, `ensurePrimaryDelegate`) → param validation (`validateEntityId`) → upload middleware → validator chain → controller.
- Validator chains are declared as named arrays in the route file (`const validateCarnival = [ body(...)... ]`) and spread into the route (`...validateCarnival`). Reuse `validateSecureEmail`, `validatePassword` from `middleware/security.mjs` and enums from `config/constants.mjs`.
- Public forms that accept anonymous submissions must include `validateTurnstile`.
- CSRF is skipped for paths starting with `/api/`. Any state-changing API route must therefore enforce authentication/authorisation explicitly.
- State changes use `POST` (or `PUT`/`DELETE` via `_method` override). `GET` handlers must be side-effect free.
- Route files export a single `default` router.

## 4. Coding Conventions

- File naming: `camelCase` plural resource (`carnivalClubs.mjs`, `clubPlayers.mjs`); API routers in `routes/api/`.
- URL paths: lowercase kebab-case (`/take-ownership`, `/claim-ownership`); resource IDs as `/:id`.
- Import controllers as namespaces: `import * as carnivalController from '../controllers/carnival.controller.mjs'`.
- Controllers referenced from routes must already be wrapped with `asyncHandler` in the controller module; do not double-wrap.
- Each route line carries a one-line comment describing intent.
- No `console.log` debug middleware in committed code (existing instances are legacy; do not add more).
- Tests: route behaviour is verified through controller and middleware tests (`tests/middleware/route-redirects.test.mjs`, `tests/js/routes/`). New routes require a test asserting auth guard and validation behaviour.

## 5. Workflow Policies

- Adding or changing a route requires updating the README "API Reference" table.
- New route files or new mount points require manual review (they alter `app.mjs`).
- Branch as `feat/<slug>` or `fix/<slug>`.

## 6. Agent Directives

- Never remove or reorder an auth guard or security bundle in an existing chain without manual architectural review.
- Never put database queries, model imports, or response-building logic in route files.
- Never introduce an unauthenticated state-changing route.
- New endpoints that form part of a feature: start with `/speckit.specify` and record method, path, guard, validator and response contract in the spec.
