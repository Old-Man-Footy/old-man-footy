# Help Route → View Mapping


- GET /auth/invite/:token -> `views/auth/accept-invitation.ejs`

- GET /auth/login -> `views/auth/login.ejs`
- POST /auth/login -> handler (skip POST help endpoint)
- POST /clubs/:id/claim -> handler (skip)
- GET /clubs/options -> `views/clubs/club-options.ejs`
- GET /clubs/manage/sponsors/add -> `views/clubs/add-sponsor.ejs`
- GET /clubs/manage/profile -> profile form is inside `views/clubs/manage.ejs` (confirmed)
- GET /clubs/manage/alternate-names -> `views/clubs/alternate-names.ejs`
- POST /clubs/join/:id -> action (skip)
- GET /clubs/players -> `views/clubs/players/all-players.ejs` (views exist under `views/clubs/players/`)
- GET /clubs/players/add -> `views/clubs/players/add-players.ejs`
- GET /clubs/players/:id/edit -> `views/clubs/players/edit.ejs`

## Club Players (views under `views/clubs/players/`)
- GET /clubs/players -> VERIFY: map to `views/clubs/players/*` (multiple views exist under `views/clubs/players/`) — add per-page help as appropriate
- GET /clubs/players/add -> `views/clubs/players/add` (VERIFY exact filename - helper: see `views/clubs/players/` folder)
- GET /sponsors/new -> admin-only (no `views/sponsors/new.ejs` found in repo; admin sponsor creation appears under `views/admin/` instead)

## Carnivals

- GET /admin/sponsors -> VERIFY (no `views/admin/sponsors.*` found; check controller)
- GET /carnivals/new -> `views/carnivals/new.ejs`
- GET /admin/users/:id/edit -> `views/admin/edit-user.ejs`
- GET /carnivals/:id -> `views/carnivals/show.ejs`
- 404 / not found -> handled by error flow (error template at `views/error.ejs`)
- POST /carnivals/:id/edit -> handler (skip)
- GET /carnivals/:id/sponsors -> `views/carnivals/sponsors.ejs`
- GET /carnivals/:id/players -> `views/carnivals/players.ejs`
- GET /carnivals/:id/attendees -> `views/carnivals/attendees.ejs`
- Routes mounted from `carnivalClubs.mjs` (sub-router) — verify sub-routes and map to views under `views/carnivals/` as needed

## Sponsors

- GET /sponsors -> `views/sponsors/list.ejs`
- GET /sponsors/:id -> `views/sponsors/show.ejs`
- GET /sponsors/new -> admin-only (controller may render admin view under `views/admin/` or `views/sponsors/`) - VERIFY
- POST /sponsors -> handler (skip)

## Admin

All admin routes are authenticated and live under `/admin/*`.

- GET /admin/dashboard -> `views/admin/dashboard.ejs`
- GET /admin/users -> `views/admin/users.ejs`
- GET /admin/users/:id/edit -> `views/admin/edit-user.ejs` (VERIFY exact filename; there is `views/admin/edit-user.ejs`)
- GET /admin/clubs -> `views/admin/clubs.ejs`
- GET /admin/clubs/:id/edit -> `views/admin/edit-club.ejs`
- GET /admin/carnivals -> `views/admin/carnivals.ejs`
- GET /admin/carnivals/:id/edit -> `views/admin/edit-carnival.ejs`
- GET /admin/sponsors -> `views/admin/` (VERIFY exact sponsor admin view exists)
- GET /admin/audit-logs -> `views/admin/audit-logs.ejs`
- GET /admin/reports -> `views/admin/reports.ejs`

## Misc / System

- Error pages -> `views/error.ejs`
- 404 / not found -> handled by error flow (verify)
- Static assets and client JS are in `public/` — help icons and script entry points should be added under `public/js/` and `public/styles/`

---

## API-only / Non-UI endpoints (examples - do not attach per-endpoint popups)

- `/health`
- `/api/maintenance/status`
- `/api/coming-soon/status`
- `/clubs/api/search` (autocomplete) — instead add help to the form that triggers this endpoint (e.g., `views/clubs/club-options.ejs`)
- Image upload / delete endpoints under `/clubs/:clubId/images`
- Many POST/PUT/DELETE routes for create/update/delete actions — add help on the form pages, not on the POST endpoints

---

## Verification checklist (next steps)

- [ ] Run a quick scan of `routes/` and `views/` to confirm every mapping above and mark any "VERIFY" items as confirmed or update the mapping.
- [ ] For each GET route that renders a view, add a TODO for the help popup components to be added to that view.
- [ ] For AJAX endpoints, list the parent views that consume them and add help to those parent views instead.
- [ ] Create per-page help stub files under `docs/help-content/` (one markdown file per page) and reference them from the help configuration.

---

## Notes

This mapping is intentionally conservative: it maps to server-rendered views found in `views/` and marks POST-only endpoints and pure APIs as "skip". Run the verification checklist above and I will update this file to remove VERIFY flags and produce per-page help stubs.
