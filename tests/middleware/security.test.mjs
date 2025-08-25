/**
 * Security Middleware Unit Tests
 * 
 * Comprehensive test suite for centralized security middleware following
 * security-first principles and strict MVC architecture.
 * 
 * Test Categories:
 * - Rate Limiting
 * - Input Sanitization  
 * - XSS Protection
 * - SQL Injection Protection
 * - CSRF Protection
 * - Security Headers
 * - Session Security
 * - File Upload Security
 * - API Security
 */

import { describe, test, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock helmet
const mockHelmet = vi.fn().mockReturnValue((req, res, next) => next());

vi.mock('helmet', () => ({
  default: mockHelmet
}));

// Import the security middleware after mocking
const {
  generalRateLimit,
  authRateLimit,
  formSubmissionRateLimit,
  sanitizeInput,
  csrfProtection,
  sessionSecurity,
  validatePassword,
  validateSecureEmail,
  validateFileUpload,
  apiSecurity,
  securityAuditLog,
  applySecurity,
  applyAuthSecurity,
  applyApiSecurity,
  applyAdminSecurity,
  SECURITY_CONFIG,
  createRateLimiter,
  sanitizeString,
  validateInputSecurity
} = await import('../../middleware/security.mjs');

describe('Security Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      ip: '127.0.0.1',
      method: 'POST',
      path: '/test',
      body: {},
      headers: {},
      session: {},
      user: null,
      get: vi.fn(),
      connection: { remoteAddress: '127.0.0.1' }
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis()
    };
    
    mockNext = vi.fn();
  });

  describe('Rate Limiting', () => {
    describe('generalRateLimit', () => {
      it('should be configured with correct default settings', () => {
        expect(SECURITY_CONFIG.rateLimit).toEqual({
          windowMs: 15 * 60 * 1000,
          max: 150,
          message: {
            error: {
              status: 429,
              message: 'You\'re browsing a bit too quickly! Please wait a few minutes before continuing.'
            }
          },
          standardHeaders: true,
          legacyHeaders: false,
          skipSuccessfulRequests: false,
          skipFailedRequests: false
        });
      });

      it('should create rate limiter with custom configuration', () => {
        const customConfig = {
          windowMs: 10000,
          max: 25,
          message: { error: { status: 429, message: 'Custom message' } }
        };
        
        const rateLimiter = createRateLimiter(customConfig);
        expect(typeof rateLimiter).toBe('function');
      });

      it('should allow requests within rate limit', () => {
        generalRateLimit(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should block requests exceeding rate limit', () => {
        // Temporarily set NODE_ENV to non-test to enable rate limiting
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        try {
          const testRateLimit = createRateLimiter({
            windowMs: 60000,
            max: 2,
            message: { error: { status: 429, message: 'Rate limit exceeded' } }
          });

          // Create separate request objects to ensure each has consistent identity
          const req1 = { ...mockReq, ip: '192.168.1.100' };
          const req2 = { ...mockReq, ip: '192.168.1.100' };
          const req3 = { ...mockReq, ip: '192.168.1.100' };

          // First two requests should pass
          testRateLimit(req1, mockRes, mockNext);
          testRateLimit(req2, mockRes, mockNext);
          expect(mockNext).toHaveBeenCalledTimes(2);

          // Third request should be blocked
          mockNext.mockClear();
          mockRes.status.mockClear();
          testRateLimit(req3, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(429);
          expect(mockNext).not.toHaveBeenCalled();
        } finally {
          // Restore original NODE_ENV
          process.env.NODE_ENV = originalEnv;
        }
      });
    });

    describe('authRateLimit', () => {
      it('should have stricter limits for authentication', () => {
        expect(SECURITY_CONFIG.authRateLimit.max).toBe(8);
        expect(SECURITY_CONFIG.authRateLimit.windowMs).toBe(10 * 60 * 1000);
        expect(SECURITY_CONFIG.authRateLimit.message.error.message).toBe('Multiple login attempts detected. For your security, please wait 10 minutes before trying again.');
        expect(SECURITY_CONFIG.authRateLimit.skipSuccessfulRequests).toBe(true);
      });
    });

    describe('formSubmissionRateLimit', () => {
      it('should have appropriate limits for form submissions', () => {
        expect(SECURITY_CONFIG.formSubmissionRateLimit.max).toBe(10);
        expect(SECURITY_CONFIG.formSubmissionRateLimit.windowMs).toBe(5 * 60 * 1000);
        expect(SECURITY_CONFIG.formSubmissionRateLimit.message.error.message).toBe('You\'re submitting forms quite frequently. Please wait a few minutes before trying again.');
        expect(SECURITY_CONFIG.formSubmissionRateLimit.skipSuccessfulRequests).toBe(false);
      });

      it('should exist as a rate limiter function', () => {
        expect(typeof formSubmissionRateLimit).toBe('function');
      });
    });
  });

  describe('Input Sanitization', () => {
    describe('sanitizeString', () => {
      it('should remove script tags', () => {
        const maliciousInput = '<script>alert("xss")</script>Hello World';
        const result = sanitizeString(maliciousInput);
        expect(result).not.toContain('<script>');
        expect(result).toContain('Hello World');
      });

      it('should remove javascript: protocols', () => {
        const maliciousInput = 'javascript:alert("xss")';
        const result = sanitizeString(maliciousInput);
        expect(result).toBe('alert("xss")');
      });

      it('should remove iframe tags', () => {
        const maliciousInput = '<iframe src="evil.com"></iframe>Content';
        const result = sanitizeString(maliciousInput);
        expect(result).toBe('Content');
      });

      it('should remove event handlers', () => {
        const maliciousInput = '<img onerror="alert(1)" src="x">Content';
        const result = sanitizeString(maliciousInput);
        expect(result).not.toContain('onerror=');
        expect(result).toContain('Content');
      });

      it('should return non-string values unchanged', () => {
        expect(sanitizeString(123)).toBe(123);
        expect(sanitizeString(null)).toBe(null);
        expect(sanitizeString(undefined)).toBe(undefined);
        expect(sanitizeString({})).toEqual({});
      });
    });

    describe('validateInputSecurity', () => {
      const sqlInjectionPatterns = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users",
        "INSERT INTO users VALUES",
        "UPDATE users SET password",
        "DELETE FROM users WHERE",
        "EXEC xp_cmdshell"
      ];

      sqlInjectionPatterns.forEach(pattern => {
        it(`should detect SQL injection pattern: ${pattern}`, () => {
          expect(() => validateInputSecurity(pattern)).toThrow('Invalid input detected. Please check your data.');
        });
      });

      const xssPatterns = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'vbscript:msgbox("xss")',
        '<img onerror="alert(1)" src="x">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)"></object>',
        '<embed src="javascript:alert(1)"></embed>'
      ];

      xssPatterns.forEach(pattern => {
        it(`should detect XSS pattern: ${pattern}`, () => {
          expect(() => validateInputSecurity(pattern)).toThrow('Invalid input detected. HTML/JavaScript content is not allowed.');
        });
      });

      it('should allow safe input', () => {
        expect(validateInputSecurity('Hello World')).toBe(true);
        expect(validateInputSecurity('user@example.com')).toBe(true);
        expect(validateInputSecurity('123-456-7890')).toBe(true);
      });
    });

    describe('sanitizeInput middleware', () => {
      it('should sanitize request body', () => {
        mockReq.body = {
          name: '<script>alert("xss")</script>John',
          email: 'javascript:void(0)test@example.com'
        };

        sanitizeInput(mockReq, mockRes, mockNext);
        
        expect(mockReq.body.name).not.toContain('<script>');
        expect(mockReq.body.name).toContain('John');
        expect(mockReq.body.email).not.toContain('javascript:');
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should sanitize query parameters', () => {
        mockReq.query = {
          search: '<iframe src="evil.com"></iframe>safe search'
        };

        sanitizeInput(mockReq, mockRes, mockNext);
        
        expect(mockReq.query.search).not.toContain('<iframe>');
        expect(mockReq.query.search).toContain('safe search');
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should block malicious SQL injection in body', () => {
        mockReq.body = {
          username: "admin'; DROP TABLE users; --"
        };

        sanitizeInput(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: {
            status: 400,
            message: 'Invalid input detected. Please check your data.'
          }
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('CSRF Protection', () => {
    describe('csrfProtection', () => {
      it('should skip CSRF protection for GET requests', () => {
        mockReq.method = 'GET';
        csrfProtection(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should skip CSRF protection for API endpoints', () => {
        mockReq.path = '/api/test';
        csrfProtection(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should generate CSRF token if none exists', () => {
        mockReq.session = {};
        csrfProtection(mockReq, mockRes, mockNext);
        expect(mockReq.session.csrfToken).toBeDefined();
        expect(typeof mockReq.session.csrfToken).toBe('string');
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should reject requests with invalid CSRF token', () => {
        mockReq.session = { csrfToken: 'valid-token' };
        mockReq.body = { _token: 'invalid-token' };
        
        csrfProtection(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: {
            status: 403,
            message: 'Invalid or missing CSRF token'
          }
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should accept requests with valid CSRF token', () => {
        const validToken = 'valid-token-123';
        mockReq.session = { csrfToken: validToken };
        mockReq.body = { _token: validToken };
        
        csrfProtection(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should accept CSRF token from headers', () => {
        const validToken = 'valid-token-456';
        mockReq.session = { csrfToken: validToken };
        mockReq.headers['x-csrf-token'] = validToken;
        
        csrfProtection(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });

  describe('Session Security', () => {
    describe('sessionSecurity', () => {
      it('should continue without regeneration for users without sessions', () => {
        delete mockReq.session;
        sessionSecurity(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should continue without regeneration for anonymous users', () => {
        mockReq.session = {};
        mockReq.user = null;
        sessionSecurity(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should continue without regeneration if session is recent', () => {
        mockReq.session = {
          lastRegeneration: Date.now() - 10000 // 10 seconds ago
        };
        mockReq.user = { id: 1 };
        
        sessionSecurity(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should regenerate session if interval exceeded', () => {
        return new Promise((done) => {
          mockReq.session = {
            lastRegeneration: Date.now() - 31 * 60 * 1000, // 31 minutes ago
            regenerate: vi.fn((callback) => {
              callback(null);
            }),
            userId: 1
          };
          mockReq.user = { id: 1 };
          
          sessionSecurity(mockReq, mockRes, (err) => {
            expect(err).toBeUndefined();
            expect(mockReq.session.regenerate).toHaveBeenCalled();
            expect(mockReq.session.lastRegeneration).toBeDefined();
            expect(mockReq.session.userId).toBe(1);
            done();
          });
        });
      });

      it('should handle session regeneration errors', () => {
        return new Promise((done) => {
          const regenerationError = new Error('Session regeneration failed');
          mockReq.session = {
            lastRegeneration: Date.now() - 31 * 60 * 1000,
            regenerate: vi.fn((callback) => {
              callback(regenerationError);
            })
          };
          mockReq.user = { id: 1 };
          
          sessionSecurity(mockReq, mockRes, (err) => {
            expect(err).toBe(regenerationError);
            done();
          });
        });
      });
    });
  });

  describe('Password Validation', () => {
    describe('validatePassword', () => {
      const weakPasswords = [
        'short',           // Too short
        'onlylowercase',   // No uppercase, no numbers, no special chars
        'ONLYUPPERCASE',   // No lowercase, no numbers, no special chars
        'NoNumbers!',      // No numbers
        'NoSpecial123',    // No special characters
        '12345678'         // Only numbers
      ];

      const strongPasswords = [
        'StrongPass123!',
        'MySecur3P@ssw0rd',
        'C0mpl3x!Password',
        'Tr0ub4dor&3'
      ];

      weakPasswords.forEach(password => {
        it(`should reject weak password: ${password}`, () => {
          const result = validatePassword(password);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        });
      });

      strongPasswords.forEach(password => {
        it(`should accept strong password: ${password}`, () => {
          const result = validatePassword(password);
          expect(result.isValid).toBe(true);
          expect(result.errors.length).toBe(0);
        });
      });

      it('should provide specific error messages', () => {
        const result = validatePassword('weak');
        expect(result.errors).toContain('Password must be at least 8 characters long');
        expect(result.errors).toContain('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      });
    });
  });

  describe('Email Validation', () => {
    describe('validateSecureEmail', () => {
      it('should accept valid emails', () => {
        const validEmails = [
          'test@gmail.com',
          'user@company.com.au',
          'admin@university.edu',
          'contact@government.gov.au'
        ];
        
        validEmails.forEach(email => {
          const result = validateSecureEmail(email);
          expect(result.isValid).toBe(true);
          expect(result.errors.length).toBe(0);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'notanemail',
          '@example.com',
          'test@',
          'test..test@example.com'
        ];
        
        invalidEmails.forEach(email => {
          const result = validateSecureEmail(email);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Please provide a valid email address');
        });
      });

      it('should block disposable email domains', () => {
        const disposableEmails = [
          'test@10minutemail.com',
          'user@tempmail.org',
          'fake@guerrillamail.com',
          'temp@mailinator.com'
        ];
        
        disposableEmails.forEach(email => {
          const result = validateSecureEmail(email);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Disposable email addresses are not allowed');
        });
      });
    });
  });

  describe('File Upload Security', () => {
    describe('validateFileUpload', () => {
      it('should pass through when no files are uploaded', () => {
        const middleware = validateFileUpload();
        middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should reject files exceeding size limit', () => {
        const maxSize = 1024; // 1KB
        const middleware = validateFileUpload([], maxSize);
        
        mockReq.file = {
          size: 2048, // 2KB
          mimetype: 'image/jpeg',
          originalname: 'test.jpg'
        };
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: {
            status: 400,
            message: 'File size exceeds limit of 0.0009765625MB'
          }
        });
      });

      it('should reject files with disallowed MIME types', () => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        const middleware = validateFileUpload(allowedTypes);
        
        mockReq.file = {
          size: 1024,
          mimetype: 'application/pdf',
          originalname: 'test.pdf'
        };
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: {
            status: 400,
            message: 'File type application/pdf is not allowed'
          }
        });
      });

      it('should reject files with malicious names', () => {
        const middleware = validateFileUpload();
        
        const maliciousNames = [
          '/etc/passwd',
          'test<script>.jpg',
          'file:with:colons.png',
          'file"with"quotes.gif',
          'file|with|pipes.pdf'
        ];
        
        maliciousNames.forEach(filename => {
          mockReq.file = {
            size: 1024,
            mimetype: 'image/jpeg',
            originalname: filename
          };
          
          mockRes.status.mockClear();
          mockRes.json.mockClear();
          mockNext.mockClear();
          
          middleware(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: {
              status: 400,
              message: 'Invalid file name'
            }
          });
        });
      });

      it('should accept valid files', () => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        const middleware = validateFileUpload(allowedTypes);
        
        mockReq.file = {
          size: 1024,
          mimetype: 'image/jpeg',
          originalname: 'valid-file.jpg'
        };
        
        middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });

  describe('API Security', () => {
    describe('apiSecurity', () => {
      it('should set security headers for API responses', () => {
        apiSecurity(mockReq, mockRes, mockNext);
        
        expect(mockRes.set).toHaveBeenCalledWith({
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        });
        
        expect(mockRes.type).toHaveBeenCalledWith('application/json');
        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });

  describe('Security Audit Logging', () => {
    describe('securityAuditLog', () => {
      beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
      });

      afterEach(() => {
        console.log.mockRestore();
      });

      it('should create audit log middleware', () => {
        const middleware = securityAuditLog('test_event');
        expect(typeof middleware).toBe('function');
      });

      it('should log security events with correct data', () => {
        const middleware = securityAuditLog('test_event', { custom: 'data' });
        
        mockReq.user = { id: 123 };
        mockReq.get.mockReturnValue('Mozilla/5.0');
        
        // Set NODE_ENV to production to test logging
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(console.log).toHaveBeenCalledWith(
          'SECURITY_AUDIT:',
          expect.stringContaining('"event":"test_event"')
        );
        expect(console.log).toHaveBeenCalledWith(
          'SECURITY_AUDIT:',
          expect.stringContaining('"userId":123')
        );
        expect(console.log).toHaveBeenCalledWith(
          'SECURITY_AUDIT:',
          expect.stringContaining('"custom":"data"')
        );
        
        process.env.NODE_ENV = originalEnv;
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should not log in test environment', () => {
        const middleware = securityAuditLog('test_event');
        middleware(mockReq, mockRes, mockNext);
        
        expect(console.log).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });

  describe('Security Middleware Stacks', () => {
    describe('applySecurity', () => {
      it('should contain general security middleware', () => {
        expect(Array.isArray(applySecurity)).toBe(true);
        expect(applySecurity.length).toBeGreaterThan(0);
      });
    });

    describe('applyAuthSecurity', () => {
      it('should contain authentication security middleware', () => {
        expect(Array.isArray(applyAuthSecurity)).toBe(true);
        expect(applyAuthSecurity.length).toBeGreaterThan(0);
      });
    });

    describe('applyApiSecurity', () => {
      it('should contain API security middleware', () => {
        expect(Array.isArray(applyApiSecurity)).toBe(true);
        expect(applyApiSecurity.length).toBeGreaterThan(0);
      });
    });

    describe('applyAdminSecurity', () => {
      it('should contain admin security middleware with stricter limits', () => {
        expect(Array.isArray(applyAdminSecurity)).toBe(true);
        expect(applyAdminSecurity.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Security Configuration', () => {
    describe('SECURITY_CONFIG', () => {
      it('should have rate limit configuration', () => {
        expect(SECURITY_CONFIG.rateLimit).toBeDefined();
        expect(typeof SECURITY_CONFIG.rateLimit.windowMs).toBe('number');
        expect(typeof SECURITY_CONFIG.rateLimit.max).toBe('number');
      });

      it('should have auth rate limit configuration', () => {
        expect(SECURITY_CONFIG.authRateLimit).toBeDefined();
        expect(SECURITY_CONFIG.authRateLimit.max).toBeLessThan(SECURITY_CONFIG.rateLimit.max);
      });

      it('should have helmet configuration', () => {
        expect(SECURITY_CONFIG.helmet).toBeDefined();
        expect(SECURITY_CONFIG.helmet.contentSecurityPolicy).toBeDefined();
        expect(SECURITY_CONFIG.helmet.hsts).toBeDefined();
      });

      it('should have secure CSP directives', () => {
        const csp = SECURITY_CONFIG.helmet.contentSecurityPolicy.directives;
        expect(csp.defaultSrc).toContain("'self'");
        expect(csp.frameSrc).toContain("'none'");
        expect(csp.objectSrc).toContain("'none'");
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Malformed Requests', () => {
      it('should handle requests with missing properties', () => {
        const malformedReq = {};
        const middleware = securityAuditLog('test');
        
        expect(() => {
          middleware(malformedReq, mockRes, mockNext);
        }).not.toThrow();
      });

      it('should handle null/undefined values safely', () => {
        mockReq.body = null;
        mockReq.session = null;
        mockReq.user = null;
        
        expect(() => {
          sessionSecurity(mockReq, mockRes, mockNext);
        }).not.toThrow();
      });
    });
  });
});