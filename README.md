# Old Man Footy: Rugby League Masters Carnival Management Platform

A comprehensive web application for managing Rugby League Masters carnivals across Australia. This platform allows club delegates to create, manage, and promote rugby league carnivals while providing a centralized directory for players and fans to discover upcoming tournaments.

> **⚠️ Important Notice:** This repository is made publicly available for transparency and community oversight of how the Old Man Footy platform operates. The source code is **NOT intended for replication, deployment, or commercial use** by other parties. Please see the [LICENSE](LICENSE) file for detailed terms and conditions.
> 
> **🌐 Live Platform:** Visit [oldmanfooty.au](https://oldmanfooty.au) to use the official platform.

## 🏉 Features

### Core Functionality

- **Carnival Management:** Create, edit, and delete carnivals with comprehensive details
- **Club & Player Management:** Manage club information and player registrations
- **Sponsor Management:** Handle carnival and club sponsorships
- **Multi-State Support:** Support for all Australian states (NSW, QLD, VIC, WA, SA, TAS, NT, ACT)
- **File Uploads:** Club logos, promotional images, and draw files with organized storage
- **Social Media Integration:** Facebook, Instagram, Twitter, and website links
- **Advanced Search & Filtering:** Filter by state, search terms, and upcoming carnivals
- **Email Subscriptions:** State-based email notifications for carnival updates
- **MySideline Integration:** Automated import and synchronization of carnivals from MySideline platform

### User Management

- **Authentication System:** Secure user registration and login with Passport.js
- **Role-based Access:** Club delegates can manage their carnivals and players
- **Admin Panel:** Administrative interface for system management
- **Dashboard:** Personalized view of user's carnivals and activities
- **Audit Logging:** Comprehensive tracking of user actions and system changes

### Contact Support Pipeline

- **Database Persistence:** Every contact form submission is stored before any email is dispatched
- **Transactional Delivery:** Contact notifications and admin replies use Resend API (not Gmail SMTP)
- **Admin Contact Inbox:** Secure admin views for triage, status updates, and direct replies
- **Reply Retention:** Contact reply logs are retained for 1 year and then automatically removed

#### Required Environment Variables (Contact + Resend)

- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=<your resend api key>`
- `EMAIL_FROM=no_reply@oldmanfooty.au`
- `EMAIL_FROM=noreply@oldmanfooty.au`
- `SUPPORT_EMAIL=support@oldmanfooty.au`
- `CONTACT_REPLY_RETENTION_DAYS=365` (optional; default 365)
- `CONTACT_REPLY_RETENTION_CRON="30 3 * * *"` (optional; default daily 3:30 AM)

#### DNS Authentication (Transactional Sender)

- **SPF:** Add provider include record for the sending domain/subdomain
- **DKIM:** Publish all Resend-provided DKIM selector records
- **DMARC:** Start with `p=none` monitoring, then raise to `quarantine`/`reject` after alignment checks

### Enhanced User Experience

- **Responsive Design:** Mobile-optimized interface with Bootstrap 5
- **Drag & Drop Uploads:** Enhanced file upload experience
- **Real-time Search:** Auto-submit filtering with debouncing
- **Accessibility Features:** Screen reader support and keyboard navigation
- **Maintenance & Coming Soon Modes:** System-wide status management
- **Security Headers:** Helmet.js integration for enhanced security

## 🚀 Technology Stack

- **Backend:** Node.js with Express.js 5.x
- **Module System:** ES Modules (ESM) - modern import/export syntax
- **Database:** SQLite with Sequelize ORM v6
- **Authentication:** Passport.js with local strategy
- **File Uploads:** Multer for handling multipart/form-data
- **Frontend:** EJS templating engine with express-ejs-layouts
- **Styling:** Bootstrap 5 with custom CSS and dark/light mode support
- **JavaScript:** Modern ES2020+ with vanilla browser APIs
- **Testing:** Vitest with comprehensive coverage reporting
- **Security:** Helmet.js, express-validator, bcrypt password hashing
- **Web Scraping:** Playwright for MySideline integration
- **Task Scheduling:** node-cron for automated data synchronization

## 📖 About This Repository

This codebase is shared publicly to:

- **Provide Transparency:** Allow the rugby league masters community to understand how their data is managed and protected
- **Enable Community Oversight:** Allow security researchers and community members to review our practices
- **Facilitate Contributions:** Accept bug reports, security issues, and improvement suggestions from the community
- **Demonstrate Best Practices:** Showcase modern web development practices in a real-world application

**This is NOT a template or starter project** - it's the actual production codebase of a live commercial service made available for transparency.

## 🗂️ Project Structure

```
├── .dockerignore                            # Docker ignore patterns
├── .env.*                                   # Environment configuration files
├── .github/                                 # GitHub Actions and repository configuration
├── .gitignore                               # Git ignore patterns
├── .prettierrc                              # Code formatting configuration
├── .sequelizerc                             # Sequelize CLI configuration
├── .vscode/                                 # VS Code workspace settings
├── app.mjs                                  # Main application entry point (ES Module)
├── package.json                             # Project dependencies and scripts
├── package-lock.json                        # Dependency lock file
├── docker-compose.*.yml                     # Docker configuration files
├── Dockerfile                               # Docker container definition
├── LICENSE                                  # Custom proprietary license
├── README.md                                # This documentation file
├── vitest.config.*.mjs                      # Vitest testing configuration files
├── config/                                  # Application configuration
│   ├── config.cjs                              # Legacy CommonJS configuration
│   ├── config.mjs                              # Main application configuration
│   ├── constants.mjs                           # Application constants and enums
│   ├── database.mjs                            # Database connection and setup
│   └── database-optimizer.mjs                  # Database performance optimization
├── controllers/                             # MVC Controllers - Handle HTTP requests
│   ├── admin.controller.mjs                    # Admin panel functionality
│   ├── auth.controller.mjs                     # User authentication logic (including subscription features)
│   ├── carnival.controller.mjs                 # Carnival management operations
│   ├── carnivalClub.controller.mjs             # Carnival-club relationships
│   ├── carnivalSponsor.controller.mjs          # Carnival sponsorship
│   ├── club.controller.mjs                     # Club management operations (including sponsor management)
│   ├── clubPlayer.controller.mjs               # Club player management
│   ├── comingSoon.controller.mjs               # Coming soon page handling
│   ├── help.controller.mjs                     # Help system and documentation
│   ├── main.controller.mjs                     # Main application routes
│   ├── maintenance.controller.mjs              # Maintenance mode handling
│   ├── subscription.controller.mjs             # Email subscription management
│   └── api/                                    # API-specific controllers
│       └── subscription.controller.mjs             # Public subscription API controller
├── data/                                    # Database files
│   ├── dev-old-man-footy.db                    # Development SQLite database
│   └── test-old-man-footy.db                   # Test SQLite database
├── docs/                                    # Project documentation
│   ├── ARCHIVE/                                # Archived documentation
│   ├── help/                                   # Help system content and guides
│   ├── plans/                                  # Project planning and development docs
│   ├── DATABASE_SEEDING.md                     # Database seeding guide
│   ├── PRODUCTION_DOCKER_MAINTENANCE.md        # Production maintenance guide
│   └── RATE_LIMITING_OPTIMIZATION.md           # Rate limiting documentation
├── middleware/                              # Express middleware functions
│   ├── asyncHandler.mjs                        # Async error handling middleware
│   ├── auth.mjs                                # Authentication middleware
│   ├── comingSoon.mjs                          # Coming soon mode middleware
│   ├── failureCounterStore.mjs                 # Rate limiting failure tracking
│   ├── flash.mjs                               # Flash message middleware
│   ├── formUpload.mjs                          # Form file upload middleware (logos, images)
│   ├── galleryUpload.mjs                       # Gallery image upload middleware
│   ├── maintenance.mjs                         # Maintenance mode middleware
│   ├── security.mjs                            # Security headers and protection
│   └── validation.mjs                          # Input validation middleware
├── migrations/                              # Sequelize database migrations
│   └── *.mjs                                    # Database schema migration files
├── models/                                  # MVC Models - Database schemas and logic
│   ├── AuditLog.mjs                            # Audit logging model
│   ├── Carnival.mjs                            # Carnival data model
│   ├── CarnivalClub.mjs                        # Carnival-club relationship model
│   ├── CarnivalClubPlayer.mjs                  # Carnival club player model
│   ├── CarnivalSponsor.mjs                     # Carnival sponsorship model
│   ├── Club.mjs                                # Club information model
│   ├── ClubAlternateName.mjs                   # Club alternate names model
│   ├── ClubPlayer.mjs                          # Club player model
│   ├── EmailSubscription.mjs                   # Email subscription model
│   ├── HelpContent.mjs                         # Help system content model
│   ├── ImageUpload.mjs                         # Image upload management model
│   ├── index.mjs                               # Model index and associations
│   ├── Sponsor.mjs                             # Sponsor information model
│   ├── SyncLog.mjs                             # Data synchronization logging
│   └── User.mjs                                # User account model
├── public/                                  # Static assets served to clients
│   ├── icons/                                  # Application icons and favicons
│   ├── js/                                     # Client-side JavaScript files
│   ├── screenshots/                            # Documentation screenshots
│   ├── styles/                                 # CSS stylesheets with light/dark themes
│   └── uploads/                                # User-uploaded files directory
├── routes/                                  # Express route definitions
│   ├── admin.mjs                               # Admin panel routes
│   ├── auth.mjs                                # Authentication routes
│   ├── carnivalClubs.mjs                       # Carnival club management routes
│   ├── carnivals.mjs                           # Carnival management routes
│   ├── carnivalSponsors.mjs                    # Carnival sponsor routes
│   ├── clubPlayers.mjs                         # Club player management routes
│   ├── clubs.mjs                               # Club management routes
│   ├── index.mjs                               # Main application routes
│   ├── subscription.mjs                        # Email subscription routes
│   └── api/                                    # API route definitions
│       ├── help.mjs                               # Help system API routes
│       ├── images.mjs                             # Image management API routes
│       ├── index.mjs                              # API routes index
│       ├── sponsors.mjs                           # Sponsor API routes
│       └── subscriptions.mjs                      # Public subscription API routes
├── scripts/                                 # Utility and maintenance scripts
│   ├── capture-mysideline-data.mjs             # MySideline data capture script
│   ├── check-sync-status.mjs                   # Sync status checking utility
│   ├── fix-jest-globals.mjs                    # Jest configuration fix utility
│   ├── generate-secret.mjs                     # Secret key generation utility
│   ├── manual-mysideline-sync.mjs              # Manual MySideline synchronization
│   ├── purge-seed-data.mjs                     # Database seed data cleanup
│   ├── run-migrations.mjs                      # Database migration runner
│   ├── scheduled-maintenance.mjs               # Scheduled maintenance tasks
│   ├── seed-database.mjs                       # Database seeding script
│   ├── seed-help-content.mjs                   # Help content seeding script
│   ├── smoke-health.mjs                        # Health check smoke tests
│   ├── fixtures/                               # Test fixture data
│   ├── tests/                                  # Script testing utilities
│   └── utilities/                              # Utility script modules
├── services/                                # Business logic services and utilities
│   ├── auditService.mjs                        # Audit logging service
│   ├── carouselImageService.mjs                # Image carousel management
│   ├── imageUploadService.mjs                  # Image upload processing service
│   ├── mySidelineCarnivalParserService.mjs     # Carnival parsing service
│   ├── mySidelineDataService.mjs               # MySideline data processing
│   ├── mySidelineIntegrationService.mjs        # Main MySideline integration service
│   ├── mySidelineLogoDownloadService.mjs       # Logo downloading service
│   ├── mySidelineScraperService.mjs            # Web scraping service
│   ├── sponsorSortingService.mjs               # Sponsor sorting logic
│   └── email/                                  # Email service modules
│       ├── AuthEmailService.mjs                   # Authentication-related emails
│       ├── BaseEmailService.mjs                   # Base email service functionality
│       ├── CarnivalEmailService.mjs               # Carnival notification emails
│       ├── ContactEmailService.mjs                # Contact form emails
│       ├── InvitationEmailService.mjs             # User invitation emails
│       └── SecurityEmailService.mjs               # Security notification emails
├── tests/                                   # Test files and utilities
│   ├── config/                                 # Configuration tests
│   ├── controllers/                            # Controller unit tests
│   ├── fixtures/                               # Test data fixtures
│   ├── integration/                            # Integration tests
│   ├── js/                                     # JavaScript/frontend tests
│   ├── middleware/                             # Middleware tests
│   ├── models/                                 # Model unit tests
│   ├── scripts/                                # Script tests
│   ├── services/                               # Service layer tests
│   ├── views/                                  # View/template tests
│   ├── setup.mjs                               # Test setup configuration
│   ├── teardown.mjs                            # Test cleanup configuration
│   ├── vitest.env.mjs                          # Test environment variables
│   └── vitest.setup.mjs                        # Vitest test configuration
├── utils/                                   # Utility functions and helpers
│   ├── dateUtils.mjs                           # Date formatting and manipulation utilities
│   ├── uiHelpers.mjs                           # UI helper functions
│   ├── uploadProcessor.mjs                     # File upload processing utilities
│   └── viewHelpers.mjs                         # EJS view helper functions
└── views/                                   # EJS templates - MVC Views
    ├── about.ejs                               # About page template
    ├── contact.ejs                             # Contact page template
    ├── coming-soon.ejs                         # Coming soon page template
    ├── dashboard.ejs                           # User dashboard template
    ├── error.ejs                               # Error page template
    ├── index.ejs                               # Homepage template
    ├── layout.ejs                              # Main layout template
    ├── maintenance.ejs                         # Maintenance mode template
    ├── admin/                                  # Admin panel view templates
    │   ├── audit-logs.ejs                         # Audit logs management
    │   ├── carnival-players.ejs                   # Carnival player management
    │   ├── carnivals.ejs                          # Admin carnival management
    │   ├── claim-carnival.ejs                     # Carnival ownership claiming
    │   ├── clubs.ejs                              # Admin club management
    │   ├── dashboard.ejs                          # Admin dashboard
    │   ├── edit-carnival.ejs                      # Admin carnival editing
    │   ├── edit-club.ejs                          # Admin club editing
    │   ├── edit-user.ejs                          # Admin user editing
    │   ├── reports.ejs                            # System reports
    │   ├── stats.ejs                              # System statistics
    │   └── users.ejs                              # User management
    ├── auth/                                   # Authentication views
    │   ├── accept-invitation.ejs                  # User invitation acceptance
    │   ├── login.ejs                              # User login form
    │   └── register.ejs                           # User registration form
    ├── carnivals/                              # Carnival management view templates
    │   ├── add-club.ejs                           # Add club to carnival
    │   ├── add-players.ejs                        # Add players to carnival
    │   ├── all-players.ejs                        # View all carnival players
    │   ├── attendees.ejs                          # Carnival attendee management
    │   ├── club-players.ejs                       # Club-specific player views
    │   ├── edit-registration.ejs                  # Edit carnival registration
    │   ├── edit.ejs                               # Edit carnival details
    │   ├── list.ejs                               # List all carnivals
    │   ├── my-club-players.ejs                    # User's club players view
    │   ├── new.ejs                                # Create new carnival
    │   ├── players.ejs                            # Carnival player management
    │   ├── show.ejs                               # View carnival details
    │   └── sponsors.ejs                           # Carnival sponsor management
    ├── clubs/                                  # Club management view templates
    │   ├── add-sponsor.ejs                        # Add sponsor to club
    │   ├── alternate-names.ejs                    # Club alternate name management
    │   ├── claim-ownership.ejs                    # Club ownership claiming
    │   ├── club-options.ejs                       # Club configuration options
    │   ├── create-on-behalf.ejs                   # Create club on behalf of user
    │   ├── edit-sponsor.ejs                       # Edit club sponsor details
    │   ├── gallery.ejs                            # Club photo gallery
    │   ├── list.ejs                               # List all clubs
    │   ├── manage.ejs                             # Club management dashboard
    │   ├── show.ejs                               # View club details
    │   ├── sponsors.ejs                           # Club sponsor management
    │   └── players/                               # Club player management views
    │       ├── add.ejs                               # Add new club player
    │       ├── edit.ejs                              # Edit club player details
    │       └── index.ejs                             # Club player listing
    ├── partials/                               # Reusable template components
    │   ├── carnival-address.ejs                   # Carnival address formatting
    │   ├── carnival-date.ejs                      # Carnival date formatting
    │   ├── flash-messages.ejs                     # Flash message display
    │   ├── gallery.ejs                            # Gallery component
    │   ├── help-modal.ejs                         # Help modal component
    ├── shared/                                 # Shared template components
    ├── unsubscribe.ejs                         # Email unsubscribe page
    └── unsubscribe-success.ejs                 # Unsubscribe confirmation page
```

## 🎯 Usage

### For Club Delegates

1. **Register an Account:** Sign up with your club details
2. **Create Carnivals:** Add new carnivals with complete information
3. **Manage Carnivals:** Edit, update, or delete your carnivals
4. **Player Management:** Add and manage club players
5. **Upload Files:** Add club logos, promotional images, and draw files
6. **Claim MySideline Carnivals:** Take ownership of imported carnivals
7. **Sponsor Management:** Add and manage carnival/club sponsors

### For Players and Fans

1. **Browse Carnivals:** View all upcoming carnivals with detailed information
2. **Filter Carnivals:** Search by state, location, or keywords
3. **Subscribe to Updates:** Get email notifications for specific states
4. **View Details:** Access complete carnival information and contact details
5. **Club Information:** Browse club details and player rosters

### For Administrators

1. **System Management:** Monitor and manage system-wide settings
2. **User Management:** Oversee user accounts and permissions
3. **Data Synchronization:** Monitor MySideline integration status
4. **Audit Logs:** Review system activity and user actions

## 🔧 Development Information

> **Note:** The following technical information is provided for transparency and community contributions. This is **NOT** an invitation to deploy or replicate this platform.

### Technology Architecture

The platform utilizes modern web development practices with ES Modules, comprehensive testing, and security-first design principles. Key architectural decisions include:

- **ES Modules:** Modern import/export syntax for better performance and static analysis
- **MVC Pattern:** Strict separation of concerns between models, views, and controllers
- **Security Headers:** Comprehensive security implementation via Helmet.js
- **Database Optimization:** Automated performance tuning and backup systems
- **Test Coverage:** High test coverage standards with automated testing
- **Audit Logging:** Comprehensive tracking of user actions and system changes

### API Architecture

The platform provides a comprehensive RESTful API structure with proper authentication, authorization, and security. All authenticated endpoints require valid session authentication, and admin endpoints require administrative privileges.

#### 🔑 Authentication System (`/auth/*`)

**User Registration & Authentication**
- `GET /auth/register` - User registration form
- `POST /auth/register` - Create new user account with validation
- `GET /auth/login` - User login form
- `POST /auth/login` - Authenticate user credentials
- `POST /auth/logout` - Logout and destroy session
- `GET /auth/profile` - User profile management (authenticated)
- `POST /auth/profile` - Update user profile (authenticated)

**Password Management**
- `GET /auth/forgot-password` - Password reset request form
- `POST /auth/forgot-password` - Send password reset email
- `GET /auth/reset-password/:token` - Password reset form with token
- `POST /auth/reset-password/:token` - Process password reset

**User Invitations & Verification**
- `GET /auth/accept-invitation/:token` - Accept user invitation
- `POST /auth/accept-invitation/:token` - Process invitation acceptance
- `GET /auth/verify-email/:token` - Email verification endpoint

#### 🏠 Main Application Routes (`/`)

**Homepage & Core Pages**
- `GET /` - Homepage with upcoming carnivals and search
- `GET /about` - About page
- `GET /contact` - Contact form
- `POST /contact` - Submit contact form
- `GET /dashboard` - User dashboard with personal carnivals (authenticated)
- `GET /health` - System health check endpoint
- `GET /admin/stats` - Admin statistics API (admin only)

#### 🏉 Carnival Management (`/carnivals/*`)

**Carnival CRUD Operations**
- `GET /carnivals` - List all carnivals with filtering and search
- `GET /carnivals/new` - Create carnival form (authenticated)
- `POST /carnivals` - Create new carnival (authenticated)
- `GET /carnivals/:id` - View carnival details and attendee information
- `GET /carnivals/:id/edit` - Edit carnival form (owner/admin only)
- `POST /carnivals/:id` - Update carnival details (owner/admin only)
- `POST /carnivals/:id/delete` - Delete carnival (owner/admin only)

**Carnival Ownership & MySideline Integration**
- `GET /carnivals/:id/claim` - Claim MySideline carnival form (authenticated)
- `POST /carnivals/:id/claim` - Process carnival ownership claim (authenticated)
- `POST /carnivals/:id/transfer-ownership` - Transfer carnival ownership (owner/admin)

**Carnival Attendee Management**
- `GET /carnivals/:id/attendees` - View carnival attendees (owner/admin)
- `POST /carnivals/:id/attendees/email` - Email all attendees (owner/admin)
- `GET /carnivals/:id/all-players` - Export all carnival players (owner/admin)

**Carnival Gallery & Media**
- `GET /carnivals/:id/gallery` - Carnival photo gallery
- `POST /carnivals/:id/gallery/upload` - Upload gallery images (owner/admin)
- `DELETE /carnivals/:id/gallery/:imageId` - Delete gallery image (owner/admin)

#### 🏛️ Club Management (`/clubs/*`)

**Club CRUD Operations**
- `GET /clubs` - List all clubs with filtering
- `GET /clubs/:id` - View club details and information
- `GET /clubs/:id/edit` - Edit club form (owner/admin only)
- `POST /clubs/:id/edit` - Update club details (owner/admin only)
- `GET /clubs/:id/manage` - Club management dashboard (owner/admin only)

**Club Ownership & Creation**
- `GET /clubs/:id/claim-ownership` - Claim club ownership form (authenticated)
- `POST /clubs/:id/claim-ownership` - Process club ownership claim (authenticated)
- `GET /clubs/create-on-behalf` - Create club for other user form (admin only)
- `POST /clubs/create-on-behalf` - Create club for other user (admin only)

**Club Alternate Names Management**
- `GET /clubs/:id/alternate-names` - Manage club alternate names (owner/admin)
- `POST /clubs/:id/alternate-names` - Add alternate name (owner/admin)
- `DELETE /clubs/:id/alternate-names/:nameId` - Remove alternate name (owner/admin)

**Club Sponsor Management**
- `GET /clubs/:id/sponsors` - Club sponsor management (owner/admin)
- `GET /clubs/:id/sponsors/add` - Add sponsor form (owner/admin)
- `POST /clubs/:id/sponsors/add` - Add sponsor to club (owner/admin)
- `GET /clubs/:id/sponsors/:sponsorId/edit` - Edit club sponsor (owner/admin)
- `POST /clubs/:id/sponsors/:sponsorId/edit` - Update club sponsor (owner/admin)
- `DELETE /clubs/:id/sponsors/:sponsorId` - Remove club sponsor (owner/admin)

**Club Gallery & Media**
- `GET /clubs/:id/gallery` - Club photo gallery
- `POST /clubs/:id/gallery/upload` - Upload gallery images (owner/admin)
- `DELETE /clubs/:id/gallery/:imageId` - Delete gallery image (owner/admin)

**Club Options & Configuration**
- `GET /clubs/:id/club-options` - Club configuration options (owner/admin)
- `POST /clubs/:id/club-options` - Update club configuration (owner/admin)

#### 👥 Club Players Management (`/clubs/players/*`)

**Player CRUD Operations**
- `GET /clubs/:clubId/players` - List club players (owner/admin)
- `GET /clubs/:clubId/players/add` - Add player form (owner/admin)
- `POST /clubs/:clubId/players` - Create new club player (owner/admin)
- `GET /clubs/:clubId/players/:playerId/edit` - Edit player form (owner/admin)
- `POST /clubs/:clubId/players/:playerId` - Update player details (owner/admin)
- `DELETE /clubs/:clubId/players/:playerId` - Delete/deactivate player (owner/admin)

**Player Data Management**
- `GET /clubs/:clubId/players/export` - Export players to CSV (owner/admin)
- `GET /clubs/:clubId/players/import` - Import players form (owner/admin)
- `POST /clubs/:clubId/players/import` - Import players from CSV (owner/admin)
- `POST /clubs/:clubId/players/validate-csv` - Validate CSV before import (owner/admin)

**Player Status Management**
- `POST /clubs/:clubId/players/:playerId/reactivate` - Reactivate deactivated player (owner/admin)
- `GET /clubs/:clubId/players/inactive` - View inactive/deactivated players (owner/admin)

#### 🎪 Carnival Club Registration (`/carnival-clubs/*`)

**Carnival Registration Management**
- `GET /carnival-clubs/:carnivalId/register` - Club registration form (authenticated)
- `POST /carnival-clubs/:carnivalId/register` - Register club for carnival (authenticated)
- `GET /carnival-clubs/:registrationId/edit` - Edit registration (owner/admin)
- `POST /carnival-clubs/:registrationId/edit` - Update registration (owner/admin)
- `DELETE /carnival-clubs/:registrationId` - Cancel registration (owner/admin)

**Player Management for Carnival Registration**
- `GET /carnival-clubs/:registrationId/players` - Manage registered players (owner/admin)
- `POST /carnival-clubs/:registrationId/players` - Add players to registration (owner/admin)
- `DELETE /carnival-clubs/:registrationId/players/:playerId` - Remove player from registration (owner/admin)

**Registration Status & Approval**
- `POST /carnival-clubs/:registrationId/approve` - Approve registration (carnival owner/admin)
- `POST /carnival-clubs/:registrationId/reject` - Reject registration (carnival owner/admin)
- `GET /carnival-clubs/:carnivalId/attendees` - View all attendees (carnival owner/admin)

#### 🤝 Carnival Sponsors Management (`/carnival-sponsors/*`)

**Carnival Sponsor CRUD**
- `GET /carnival-sponsors/:carnivalId` - List carnival sponsors (owner/admin)
- `GET /carnival-sponsors/:carnivalId/add` - Add sponsor form (owner/admin)
- `POST /carnival-sponsors/:carnivalId/add` - Add sponsor to carnival (owner/admin)
- `GET /carnival-sponsors/:carnivalId/:sponsorId/edit` - Edit carnival sponsor (owner/admin)
- `POST /carnival-sponsors/:carnivalId/:sponsorId/edit` - Update carnival sponsor (owner/admin)
- `DELETE /carnival-sponsors/:carnivalId/:sponsorId` - Remove carnival sponsor (owner/admin)

**Sponsor Display & Ordering**
- `POST /carnival-sponsors/:carnivalId/reorder` - Update sponsor display order (owner/admin)
- `GET /carnival-sponsors/:carnivalId/summary` - Sponsor summary report (owner/admin)

#### 📧 Subscription System (`/subscriptions/*`)

**Email Subscription Management**
- `GET /subscriptions` - Subscription management form
- `POST /subscriptions` - Create/update email subscription
- `GET /subscriptions/preferences` - Subscription preferences (authenticated)
- `POST /subscriptions/preferences` - Update subscription preferences (authenticated)
- `GET /subscriptions/unsubscribe/:token` - Unsubscribe with token
- `POST /subscriptions/unsubscribe/:token` - Process unsubscription
- `GET /subscriptions/verify/:token` - Verify email subscription

#### 🛠️ Admin Interface (`/admin/*`)

**Admin Dashboard & Overview**
- `GET /admin` - Admin dashboard with system overview (admin only)
- `GET /admin/stats` - Detailed system statistics API (admin only)

**User Management**
- `GET /admin/users` - User management interface (admin only)
- `GET /admin/users/:id/edit` - Edit user form (admin only)
- `POST /admin/users/:id/edit` - Update user details (admin only)
- `DELETE /admin/users/:id` - Delete user account (admin only)
- `POST /admin/users/invite` - Send user invitation (admin only)

**Club Administration**
- `GET /admin/clubs` - Club administration interface (admin only)
- `GET /admin/clubs/:id/edit` - Edit club as admin (admin only)
- `POST /admin/clubs/:id/edit` - Update club as admin (admin only)
- `DELETE /admin/clubs/:id` - Delete club (admin only)

**Carnival Administration**
- `GET /admin/carnivals` - Carnival administration interface (admin only)
- `GET /admin/carnivals/:id/edit` - Edit carnival as admin (admin only)
- `POST /admin/carnivals/:id/edit` - Update carnival as admin (admin only)
- `GET /admin/carnivals/:id/players` - View carnival players (admin only)
- `DELETE /admin/carnivals/:id` - Delete carnival (admin only)

**Carnival Ownership & Claims**
- `GET /admin/claim-carnival` - Carnival ownership claims interface (admin only)
- `POST /admin/claim-carnival/:claimId/approve` - Approve carnival claim (admin only)
- `POST /admin/claim-carnival/:claimId/reject` - Reject carnival claim (admin only)

**System Monitoring & Logs**
- `GET /admin/audit-logs` - System audit logs (admin only)
- `GET /admin/sync-logs` - MySideline sync status and logs (admin only)
- `POST /admin/sync/manual` - Trigger manual MySideline sync (admin only)
- `GET /admin/reports` - System reports and analytics (admin only)

#### 🌐 Public API Endpoints (`/api/*`)

**Sponsor Public API**
- `GET /api/sponsors` - Public sponsor search and listing with filters
- `GET /api/sponsors/:id` - Public sponsor details

**Image Management API**
- `POST /api/images/upload` - Upload images with permission validation (authenticated)
- `GET /api/images/:id` - Retrieve image details (authenticated)
- `DELETE /api/images/:id` - Delete image with permission check (authenticated)
- `POST /api/images/:id/set-primary` - Set primary image for entity (authenticated)
- `GET /api/images/carousel/:entityType/:entityId` - Get carousel images for entity
- `POST /api/images/reorder` - Reorder images for entity (authenticated)

**Help System API**
- `GET /api/help/:topic` - Get help content for specific topic
- `GET /api/help` - List all available help topics

**Public Subscription API**
- `POST /api/subscriptions/subscribe` - Public subscription endpoint with bot protection
- `POST /api/subscriptions/unsubscribe` - Public unsubscription endpoint
- `GET /api/subscriptions/verify/:token` - Email verification for subscriptions

**System Status API**
- `GET /api/status` - Public system status and maintenance information
- `GET /api/health` - System health check endpoint

#### 🔒 Security & Middleware

**Authentication Requirements**
- `(authenticated)` - Requires valid user session
- `(owner only)` - Requires ownership of the resource or admin privileges
- `(admin only)` - Requires administrative privileges
- `(carnival owner/admin)` - Requires carnival ownership or admin privileges

**Security Features**
- CSRF protection on all state-changing operations
- Input validation and sanitization on all endpoints
- Rate limiting on authentication and public endpoints
- File upload validation and virus scanning
- Bot protection on public subscription endpoints
- Audit logging for all administrative actions

## 🚀 Production Platform

The Old Man Footy platform is professionally deployed and maintained as a commercial service:

- **Live Platform:** [oldmanfooty.au](https://oldmanfooty.au)
- **Production Environment:** Dockerized deployment with automated maintenance
- **High Availability:** Load balancing and failover protection
- **Data Security:** Encrypted data storage and transmission
- **Regular Backups:** Automated daily backups with 30-day retention
- **Performance Monitoring:** Real-time system monitoring and alerting

### Platform Features

The live platform includes additional commercial features not visible in this open-source version:

- **Email Notifications:** Automated carnival and system notifications
- **Data Analytics:** Usage statistics and platform insights
- **Enhanced Security:** Advanced threat detection and prevention
- **Customer Support:** Dedicated support channels for users
- **Service Level Agreements:** Guaranteed uptime and performance standards

## 🤝 Community Contributions

We welcome community contributions to improve the platform:

### Acceptable Contributions

1. **Bug Reports:** Report security issues, bugs, or platform problems
2. **Feature Suggestions:** Propose improvements for the rugby league community
3. **Code Review:** Security audits and code quality improvements
4. **Documentation:** Improvements to technical documentation
5. **Community Feedback:** User experience insights and suggestions

### How to Contribute

1. **Issues:** Submit detailed bug reports or feature requests via GitHub Issues
2. **Security Issues:** Report security vulnerabilities privately to [support@oldmanfooty.au](mailto:support@oldmanfooty.au)
3. **Pull Requests:** Submit code improvements with detailed descriptions
4. **Community Discussion:** Engage in constructive discussion about platform improvements

### Important Guidelines

- **No Replication:** Do not attempt to replicate or deploy this platform elsewhere
- **Respect License:** Ensure all contributions comply with our license terms
- **Security Focus:** Prioritize security in all contributions
- **Community Benefit:** Focus on improvements that benefit the entire rugby league masters community

## 📄 License

This project is licensed under a **Custom Proprietary License** - see the [LICENSE](LICENSE) file for complete details.

### Key License Points

- **🔍 Transparency:** Source code is made available for community review and transparency
- **❌ No Replication:** Commercial use, redistribution, or independent deployment is **strictly prohibited**
- **✅ Community Contributions:** Bug reports, security audits, and improvement suggestions are welcomed
- **🏛️ Intellectual Property:** All rights reserved by Old Man Footy
- **⚖️ Legal Protection:** Violations may result in legal action under Australian law

**For commercial licensing inquiries:** [support@oldmanfooty.au](mailto:support@oldmanfooty.au)

## 🏉 About Rugby League Masters

Rugby League Masters is a rugby league format for players aged 35+ across Australia. This platform aims to streamline carnival organization and promote participation in masters rugby league competitions.

## 📞 Contact & Support

### For Users of the Platform
- **Live Platform:** [oldmanfooty.au](https://oldmanfooty.au)
- **User Support:** [support@oldmanfooty.au](mailto:support@oldmanfooty.au)
- **Community Forum:** Platform-specific support and discussions

### For Developers & Contributors
- **GitHub Issues:** Technical questions and bug reports
- **Security Issues:** [support@oldmanfooty.au](mailto:support@oldmanfooty.au) (private disclosure)
- **Feature Requests:** Submit via GitHub Issues with detailed use cases
- **Commercial Licensing:** [support@oldmanfooty.au](mailto:support@oldmanfooty.au)

---

**🏉 Built with ❤️ for the Rugby League Masters community**

*This repository demonstrates our commitment to transparency while protecting our intellectual property and the sustainability of the Old Man Footy platform.*
