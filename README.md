# Old Man Footy:  Rugby League Masters Carnival Management Platform

A comprehensive web application for managing Rugby League Masters carnivals across Australia. This platform allows club delegates to create, manage, and promote rugby league carnivals while providing a centralized directory for players and fans to discover upcoming tournaments.

## 🏉 Features

### Core Functionality

- **Carnival Management**: Create, edit, and delete carnivals
- **Multi-State Support**: Support for all Australian states (NSW, QLD, VIC, WA, SA, TAS, NT, ACT)
- **File Uploads**: Club logos, promotional images, and draw files
- **Social Media Integration**: Facebook, Instagram, Twitter, and website links
- **Advanced Search & Filtering**: Filter by state, search terms, and upcoming events
- **Email Subscriptions**: State-based email notifications for carnival updates

### User Management

- **Authentication System**: Secure user registration and login
- **Role-based Access**: Club delegates can manage their carnivals
- **MySideline Integration**: Import and claim events from MySideline platform
- **Dashboard**: Personalized view of user's carnivals

### Enhanced User Experience

- **Responsive Design**: Mobile-optimized interface
- **Drag & Drop Uploads**: Enhanced file upload experience
- **Real-time Search**: Auto-submit filtering with debouncing
- **Accessibility Features**: Screen reader support and keyboard navigation

## 🚀 Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite with Sequelize ORM
- **Authentication**: Passport.js with local strategy
- **File Uploads**: Multer for handling multipart/form-data
- **Frontend**: EJS templating engine
- **Styling**: Bootstrap 5 with custom CSS
- **JavaScript**: Vanilla ES6+ with modern browser APIs

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 14.0 or higher)
- **npm** (comes with Node.js)
- **Git** (for version control)

Note: SQLite database is included and requires no separate installation.

## ⚙️ Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/nrl-masters.git
   cd nrl-masters
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
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

5. **Start the application**:

   ```bash
   npm start
   ```

6. **Access the application**:
   Open your browser and navigate to `http://localhost:3000`

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | 3000 |
| `SESSION_SECRET` | Secret key for session encryption | Required |
| `NODE_ENV` | Environment mode | development |

## 🗂️ Project Structure

```
├── app.js                 # Main application entry point
├── package.json           # Project dependencies and scripts
├── copilot-instructions.md # Development guidelines
├── config/
│   └── passport.js        # Passport authentication configuration
├── controllers/           # Business logic controllers
├── middleware/
│   └── auth.js           # Authentication middleware
├── models/               # Database models
│   ├── Carnival.js       # Carnival event model
│   ├── Club.js           # Club information model
│   ├── EmailSubscription.js # Email subscription model
│   └── User.js           # User account model
├── public/               # Static assets
│   ├── css/
│   │   └── styles.css    # Custom styles
│   ├── js/
│   │   └── app.js        # Client-side JavaScript
│   └── images/           # Static images
├── routes/               # Application routes
│   ├── auth.js           # Authentication routes
│   ├── carnivals.js      # Carnival management routes
│   └── index.js          # Main application routes
├── uploads/              # File upload directory
└── views/                # EJS templates
    ├── layout.ejs        # Main layout template
    ├── index.ejs         # Homepage
    ├── dashboard.ejs     # User dashboard
    ├── about.ejs         # About page
    ├── auth/             # Authentication views
    └── carnivals/        # Carnival management views
```

## 🎯 Usage

### For Club Delegates

1. **Register an Account**: Sign up with your club details
2. **Create Carnivals**: Add new carnivals with complete information
3. **Manage Events**: Edit, update, or delete your carnivals
4. **Upload Files**: Add club logos, promotional images, and draw files
5. **Claim MySideline Events**: Take ownership of imported events

### For Players and Fans

1. **Browse Carnivals**: View all upcoming events
2. **Filter Events**: Search by state, location, or keywords
3. **Subscribe to Updates**: Get email notifications for specific states
4. **View Details**: Access complete carnival information and contact details

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

### Cloud Deployment

The application is ready for deployment on platforms like:

- **Heroku**: With SQLite database (includes automatic backups)
- **Railway**: With persistent storage for SQLite
- **DigitalOcean App Platform**: With managed storage
- **AWS/Azure/GCP**: With appropriate storage services

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
