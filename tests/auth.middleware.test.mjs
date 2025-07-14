/**
 * Authentication Middleware Unit Tests
 * 
 * Tests all authentication middleware functions including session management,
 * user loading, and authorization checks following strict MVC patterns.
 */

import { jest } from '@jest/globals';

// Mock dependencies using jest.unstable_mockModule
const mockUser = {
  findByPk: jest.fn()
};

const mockClub = jest.fn();

jest.unstable_mockModule('../models/index.mjs', () => ({
  User: mockUser,
  Club: mockClub
}));

// Import after mocking
const {
  setupSessionAuth,
  loadSessionUser,
  ensureAuthenticated,
  ensureGuest,
  ensureAdmin,
  ensurePrimaryDelegate
} = await import('../middleware/auth.mjs');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Mock request object
    req = {
      session: {
        userId: null,
        save: jest.fn((callback) => callback(null)),
        destroy: jest.fn((callback) => callback(null))
      },
      user: null,
      flash: jest.fn()
    };

    // Mock response object
    res = {
      redirect: jest.fn()
    };

    // Mock next function
    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('setupSessionAuth middleware', () => {
    it('should add login method to request object', () => {
      setupSessionAuth(req, res, next);

      expect(typeof req.login).toBe('function');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should add logout method to request object', () => {
      setupSessionAuth(req, res, next);

      expect(typeof req.logout).toBe('function');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should add isAuthenticated method to request object', () => {
      setupSessionAuth(req, res, next);

      expect(typeof req.isAuthenticated).toBe('function');
      expect(next).toHaveBeenCalledTimes(1);
    });

    describe('req.login method', () => {
      it('should set session userId and user on successful login', (done) => {
        setupSessionAuth(req, res, next);

        const mockUser = { id: 1, email: 'test@example.com' };

        req.login(mockUser, (err) => {
          expect(err).toBeNull();
          expect(req.session.userId).toBe(1);
          expect(req.user).toEqual(mockUser);
          expect(req.session.save).toHaveBeenCalledTimes(1);
          done();
        });
      });

      it('should handle session save errors', (done) => {
        setupSessionAuth(req, res, next);

        const mockError = new Error('Session save failed');
        req.session.save = jest.fn((callback) => callback(mockError));

        const mockUser = { id: 1, email: 'test@example.com' };

        req.login(mockUser, (err) => {
          expect(err).toEqual(mockError);
          expect(req.session.userId).toBe(1);
          expect(req.user).toBeNull(); // Changed from toBeUndefined to toBeNull
          done();
        });
      });
    });

    describe('req.logout method', () => {
      it('should destroy session and clear user on logout', (done) => {
        setupSessionAuth(req, res, next);

        req.session.userId = 1;
        req.user = { id: 1, email: 'test@example.com' };

        req.logout((err) => {
          expect(err).toBeNull();
          expect(req.session.destroy).toHaveBeenCalledTimes(1);
          expect(req.user).toBeNull();
          done();
        });
      });

      it('should handle session destroy errors', (done) => {
        setupSessionAuth(req, res, next);

        const mockError = new Error('Session destroy failed');
        req.session.destroy = jest.fn((callback) => callback(mockError));

        req.logout((err) => {
          expect(err).toEqual(mockError);
          expect(req.session.destroy).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    describe('req.isAuthenticated method', () => {
      it('should return true when user is authenticated', () => {
        setupSessionAuth(req, res, next);

        req.session.userId = 1;
        req.user = { id: 1, email: 'test@example.com' };

        expect(req.isAuthenticated()).toBe(true);
      });

      it('should return false when no session userId', () => {
        setupSessionAuth(req, res, next);

        req.user = { id: 1, email: 'test@example.com' };

        expect(req.isAuthenticated()).toBe(false);
      });

      it('should return false when no user object', () => {
        setupSessionAuth(req, res, next);

        req.session.userId = 1;

        expect(req.isAuthenticated()).toBe(false);
      });

      it('should return false when neither session nor user exist', () => {
        setupSessionAuth(req, res, next);

        expect(req.isAuthenticated()).toBe(false);
      });
    });
  });

  describe('loadSessionUser middleware', () => {
    let mockUser;

    beforeEach(async () => {
      mockUser = {
        id: 1,
        email: 'test@example.com',
        isActive: true
      };

      // Import and mock the User model
      const { User } = await import('../models/index.mjs');
      User.findByPk.mockResolvedValue(mockUser);
    });

    it('should load user when session userId exists but no user object', async () => {
      req.session.userId = 1;

      await loadSessionUser(req, res, next);

      const { User, Club } = await import('../models/index.mjs');
      expect(User.findByPk).toHaveBeenCalledWith(1, {
        include: [{
          model: Club,
          as: 'club'
        }]
      });
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should not query database when user already exists', async () => {
      req.session.userId = 1;
      req.user = mockUser;

      await loadSessionUser(req, res, next);

      const { User } = await import('../models/index.mjs');
      expect(User.findByPk).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should not query database when no session userId', async () => {
      await loadSessionUser(req, res, next);

      const { User } = await import('../models/index.mjs');
      expect(User.findByPk).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should clear session when user not found', async () => {
      req.session.userId = 1;

      const { User } = await import('../models/index.mjs');
      User.findByPk.mockResolvedValue(null);

      await loadSessionUser(req, res, next);

      expect(req.session.userId).toBeNull();
      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should clear session when user is inactive', async () => {
      req.session.userId = 1;

      const inactiveUser = { ...mockUser, isActive: false };
      const { User } = await import('../models/index.mjs');
      User.findByPk.mockResolvedValue(inactiveUser);

      await loadSessionUser(req, res, next);

      expect(req.session.userId).toBeNull();
      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      req.session.userId = 1;

      const mockError = new Error('Database connection failed');
      const { User } = await import('../models/index.mjs');
      User.findByPk.mockRejectedValue(mockError);

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await loadSessionUser(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith('Error loading session user:', mockError);
      expect(req.session.userId).toBeNull();
      expect(next).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });

  describe('ensureAuthenticated middleware', () => {
    beforeEach(() => {
      // Setup authentication methods
      setupSessionAuth(req, res, next);
      next.mockClear(); // Clear the call from setupSessionAuth
    });

    it('should call next() when user is authenticated', () => {
      req.session.userId = 1;
      req.user = { id: 1, email: 'test@example.com' };

      ensureAuthenticated(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
      expect(req.flash).not.toHaveBeenCalled();
    });

    it('should redirect to login when user is not authenticated', () => {
      ensureAuthenticated(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Please log in to access this page');
      expect(res.redirect).toHaveBeenCalledWith('/auth/login');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to login when user has session but no user object', () => {
      req.session.userId = 1;
      // req.user remains null

      ensureAuthenticated(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Please log in to access this page');
      expect(res.redirect).toHaveBeenCalledWith('/auth/login');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ensureGuest middleware', () => {
    beforeEach(() => {
      // Setup authentication methods
      setupSessionAuth(req, res, next);
      next.mockClear(); // Clear the call from setupSessionAuth
    });

    it('should call next() when user is not authenticated', () => {
      ensureGuest(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is authenticated', () => {
      req.session.userId = 1;
      req.user = { id: 1, email: 'test@example.com' };

      ensureGuest(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ensurePrimaryDelegate middleware', () => {
    beforeEach(() => {
      // Setup authentication methods
      setupSessionAuth(req, res, next);
      next.mockClear(); // Clear the call from setupSessionAuth
    });

    it('should call next() when user is authenticated and is primary delegate', () => {
      req.session.userId = 1;
      req.user = { 
        id: 1, 
        email: 'test@example.com',
        isPrimaryDelegate: true
      };

      ensurePrimaryDelegate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
      expect(req.flash).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is not authenticated', () => {
      ensurePrimaryDelegate(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Primary delegate privileges required.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is authenticated but not primary delegate', () => {
      req.session.userId = 1;
      req.user = { 
        id: 1, 
        email: 'test@example.com',
        isPrimaryDelegate: false
      };

      ensurePrimaryDelegate(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Primary delegate privileges required.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is missing isPrimaryDelegate property', () => {
      req.session.userId = 1;
      req.user = { 
        id: 1, 
        email: 'test@example.com'
        // isPrimaryDelegate is undefined
      };

      ensurePrimaryDelegate(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Primary delegate privileges required.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ensureAdmin middleware', () => {
    beforeEach(() => {
      // Setup authentication methods
      setupSessionAuth(req, res, next);
      next.mockClear(); // Clear the call from setupSessionAuth
    });

    it('should call next() when user is authenticated and is admin', () => {
      req.session.userId = 1;
      req.user = { 
        id: 1, 
        email: 'admin@example.com',
        isAdmin: true
      };

      ensureAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
      expect(req.flash).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is not authenticated', () => {
      ensureAdmin(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Admin privileges required.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is authenticated but not admin', () => {
      req.session.userId = 1;
      req.user = { 
        id: 1, 
        email: 'user@example.com',
        isAdmin: false
      };

      ensureAdmin(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Admin privileges required.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is missing isAdmin property', () => {
      req.session.userId = 1;
      req.user = { 
        id: 1, 
        email: 'user@example.com'
        // isAdmin is undefined
      };

      ensureAdmin(req, res, next);

      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Admin privileges required.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Security and Edge Cases', () => {
    beforeEach(() => {
      setupSessionAuth(req, res, next);
      next.mockClear();
    });

    it('should handle null user object in isAuthenticated', () => {
      req.session.userId = 1;
      req.user = null;

      expect(req.isAuthenticated()).toBe(false);
    });

    it('should handle undefined user object in isAuthenticated', () => {
      req.session.userId = 1;
      req.user = undefined;

      expect(req.isAuthenticated()).toBe(false);
    });

    it('should handle session userId as string', () => {
      req.session.userId = '1';
      req.user = { id: 1, email: 'test@example.com' };

      expect(req.isAuthenticated()).toBe(true);
    });

    it('should handle zero userId in session', () => {
      req.session.userId = 0;
      req.user = { id: 0, email: 'test@example.com' };

      expect(req.isAuthenticated()).toBe(false); // 0 is falsy
    });

    describe('Role-based access with malformed user objects', () => {
      it('should handle null user in ensurePrimaryDelegate', () => {
        req.session.userId = 1;
        req.user = null;

        ensurePrimaryDelegate(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Primary delegate privileges required.');
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });

      it('should handle null user in ensureAdmin', () => {
        req.session.userId = 1;
        req.user = null;

        ensureAdmin(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Admin privileges required.');
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
});