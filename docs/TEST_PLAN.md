# Old Man Footy Test Plan - Vitest Migration

## Migration & Test Status

### Phase 1: Setup & Migration ✅
- [x] Vitest installed, config updated
- [x] All test files migrated from Jest

### Phase 2: Core Test Coverage ✅
- [x] Models tested
- [x] Services tested
- [x] Controllers tested
- [x] Middleware tested -- Needs review
- [x] Integration tests migrated -- Needs review

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
- [ ] Invitation Email Services
- [ ] Security Email Services
- [ ] Data Processing Services
- [ ] Middleware/Utility Gaps

## Failing Tests, Need review
- [x] CarnivalEmailService.test.mjs
- [ ] auth.middleware.test.mjs
- [ ] capture-mysideline-data.test.mjs

### Phase 4: **Service Layer Gaps**
- [ ] Identify and document missing service layer tests HERE
- [ ] Implement tests for service layer functionality
- [ ] Ensure all service layer tests pass

### Phase 5 **Middleware & Utility Gaps**
- [ ] Identify and document missing middleware tests HERE
- [ ] Implement tests for middleware functionality
- [ ] Ensure all middleware tests pass

### Phase 6: Cleanup & Optimization ⏳ PENDING
- [x] Remove Jest dependencies
- [ ] Update Docker configurations
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Final verification

## Next Steps
- Complete Phase 3 tests
- Begin Phase 4 and Phase 5 tests
- Perform Phase 6 cleanup and optimization
  

*Last updated: after coming soon controller tests*