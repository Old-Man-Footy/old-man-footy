# Mock Data Test Plan

Convert the following unit test files to use mock data instead of the test database:

- [x] models/AuditLog.test.mjs
- [x] models/Carnival.test.mjs
- [x] models/Club.test.mjs
- [x] models/ClubAlternateName.test.mjs
- [x] models/ClubPlayer.test.mjs
- [x] models/CarnivalClubPlayer.test.mjs
- [x] models/User.test.mjs
- [x] models/EmailSubscription.test.mjs
- [x] models/index.test.mjs

---

## Plan to Fix Remaining Test Failures

1. CarnivalSponsor Model Tests
- [x] Refactor CarnivalSponsor.test.mjs to use mock data and methods for all relationship and summary logic.
- [x] Mock CarnivalSponsor, Sponsor, and Carnival objects and their associations.
- [x] Implement in-memory stores for relationships.
- [x] Mock all static and instance methods (getSponsorDetails, getCarnivalDetails, isActive, getActiveForCarnival, getActiveForSponsor, getSponsorshipSummary).

2. CarnivalClub Model Tests
- [x] Refactor CarnivalClub.test.mjs to use mock data and methods for all relationship and attendance logic.
- [x] Mock CarnivalClub, Club, and Carnival objects and their associations.
- [x] Implement in-memory stores for relationships.
- [x] Mock all static and instance methods (getActiveForCarnival, getActiveForClub, isClubRegistered, getAttendanceCount, getAttendanceCountWithStatus, getCarnivalDetails, getClubDetails, isActive, isApproved).

3. Sponsor Controller Tests
- [x] Refactor sponsor.controller.test.mjs to use mock data for Sponsor and file upload logic.
- [x] Mock Sponsor model and file upload handling.
- [x] Ensure all CRUD and display operations use mocks.

4. ClubSponsor Controller Tests
- [x] Refactor clubSponsor.controller.test.mjs to use mock data for club-sponsor relationships.

5. Admin Controller Tests
- [x] Refactor admin.controller.test.mjs to use mock data for admin features.

---
    
### Execution Order
- Start with CarnivalSponsor.test.mjs and CarnivalClub.test.mjs (models first).
- Move to sponsor.controller.test.mjs, clubSponsor.controller.test.mjs, and admin.controller.test.mjs (controllers next).
- For each file:
  - Replace all database calls with mock objects and in-memory stores.
  - Mock all associations and business logic methods.
  - Ensure tests are isolated, fast, and do not touch the database.
