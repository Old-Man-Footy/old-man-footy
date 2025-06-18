require('dotenv').config();

const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const passport = require('./config/passport'); // Updated to use our config
const flash = require('connect-flash');
const path = require('path');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const mySidelineService = require('./services/mySidelineIntegrationService');
const { sequelize } = require('./models');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Layout middleware (must come after view engine setup)
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', false); // Disabled to allow individual page scripts to load properly
//TODO: SET UP SCRIPT EXTRACTION PROPERLY
app.set('layout extractStyles', true);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Method override middleware
app.use(methodOverride((req, res) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // Look in urlencoded POST bodies and delete the method key
        const method = req.body._method;
        delete req.body._method;
        return method;
    }
    return null;
}));

// Session store using SQLite
const sessionStore = new SequelizeStore({
    db: sequelize,
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'rugby-league-masters-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Maintenance mode middleware (must be after session but before routes)
const { maintenanceMode } = require('./middleware/maintenance');
app.use(maintenanceMode);

// Global variables for templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// Database connection and initialization
async function initializeDatabase() {
    try {
        const { initializeDatabase } = require('./config/database');
        await initializeDatabase();
        
        // Create session store table
        await sessionStore.sync();
        
        console.log('✅ SQLite database initialized successfully');
        
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

/**
 * Initialize MySideline sync service
 * This runs after the server is up and running
 */
async function initializeMySidelineSync() {
    try {
        console.log('🔄 Initializing MySideline sync service...');
        mySidelineService.initializeScheduledSync();
        console.log('✅ MySideline sync service initialized successfully');
    } catch (error) {
        console.error('❌ MySideline sync initialization failed:', error);
        // Don't exit process - let the site run without sync if needed
    }
}

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const carnivalRoutes = require('./routes/carnivals');
const carnivalClubRoutes = require('./routes/carnivalClubs');
const carnivalSponsorRoutes = require('./routes/carnivalSponsors');
const clubRoutes = require('./routes/clubs');
const clubPlayerRoutes = require('./routes/clubPlayers');
const sponsorRoutes = require('./routes/sponsors');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/carnivals', carnivalRoutes);
app.use('/carnivals', carnivalClubRoutes);
app.use('/carnival-sponsors', carnivalSponsorRoutes);
// Mount specific routes before general ones
app.use('/clubs/players', clubPlayerRoutes);
app.use('/clubs', clubRoutes);
app.use('/sponsors', sponsorRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    const statusCode = error.status || 500;
    res.status(statusCode);
    res.render('error', {
        title: 'Error',
        message: error.message,
        error: process.env.NODE_ENV === 'production' ? {} : error,
        user: req.user || null
    });
});

/**
 * Main startup sequence
 * 1. Initialize database
 * 2. Start server
 * 3. Initialize MySideline sync
 */
async function startServer() {
    try {
        // Step 1: Initialize database
        await initializeDatabase();
        
        // Step 2: Start the server
        const PORT = process.env.PORT || 3050;
        const server = app.listen(PORT, () => {
            console.log(`🚀 Old Man Footy server running on port ${PORT}`);
            console.log('📊 Site is now accessible and ready to serve requests');
        });
        
        // Step 3: Initialize MySideline sync after server is running
        // Add a small delay to ensure server is fully up
        setTimeout(async () => {
            await initializeMySidelineSync();
        }, 1000);
        
        return server;
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

// Start the server with the new sequence
startServer();

module.exports = app;