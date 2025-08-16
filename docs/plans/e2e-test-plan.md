# E2E Test Plan: Old Man Footy

- [x] Setup: Convert Playwright E2E to ES Modules (.mjs)
- [x] Ensure sequential runs (workers=1)
- [x] Install Playwright browsers and Winldd (Windows)

## Existing Tests Verification
- [ ] Homepage: loads and shows key sections (tests/e2e/homepage.spec.mjs)
- [ ] Contact: submits contact form (tests/e2e/contact.spec.mjs)
- [ ] Auth: register then login flow (tests/e2e/auth.spec.mjs)

## New Tests To Add
- [x] Sponsors: list page loads, shows empty state when no sponsors (tests/e2e/sponsors.spec.mjs)
- [ ] Sponsors: filters (search/state/level) update results (needs seed data)
- [ ] Dashboard: visible after login with expected widgets
- [ ] Clubs: list page loads and basic navigation
- [ ] 404: unknown route renders error page
- [ ] Maintenance mode: when enabled, renders maintenance page
- [ ] Coming soon mode: when enabled, renders coming soon page

## Notes
- Keep tests isolated and independent; use robust selectors (getByRole, test ids).
- Avoid reliance on seeded data unless explicitly set up in a setup project.
