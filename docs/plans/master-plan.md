# Master Plan: Index of All Plans

Single entry point for every plan in the repository. Each row records the plan's **verified** state,
checked against the code (not just its checkboxes), so unfinished work is never lost.

Last verified: 2026-10-30 against commit `9a52f8f`.

## How to use this index

- Start any planned work here. Pick the highest-priority active plan whose dependencies are met.
- When you change a plan's progress, update its row in the same PR.
- When you add a plan, add a row. When you discover a plan is stale, mark it and say why.
- Re-verify against the code before trusting a status older than a month.

### Status legend

| Status        | Meaning                                                             |
| ------------- | ------------------------------------------------------------------- |
| Active        | Being worked on now; next items are ready                           |
| Ready         | Fully specified; waiting for its turn or a dependency               |
| Blocked       | Cannot proceed until a named decision or dependency is resolved     |
| Backlog       | Valid idea, not scheduled                                           |
| Needs refresh | Plan content no longer matches the codebase; update before starting |
| Superseded    | Scope absorbed into another plan; kept for reference                |
| Archived      | Complete and verified; moved to `docs/plans/archived/`              |

### Archive rule

A plan is archived only when **every** item is done **and** verified in the code (tests exist and
pass, behaviour present). Then:

1. `git mv docs/plans/<plan>.md docs/plans/archived/<plan>.md` (create `archived/` on first use).
2. Change the plan's status banner to `Archived (<date>)`.
3. Keep its row in the index below with status **Archived** and the updated link.

A superseded plan is archived once the plan that absorbed it is archived.

## Plan index

| #   | Plan                                                             | Scope                                                                                        | Verified status                                                                                                                 | Progress                                                                                                                              | Depends on                                                                               | Priority       |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------- |
| 1   | [Remediation plan](../remediation_plan.md)                       | Security fixes, broken journeys, UX/onboarding, shared components, test harness and coverage | **Active** — new; Phase 0 decisions pending                                                                                     | 0 of 5 phases                                                                                                                         | Phase 0 human decisions (error-handling standard, CSP, CI approval)                      | 1              |
| 2   | [Marketing plan](../marketing_plan.md)                           | Zero-budget organic growth for a solo volunteer                                              | **Ready** — weeks 1–2 can start now; outreach gated                                                                             | 0 of 3 roadmap stages                                                                                                                 | Remediation Phase 1 items B-01 to B-06, B-10, B-17 to B-19 before outreach               | 2              |
| 3   | [Controller standardisation](controller-standardization-plan.md) | Migrate controllers to one async error-handling pattern                                      | **Blocked** — conflicts with root `AGENTS.md`, which names `asyncHandler`, not `wrapControllers`                                | 0 of 7 stages (carnival still 23 `asyncHandler`, main 9; carnivalSponsor, clubPlayer, subscription, help, api/subscription unwrapped) | Remediation Phase 0 decision; then remediation Phase 4 `refactor/async-handler-coverage` | Folded into #1 |
| 4   | [Unit testing plan](unit-testing-plan.md)                        | 16 missing unit test files                                                                   | **Superseded** by remediation Part C; partly stale (`imageDisplayService` does not exist; mentions nodemailer, app uses Resend) | 4 of 16 target files exist (`dateUtils`, `admin.controller`, `CarnivalEmailService`, `security`)                                      | —                                                                                        | Folded into #1 |
| 5   | [Scheduled email](scheduled-email-implementation-plan.md)        | Scheduled and campaign emails to subscribers                                                 | **Backlog / Needs refresh** — nothing built beyond pre-existing infrastructure; describes Gmail transport, code now uses Resend | 0 implementation items (7 ticks are prerequisites that already existed)                                                               | Remediation B-01 (unsubscribe) and B-11 (verification email)                             | 3              |
| 6   | [Automated draw creation](automated-draw-creation-plan.md)       | Algorithmic draw generation for carnivals                                                    | **Backlog** — no draw services, models or migrations exist; the About and Coming Soon pages advertise it as planned             | 0 implementation items (7 ticks are prerequisites that already existed)                                                               | Remediation Phases 1–2 (stable carnival registration journey with tests)                 | 4              |

Archived plans: none yet. `docs/plans/archived/` will be created when the first plan completes.

## Recommended sequence

1. **Remediation Phase 0** (human decisions) → unblocks #1 and #3.
2. **Remediation Phase 1** (security and broken journeys) while **marketing weeks 1–2** build assets
   in parallel.
3. **Remediation Phase 2** (test harness, CI) → creates the safety net for everything after.
4. **Marketing weeks 3–12** start once the marketing gate is clear; **remediation Phase 3**
   (onboarding) runs alongside because it directly improves conversion from outreach.
5. **Remediation Phases 4–5** (refactor, hygiene). Completing Phase 4 also completes #3; completing
   Part C completes #4.
6. **Scheduled email** (#5): refresh the plan for Resend and the fixed subscription flow, then
   implement. It extends the marketing plan's monthly round-up.
7. **Automated draw creation** (#6): largest new feature; start once the
   carnival registration journey has integration and e2e coverage.

## Cross-plan dependencies

```text
Remediation Phase 0 ──► Controller standardisation (#3)
Remediation Phase 1 ──► Marketing outreach (weeks 3+)
Remediation B-01, B-11 ──► Scheduled email (#5)
Remediation Part C ──► supersedes Unit testing (#4)
Remediation Phases 1–2 ──► Automated draw creation (#6)
```

## History

- 2025-09-29 (`a7bd29f`): earlier plans and analyses moved to `docs/ARCHIVE/`.
- 2025-10-09 (`0675b93`): `docs/ARCHIVE/` removed. Its contents are recoverable from git history if
  needed (`git show a7bd29f --stat`).
- 2026-10-30: this index created; remediation and marketing plans added; existing plans re-verified
  against the code.
