# Test Refactoring Plan - Complete Test Suite Inventory

> **Purpose**: Track the refactoring and rewriting of all test files to ensure proper test coverage, consistent patterns, and 100% pass rate.
> **Current Status**: 92.2% passing (1078/1169 tests passing, 91 failing)
> **Target**: 100% passing with clean, maintainable test code

---

## Test File Inventory & Status

### Controllers Tests (20 files)

#### ✅ Passing Controller Tests
- [ ] `tests/controllers/admin.controller.test.mjs` - **NEEDS REVIEW** - Verify all edge cases covered
- [ ] `tests/controllers/auth.controller.test.mjs` - **NEEDS REVIEW** - Verify authentication flows
- [ ] `tests/controllers/carnival.controller.test.mjs` - **NEEDS REVIEW** - Verify carnival CRUD operations
- [ ] `tests/controllers/carnivalClub.controller.test.mjs` - **NEEDS REVIEW** - Verify registration flows
- [ ] `tests/controllers/carnivalSponsor.controller.test.mjs` - **NEEDS REVIEW** - Verify sponsor management
- [ ] `tests/controllers/club.controller.test.mjs` - **NEEDS REVIEW** - Verify club operations
- [ ] `tests/controllers/comingSoon.controller.test.mjs` - **NEEDS REVIEW** - Verify coming soon mode
- [ ] `tests/controllers/help.controller.test.mjs` - **NEEDS REVIEW** - Verify help system
- [ ] `tests/controllers/main.controller.test.mjs` - **NEEDS REVIEW** - Verify main routes
- [ ] `tests/controllers/maintenance.controller.test.mjs` - **NEEDS REVIEW** - Verify maintenance mode
- [ ] `tests/controllers/sponsor.controller.test.mjs` - **NEEDS REVIEW** - Verify sponsor CRUD
- [ ] `tests/controllers/subscription.controller.test.mjs` - **NEEDS REVIEW** - Verify subscription management

#### ❌ Failing Controller Tests (3 files)
- [ ] `tests/controllers/clubPlayer.controller.test.mjs` - **REWRITE REQUIRED** - 13 failing tests
  - Validation-related failures
  - Error message mismatches
  - Mock setup issues
  - Authorization check failures
  
- [ ] `tests/controllers/hostingClubFeeExemption.test.mjs` - **REWRITE REQUIRED** - 10 failing tests
  - Missing `carnival.canUserEdit` method in mocks
  - Mock structure inconsistencies
  - Need to align with actual controller implementation
  
- [ ] `tests/controllers/public-subscription.controller.test.mjs` - **NEEDS REVIEW** - Currently passing but complex logic

#### 🔄 API Controller Tests
- [ ] `tests/routes/api/carnival.test.mjs` - **NEEDS REVIEW** - Verify API endpoints
- [ ] `tests/routes/api/clubs.test.mjs` - **NEEDS REVIEW** - Verify club API
- [ ] `tests/routes/api/sponsors.test.mjs` - **NEEDS REVIEW** - Verify sponsor API

---

### Middleware Tests (7 files)

#### ✅ Passing Middleware Tests
- [ ] `tests/middleware/asyncHandler.test.mjs` - **NEEDS REVIEW** - Verify error handling wrapper
- [ ] `tests/middleware/auth.test.mjs` - **NEEDS REVIEW** - Verify authentication middleware
- [ ] `tests/middleware/comingSoon.test.mjs` - **NEEDS REVIEW** - Verify coming soon checks
- [ ] `tests/middleware/maintenance.test.mjs` - **NEEDS REVIEW** - Verify maintenance mode
- [ ] `tests/middleware/subscription-bot-protection.test.mjs` - **NEEDS REVIEW** - Verify bot protection

#### ❌ Failing Middleware Tests (2 files)
- [ ] `tests/middleware/galleryUpload.test.mjs` - **REWRITE REQUIRED** - 58 failing tests
  - Validation logic mismatches
  - done() callback vs async/await pattern issues
  - Error response format inconsistencies
  - Status code assertion failures
  - Multer instance undefined issues
  
- [ ] `tests/middleware/security.test.mjs` - **REWRITE REQUIRED** - 2 failing tests
  - CSRF token generation test failure
  - CSRF token header acceptance test failure

---

### Model Tests (14 files)

#### ✅ Passing Model Tests
- [ ] `tests/models/auditLog.model.test.mjs` - **NEEDS REVIEW** - Verify audit logging
- [ ] `tests/models/carnival.modal.test.mjs` - **NEEDS REVIEW** - Verify carnival model
- [ ] `tests/models/carnivalClub.model.test.mjs` - **NEEDS REVIEW** - Verify registration model
- [ ] `tests/models/carnivalClubFeeExemption.model.test.mjs` - **NEEDS REVIEW** - Verify fee exemption logic
- [ ] `tests/models/carnivalClubPlayer.model.test.mjs` - **NEEDS REVIEW** - Verify player model
- [ ] `tests/models/carnivalSponsor.model.test.mjs` - **NEEDS REVIEW** - Verify carnival sponsor model
- [ ] `tests/models/club.model.test.mjs` - **NEEDS REVIEW** - Verify club model
- [ ] `tests/models/clubAlternateName.model.test.mjs` - **NEEDS REVIEW** - Verify alternate names
- [ ] `tests/models/clubPlayer.model.test.mjs` - **NEEDS REVIEW** - Verify club player model
- [ ] `tests/models/emailSubscription.model.test.mjs` - **NEEDS REVIEW** - Verify subscriptions
- [ ] `tests/models/helpContent.model.test.mjs` - **NEEDS REVIEW** - Verify help content
- [ ] `tests/models/ImageUpload.model.test.mjs` - **NEEDS REVIEW** - Verify image uploads
- [ ] `tests/models/sponsor.model.test.mjs` - **NEEDS REVIEW** - Verify sponsor model
- [ ] `tests/models/user.model.test.mjs` - **NEEDS REVIEW** - Verify user model

#### ❌ Failing Model Tests (1 file)
- [ ] `tests/models/index.test.mjs` - **REWRITE REQUIRED** - 1 failing test
  - Carnival/Sponsor many-to-many association test failure

---

### Service Tests (7 files)

#### ✅ Passing Service Tests
- [ ] `tests/services/auditService.test.mjs` - **NEEDS REVIEW** - Verify audit service
- [ ] `tests/services/carouselImageService.test.mjs` - **NEEDS REVIEW** - Verify carousel service
- [ ] `tests/services/imageDisplayService.test.mjs` - **NEEDS REVIEW** - Verify image display
- [ ] `tests/services/imageUploadService.test.mjs` - **NEEDS REVIEW** - Verify upload service
- [ ] `tests/services/sponsorSortingService.test.mjs` - **NEEDS REVIEW** - Verify sponsor sorting
- [ ] `tests/services/email/BaseEmailService.test.mjs` - **NEEDS REVIEW** - Verify base email service
- [ ] `tests/services/email/CarnivalEmailService.test.mjs` - **NEEDS REVIEW** - Verify carnival emails

---

### Utility Tests (2 files)

#### ✅ Passing Utility Tests
- [ ] `tests/utils/dateUtils.test.mjs` - **NEEDS REVIEW** - Verify date utilities
- [ ] `tests/utils/errorMessages.test.mjs` - **NEEDS REVIEW** - Verify error messages

---

### Config Tests (2 files)

#### ✅ Passing Config Tests
- [ ] `tests/config/database-optimizer.test.mjs` - **NEEDS REVIEW** - Verify database optimization
- [ ] `tests/config/database.test.mjs` - **NEEDS REVIEW** - Verify database configuration

---

### Integration Tests (2 files)

#### ✅ Passing Integration Tests
- [ ] `tests/integration/coming-soon-integration.test.mjs` - **NEEDS REVIEW** - Verify coming soon integration
- [ ] `tests/integration/maintenance-mode-integration.test.mjs` - **NEEDS REVIEW** - Verify maintenance integration

---

### Client-Side JavaScript Tests (8 files)

#### ✅ Passing JS Tests
- [ ] `tests/js/carnivals/carnival-edit.test.mjs` - **NEEDS REVIEW** - Verify carnival edit JS
- [ ] `tests/js/carnivals/carnival-players.test.mjs` - **NEEDS REVIEW** - Verify player management JS
- [ ] `tests/js/carnivals/carnival-show.test.mjs` - **NEEDS REVIEW** - Verify carnival display JS
- [ ] `tests/js/clubs/club-manage.test.mjs` - **NEEDS REVIEW** - Verify club management JS
- [ ] `tests/js/clubs/club-options.test.mjs` - **NEEDS REVIEW** - Verify club options JS
- [ ] `tests/js/clubs/club-players.test.mjs` - **NEEDS REVIEW** - Verify club players JS
- [ ] `tests/js/clubs/club-players-form.test.mjs` - **NEEDS REVIEW** - Verify player form JS
- [ ] `tests/js/clubs/club-sponsors.test.mjs` - **NEEDS REVIEW** - Verify club sponsors JS

---

## Refactoring Priorities

### 🔥 Critical Priority (Must Fix Immediately)
1. **clubPlayer.controller.test.mjs** (13 failures) - Core functionality tests
2. **galleryUpload.test.mjs** (58 failures) - Major middleware component
3. **hostingClubFeeExemption.test.mjs** (10 failures) - Business logic tests

### ⚠️ High Priority (Fix Soon)
4. **security.test.mjs** (2 failures) - Security-critical tests
5. **models/index.test.mjs** (1 failure) - Database relationship tests

### ℹ️ Medium Priority (Review & Improve)
6. All passing controller tests - Ensure comprehensive coverage
7. All passing middleware tests - Verify edge cases
8. All passing model tests - Ensure validation coverage

### ✅ Low Priority (Polish)
9. Client-side JavaScript tests - Ensure browser compatibility
10. Integration tests - Add more end-to-end scenarios

---

## Refactoring Standards

### Test Structure Standards
```javascript
describe('Feature/Component Name', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset mocks and state
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Specific Functionality', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Arrange: Set up test data and mocks
      
      // Act: Execute the function under test
      
      // Assert: Verify expected outcomes
    });
  });
});
```

### Mock Standards
- Use consistent mock factory functions
- All mocks must match actual implementation signatures
- Mock all external dependencies (models, services, etc.)
- Use vi.fn() for all function mocks
- Clear mocks between tests

### Assertion Standards
- Use specific matchers (toHaveBeenCalledWith, toEqual, etc.)
- Test both success and error paths
- Verify all side effects (flash messages, redirects, etc.)
- Check authorization and permissions
- Validate input sanitization

---

## Progress Tracking

### Current Statistics
- **Total Test Files**: 64
- **Total Tests**: 1169
- **Passing Tests**: 1078 (92.2%)
- **Failing Tests**: 91 (7.8%)
- **Files Needing Rewrite**: 5 (7.8%)
- **Files Needing Review**: 59 (92.2%)

### Completion Checklist
- [ ] Phase 1: Rewrite 5 critical failing test files (0/5 complete)
- [ ] Phase 2: Review and improve 59 passing test files (0/59 complete)
- [ ] Phase 3: Add missing test coverage for edge cases
- [ ] Phase 4: Document all test patterns and conventions
- [ ] Phase 5: Achieve 100% test pass rate
- [ ] Phase 6: Achieve 90%+ code coverage

---

## Notes
- **Last Updated**: 2025-01-09
- **Test Framework**: Vitest
- **Test Pattern**: BDD (Behavior-Driven Development)
- **Mock Library**: Vitest vi.mock()
- **Coverage Target**: 90%+ lines, branches, functions, statements