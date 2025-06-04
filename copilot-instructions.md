# NRL Masters - Current Project Status & Architecture

## Project Overview
The NRL Masters platform is a web application for managing and displaying rugby league carnival events across Australia. The platform allows club delegates to register and manage carnival events, while providing public access to upcoming events and email subscription services.

## Current Implementation Status

### ✅ COMPLETED FEATURES

**Core Technologies & Setup:**
* **Backend:** Node.js with Express.js framework ✅
* **Database:** MongoDB with Mongoose ODM ✅ (Changed from original SQL Server plan)
* **Frontend:** EJS templating with express-ejs-layouts ✅
* **Authentication:** Passport.js with local strategy ✅
* **Email:** Nodemailer configured (ready for implementation) ✅
* **Security:** Helmet, bcrypt password hashing, session management ✅
* **Styling:** CSS framework ready for Green/Gold theming ✅

**Database Models Implemented:**
* **User Model** (`models/User.js`) ✅
  - Email, password hash, first/last name
  - Club association via ObjectId reference
  - Primary delegate designation
  - Invitation token system for new delegates
  - Active/inactive status
* **Club Model** (`models/Club.js`) ✅
  - Club name storage
  - Timestamps
* **Carnival Model** (`models/Carnival.js`) ✅
  - Complete carnival information (title, date, location, contacts)
  - Schedule details, registration links, fees
  - Social media links, logo/image URLs
  - Draw upload capability
  - State-based filtering
  - Manual vs MySideline event tracking
* **Email Subscription Model** (`models/EmailSubscription.js`) ✅
  - Email with state-based filtering
  - Unsubscribe token system

**Authentication System:**
* **User Registration** ✅
  - Club delegate registration with club creation/association
  - Automatic primary delegate assignment
  - Input validation and error handling
* **User Login/Logout** ✅
  - Passport local strategy implementation
  - Session management
  - Protected route middleware
* **Invitation System** ✅
  - Token-based invitation for additional club delegates
  - Email invitation links (ready for email service)
  - Secure token expiration

**Carnival Management:**
* **Create Carnival** ✅ (Route implemented in `routes/carnivals.js`)
* **View Carnivals** ✅ (List and detail views)
* **Update Carnival** ✅ (Edit functionality)
* **Delete/Deactivate Carnival** ✅

**Public Features:**
* **Home Page** ✅ (`routes/index.js`)
  - Display upcoming carnivals
  - Public access to carnival information
* **Email Subscriptions** ✅
  - State-based subscription system
  - Unsubscribe functionality
* **Dashboard** ✅
  - User-specific carnival management

**Security Implementation:**
* Input validation with express-validator ✅
* Password hashing with bcrypt ✅
* Session security ✅
* Helmet security headers ✅
* Authentication middleware ✅

### 🔄 PARTIALLY IMPLEMENTED

**MySideline Integration:**
* Environment configuration ready ✅
* Database fields for MySideline event IDs ✅
* **NEEDS:** Actual scraping/API integration logic
* **NEEDS:** Scheduled task implementation (node-cron)
* **NEEDS:** Data reconciliation between manual and MySideline events

**Email Notifications:**
* Nodemailer configuration ready ✅
* Email subscription system complete ✅
* **NEEDS:** Actual email sending implementation
* **NEEDS:** Email templates
* **NEEDS:** Notification triggers for new/updated carnivals

### ❌ TODO / NEEDS IMPLEMENTATION

**Frontend Views:**
* **CRITICAL:** Most EJS templates need creation/completion
  - `views/carnivals/` templates (new.ejs, edit.ejs, list.ejs exist but may need updates)
  - Enhanced home page with calendar view
  - Carnival detail pages with full information display
  - Dashboard improvements
* **CRITICAL:** CSS styling implementation (Green/Gold theme)
* **CRITICAL:** Responsive design implementation
* **CRITICAL:** Client-side JavaScript enhancements

**File Upload System:**
* Club logo upload functionality
* Promotional image upload
* Draw document upload
* **NEEDS:** Multer middleware setup
* **NEEDS:** File storage strategy (local or cloud)

**Advanced Features:**
* Calendar/schedule view with visual formatting
* Advanced search and filtering
* Volunteer interest tracking
* Social media integration display
* Enhanced error pages

**Production Readiness:**
* Email service configuration (SendGrid, AWS SES, etc.)
* Environment-specific configurations
* Logging implementation (winston/pino)
* Performance optimizations
* Testing suite implementation

## Current File Structure
```
├── app.js                 // Main application file ✅
├── package.json           // Dependencies ✅
├── .env                   // Environment variables ✅
├── config/
│   └── passport.js        // Authentication config ✅
├── models/                // MongoDB models ✅
│   ├── User.js
│   ├── Club.js
│   ├── Carnival.js
│   └── EmailSubscription.js
├── routes/                // Express routes ✅
│   ├── index.js           // Home, dashboard, subscriptions
│   ├── auth.js            // Authentication routes
│   └── carnivals.js       // Carnival management
├── middleware/
│   └── auth.js            // Authentication middleware ✅
├── views/                 // EJS templates (NEEDS WORK)
├── public/                // Static assets (NEEDS STYLING)
└── uploads/               // File upload directory (NEEDS SETUP)
```

## Next Development Priorities

### HIGH PRIORITY
1. **Complete EJS Templates** - Create/enhance all view files
2. **Implement Styling** - Green/Gold theme, responsive design
3. **File Upload System** - Logo, images, document uploads
4. **Email Service Integration** - Complete notification system

### MEDIUM PRIORITY
1. **MySideline Integration** - Automated event fetching
2. **Enhanced UI/UX** - Calendar views, advanced filtering
3. **Testing Implementation** - Unit and integration tests

### LOW PRIORITY
1. **Performance Optimization** - Caching, query optimization
2. **Advanced Features** - Volunteer tracking, social integration
3. **Production Deployment** - Cloud setup, monitoring

## Development Notes
- Database connection string in `.env` uses local MongoDB
- Session secret and email credentials need production values
- All models use Mongoose with proper indexing
- Authentication system is fully functional
- Error handling middleware is implemented
- Flash message system is working

## Key Architectural Decisions Made
1. **MongoDB over SQL Server** - Better fit for Node.js ecosystem
2. **EJS over React/Vue** - Simpler server-side rendering approach  
3. **Invitation-based registration** - Security-focused user management
4. **State-based filtering** - Australia-wide event management
5. **Soft delete approach** - Data preservation with isActive flags
