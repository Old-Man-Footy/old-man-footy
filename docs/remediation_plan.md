# Remediation Plan: Stabilisation, UX and Test Coverage

> Location note: this file sits at `docs/remediation_plan.md` at the maintainer's explicit request,
> rather than `docs/plans/<feature>-plan.md` as `docs/AGENTS.md` prescribes. It is indexed in
> [docs/plans/master-plan.md](plans/master-plan.md).

Audit baseline: commit `9a52f8f` (2026-10-29). File and line references point at that commit.

## How to read this plan

- **IDs**: `A-*` alignment findings, `B-*` UX/structural defects, `C-*` test work. Part D sequences
  them into phases.
- **Severity**: Critical (broken journey, security or legal exposure), High, Med, Low.
- **✋ Review gate**: the change needs human architectural approval before implementation, per root
  `AGENTS.md` §6 "Manual architectural review required".
- **✔ Verified**: the finding was confirmed by hand against the code, beyond the automated audit.
- Every fix lands with the test named against it (Part C). Nothing is "done" until that test exists
  and `npm run test:all` passes.

---

## Part A — Alignment with `AGENTS.md` (Task 1)

### A1 Security controls

| ID     | Finding                                                                                                                                                                                                                                                 | Evidence                                                                                                                                                     | Sev      | Gate |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---- |
| A-01 ✔ | CSRF tokens are issued globally but **validated on only two routes**. Login, register, every admin POST, carnival/club edit and player CRUD are unprotected. No client JS sends `x-csrf-token`.                                                         | `middleware/security.mjs:432` (`csrfTokenProvider`), `:453` (`csrfProtection`); used only at `routes/auth.mjs:53,67`; `applySecurity` `security.mjs:703-709` | Critical | ✋   |
| A-02   | `csrfProtection` skips `req.path.startsWith('/api/')`, but `req.path` is router-relative, so the skip and the JSON-vs-redirect branch in the rate limiter misfire inside mounted routers.                                                               | `security.mjs:280,454`                                                                                                                                       | Med      | ✋   |
| A-03 ✔ | `PUT /api/subscribe/:email` is unauthenticated and updates any subscriber's preferences; `GET /api/subscribe/status/:email` discloses whether an address is subscribed. Breaks routes/AGENTS "never introduce an unauthenticated state-changing route". | `routes/subscription.mjs:42,56`; `controllers/subscription.controller.mjs:183-197`                                                                           | Critical | ✋   |
| A-04 ✔ | Production falls back to a known test `SESSION_SECRET` when unset, so config never fails fast as config/AGENTS requires.                                                                                                                                | `config/config.mjs:111-114`                                                                                                                                  | Critical | —    |
| A-05   | CSP permits `'unsafe-inline'` in `scriptSrc`, `scriptSrcElem`, `scriptSrcAttr` and `styleSrc`, contradicting middleware/AGENTS. Makes B-07/B-08 exploitable.                                                                                            | `security.mjs:78,85,92,95`                                                                                                                                   | High     | ✋   |
| A-06   | Session cookie sets no `sameSite`.                                                                                                                                                                                                                      | `app.mjs:79-83`                                                                                                                                              | High     | ✋   |
| A-07   | `trust proxy: true` trusts any `X-Forwarded-For`, so IP rate limits can be spoofed. Should be the Cloudflare hop count.                                                                                                                                 | `app.mjs:32`                                                                                                                                                 | Med      | ✋   |
| A-08   | General rate limiter counts each request twice (`applySecurity` global and again per router).                                                                                                                                                           | `app.mjs:94`; `routes/index.mjs:13`, `routes/carnivals.mjs:15`                                                                                               | Med      | ✋   |
| A-09   | `ENABLE_RATE_LIMITING` is documented but not implemented; limiting keys off `NODE_ENV` only.                                                                                                                                                            | `security.mjs:138`                                                                                                                                           | Med      | ✋   |
| A-10   | `/admin/stats` is guarded by `ensureAuthenticated` only.                                                                                                                                                                                                | `routes/index.mjs:113`                                                                                                                                       | Med      | ✋   |
| A-11   | `sanitizeInput` strips `javascript:` with a single non-recursive replace (bypass: `jajavascript:vascript:`), and runs before multer so multipart bodies are never sanitised.                                                                            | `security.mjs:334`                                                                                                                                           | High     | ✋   |
| A-12   | Dev/test Sequelize logging prints every statement with bound values (password hashes, reset/invite tokens). `utils/sequelizeLogger.mjs` exists but is never imported. Email addresses are logged in several places.                                     | `config/database.mjs:96`; `auth.controller.mjs:42,809,977,1071`; `models/Carnival.mjs:384,387`                                                               | Med      | —    |

### A2 Configuration and environment

| ID   | Finding                                                                                                                                                                                                                                                                  | Evidence                                                                                                                     | Sev  | Gate |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---- | ---- |
| A-13 | `.env` is loaded after ESM static imports run, so `security.mjs` builds `SECURITY_CONFIG` and limiters, and `database.mjs` picks its path, before `.env` values exist.                                                                                                   | `app.mjs:5` vs imports `app.mjs:7-22`; `security.mjs:123,302-317`; `database.mjs:29`                                         | Med  | ✋   |
| A-14 | 151 direct `process.env` reads in 42 files outside `config/config.mjs`, including views and routes. Worst: `BaseEmailService.mjs` (10), `ContactEmailService.mjs` (9), `app.mjs` (9), `security.mjs` (8), `auth.controller.mjs` (8).                                     | e.g. `views/layout.ejs:15,20,101`; `routes/index.mjs:18,31,99`                                                               | Med  | —    |
| A-15 | Defaults disagree between config and services: `MYSIDELINE_SYNC_ENABLED` (config true, service false), `MYSIDELINE_REQUEST_TIMEOUT` (10000 vs 60000). `MYSIDELINE_RETRY_ATTEMPTS` unused.                                                                                | `config.mjs:139`; `mySidelineIntegrationService.mjs:20`; `mySidelineScraperService.mjs:10`                                   | Med  | ✋   |
| A-16 | Health route registered with raw `process.env.HEALTH_CHECK_PATH` and no default; the config default `/health` is ignored, so the path can be `undefined` in the Docker test run.                                                                                         | `routes/index.mjs:99-105`                                                                                                    | High | —    |
| A-17 | `FEATURE_FILE_UPLOADS`, `FEATURE_ADMIN_STATS`, `FEATURE_MYSIDELINE_SYNC` are defined but never read. The contact-reply retention cron deletes data without a flag. MySideline cron registers regardless of its flag. `JEST_WORKER_ID` guards never trigger under Vitest. | `config.mjs:148-150`; `contactReplyRetentionService.mjs:17-21`; `mySidelineIntegrationService.mjs:36`; `app.mjs:119,142,306` | Med  | ✋   |

### A3 Enumerations and constants

| ID     | Finding                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                                    | Sev  | Gate |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- |
| A-18 ✔ | Carnival sponsor validation accepts `'Platinum'` and rejects `'In-Kind'`, contradicting `SPONSORSHIP_LEVELS`.                                                                                                                                                                                                                   | `routes/carnivalSponsors.mjs:22,41`; `config/constants.mjs:25-31`                                                                                           | High | —    |
| A-19   | Contact subject list (`registration`, `feedback`, `other`) does not match `CONTACT_INQUIRY_TYPES` (which has `sponsorship`).                                                                                                                                                                                                    | `routes/index.mjs:77`; `models/ContactSubmission.mjs:80`; `constants.mjs:366`                                                                               | High | —    |
| A-20   | About 30 approval/attendance status literals duplicated instead of using constants. ContactSubmission, ContactReply and SyncLog status enums have no constant. `AuditLog` allows `SUCCESS`/`FAILURE` but `AUDIT_RESULTS` also has `ERROR`. `AUSTRALIAN_STATES` and `CONTACT_INQUIRY_TYPES` break the object + `_ARRAY` pattern. | `carnivalClub.controller.mjs:54,221,395,722-728`; `models/CarnivalClub.mjs:112-179`; `ContactSubmission.mjs:101,127`; `SyncLog.mjs:144`; `AuditLog.mjs:321` | Med  | —    |

### A4 Layering

| ID   | Finding                                                                                                                                                                                                                                                                          | Evidence                                                                                                                                | Sev  | Gate |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- |
| A-21 | A model sends email: `Carnival` dynamically imports `CarnivalEmailService`, which imports `models/index.mjs` (circular, upward dependency).                                                                                                                                      | `models/Carnival.mjs:379,648`                                                                                                           | High | ✋   |
| A-22 | Models import each other directly; some controllers and routes import a model file rather than `models/index.mjs`.                                                                                                                                                               | `CarnivalSponsor.mjs:11-12`; `Sponsor.mjs:10-11`; `help.controller.mjs:6`; `subscription.controller.mjs:11`; `routes/api/images.mjs:14` | Med  | ✋   |
| A-23 | Controllers are not thin: a controller imports another controller; domain logic (`createOrMergeCarnival`), transactions, password hashing and validator chains live in controllers.                                                                                              | `carnival.controller.mjs:24,838`; `auth.controller.mjs:124,411,940,1059`; `clubPlayer.controller.mjs:887,944,953`                       | Med  | —    |
| A-24 | Routes contain persistence, filesystem and response logic: `routes/api/images.mjs` (356 lines, model + `fs.unlink`), `routes/api/sponsors.mjs`, `routes/clubs.mjs` (`createRequire`, inline multer). Debug body-key logging middleware in carnivals router.                      | `routes/clubs.mjs:4,12-14,56-140`; `routes/carnivals.mjs:145-149`                                                                       | Med  | —    |
| A-25 | `routes/clubPlayers.mjs` is never mounted (dead code). `routes/carnivalClubs.mjs` is mounted twice, so its middleware runs twice. Player routes in `routes/clubs.mjs:265-292` lack route-level `ensureAuthenticated`.                                                            | `app.mjs:171`; `routes/carnivals.mjs:107`                                                                                               | High | ✋   |
| A-26 | Nine source files exceed 800 lines: `admin.controller` 2410, `carnival.controller` 2324, `club.controller` 2069, `carnivalClub.controller` 1787, `auth.controller` 1169, `models/Carnival` 1155, `clubPlayer.controller` 965, `CarnivalEmailService` 893, `main.controller` 829. | `wc -l`                                                                                                                                 | Med  | —    |

### A5 Error handling and response contracts

| ID   | Finding                                                                                                                                                                                                                                                                                      | Evidence                                                                                                                              | Sev  | Gate |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- |
| A-27 | Exported handlers not wrapped in `asyncHandler`: all of `carnivalSponsor.controller` (9) and `clubPlayer.controller` (9), `subscription.controller` (6), `api/subscription.controller` (3), `help.controller`, `main.postSubscribe`, `carnival.viewGallery`.                                 | `carnivalSponsor.controller.mjs:16-337`; `clubPlayer.controller.mjs:20-719`; `carnival.controller.mjs:2324`                           | Med  | —    |
| A-28 | Swallowed errors: fee recalculation failure is logged then the user is told fees were "automatically recalculated". Also an empty catch and a catch that returns `[]`. `auth.controller` returns plain-text 500s.                                                                            | `carnival.controller.mjs:1079-1086`; `config/database-optimizer.mjs:375-377`; `club.controller.mjs:59`; `auth.controller.mjs:221-227` | High | —    |
| A-29 | Response shape drift: `{error:{status,message}}` outside security middleware (`subscription.controller` ×15, `routes/api/images.mjs` ×15, `api/sponsors`, `help.controller`, `carnivalClub`, `carnivalSponsor`); bodies with no `success` key; `{status:'ok'}` health; string `error` field. | `subscription.controller.mjs:23-311`; `routes/index.mjs:101`; `app.mjs:204`                                                           | Med  | ✋   |
| A-30 | 82 flash calls use bare `'error'`/`'success'`/`'warning'` keys instead of `<type>_msg` (see B-03 for the user impact).                                                                                                                                                                       | `clubPlayer.controller.mjs:27-156`; `main.controller.mjs:538`                                                                         | High | —    |

### A6 State, persistence and dependencies

| ID   | Finding                                                                                                                                                                                                                                                                                                      | Evidence                                                                                                                                    | Sev | Gate |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---- |
| A-31 | `sessionStore.sync()` creates the Sessions table outside migrations even though a Session model and migration exist. Tests use `sequelize.sync({force:true})` (see C-06).                                                                                                                                    | `app.mjs:241`                                                                                                                               | Med | ✋   |
| A-32 | In-process global state outside `failureCounterStore.mjs`: unbounded `global.subscriptionAttempts` Map, limiter Maps never pruned, `imageCache`, `global.mySidelineInitTimeout`.                                                                                                                             | `main.controller.mjs:465-482`; `security.mjs:218`; `carouselImageService.mjs:27,93`; `app.mjs:271,307`                                      | Med | —    |
| A-33 | Raw SQL outside `migrations/` and `config/database*.mjs`: scripts and model `sequelize.literal` CASE expressions.                                                                                                                                                                                            | `scripts/seed-database.mjs:497-506`; `scripts/utilities/dataCleanup.mjs:42,216`; `models/User.mjs:153-156`; `models/Carnival.mjs:1147-1149` | Low | —    |
| A-34 | Dependencies never imported: `csurf` (deprecated), `pg`, `pg-hstore`, `puppeteer`, `axios`, `cheerio`, `formdata-node`, `glob`, `express-rate-limit`. `connect-flash` used only by a script; `node-fetch` used once (Node 22 has `fetch`). Root and services `AGENTS.md` list several of these as the stack. | `package.json`                                                                                                                              | Med | ✋   |
| A-35 | CommonJS via `createRequire` in an `.mjs` route.                                                                                                                                                                                                                                                             | `routes/clubs.mjs:4,12-14`                                                                                                                  | Low | —    |

### A7 Conventions and documentation

| ID   | Finding                                                                                                                                                                                                                                                                             | Evidence                                                   | Sev | Gate |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --- | ---- |
| A-36 | JSDoc coverage about 85% overall; gaps in `middleware/auth.mjs:92,115,123,143` guards, `help.controller.mjs:21`, several model methods.                                                                                                                                             | —                                                          | Low | —    |
| A-37 | Naming: migration `20251001120000-remove-.additional-images.js` (stray dot); four migrations missing `'use strict'`; leftover `scripts/fix-jest-globals.mjs`; `scripts/tests/mysideline-captured-data.mjs` duplicates `tests/fixtures/`.                                            | `migrations/`                                              | Low | —    |
| A-38 | Scripts call `process.exit()` mid-run; `purge-seed-data.mjs --execute` has no production guard and its main-module check never matches on Windows.                                                                                                                                  | `scripts/purge-seed-data.mjs`, `scripts/seed-database.mjs` | Low | —    |
| A-39 | README is stale: claims Passport.js (not a dependency), lists `EMAIL_FROM` twice.                                                                                                                                                                                                   | `README.md`                                                | Low | —    |
| A-40 | Conflicting standards a human must resolve: root `AGENTS.md` names `asyncHandler`, but `docs/plans/controller-standardization-plan.md` targets `wrapControllers`; middleware/AGENTS forbids CSP relaxation that production currently depends on (Cloudflare Rocket Loader comment). | `AGENTS.md` §4; `security.mjs:88-92`                       | Med | ✋   |

Confirmed aligned: middleware order in `app.mjs` matches the documented order exactly
(`app.mjs:42-186`). No services import controllers. No `sync({ alter })` anywhere.

---

## Part B — UX and structural defects (Task 2)

### B1 Broken user journeys (fix first)

| ID     | Defect                                                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                         | Sev      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| B-01 ✔ | **Unsubscribe is broken.** `unsubscribe.ejs` includes a non-existent `partials/header`; `unsubscribe-success.ejs` calls `include()` with no file; the form has no `_token`; the one-click `List-Unsubscribe-Post` POSTs `?token=` but the handler reads `req.body.token`; both pages request a missing `/styles/forms.css`. A non-functional unsubscribe is a Spam Act 2003 compliance risk. | `views/unsubscribe.ejs:1,31-32`; `views/unsubscribe-success.ejs:1`; `services/email/BaseEmailService.mjs:213-215`; `main.controller.mjs:605`     | Critical |
| B-02 ✔ | **Delegate invitations are broken.** The controller passes `invitedUser`; the view reads `user.*` (null when logged out) and posts to `/auth/accept-invitation/:token`, but the route is `POST /auth/invite/:token`.                                                                                                                                                                         | `auth.controller.mjs:366-370`; `views/auth/accept-invitation.ejs:33,55-63,72`; `routes/auth.mjs:85-96`                                           | Critical |
| B-03 ✔ | **82 flash messages are never shown.** `partials/flash-messages.ejs` only renders `*_msg` keys. Every message in `clubPlayer.controller` is lost, as is "Successfully subscribed".                                                                                                                                                                                                           | `views/partials/flash-messages.ejs:2-29`; `middleware/flash.mjs:123`                                                                             | High     |
| B-04 ✔ | **Conversion links 404.** Anonymous visitors on a carnival page get `/login` and `/register` (should be `/auth/login`, `/auth/register`).                                                                                                                                                                                                                                                    | `views/carnivals/show.ejs:895,898`                                                                                                               | High     |
| B-05   | Other dead links: "Claim This Carnival" → `/carnivals/:id/claim` (no GET; real action is `POST /:id/take-ownership`); `/clubs/:id/manage`; `/help/club-management`.                                                                                                                                                                                                                          | `carnivals/show.ejs:961`; `clubs/show.ejs:759`; `clubs/create.ejs:188`                                                                           | High     |
| B-06 ✔ | **Joining an existing club is impossible.** `POST /clubs/join/:id` exists but `showClubManagementHandler` (renders `clubs/club-options`) has no route, and the dashboard "Join Club" goes to a list with no join action — while `clubs/create.ejs:175` promises others can join.                                                                                                             | `routes/clubs.mjs:175`; `club.controller.mjs:291-326`                                                                                            | High     |
| B-07   | **Stored XSS via `registrationLink`.** Not validated, multipart bypasses the sanitiser (A-11), rendered as `href` on list, home and show pages.                                                                                                                                                                                                                                              | `routes/carnivals.mjs:15-106`; `models/Carnival.mjs:920`; `carnivals/list.ejs:157`; `index.ejs:125`; `carnivals/show.ejs:346`                    | High     |
| B-08   | **Player names injected into inline JS** (`onclick="return confirm('…<%= name %>…')"`). "O'Brien" breaks the confirm; a crafted name executes.                                                                                                                                                                                                                                               | `views/clubs/players/index.ejs:399`                                                                                                              | High     |
| B-09   | `<%- JSON.stringify(availableClubs) %>` inside a single-quoted attribute: apostrophes in club names ("St Mary's") corrupt data and allow attribute injection; also ships every club's contact email and phone to the browser.                                                                                                                                                                | `views/carnivals/add-club.ejs:58`; `carnivalClub.controller.mjs:266-281`                                                                         | High     |
| B-10   | Missing client assets: `/js/carnivals-merge.js` (file is `carnival-merge.js`), `/js/carnival-sponsors.js` (does not exist, so carnival sponsor reorder/remove is dead), `/js/clubs/club-create.js` (folder empty). Admin carnival JS gated on `user.role === 'Admin'` (no such field; use `isAdmin`).                                                                                        | `carnivals/merge.ejs:250`; `shared/sponsors/sponsors.ejs:133`; `club.controller.mjs:692`; `carnivals/show.ejs:1694`                              | High     |
| B-11   | Subscription via `/api/subscribe` creates inactive records and tells users to "check your email", but no verification email is sent.                                                                                                                                                                                                                                                         | `subscription.controller.mjs:67` (TODO)                                                                                                          | High     |
| B-12   | Carnival edit validation failure re-renders from the database, discarding the user's edits; the same block calls `req.headers.accept.indexOf` and throws when no `Accept` header is sent.                                                                                                                                                                                                    | `carnival.controller.mjs:914,949-957`                                                                                                            | High     |
| B-13   | Other forms lose input on validation error (redirect + flash only): club create, club update, sponsor edit, add-sponsor (club and carnival), profile updates (first error only).                                                                                                                                                                                                             | `club.controller.mjs:396-398,702-705,840,1103`; `carnival.controller.mjs:1674,1686`; `auth.controller.mjs:381,500,676,703`                       | Med      |
| B-14   | Flash text can be injected through the URL (`?flash_error_msg=…`), enabling on-site phishing text. Flash also renders twice on four sponsor pages.                                                                                                                                                                                                                                           | `middleware/flash.mjs`; `carnivals/add-sponsor.ejs:23`; `clubs/add-sponsor.ejs:21`; `shared/sponsors/edit-sponsor.ejs:21`; `view-sponsor.ejs:42` | Med      |
| B-15   | Client alert misuse: `showAlert('success', msg)` arguments swapped (users see the word "success"); success messages shown red because `showAlert` defaults to `'danger'`.                                                                                                                                                                                                                    | `public/js/carnival-attendees.js:121-147,236,266,271`; `carnival-show.js:120,327,378`; `admin-user-management.js:116,163`                        | Med      |
| B-16   | Share partial hard-codes `id="shareDropdown"`, duplicating IDs if included twice.                                                                                                                                                                                                                                                                                                            | `views/partials/share-button.ejs:29`                                                                                                             | Low      |

### B2 Onboarding friction (adoption blockers)

| ID   | Friction                                                                                                                                                                                                                                                                                       | Evidence                                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| B-17 | Register → login → dashboard with no "create or join your club" step; join is impossible (B-06).                                                                                                                                                                                               | `auth.controller.mjs:324-330`                                                                |
| B-18 | Dashboard "Quick Start Checklist" sits at the bottom; its "Add Club" step links to `/clubs` not the create page; the carnival step ignores registrations.                                                                                                                                      | `views/dashboard.ejs:716,733`                                                                |
| B-19 | Controller loads `upcomingCarnivals` but the view never shows them, so a new delegate sees an empty dashboard.                                                                                                                                                                                 | `main.controller.mjs:213-226`                                                                |
| B-20 | "Add Carnival" shown to users with no club. No Admin link in the user menu. No privacy policy or terms in the footer.                                                                                                                                                                          | `views/layout.ejs:115-197`                                                                   |
| B-21 | Inconsistent terminology: the dashboard refers to PlayNRL (8 uses) while the rest of the site says MySideline (93); pick one name (or "PlayNRL (MySideline)") and use it everywhere. "Admin Actions" heading shown to ordinary delegates. Login wording varies ("Login", "Log In", "Sign in"). | `dashboard.ejs:408`; `clubs/show.ejs:752`; `carnivals/show.ejs:896`; `auth/register.ejs:121` |
| B-22 | Finding carnivals near you: text and state filter only; latitude/longitude stored but unused (suggestion, not a defect).                                                                                                                                                                       | `views/carnivals/list.ejs:30-46`                                                             |

### B3 Performance bottlenecks

| ID   | Bottleneck                                                                                                  | Evidence                                                |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| B-23 | Public carnival list loads every non-disabled carnival, past ones included, with no limit, and sorts in JS. | `carnival.controller.mjs:148-201`                       |
| B-24 | Club list is 3N+1: loads all clubs, then `getTotalCarnivalCount()` per club (about three queries each).     | `club.controller.mjs:98-118`; `models/Club.mjs:141-160` |

### B4 Redundant code to consolidate into shared components

Server-side partials (create under `views/partials/`):

| Component                                                                       | Current copies                                                | Representative locations                                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `carnival-card.ejs`                                                             | ~10, already diverging ("Date TBA" vs "Unknown Date")         | `carnivals/list.ejs:93`, `index.ejs:79`, `dashboard.ejs:315,450`, `clubs/show.ejs` ×6                         |
| `shorts-badge.ejs`                                                              | 6                                                             | `admin/carnival-players.ejs:244`, `carnivals/players.ejs:236`, `clubs/players/index.ejs:185,374`              |
| `pagination.ejs`                                                                | 7                                                             | `admin/{audit-logs,carnivals,clubs,users}.ejs`, `admin/contact-submissions.ejs` ×2, `partials/gallery.ejs` ×2 |
| `breadcrumbs.ejs`                                                               | 15 files (+41 "Back to…" links)                               | across `views/`                                                                                               |
| `empty-state.ejs`                                                               | ~16 in 14 files (6 in `clubs/show.ejs`)                       |                                                                                                               |
| `confirm-modal.ejs`                                                             | 10 native `confirm()`s + duplicated `removePlayerModal`       | `clubs/players/edit.ejs:322`, `index.ejs:423`                                                                 |
| `form-field.ejs` (label, required marker, inline `is-invalid` error, old value) | inline errors exist only in players add/edit and club-options |                                                                                                               |

Client-side utilities (consolidate under `public/js/utils/`):

| Utility                                                                                                | Current state                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.js` fetch wrapper (sets `X-Requested-With`, `x-csrf-token`, JSON parsing, standard error display) | 40 raw `fetch()` calls in 25 files; header hand-set 31 times; none send CSRF                                                                                                                                                                                    |
| `ui-helpers.showAlert` as the single toast                                                             | 9 separate implementations (`app.js:360`, `admin-carnivals.js:507`, `admin-clubs.js:192`, `sponsor-edit.js:306`, `carnival-merge.js:185`, `carnival-my-club-players.js:276`, `coming-soon.js:215`, `gallery-manager.js:422`, `index.js:99`); add `role="alert"` |
| `confirmDialog`                                                                                        | 32 native `confirm()` in 15 files; `confirmDelete` defined in both `app.js:210` and `common-utils.js:15`                                                                                                                                                        |
| `debounce`                                                                                             | 3 copies (`carnival-list`, `carnival-players`, `club-players`)                                                                                                                                                                                                  |
| `imagePreview`                                                                                         | 7 FileReader/object-URL copies                                                                                                                                                                                                                                  |
| `escapeHtml`                                                                                           | 2 copies (`club-autocomplete.js`, `club-options.js`)                                                                                                                                                                                                            |

Inline code to remove (prerequisite for dropping CSP `'unsafe-inline'`, A-05): 11 inline `on*`
handlers (`admin/dashboard.ejs:157`, `carnivals/list.ejs:157`, `my-club-players.ejs:398,401`,
`new.ejs:25,31`, `show.ejs:1367`, `clubs/players/index.ejs:399`, `dashboard.ejs:340,470`,
`index.ejs:125`) and the window globals that exist only to serve them; inline `<script>` in
`admin/audit-logs.ejs:308`; 119 inline `style=` attributes (worst: `carnivals/players.ejs`,
`admin/carnival-players.ejs`, `carnivals/show.ejs`).

Oversized views to split into partials: `carnivals/show.ejs` (1695 lines), `dashboard.ejs` (1318).

Manager-object pattern not followed: `admin-user-management.js`, `app.js`, `auth-register.js`,
`auth.js`, `coming-soon.js`, `maintenance.js`, `state-selector.js`.

### B5 Copy, accessibility and markup

| ID   | Issue                                                                                                                                                                | Evidence                                                                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-25 | US spellings in user copy: "organizers", "Organize", "Organized by", "authorized", "color".                                                                          | `about.ejs:78`; `clubs/claim-ownership.ejs:107,131`; `create-on-behalf.ejs:218`; `coming-soon.ejs:33`; `contact.ejs:171,262`; `dashboard.ejs:504,755`; `clubs/players/add.ejs:153`, `edit.ejs:155` |
| B-26 | 14 `<img>` without `alt`.                                                                                                                                            | `carnivals/show.ejs:68`; `clubs/show.ejs:200,255,304,405,466,521`; `partials/gallery.ejs:8`; `_imageUploader.ejs:63`                                                                               |
| B-27 | Icon-only buttons without `aria-label`.                                                                                                                              | `dashboard.ejs:78,92,108,122`; `index.ejs:208,211`; `partials/gallery.ejs:205`; `layout.ejs:100,192`                                                                                               |
| B-28 | Required markers do not match `required` attributes (auth forms, dashboard, claim-ownership, alternate-names show none; players edit shows four with none required). |                                                                                                                                                                                                    |
| B-29 | 19 server-side date formats without a locale (risk of MM/DD). 63 others use `'en-AU'`.                                                                               | `carnivals/attendees.ejs:201`; `edit-registration.ejs:212-275`; `clubs/players/index.ejs:211`                                                                                                      |
| B-30 | Nested `<a>` inside carnival cards, propped up with `onclick`; `window.open` without `noopener`.                                                                     | `carnivals/list.ejs:92,157`; `index.ejs:78,125`                                                                                                                                                    |
| B-31 | Malformed class `btn btn-outlinesecondary`; no rule for `btn-primary` vs `btn-tertiary` vs `btn-outline-tertiary`; submit labels alternate Update/Save/Create.       | `carnivals/players.ejs:29`                                                                                                                                                                         |

---

## Part C — Testing strategy (Task 3)

### C1 Current state

- **Server suite** (`vitest.config.mjs`, node): coverage includes controllers, services, models,
  middleware only. Thresholds are written in Jest syntax (`thresholds.global`), which Vitest 3
  treats as a file glob, so **the 70% gate is almost certainly not enforced**. `npm run test` runs
  without `--coverage`; `test:coverage` starts watch mode.
- **Client suite** (`vitest.config.js.mjs`, jsdom): 40 of 57 `public/js` files tested; no thresholds.
- **No CI**: `.github/workflows/` does not exist. The Dockerfile `test` stage installs production
  dependencies only and runs `node app.mjs`; it is a UAT server, not a test runner.
- **No end-to-end tests**: `tests/e2e/` is empty; no `playwright.config.*`. `.vscode/tasks.json`
  references deleted e2e specs.
- **The real app cannot be loaded in tests**: `app.mjs:321` calls `startServer()` on import. All
  seven supertest files build their own mini Express app.
- **Tests that test fakes**: 13 of 15 `tests/models/` files re-implement the model inside the test;
  `tests/services/authService.test.mjs` tests a class that does not exist in `services/`;
  `tests/js/dashboard/password-reset.test.mjs` tests an inline fake.
- **Untested P0 code**: `auth.controller` (except logged-in password change), `carnival.controller`,
  `club.controller`, `clubPlayer.controller`, all `carnivalClub.controller` handlers,
  `middleware/turnstile.mjs`, `middleware/failureCounterStore.mjs`, the real `User` model.

Critical journey coverage today:

| Journey                                                 | Covered?                                               |
| ------------------------------------------------------- | ------------------------------------------------------ |
| Register / login / logout                               | ✗                                                      |
| Forgot / token reset password                           | ✗                                                      |
| Delegate invite → accept → transfer                     | ✗ (email service only)                                 |
| Club create / join / leave / claim                      | ✗                                                      |
| Carnival create / edit / merge / take ownership         | ✗                                                      |
| Club registers for carnival → approval → players → fees | ◐ fee maths only                                       |
| Club player CRUD and CSV import                         | ✗                                                      |
| Sponsors                                                | ◐ carnivalSponsor controller (mocked), `/api/sponsors` |
| Gallery upload / delete                                 | ◐ middleware, heavily mocked                           |
| Subscribe / unsubscribe                                 | ◐ subscribe only                                       |
| Contact form                                            | ✗ (email service only)                                 |
| Admin management                                        | ◐ contact submissions, subscriber emails               |
| Help, maintenance, coming-soon                          | ✓                                                      |

### C2 Harness fixes (do before writing new tests)

| ID   | Change                                                                                                                                                                                                                                                                                                                                                                          | Gate |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| C-01 | Rewrite thresholds as top-level `lines/functions/branches/statements: 70` in `vitest.config.mjs`; add the same block to `vitest.config.js.mjs`; add `routes/**`, `utils/**`, `config/**` to coverage include. Run once to measure the true baseline before enforcing.                                                                                                           | ✋   |
| C-02 | `test:coverage` → `vitest run --coverage`; `test:all` runs coverage for both suites.                                                                                                                                                                                                                                                                                            | ✋   |
| C-03 | Split `app.mjs` into `createApp()` (builds and returns the Express app) and a main-module guard that calls `startServer()` only when run directly.                                                                                                                                                                                                                              | ✋   |
| C-04 | Replace `JEST_WORKER_ID` guards with `process.env.VITEST` (or a config flag) so schedulers and MySideline sync never start in tests.                                                                                                                                                                                                                                            | ✋   |
| C-05 | Test database: run Umzug migrations against a dedicated test SQLite file in `globalSetup`; truncate per test file.                                                                                                                                                                                                                                                              | —    |
| C-06 | Remove `sequelize.sync({ force: true })` from `tests/controllers/help.controller.test.mjs:24` and `tests/models/helpContent.model.test.mjs:18`; remove whole-table deletes on shared tables.                                                                                                                                                                                    | —    |
| C-07 | Replace (not just delete) fake tests: the 13 fake model tests become real model tests (C-10); remove `tests/services/authService.test.mjs`, `tests/js/dashboard/password-reset.test.mjs`, placeholders `tests/testBasic.test.mjs` and `tests/middleware/galleryUpload.test.mjs`. Removal only once replacement coverage exists (root §6.7).                                     | —    |
| C-08 | Fix broken `tests/js/clubs/admin-edit-club.test.mjs` (imports deleted file) by retargeting it at the current club admin JS; rename swapped `subscription` tests; rename `carnival.modal.test.mjs`; move server tests out of `tests/js/`; fix `vi.mock` calls targeting non-existent `imageNamingService` and mis-resolved relative paths; fix `test:integration` script target. | —    |
| C-09 | Add `.github/workflows/test.yml` running `npm ci`, `npm run test:all` with coverage, and Playwright e2e on PRs to `main`. Use `yq` for edits per root `AGENTS.md`.                                                                                                                                                                                                              | ✋   |

### C3 Unit tests required

Server (Vitest, node, real modules with only external I/O mocked):

| ID   | Target                                                                                                                          | Must assert                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-10 | Real models: `User`, `CarnivalClub`, `Carnival`, `Club`, `ClubPlayer`, `Sponsor`, `ContactSubmission`, `SyncLog`, `ImageUpload` | Password hashing hook; reset/invite token generation and expiry; primary-delegate uniqueness; status transition rules; enum validation matches `constants.mjs` |
| C-11 | `config/constants.mjs`                                                                                                          | Every enum has object + `_ARRAY`; values used by routes/models are members (guards A-18, A-19)                                                                 |
| C-12 | `config/config.mjs`                                                                                                             | Production without `SESSION_SECRET` throws (A-04); defaults match service expectations (A-15)                                                                  |
| C-13 | `middleware/security.mjs` `csrfProtection`, `sanitizeInput`                                                                     | Missing/invalid token → 403 on POST/PUT/DELETE; nested `javascript:` stripped (A-11)                                                                           |
| C-14 | `middleware/turnstile.mjs`, `middleware/failureCounterStore.mjs`                                                                | Success, failure, network error, threshold and expiry                                                                                                          |
| C-15 | `middleware/flash.mjs`                                                                                                          | Query-string flash injection ignored (B-14)                                                                                                                    |
| C-16 | `utils/uploadProcessor.mjs`, `services/imageUploadService.mjs`                                                                  | Type/size limits, path traversal rejected                                                                                                                      |
| C-17 | `services/sponsorSortingService.mjs`, `contactReplyRetentionService.mjs`, `mySidelineDataService.mjs`, `utils/viewHelpers.mjs`  | Ordering rules; retention deletes only rows past cutoff; mapping of scraped data                                                                               |

Client (Vitest, jsdom):

| ID   | Target                                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- |
| C-18 | `utils/ui-helpers.js` (argument order, default type, `role="alert"`) and the new `utils/api.js` (CSRF header, error handling) |
| C-19 | `auth-forgot-password.js`, `auth-reset-password.js`, `unsubscribe.js`, `share-button.js`                                      |
| C-20 | `gallery-manager.js`, `image-uploader.js`, `logo-uploader.js`, `document-uploader.js`                                         |
| C-21 | `carnival-merge.js`, `sponsor-edit.js`, `sponsor-management.js`, `admin-contact-submission(s).js`, `help-system.js`           |

### C4 Integration tests required (supertest against `createApp()` with migrated test SQLite)

One file per journey under `tests/integration/`. Each asserts status, redirect target, database
state and the rendered flash message.

| ID   | Journey                                                                                   | Key assertions                                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| C-22 | Register, login, logout                                                                   | Turnstile mocked; invalid credentials flash shown; session created/destroyed                                                         |
| C-23 | Forgot password → token reset                                                             | Token expiry; reused token rejected; CSRF enforced                                                                                   |
| C-24 | Invite → accept → transfer delegate                                                       | Page renders for logged-out invitee; form posts to the real route (B-02)                                                             |
| C-25 | Club create / join / leave / claim                                                        | Join reachable from UI route (B-06); create retains input on error                                                                   |
| C-26 | Carnival create / edit / merge / take ownership                                           | Edit failure retains input (B-12); missing `Accept` header does not crash; `registrationLink` rejects `javascript:` (B-07)           |
| C-27 | Club registers for carnival → approve/reject → players → fees                             | Fee recalculation failure surfaces as an error, not success (A-28)                                                                   |
| C-28 | Club player CRUD and CSV import                                                           | Flash messages render (B-03)                                                                                                         |
| C-29 | Sponsors (club, carnival, admin)                                                          | Level enum matches constants (A-18)                                                                                                  |
| C-30 | Gallery upload/delete                                                                     | Authorisation: non-owner cannot delete                                                                                               |
| C-31 | Subscribe → verify → unsubscribe (GET page, POST form, one-click `List-Unsubscribe-Post`) | Pages render (B-01); `PUT /api/subscribe/:email` requires auth/token (A-03)                                                          |
| C-32 | Contact form                                                                              | Subject enum matches constants (A-19)                                                                                                |
| C-33 | Admin guards                                                                              | Every `/admin/*` route and `/admin/stats` returns 403/redirect for delegates (A-10)                                                  |
| C-34 | Cross-cutting: CSRF                                                                       | Iterate every registered non-GET route; request without token → 403 (A-01)                                                           |
| C-35 | Cross-cutting: link integrity                                                             | Render each view with fixture data, extract `href`/`action`/`src`, assert each resolves to a route or static file (B-04, B-05, B-10) |
| C-36 | Cross-cutting: flash keys                                                                 | Grep-based test that no controller uses a bare flash key (A-30)                                                                      |
| C-37 | Health                                                                                    | `/health` responds 200 with default config and checks database connectivity (A-16)                                                   |

### C5 End-to-end tests required (Playwright)

`@playwright/test` is already a dev dependency. Add `playwright.config.mjs` with a `webServer` that
starts the app in test mode against a seeded test database, and specs under `tests/e2e/`:

| ID   | Spec                             | Path covered                                                                              |
| ---- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| C-38 | `visitor-discovery.spec.mjs`     | Home → carnival list → filter by state → carnival page → Log in CTA reaches `/auth/login` |
| C-39 | `delegate-onboarding.spec.mjs`   | Register → log in → create club → create carnival → carnival visible publicly             |
| C-40 | `delegate-invitation.spec.mjs`   | Delegate invites → invitee opens link logged out → accepts → lands on dashboard with club |
| C-41 | `carnival-registration.spec.mjs` | Second club registers → organiser approves → players added → fees shown                   |
| C-42 | `subscription.spec.mjs`          | Subscribe on home → unsubscribe link from captured email → confirmation page              |
| C-43 | `admin-claim.spec.mjs`           | Admin claims a MySideline-imported carnival → assigns to club → delegate can edit         |

Each spec also runs an axe-core accessibility check only if a maintainer approves adding
`@axe-core/playwright` (new dependency, ✋).

### C6 Regression rule

Every Part B fix ships with the C-test listed against it. A defect found later gets a failing test
first, then the fix.

---

## Part D — Prioritised action plan (Task 4)

Checklist only; tick items as they merge. Branch names follow root `AGENTS.md` §5. One concern per
branch. Each PR states scope, migration impact, new env vars and `npm run test:all` output.

### Phase 0 — Prerequisites (human decisions)

- [ ] Decide the controller error-handling standard: `asyncHandler` (root `AGENTS.md`) or `wrapControllers` (existing plan); update whichever document loses (A-40)
- [ ] Decide CSP target and whether Cloudflare Rocket Loader can be disabled (A-05, A-40)
- [ ] Approve harness changes C-01 to C-04 and CI C-09 (✋)

### Phase 1 — Stop the bleeding: security and broken journeys

- [ ] `fix/session-secret-fail-fast` — A-04; test C-12
- [ ] `fix/csrf-enforcement` — A-01, A-02, A-06; add `x-csrf-token` to client fetches; tests C-13, C-34 ✋
- [ ] `fix/subscription-api-auth` — A-03; tests C-31 ✋
- [ ] `fix/registration-link-xss` — B-07, A-11; tests C-13, C-26 ✋ (sanitiser is in `security.mjs`)
- [ ] `fix/player-name-inline-js` — B-08; move confirm to delegated listener; test C-28
- [ ] `fix/add-club-json-attribute` — B-09; render JSON in `<script type="application/json">` or a data endpoint, drop contact fields; test C-27
- [ ] `fix/unsubscribe-pages` — B-01; test C-31, C-42
- [ ] `fix/delegate-invitation` — B-02; test C-24, C-40
- [ ] `fix/flash-keys` — B-03, A-30; test C-36, C-28
- [ ] `fix/dead-links-and-assets` — B-04, B-05, B-10; test C-35
- [ ] `fix/club-join-route` — B-06 (new route ✋ for mount change only if needed); test C-25
- [ ] `fix/sponsor-and-contact-enums` — A-18, A-19; test C-11, C-29, C-32
- [ ] `fix/fee-recalc-error-surface` — A-28 (carnival part); test C-27
- [ ] `fix/health-check-path` — A-16; test C-37
- [ ] `fix/subscription-verification-email` — B-11 (email conditions change ✋); test C-31

### Phase 2 — Safety net

- [ ] `test/vitest-thresholds` — C-01, C-02 ✋
- [ ] `refactor/app-factory` — C-03, C-04 ✋
- [ ] `test/migrated-test-db` — C-05, C-06
- [ ] `test/remove-fake-tests` — C-07, C-08 (after C-10 replacements exist)
- [ ] `test/integration-journeys` — C-22 to C-37
- [ ] `chore/ci-workflow` — C-09 ✋

### Phase 3 — UX and onboarding

- [ ] `feat/post-register-club-step` — B-17, B-20
- [ ] `fix/dashboard-checklist` — B-18, B-19
- [ ] `fix/carnival-list-pagination` — B-23 (default to upcoming, paginate)
- [ ] `fix/club-list-n-plus-one` — B-24
- [ ] `fix/form-input-retention` — B-12, B-13 with `form-field` partial
- [ ] `fix/alert-usage` — B-15, B-14, B-16
- [ ] `fix/copy-sweep` — B-21, B-25, B-31 (update matching `docs/help/*.md` in same PR)
- [ ] `fix/accessibility-sweep` — B-26 to B-30

### Phase 4 — Shared components and structural refactor

- [ ] `refactor/view-partials` — carnival card, shorts badge, pagination, breadcrumbs, empty state, confirm modal (B4)
- [ ] `refactor/client-utils` — `api.js`, single `showAlert`, `confirmDialog`, `debounce`, `imagePreview`, `escapeHtml` (B4); tests C-18
- [ ] `refactor/remove-inline-handlers` — 11 handlers, inline script, high-traffic inline styles (B4)
- [ ] `fix/csp-tighten` — drop `'unsafe-inline'` once the above lands (A-05) ✋
- [ ] `refactor/response-contracts` — A-29 ✋
- [ ] `refactor/async-handler-coverage` — A-27 per Phase 0 decision; supersedes `docs/plans/controller-standardization-plan.md`
- [ ] `refactor/enum-constants` — A-20
- [ ] `refactor/model-email-decoupling` — A-21, A-22 ✋
- [ ] `refactor/thin-routes` — A-24, A-25, A-35 ✋ (mount points)
- [ ] `refactor/thin-controllers` — A-23, A-26: split `admin`, `carnival`, `club`, `carnivalClub` controllers by sub-domain
- [ ] `refactor/config-centralisation` — A-13, A-14, A-15, A-17 ✋
- [ ] `fix/rate-limit-hardening` — A-07, A-08, A-09, A-10, A-32 ✋
- [ ] `fix/session-store-migration` — A-31 ✋

### Phase 5 — Hygiene and completion

- [ ] `chore/remove-unused-deps` — A-34 ✋
- [ ] `docs/stack-tables` — A-39, plus root and services `AGENTS.md` stack tables after A-34
- [ ] `fix/logging-pii` — A-12
- [ ] `chore/naming-and-scripts` — A-33, A-37, A-38
- [ ] `docs/jsdoc-gaps` — A-36
- [ ] `test/unit-gaps` — C-10 to C-21
- [ ] `test/e2e-playwright` — C-38 to C-43

### Exit criteria

- [ ] Every Critical and High item in Parts A and B closed with its linked test
- [ ] Coverage thresholds enforced and passing at 70% on both suites
- [ ] CI green on every PR to `main`, including the six e2e journeys
- [ ] `docs/plans/master-plan.md` updated and this plan moved to `docs/plans/archived/`
