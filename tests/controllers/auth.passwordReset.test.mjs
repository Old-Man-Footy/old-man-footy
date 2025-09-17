/**
 * @fileoverview Unit tests for auth controller password reset functionality
 * @description Tests the resetPassword method including validation, security checks, success/error cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Op } from 'sequelize';

// Mock bcrypt with Vitest
const mockBcrypt = {
  compare: vi.fn(),
  hash: vi.fn(),
  genSalt: vi.fn()
};

// Create comprehensive mocks for all dependencies
const mockUser = {
  findOne: vi.fn(),
  findByPk: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
};

const mockClub = {
  findByPk: vi.fn(),
};

const mockValidationResult = vi.fn();

const mockAuditService = {
  logAuthAction: vi.fn(),
  logUserAction: vi.fn(),
  ACTIONS: {
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT', 
    USER_REGISTER: 'USER_REGISTER',
    USER_INVITATION_SEND: 'USER_INVITATION_SEND',
    USER_INVITATION_ACCEPT: 'USER_INVITATION_ACCEPT',
    USER_PASSWORD_RESET: 'USER_PASSWORD_RESET'
  },
  ENTITIES: {
    USER: 'USER',
  },
  sanitizeData: vi.fn((data) => data),
};

// Create transaction mock
const mockTransaction = {
  commit: vi.fn().mockResolvedValue(),
  rollback: vi.fn().mockResolvedValue(),
};

const mockSequelize = {
  transaction: vi.fn().mockResolvedValue(mockTransaction),
};

const mockWrapControllers = vi.fn((controllers) => controllers);

// Mock modules using Vitest
vi.mock('bcrypt', () => ({
  default: mockBcrypt,
  ...mockBcrypt
}));

vi.mock('../../models/index.mjs', () => ({
  User: mockUser,
  Club: mockClub,
}));

vi.mock('express-validator', () => ({
  validationResult: mockValidationResult,
}));

vi.mock('../../services/auditService.mjs', () => ({
  default: mockAuditService,
}));

vi.mock('../../config/database.mjs', () => ({
  sequelize: mockSequelize,
}));

vi.mock('../../middleware/asyncHandler.mjs', () => ({ 
  wrapControllers: mockWrapControllers 
}));

// Import controller functions after mocking
const { resetPassword } = await import('../../controllers/auth.controller.mjs');

describe('Auth Controller - Password Reset', () => {
  let req, res, next, user;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock user object with methods
    user = {
      id: 'user123',
      email: 'test@example.com',
      checkPassword: vi.fn(),
      update: vi.fn()
    };

    // Mock request object
    req = {
      body: {
        existingPassword: 'oldPassword123',
        newPassword: 'newPassword456'
      },
      user,
      xhr: false,
      headers: {},
      flash: vi.fn()
    };

    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis()
    };

    // Mock next function for asyncHandler
    next = vi.fn();

    // Mock validationResult to return no errors by default
    mockValidationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Password Reset', () => {
    it('should successfully reset password with valid input', async () => {
      // Arrange
      user.checkPassword
        .mockResolvedValueOnce(true)   // Current password is correct
        .mockResolvedValueOnce(false); // New password is different
      
      mockBcrypt.hash.mockResolvedValue('hashedNewPassword');
      user.update.mockResolvedValue();

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(user.checkPassword).toHaveBeenCalledWith('oldPassword123');
      expect(user.checkPassword).toHaveBeenCalledWith('newPassword456');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword456', 12);
      expect(user.update).toHaveBeenCalledWith({
        passwordHash: 'hashedNewPassword'
      });
      expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
        'USER_PASSWORD_RESET',
        req,
        'user123',
        { success: true }
      );
      expect(req.flash).toHaveBeenCalledWith('success_msg', 'Password updated successfully!');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should return JSON response for AJAX requests on success', async () => {
      // Arrange
      req.xhr = true;
      user.checkPassword
        .mockResolvedValueOnce(true)   // Current password is correct
        .mockResolvedValueOnce(false); // New password is different
      
      mockBcrypt.hash.mockResolvedValue('hashedNewPassword');
      user.update.mockResolvedValue();

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password updated successfully!'
      });
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should detect AJAX requests via X-Requested-With header', async () => {
      // Arrange
      req.headers['x-requested-with'] = 'XMLHttpRequest';
      user.checkPassword
        .mockResolvedValueOnce(true)   // Current password is correct
        .mockResolvedValueOnce(false); // New password is different
      
      mockBcrypt.hash.mockResolvedValue('hashedNewPassword');
      user.update.mockResolvedValue();

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password updated successfully!'
      });
    });
  });

  describe('Validation Errors', () => {
    it('should handle validation errors for regular requests', async () => {
      // Arrange
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Password must be at least 8 characters long' }]
      });

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Password must be at least 8 characters long');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(user.checkPassword).not.toHaveBeenCalled();
    });

    it('should return JSON error for AJAX validation failures', async () => {
      // Arrange
      req.xhr = true;
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Password must be at least 8 characters long' }]
      });

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    });
  });

  describe('Authentication Errors', () => {
    it('should reject incorrect current password', async () => {
      // Arrange
      user.checkPassword.mockResolvedValueOnce(false); // Current password is incorrect

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(user.checkPassword).toHaveBeenCalledWith('oldPassword123');
      expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
        'USER_PASSWORD_RESET',
        req,
        'user123',
        {
          success: false,
          reason: 'invalid_current_password'
        }
      );
      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Current password is incorrect. Please try again.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(user.update).not.toHaveBeenCalled();
    });

    it('should return JSON error for incorrect password with AJAX', async () => {
      // Arrange
      req.xhr = true;
      user.checkPassword.mockResolvedValueOnce(false);

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current password is incorrect. Please try again.'
      });
    });

    it('should reject when new password is same as current password', async () => {
      // Arrange
      user.checkPassword
        .mockResolvedValueOnce(true)  // Current password is correct
        .mockResolvedValueOnce(true); // New password is the same

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(user.checkPassword).toHaveBeenCalledWith('oldPassword123');
      expect(user.checkPassword).toHaveBeenCalledWith('newPassword456');
      expect(req.flash).toHaveBeenCalledWith('error_msg', 'New password must be different from your current password.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(user.update).not.toHaveBeenCalled();
    });

    it('should return JSON error for same password with AJAX', async () => {
      // Arrange
      req.xhr = true;
      user.checkPassword
        .mockResolvedValueOnce(true)  // Current password is correct
        .mockResolvedValueOnce(true); // New password is the same

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'New password must be different from your current password.'
      });
    });
  });

  describe('Server Errors', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      user.checkPassword
        .mockResolvedValueOnce(true)   // Current password is correct
        .mockResolvedValueOnce(false); // New password is different
      
      mockBcrypt.hash.mockResolvedValue('hashedNewPassword');
      user.update.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
        'USER_PASSWORD_RESET',
        req,
        'user123',
        {
          success: false,
          reason: 'server_error',
          error: 'Database connection failed'
        }
      );
      expect(req.flash).toHaveBeenCalledWith('error_msg', 'An error occurred while updating your password. Please try again.');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should return JSON error for server errors with AJAX', async () => {
      // Arrange
      req.xhr = true;
      user.checkPassword
        .mockResolvedValueOnce(true)   // Current password is correct
        .mockResolvedValueOnce(false); // New password is different
      
      mockBcrypt.hash.mockRejectedValue(new Error('Hashing failed'));

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'An error occurred while updating your password. Please try again.'
      });
    });

    it('should handle checkPassword method errors', async () => {
      // Arrange
      user.checkPassword.mockRejectedValue(new Error('Password verification failed'));

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
        'USER_PASSWORD_RESET',
        req,
        'user123',
        {
          success: false,
          reason: 'server_error',
          error: 'Password verification failed'
        }
      );
      expect(req.flash).toHaveBeenCalledWith('error_msg', 'An error occurred while updating your password. Please try again.');
    });
  });

  describe('Security Requirements', () => {
    it('should use salt rounds of 12 for password hashing', async () => {
      // Arrange
      user.checkPassword
        .mockResolvedValueOnce(true)   // Current password is correct
        .mockResolvedValueOnce(false); // New password is different
      
      mockBcrypt.hash.mockResolvedValue('hashedNewPassword');
      user.update.mockResolvedValue();

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword456', 12);
    });

    it('should verify current password before allowing reset', async () => {
      // Arrange
      user.checkPassword.mockResolvedValueOnce(false); // Incorrect current password

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(user.checkPassword).toHaveBeenCalledWith('oldPassword123');
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(user.update).not.toHaveBeenCalled();
    });

    it('should prevent setting the same password', async () => {
      // Arrange
      user.checkPassword
        .mockResolvedValueOnce(true)  // Current password is correct
        .mockResolvedValueOnce(true); // New password is the same

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(user.checkPassword).toHaveBeenCalledTimes(2);
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(user.update).not.toHaveBeenCalled();
    });

    it('should log all password reset attempts', async () => {
      // Arrange
      user.checkPassword.mockResolvedValueOnce(false); // Incorrect password

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
        'USER_PASSWORD_RESET',
        req,
        'user123',
        {
          success: false,
          reason: 'invalid_current_password'
        }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing request body fields', async () => {
      // Arrange
      req.body = {}; // Missing password fields
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'All fields are required' }]
      });

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(req.flash).toHaveBeenCalledWith('error_msg', 'All fields are required');
      expect(user.checkPassword).not.toHaveBeenCalled();
    });

    it('should handle null user object gracefully', async () => {
      // Arrange
      req.user = null;

      // Act & Assert
      await expect(resetPassword(req, res)).rejects.toThrow();
    });

    it('should handle empty password strings', async () => {
      // Arrange
      req.body.existingPassword = '';
      req.body.newPassword = '';
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Password cannot be empty' }]
      });

      // Act
      await resetPassword(req, res, next);

      // Assert
      expect(req.flash).toHaveBeenCalledWith('error_msg', 'Password cannot be empty');
    });
  });
});
