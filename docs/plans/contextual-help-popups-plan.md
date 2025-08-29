# Contextual Help Popups Implementation Plan

## Overview
This plan outlines the implementation of a contextual help system. The previous approach of using multiple popups per page has been replaced. The new direction is to implement a **single, global "Help" button** with a question mark icon in the main navigation menu (the site's chrome).

When a user clicks this button, a modal window will open, displaying help content specifically tailored to the page they are currently viewing. This provides a centralized, predictable help mechanism while ensuring the content remains contextually relevant. Help content will be stored in and retrieved from a central database table.

## Paths verification & route-to-view mapping

- [x] Verify each planned URL (route) actually renders a server-side view or client page before creating help content.
- [x] Maintain the `docs/plans/help-route-to-view.md` mapping document that lists each route and the view it corresponds to. This will be the source-of-truth for creating `PageIdentifier` keys for the database.

Note: The repository contains route files that include API endpoints and image management POST/DELETE routes that are not pages (for example `/api/maintenance/status`, `/clubs/:clubId/images`). These should be excluded.

## Implementation Strategy

### 1. Technical Architecture
- **Global Help Button**: A single help button (`<button>` or `<a>`) with a question mark icon (`bi bi-question-circle`) will be placed in the main application layout (`views/layout.ejs`).
- **Modal System**: A single, reusable Bootstrap modal will be defined in the main layout. Its content will be dynamically populated.
- **Content Management**: Help content will be stored in a new `HelpContent` table in the database. An API endpoint (e.g., `/api/help/:pageIdentifier`) will be created to fetch content.
- **JavaScript Management**: A central JavaScript module (`public/js/help-system.js`) will handle the click event on the global help button. It will identify the current page, fetch the relevant content from the API, and display it in the modal.
- **Accessibility**: The modal will support full ARIA standards, keyboard navigation, and screen reader compatibility.
- **Mobile Optimization**: The modal will be responsive, appearing full-screen on mobile devices.

### 2. Help Content Guidelines
- **Comprehensiveness**: Each page's help content should cover all major features and functions available on that page.
- **Conciseness**: Use clear headings, bullet points, and short paragraphs. Aim for 100-400 words per page.
- **Progressive Disclosure**: Use accordions or expandable sections within the modal for complex pages if necessary.
- **Visual Aids**: Include screenshots or diagrams where helpful.
- **Actionable**: End with clear next steps or links to related functions.

---

## Progress update (2025-08-29)

Current status: The project direction has been updated. The initial skeleton will be refactored to support the new single-modal approach.

- [~] **RE-SCOPED**: The central modal partial (`views/partials/help-modal.ejs`) will be moved into the main layout (`views/layout.ejs`) as a single global instance.
- [~] **RE-SCOPED**: The central help manager (`public/js/help-system.js`) will be refactored to remove per-trigger logic. It will now manage the global help button, fetch content via API based on a page identifier, and populate the single modal.
- [x] The route→view mapping document (`docs/plans/help-route-to-view.md`) remains valid and will be used for content mapping.
- [-] **DEPRECATED**: Example page wiring for `club-options`, `carnivals/new`, etc., will be removed.
- [-] **DEPRECATED**: Page-specific help-config modules (`public/js/help-config-*.js`) are no longer needed.
- [x] Help-content markdown stubs (`docs/help-content/*.md`) will be used as the source material for populating the new database table.
- [x] **NEW**: Create the `HelpContent` database table and write a migration script.
- [x] **NEW**: Create an API endpoint to fetch help content by `pageIdentifier`.
- [x] **NEW**: Refactor the JavaScript help system to support the new global button and API.
- [x] **NEW**: Add a `data-page-id` attribute to the `<body>` tag of each view to inform the JavaScript which page is active.
- [x] Continue populating the `HelpContent` table for all pages per the Page-by-Page plan (initial 8 pages complete).
- [x] Add unit/integration tests for the new `helpSystem` and API endpoint.

---

## Page-by-Page Implementation Plan

Each page listed below requires a single entry in the `HelpContent` database table.

#### 1. Homepage (`/`)
**Target Audience**: New visitors, potential delegates
**Help Topics Needed in HelpContent**:
- [ ] **Welcome Overview** (hero section) - What is Old Man Footy?
- [ ] **Upcoming Carnivals** - How to view and register for carnivals
- [ ] **Quick Stats** - Understanding the numbers displayed
- [ ] **Club Search** - How to find clubs in your area
- [ ] **Get Started CTA** - What happens when you register

#### 2. About Page (`/about`)
**Target Audience**: New visitors
**Help Topics Needed in HelpContent**:
- [ ] **Platform Purpose** - What Old Man Footy does
- [ ] **How It Works** - Basic workflow explanation
- [ ] **Club Delegate Role** - What delegates do
- [ ] **Carnival Organization** - How carnivals are managed

#### 3. Contact Page (`/contact`)
**Target Audience**: All users
**Help Topics Needed in HelpContent**:
- [ ] **Contact Form** - How to submit inquiries
- [ ] **Subject Selection** - When to use each category
- [ ] **Club Name Field** - When and why to provide club info
- [ ] **Newsletter Signup** - Benefits of subscribing

#### 4. Sponsors List (`/sponsors`)
**Target Audience**: Delegates, carnival organizers
**Help Topics Needed in HelpContent**:
- [ ] **Sponsor Search** - How to find sponsors
- [ ] **Filter System** - Using state and level filters
- [ ] **Sponsor Levels** - Understanding Gold/Silver/Bronze
- [ ] **Contact Process** - How to connect with sponsors
- [ ] **Stats Bar** - What the numbers mean

#### 5. Clubs List (`/clubs`)
**Target Audience**: Potential delegates, visitors
**Help Topics Needed in HelpContent**:
- [ ] **Club Search** - Finding clubs by name/location
- [ ] **State Filter** - Filtering by Australian state
- [ ] **Club Cards** - Understanding club information display
- [ ] **Contact Delegate** - How to reach out to join
- [ ] **Club Profiles** - What detailed info is available

#### 6. Carnivals List (`/carnivals`)
**Target Audience**: Players, delegates
**Help Topics Needed in HelpContent**:
- [ ] **Carnival Filters** - Using state and date filters
- [ ] **Carnival Cards** - Understanding event information
- [ ] **Registration Links** - How to register for events
- [ ] **Date Information** - Understanding carnival timing
- [ ] **Location Details** - Finding carnival venues

#### 7. Individual Sponsor Profile (`/sponsors/:id`)
**Target Audience**: Delegates, carnival organizers
**Help Topics Needed in HelpContent**:
- [ ] **Contact Information** - How to reach the sponsor
- [ ] **Social Media Links** - Connecting on different platforms
- [ ] **Business Details** - Understanding sponsor capabilities
- [ ] **Past Partnerships** - Learning from previous collaborations

#### 8. Individual Club Profile (`/clubs/:id`)
**Target Audience**: Potential members, other delegates
**Help Topics Needed in HelpContent**:
- [ ] **Club Leadership** - Understanding delegate structure
- [ ] **Club Statistics** - What the numbers represent
- [ ] **Contact Options** - How to get in touch
- [ ] **Social Media** - Following club updates

#### 9. Individual Carnival Profile (`/carnivals/:id`)
**Target Audience**: Players, delegates
**Help Topics Needed in HelpContent**:
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
**Help Topics Needed in HelpContent**:
- [ ] **Login Form** - How to sign in
- [ ] **Password Requirements** - What makes a valid password
- [ ] **Forgot Password** - Recovery process
- [ ] **Registration Link** - For new users

#### 11. Registration Page (`/auth/register`)
**Target Audience**: New users
**Help Topics Needed in HelpContent**:
- [ ] **Registration Form** - Required vs optional fields
- [ ] **Password Strength** - Creating secure passwords
- [ ] **Email Validation** - Why email verification matters
- [ ] **Phone Number** - Formatting requirements
- [ ] **Terms Agreement** - What you're agreeing to

#### 12. Invitation Acceptance (`/auth/invite/:token`)
**Target Audience**: Invited users
**Help Topics Needed in HelpContent**:
- [ ] **Invitation Process** - What happens when you accept
- [ ] **Club Association** - How you'll be connected to the club
- [ ] **Delegate Role** - What privileges you'll have
- [ ] **Next Steps** - What to do after accepting

---

### Club Management Pages

#### 13. Club Options (`/clubs/options`)
**Target Audience**: Users without clubs
**Help Topics Needed in HelpContent**:
- [ ] **Create vs Join** - Understanding the two paths
- [ ] **Club Creation Form** - Required information
- [ ] **Autocomplete Search** - Finding existing clubs
- [ ] **State Selection** - Choosing correct location
- [ ] **Primary Delegate** - What this role means
- [ ] **Claimable Clubs** - Special invitation system

#### 14. Club Management Dashboard (`/clubs/manage`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
- [ ] **Delegate Overview** - Your role and responsibilities
- [ ] **Quick Actions** - Common management tasks
- [ ] **Club Statistics** - Understanding your club's metrics
- [ ] **Recent Activity** - What the activity feed shows
- [ ] **Navigation Menu** - Accessing different management areas

#### 15. Club Profile Edit (`/clubs/manage/profile`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
- [ ] **Profile Fields** - What each field is for
- [ ] **Image Upload** - Logo and photo requirements
- [ ] **Social Media** - Setting up social links
- [ ] **Contact Information** - Managing delegate contacts
- [ ] **Visibility Settings** - Public vs private club settings

#### 16. Club Sponsors Management (`/clubs/manage/sponsors`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
- [ ] **Current Sponsors** - Managing existing partnerships
- [ ] **Add New Sponsor** - Finding and adding sponsors
- [ ] **Sponsor Priority** - Ordering sponsor display
- [ ] **Remove Sponsors** - Ending partnerships safely

#### 17. Add Club Sponsor (`/clubs/manage/sponsors/add`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
- [ ] **Sponsor Search** - Finding available sponsors
- [ ] **Existing vs New** - When to use each option
- [ ] **Contact Process** - Reaching out to sponsors
- [ ] **Partnership Benefits** - What sponsors provide

#### 18. Club Alternate Names (`/clubs/manage/alternate-names`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
- [ ] **Alternate Names** - Why they're useful
- [ ] **Search Optimization** - Improving discoverability
- [ ] **Name Management** - Adding, editing, removing names
- [ ] **Best Practices** - Choosing effective alternate names

#### 19. Create Club on Behalf (`/clubs/create-on-behalf`)
**Target Audience**: Delegates, admins
**Help Topics Needed in HelpContent**:
- [ ] **Proxy Creation** - When and why to use this
- [ ] **Invitation Email** - What the invitee receives
- [ ] **Club Setup** - Pre-configuring the new club
- [ ] **Delegate Transfer** - Handing over control

#### 20. Claim Club Ownership (`/clubs/:id/claim`)
**Target Audience**: Invited users
**Help Topics Needed in HelpContent**:
- [ ] **Ownership Claim** - What claiming means
- [ ] **Delegate Responsibilities** - Your new role
- [ ] **Club Transition** - What happens to the previous setup
- [ ] **Getting Started** - First steps as delegate

---

### Carnival Management Pages

#### 21. Carnival Creation (`/carnivals/new`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
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
**Help Topics Needed in HelpContent**:
- [ ] **Edit Permissions** - Who can modify carnivals
- [ ] **Change Tracking** - What changes are logged
- [ ] **Date Modifications** - Impact of date changes
- [ ] **Registration Updates** - Managing existing registrations

#### 23. Carnival Detail View (`/carnivals/:id`)
**Target Audience**: Players, delegates
**Help Topics Needed in HelpContent**:
- [ ] **Event Information** - Understanding carnival details
- [ ] **Registration Process** - How to sign up
- [ ] **Club Participation** - How clubs get involved
- [ ] **Contact Organizers** - Getting more information

#### 24. Carnival Sponsors (`/carnivals/:id/sponsors`)
**Target Audience**: Carnival organizers
**Help Topics Needed in HelpContent**:
- [ ] **Sponsor Management** - Adding carnival sponsors
- [ ] **Sponsor Benefits** - What sponsors receive
- [ ] **Display Priority** - Ordering sponsor visibility
- [ ] **Partnership Tracking** - Managing sponsor relationships

#### 25. Carnival Players (`/carnivals/:id/players`)
**Target Audience**: Carnival organizers
**Help Topics Needed in HelpContent**:
- [ ] **Player Overview** - Understanding participant data
- [ ] **Club Breakdown** - Players by club
- [ ] **Registration Status** - Tracking signups
- [ ] **Contact Players** - Reaching participants

#### 26. Carnival Attendees (`/carnivals/:id/attendees`)
**Target Audience**: Carnival organizers
**Help Topics Needed in HelpContent**:
- [ ] **Club Management** - Managing participating clubs
- [ ] **Registration Tracking** - Club signup status
- [ ] **Communication** - Sending updates to clubs
- [ ] **Capacity Management** - Handling participant limits

---

### Player Management Pages

#### 27. Club Players List (`/clubs/players`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
- [ ] **Player Management** - Overview of player functions
- [ ] **Add Players** - How to register new players
- [ ] **Player Status** - Understanding player states
- [ ] **Bulk Actions** - Managing multiple players

#### 28. Add Club Player (`/clubs/players/add`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
- [ ] **Player Information** - Required player details
- [ ] **Contact Details** - Managing player communication
- [ ] **Registration Process** - Step-by-step signup
- [ ] **Privacy Considerations** - Data handling

#### 29. Edit Club Player (`/clubs/players/:id/edit`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
- [ ] **Edit Permissions** - Who can modify players
- [ ] **Change Tracking** - What modifications are logged
- [ ] **Data Validation** - Ensuring accurate information
- [ ] **Update Notifications** - When players are notified

#### 30. Carnival Club Players (`/carnivals/:id/club-players`)
**Target Audience**: Club delegates
**Help Topics Needed in HelpContent**:
- [ ] **Carnival Registration** - Registering club for event
- [ ] **Player Selection** - Choosing which players attend
- [ ] **Registration Deadlines** - Important dates
- [ ] **Payment Processing** - Handling fees

---

### Admin Panel Pages

#### 31. Admin Dashboard (`/admin/dashboard`)
**Target Audience**: System administrators
**Help Topics Needed in HelpContent**:
- [ ] **Admin Overview** - Understanding admin responsibilities
- [ ] **System Statistics** - Interpreting dashboard metrics
- [ ] **Quick Actions** - Common administrative tasks
- [ ] **Navigation** - Accessing different admin sections

#### 32. User Management (`/admin/users`)
**Target Audience**: System administrators
**Help Topics Needed in HelpContent**:
- [ ] **User Search** - Finding specific users
- [ ] **User Status** - Understanding account states
- [ ] **Edit Users** - Modifying user information
- [ ] **Security Actions** - Password resets and status changes

#### 33. Club Management (`/admin/clubs`)
**Target Audience**: System administrators
**Help Topics Needed in HelpContent**:
- [ ] **Club Oversight** - Administrative club management
- [ ] **Status Controls** - Activating/deactivating clubs
- [ ] **Delegate Management** - Managing club leadership
- [ ] **Bulk Operations** - Managing multiple clubs

#### 34. Carnival Management (`/admin/carnivals`)
**Target Audience**: System administrators
**Help Topics Needed in HelpContent**:
- [ ] **Carnival Oversight** - Administrative carnival management
- [ ] **Status Controls** - Managing carnival states
- [ ] **Ownership Management** - Handling carnival ownership
- [ ] **System Integration** - MySideline synchronization

#### 35. Sponsor Management (`/admin/sponsors`)
**Target Audience**: System administrators
**Help Topics Needed in HelpContent**:
- [ ] **Sponsor Administration** - Managing sponsor database
- [ ] **Verification Process** - Validating sponsor information
- [ ] **Status Management** - Controlling sponsor visibility
- [ ] **Bulk Operations** - Managing multiple sponsors

#### 36. Audit Logs (`/admin/audit-logs`)
**Target Audience**: System administrators
**Help Topics Needed in HelpContent**:
- [ ] **Log Interpretation** - Understanding audit entries
- [ ] **Search Filters** - Finding specific activities
- [ ] **Export Functions** - Generating audit reports
- [ ] **Security Monitoring** - Identifying suspicious activity

#### 37. Reports (`/admin/reports`)
**Target Audience**: System administrators
**Help Topics Needed in HelpContent**:
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
