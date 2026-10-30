# AGENTS.md — `middleware/`

## 1. Module Context

Cross-cutting Express middleware. Security-critical layer: authentication, authorisation, CSRF, rate limiting, security headers, input sanitisation, uploads, flash messaging, and site-mode gating. Consumed by `app.mjs` and `routes/`.

| File | Responsibility |
|---|---|
| `auth.mjs` | Custom session auth (`setupSessionAuth`, `loadSessionUser`; adds `req.isAuthenticated/login/logout`); guards `ensureAuthenticated`, `ensureGuest`, `ensureAdmin`, `ensurePrimaryDelegate`, `requireAdmin`, `requireAdminOrPrimaryDelegate`, `requireDelegate` |
| `security.mjs` | helmet config, rate limiters, `sanitizeInput`, `csrfTokenProvider`, `csrfProtection`, `sessionSecurity`, `validatePassword`, `validateSecureEmail`, `validateFileUpload`; bundles `applySecurity`, `applyAuthSecurity`, `applyApiSecurity`, `applyAdminSecurity` |
| `turnstile.mjs` | Cloudflare Turnstile verification (`validateTurnstile`) |
| `asyncHandler.mjs` | `asyncHandler`, `catchAsync`, `wrapControllers` |
| `flash.mjs` | `enhancedFlash`, `flashTemplateVariables` |
| `formUpload.mjs` / `galleryUpload.mjs` | multer uploaders, entity/field validation, upload error handling |
| `maintenance.mjs` / `comingSoon.mjs` | Site-mode gates driven by `FEATURE_MAINTENANCE_MODE` / `FEATURE_COMING_SOON_MODE` |
| `failureCounterStore.mjs` | In-memory failure counter for auth throttling |
| `validation.mjs` | Shared validation-result handling |

## 2. Tech Stack & Tooling

Express ^5.1.0, helmet ^8.1.0, express-rate-limit ^8.1.0, express-validator ^7.2.1, multer ^2.0.1, Node `crypto`. ESM `.mjs`.

## 3. Architectural Standards

- Authentication is custom session-based. Passport.js is prohibited.
- Role model: Admin (`user.isAdmin`) > Primary Delegate (`user.isPrimaryDelegate`) > Delegate/authenticated user. Authorisation is enforced only via guards in this directory; controllers may add resource-ownership checks but never replace guards.
- Every guard must branch on `isAjaxRequest(req)`: JSON `403 { success: false, message }` for AJAX/API; `req.flash('error_msg', ...)` + redirect for HTML.
- CSRF token: generated per session (`req.session.csrfToken`), accepted from `req.body._token` or `x-csrf-token` header, skipped for `GET` and `/api/*`.
- Rate limiting honours `ENABLE_RATE_LIMITING`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`.
- Upload limits/types come from `config/constants.mjs` (`FORM_UPLOAD_CONFIG`, `MAX_FILE_SIZES`, `ALLOWED_MIME_TYPES`); never hardcode.
- Middleware must call `next()` or terminate the response exactly once; check `res.headersSent` before writing in error paths.

## 4. Coding Conventions

- File naming: `camelCase.mjs`. Exports are named; bundle arrays are `apply<Scope>Security`.
- Factories return middleware (`createFormUploader(entityType, fieldConfig)`, `validateEntityId(paramName)`).
- JSDoc on every export including parameters `req`, `res`, `next`.
- Tests: `tests/middleware/<file>.test.mjs`. Changes require tests for both AJAX and HTML branches, allow and deny paths.

## 5. Workflow Policies

- `auth.mjs`, `security.mjs`, `turnstile.mjs` are CODEOWNERS-sensitive; every change requires maintainer review and a security note in the PR.
- Branch as `fix/security-<slug>` or `feat/<slug>`.

## 6. Agent Directives

- Manual architectural review is mandatory for any change to `auth.mjs`, `security.mjs`, `turnstile.mjs`, helmet/CSP directives, CSRF logic, rate-limit values, or session regeneration.
- Never relax CSP to `unsafe-inline`/`unsafe-eval`, widen allowed MIME types, raise upload size limits, or exempt additional paths from CSRF without approval.
- Never log credentials, tokens, CSRF values or session contents.
