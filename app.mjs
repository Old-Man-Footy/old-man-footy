// Load configuration using ES modules approach instead of dotenv
import { setEnvironmentVariables, getCurrentConfig } from './config/config.mjs';

// Initialize configuration for current environment
await setEnvironmentVariables();

import express from 'express';
import session from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize';
// Remove the old flash import and add our enhanced flash
// import flash from 'connect-flash';
import { enhancedFlash, flashTemplateVariables } from './middleware/flash.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import expressLayouts from 'express-ejs-layouts';
import methodOverride from 'method-override';
// Import centralized security middleware
import { applySecurity } from './middleware/security.mjs';
// MySideline service will be imported dynamically after configuration is loaded
import { sequelize } from './models/index.mjs';
import { setupSessionAuth, loadSessionUser } from './middleware/auth.mjs';
import { setupDatabase } from './config/database.mjs';


// ES Module equivalents of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Trust proxy to get correct client IP behind Docker/Nginx
app.set('trust proxy', true);

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
    // Suppress missing table warnings in test environment
    logging: process.env.NODE_ENV === 'test' ? false : undefined
});

// Session configuration - MUST come before any middleware that uses flash messages
app.use(session({
    secret: getCurrentConfig().security.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: true, // Changed to true so sessions are created for all requests
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
app.use(enhancedFlash);

// Apply centralized security middleware - MUST come after session and flash setup
app.use(applySecurity);

// Maintenance mode middleware (must be after session but before routes)
const { maintenanceMode } = await import('./middleware/maintenance.mjs');
app.use(maintenanceMode);

// Coming soon mode middleware (must be after maintenance but before routes)
const { comingSoonMode } = await import('./middleware/comingSoon.mjs');
app.use(comingSoonMode);

// Global variables for templates using enhanced flash
app.use(flashTemplateVariables);


/**
 * Initialize MySideline sync service
 * This runs after the server is up and running
 */
async function initializeMySidelineSync() {
    // Skip initialization in test environment
    if (process.env.NODE_ENV === 'test' && process.env.JEST_WORKER_ID) {
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
const carnivalClubRoutes = await import('./routes/carnivalClubs.mjs');
const carnivalSponsorRoutes = await import('./routes/carnivalSponsors.mjs');
const clubRoutes = await import('./routes/clubs.mjs');

const adminRoutes = await import('./routes/admin.mjs');
const apiRoutes = await import('./routes/api/index.mjs');
const subscriptionRoutes = await import('./routes/subscription.mjs');

// Mount routes
app.use('/', indexRoutes.default);
app.use('/auth', authRoutes.default);
app.use('/carnivals', carnivalRoutes.default);
app.use('/carnivals', carnivalClubRoutes.default);
app.use('/carnival-sponsors', carnivalSponsorRoutes.default);

app.use('/clubs', clubRoutes.default);
app.use('/admin', adminRoutes.default);
app.use('/api', apiRoutes.default);
app.use('/api/subscribe', subscriptionRoutes.default);

// Error handling middleware
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    const statusCode = error.status || 500;
    
    // Check if this is an AJAX/API request
    const isAjaxRequest = req.xhr || 
                         req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                         req.headers.accept?.includes('application/json') ||
                         req.originalUrl?.startsWith('/api/');
    
    if (isAjaxRequest) {
        // Return JSON error response for API/AJAX requests
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'An error occurred',
            ...(process.env.NODE_ENV !== 'production' && { error: error.stack })
        });
    }
    
    // Return HTML error page for regular web requests
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
 * 2. Seed help content from markdown files
 * 3. Update user guides with current environment URLs
 * 4. Start server
 * 5. Initialize MySideline sync (only in non-test environments)
 */
async function startServer() {
    try {
        // Step 1: One-time database setup
        await setupDatabase();

        // Step 2: Seed help content on startup
        try {
            const { seedHelpContent } = await import('./scripts/seed-help-content.mjs');
            await seedHelpContent();
            console.log('✅ Help content seeded successfully');
        } catch (error) {
            console.warn('⚠️  Warning: Help content seeding failed:', error.message);
            // Don't exit - let the site run without help content if needed
        }
        
        // Step 3: Sync session store
        await sessionStore.sync();
        
        // Step 4: Start the server
        const PORT = process.env.PORT || 3050;
        const server = app.listen(PORT, () => {
            console.log(`🚀 Old Man Footy server running on port ${PORT}`);
            console.log('📊 Site is now accessible and ready to serve requests');
        });

        // ======================================================================
        // Step 5: Handle server connections for graceful shutdown
        const connections = new Set();

        server.on('connection', (socket) => {
            connections.add(socket);
            socket.on('close', () => {
                connections.delete(socket);
            });
        });

        let isShuttingDown = false;
        const gracefulShutdown = (signal) => {
            if (isShuttingDown) {
                console.log('Shutdown already in progress. Ignoring signal.');
                return;
            }
            isShuttingDown = true;
            console.log(`Received ${signal}. Closing server gracefully...`);

            // If the MySideline sync timeout is pending, clear it
            if (global.mySidelineInitTimeout) {
                clearTimeout(global.mySidelineInitTimeout);
            }

            // Set a timeout to force shutdown
            const shutdownTimeout = setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down.');
                for (const socket of connections) {
                    socket.destroy();
                }
                process.exit(1); // Exit with an error code
            }, 10000); // 10-second grace period

            server.close(async () => {
                console.log('HTTP server closed.');
                
                console.log('All resources closed. Exiting.');
                clearTimeout(shutdownTimeout); // Cancel the forceful shutdown
                process.exit(0);
            });

            // If there are no active connections, server.close() will be synchronous
            // and the callback will be called immediately.
            // For any existing connections, it will wait for them to close.
            for (const socket of connections) {
                socket.end();
            }
        };

        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // ======================================================================
        
        // Step 6: Initialize MySideline sync after server is running (skip in jest tests)
        if (!process.env.JEST_WORKER_ID) {
            global.mySidelineInitTimeout = setTimeout(async () => {
                await initializeMySidelineSync();
                global.mySidelineInitTimeout = null;
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