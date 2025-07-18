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

  // Allow access to subscription endpoint for BOTH coming soon and homepage
  // This must come BEFORE other authentication checks
  if (req.path === '/subscribe') {
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

  // Block register route during coming soon mode - must come BEFORE general auth check
  if (req.path === '/auth/register') {
    req.flash('error_msg', 'Registration is currently disabled. Please check back when we launch!');
    return res.redirect('/coming-soon');
  }

  // Allow other authentication-related routes (login, logout, etc.)
  if (req.path.startsWith('/auth/')) {
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

  // Allow ALL admin routes (including dashboard)
  if (req.path.startsWith('/admin')) {
    return next();
  }

  // Allow authenticated users to access the main dashboard and other protected routes
  // This check must be comprehensive to handle post-login redirects
  if (req.user && (req.isAuthenticated ? req.isAuthenticated() : true)) {
    // Allow access to dashboard for authenticated users
    if (req.path === '/dashboard' || req.path === '/') {
      return next();
    }
    
    // Allow access to other authenticated user routes
    if (req.path.startsWith('/clubs') || 
        req.path.startsWith('/carnivals') || 
        req.path.startsWith('/sponsors') ||
        req.path.startsWith('/carnival-sponsors')) {
      return next();
    }
  }

  // Allow admin access (check if user is authenticated and is admin)
  if (req.user && req.user.isAdmin) {
    return next();
  }

  // Redirect all other users to coming soon page
  return res.redirect('/coming-soon');
};

export {
  comingSoonMode
};