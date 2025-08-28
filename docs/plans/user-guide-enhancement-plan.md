# User Guide Enhancement Plan

#### #### 1.2 Carnival Club Registration System
- [x] Create `carnival-registration.ejs` - How clubs register for events
- [x] Create `carnival-team-management.ejs` - Managing teams within carnivals
- [x] Create `carnival-attendee-management.ejs` - Managing registered clubs (organizers)
- [x] Update screenshot script to capture registration workflow
- [x] Update screenshot script to capture attendee management interfacernival Club Registration System
- [x] Create `carnival-registration.ejs` - How clubs register for events
- [x] Create `carnival-team-management.ejs` - Managing teams within carnivals
- [ ] Create `carnival-attendee-management.ejs` - Managing registered clubs (organizers)
- [x] Update screenshot script to capture registration workflow
- [ ] Update screenshot script to capture attendee management interfacerview
This plan outlines a comprehensive enhancement of the Old Man Footy user guide to provide complete coverage of all platform functionality. The current user guide covers only ~25% of available features.

## Current State Analysis

### Existing Coverage
- **Screenshot Generation**: Automated system using Playwright ✅
- **User Guide Structure**: Controller-based page management ✅
- **Public Pages**: 5 pages (Homepage, Carnivals, Clubs, Sponsors, Contact) ✅
- **Delegate Pages**: 11 pages (Dashboard, Club Players, Manage Club, etc.) ✅

### Major Gaps Identified
- Player CSV import/export functionality
- Carnival club registration and attendee management
- Administrative functions and user management
- Account/profile management features
- Advanced search and filtering
- Community features and onboarding
- Troubleshooting and support resources

## Implementation Phases

### Phase 1: Core Delegate Functionality Expansion

#### 1.1 Enhanced Player Management
- [x] Create `player-csv-import.ejs` - CSV import process guide
- [x] Create `player-medical-info.ejs` - Medical/emergency contacts management
- [x] Create `player-bulk-operations.ejs` - Managing multiple players
- [x] Update screenshot script to capture CSV import interface
- [x] Update screenshot script to capture medical information forms

#### 1.2 Carnival Club Registration System ✅ COMPLETED
- [x] Create `carnival-registration.ejs` - How clubs register for events
- [x] Create `carnival-team-management.ejs` - Managing teams within carnivals
- [x] Create `carnival-attendee-management.ejs` - Managing registered clubs (organizers)
- [x] Update screenshot script to capture registration workflow
- [x] Update screenshot script to capture attendee management interface

#### 1.3 Enhanced Sponsor Management ✅ COMPLETED
- [x] Create `carnival-sponsor-management.ejs` - Managing sponsors for specific carnivals
- [x] Create `sponsor-visibility-settings.ejs` - Controlling public visibility
- [x] Update screenshot script to capture sponsor priority settings
- [x] Update screenshot script to capture visibility toggles

### Phase 2: Administrative Functionality

#### 2.1 Admin Dashboard & User Management
- [x] Create `admin-dashboard.ejs` - Admin control center guide
- [x] Create `admin-user-management.ejs` - Managing user accounts
- [x] Create `admin-club-management.ejs` - Administrative club controls
- [x] Create `admin-carnival-management.ejs` - Administrative carnival controls
- [x] Update screenshot script to capture admin interfaces (requires admin login)

#### 2.2 System Administration Features
- [x] Create `admin-audit-logs.ejs` - Viewing system activity
- [x] Create `admin-reports.ejs` - Generating system reports
- [x] Create `admin-mysideline-sync.ejs` - Managing external system integration
- [x] Create `admin-system-health.ejs` - Monitoring system status
- [x] Update screenshot script to capture audit log interfaces

### Phase 3: Communication & Account Management

#### 3.1 Communication Features
- [ ] Create `email-notifications.ejs` - Managing automated emails
- [ ] Create `carnival-announcements.ejs` - Sending updates to participants
- [ ] Create `newsletter-management.ejs` - Managing subscriptions
- [ ] Update screenshot script to capture email composition interfaces

#### 3.2 Account & Profile Management
- [ ] Create `user-profile-management.ejs` - Managing personal account
- [ ] Create `account-security.ejs` - Password and security settings
- [ ] Create `contact-information-updates.ejs` - Updating contact details
- [ ] Update screenshot script to capture profile management pages

### Phase 4: Public User Experience Enhancement

#### 4.1 Navigation & Discovery
- [ ] Create `advanced-search.ejs` - Using search and filter features
- [ ] Create `club-comparison.ejs` - Comparing clubs
- [ ] Create `event-registration-process.ejs` - How to register for carnivals
- [ ] Update screenshot script to capture search result pages

#### 4.2 Community & Engagement
- [ ] Create `user-registration-guide.ejs` - Creating an account
- [ ] Create `joining-a-club.ejs` - Becoming a club member
- [ ] Create `delegate-onboarding.ejs` - Becoming a club delegate
- [ ] Create `community-guidelines.ejs` - Platform rules and etiquette
- [ ] Update screenshot script to capture registration workflow

### Phase 5: Technical & Operational Guides

#### 5.1 Data Management
- [ ] Create `data-export.ejs` - Exporting club/player data
- [ ] Create `data-privacy.ejs` - Privacy and data protection
- [ ] Create `backup-recovery.ejs` - Data backup procedures
- [ ] Update screenshot script to capture data export interfaces

#### 5.2 Troubleshooting & Support
- [ ] Create `troubleshooting-common-issues.ejs` - Resolving common problems
- [ ] Create `mobile-usage-guide.ejs` - Using on mobile devices
- [ ] Create `browser-compatibility.ejs` - Supported browsers and settings
- [ ] Create `getting-help.ejs` - Support resources and contact methods

## Implementation Strategy

### 1. Update Screenshot Generation Script
- [ ] Add new screenshot targets for all new pages
- [ ] Ensure proper authentication for admin/delegate pages
- [ ] Test screenshot generation with new targets
- [ ] Validate screenshot quality and coverage

### 2. Update User Guide Controller
- [ ] Add new page definitions to pages array
- [ ] Ensure proper authentication requirements
- [ ] Update screenshot URL mappings
- [ ] Test page routing and access control

### 3. Create Consistent View Templates
- [ ] Establish standard template structure for all new pages
- [ ] Ensure responsive design compatibility
- [ ] Add proper navigation and cross-references
- [ ] Implement consistent styling and branding

### 4. Update Navigation & Organization
- [ ] Group related pages in user guide index
- [ ] Add breadcrumb navigation
- [ ] Create table of contents for complex features
- [ ] Add "Related Topics" sections

### 5. Testing & Validation
- [ ] Test all new screenshots are generated correctly
- [ ] Validate all referenced URLs exist and work
- [ ] Ensure proper authentication checks
- [ ] Test responsive design on mobile devices
- [ ] Validate accessibility compliance

## Success Metrics
- [ ] **Coverage**: Achieve 90%+ coverage of platform functionality
- [ ] **Usability**: Users can complete 95% of tasks without external help
- [ ] **Maintenance**: Screenshots remain current with feature updates
- [ ] **Accessibility**: All user guide content meets WCAG guidelines

## Dependencies & Prerequisites
- [ ] Ensure all referenced features are fully implemented
- [ ] Verify admin routes are accessible for screenshot generation
- [ ] Confirm authentication system supports admin user creation
- [ ] Test all new pages with both desktop and mobile viewports

## Risk Mitigation
- [ ] Create backup of existing user guide before major changes
- [ ] Test screenshot generation in staging environment first
- [ ] Implement gradual rollout of new pages
- [ ] Monitor user feedback and usage analytics
- [ ] Plan for ongoing maintenance and updates

## Timeline Estimate
- **Phase 1**: 2-3 weeks (Core delegate features)
- **Phase 2**: 1-2 weeks (Admin functionality)
- **Phase 3**: 1 week (Communication & account management)
- **Phase 4**: 1 week (Public user experience)
- **Phase 5**: 1 week (Technical & operational guides)
- **Testing & Refinement**: 1 week

## Resources Required
- **Development**: Frontend developer for view templates
- **Content**: Technical writer for user guide content
- **Testing**: QA tester for validation and user testing
- **Design**: UI/UX designer for consistent styling
- **DevOps**: Access to staging environment for screenshot generation

## Next Steps
1. Review and approve this plan
2. Prioritize phases based on user needs and business value
3. Begin implementation with Phase 1 (highest user impact)
4. Establish regular check-ins and progress reviews
5. Plan for iterative improvements based on user feedback</content>
<parameter name="filePath">c:\Users\devon\source\repos\old-man-footy\docs\plans\user-guide-enhancement-plan.md
