# Old Man Footy:  Rugby League Masters Carnival Management Platform

A comprehensive web application for managing Rugby League Masters carnivals across Australia. This platform allows club delegates to create, manage, and promote rugby league carnivals while providing a centralized directory for players and fans to discover upcoming tournaments.

## 🏉 Features

### Core Functionality

- **Carnival Management:** Create, edit, and delete carnivals
- **Multi-State Support:** Support for all Australian states (NSW, QLD, VIC, WA, SA, TAS, NT, ACT)
- **File Uploads:** Club logos, promotional images, and draw files
- **Social Media Integration:** Facebook, Instagram, Twitter, and website links
- **Advanced Search & Filtering:** Filter by state, search terms, and upcoming events
- **Email Subscriptions:** State-based email notifications for carnival updates

### User Management

- **Authentication System:** Secure user registration and login
- **Role-based Access:** Club delegates can manage their carnivals
- **MySideline Integration:** Import and claim events from MySideline platform
- **Dashboard:** Personalized view of user's carnivals

### Enhanced User Experience

- **Responsive Design:** Mobile-optimized interface
- **Drag & Drop Uploads:** Enhanced file upload experience
- **Real-time Search:** Auto-submit filtering with debouncing
- **Accessibility Features:** Screen reader support and keyboard navigation

## 🚀 Technology Stack

- **Backend:** Node.js with Express.js
- **Database:** SQLite with Sequelize ORM
- **Authentication:** Passport.js with local strategy
- **File Uploads:** Multer for handling multipart/form-data
- **Frontend:** EJS templating engine
- **Styling:** Bootstrap 5 with custom CSS
- **JavaScript:** Vanilla ES6+ with modern browser APIs

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 14.0 or higher)
- **npm** (comes with Node.js)
- **Git** (for version control)

Note: SQLite database is included and requires no separate installation.

## ⚙️ Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/nrl-masters.git
   cd nrl-masters
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:

   ```env
   PORT=3000
   SESSION_SECRET=your-super-secret-session-key
   NODE_ENV=development
   ```

4. **Create uploads directory** (if not exists):

   ```bash
   mkdir uploads
   ```

5. **Start the application:**

   ```bash
   npm start
   ```

6. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | 3000 |
| `SESSION_SECRET` | Secret key for session encryption | Required |
| `NODE_ENV` | Environment mode | development |

## Debugging

To debug in vscode, change the following line in `package.json`

- from: `"test": "jest",`
- to: `"test": "node --inspect-brk=9229 node_modules/jest/bin/jest.js --runInBand",`

Then use an "attach to Jest" `Launch.json` file:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Jest",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true
    }
  ]
}
```

## 🗂️ Project Structure

```
├── .github/               # GitHub configuration files (workflows, templates)
├── .vscode/               # VS Code workspace settings and configurations
├── app.js                 # Main application entry point
├── package.json           # Project dependencies and scripts
├── copilot-instructions.md # Development guidelines
├── config/
│   ├── config.js          # Application configuration settings
│   ├── constants.js       # Application constants and enums
│   ├── database.js        # Database connection and configuration
│   ├── database-optimizer.js # Database performance optimization
│   └── passport.js        # Passport authentication configuration
├── controllers/           # MVC Controllers - Handle HTTP requests and responses
│   ├── admin.controller.js      # Admin panel functionality
│   ├── auth.controller.js       # User authentication logic
│   ├── carnival.controller.js   # Carnival management operations
│   ├── carnivalClub.controller.js # Carnival-club relationship management
│   ├── carnivalSponsor.controller.js # Carnival sponsorship management
│   ├── club.controller.js       # Club management operations
│   ├── clubPlayer.controller.js # Club player management
│   ├── clubSponsor.controller.js # Club sponsorship management
│   ├── main.controller.js       # Main application routes
│   ├── sponsor.controller.js    # Sponsor management operations
│   └── userGuide.controller.js  # User guide and help functionality
├── data/                  # Database files
│   ├── dev-old-man-footy.db     # Development SQLite database
│   └── test-old-man-footy.db    # Test SQLite database
├── docs/                  # Project documentation
│   ├── DATABASE_SEEDING.md      # Database seeding documentation
│   ├── PRODUCTION_DEPLOYMENT.md # Production deployment guide
│   └── USER_GUIDE_DELEGATES.md  # User guide for delegates
├── middleware/            # Express middleware functions
│   ├── auth.js            # Authentication middleware
│   └── upload.js          # File upload middleware
├── migrations/            # Sequelize database migrations
│   └── [timestamp]-*.js   # Database schema migration files
├── models/                # MVC Models - Database schemas and business logic
│   ├── AuditLog.js        # Audit logging model
│   ├── Carnival.js        # Carnival event model
│   ├── CarnivalClub.js    # Carnival-club relationship model
│   ├── CarnivalClubPlayer.js # Carnival club player model
│   ├── CarnivalSponsor.js # Carnival sponsorship model
│   ├── Club.js            # Club information model
│   ├── ClubAlternateName.js # Club alternate names model
│   ├── ClubPlayer.js      # Club player model
│   ├── ClubSponsor.js     # Club sponsorship model
│   ├── EmailSubscription.js # Email subscription model
│   ├── index.js           # Model index and associations
│   ├── Sponsor.js         # Sponsor information model
│   ├── SyncLog.js         # Data synchronization logging model
│   └── User.js            # User account model
├── node_modules/          # NPM package dependencies (auto-generated)
├── public/                # Static assets served to the client
│   ├── icons/             # Application icons and favicons
│   ├── images/            # Static images and graphics
│   ├── js/                # Client-side JavaScript files
│   ├── styles/            # CSS stylesheets and styling assets
│   └── uploads/           # User-uploaded files directory
│       ├── documents/     # Uploaded document files (PDFs, etc.)
│       ├── images/        # Uploaded image files
│       └── logos/         # Uploaded logo files
├── routes/                # Express route definitions
│   ├── admin.js           # Admin panel routes
│   ├── auth.js            # Authentication routes
│   ├── carnivalClubs.js   # Carnival club management routes
│   ├── carnivals.js       # Carnival management routes
│   ├── carnivalSponsors.js # Carnival sponsor routes
│   ├── clubPlayers.js     # Club player management routes
│   ├── clubs.js           # Club management routes
│   ├── index.js           # Main application routes
│   ├── sponsors.js        # Sponsor management routes
│   └── api/               # API route definitions
├── scripts/               # Utility and maintenance scripts
│   ├── image-manager.js   # Image processing and management
│   ├── purge-seed-data.js # Database cleanup scripts
│   ├── seed-database.js   # Database seeding scripts
│   ├── fixtures/          # Test data and fixtures
│   └── services/          # Script-specific service utilities
├── services/              # Business logic services and utilities
│   ├── auditService.js    # Audit logging service
│   ├── carouselImageService.js # Image carousel management
│   ├── emailService.js    # Email notification service
│   └── imageNamingService.js # Image file naming utilities
├── tests/                 # Test files and test utilities
│   └── *.test.js          # Jest unit and integration tests
└── views/                 # EJS templates - MVC Views
    ├── about.ejs          # About page template
    ├── contact.ejs        # Contact page template
    ├── dashboard.ejs      # User dashboard template
    ├── error.ejs          # Error page template
    ├── index.ejs          # Homepage template
    ├── layout.ejs         # Main layout template
    ├── user-guide.ejs     # User guide template
    ├── admin/             # Admin panel view templates
    ├── auth/              # Authentication view templates (login, register)
    ├── carnivals/         # Carnival management view templates
    ├── clubs/             # Club management view templates
    │   └── players/       # Club player management view templates
    ├── partials/          # Reusable template components
    └── sponsors/          # Sponsor management view templates
```

## 🎯 Usage

### For Club Delegates

1. **Register an Account:** Sign up with your club details
2. **Create Carnivals:** Add new carnivals with complete information
3. **Manage Events:** Edit, update, or delete your carnivals
4. **Upload Files:** Add club logos, promotional images, and draw files
5. **Claim MySideline Events:** Take ownership of imported events

### For Players and Fans

1. **Browse Carnivals:** View all upcoming events
2. **Filter Events:** Search by state, location, or keywords
3. **Subscribe to Updates:** Get email notifications for specific states
4. **View Details:** Access complete carnival information and contact details

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
- `POST /carnivals/:id/take-ownership` - Claim MySideline event

### General

- `GET /` - Homepage with upcoming carnivals
- `GET /about` - About page
- `GET /dashboard` - User dashboard (authenticated)
- `POST /subscribe` - Email subscription
- `GET /unsubscribe/:token` - Unsubscribe from emails

## 🧪 Testing

Run the application in development mode:

```bash
npm run dev
```

For production deployment:

```bash
npm start
```

## 🚀 Deployment

### Environment Setup

1. Set environment variables for production
2. SQLite database will be automatically created on first run
3. Set up file upload storage (consider cloud storage for production)
4. Configure session store (Redis recommended for production)

Note: For production deployments, ensure persistent storage is configured for the SQLite database file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏉 About Rugby League Masters

Rugby League Masters is a rugby league format for players aged 35+ across Australia. This platform aims to streamline carnival organization and promote participation in masters rugby league competitions.

## 📞 Support

For support, please contact the development team or create an issue in this repository.

---

Built with ❤️ for the Rugby League Masters community
