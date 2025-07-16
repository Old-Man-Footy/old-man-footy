/**
 * Session-Independent Flash Message Middleware
 * 
 * Provides flash message functionality that works for all users,
 * regardless of authentication status. Falls back to URL parameters
 * when sessions are unavailable.
 */

/**
 * Enhanced flash message implementation
 * Works with or without sessions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function enhancedFlash(req, res, next) {
  /**
   * Set a flash message
   * @param {string} type - Message type (success_msg, error_msg, etc.)
   * @param {string} message - The message content
   */
  req.flash = function(type, message) {
    // Try to use session first (preferred method)
    if (req.session) {
      // Initialize flash object if it doesn't exist
      if (!req.session.flash) {
        req.session.flash = {};
      }
      
      // Initialize array for this message type if it doesn't exist
      if (!req.session.flash[type]) {
        req.session.flash[type] = [];
      }
      
      // Add message to session
      req.session.flash[type].push(message);
      
      return req.session.flash[type];
    } else {
      // Fallback: Store in request object for immediate use
      // This is for cases where session is not available
      if (!req._flashMessages) {
        req._flashMessages = {};
      }
      
      if (!req._flashMessages[type]) {
        req._flashMessages[type] = [];
      }
      
      req._flashMessages[type].push(message);
      
      // For redirects without session, we'll encode in URL
      const originalRedirect = res.redirect;
      res.redirect = function(url) {
        // Encode flash messages in URL parameters for redirects
        const messages = req._flashMessages;
        if (messages && Object.keys(messages).length > 0) {
          const urlObj = new URL(url, `${req.protocol}://${req.get('host')}`);
          
          Object.keys(messages).forEach(msgType => {
            if (messages[msgType] && messages[msgType].length > 0) {
              urlObj.searchParams.set(`flash_${msgType}`, messages[msgType].join('|'));
            }
          });
          
          return originalRedirect.call(this, urlObj.pathname + urlObj.search);
        }
        
        return originalRedirect.call(this, url);
      };
      
      return req._flashMessages[type];
    }
  };
  
  /**
   * Get flash messages and clear them
   * @param {string} type - Message type to retrieve
   * @returns {Array} Array of messages
   */
  req.flash.get = function(type) {
    let messages = [];
    
    // Try session first
    if (req.session && req.session.flash && req.session.flash[type]) {
      messages = req.session.flash[type];
      req.session.flash[type] = []; // Clear after reading
    }
    
    // Check URL parameters for flash messages
    const flashParam = req.query[`flash_${type}`];
    if (flashParam) {
      const urlMessages = flashParam.split('|').filter(msg => msg.trim());
      messages = messages.concat(urlMessages);
      
      // Remove flash parameters from query to clean URL
      delete req.query[`flash_${type}`];
    }
    
    // Check request object (immediate use)
    if (req._flashMessages && req._flashMessages[type]) {
      messages = messages.concat(req._flashMessages[type]);
      req._flashMessages[type] = []; // Clear after reading
    }
    
    return messages;
  };
  
  next();
}

/**
 * Global template variables for flash messages
 * Works regardless of session availability
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function flashTemplateVariables(req, res, next) {
  // Make flash messages available to all templates
  res.locals.success_msg = req.flash.get('success_msg');
  res.locals.error_msg = req.flash.get('error_msg');
  res.locals.error = req.flash.get('error');
  res.locals.warning_msg = req.flash.get('warning_msg');
  res.locals.info_msg = req.flash.get('info_msg');
  
  next();
}

export { enhancedFlash, flashTemplateVariables };