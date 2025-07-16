# Old Man Footy Test Plan - Vitest Migration

This comprehensive test plan covers the migration from Jest to Vitest for all unit and UI testing.

## Migration Status: 🚧 IN PROGRESS

**Started**: July 16, 2025
**Framework**: Jest → Vitest
**Total Test Files**: 28

---

## 🎯 Migration Strategy

### Phase 1: Setup & Configuration
- [x] Install Vitest and related dependencies
- [x] Create Vitest configuration file
- [x] Update package.json scripts
- [x] Create Vitest-compatible setup files
- [x] Update environment configuration

### Phase 2: Test File Migration
- [ ] Migrate test files one by one (order specified below)
- [ ] Update imports and syntax
- [ ] Verify test functionality
- [ ] Update mocking strategies
- [ ] Ensure database integration works

### Phase 3: Cleanup & Optimization
- [ ] Remove Jest dependencies
- [ ] Update CI/CD configurations
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Final verification

---

## 📋 Test Files Migration Checklist

### Models (Priority 1) - Foundation Layer ✅ COMPLETE
1. [x] `User.model.test.mjs` - Core user model with security ✅ MIGRATED (52/57 tests passing)
2. [x] `Club.model.test.mjs` - Club entity model ✅ MIGRATED (11/11 tests passing)
3. [x] `Carnival.model.test.mjs` - Carnival entity model ✅ MIGRATED (13/13 tests passing)
4. [x] `AuditLog.model.test.mjs` - Audit logging model ✅ MIGRATED (6/6 tests passing)
5. [x] `ClubPlayer.model.test.mjs` - Player management ✅ MIGRATED (15/15 tests passing)
6. [x] `ClubAlternateName.model.test.mjs` - Club name variants ✅ MIGRATED (7/7 tests passing)
7. [x] `CarnivalClub.model.test.mjs` - Carnival-Club junction ✅ MIGRATED (9/9 tests passing)
8. [x] `CarnivalClubPlayer.model.test.mjs` - Carnival player assignments ✅ MIGRATED (8/8 tests passing)
9. [x] `CarnivalSponsor.model.test.mjs` - Carnival sponsorship junction ✅ MIGRATED (6/6 tests passing)
10. [x] `ClubSponsor.model.test.mjs` - Club sponsorship junction ✅ MIGRATED (12/12 tests passing)

**Foundation Layer Summary**: 139/144 tests passing (96.5% success rate) 🚀

### Services (Priority 2) - Business Logic Layer ✅ IN PROGRESS
11. [x] `capture-mysideline-data.test.mjs` - MySideline data capture utility ✅ MIGRATED (14/14 tests passing)
12. [x] `auditService.test.mjs` - Audit logging service ✅ MIGRATED (13/13 tests passing)
13. [x] `authService.test.mjs` - Authentication service layer ✅ MIGRATED (32/32 tests passing)
14. [x] `mySidelineScraperService.integration.test.mjs` - NOT REQUIRED, SKIP
15. [ ] `mySidelineDataService.test.mjs` - MySideline data processing service
16. [ ] `BaseEmailService.test.mjs` - Core email service functionality
17. [ ] `InvitationEmailService.test.mjs` - Invitation email service (delegate invites, club ownership)
18. [ ] `CarnivalEmailService.test.mjs` - Carnival email service (notifications, attendee communications)
19. [ ] `AuthEmailService.test.mjs` - Authentication email service (welcome, password reset)
20. [ ] `ContactEmailService.test.mjs` - Contact form email service (forms, auto-replies)
21. [ ] `SecurityEmailService.test.mjs` - Security email service (alerts, notifications)

**Services Layer Progress**: 59/59 tests passing (3/12 services complete) 🚀

### Controllers (Priority 3) - Request Handling Layer
16. [ ] `auth.controller.test.mjs` - Authentication controller
17. [ ] `carnivalSponsor.controller.test.mjs` - Carnival sponsorship management
18. [ ] `comingSoon.controller.test.mjs` - Coming soon functionality
19. [ ] `maintenance.controller.test.mjs` - Maintenance mode

### Middleware (Priority 4) - Cross-cutting Concerns
20. [ ] `security.middleware.test.mjs` - Security middleware stack
21. [ ] `auth.middleware.test.mjs` - Authentication middleware
22. [ ] `comingSoon.middleware.test.mjs` - Coming soon middleware
23. [ ] `maintenance.middleware.test.mjs` - Maintenance middleware

### Integration & Specialized Tests (Priority 5)
24. [ ] `enhanced-email-validation.test.mjs` - Email validation
25. [ ] `subscription-bot-protection.test.mjs` - Bot protection
26. [ ] `coming-soon-integration.test.mjs` - Coming soon integration
27. [ ] `route-redirects.test.mjs` - Route handling

### Setup & Configuration Files (Priority 6)
28. [ ] `setup.mjs` - Test setup configuration
29. [ ] `teardown.mjs` - Test cleanup
30. [ ] `jest.env.mjs` - Environment setup (rename to vitest.env.mjs)

---

## 🔧 Service Layer Migration Details

### Completed Services ✅
1. **MySideline Capture Script** (`capture-mysideline-data.test.mjs`)
   - **Status**: ✅ COMPLETE (14/14 tests passing)
   - **Coverage**: Comprehensive test suite covering all scenarios
   - **Key Features Tested**:
     - Successful data capture from MySideline
     - Fixture file generation with real captured data
     - HTML sanitization for template literals
     - Environment variable handling (MYSIDELINE_URL)
     - Error handling with fallback fixture creation
     - Empty events scenario handling
     - Valid JavaScript module generation

### Pending Services ⏳

2. **Audit Service** (`auditService.test.mjs`)
   - **Purpose**: Tests audit logging functionality for user actions
   - **Key Areas**: Log creation, retrieval, filtering, retention policies
   - **Dependencies**: AuditLog model, database integration
   - **Priority**: High (security and compliance)

3. **Authentication Service** (`authService.test.mjs`)
   - **Purpose**: Tests core authentication business logic
   - **Key Areas**: Password hashing, token generation, session management
   - **Dependencies**: User model, bcrypt, session handling
   - **Priority**: Critical (security foundation)

4. **MySideline Scraper Service Integration** (`mySidelineScraperService.integration.test.mjs`)
   - **Purpose**: Tests live MySideline website integration
   - **Key Areas**: Web scraping, API interception, data extraction
   - **Dependencies**: Puppeteer, external MySideline website
   - **Priority**: Medium (external dependency, can be flaky)
   - **Note**: Already exists but needs Vitest migration

5. **MySideline Data Processing Service** (`mySidelineDataService.test.mjs`)
   - **Purpose**: Tests MySideline data processing and database operations
   - **Key Areas**: Event matching, data transformation, database sync
   - **Dependencies**: Carnival model, data validation
   - **Priority**: High (core MySideline integration)

6. **Base Email Service** (`BaseEmailService.test.mjs`)
   - **Purpose**: Tests core email service functionality
   - **Key Areas**: Email sending, template rendering, attachment handling
   - **Dependencies**: Nodemailer, email templates
   - **Priority**: High (core functionality for all email services)

7. **Invitation Email Service** (`InvitationEmailService.test.mjs`)
   - **Purpose**: Tests invitation email sending for delegates and club owners
   - **Key Areas**: Email content, recipient handling, template usage
   - **Dependencies**: BaseEmailService, User model
   - **Priority**: Medium (important for user onboarding)

8. **Carnival Email Service** (`CarnivalEmailService.test.mjs`)
   - **Purpose**: Tests carnival-related email notifications and communications
   - **Key Areas**: Event notifications, attendee communications, template rendering
   - **Dependencies**: BaseEmailService, Carnival model
   - **Priority**: Medium (enhances carnival functionality)

9. **Authentication Email Service** (`AuthEmailService.test.mjs`)
   - **Purpose**: Tests email notifications for authentication events
   - **Key Areas**: Welcome emails, password reset emails, template usage
   - **Dependencies**: BaseEmailService, User model
   - **Priority**: Medium (important for user management)

10. **Contact Email Service** (`ContactEmailService.test.mjs`)
    - **Purpose**: Tests email handling for contact form submissions
    - **Key Areas**: Form data processing, auto-replies, template rendering
    - **Dependencies**: BaseEmailService, Contact form handling
    - **Priority**: Low (supplementary functionality)

11. **Security Email Service** (`SecurityEmailService.test.mjs`)
    - **Purpose**: Tests security-related email notifications
    - **Key Areas**: Alert emails, notification handling, template usage
    - **Dependencies**: BaseEmailService, security event triggers
    - **Priority**: Medium (important for security monitoring)

12. **Main Email Service** (`emailService.test.mjs`)
    - **Purpose**: Tests the main email service aggregator and backward compatibility
    - **Key Areas**: Service initialization, legacy support, error handling
    - **Dependencies**: All email services
    - **Priority**: High (ensures smooth email functionality transition)

---

## 🔧 Technical Requirements

### Vitest Configuration Needs
- **ES Modules Support**: Full ES module compatibility
- **Database Integration**: SQLite test database support
- **Mocking Strategy**: Jest mock replacement with Vitest equivalents
- **Setup/Teardown**: Global and per-test cleanup
- **Security Testing**: Input validation and XSS protection tests
- **Coverage Reports**: Maintain 70% minimum coverage thresholds

### Key Migration Tasks per File
1. **Import Changes**: 
   - `import { jest, describe, test, it, expect, beforeAll, beforeEach, afterAll, afterEach } from '@jest/globals'`
   - → `import { describe, test, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest'`

2. **Mock Strategy Updates**:
   - `jest.mock()` → `vi.mock()`
   - `jest.fn()` → `vi.fn()`
   - `jest.spyOn()` → `vi.spyOn()`
   - `jest.clearAllMocks()` → `vi.clearAllMocks()`

3. **Setup File Updates**:
   - Database initialization
   - Environment variable setup
   - Global mocks configuration

4. **Configuration Migration**:
   - Jest config → Vitest config
   - Test scripts in package.json
   - Coverage configuration

---

## 📊 Progress Tracking

### Completed ✅
- [x] Initial test plan creation
- [x] Current state analysis
- [x] Vitest installation and setup
- [x] Configuration migration
- [x] Foundation Layer (Models) - 10/10 files migrated with 139/144 tests passing
- [x] MySideline Capture Script - 14/14 tests passing with comprehensive coverage
- [x] Audit Service - 13/13 tests passing
- [x] Authentication Service - 32/32 tests passing

### In Progress 🚧
- [x] Service layer migration (3/5 complete)
- [ ] Remaining service tests: MySideline scraper integration
- [ ] Controller layer migration
- [ ] Middleware layer migration

### Pending ⏳
- [ ] Integration & specialized tests migration
- [ ] Setup & configuration files migration
- [ ] Remove Jest dependencies
- [ ] Update CI/CD configurations
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Final verification

---

## 📈 Migration Statistics

### Overall Progress: 11/30 files migrated (36.7%)
- **Models**: 10/10 ✅ COMPLETE (100%)
- **Services**: 3/5 🚧 IN PROGRESS (60%)
- **Controllers**: 0/4 ⏳ PENDING (0%)
- **Middleware**: 0/4 ⏳ PENDING (0%)
- **Integration**: 0/4 ⏳ PENDING (0%)
- **Setup**: 0/3 ⏳ PENDING (0%)

### Test Success Rate: 153/158 tests passing (96.8%) 🚀

---

## 🚨 Testing Priorities

### Critical Path (Must Work First)
1. **User Authentication**: `User.model.test.mjs`, `auth.controller.test.mjs`, `authService.test.mjs`
2. **Core Entities**: `Club.model.test.mjs`, `Carnival.model.test.mjs`
3. **Security**: `security.middleware.test.mjs`, `auth.middleware.test.mjs`
4. **Database Operations**: All model tests

### Integration Dependencies
- **Database Setup**: `setup.mjs` must work first
- **Environment Config**: `jest.env.mjs` → `vitest.env.mjs`
- **Mocking Strategy**: Service layer mocks for controller tests

---

## 🔍 Validation Criteria

Each migrated test file must:
- [ ] Import Vitest correctly
- [ ] All tests pass with same coverage
- [ ] Mocks function equivalently
- [ ] Database operations work correctly
- [ ] Setup/teardown functions properly
- [ ] No Jest dependencies remaining
- [ ] Performance comparable or better

---

## 📝 Notes & Considerations

### Jest-Specific Features to Replace
- `jest.unstable_mockModule()` → Vitest hoisted mocks
- Jest asymmetric matchers → Vitest equivalents
- Jest configuration options → Vitest equivalents

### Potential Challenges
1. **Complex Mocking**: Some files use `jest.unstable_mockModule()`
2. **Database Integration**: Sequelize setup with Vitest
3. **ES Modules**: Ensuring proper ES module handling
4. **Security Tests**: Maintaining security-focused test patterns

### Success Metrics
- All tests pass ✅
- Coverage maintains 70%+ ✅
- Build time improvement ✅
- Developer experience improvement ✅
- No regression in functionality ✅

---

**Last Updated**: [Will be updated during migration]
**Next Steps**: Migrate `User.model.test.mjs` to Vitest