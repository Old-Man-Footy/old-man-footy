# Plan: Refactor Club-Sponsor Relationship to Club-Specific Sponsors

## Database & Models
- [x] Remove the ClubSponsor join table and all many-to-many associations between Club and Sponsor.
- [x] Update the Sponsor model to include a `clubId` foreign key (one-to-many: each sponsor belongs to one club).
- [x] Update Sequelize migrations to:
  - [x] Drop the ClubSponsor table.
  - [x] Add `clubId` to the Sponsor table (with foreign key constraint).
  - [x] Migrate existing sponsor data to link to correct club (delete orphaned sponsors; test data only)
- [x] Update all model files to remove `belongsToMany` and use `belongsTo`/`hasMany` as appropriate.

## Controllers
- [x] Refactor sponsor controller logic to ensure sponsors are always linked to a specific club.
- [x] Remove any logic that fetches or displays sponsors across multiple clubs.
- [x] Update club controller logic to fetch only its own sponsors.

## Views
- [x] Remove "related clubs" display from sponsor views.
- [x] Update club views to show only their own sponsors.
- [x] Update sponsor creation/edit forms to ensure a club is selected or pre-filled.

## Services
- [x] Refactor any service logic that assumes sponsors can be shared between clubs. *(No direct references found)*

## Tests
- [x] Update model tests to reflect the new one-to-many relationship.
- [x] Remove or refactor tests for the ClubSponsor join table and many-to-many logic.
- [x] Update controller tests to ensure sponsors are club-specific.
- [x] Add view tests for sponsor display per club.

## Documentation
- [x] Update README and API documentation to reflect the new sponsor relationship.
- [x] Remove ClubSponsor from project structure in README.

## Migration & Data Integrity
- [x] Create a migration script to safely convert existing sponsor data. *(if needed)*
- [x] Ensure no orphaned sponsors exist after migration.
- [x] Test migration on a backup of production data.

## Code Cleanup
- [x] Remove unused code, associations, and references to ClubSponsor.
- [x] Refactor any utility functions or helpers related to sponsor-club linking.
w