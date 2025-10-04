/**
 * Redirect Utility for Smart Navigation
 * Provides functionality to redirect users back to their previous screen
 * with appropriate fallbacks and security measures.
 */

import { URL } from 'url';

/**
 * Validates if a URL is safe for redirection
 * Prevents open redirect attacks by validating the URL
 * @param {string} url - The URL to validate
 * @param {string} baseUrl - The base URL of the application (e.g., 'https://localhost:3050')
 * @returns {boolean} - True if safe, false otherwise
 */
export function isValidRedirectUrl(url, baseUrl) {
  if (!url) return false;
  
  // Basic path traversal protection - check before URL construction
  if (url.includes('..')) {
    return false;
  }
  
  try {
    const redirectUrl = new URL(url, baseUrl);
    const base = new URL(baseUrl);
    
    // Only allow redirects to the same origin
    if (redirectUrl.origin !== base.origin) {
      return false;
    }
    
    // Don't allow redirects to sensitive paths
    const restrictedPaths = ['/login', '/register', '/logout', '/auth'];
    if (restrictedPaths.some(path => redirectUrl.pathname.startsWith(path))) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets the return URL from various sources with fallback logic
 * @param {Object} req - Express request object
 * @param {string} fallbackUrl - Default fallback URL if no valid return URL found
 * @returns {string} - The URL to redirect to
 */
export function getReturnUrl(req, fallbackUrl = '/dashboard') {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  // Priority 1: Explicit returnUrl parameter
  if (req.query.returnUrl && isValidRedirectUrl(req.query.returnUrl, baseUrl)) {
    return req.query.returnUrl;
  }
  
  // Priority 2: returnUrl in form body
  if (req.body.returnUrl && isValidRedirectUrl(req.body.returnUrl, baseUrl)) {
    return req.body.returnUrl;
  }
  
  // Priority 3: Session stored return URL
  if (req.session?.returnUrl && isValidRedirectUrl(req.session.returnUrl, baseUrl)) {
    const returnUrl = req.session.returnUrl;
    delete req.session.returnUrl; // Clear it after use
    return returnUrl;
  }
  
  // Priority 4: HTTP Referer header
  const referer = req.get('Referer') || req.get('Referrer');
  if (referer && isValidRedirectUrl(referer, baseUrl)) {
    // Avoid redirect loops by not redirecting back to the current URL
    if (!referer.includes(req.originalUrl)) {
      return referer;
    }
  }
  
  // Priority 5: Smart fallback based on user role and context
  return getSmartFallback(req, fallbackUrl);
}

/**
 * Provides smart fallback URLs based on user context
 * @param {Object} req - Express request object
 * @param {string} defaultFallback - Default fallback URL
 * @returns {string} - The smart fallback URL
 */
function getSmartFallback(req, defaultFallback) {
  // For admin users, try to determine if they came from admin area
  if (req.user?.isAdmin) {
    // If they were editing a club, redirect to admin clubs
    if (req.originalUrl.includes('/clubs/') && req.originalUrl.includes('/edit')) {
      return '/admin/clubs';
    }
    // If they were editing a carnival, redirect to admin carnivals or carnivals list
    if (req.originalUrl.includes('/carnivals/') && req.originalUrl.includes('/edit')) {
      return '/admin/carnivals';
    }
  }
  
  // For regular users
  if (req.originalUrl.includes('/clubs/')) {
    return '/clubs';
  }
  
  if (req.originalUrl.includes('/carnivals/')) {
    return '/carnivals';
  }
  
  return defaultFallback;
}

/**
 * Stores the current URL as a return URL in session for later use
 * Useful for storing where user came from before redirecting to edit forms
 * @param {Object} req - Express request object
 */
export function storeReturnUrl(req) {
  // Don't store edit or POST URLs as return URLs
  if (req.method === 'GET' && !req.originalUrl.includes('/edit')) {
    req.session.returnUrl = req.originalUrl;
  }
}

/**
 * Handles smart redirect with appropriate flash message
 * @param {Object} req - Express request object  
 * @param {Object} res - Express response object
 * @param {string} successMessage - Success message to flash
 * @param {string} fallbackUrl - Fallback URL if no return URL found
 */
export function smartRedirect(req, res, successMessage, fallbackUrl = '/dashboard') {
  const returnUrl = getReturnUrl(req, fallbackUrl);
  
  if (successMessage) {
    req.flash('success_msg', successMessage);
  }
  
  return res.redirect(returnUrl);
}

/**
 * Handles smart redirect for AJAX requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {string} successMessage - Success message to return
 * @param {string} fallbackUrl - Fallback URL if no return URL found
 */
export function smartAjaxResponse(req, res, successMessage, fallbackUrl = '/dashboard') {
  const returnUrl = getReturnUrl(req, fallbackUrl);
  
  return res.json({
    success: true,
    message: successMessage,
    redirectUrl: returnUrl
  });
}
