const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('./config/passport'); // Updated to use our config
const flash = require('connect-flash');
const path = require('path');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');
const mySidelineService = require('./services/mySidelineService');
require('dotenv').config();

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
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'rugby-league-masters-secret-key',
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

// Global variables for templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rugby-league-masters')
.then(() => {
    console.log('MongoDB connected successfully');
    // Initialize MySideline service after database connection
    mySidelineService.initializeScheduledSync();
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const carnivalRoutes = require('./routes/carnivals');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/carnivals', carnivalRoutes);

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
        error: process.env.NODE_ENV === 'production' ? {} : error
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Rugby League Masters server running on port ${PORT}`);
});

module.exports = app;