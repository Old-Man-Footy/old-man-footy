# E2E Test Plan: Old Man Footy

- [x] Setup: Convert Playwright E2E to ES Modules (.mjs)
- [x] Ensure sequential runs (workers=1)
- [x] Install Playwright browsers and Winldd (Windows)
- [x] Configure Playwright webServer on port 3056 with reuseExistingServer=false
- [x] Disable rate limiting in test environment to prevent 429 during E2E

## Existing Tests Verification
- [x] Homepage: loads and shows key sections (tests/e2e/homepage.spec.mjs)
- [x] Contact: submits contact form (tests/e2e/contact.spec.mjs)
- [x] Auth: register then login flow (tests/e2e/auth.spec.mjs)

## New Tests To Add
- [ ] E2E seed helper: create minimal sponsors to exercise filters
- [ ] 404: unknown route renders error page
- [ ] Maintenance mode: when enabled, renders maintenance page
- [ ] Coming soon mode: when enabled, renders coming soon page

### Sponsors
- [x] Sponsors: list page loads, shows empty state when no sponsors (tests/e2e/sponsors.spec.mjs)
- [ ] Sponsors: filters (search/state/level) update results (needs seed data)
- [ ] Sponsor profile page renders public details (logo fallback, business type, location, description)
- [ ] Sponsor external links (website/facebook/instagram/twitter/linkedin) render when present
- [ ] Sponsor filters can be combined (search + state + level)
- [ ] Sponsor list stats bar updates counts (Total/Active/Gold/Silver) when seeded
- [ ] AuthZ: Create/Edit sponsor pages require admin (redirect or 403 for non-admin)

### Clubs
- [ ] Clubs: list page loads and basic navigation
- [ ] Clubs list shows items and supports search by name/location
- [ ] Clubs filter by state updates results
- [ ] Club detail page renders logo, location, state badge, and links
- [ ] Manage Club Profile requires authentication (redirect to login if anonymous)
- [ ] Club Players: list renders for a club; adding a player requires auth (smoke only)

### Carnivals
- [ ] Carnivals list loads with items when seeded; supports state filter
- [ ] Carnival detail page renders date, address partial, and state badge
- [ ] Register button shown when a `registrationLink` exists and opens in new tab
- [ ] Carousel images section renders when images are available (smoke)

### Auth
- [ ] Registration rejects duplicate email and shows error message
- [ ] Registration enforces strong password validation (error messaging)
- [ ] Login/Logout cycle: after logout, dashboard link is hidden and session cleared
- [ ] Session persists across navigation (stay logged in visiting multiple pages)

### Dashboard
- [ ] Dashboard: visible after login with expected widgets
- [ ] Dashboard loads after login with expected headings/widgets (smoke)
- [ ] Link to Add Carnival visible for logged-in delegate (if applicable)
- [ ] Anonymous users are redirected to login when visiting /dashboard

### Global UI & Navigation
- [ ] Navbar links navigate successfully to Carnivals, Clubs, About, Contact
- [ ] Footer links work; MySideline link targets external site in new tab
- [ ] Environment banner visible in NODE_ENV=test with correct text
- [ ] Layout footer shows current year and quick links

### Subscription (Homepage)
- [ ] Subscribe form validates email and requires at least one state selected
- [ ] Custom state selector supports Select All / Clear All interactions
- [ ] Bot protection negative case: filled honeypot or too-fast submission is rejected (message)

### Error & Modes
- [ ] 404 page shows friendly error with Go Home / Back controls
- [ ] Maintenance mode enabled (FEATURE_MAINTENANCE_MODE=true) blocks public pages with maintenance view
- [ ] Coming soon mode enabled (FEATURE_COMING_SOON_MODE=true) shows coming soon page and hides Register

### Security Headers (Smoke)
- [ ] Responses include security headers (Content-Security-Policy, HSTS) via Helmet
- [ ] No mixed content; core assets load over https in test constraints

### API (Optional E2E/HTTP Smoke)
- [ ] Public API endpoint for sponsors (if available) returns JSON and 200 OK
- [ ] Error shape conforms to `{ error: { status, message } }` on invalid input

## Notes
- Keep tests isolated and independent; use robust selectors (getByRole, test ids).
- Avoid reliance on seeded data unless explicitly set up in a setup project.

## Environment & Config
- [x] Playwright webServer runs `npm start` on port 3056 (NODE_ENV=test)
- [x] reuseExistingServer=false to ensure clean server per run
- [x] Rate limiting disabled in test to avoid 429s
- [ ] Confirm test DB path and write perms for SQLite (data/test-old-man-footy.db)

## How to Run
- CLI (sequential):
	- [x] `npm run test:e2e`
	- [x] `npm run test:e2e:headed`
	- [x] `npm run test:e2e:ui`
	- [x] `npx playwright show-report test-results/playwright-report`

## Data & Seeding Strategy
- [ ] Add a minimal E2E seed script (scripts/e2e-seed-sponsors.mjs) to create sponsors for filter tests
- [ ] Ensure seed script respects NODE_ENV=test and uses Sequelize models
- [ ] Add a cleanup step to reset sponsors between runs (truncate-only in test DB)

## Selector & Stability Guidelines
- [x] Prefer getByRole/name for headings, links, buttons
- [x] Scope selectors to regions (navigation/main/footer) to avoid strict collisions
- [x] Use web-first assertions and explicit waits for redirects (Promise.all + waitForURL)
- [x] Avoid relying on implicit network idleness; assert on visible UI states

## CI Integration
- [ ] Add GitHub Actions workflow to run E2E on pushes/PRs (Playwright install + browsers)
- [ ] Upload Playwright HTML report as artifact on failure
- [ ] Gate merges on green E2E (sequential, 1 worker)

## Coverage Expansion Roadmap
- [ ] Sponsors: filters (search/state/level) update results (needs seed data)
- [ ] Sponsor profile: public profile renders with optional fields
- [ ] Dashboard: visible after login with expected widgets
- [ ] Clubs: list page loads and basic navigation
- [ ] Clubs: manage page access control (auth required)
- [ ] Carnivals: list page loads, view detail, register link if present
- [ ] 404: unknown route renders error page
- [ ] Maintenance mode: when enabled, renders maintenance page
- [ ] Coming soon mode: when enabled, renders coming soon page
