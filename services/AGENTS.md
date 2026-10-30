# AGENTS.md — `services/`

## 1. Module Context

Domain and integration layer. Encapsulates business processes that span multiple models, external systems, scheduled jobs, and file processing. Called by controllers and scripts; may call models and utils; must never import controllers, routes or views.

| Service | Responsibility |
|---|---|
| `email/BaseEmailService.mjs` | Resend client, send gating (`_canSendEmails`), shared header/footer templates |
| `email/{Auth,Carnival,Contact,Invitation,Security}EmailService.mjs` | Domain-specific emails; extend `BaseEmailService` |
| `mySidelineIntegrationService.mjs` | Orchestrates scheduled MySideline sync (node-cron) |
| `mySidelineScraperService.mjs` | Playwright scraping of MySideline |
| `mySidelineCarnivalParserService.mjs` | Parses scraped payloads into carnival data |
| `mySidelineDataService.mjs` | Persists/merges parsed carnivals |
| `mySidelineLogoDownloadService.mjs` | Downloads and stores club/carnival logos |
| `imageUploadService.mjs`, `carouselImageService.mjs` | Image persistence, carousel selection |
| `auditService.mjs` | Audit trail with `AuditService.ACTIONS` |
| `sponsorSortingService.mjs` | Hierarchical sponsor ordering |
| `contactReplyRetentionService.mjs` | Scheduled retention cleanup |

## 2. Tech Stack & Tooling

Resend ^4.8.0, Playwright ^1.55.0 (Docker uses system Chromium via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`), cheerio ^1.0.2, axios ^1.12.0, node-fetch ^3.3.2, node-cron ^4.2.1, Sequelize models. ESM `.mjs`.

## 3. Architectural Standards

- Services are classes. Export style is fixed per service and must be preserved:
  - Stateful/scheduled or email services: `export class X` plus `export default new X()` (singleton).
  - Stateless utility services: `export default X` with static methods.
- All email services extend `BaseEmailService` and must call `_canSendEmails()` before sending. Email is suppressed when `NODE_ENV=test`, `FEATURE_EMAIL_NOTIFICATIONS!=='true'`, required vars are missing, or coming-soon/maintenance mode is active. Each email provides HTML and plain-text bodies.
- MySideline pipeline order is fixed: Integration → Scraper → Parser → Data → LogoDownload. Each stage communicates through plain data objects; no stage reaches into another's internals.
- Scheduled jobs are registered only via explicit `initialize*()` methods called from `app.mjs` after the server starts; never at import time.
- External calls must honour timeout/retry env vars (`MYSIDELINE_REQUEST_TIMEOUT`, `MYSIDELINE_RETRY_ATTEMPTS`) and enable/disable flags (`MYSIDELINE_SYNC_ENABLED`, `MYSIDELINE_ENABLE_SCRAPING`).
- Services must be testable: accept dependencies through constructor/method parameters where practical; isolate network and filesystem access in small methods that tests can mock.
- Failures in background jobs are logged and contained; they must not crash the process.

## 4. Coding Conventions

- File naming: `camelCase` + `Service.mjs` (`imageUploadService.mjs`); email services `PascalCase` in `email/` (`CarnivalEmailService.mjs`).
- Private helpers prefixed with `_`.
- Audit action names: `UPPER_SNAKE_CASE`, `<ENTITY>_<VERB>`, added to `AuditService.ACTIONS`.
- JSDoc on every public method.
- Tests: `tests/services/<service>.test.mjs`, `tests/services/email/<Service>.test.mjs`. Mock Resend, Playwright, axios/fetch and filesystem. Never hit live MySideline or Resend in unit tests; integration tests use `tests/fixtures/mysideline-captured-data.mjs`.

## 5. Workflow Policies

- Email template or recipient changes: include rendered HTML/text samples in the PR.
- Branch as `feat/<slug>` / `fix/<slug>`.

## 6. Agent Directives

- Never send real email or run live scraping during development or tests.
- Manual architectural review required for: changes to `_canSendEmails()` conditions, MySideline URLs/selectors/schedules, cron expressions, retention periods, new external services or API keys.
- Never store credentials in service code; read from `process.env` via config.
