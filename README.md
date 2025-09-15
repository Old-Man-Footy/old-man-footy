# Old Man Footy: Rugby League Masters Carnival Management Platform

A comprehensive web application for managing Rugby League Masters carnivals across Australia. This platform allows club delegates to create, manage, and promote rugby league carnivals while providing a centralized directory for players and fans to discover upcoming tournaments.

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

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 18.0 or higher) - Required for ES Modules support
- **npm** (comes with Node.js)
- **Git** (for version control)

Note: SQLite database is included and requires no separate installation.

## ⚙️ Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/devonuto/old-man-footy.git
   cd old-man-footy
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:

   ```env
   PORT=3050
   SESSION_SECRET=your-super-secret-session-key
   NODE_ENV=development
   ```

4. **Create uploads directory** (if not exists):

   ```bash
   mkdir -p public/uploads
   ```

5. **Run database migrations:**

   ```bash
   npx sequelize-cli db:migrate
   ```

6. **Seed the database** (optional):

   ```bash
   npm run seed
   ```

7. **Start the application:**

   ```bash
   npm start
   ```

8. **Access the application:**
   Open your browser and navigate to `http://localhost:3050`

## 📝 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port number | 3050 | No |
| `SESSION_SECRET` | Secret key for session encryption | - | Yes |
| `NODE_ENV` | Environment mode (development/production/test) | development | No |

## 🧪 Testing & Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run all tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run seed` | Seed database with test data |

### Test Coverage

The project maintains high test coverage standards. To generate a report, run:

```bash
npm run test:coverage
```

## 🗂️ Project Structure

```
├── app.mjs                                  # Main application entry point (ES Module)
├── package.json                             # Project dependencies and scripts
├── docker-compose.*.yml                     # Docker configuration files
├── Dockerfile                               # Docker container definition
├── LICENSE                                  # Custom proprietary license
├── README.md                                # This documentation file
├── config/                                  # Application configuration
│   ├── config.mjs                              # Main application configuration
│   ├── constants.mjs                           # Application constants and enums
│   ├── database.mjs                            # Database connection and setup
│   ├── database-optimizer.mjs                  # Database performance optimization
│   └── passport.mjs                            # Passport authentication configuration
├── controllers/                             # MVC Controllers - Handle HTTP requests
│   ├── admin.controller.mjs                    # Admin panel functionality
│   ├── auth.controller.mjs                     # User authentication logic
│   ├── carnival.controller.mjs                 # Carnival management operations
│   ├── carnivalClub.controller.mjs             # Carnival-club relationships
│   ├── carnivalSponsor.controller.mjs          # Carnival sponsorship
│   ├── club.controller.mjs                     # Club management operations
│   ├── clubPlayer.controller.mjs               # Club player management
│   ├── clubSponsor.controller.mjs              # Club sponsorship management
│   ├── comingSoon.controller.mjs               # Coming soon page handling
│   ├── main.controller.mjs                     # Main application routes
│   ├── maintenance.controller.mjs              # Maintenance mode handling
│   ├── sponsor.controller.mjs                  # Sponsor management operations
├── data/                                    # Database files
│   ├── dev-old-man-footy.db                    # Development SQLite database
│   └── test-old-man-footy.db                   # Test SQLite database
├── docs/                                    # Project documentation
│   ├── DATABASE_SEEDING.md                     # Database seeding guide
│   └── USER_GUIDE_DELEGATES.md                 # User guide for delegates
├── middleware/                              # Express middleware functions
│   ├── auth.mjs                                # Authentication middleware
│   ├── comingSoon.mjs                          # Coming soon mode middleware
│   ├── maintenance.mjs                         # Maintenance mode middleware
│   ├── upload.mjs                              # File upload middleware
│   └── validation.mjs                          # Input validation middleware
├── migrations/                              # Sequelize database migrations
│   └── *.mjs                                   # Database schema migration files
├── models/                                  # MVC Models - Database schemas and logic
│   ├── AuditLog.mjs                            # Audit logging model
│   ├── Carnival.mjs                            # Carnival carnival model
│   ├── CarnivalClub.mjs                        # Carnival-club relationship model
│   ├── CarnivalClubPlayer.mjs                  # Carnival club player model
│   ├── CarnivalSponsor.mjs                     # Carnival sponsorship model
│   ├── Club.mjs                                # Club information model
│   ├── ClubAlternateName.mjs                   # Club alternate names model
│   ├── ClubPlayer.mjs                          # Club player model
│   ├── EmailSubscription.mjs                   # Email subscription model
│   ├── index.mjs                               # Model index and associations
│   ├── Sponsor.mjs                             # Sponsor information model
│   ├── SyncLog.mjs                             # Data synchronization logging
│   └── User.mjs                                # User account model
├── public/                                  # Static assets served to clients
│   ├── icons/                                  # Application icons and favicons
│   ├── images/                                 # Static images and graphics
│   ├── js/                                     # Client-side JavaScript files
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
│       └── index.mjs                              # API routes index
├── scripts/                                 # Utility and maintenance scripts
├── services/                                # Business logic services and utilities
│   ├── auditService.mjs                        # Audit logging service
│   ├── carouselImageService.js                 # Image carousel management
│   ├── emailService.mjs                        # Email notification service
│   ├── imageNamingService.mjs                  # Image file naming utilities
│   ├── mySidelineDataService.mjs               # MySideline data processing
│   ├── mySidelineCarnivalParserService.mjs        # Carnival parsing
│   ├── mySidelineIntegrationService.mjs        # Main integration service
│   ├── mySidelineLogoDownloadService.mjs       # Logo downloading
│   ├── mySidelineScraperService.mjs            # Web scraping service
│   └── sponsorSortingService.mjs               # Sponsor sorting logic
├── tests/                                   # Test files and utilities
│   └── *.test.mjs                              # Vitest unit and integration tests
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
    │   └── flash-messages.ejs                     # Flash message display
    └── sponsors/                               # Sponsor management view templates
        ├── list.ejs                               # List all sponsors
        └── show.ejs                               # View sponsor details
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

## 🔧 API Endpoints

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

## 🚀 Deployment

### Environment Setup

1. Set environment variables for production:

   ```env
   NODE_ENV=production
   SESSION_SECRET=your-production-secret
   PORT=3050
   ```

2. Database setup:
   - SQLite database will be automatically created on first run
   - Run migrations: `npx sequelize-cli db:migrate`

3. File upload storage:
   - Ensure `/public/uploads` directory exists and is writable
   - Consider cloud storage for production (S3, Azure Blob, etc.)

4. Security considerations:
   - Configure session store (Redis recommended for production)
   - Set up HTTPS/SSL certificates
   - Configure proper CORS policies
   - Enable security headers via Helmet.js

### Docker Deployment

The project includes Docker support with separate services for the web application and scheduled maintenance:

```bash
# Build and run production services (web app + maintenance)
docker-compose -f docker-compose.prod.yml up -d

# For testing
docker-compose -f docker-compose.test.yml up
```

#### Production Services

The production deployment includes two services:

1. **Web Application Service (`app`):**
   - Main Express.js application serving web requests
   - Handles user authentication, carnival management, and web interface
   - Port 3050 exposed for web traffic

2. **Maintenance Service (`maintenance`):**
   - Scheduled database maintenance using node-cron
   - Runs daily at 2:00 AM server time (Australia/Sydney)
   - Performs database optimization, backups, and performance analysis
   - Shares database volume with main application
   - Creates backups in `/volume2/docker/old-man-footy-prod/backups`

#### Environment Variables for Production

Additional environment variables for maintenance service:

```env
# Backup and maintenance settings
BACKUP_RETENTION_DAYS=30
TZ=Australia/Sydney

# Database performance tuning
SQLITE_MAX_POOL_SIZE=10
SQLITE_MIN_POOL_SIZE=1
SQLITE_ACQUIRE_TIMEOUT=30000
SQLITE_IDLE_TIMEOUT=10000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the coding guidelines in `copilot-instructions.md`
4. Write tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines

- **ES Modules:** Use modern import/export syntax
- **MVC Architecture:** Strictly separate concerns between models, views, and controllers
- **Security First:** Always validate and sanitize inputs
- **Test-Driven Development:** Write tests for all business logic
- **JSDoc Comments:** Document all public functions and complex logic

## 📄 License

This project is licensed under a Custom Proprietary License - see the [LICENSE](LICENSE) file for details.

**Important:** This is commercial software made available for transparency and community contributions. Commercial use, redistribution, or deployment without permission is prohibited.

## 🏉 About Rugby League Masters

Rugby League Masters is a rugby league format for players aged 35+ across Australia. This platform aims to streamline carnival organization and promote participation in masters rugby league competitions.

## 📞 Support

For support, please contact the development team at [support@oldmanfooty.au](mailto:support@oldmanfooty.au) or create an issue in this repository.

---

Built with ❤️ for the Rugby League Masters community
