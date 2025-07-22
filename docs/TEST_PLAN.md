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
  - [ ] `validation.mjs`
  - [ ] `comingSoon.mjs`
- [ ] Implement tests for missing middleware functionality
- [ ] Ensure all middleware tests pass

### Phase 6: **Models**
- [x] Identify and document missing model tests
  - [ ] `AuditLog.mjs`
  - [ ] `EmailSubscription.mjs`
  - [ ] `Index.mjs`
  - [ ] `Sponsor.mjs`
- [ ] Implement tests for missing models
- [ ] Ensure all model tests pass

### Phase 7: Cleanup & Optimization ⏳ PENDING
- [x] Remove Jest dependencies
- [ ] Update Docker configurations
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Final verification

## Next Steps
- Complete Phase 3 tests
- Begin Phase 4 and Phase 5 tests
- Perform Phase 6 cleanup and optimization
  

*Last updated: after adding imageService tests*