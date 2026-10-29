# AGENTS.md — `public/`

## 1. Module Context

Static assets served by `express.static` at the site root. Contains client-side ES modules (`js/`), stylesheets (`styles/`), README screenshots (`screenshots/`), static images/icons, and runtime user uploads (`uploads/`). No build step: files ship as authored.

| Path | Content | Agent access |
|---|---|---|
| `js/` | Page/feature client modules, `js/utils/ui-helpers.js` | Read/write |
| `styles/` | `styles.css` (global) + `<domain>.styles.css` | Read/write |
| `screenshots/` | Documentation images grouped by role | Read-only unless asked |
| `uploads/` | User-uploaded content (gitignored except `.gitkeep`) | **No access** |

## 2. Tech Stack & Tooling

Browser-native ES modules (`<script type="module">`), Bootstrap 5.3 JS bundle (global `bootstrap`), Fetch API, CSS custom properties. Tests: Vitest ^3.2.4 + jsdom ^26.1.0 via `vitest.config.js.mjs` (`npm run test:js`).

## 3. Architectural Standards

- Manager Object Pattern is mandatory for every file in `js/`:
  ```js
  export const carnivalEditManager = {
    elements: {},
    state: {},
    initialize() { this.cacheElements(); this.bindEvents(); },
    cacheElements() { this.elements = { form: document.querySelector('form') }; },
    bindEvents() { this.elements.form?.addEventListener('submit', this.handleSubmit); },
    handleSubmit: (event) => { /* arrow fn; reference manager by name */ },
  };
  document.addEventListener('DOMContentLoaded', () => carnivalEditManager.initialize());
  ```
  One exported manager per file; all state on `state`; all DOM lookups in `cacheElements` (legacy name `cacheDOMElements` is accepted); event handlers are arrow functions.
- Shared helpers are imported from `./utils/ui-helpers.js` or existing component managers (`image-uploader.js`, `document-uploader.js`); do not duplicate.
- Server data is read from `data-*` attributes; never from inline globals.
- AJAX requests send `x-csrf-token` and `X-Requested-With: XMLHttpRequest`, and handle `{ success, message, data }` and `{ error: { status, message } }` response shapes.
- Insert user-provided text with `textContent`; `innerHTML` only with static or escaped content.
- CSS: colours via custom properties with light/dark variants; domain styles in `<domain>.styles.css`; no CSS-in-JS, no inline styles.
- `theme-init.js` runs as a classic script before render to prevent theme flash; do not convert it to a module.

## 4. Coding Conventions

- File naming: `kebab-case.js` named after the page/feature (`carnival-edit.js`, `admin-user-management.js`); manager export `camelCaseManager`.
- 4-space indentation is used in existing `js/` files; match the file being edited.
- async methods wrap network calls in `try/catch` and surface errors via `showAlert`.
- JSDoc or a one-line comment per method.
- Tests: `tests/js/<domain>/<file>.test.mjs`, importing the manager directly, building DOM fixtures with `document.body.innerHTML`, mocking `fetch` with `vi.fn()`.

## 5. Workflow Policies

- New client modules ship with a jsdom test.
- Branch as `feat/ui-<slug>` / `fix/ui-<slug>`.

## 6. Agent Directives

- Never read, write, delete or commit anything under `public/uploads/`.
- Never add third-party scripts or libraries (CDN or vendored) without manual review.
- Never use `eval`, `new Function`, or string-based `setTimeout`.
- Replace `screenshots/` images only when explicitly instructed.
