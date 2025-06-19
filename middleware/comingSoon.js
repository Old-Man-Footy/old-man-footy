/**
 * Coming Soon Mode Middleware
 * Checks if the application is in coming soon mode and redirects non-admin users
 * to a coming soon page while allowing admin access through environment variable control
 */

/**
 * Middleware to handle coming soon mode
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const comingSoonMode = (req, res, next) => {
  // Check if coming soon mode is enabled via environment variable
  const isComingSoonMode = process.env.FEATURE_COMING_SOON_MODE === 'true';
  
  if (!isComingSoonMode) {
    return next();
  }

  // Allow access to coming soon page itself
  if (req.path === '/coming-soon') {
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

  // Allow API coming soon status endpoint
  if (req.path === '/api/coming-soon/status') {
    return next();
  }

  // Redirect all other users to coming soon page
  return res.redirect('/coming-soon');
};

module.exports = {
  comingSoonMode
};