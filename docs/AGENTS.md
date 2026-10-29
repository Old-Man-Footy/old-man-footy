# AGENTS.md — `docs/`

## 1. Module Context

Repository documentation with two distinct roles:

| Path | Role |
|---|---|
| `help/*.md` | **Runtime content.** In-app contextual help, upserted into the `HelpContent` table by `scripts/seed-help-content.mjs` on every startup and copied into the Docker image. |
| `plans/*.md` | Static implementation/test plans (checklists) authored on request. |

## 2. Tech Stack & Tooling

Markdown with YAML front matter (help files), rendered with marked ^16.3.0 by `controllers/help.controller.mjs`. `yq` for front matter inspection.

## 3. Architectural Standards

- Help file format (mandatory):
  ```markdown
  ---
  pageIdentifier: carnivals-edit
  title: Edit Carnival Help
  ---

  ## Overview
  ...
  ## Key Features Explained
  ### <Section>
  ```
- `pageIdentifier` equals the filename stem and the `data-page-id` attribute of the corresponding view. Section anchors referenced by `data-help-key` in views must exist as headings.
- One help file per page; filename `<domain>-<page>.md` in kebab-case.
- Plans: markdown checklists, static (no progress narratives); test counts permitted beside items (e.g., `(5/7)`). Filename `<feature>-plan.md`.
- Spec Kit artifacts are not stored here; they belong in `specs/`.

## 4. Coding Conventions

- Australian English; second person; describe UI as it exists (no speculative features).
- No HTML in help markdown; no secrets, internal URLs or credentials.
- Validate front matter: `yq --front-matter=extract '.pageIdentifier' docs/help/<file>.md` must print the filename stem.

## 5. Workflow Policies

- UI changes that add/rename pages or sections update the matching help file in the same PR.
- Branch as `docs/<slug>`.

## 6. Agent Directives

- Do not rename or delete a help file without updating the matching view `data-page-id` and confirming no orphaned `HelpContent` rows matter (manual review).
- Do not create plans unless explicitly asked; use `/speckit.specify` for feature specifications instead.
