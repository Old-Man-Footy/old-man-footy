/**
 * Authentication Middleware
 * 
 * Provides authentication and authorization middleware functions
 * for protecting routes and ensuring user permissions.
 */

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/auth/login');
}

// Middleware to ensure user is not authenticated (for login/register pages)
function ensureGuest(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/dashboard');
}

// Middleware to ensure user is primary delegate
function ensurePrimaryDelegate(req, res, next) {
    if (req.isAuthenticated() && req.user.isPrimaryDelegate) {
        return next();
    }
    req.flash('error_msg', 'Access denied. Primary delegate privileges required.');
    res.redirect('/dashboard');
}

// Middleware to ensure user is admin
function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    res.redirect('/dashboard');
}

export {
  ensureAuthenticated,
  ensureGuest,
  ensureAdmin,
  ensurePrimaryDelegate
};