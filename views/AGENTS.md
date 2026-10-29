# AGENTS.md — `views/`

## 1. Module Context

Server-rendered presentation layer. EJS templates rendered by controllers through `express-ejs-layouts` with `layout.ejs` as the master layout. Views display only data supplied by controllers; they contain no business logic, data access, or application JavaScript.

Structure: page templates grouped by domain (`admin/`, `auth/`, `carnivals/`, `clubs/`, `clubs/players/`), shared partials (`partials/`, `shared/sponsors/`), and top-level pages (`index`, `dashboard`, `contact`, `about`, `error`, `maintenance`, `coming-soon`, `unsubscribe*`).

## 2. Tech Stack & Tooling

EJS ^3.1.10, express-ejs-layouts ^2.5.1 (`extractStyles: true`, `extractScripts: false`), Bootstrap 5.3.0 and Bootstrap Icons (`bi bi-*`) via CDN, Cloudflare Turnstile widget (`SITE_KEY` local).

## 3. Architectural Standards

- Escaping: use `<%= %>` for all dynamic values. `<%- %>` is permitted only for `include()` and for HTML sanitised server-side (e.g., rendered help markdown).
- Every `POST` form includes `<input type="hidden" name="_token" value="<%= csrfToken %>">`. AJAX consumers read the token from the DOM/meta and send `x-csrf-token`.
- Each page root element declares `data-page-id="<page-identifier>"`; the value must match a `pageIdentifier` in `docs/help/*.md` for the help system.
- Page JS/CSS are declared by the controller via `additionalJS` / `additionalCSS` locals, or by a single `<script data-cfasync="false" type="module" src="/js/<page>.js"></script>` at the end of the template. Inline `<script>` logic is prohibited (the theme bootstrap in `layout.ejs` is the sole exception).
- Server-to-client data is passed through `data-*` attributes, not inline JS variables.
- Inline `style="..."` attributes are prohibited in new markup; styles belong in `public/styles/`. Existing inline styles are legacy debt.
- Asset paths are root-relative (`/styles/x.css`, `/js/x.js`); never prefix with `/public`.
- All pages support light and dark themes using CSS custom properties; do not hardcode colours.
- Accessibility: labelled form controls, `aria-label` on icon-only buttons, semantic headings.

## 4. Coding Conventions

- File naming: `kebab-case.ejs`; partials in `partials/` (underscore prefix only for uploader components, matching existing `_imageUploader.ejs`).
- Guard optional locals with `typeof x !== 'undefined'`.
- Flash output via `partials/flash-messages.ejs`; do not render flash ad hoc.
- Australian English copy.
- Tests: rendering helpers in `tests/views/`; client behaviour in `tests/js/`.

## 5. Workflow Policies

- New pages require a matching `docs/help/<page-id>.md` and, if user-visible, README screenshot review.
- Branch as `feat/ui-<slug>` or `fix/ui-<slug>`.

## 6. Agent Directives

- Never read `process.env` in new template code; controllers pass values as locals (existing `process.env` references are legacy).
- Never render sensitive model fields (password hashes, tokens, emails of other users without authorisation).
- Never add CDN resources without manual review (CSP impact).
- Changes to `layout.ejs` require manual architectural review.
