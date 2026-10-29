# AGENTS.md — `models/`

## 1. Module Context

Persistence and domain model layer. Defines Sequelize models, attribute validation, model-scoped business rules (instance and static methods), and all associations. Depends only on `config/` and other models.

Models: `User`, `Club`, `ClubAlternateName`, `ClubPlayer`, `Carnival`, `CarnivalClub`, `CarnivalClubPlayer`, `CarnivalSponsor`, `Sponsor`, `EmailSubscription`, `AuditLog`, `SyncLog`, `HelpContent`, `ImageUpload`, `Session`, `ContactSubmission`, `ContactReply`. `index.mjs` imports all models, defines associations, and re-exports them with `sequelize`.

## 2. Tech Stack & Tooling

Sequelize ^6.37.7 (`Model`, `DataTypes`, `Op`), SQLite3. ESM `.mjs`.

## 3. Architectural Standards

- Pattern per model:
  ```js
  import { DataTypes, Model } from 'sequelize';
  import { sequelize } from '../config/database.mjs';
  class Club extends Model { /* instance + static methods */ }
  Club.init({ /* attributes */ }, { sequelize, modelName: 'Club', tableName: 'clubs', timestamps: true });
  export default Club;
  ```
- All associations (`belongsTo`, `hasMany`, `belongsToMany`) are defined only in `models/index.mjs`, with explicit `foreignKey` and `as` aliases. Consumers import from `models/index.mjs`.
- Model attributes must match the schema produced by `migrations/`. Every attribute change requires a migration in the same PR.
- Enum-like attributes use `config/constants.mjs` arrays (`isIn: [X_ARRAY]`); never inline literals.
- Data-access helpers that encapsulate a reusable query or permission rule are static methods (`static async getActiveForCarnival(id)`, `canUserUploadForCarnival(user, id)`).
- Soft deletion uses `isActive` flags where already established; do not mix with `paranoid`.
- Password hashing (bcrypt) and token generation live in model hooks/methods (`User`); never in controllers.
- Raw SQL is prohibited.

## 4. Coding Conventions

- File naming: `PascalCase.mjs` singular (`CarnivalClubPlayer.mjs`).
- Attributes `camelCase`; foreign keys `<entity>Id`; booleans `is*`/`has*`/`include*`.
- Table names `snake_case` plural.
- Every attribute with constraints declares `allowNull` and `validate` explicitly.
- JSDoc on every method.
- Tests: `tests/models/<lowercasemodel>.model.test.mjs`, run against the SQLite test database (`data/test-old-man-footy.db`). Cover validation, defaults, hooks and static methods.

## 5. Workflow Policies

- `models/index.mjs` is CODEOWNERS-sensitive.
- Model + migration + test ship together in one PR.

## 6. Agent Directives

- Manual architectural review required for: association changes, removing/renaming attributes, changing primary/foreign keys, adding hooks with side effects, changes to `User` authentication fields.
- Never call `sequelize.sync()` / `Model.sync()` outside tests.
- Never expose sensitive attributes by default; use `defaultScope`/`attributes.exclude` or explicit selection.
- New entities begin with `/speckit.specify` capturing fields, constraints, associations and migration plan.
