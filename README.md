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
│   ├── auth.controller.mjs                     # User authentication logic
│   ├── carnival.controller.mjs                 # Carnival management operations
│   ├── carnivalClub.controller.mjs             # Carnival-club relationships
│   ├── carnivalSponsor.controller.mjs          # Carnival sponsorship
│   ├── club.controller.mjs                     # Club management operations
│   ├── clubPlayer.controller.mjs               # Club player management
│   ├── comingSoon.controller.mjs               # Coming soon page handling
│   ├── help.controller.mjs                     # Help system and documentation
│   ├── main.controller.mjs                     # Main application routes
│   ├── maintenance.controller.mjs              # Maintenance mode handling
│   └── sponsor.controller.mjs                  # Sponsor management operations
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
│   ├── flash.mjs                               # Flash message middleware
│   ├── maintenance.mjs                         # Maintenance mode middleware
│   ├── security.mjs                            # Security headers and protection
│   ├── upload.mjs                              # File upload middleware
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
│   ├── sponsors.mjs                            # Sponsor management routes
│   └── api/                                    # API route definitions
│       ├── help.mjs                               # Help system API routes
│       ├── images.mjs                             # Image management API routes
│       ├── index.mjs                              # API routes index
│       └── sponsors.mjs                           # Sponsor API routes
├── scripts/                                 # Utility and maintenance scripts
├── services/                                # Business logic services and utilities
│   ├── auditService.mjs                        # Audit logging service
│   ├── carouselImageService.mjs                # Image carousel management
│   ├── imageNamingService.mjs                  # Image file naming utilities
│   ├── imageUploadService.mjs                  # Image upload processing service
│   ├── mySidelineDataService.mjs               # MySideline data processing
│   ├── mySidelineCarnivalParserService.mjs     # Carnival parsing service
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
    ├── sponsors/                               # Sponsor management view templates
    │   ├── list.ejs                               # List all sponsors
    │   └── show.ejs                               # View sponsor details
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

The platform provides a RESTful API structure with proper authentication and authorization:

### Authentication

- `GET /auth/register` - Registration form
- `POST /auth/register` - Create new user account
- `GET /auth/login` - Login form
- `POST /auth/login` - Authenticate user
- `POST /auth/logout` - Logout user

### Carnivals

- `GET /carnivals` - List all carnivals (with filtering)
- `GET /carnivals/new` - Create carnival form (authenticated)
- `POST /carnivals/new` - Create new carnival (authenticated)
- `GET /carnivals/:id` - View carnival details
- `GET /carnivals/:id/edit` - Edit carnival form (owner only)
- `POST /carnivals/:id/edit` - Update carnival (owner only)
- `POST /carnivals/:id/delete` - Delete carnival (owner only)
- `POST /carnivals/:id/take-ownership` - Claim MySideline carnival

### Clubs & Players

- `GET /clubs` - List all clubs
- `GET /clubs/:id` - View club details
- `GET /clubs/:id/edit` - Edit club form (owner only)
- `POST /clubs/:id/edit` - Update club (owner only)
- `GET /clubs/players` - Club player management
- `POST /clubs/players` - Add new club player
- `PUT /clubs/players/:id` - Update club player
- `DELETE /clubs/players/:id` - Delete club player

### Sponsors

- `GET /sponsors` - List all sponsors
- `GET /sponsors/new` - Create sponsor form (authenticated)
- `POST /sponsors/new` - Create new sponsor (authenticated)
- `GET /sponsors/:id/edit` - Edit sponsor form (owner only)
- `POST /sponsors/:id/edit` - Update sponsor (owner only)

### Admin

- `GET /admin` - Admin dashboard (admin only)
- `GET /admin/users` - User management (admin only)
- `GET /admin/sync-logs` - MySideline sync status (admin only)
- `GET /admin/audit-logs` - System audit logs (admin only)

### General

- `GET /` - Homepage with upcoming carnivals
- `GET /about` - About page
- `GET /dashboard` - User dashboard (authenticated)
- `POST /subscribe` - Email subscription
- `GET /unsubscribe/:token` - Unsubscribe from emails

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
