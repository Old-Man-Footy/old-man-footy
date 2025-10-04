/**
 * Return URL Middleware - Store user's origin for smart redirects
 * 
 * Stores the referring URL in the session to enable smart redirects
 * after form submissions or other actions.
 */

/**
 * Middleware to store return URL before rendering edit forms
 * This captures where the user came from so we can redirect them back
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 */
export const storeReturnUrlMiddleware = (req, res, next) => {
  // Store the HTTP Referer as the return URL when navigating to edit forms
  const referer = req.get('Referer') || req.get('Referrer');
  if (referer) {
    // Only store if it's from the same origin to prevent security issues
    try {
      const refererUrl = new URL(referer);
      const currentUrl = new URL(`${req.protocol}://${req.get('host')}`);
      
      if (refererUrl.origin === currentUrl.origin) {
        req.session.returnUrl = referer;
      }
    } catch (error) {
      // Invalid URL, ignore
    }
  }
  next();
};

/**
 * Middleware specifically for club edit forms
 * Stores return URL when users navigate to club edit pages
 */
export const storeClubReturnUrl = (req, res, next) => {
  // Store the HTTP Referer as the return URL
  const referer = req.get('Referer') || req.get('Referrer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const currentUrl = new URL(`${req.protocol}://${req.get('host')}`);
      
      if (refererUrl.origin === currentUrl.origin) {
        req.session.returnUrl = referer;
      }
    } catch (error) {
      // Invalid URL, ignore
    }
  }
  next();
};

/**
 * Middleware specifically for carnival edit forms
 * Stores return URL when users navigate to carnival edit pages
 */  
export const storeCarnivalReturnUrl = (req, res, next) => {
  // Store the HTTP Referer as the return URL
  const referer = req.get('Referer') || req.get('Referrer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const currentUrl = new URL(`${req.protocol}://${req.get('host')}`);
      
      if (refererUrl.origin === currentUrl.origin) {
        req.session.returnUrl = referer;
      }
    } catch (error) {
      // Invalid URL, ignore
    }
  }
  next();
};
