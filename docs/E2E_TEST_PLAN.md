# End-to-End Test Plan - Old Man Footy Platform

## Overview

This document outlines a comprehensive end-to-end testing strategy for the Old Man Footy platform using Playwright. The plan covers all major application features, user workflows, and system integrations to ensure complete functionality and security compliance.

## Test Environment Setup

- **Framework**: Playwright with JavaScript
- **Base URL**: http://localhost:3050
- **Test Database**: test-old-man-footy.db (isolated from production)
- **Browsers**: Chrome (primary), Firefox, Safari, Mobile Chrome/Safari
- **Authentication**: Test users created in global setup

## Test Categories

### 1. Authentication & Authorization ✅ COMPLETED

**File**: `tests/e2e/authentication.spec.js`

- [x] Login with valid admin credentials
- [x] Login with valid delegate credentials  
- [x] Login error handling for invalid credentials
- [x] Logout functionality
- [x] Session management and persistence after refresh
- [x] Redirect to login for protected routes
- [x] Role-based access control (admin vs delegate routes)

### 2. Homepage & Navigation ✅ COMPLETED

**Files**: 
- `tests/e2e/homepage.spec.js`
- `tests/e2e/homepage-simple.spec.js`

- [x] Homepage loads successfully
- [x] Navigation menu functionality
- [x] Public content accessibility
- [x] Statistics display
- [x] Carousel functionality

### 3. Newsletter Subscription ✅ COMPLETED

**File**: `tests/e2e/newsletter-subscription.spec.js`

- [x] Valid email subscription with state selection
- [x] Invalid email format error handling
- [x] Required state selection validation
- [x] Success message display
- [x] Error message display

### 4. Carnival Management ✅ COMPLETED

**File**: `tests/e2e/carnival-management.spec.js`

- [x] Display carnivals list page
- [x] Create new carnival with validation
- [x] Form validation for required fields
- [x] Edit existing carnival
- [x] Delete carnival with confirmation
- [x] Filter carnivals by state
- [x] Search carnivals by title
- [x] Display carnival details page

### 5. Advanced Scenarios ✅ COMPLETED

**File**: `tests/e2e/advanced-scenarios.spec.js`

- [x] Cross-browser compatibility testing
- [x] JavaScript interactions
- [x] Mobile responsiveness
- [x] Touch interactions
- [x] Performance testing (page load times)
- [x] Accessibility testing (basic structure)
- [x] Network failure handling
- [x] Error message display
- [x] 404 page handling
- [x] Security testing (unauthorized access prevention)

## Remaining Test Areas to Implement

### 6. User Account Management 🚧 TODO - **PRIORITY 1** 
*Must complete before club management tests*

**Proposed File**: `tests/e2e/user-account.spec.js`

#### Profile Management
- [ ] View user dashboard
- [ ] Update profile information (name, email, phone)
- [ ] Profile validation and error handling

#### Registration & Invitations
- [ ] User registration form validation
- [ ] Registration with valid data
- [ ] Registration error handling
- [ ] Email format validation
- [ ] Password strength validation
- [ ] Invitation acceptance workflow
- [ ] Password reset functionality

**Dependencies**: Authentication (✅ completed)
**Required for**: Club Management, Club Player Management

### 7. Club Management 🚧 TODO - **PRIORITY 2**
*Depends on User Account Management*

**Proposed File**: `tests/e2e/club-management.spec.js`

#### Public Club Features (Test First)
- [ ] Display clubs list page with search and filtering
- [ ] Filter clubs by state
- [ ] Search clubs by name
- [ ] Display individual club profile page
- [ ] View club carnivals and attendances
- [ ] View club sponsors
- [ ] View club delegates

#### Authenticated Club Management (Test After Public)
- [ ] Access club management dashboard (requires authentication)
- [ ] Create new club (for users without clubs)
- [ ] Join existing club functionality
- [ ] Update club profile information
- [ ] Upload and manage club images/logos
- [ ] Club visibility settings
- [ ] Leave club functionality
- [ ] Transfer club ownership

#### Advanced Club Features
- [ ] Manage club sponsors
- [ ] Add/edit/delete alternate names

**Dependencies**: Authentication (✅), User Account Management (TODO)
**Required for**: Club Player Management, Carnival-Club Registration

### 8. Club Player Management 🚧 TODO - **PRIORITY 3**
*Depends on Club Management*

**Proposed File**: `tests/e2e/club-players.spec.js`

#### Player Management for Delegates
- [ ] View club players list (requires club association)
- [ ] Add new player to club
- [ ] Edit existing player information
- [ ] Delete/deactivate player
- [ ] Player search and filtering
- [ ] Validate player data fields

#### CSV Operations
- [ ] Download CSV template
- [ ] CSV import functionality
- [ ] CSV validation and error handling

**Dependencies**: Authentication (✅), User Account Management (TODO), Club Management (TODO)
**Required for**: Carnival-Club Registration

### 9. Contact & Communication 🚧 TODO - **PRIORITY 4**
*Independent - can be tested early*

**Proposed File**: `tests/e2e/contact-communication.spec.js`

#### Contact Forms
- [ ] Contact form submission
- [ ] Contact form validation
- [ ] Newsletter signup from contact page
- [ ] Email delivery confirmation

#### About Page
- [ ] About page loads successfully
- [ ] Links and resources work correctly
- [ ] User guide access

**Dependencies**: Homepage (✅ completed)
**Required for**: None (independent)

### 10. Sponsor Management 🚧 TODO - **PRIORITY 5**
*Independent - can be tested after authentication*

**Proposed File**: `tests/e2e/sponsor-management.spec.js`

#### Public Sponsor Features
- [ ] Display sponsors list page
- [ ] Filter sponsors by business type and state
- [ ] Search sponsors by name
- [ ] Display individual sponsor profile

#### Admin Sponsor Management
- [ ] Create new sponsor (admin only)
- [ ] Edit sponsor information (admin only)
- [ ] Upload sponsor logos (admin only)
- [ ] Manage sponsor visibility (admin only)
- [ ] Delete/deactivate sponsor (admin only)
- [ ] Sponsor form validation

**Dependencies**: Authentication (✅ completed)
**Required for**: Club-Sponsor relationships, Carnival-Sponsor relationships

### 11. Carnival-Club Registration 🚧 TODO - **PRIORITY 6**
*Depends on both Carnival and Club management*

**Proposed File**: `tests/e2e/carnival-registration.spec.js`

#### Club Registration for Carnivals
- [ ] Register club for carnival (delegate functionality)
- [ ] Registration validation and error handling
- [ ] View my club's carnival registrations

#### Carnival Organizer Functions
- [ ] View carnival attendees (as organizer)
- [ ] Add club to carnival (organizer)
- [ ] Edit registration details (organizer)
- [ ] Remove club from carnival (organizer)
- [ ] Approve/reject club registrations (organizer)
- [ ] Payment status management (organizer)

#### Player Assignment
- [ ] Assign players to carnival registration
- [ ] Player attendance status tracking
- [ ] View carnival player lists

**Dependencies**: Authentication (✅), Carnival Management (✅), Club Management (TODO), Club Player Management (TODO)
**Required for**: Full carnival workflow testing

### 12. Administrative Functions 🚧 TODO - **PRIORITY 7**
*Depends on all core entities being testable*

**Proposed File**: `tests/e2e/admin-functions.spec.js`

#### User Management
- [ ] Admin dashboard access
- [ ] View users list with search/filtering
- [ ] Edit user information
- [ ] Reset user passwords
- [ ] Toggle user active status
- [ ] Delete users
- [ ] Role management (admin/delegate)

#### Club Administration
- [ ] View clubs management page
- [ ] Edit club details (admin)
- [ ] Toggle club status and visibility
- [ ] Manage club ownership transfers

#### Carnival Administration
- [ ] View carnivals management page
- [ ] Edit carnival details (admin)
- [ ] Toggle carnival status
- [ ] Claim carnival ownership
- [ ] View carnival players (comprehensive list)

#### System Administration
- [ ] View system statistics
- [ ] Generate system reports
- [ ] Audit log viewing and filtering
- [ ] Export audit logs
- [ ] MySideline sync functionality

**Dependencies**: Authentication (✅), User Account Management (TODO), Club Management (TODO), Carnival Management (✅)
**Required for**: None (administrative overlay)

### 13. Search & Discovery 🚧 TODO - **PRIORITY 8**
*Depends on core content being available*

**Proposed File**: `tests/e2e/search-discovery.spec.js`

#### Search Functionality
- [ ] Global search across carnivals
- [ ] Club search with autocomplete
- [ ] Advanced filtering options
- [ ] Search result pagination
- [ ] Search term highlighting

#### Discovery Features
- [ ] Upcoming carnivals display
- [ ] State-based filtering
- [ ] Date range filtering
- [ ] MySideline vs manual carnival filtering

**Dependencies**: Carnival Management (✅), Club Management (TODO)
**Required for**: None

### 14. Data Import & Export 🚧 TODO - **PRIORITY 9**
*Depends on core data structures*

**Proposed File**: `tests/e2e/data-management.spec.js`

#### CSV Operations
- [ ] Download player CSV template
- [ ] Import players from CSV
- [ ] CSV validation and error handling
- [ ] Export functionality (where available)

#### MySideline Integration
- [ ] MySideline event sync
- [ ] Data mapping validation
- [ ] Duplicate handling
- [ ] Sync error handling

**Dependencies**: Club Player Management (TODO), Carnival Management (✅)
**Required for**: None

### 15. Security & Permissions 🚧 TODO - **PRIORITY 10**
*Cross-cutting concerns - test after core functionality*

**Proposed File**: `tests/e2e/security-permissions.spec.js`

#### Access Control
- [ ] Route protection for unauthenticated users
- [ ] Admin-only route protection
- [ ] Delegate-only functionality access
- [ ] Club-specific data access control
- [ ] Carnival ownership permissions

#### Security Features
- [ ] CSRF protection testing
- [ ] XSS prevention validation
- [ ] SQL injection prevention
- [ ] File upload security
- [ ] Session security

**Dependencies**: All core functionality tests
**Required for**: Security compliance

### 16. Error Handling & Edge Cases 🚧 TODO - **PRIORITY 11**
*Test after happy path scenarios work*

**Proposed File**: `tests/e2e/error-handling.spec.js`

#### Error Scenarios
- [ ] 404 page handling
- [ ] 500 error page handling
- [ ] Network timeout handling
- [ ] Invalid form submissions
- [ ] Duplicate data handling
- [ ] Large file upload errors

#### Validation Testing
- [ ] Form field validation messages
- [ ] Required field enforcement
- [ ] Data type validation
- [ ] Length limit validation
- [ ] Format validation (emails, phones, URLs)

**Dependencies**: All core functionality tests
**Required for**: Robust error handling

### 17. Mobile & Responsive Testing 🚧 TODO - **PRIORITY 12**
*Test after desktop functionality is solid*

**Proposed File**: `tests/e2e/mobile-responsive.spec.js`

#### Mobile Functionality
- [ ] Mobile navigation menu
- [ ] Touch interactions
- [ ] Form input on mobile
- [ ] Image gallery on mobile
- [ ] Search functionality on mobile

#### Responsive Design
- [ ] Layout adaptation across breakpoints
- [ ] Image scaling and display
- [ ] Table responsiveness
- [ ] Modal behavior on mobile

**Dependencies**: All core functionality tests
**Required for**: Mobile user experience

### 18. Performance & Accessibility 🚧 TODO - **PRIORITY 13**
*Test after all functionality is complete*

**Proposed File**: `tests/e2e/performance-accessibility.spec.js`

#### Performance Testing
- [ ] Page load time measurements
- [ ] Image loading optimization
- [ ] JavaScript performance
- [ ] Database query performance
- [ ] File upload performance

#### Accessibility Testing
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Alt text for images
- [ ] ARIA labels and roles
- [ ] Color contrast validation

**Dependencies**: All functionality tests
**Required for**: Compliance and user experience

## Critical Dependencies & Execution Order

### Phase 1: Foundation (Weeks 1-2)
**Must complete in order:**
1. User Account Management (enables club associations)
2. Club Management (enables club-specific features)
3. Contact & Communication (independent)

### Phase 2: Core Workflows (Weeks 3-4)
**Can be done in parallel after Phase 1:**
4. Club Player Management (requires clubs)
5. Sponsor Management (independent)

### Phase 3: Complex Integrations (Weeks 5-6)
**Requires Phase 1 & 2 complete:**
6. Carnival-Club Registration (requires clubs, players, carnivals)
7. Search & Discovery (requires content to search)

### Phase 4: Administration (Week 7)
**Requires most core functionality:**
8. Administrative Functions (requires all entities)
9. Data Import/Export (requires data structures)

### Phase 5: Quality & Compliance (Week 8)
**Final validation layer:**
10. Security & Permissions
11. Error Handling & Edge Cases
12. Mobile & Responsive Testing
13. Performance & Accessibility

## Missing Test Areas Identified

### ❗ Critical Gap: Coming Soon & Maintenance Modes
**New File**: `tests/e2e/site-modes.spec.js`
- [ ] Coming soon mode functionality
- [ ] Maintenance mode functionality
- [ ] Mode switching and redirects
- [ ] Admin bypass in maintenance mode

### ❗ Critical Gap: File Upload Testing
**Addition to existing files**:
- [ ] Club logo uploads
- [ ] Carnival image uploads
- [ ] Sponsor logo uploads
- [ ] File validation (size, type)
- [ ] File security testing

### ❗ Critical Gap: Email System Testing
**New File**: `tests/e2e/email-system.spec.js`
- [ ] Newsletter sending functionality
- [ ] Invitation email sending
- [ ] Password reset emails
- [ ] Email unsubscribe workflows
- [ ] Email template rendering

## Test Data Management

### Test Users
- **Admin User**: admin@test.com / admin123
- **Delegate User**: delegate@test.com / delegate123
- **Test Club**: Test Rugby Club (NSW)
- **Test Carnival**: Test Masters Carnival
- **Test Sponsor**: Test Sponsor Co

### Data Dependencies
- **Before Club Tests**: Need users who can create/join clubs
- **Before Player Tests**: Need clubs with associated delegates
- **Before Registration Tests**: Need clubs with players and active carnivals
- **Before Admin Tests**: Need various entity types to manage

### Data Cleanup
- Global setup creates fresh test data
- Each test uses isolated data where possible
- Global teardown cleans up resources

## Page Object Model Structure

### Existing Page Objects
- `BasePage.js` - Common functionality ✅
- `HomePage.js` - Homepage interactions ✅
- `LoginPage.js` - Authentication ✅

### Required Page Objects (Priority Order)
1. `DashboardPage.js` - User dashboard (needed first)
2. `UserAccountPage.js` - Profile management (needed for club association)
3. `ClubListPage.js` - Club listings and search
4. `ClubPage.js` - Club profile and management
5. `ContactPage.js` - Contact form
6. `CarnivalPage.js` - Carnival details and management
7. `CarnivalListPage.js` - Carnival listings
8. `AdminPage.js` - Admin panel functionality
9. `SponsorPage.js` - Sponsor management

## Utility Functions

### Existing Utilities
- `TestUtils.js` - Common test utilities ✅

### Required Utilities
- Form filling helpers for complex forms
- File upload testing utilities
- Date/time helpers for carnival dates
- Email validation helpers
- CSV testing utilities

## Test Execution Strategy

### Priority Levels
1. **Critical (P0)**: Authentication, core CRUD operations
2. **High (P1)**: User workflows, data management
3. **Medium (P2)**: Admin functions, advanced features
4. **Low (P3)**: Edge cases, performance testing

### Test Environment Requirements
- Clean database state for each test run
- Consistent test data setup
- Email testing capabilities
- File system cleanup
- Network simulation capabilities

## Reporting & Monitoring

### Test Reports
- HTML reports for detailed analysis
- JSON reports for CI/CD integration
- Screenshot capture on failures
- Video recordings for debugging

### Metrics to Track
- Test execution time
- Test coverage across features
- Failure rates by category
- Performance benchmarks

## CI/CD Integration

### Automated Testing
- Run tests on pull requests
- Scheduled nightly test runs
- Performance regression testing
- Cross-browser testing matrix

### Test Data
- Automated test data generation
- Database seeding for consistent state
- Test data cleanup procedures

## Security Testing Considerations

### Authentication Testing
- Session management validation
- Password policy enforcement
- Account lockout mechanisms
- Two-factor authentication (if implemented)

### Authorization Testing
- Role-based access control
- Resource ownership validation
- API endpoint security
- File access permissions

### Input Validation Testing
- XSS prevention
- SQL injection prevention
- File upload security
- CSRF protection

## Implementation Timeline

### Phase 1 (Weeks 1-2)
- Complete User Account Management tests
- Complete Club Management tests
- Implement Contact & Communication tests

### Phase 2 (Weeks 3-4)
- Club Player Management tests
- Sponsor Management tests

### Phase 3 (Weeks 5-6)
- Carnival-Club Registration tests
- Search & Discovery tests

### Phase 4 (Week 7)
- Administrative Functions tests
- Data Import/Export tests

### Phase 5 (Week 8)
- Security & Permissions tests
- Error Handling tests
- Mobile & Responsive Testing
- Performance & Accessibility tests

## Maintenance & Updates

### Regular Updates
- Update test data as application evolves
- Maintain page objects with UI changes
- Update selectors and element identification
- Refresh test scenarios with new features

### Documentation
- Keep test plan updated with new features
- Document test failures and resolutions
- Maintain troubleshooting guides
- Update browser compatibility matrix

---

**Note**: This plan represents a comprehensive testing strategy. Implement tests in priority order based on application criticality and available resources. Regular review and updates ensure the test suite remains effective as the application evolves.