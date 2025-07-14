/**
 * Centralized Security Middleware - Security First Implementation
 * 
 * Consolidates all security measures in one location for better maintainability,
 * auditing, and compliance with the project's security-first directive.
 * 
 * Security Features:
 * - CSRF Protection
 * - Rate Limiting  
 * - Input Sanitization
 * - XSS Protection
 * - Security Headers
 * - Content Security Policy
 * - SQL Injection Protection
 * - Session Security
 */

import helmet from 'helmet';
import crypto from 'crypto';

/**
 * Security configuration object
 */
const SECURITY_CONFIG = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: {
        status: 429,
        message: 'Too many requests from this IP. Please try again later.'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  authRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts per windowMs
    message: {
      error: {
        status: 429,
        message: 'Too many authentication attempts. Please try again later.'
      }
    },
    skipSuccessfulRequests: true
  },

  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        workerSrc: ["'none'"],
        childSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        manifestSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Disabled for compatibility
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }
};

/**
 * Create rate limiter with custom configuration
 * @param {Object} config - Rate limit configuration
 * @returns {Function} Express middleware
 */
const createRateLimiter = (config = SECURITY_CONFIG.rateLimit) => {
  // Simple in-memory rate limiter for this implementation
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create request log for this IP
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    requests.set(key, validRequests);
    
    // Check if limit exceeded
    if (validRequests.length >= config.max) {
      return res.status(429).json(config.message);
    }
    
    // Add current request
    validRequests.push(now);
    requests.set(key, validRequests);
    
    next();
  };
};

/**
 * General rate limiting middleware
 */
export const generalRateLimit = createRateLimiter();

/**
 * Authentication-specific rate limiting
 */
export const authRateLimit = createRateLimiter(SECURITY_CONFIG.authRateLimit);

/**
 * Helmet security headers middleware
 */
export const securityHeaders = helmet(SECURITY_CONFIG.helmet);

/**
 * Input sanitization function
 * Sanitizes common attack vectors from user input
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove potentially dangerous HTML tags and script content
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

/**
 * Validate input for injection patterns
 */
const validateInputSecurity = (value) => {
  if (typeof value !== 'string') {
    return true;
  }
  
  // Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /(\bUNION\b.*\bSELECT\b)|(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b.*\bINTO\b)|(\bUPDATE\b.*\bSET\b)/i,
    /(\bDELETE\b.*\bFROM\b)|(\bDROP\b.*\bTABLE\b)/i,
    /(\bEXEC\b)|(\bEXECUTE\b)/i,
    /(\'.*\bOR\b.*\')|(\bOR\b.*1.*=.*1)/i
  ];
  
  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(value)) {
      throw new Error('Invalid input detected. Please check your data.');
    }
  }
  
  // Check for XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  for (const pattern of xssPatterns) {
    if (pattern.test(value)) {
      throw new Error('Invalid input detected. HTML/JavaScript content is not allowed.');
    }
  }
  
  return true;
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (req.body.hasOwnProperty(key)) {
        try {
          req.body[key] = sanitizeString(req.body[key]);
          validateInputSecurity(req.body[key]);
        } catch (error) {
          return res.status(400).json({
            error: {
              status: 400,
              message: error.message
            }
          });
        }
      }
    }
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (req.query.hasOwnProperty(key)) {
        try {
          req.query[key] = sanitizeString(req.query[key]);
          validateInputSecurity(req.query[key]);
        } catch (error) {
          return res.status(400).json({
            error: {
              status: 400,
              message: error.message
            }
          });
        }
      }
    }
  }
  
  next();
};

/**
 * CSRF protection middleware
 * Validates CSRF tokens for state-changing operations
 */
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and API endpoints that use other auth methods
  if (req.method === 'GET' || req.path.startsWith('/api/')) {
    return next();
  }
  
  // For now, implement a simple token-based approach
  const token = req.body._token || req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;
  
  if (!sessionToken) {
    // Generate token if none exists
    if (req.session) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    return next();
  }
  
  if (req.method !== 'GET' && token !== sessionToken) {
    return res.status(403).json({
      error: {
        status: 403,
        message: 'Invalid or missing CSRF token'
      }
    });
  }
  
  next();
};

/**
 * Session security middleware
 * Enforces secure session handling
 */
export const sessionSecurity = (req, res, next) => {
  // Regenerate session ID periodically for active sessions
  if (req.session && req.user) {
    const lastRegeneration = req.session.lastRegeneration || 0;
    const now = Date.now();
    const regenerationInterval = 30 * 60 * 1000; // 30 minutes
    
    if (now - lastRegeneration > regenerationInterval) {
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration failed:', err);
          return next(err);
        }
        req.session.lastRegeneration = now;
        // Restore user data after regeneration
        if (req.user) {
          req.session.userId = req.user.id;
        }
        next();
      });
      return;
    }
  }
  
  next();
};

/**
 * Password security validation function
 * Enforces strong password requirements
 */
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (!passwordRegex.test(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Email security validation function
 * Enhanced email validation with security checks
 */
export const validateSecureEmail = (email) => {
  const errors = [];
  
  // Basic email format validation - more strict
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }
  
  // Additional validation for edge cases
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.') || 
      email.startsWith('@') || email.endsWith('@')) {
    errors.push('Please provide a valid email address');
  }
  
  // Block common disposable email domains
  const disposableDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'throwaway.email'
  ];
  
  const domain = email.split('@')[1];
  if (disposableDomains.includes(domain)) {
    errors.push('Disposable email addresses are not allowed');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * File upload security middleware
 * Validates and secures file uploads
 */
export const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files || [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          error: {
            status: 400,
            message: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`
          }
        });
      }
      
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: {
            status: 400,
            message: `File type ${file.mimetype} is not allowed`
          }
        });
      }
      
      // Check for malicious file names
      if (/[<>:"/\\|?*\x00-\x1f]/.test(file.originalname)) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Invalid file name'
          }
        });
      }
    }
    
    next();
  };
};

/**
 * API security middleware
 * Additional security for API endpoints
 */
export const apiSecurity = (req, res, next) => {
  // Set security headers for API responses
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  
  // Ensure API responses are JSON
  res.type('application/json');
  
  next();
};

/**
 * Security audit logging middleware
 * Logs security-relevant events
 */
export const securityAuditLog = (event, details = {}) => {
  return (req, res, next) => {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      userId: req.user?.id || null,
      path: req.path || 'Unknown',
      method: req.method || 'Unknown',
      ...details
    };
    
    // In production, send to proper logging service
    if (process.env.NODE_ENV !== 'test') {
      console.log('SECURITY_AUDIT:', JSON.stringify(logData));
    }
    
    next();
  };
};

/**
 * Comprehensive security middleware stack
 * Applies multiple security measures in correct order
 */
export const applySecurity = [
  securityHeaders,
  generalRateLimit,
  sessionSecurity,
  sanitizeInput
];

/**
 * Authentication security middleware stack
 */
export const applyAuthSecurity = [
  securityHeaders,
  authRateLimit,
  sanitizeInput,
  securityAuditLog('auth_attempt')
];

/**
 * API security middleware stack
 */
export const applyApiSecurity = [
  apiSecurity,
  generalRateLimit,
  sanitizeInput
];

/**
 * Admin security middleware stack
 */
export const applyAdminSecurity = [
  securityHeaders,
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 50, // Stricter limits for admin operations
    message: {
      error: {
        status: 429,
        message: 'Too many admin requests. Please try again later.'
      }
    }
  }),
  sanitizeInput,
  securityAuditLog('admin_action')
];

// Export individual components for testing
export {
  SECURITY_CONFIG,
  createRateLimiter,
  sanitizeString,
  validateInputSecurity
};