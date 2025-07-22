# Old Man Footy Test Plan - Vitest Migration

## Migration & Test Status

### Phase 1: Setup & Migration ✅
- [x] Vitest installed, config updated
- [x] All test files migrated from Jest

### Phase 2: Core Test Coverage ✅
- [x] Models tested
- [x] Services tested
- [x] Controllers tested
- [x] Middleware tested
- [x] Integration tests migrated

### Phase 3: Missing/Additional Tests 🚧
- [x] Club Controller
- [x] Main Controller
- [x] Carnival Controller
- [x] Admin Controller
- [x] Sponsor Controller
- [x] Club Player Controller
- [x] Carnival Club Controller
- [x] Club Sponsor Controller
- [x] Carnival Sponsor Controller
- [x] Coming Soon Controller
- [x] Maintenance Controller
- [x] User Guide Controller
- [x] Auth Email Services
- [x] Contact Email Services
- [x] Carnival Email Services
- [x] Invitation Email Services
- [x] Security Email Services
- [x] Data Processing Services

### Phase 4: **Service Layer Gaps**
- [x] Identify and document missing service layer tests
  - [x] `imageNamingService.mjs`
  - [x] `carouselImageService.mjs`
  - [x] `mySidelineEventParserService.mjs`
  - [x] `mySidelineIntegrationService.mjs`
  - [x] `mySidelineLogoDownloadService.mjs`
  - [x] `sponsorSortingService.mjs`
- [x] Implement tests for service layer functionality
- [x] Ensure all service layer tests pass

### Phase 5 **Middleware & Utility Gaps**
- [x] Identify and document missing middleware tests
  - [x] `asyncHandler.mjs`
  - [x] `flash.mjs`
  - [x] `upload.mjs`
  - [x] `validation.mjs`
  - [x] `comingSoon.mjs`
- [x] Implement tests for missing middleware functionality
- [x] Ensure all middleware tests pass

### Phase 6: **Models**
- [x] Identify and document missing model tests
  - [x] `AuditLog.mjs`
  - [x] `EmailSubscription.mjs`
  - [x] `Index.mjs`
  - [x] `Sponsor.mjs`
- [x] Implement tests for missing models
- [x] Ensure all model tests pass

### Phase 7: Cleanup & Optimization ⏳ PENDING
- [x] Remove Jest dependencies
- [x] Ensure Docker configurations are complete and accurate
- [ ] Update documentation, including README and `USER_GUIDE_DELEGATES.md`
- [ ] Performance optimization
- [ ] Final verification


*Last updated: 22 July 2025*