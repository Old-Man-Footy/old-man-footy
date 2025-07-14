/**
 * Session Authentication Middleware
 * 
 * Provides session-based authentication without Passport.js
 * Implements the same interface (req.login, req.isAuthenticated, etc.)
 */

/**
 * Session authentication setup middleware
 * Adds authentication methods to the request object
 */
function setupSessionAuth(req, res, next) {
  // Add login method to request
  req.login = function(user, callback) {
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        return callback(err);
      }
      req.user = user;
      callback(null);
    });
  };

  // Add logout method to request  
  req.logout = function(callback) {
    const userId = req.session.userId;
    req.session.destroy((err) => {
      if (err) {
        return callback(err);
      }
      req.user = null;
      callback(null);
    });
  };

  // Add isAuthenticated method to request
  req.isAuthenticated = function() {
    return !!(req.session.userId && req.user);
  };

  next();
}

/**
 * Session user loading middleware
 * Loads user from session if authenticated
 */
async function loadSessionUser(req, res, next) {
  if (req.session.userId && !req.user) {
    try {
      const { User, Club } = await import('../models/index.mjs');
      const user = await User.findByPk(req.session.userId, {
        include: [{
          model: Club,
          as: 'club'
        }]
      });
      
      if (user && user.isActive) {
        req.user = user;
      } else {
        // User not found or inactive - clear session
        req.session.userId = null;
      }
    } catch (error) {
      console.error('Error loading session user:', error);
      req.session.userId = null;
    }
  }
  next();
}

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
  setupSessionAuth,
  loadSessionUser,
  ensureAuthenticated,
  ensureGuest,
  ensureAdmin,
  ensurePrimaryDelegate
};