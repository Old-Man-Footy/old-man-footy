# Comprehensive Unit Testing Plan for 16 Missing Test Files

## Overview
This plan follows the existing Vitest testing patterns observed in the codebase, emphasizing **actual code execution** through proper mocking that tests real implementation without skipping logic.

## Testing Framework & Environment
- **Framework**: Vitest v3.2.4 with ES modules
- **Database**: SQLite with test-specific database
- **Mocking Strategy**: Selective mocking of external dependencies while preserving core logic
- **Patterns**: AAA (Arrange, Act, Assert) pattern consistent with existing tests

## Phase 1: Configuration & Utilities (Priority 1)

### 1. `tests/config/database-optimizer.test.mjs`
**Target**: `config/database-optimizer.mjs` (DatabaseOptimizer class)

**Key Methods to Test**:
- `createIndexes()` - Database index creation
- `analyzePerformance()` - Performance statistics gathering  
- `optimizeDatabase()` - VACUUM/ANALYZE operations
- `setupMonitoring()` - Query performance monitoring
- `performMaintenance()` - Scheduled maintenance tasks
- `backupDatabase()` - Database backup operations

**Mocking Strategy**:
```javascript
// Mock Sequelize connection, not the optimizer logic
vi.mock('../../config/database.mjs', () => ({
  sequelize: {
    query: vi.fn(),
    addHook: vi.fn(),
    // Keep real QueryTypes
  }
}));

// Mock file system operations
vi.mock('fs/promises', () => ({
  default: {
    copyFile: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
  }
}));
```

**Test Cases**:
- Index creation success/failure scenarios
- Performance analysis data structure validation
- Database optimization operation execution
- Monitoring setup and teardown
- Maintenance scheduling and execution
- Backup creation and error handling

### 2. `tests/config/constants.test.mjs`
**Target**: `config/constants.mjs`

**Test Focus**:
- Validate all constant values are defined
- Check UPLOAD_DIRECTORIES structure
- Verify environment-specific configurations
- Test constant immutability

### 3. `tests/utils/dateUtils.test.mjs`
**Target**: `utils/dateUtils.mjs`

**Test Focus**:
- Date parsing and formatting functions
- Excel date conversion utilities
- Timezone handling
- Invalid input validation

## Phase 2: Controllers (Priority 2)

### 4. `tests/controllers/admin.controller.test.mjs`
**Target**: `controllers/admin.controller.mjs`

**Mocking Pattern** (follows existing controller test patterns):
```javascript
// Mock models without skipping controller logic
vi.mock('../../models/User.mjs', () => ({
  default: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
    // Preserve actual method signatures
  }
}));

// Mock services that handle external operations
vi.mock('../../services/auditService.mjs', () => ({
  default: {
    logUserAction: vi.fn().mockResolvedValue(true),
  }
}));
```

### 5. `tests/controllers/auth.controller.test.mjs`
**Target**: `controllers/auth.controller.mjs`

**Key Areas**:
- Login/logout functionality
- Session management
- Password reset flows
- Registration processes
- CSRF protection

### 6. `tests/controllers/carnival.controller.test.mjs`
**Target**: `controllers/carnival.controller.mjs`

### 7. `tests/controllers/carnivalClub.controller.test.mjs`
**Target**: `controllers/carnivalClub.controller.mjs`

### 8. `tests/controllers/club.controller.test.mjs`  
**Target**: `controllers/club.controller.mjs`

### 9. `tests/controllers/clubPlayer.controller.test.mjs`
**Target**: `controllers/clubPlayer.controller.mjs`

### 10. `tests/controllers/main.controller.test.mjs`
**Target**: `controllers/main.controller.mjs`

## Phase 3: Services (Priority 3)

### 11. `tests/services/email/BaseEmailService.test.mjs`
**Target**: `services/email/BaseEmailService.mjs`

**Mocking Strategy**:
```javascript
// Mock nodemailer, preserve email service logic
vi.mock('nodemailer', () => ({
  createTransporter: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));
```

### 12. `tests/services/email/CarnivalEmailService.test.mjs`
**Target**: `services/email/CarnivalEmailService.mjs`

### 13. `tests/services/carouselImageService.test.mjs`
**Target**: `services/carouselImageService.mjs`

### 14. `tests/services/imageDisplayService.test.mjs`
**Target**: `services/imageDisplayService.mjs`

### 15. `tests/services/imageUploadService.test.mjs`
**Target**: `services/imageUploadService.mjs`

## Phase 4: Middleware (Priority 4)

### 16. `tests/middleware/security.test.mjs`
**Target**: `middleware/security.mjs`

**Test Focus**:
- Helmet configuration validation
- Rate limiting functionality
- CORS policy enforcement
- Security header validation

## Implementation Guidelines

### Mocking Principles (Critical for User Requirements)
1. **Mock External Dependencies Only**: Database connections, file systems, external APIs
2. **Preserve Core Logic**: Never mock the actual method being tested
3. **Test Real Code Paths**: Ensure all branches and conditions execute
4. **Validate Side Effects**: Assert on actual function calls, not just return values

### Test Structure Template
```javascript
/**
 * @file [filename].test.mjs
 * @description Unit tests for [target file]
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import [TargetClass] from '../../[path-to-target]';

// Strategic mocking - external dependencies only
vi.mock('../../config/database.mjs', () => ({
  sequelize: {
    query: vi.fn(),
    // ... mock external operations
  }
}));

describe('[TargetClass] Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('[methodName]', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Arrange
      const mockData = { /* test data */ };
      
      // Act
      const result = await TargetClass.methodName(mockData);
      
      // Assert
      expect(result).toBeDefined();
      expect(/* verify actual logic executed */);
    });
  });
});
```

### Coverage Requirements
- **Line Coverage**: 70%+
- **Branch Coverage**: 70%+ 
- **Function Coverage**: 70%+
- **Statement Coverage**: 70%+

### Error Handling Tests
Each test file must include:
- Happy path scenarios
- Error condition handling
- Input validation
- Edge cases
- Async operation failures

## Testing Data Strategy

### Mock Data Patterns
```javascript
// Follow existing patterns from club.model.test.mjs
function createMockUser(overrides = {}) {
  return {
    id: 1,
    email: 'test@example.com',
    isActive: true,
    ...overrides
  };
}

function createMockCarnival(overrides = {}) {
  return {
    id: 1,
    title: 'Test Carnival',
    subtitle: 'Test Subtitle',
    date: new Date('2024-06-15'),
    isActive: true,
    subtitle: 'Test Subtitle', // Address current test failures
    ...overrides
  };
}
```

## Priority Implementation Order

1. **Start with `database-optimizer.test.mjs`** - Foundation for other tests
2. **Config/Utils tests** - Core functionality validation  
3. **Controller tests** - API endpoint validation
4. **Service tests** - Business logic validation
5. **Middleware tests** - Security and request handling

## Success Criteria

- All 16 test files created and passing
- Existing test suite continues to pass (772 tests)
- Coverage thresholds maintained (70%+)
- No mocked code skips actual implementation
- Tests follow established AAA patterns
- Proper error handling and edge case coverage

This plan ensures comprehensive coverage while maintaining the integrity of actual code execution through strategic mocking of external dependencies only.
