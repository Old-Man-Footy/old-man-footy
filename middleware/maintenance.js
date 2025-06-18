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

  // Allow access to admin login routes so admins can still log in
  if (req.path.startsWith('/admin') || req.path.startsWith('/auth')) {
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