# **Unit Test Plan**

This document outlines the comprehensive unit testing strategy for the Old Man Footy application, following strict MVC architecture principles and security-first development practices.

## **Testing Priorities & Execution Order**

Unit tests MUST be executed in the following order to ensure proper dependency validation and system integrity:

### **Phase 1: Core Infrastructure & Security**
1. **Authentication & Authorization** (Critical Security Layer)
2. **Database Models** (Data Layer Foundation)
3. **Services** (Business Logic Layer)
4. **Middleware** (Request Processing Layer)

### **Phase 2: Application Logic**
5. **Controllers** (Request Orchestration)
6. **Integration Tests** (Cross-layer Validation)

---

## **Phase 1: Core Infrastructure & Security**

### **1. Authentication & Authorization (Priority 1)**

#### **1.1 Authentication Controller Tests**
**File:** `auth.controller.test.mjs` ❌ **[ ] MISSING - HIGH PRIORITY**

**Required Test Coverage:**
- **Login Authentication**
  - [ ] Valid credentials → successful login
  - [ ] Invalid email → authentication failure
  - [ ] Invalid password → authentication failure
  - [ ] Inactive user → authentication blocked
  - [ ] Input sanitization (SQL injection prevention)
  - [ ] Session creation and management
  - [ ] Rate limiting protection

- **User Registration**
  - [ ] Valid registration data → user creation
  - [ ] Duplicate email → registration blocked
  - [ ] Invalid email format → validation error
  - [ ] Weak password → validation error
  - [ ] Input sanitization and validation
  - [ ] Password hashing verification

- **Session Management**
  - [ ] Logout → session destruction
  - [ ] Session persistence across requests
  - [ ] Session expiration handling

#### **1.2 Authentication Middleware Tests**
**File:** `auth.middleware.test.mjs` ❌ **[ ] MISSING - HIGH PRIORITY**

**Required Test Coverage:**
- **Session Authentication**
  - [ ] `ensureAuthenticated()` → authenticated user passes
  - [ ] `ensureAuthenticated()` → unauthenticated user redirected
  - [ ] `ensureGuest()` → unauthenticated user passes
  - [ ] `ensureGuest()` → authenticated user redirected

- **Role-Based Authorization**
  - [ ] `ensurePrimaryDelegate()` → authorized user passes
  - [ ] `ensurePrimaryDelegate()` → unauthorized user blocked
  - [ ] `ensureAdmin()` → admin user passes
  - [ ] `ensureAdmin()` → non-admin user blocked

#### **1.3 User Model Tests**
**File:** `User.model.test.mjs` ✅ **[x] COMPLETED - HIGH PRIORITY**

**Required Test Coverage:**
- **Password Security**
  - [x] Password hashing on creation
  - [x] Password comparison method
  - [x] Password strength validation
  - [x] Salt generation uniqueness

- **User Validation**
  - [x] Email format validation
  - [x] Phone number format validation
  - [x] Required field validation
  - [x] Unique email constraint

- **User Status Management**
  - [x] Active/inactive status handling
  - [x] Last login timestamp updates
  - [x] Account lockout functionality

---

## **Phase 2: Database Models (Data Layer)**

### **2. Existing Model Tests (✅ IMPLEMENTED)**

The following model tests are already implemented and provide solid coverage:

#### **2.1 Core Entity Models**
- [x] **AuditLog.model.test.mjs** - Audit logging functionality
- [x] **Club.model.test.mjs** - Club entity validation and relationships
- [x] **ClubAlternateName.model.test.mjs** - Club name variations
- [x] **ClubPlayer.model.test.mjs** - Player registration and validation
- [x] **ClubSponsor.model.test.mjs** - Sponsorship relationship management

#### **2.2 Carnival Management Models**
- [x] **Carnival.model.test.mjs** - Tournament creation and validation
- [x] **CarnivalClub.model.test.mjs** - Club participation in carnivals
- [x] **CarnivalClubPlayer.model.test.mjs** - Player participation tracking
- [x] **CarnivalSponsor.model.test.mjs** - Carnival sponsorship management

### **3. Missing Model Tests (❌ REQUIRED)**

#### **3.1 User Model** ✅ **COMPLETED - HIGH PRIORITY**
**File:** `User.model.test.mjs` 
- [x] Password hashing and validation
- [x] Email uniqueness and format validation  
- [x] Role and permission management
- [x] Account status and security features

#### **3.2 Session Management Models** ❌ **MEDIUM PRIORITY**
**File:** `Session.model.test.mjs` (if applicable)
- [ ] Session storage and retrieval
- [ ] Session expiration handling
- [ ] Security token management

---

## **Phase 3: Services (Business Logic Layer)**

### **3.1 Existing Service Tests (✅ IMPLEMENTED)**
- [x] **auditService.test.mjs** - Comprehensive audit logging
- [x] **mySidelineScraperService.integration.test.mjs** - External API integration

### **3.2 Missing Service Tests (❌ REQUIRED)**

#### **3.2.1 Authentication Service** ❌ **HIGH PRIORITY**
**File:** `authService.test.mjs`
- [ ] Login attempt logging and rate limiting
- [ ] Password reset token generation and validation
- [ ] Account lockout and unlocking logic
- [ ] Session management and cleanup

#### **3.2.2 Email Service** ❌ **MEDIUM PRIORITY**
**File:** `emailService.test.mjs`
- [ ] Email sending functionality
- [ ] Template rendering and validation
- [ ] Delivery confirmation handling
- [ ] Error handling and retry logic

#### **3.2.3 Validation Service** ❌ **MEDIUM PRIORITY**
**File:** `validationService.test.mjs`
- [ ] Input sanitization methods
- [ ] Custom validation rules
- [ ] Security validation (XSS, SQL injection prevention)

---

## **Phase 4: Middleware (Request Processing Layer)**

### **4.1 Existing Middleware Tests (✅ IMPLEMENTED)**
- [x] **maintenance.middleware.test.mjs** - Maintenance mode handling
- [x] **comingSoon.middleware.test.mjs** - Coming soon mode functionality

### **4.2 Missing Middleware Tests (❌ REQUIRED)**

#### **4.2.1 Security Middleware** ❌ **HIGH PRIORITY**
**File:** `security.middleware.test.mjs`
- [ ] Rate limiting implementation
- [ ] CSRF protection validation
- [ ] XSS prevention headers
- [ ] Input sanitization middleware

#### **4.2.2 Error Handling Middleware** ❌ **HIGH PRIORITY**
**File:** `errorHandler.middleware.test.mjs`
- [ ] Centralized error handling
- [ ] Error response formatting
- [ ] Security error information filtering
- [ ] Logging and audit trail integration

---

## **Phase 5: Controllers (Request Orchestration)**

### **5.1 Existing Controller Tests (✅ IMPLEMENTED)**
- [x] **carnivalSponsor.controller.test.mjs** - Sponsorship management
- [x] **comingSoon.controller.test.mjs** - Coming soon page functionality
- [x] **maintenance.controller.test.mjs** - Maintenance mode management

### **5.2 Missing Controller Tests (❌ REQUIRED)**

#### **5.2.1 Core Controllers** ❌ **HIGH PRIORITY**
- [ ] **auth.controller.test.mjs** - Authentication and user management
- [ ] **main.controller.test.mjs** - Main application routes
- [ ] **admin.controller.test.mjs** - Administrative functionality

#### **5.2.2 Business Logic Controllers** ❌ **MEDIUM PRIORITY**
- [ ] **club.controller.test.mjs** - Club management operations
- [ ] **carnival.controller.test.mjs** - Tournament management
- [ ] **clubPlayer.controller.test.mjs** - Player management
- [ ] **sponsor.controller.test.mjs** - Sponsorship operations

---

## **Phase 6: Integration Tests**

### **6.1 Existing Integration Tests (✅ IMPLEMENTED)**
- [x] **coming-soon-integration.test.mjs** - Coming soon mode integration
- [x] **route-redirects.test.mjs** - Route behavior validation
- [x] **enhanced-email-validation.test.mjs** - Email validation integration
- [x] **subscription-bot-protection.test.mjs** - Security protection testing

### **6.2 Missing Integration Tests (❌ REQUIRED)**

#### **6.2.1 Authentication Integration** ❌ **HIGH PRIORITY**
**File:** `auth-integration.test.mjs`
- [ ] Complete login/logout flow
- [ ] Session persistence across requests
- [ ] Role-based access control validation
- [ ] Security policy enforcement

#### **6.2.2 Database Integration** ❌ **MEDIUM PRIORITY**
**File:** `database-integration.test.mjs`
- [ ] Model relationship validation
- [ ] Transaction handling
- [ ] Data integrity constraints
- [ ] Migration compatibility

---

## **Testing Standards & Requirements**

### **Security Testing Requirements**
All authentication and authorization tests MUST include:
- [ ] Input sanitization validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting validation
- [ ] Session security verification

### **Code Coverage Requirements**
- **Models:** 95% coverage minimum
- **Controllers:** 90% coverage minimum
- **Services:** 95% coverage minimum
- **Middleware:** 90% coverage minimum
- **Authentication:** 100% coverage required

### **Test Environment Setup**
- **Database:** Use `test-old-man-footy.db` for all unit tests
- **Isolation:** Each test must be independent and properly isolated
- **Mocking:** External dependencies must be mocked using Jest
- **Setup/Teardown:** Proper database state management between tests

---

## **Immediate Action Items**

### **Critical Priority (Security & Foundation)**
1. [x] Create `User.model.test.mjs` - User model with password security ✅ **COMPLETED**
2. [x] Create `auth.controller.test.mjs` - Authentication controller ✅ **COMPLETED**
3. [x] Create `auth.middleware.test.mjs` - Authentication middleware ✅ **COMPLETED**
4. [ ] Create `authService.test.mjs` - Authentication service layer

### **High Priority (Core Functionality)**
5. [ ] Create `security.middleware.test.mjs` - Security middleware
6. [ ] Create `errorHandler.middleware.test.mjs` - Error handling
7. [ ] Create `main.controller.test.mjs` - Main application routes
8. [ ] Create `admin.controller.test.mjs` - Administrative functions

### **Medium Priority (Business Logic)**
9. [ ] Create remaining controller tests for club, carnival, and player management
10. [ ] Create service layer tests for email and validation services
11. [ ] Create additional integration tests for complex workflows

---

## **Test Execution Commands**

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- "auth.controller.test.mjs"

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode during development
npm test -- --watch

# Run only authentication-related tests
npm test -- --testPathPattern="auth"
```

---

## **Success Criteria**

### **Phase 1 Complete When:**
- [ ] All authentication tests pass with 100% coverage
- [ ] User model security features fully validated
- [ ] Session management thoroughly tested
- [ ] Security middleware protection verified

### **Full Plan Complete When:**
- [ ] All critical and high priority tests implemented
- [ ] Code coverage targets achieved across all modules
- [ ] Security testing requirements satisfied
- [ ] Integration tests validate cross-module functionality
- [ ] Test suite runs reliably in CI/CD pipeline

---

*This unit test plan follows the project's strict MVC architecture, security-first principles, and TDD methodology. All tests must be implemented following the established patterns and security requirements outlined in the project's coding instructions.*