# Contextual Help Popups Implementation Plan

## Overview
Replace the centralized user guide with contextual help popups throughout the application. Each help popup will be triggered by question mark icons (?) placed strategically near relevant UI elements, opening modals with specific, detailed instructions for that particular feature or task.

## Paths verification & route-to-view mapping

 - [x] Verify each planned URL (route) actually renders a server-side view or client page before creating help popups. Some Express routes are API-only or perform redirects and should not receive UI popups (see "Non-UI / API routes" below).  
 - [x] Create a short mapping document `docs/plans/help-route-to-view.md` that lists each route and the view file (or API) it corresponds to. This will be the source-of-truth for implementation.  
 - [ ] For any route that currently uses partials only (for example via AJAX), create a plan for where the help icon should live (calling page or modal parent), or mark it as deferred.

Note: The repository contains route files that include API endpoints and image management POST/DELETE routes that are not pages (for example `/api/maintenance/status`, `/clubs/:clubId/images` and image delete endpoints). These should be excluded when building the per-page help popups; instead, consider adding admin-facing guidance in the relevant management pages where those features are surfaced.

## Implementation Strategy

### 1. Technical Architecture
- **Modal System**: Use Bootstrap modals for consistent styling and behavior
- **Icon Placement**: Question mark icons using Bootstrap Icons (`bi bi-question-circle`)
- **JavaScript Management**: Centralized help system with page-specific configurations
- **Accessibility**: Full ARIA support, keyboard navigation, screen reader compatibility
- **Mobile Optimization**: Touch-friendly sizing, proper viewport handling

### 2. Help Content Guidelines
- **Specificity**: Each popup explains one specific task or feature
- **Conciseness**: Keep content focused and actionable (50-200 words per popup)
- **Progressive Disclosure**: Start with basics, offer "Learn More" for advanced details
- **Visual Aids**: Include screenshots or diagrams where helpful
- **Actionable**: End with clear next steps or "Try It" buttons

### 3. Mobile Responsiveness Best Practices
- **Touch Targets**: Minimum 44px touch targets for help icons
- **Modal Sizing**: Full-screen modals on mobile, max-width on desktop
- **Positioning**: Icons positioned to avoid thumb interference zones
- **Gestures**: Support swipe-to-dismiss for modals
- **Font Sizing**: Minimum 16px readable text, scalable with device settings

---

## Page-by-Page Implementation Plan

## Progress update (2025-08-29)

Current status: initial skeleton implemented and example pages wired. Use this section to track concrete tasks already completed so the team can monitor rollout progress.

- [x] Central modal partial supporting multiple instances implemented (`views/partials/help-modal.ejs`).
- [x] Central help manager updated to support per-trigger modal targeting and legacy default (`public/js/help-system.js`).
- [x] Route→view mapping document created and verified (`docs/plans/help-route-to-view.md`).
- [x] Example page wiring completed for: `club-options` (help triggers + config), `carnivals/new` (MySideline badges + help triggers + config), `index` (modal include + config), `clubs/manage` (modal include + config), `sponsors/list` (modal include + config).
- [x] Page-specific help-config modules added under `public/js/help-config-*.js` for the example pages.
- [x] Help-content markdown stubs created under `docs/help-content/` for: `club-options.md`, `carnivals-new.md`, `index.md`, `clubs.md`, `sponsors.md`.
- [ ] Continue wiring pages across the site per the Page-by-Page plan (next target: Carnival detail/edit pages and remaining Club flows).
- [ ] Decide and implement scalable runtime content-loading (fetch markdown/JSON) vs inline page configs.
- [ ] Add unit/integration tests for `helpSystem` (multi-modal behaviour, event emission, accessibility checks).

Notes:
- The pattern implemented uses a small page config module (`public/js/help-config-<page>.js`) that sets `window.HELP_SYSTEM_CONFIG.pages['<page-id>']` and initializes the `helpSystem`. This is intentionally lightweight and easy to copy when authoring new pages.
- For each page the remaining work is typically: place `data-help-key` triggers next to target UI elements, include a modal instance in the view with a unique `modalId`, and create/author the page config module or server-render the help config into `window.HELP_SYSTEM_CONFIG`.

### Public Pages

#### 1. Homepage (`/`)
**Target Audience**: New visitors, potential delegates
**Help Popups Needed**:
- [ ] **Welcome Overview** (hero section) - What is Old Man Footy?
- [ ] **Upcoming Carnivals** - How to view and register for carnivals
- [ ] **Quick Stats** - Understanding the numbers displayed
- [ ] **Club Search** - How to find clubs in your area
- [ ] **Get Started CTA** - What happens when you register

#### 2. About Page (`/about`)
**Target Audience**: New visitors
**Help Popups Needed**:
- [ ] **Platform Purpose** - What Old Man Footy does
- [ ] **How It Works** - Basic workflow explanation
- [ ] **Club Delegate Role** - What delegates do
- [ ] **Carnival Organization** - How carnivals are managed

#### 3. Contact Page (`/contact`)
**Target Audience**: All users
**Help Popups Needed**:
- [ ] **Contact Form** - How to submit inquiries
- [ ] **Subject Selection** - When to use each category
- [ ] **Club Name Field** - When and why to provide club info
- [ ] **Newsletter Signup** - Benefits of subscribing

#### 4. Sponsors List (`/sponsors`)
**Target Audience**: Delegates, carnival organizers
**Help Popups Needed**:
- [ ] **Sponsor Search** - How to find sponsors
- [ ] **Filter System** - Using state and level filters
- [ ] **Sponsor Levels** - Understanding Gold/Silver/Bronze
- [ ] **Contact Process** - How to connect with sponsors
- [ ] **Stats Bar** - What the numbers mean

#### 5. Clubs List (`/clubs`)
**Target Audience**: Potential delegates, visitors
**Help Popups Needed**:
- [ ] **Club Search** - Finding clubs by name/location
- [ ] **State Filter** - Filtering by Australian state
- [ ] **Club Cards** - Understanding club information display
- [ ] **Contact Delegate** - How to reach out to join
- [ ] **Club Profiles** - What detailed info is available

#### 6. Carnivals List (`/carnivals`)
**Target Audience**: Players, delegates
**Help Popups Needed**:
- [ ] **Carnival Filters** - Using state and date filters
- [ ] **Carnival Cards** - Understanding event information
- [ ] **Registration Links** - How to register for events
- [ ] **Date Information** - Understanding carnival timing
- [ ] **Location Details** - Finding carnival venues

#### 7. Individual Sponsor Profile (`/sponsors/:id`)
**Target Audience**: Delegates, carnival organizers
**Help Popups Needed**:
- [ ] **Contact Information** - How to reach the sponsor
- [ ] **Social Media Links** - Connecting on different platforms
- [ ] **Business Details** - Understanding sponsor capabilities
- [ ] **Past Partnerships** - Learning from previous collaborations

#### 8. Individual Club Profile (`/clubs/:id`)
**Target Audience**: Potential members, other delegates
**Help Popups Needed**:
- [ ] **Club Leadership** - Understanding delegate structure
- [ ] **Club Statistics** - What the numbers represent
- [ ] **Contact Options** - How to get in touch
- [ ] **Social Media** - Following club updates

#### 9. Individual Carnival Profile (`/carnivals/:id`)
**Target Audience**: Players, delegates
**Help Popups Needed**:
- [ ] **Event Details** - Understanding carnival information
- [ ] **Registration Process** - How to sign up
- [ ] **Venue Information** - Finding the location
- [ ] **Contact Organizers** - Getting more information
- [ ] **Sponsor Section** - Understanding carnival sponsors

### MySideline data & autopopulation (important)

- [ ] Identify and document which carnival fields are auto-populated from MySideline and which are manually editable. Common MySideline-sourced fields to confirm include:
  - Title / Name
  - Date / startDate / endDate
  - Location / venue name / address
  - Organizer contact (may be partial)
  - External registration link or source identifier
  - Imported images or attachments (if sync supports images)
  - Original MySideline source notice (show a short "Imported from MySideline" badge)

- [ ] Add a help popup on carnival creation/edit pages that clearly labels fields as: "Imported from MySideline (read-only unless claimed)" vs "Editable locally".
- [ ] On the carnival public view (`/carnivals/:id`) include a short note explaining which displayed fields came from MySideline and the expected behaviour when a user "takes ownership" of a MySideline event (i.e., which fields become editable and what data remains linked to the MySideline record).
- [ ] Add tests/QA checklist to verify imported field mappings and to surface mismatches (e.g., date format differences, missing address parts).

---

### Authentication Pages

#### 10. Login Page (`/auth/login`)
**Target Audience**: Returning users
**Help Popups Needed**:
- [ ] **Login Form** - How to sign in
- [ ] **Password Requirements** - What makes a valid password
- [ ] **Forgot Password** - Recovery process
- [ ] **Registration Link** - For new users

#### 11. Registration Page (`/auth/register`)
**Target Audience**: New users
**Help Popups Needed**:
- [ ] **Registration Form** - Required vs optional fields
- [ ] **Password Strength** - Creating secure passwords
- [ ] **Email Validation** - Why email verification matters
- [ ] **Phone Number** - Formatting requirements
- [ ] **Terms Agreement** - What you're agreeing to

#### 12. Invitation Acceptance (`/auth/invite/:token`)
**Target Audience**: Invited users
**Help Popups Needed**:
- [ ] **Invitation Process** - What happens when you accept
- [ ] **Club Association** - How you'll be connected to the club
- [ ] **Delegate Role** - What privileges you'll have
- [ ] **Next Steps** - What to do after accepting

---

### Club Management Pages

#### 13. Club Options (`/clubs/options`)
**Target Audience**: Users without clubs
**Help Popups Needed**:
- [ ] **Create vs Join** - Understanding the two paths
- [ ] **Club Creation Form** - Required information
- [ ] **Autocomplete Search** - Finding existing clubs
- [ ] **State Selection** - Choosing correct location
- [ ] **Primary Delegate** - What this role means
- [ ] **Claimable Clubs** - Special invitation system

#### 14. Club Management Dashboard (`/clubs/manage`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Delegate Overview** - Your role and responsibilities
- [ ] **Quick Actions** - Common management tasks
- [ ] **Club Statistics** - Understanding your club's metrics
- [ ] **Recent Activity** - What the activity feed shows
- [ ] **Navigation Menu** - Accessing different management areas

#### 15. Club Profile Edit (`/clubs/manage/profile`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Profile Fields** - What each field is for
- [ ] **Image Upload** - Logo and photo requirements
- [ ] **Social Media** - Setting up social links
- [ ] **Contact Information** - Managing delegate contacts
- [ ] **Visibility Settings** - Public vs private club settings

#### 16. Club Sponsors Management (`/clubs/manage/sponsors`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Current Sponsors** - Managing existing partnerships
- [ ] **Add New Sponsor** - Finding and adding sponsors
- [ ] **Sponsor Priority** - Ordering sponsor display
- [ ] **Remove Sponsors** - Ending partnerships safely

#### 17. Add Club Sponsor (`/clubs/manage/sponsors/add`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Sponsor Search** - Finding available sponsors
- [ ] **Existing vs New** - When to use each option
- [ ] **Contact Process** - Reaching out to sponsors
- [ ] **Partnership Benefits** - What sponsors provide

#### 18. Club Alternate Names (`/clubs/manage/alternate-names`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Alternate Names** - Why they're useful
- [ ] **Search Optimization** - Improving discoverability
- [ ] **Name Management** - Adding, editing, removing names
- [ ] **Best Practices** - Choosing effective alternate names

#### 19. Create Club on Behalf (`/clubs/create-on-behalf`)
**Target Audience**: Delegates, admins
**Help Popups Needed**:
- [ ] **Proxy Creation** - When and why to use this
- [ ] **Invitation Email** - What the invitee receives
- [ ] **Club Setup** - Pre-configuring the new club
- [ ] **Delegate Transfer** - Handing over control

#### 20. Claim Club Ownership (`/clubs/:id/claim`)
**Target Audience**: Invited users
**Help Popups Needed**:
- [ ] **Ownership Claim** - What claiming means
- [ ] **Delegate Responsibilities** - Your new role
- [ ] **Club Transition** - What happens to the previous setup
- [ ] **Getting Started** - First steps as delegate

---

### Carnival Management Pages

#### 21. Carnival Creation (`/carnivals/new`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Carnival Basics** - Required information
- [ ] **Date Selection** - Choosing event dates
- [ ] **Location Details** - Providing venue information
- [ ] **Contact Information** - Who to contact for questions
- [ ] **Registration Setup** - Setting up registration process
- [ ] **Fees Structure** - Managing entry costs
- [ ] **Social Media** - Promoting the event
- [ ] **Image Upload** - Adding carnival photos

#### 22. Carnival Edit (`/carnivals/:id/edit`)
**Target Audience**: Carnival organizers
**Help Popups Needed**:
- [ ] **Edit Permissions** - Who can modify carnivals
- [ ] **Change Tracking** - What changes are logged
- [ ] **Date Modifications** - Impact of date changes
- [ ] **Registration Updates** - Managing existing registrations

#### 23. Carnival Detail View (`/carnivals/:id`)
**Target Audience**: Players, delegates
**Help Popups Needed**:
- [ ] **Event Information** - Understanding carnival details
- [ ] **Registration Process** - How to sign up
- [ ] **Club Participation** - How clubs get involved
- [ ] **Contact Organizers** - Getting more information

#### 24. Carnival Sponsors (`/carnivals/:id/sponsors`)
**Target Audience**: Carnival organizers
**Help Popups Needed**:
- [ ] **Sponsor Management** - Adding carnival sponsors
- [ ] **Sponsor Benefits** - What sponsors receive
- [ ] **Display Priority** - Ordering sponsor visibility
- [ ] **Partnership Tracking** - Managing sponsor relationships

#### 25. Carnival Players (`/carnivals/:id/players`)
**Target Audience**: Carnival organizers
**Help Popups Needed**:
- [ ] **Player Overview** - Understanding participant data
- [ ] **Club Breakdown** - Players by club
- [ ] **Registration Status** - Tracking signups
- [ ] **Contact Players** - Reaching participants

#### 26. Carnival Attendees (`/carnivals/:id/attendees`)
**Target Audience**: Carnival organizers
**Help Popups Needed**:
- [ ] **Club Management** - Managing participating clubs
- [ ] **Registration Tracking** - Club signup status
- [ ] **Communication** - Sending updates to clubs
- [ ] **Capacity Management** - Handling participant limits

---

### Player Management Pages

#### 27. Club Players List (`/clubs/players`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Player Management** - Overview of player functions
- [ ] **Add Players** - How to register new players
- [ ] **Player Status** - Understanding player states
- [ ] **Bulk Actions** - Managing multiple players

#### 28. Add Club Player (`/clubs/players/add`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Player Information** - Required player details
- [ ] **Contact Details** - Managing player communication
- [ ] **Registration Process** - Step-by-step signup
- [ ] **Privacy Considerations** - Data handling

#### 29. Edit Club Player (`/clubs/players/:id/edit`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Edit Permissions** - Who can modify players
- [ ] **Change Tracking** - What modifications are logged
- [ ] **Data Validation** - Ensuring accurate information
- [ ] **Update Notifications** - When players are notified

#### 30. Carnival Club Players (`/carnivals/:id/club-players`)
**Target Audience**: Club delegates
**Help Popups Needed**:
- [ ] **Carnival Registration** - Registering club for event
- [ ] **Player Selection** - Choosing which players attend
- [ ] **Registration Deadlines** - Important dates
- [ ] **Payment Processing** - Handling fees

---

### Admin Panel Pages

#### 31. Admin Dashboard (`/admin/dashboard`)
**Target Audience**: System administrators
**Help Popups Needed**:
- [ ] **Admin Overview** - Understanding admin responsibilities
- [ ] **System Statistics** - Interpreting dashboard metrics
- [ ] **Quick Actions** - Common administrative tasks
- [ ] **Navigation** - Accessing different admin sections

#### 32. User Management (`/admin/users`)
**Target Audience**: System administrators
**Help Popups Needed**:
- [ ] **User Search** - Finding specific users
- [ ] **User Status** - Understanding account states
- [ ] **Edit Users** - Modifying user information
- [ ] **Security Actions** - Password resets and status changes

#### 33. Club Management (`/admin/clubs`)
**Target Audience**: System administrators
**Help Popups Needed**:
- [ ] **Club Oversight** - Administrative club management
- [ ] **Status Controls** - Activating/deactivating clubs
- [ ] **Delegate Management** - Managing club leadership
- [ ] **Bulk Operations** - Managing multiple clubs

#### 34. Carnival Management (`/admin/carnivals`)
**Target Audience**: System administrators
**Help Popups Needed**:
- [ ] **Carnival Oversight** - Administrative carnival management
- [ ] **Status Controls** - Managing carnival states
- [ ] **Ownership Management** - Handling carnival ownership
- [ ] **System Integration** - MySideline synchronization

#### 35. Sponsor Management (`/admin/sponsors`)
**Target Audience**: System administrators
**Help Popups Needed**:
- [ ] **Sponsor Administration** - Managing sponsor database
- [ ] **Verification Process** - Validating sponsor information
- [ ] **Status Management** - Controlling sponsor visibility
- [ ] **Bulk Operations** - Managing multiple sponsors

#### 36. Audit Logs (`/admin/audit-logs`)
**Target Audience**: System administrators
**Help Popups Needed**:
- [ ] **Log Interpretation** - Understanding audit entries
- [ ] **Search Filters** - Finding specific activities
- [ ] **Export Functions** - Generating audit reports
- [ ] **Security Monitoring** - Identifying suspicious activity

#### 37. Reports (`/admin/reports`)
**Target Audience**: System administrators
**Help Popups Needed**:
- [ ] **Report Generation** - Creating system reports
- [ ] **Data Analysis** - Interpreting report data
- [ ] **Export Options** - Downloading report formats
- [ ] **Scheduled Reports** - Automated report generation

---

## Technical Implementation Details

### 1. Help System Architecture
```javascript
// Central help configuration
const helpSystem = {
  pages: {
    'club-options': {
      'create-club-form': {
        title: 'Creating Your Club',
        content: '...',
        position: 'right',
        trigger: '#clubName'
      }
    }
  }
}
```

### 2. Modal Template Structure
```html
<div class="help-modal modal fade" id="help-{page}-{section}" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">
          <i class="bi bi-question-circle text-primary me-2"></i>
          {Help Title}
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        {Help Content}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Got it</button>
        <button type="button" class="btn btn-primary">Try It</button>
      </div>
    </div>
  </div>
</div>
```

### 3. Icon Placement Strategy
- **Form Fields**: Right side of input groups
- **Buttons**: Top-right corner of button containers
- **Sections**: Top-right of section headers
- **Cards**: Top-right of card headers
- **Tables**: Right side of table captions

### 4. Mobile-Specific Considerations
- **Icon Sizing**: Minimum 24px icons on mobile
- **Touch Zones**: 44px minimum touch targets
- **Modal Behavior**: Full-screen on small screens
- **Positioning**: Avoid bottom navigation areas
- **Gestures**: Support swipe-to-dismiss

### 5. Accessibility Features
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Tab order and Enter/Space activation
- **Focus Management**: Proper focus trapping in modals
- **Color Contrast**: WCAG AA compliance
- **Alternative Text**: Descriptive alt text for icons

### 6. Content Management
- **Markdown Support**: Allow rich text formatting
- **Image Integration**: Support for screenshots/diagrams
- **Version Control**: Track help content versions
- **A/B Testing**: Test different help content effectiveness
- **Analytics**: Track help usage and effectiveness

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create help modal system
- [ ] Implement help icon component
- [ ] Set up content management structure
- [ ] Add mobile responsiveness
- [ ] Implement accessibility features

## Global / Site chrome help

- [ ] Add a global "site chrome" help icon (in the main layout: `views/layout.ejs`), which opens a small modal explaining global navigation items: account menu, notifications, search, and where to find contextual help on each page.
- [ ] Ensure the global help modal is optional and lightweight — it should link to page-specific help popups rather than duplicate them.

## Non-UI / API routes (do not add popups)

The codebase contains several routes that are API endpoints, image-management or POST actions which do not have their own rendered page and therefore should not receive dedicated help popups. Instead, surface guidance on the pages where these features are used.

Examples to exclude from per-page popup scanning (verify in `routes/` before implementing):
- `/api/maintenance/status` and `/api/coming-soon/status` (status APIs)
- `/health` (health check endpoint)
- `/clubs/api/search` or `/clubs/api/search`-style autocomplete endpoints (back-end search)
- `/clubs/:clubId/images` and `DELETE /:clubId/images/:filename` (image management endpoints)
- `/clubs/join/:id`, `/clubs/leave` (POST actions — surface help on the club list/profile UI)
- Many `POST` routes used for form submissions (create/update/delete) — implement help on the form pages only, not the POST endpoints themselves.

If a route is purely an AJAX endpoint, add help to the parent page that consumes that endpoint (for example: autocomplete help on the form that uses `/clubs/api/search`).

### Phase 2: Public Pages (Week 3-4)
- [ ] Homepage help popups
- [ ] About page help popups
- [ ] Contact page help popups
- [ ] Sponsors list help popups
- [ ] Clubs list help popups
- [ ] Carnivals list help popups

### Phase 3: Authentication & Basic Management (Week 5-6)
- [ ] Authentication pages
- [ ] Club options and creation
- [ ] Basic club management
- [ ] Player management basics

### Phase 4: Advanced Features (Week 7-8)
- [ ] Carnival management
- [ ] Advanced club features
- [ ] Sponsor management
- [ ] Admin panel

### Phase 5: Testing & Optimization (Week 9-10)
- [ ] User testing and feedback
- [ ] Performance optimization
- [ ] Mobile testing
- [ ] Accessibility audit
- [ ] Content refinement

---

## Success Metrics

### User Engagement
- **Help Usage Rate**: Percentage of users who interact with help popups
- **Task Completion**: Success rates for key user flows
- **Time to Complete**: Reduction in time spent on common tasks
- **Error Reduction**: Decrease in support tickets for basic tasks

### Technical Metrics
- **Performance**: Modal load times under 100ms
- **Accessibility**: 100% WCAG AA compliance
- **Mobile Usage**: Consistent usage across device types
- **Content Freshness**: Help content updated within 30 days of feature changes

### Business Impact
- **User Retention**: Improved user retention through better onboarding
- **Feature Adoption**: Increased usage of advanced features
- **Support Load**: Reduction in basic support inquiries
- **User Satisfaction**: Improved user satisfaction scores
