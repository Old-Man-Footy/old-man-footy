/**
 * Maintenance Mode Middleware
 * Checks if the application is in maintenance mode and redirects non-admin users
 * to a maintenance page while allowing admin access through environment variable control
 */

/**
 * Middleware to handle maintenance mode
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const maintenanceMode = (req, res, next) => {
  // Check if maintenance mode is enabled via environment variable
  const isMaintenanceMode = process.env.FEATURE_MAINTENANCE_MODE === 'true';
  
  if (!isMaintenanceMode) {
    return next();
  }

  // Allow access to maintenance page itself
  if (req.path === '/maintenance') {
    return next();
  }

  // Allow access to static assets (CSS, JS, images)
  if (req.path.startsWith('/styles') || 
      req.path.startsWith('/scripts') || 
      req.path.startsWith('/images') || 
      req.path.startsWith('/icons') ||
      req.path.startsWith('/js')) {
    return next();
  }

  // Allow admin access (check if user is authenticated and is admin)
  if (req.user && req.user.isAdmin) {
    return next();
  }

  // Allow logged-in users to access regular screens
  if (req.user && req.isAuthenticated()) {
    return next();
  }

  // Allow access to login route so users can still log in
  if (req.path === '/auth/login') {
    return next();
  }

  // Block register route during maintenance mode
  if (req.path === '/auth/register') {
    req.flash('error_msg', 'Registration is currently disabled during maintenance. Please try again later.');
    return res.redirect('/maintenance');
  }

  // Allow other admin routes for login functionality
  if (req.path.startsWith('/admin')) {
    return next();
  }

  // Allow health check endpoint for container monitoring
  if (req.path === '/health') {
    return next();
  }

  // Allow API maintenance status endpoint
  if (req.path === '/api/maintenance/status') {
    return next();
  }

  // Redirect all other users to maintenance page
  return res.redirect('/maintenance');
};

module.exports = {
  maintenanceMode
};