/**
 * Authentication Middleware Unit Tests
 * 
 * Comprehensive test suite for authentication middleware following security-first principles
 * and strict MVC architecture. Tests cover session management, user loading, and authorization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Create comprehensive mocks for all dependencies
const mockUser = {
  findByPk: vi.fn(),
  findOne: vi.fn(),
};

const mockClub = {
  findByPk: vi.fn(),
};

// Mock the models
vi.mock('../models/index.mjs', () => ({
  User: mockUser,
  Club: mockClub,
}));

// Import the auth middleware after mocking
const {
  setupSessionAuth,
  loadSessionUser,
  ensureAuthenticated,
  ensureGuest,
  ensureAdmin,
  ensurePrimaryDelegate,
  requireAdmin,
  requireAdminOrPrimaryDelegate,
  requireDelegate
} = await import('../middleware/auth.mjs');

describe('Authentication Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create fresh mock objects for each test
    mockReq = {
      isAuthenticated: vi.fn(),
      user: null,
      session: {
        userId: null,
        passport: {},
        lastActivity: Date.now(),
        save: vi.fn((callback) => callback(null)),
        destroy: vi.fn((callback) => callback(null))
      },
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: {},
      flash: vi.fn(),
      login: vi.fn(),
      logout: vi.fn()
    };
    
    mockRes = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      locals: {},
      render: vi.fn()
    };
    
    mockNext = vi.fn();
  });

  describe('setupSessionAuth', () => {
    it('should add authentication methods to request object', () => {
      // Act
      setupSessionAuth(mockReq, mockRes, mockNext);

      // Assert
      expect(typeof mockReq.login).toBe('function');
      expect(typeof mockReq.logout).toBe('function');
      expect(typeof mockReq.isAuthenticated).toBe('function');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should implement login method correctly', () => {
      // Arrange
      setupSessionAuth(mockReq, mockRes, mockNext);
      const mockUser = { id: 1, firstName: 'John' };
      
      // Act
      mockReq.login(mockUser, vi.fn());

      // Assert
      expect(mockReq.session.userId).toBe(1);
      expect(mockReq.session.save).toHaveBeenCalled();
    });

    it('should implement logout method correctly', () => {
      // Arrange
      setupSessionAuth(mockReq, mockRes, mockNext);
      mockReq.session.userId = 1;
      mockReq.user = { id: 1 };
      
      // Act
      mockReq.logout(vi.fn());

      // Assert
      expect(mockReq.session.destroy).toHaveBeenCalled();
    });

    it('should implement isAuthenticated method correctly', () => {
      // Arrange
      setupSessionAuth(mockReq, mockRes, mockNext);
      
      // Test unauthenticated state
      mockReq.session.userId = null;
      mockReq.user = null;
      expect(mockReq.isAuthenticated()).toBe(false);

      // Test authenticated state
      mockReq.session.userId = 1;
      mockReq.user = { id: 1 };
      expect(mockReq.isAuthenticated()).toBe(true);
    });
  });

  describe('loadSessionUser', () => {
    it('should load user when session userId exists but user is not loaded', async () => {
      // Arrange
      const mockUserData = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        club: { id: 1, clubName: 'Test Club' }
      };

      mockReq.session.userId = 1;
      mockReq.user = null;
      mockUser.findByPk.mockResolvedValue(mockUserData);

      // Act
      await loadSessionUser(mockReq, mockRes, mockNext);

      // Assert
      expect(mockUser.findByPk).toHaveBeenCalledWith(1, {
        include: [{ model: mockClub, as: 'club' }]
      });
      expect(mockReq.user).toEqual(mockUserData);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should clear session when user is inactive', async () => {
      // Arrange
      const inactiveUser = {
        id: 1,
        firstName: 'John',
        isActive: false
      };

      mockReq.session.userId = 1;
      mockUser.findByPk.mockResolvedValue(inactiveUser);

      // Act
      await loadSessionUser(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.session.userId).toBe(null);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip loading when user is already loaded', async () => {
      // Arrange
      mockReq.session.userId = 1;
      mockReq.user = { id: 1, firstName: 'John' };

      // Act
      await loadSessionUser(mockReq, mockRes, mockNext);

      // Assert
      expect(mockUser.findByPk).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockReq.session.userId = 1;
      mockUser.findByPk.mockRejectedValue(new Error('Database error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await loadSessionUser(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.session.userId).toBe(null);
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
      
      consoleSpy.mockRestore();
    });
  });

  describe('ensureAuthenticated', () => {
    it('should allow authenticated users to proceed', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(true);

      // Act
      ensureAuthenticated(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should redirect unauthenticated users to login', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(false);

      // Act
      ensureAuthenticated(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Please log in to access this page');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('ensureGuest', () => {
    it('should allow unauthenticated users to proceed', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(false);

      // Act
      ensureGuest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should redirect authenticated users to dashboard', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(true);

      // Act
      ensureGuest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('ensureAdmin', () => {
    it('should allow admin users to proceed', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(true);
      mockReq.user = { id: 1, isAdmin: true };

      // Act
      ensureAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should redirect non-admin users to dashboard', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(true);
      mockReq.user = { id: 1, isAdmin: false };

      // Act
      ensureAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Admin privileges required.');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should redirect unauthenticated users to dashboard', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(false);

      // Act
      ensureAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('ensurePrimaryDelegate', () => {
    it('should allow primary delegates to proceed', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(true);
      mockReq.user = { id: 1, isPrimaryDelegate: true };

      // Act
      ensurePrimaryDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should redirect non-primary delegates to dashboard', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(true);
      mockReq.user = { id: 1, isPrimaryDelegate: false };

      // Act
      ensurePrimaryDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Primary delegate privileges required.');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should redirect unauthenticated users to dashboard', () => {
      // Arrange
      mockReq.isAuthenticated.mockReturnValue(false);

      // Act
      ensurePrimaryDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users to proceed', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'admin' };

      // Act
      requireAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should redirect non-admin users to root', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'delegate' };

      // Act
      requireAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/');
      expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Administrator privileges required.');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should redirect users without user object', () => {
      // Arrange
      mockReq.user = null;

      // Act
      requireAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdminOrPrimaryDelegate', () => {
    it('should allow admin users to proceed', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'admin' };

      // Act
      requireAdminOrPrimaryDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should allow primary delegate users to proceed', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'primary_delegate' };

      // Act
      requireAdminOrPrimaryDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should redirect regular delegate users', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'delegate' };

      // Act
      requireAdminOrPrimaryDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/');
      expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Administrator or primary delegate privileges required.');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireDelegate', () => {
    it('should allow admin users to proceed', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'admin' };

      // Act
      requireDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should allow primary delegate users to proceed', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'primary_delegate' };

      // Act
      requireDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should allow delegate users to proceed', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'delegate' };

      // Act
      requireDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should redirect users with insufficient privileges', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'user' };

      // Act
      requireDelegate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith('/');
      expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Delegate privileges required.');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle session save errors in login method', () => {
      // Arrange
      const callback = vi.fn();
      const saveError = new Error('Session save failed');
      mockReq.session.save = vi.fn((cb) => cb(saveError));
      setupSessionAuth(mockReq, mockRes, mockNext);

      // Act
      mockReq.login({ id: 1 }, callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(saveError);
    });

    it('should handle session destroy errors in logout method', () => {
      // Arrange
      const callback = vi.fn();
      const destroyError = new Error('Session destroy failed');
      mockReq.session.destroy = vi.fn((cb) => cb(destroyError));
      setupSessionAuth(mockReq, mockRes, mockNext);

      // Act
      mockReq.logout(callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(destroyError);
    });

    it('should handle missing session gracefully in isAuthenticated', () => {
      // Arrange
      setupSessionAuth(mockReq, mockRes, mockNext);
      mockReq.session = null;

      // Act & Assert
      expect(() => {
        // The isAuthenticated method should handle null session gracefully
        const result = mockReq.isAuthenticated();
        expect(result).toBe(false);
      }).not.toThrow();
    });

    it('should handle missing user in loadSessionUser', async () => {
      // Arrange
      mockReq.session.userId = 999;
      mockUser.findByPk.mockResolvedValue(null);

      // Act
      await loadSessionUser(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.session.userId).toBe(null);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Security Considerations', () => {
    it('should not leak sensitive information in error messages', () => {
      // Arrange
      mockReq.user = { id: 1, role: 'delegate' };

      // Act
      requireAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Access denied. Administrator privileges required.');
      // Verify message doesn't contain sensitive details
      const flashCall = mockReq.flash.mock.calls[0][1];
      expect(flashCall).not.toContain('role');
      expect(flashCall).not.toContain('delegate');
    });

    it('should clear session data when user becomes inactive', async () => {
      // Arrange
      const inactiveUser = { id: 1, isActive: false };
      mockReq.session.userId = 1;
      mockUser.findByPk.mockResolvedValue(inactiveUser);

      // Act
      await loadSessionUser(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.session.userId).toBe(null);
    });

    it('should validate user authentication state consistently', () => {
      // Arrange
      setupSessionAuth(mockReq, mockRes, mockNext);

      // Test various invalid states
      const invalidStates = [
        { userId: null, user: { id: 1 } },
        { userId: 1, user: null },
        { userId: null, user: null }
      ];

      invalidStates.forEach(state => {
        mockReq.session.userId = state.userId;
        mockReq.user = state.user;
        expect(mockReq.isAuthenticated()).toBe(false);
      });

      // Test valid state
      mockReq.session.userId = 1;
      mockReq.user = { id: 1 };
      expect(mockReq.isAuthenticated()).toBe(true);
    });
  });
});