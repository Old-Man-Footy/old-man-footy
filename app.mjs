// Load configuration using ES modules approach instead of dotenv
import { setEnvironmentVariables, getCurrentConfig } from './config/config.mjs';

// Initialize configuration for current environment
setEnvironmentVariables();

import express from 'express';
import session from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize';
import flash from 'connect-flash';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import expressLayouts from 'express-ejs-layouts';
import methodOverride from 'method-override';
// Import centralized security middleware
import { applySecurity } from './middleware/security.mjs';
// MySideline service will be imported dynamically after configuration is loaded
import { sequelize } from './models/index.mjs';
import { setupSessionAuth, loadSessionUser } from './middleware/auth.mjs';

// ES Module equivalents of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configure session store with proper ES Module import
const SequelizeStore = connectSessionSequelize(session.Store);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Layout middleware (must come after view engine setup)
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', false); // Disabled to allow individual page scripts to load properly
//TODO: SET UP SCRIPT EXTRACTION PROPERLY
app.set('layout extractStyles', true);

// Static files
app.use(express.static(join(__dirname, 'public')));

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

// Session configuration - MUST come before any middleware that uses flash messages
app.use(session({
    secret: getCurrentConfig().security.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Session-based authentication middleware (replaces Passport)
app.use(setupSessionAuth);
app.use(loadSessionUser);

// Flash messages - MUST come after session setup
app.use(flash());

// Apply centralized security middleware - MUST come after session and flash setup
app.use(applySecurity);

// Maintenance mode middleware (must be after session but before routes)
const { maintenanceMode } = await import('./middleware/maintenance.mjs');
app.use(maintenanceMode);

// Coming soon mode middleware (must be after maintenance but before routes)
const { comingSoonMode } = await import('./middleware/comingSoon.mjs');
app.use(comingSoonMode);

// Global variables for templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

/**
 * Initialize database connection and setup
 * @returns {Promise<boolean>} Success status
 */
async function initializeDatabase() {
    try {
        const { initializeDatabase } = await import('./config/database.mjs');
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
    // Skip initialization in test environment
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
        console.log('🧪 Skipping MySideline sync in test environment');
        return;
    }

    try {
        console.log('🔄 Initializing MySideline sync service...');
        
        // Import MySideline service dynamically after configuration is loaded
        const { default: mySidelineService } = await import('./services/mySidelineIntegrationService.mjs');
        
        mySidelineService.initializeScheduledSync();
        console.log('✅ MySideline sync service initialized successfully');
    } catch (error) {
        console.error('❌ MySideline sync initialization failed:', error);
        // Don't exit process - let the site run without sync if needed
    }
}

// Import routes using dynamic imports
const indexRoutes = await import('./routes/index.mjs');
const authRoutes = await import('./routes/auth.mjs');
const carnivalRoutes = await import('./routes/carnivals.mjs');
const carnivalSponsorRoutes = await import('./routes/carnivalSponsors.mjs');
const clubRoutes = await import('./routes/clubs.mjs');
const clubPlayerRoutes = await import('./routes/clubPlayers.mjs');
const sponsorRoutes = await import('./routes/sponsors.mjs');
const adminRoutes = await import('./routes/admin.mjs');
const apiRoutes = await import('./routes/api/index.mjs');

// Mount routes
app.use('/', indexRoutes.default);
app.use('/auth', authRoutes.default);
app.use('/carnivals', carnivalRoutes.default);
app.use('/carnival-sponsors', carnivalSponsorRoutes.default);
app.use('/clubs/players', clubPlayerRoutes.default);
app.use('/clubs', clubRoutes.default);
app.use('/sponsors', sponsorRoutes.default);
app.use('/admin', adminRoutes.default);
app.use('/api', apiRoutes.default);

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
 * 3. Initialize MySideline sync (only in non-test environments)
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
        
        // Step 3: Initialize MySideline sync after server is running (skip in tests)
        if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
            // Store timeout ID globally so it can be cleared during test cleanup
            global.mySidelineInitTimeout = setTimeout(async () => {
                await initializeMySidelineSync();
                global.mySidelineInitTimeout = null; // Clear reference after execution
            }, 1000);
        }
        
        return server;
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

// Start the server with the new sequence
startServer();

export default app;