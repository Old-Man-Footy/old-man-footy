/**
 * Unit tests for Subscription Controller (Public API)
 * 
 * Tests the public subscription API endpoints for newsletter subscription management.
 * Uses Vitest with mocked dependencies.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validationResult } from 'express-validator';
import {
  createSubscription,
  verifySubscription,
  updateSubscription,
  unsubscribe,
  getSubscriptionStatus,
  getNotificationTypes
} from '../../controllers/subscription.controller.mjs';

// Mock express-validator
vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
  body: vi.fn(() => ({
    isEmail: vi.fn().mockReturnThis(),
    normalizeEmail: vi.fn().mockReturnThis(),
    notEmpty: vi.fn().mockReturnThis(),
    isLength: vi.fn().mockReturnThis(),
    optional: vi.fn().mockReturnThis(),
    isBoolean: vi.fn().mockReturnThis(),
    isArray: vi.fn().mockReturnThis(),
    custom: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis(),
    isString: vi.fn().mockReturnThis()
  })),
  param: vi.fn(() => ({
    isEmail: vi.fn().mockReturnThis(),
    normalizeEmail: vi.fn().mockReturnThis(),
    notEmpty: vi.fn().mockReturnThis(),
    isLength: vi.fn().mockReturnThis(),
    optional: vi.fn().mockReturnThis(),
    isBoolean: vi.fn().mockReturnThis(),
    isArray: vi.fn().mockReturnThis(),
    custom: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis(),
    isString: vi.fn().mockReturnThis()
  }))
}));

// Mock the model
vi.mock('../../models/EmailSubscription.mjs', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    destroy: vi.fn(),
    getExpiredUnverifiedSubscriptions: vi.fn(),
    cleanupExpiredTokens: vi.fn(),
    findByVerificationToken: vi.fn(),
    findByNotificationType: vi.fn(),
    findByState: vi.fn()
  }
}));

// Import the mocked module after mocking
const EmailSubscription = (await import('../../models/EmailSubscription.mjs')).default;
const mockEmailSubscription = EmailSubscription;

describe('Subscription Controller (Public API)', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup request and response mocks
    req = {
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      get: vi.fn()
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      render: vi.fn().mockReturnThis()
    };
    
    next = vi.fn();
    
    // Mock validation result to be empty by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription successfully', async () => {
      req.body = {
        email: 'test@example.com',
        notificationPreferences: ['carnival_updates']
      };

      const mockSubscription = {
        id: 1,
        email: 'test@example.com',
        verificationToken: 'abc123',
        notificationPreferences: ['carnival_updates'],
        isActive: false,
        verifiedAt: null,
        source: 'homepage',
        generateVerificationToken: vi.fn(),
        save: vi.fn()
      };

      mockEmailSubscription.findOne.mockResolvedValue(null);
      mockEmailSubscription.create.mockResolvedValue(mockSubscription);

      await createSubscription(req, res);

      expect(mockEmailSubscription.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        isActive: false,
        notificationPreferences: ['carnival_updates'],
        source: 'homepage'
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscription created successfully. Please check your email to verify your subscription.',
        subscription: {
          email: 'test@example.com',
          isActive: false,
          notificationPreferences: ['carnival_updates']
        }
      });
    });

    it('should handle validation errors', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Please provide a valid email address', path: 'email' }
        ]
      });

      await createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: 'Validation failed',
          details: [{ msg: 'Please provide a valid email address', path: 'email' }]
        }
      });
    });

    it('should handle duplicate email error', async () => {
      req.body = { email: 'existing@example.com' };

      const duplicateError = new Error('Validation error');
      duplicateError.name = 'SequelizeUniqueConstraintError';
      duplicateError.errors = [{ path: 'email' }];

      mockEmailSubscription.create.mockRejectedValue(duplicateError);

      await createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 409,
          message: 'This email address is already subscribed to our newsletter.'
        }
      });
    });

    it('should handle server errors', async () => {
      req.body = { email: 'test@example.com' };

      mockEmailSubscription.create.mockRejectedValue(new Error('Database error'));

      await createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 500,
          message: 'An unexpected error occurred. Please try again later.'
        }
      });
    });
  });

  describe('verifySubscription', () => {
    it('should verify subscription with valid token', async () => {
      req.params = { token: 'valid-token' };

      const mockSubscription = {
        id: 1,
        email: 'test@example.com',
        verificationToken: 'valid-token',
        isActive: true,
        notificationPreferences: ['carnival_updates'],
        isVerificationTokenValid: vi.fn().mockReturnValue(true),
        verify: vi.fn(),
        save: vi.fn().mockResolvedValue(true)
      };

      mockEmailSubscription.findByVerificationToken.mockResolvedValue(mockSubscription);

      await verifySubscription(req, res);

      expect(mockEmailSubscription.findByVerificationToken).toHaveBeenCalledWith('valid-token');
      expect(mockSubscription.verify).toHaveBeenCalled();
      expect(mockSubscription.save).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email subscription verified successfully!',
        subscription: {
          email: 'test@example.com',
          isActive: true,
          notificationPreferences: ['carnival_updates']
        }
      });
    });

    it('should handle invalid verification token', async () => {
      req.params = { token: 'invalid-token' };

      mockEmailSubscription.findByVerificationToken.mockResolvedValue(null);

      await verifySubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: 'Invalid or expired verification token'
        }
      });
    });

    it('should handle expired verification token', async () => {
      req.params = { token: 'expired-token' };

      // findByVerificationToken checks expiry internally and returns null for expired tokens
      mockEmailSubscription.findByVerificationToken.mockResolvedValue(null);

      await verifySubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: 'Invalid or expired verification token'
        }
      });
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription preferences successfully', async () => {
      req.params = { email: 'test@example.com' };
      req.body = {
        notificationPreferences: {
          carnival_announcements: false,
          sponsor_highlights: true
        }
      };

      const mockSubscription = {
        id: 1,
        email: 'test@example.com',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
        notificationPreferences: {
          carnival_announcements: false,
          sponsor_highlights: true
        }
      };

      mockEmailSubscription.findOne.mockResolvedValue(mockSubscription);

      await updateSubscription(req, res);

      expect(mockEmailSubscription.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', isActive: true }
      });
      expect(mockSubscription.save).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscription preferences updated successfully',
        subscription: {
          email: 'test@example.com',
          isActive: true,
          notificationPreferences: mockSubscription.notificationPreferences
        }
      });
    });

    it('should handle invalid email address', async () => {
      req.params = { email: 'nonexistent@example.com' };
      req.body = { notificationPreferences: {} };

      mockEmailSubscription.findOne.mockResolvedValue(null);

      await updateSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 404,
          message: 'Active subscription not found'
        }
      });
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe user successfully', async () => {
      req.params = { token: 'unsubscribe-token' };

      const mockSubscription = {
        id: 1,
        email: 'test@example.com',
        isActive: true,
        save: vi.fn().mockResolvedValue(true)
      };

      mockEmailSubscription.findOne.mockResolvedValue(mockSubscription);

      await unsubscribe(req, res);

      expect(mockEmailSubscription.findOne).toHaveBeenCalledWith({
        where: { unsubscribeToken: 'unsubscribe-token' }
      });
      expect(mockSubscription.isActive).toBe(false);
      expect(mockSubscription.save).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully unsubscribed from notifications'
      });
    });

    it('should handle already unsubscribed user', async () => {
      req.params = { token: 'unsubscribe-token' };

      const mockSubscription = {
        id: 1,
        email: 'test@example.com',
        isActive: false,
        save: vi.fn().mockResolvedValue(true)
      };

      mockEmailSubscription.findOne.mockResolvedValue(mockSubscription);

      await unsubscribe(req, res);

      expect(mockSubscription.isActive).toBe(false);
      expect(mockSubscription.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully unsubscribed from notifications'
      });
    });

    it('should handle invalid unsubscribe token', async () => {
      req.params = { token: 'invalid-token' };

      mockEmailSubscription.findOne.mockResolvedValue(null);

      await unsubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 404,
          message: 'Subscription not found'
        }
      });
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return subscription status', async () => {
      req.params = { email: 'test@example.com' };

      const mockSubscription = {
        id: 1,
        email: 'test@example.com',
        isActive: true,
        verifiedAt: new Date(),
        createdAt: new Date(),
        notificationPreferences: {
          carnival_announcements: true,
          club_updates: true,
          sponsor_highlights: false,
          general_news: true
        },
        isVerified: vi.fn().mockReturnValue(true)
      };

      mockEmailSubscription.findOne.mockResolvedValue(mockSubscription);

      await getSubscriptionStatus(req, res);

      expect(mockEmailSubscription.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        subscription: {
          email: 'test@example.com',
          isActive: true,
          notificationPreferences: mockSubscription.notificationPreferences,
          subscribedAt: mockSubscription.createdAt
        }
      });
    });

    it('should handle subscription not found', async () => {
      req.params = { email: 'nonexistent@example.com' };

      mockEmailSubscription.findOne.mockResolvedValue(null);

      await getSubscriptionStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 404,
          message: 'Subscription not found'
        }
      });
    });
  });

  describe('getNotificationTypes', () => {
    it('should return available notification types', async () => {
      await getNotificationTypes(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        notificationTypes: {
          CARNIVAL_NOTIFICATIONS: 'Carnival_Notifications',
          DELEGATE_ALERTS: 'Delegate_Alerts',
          WEBSITE_UPDATES: 'Website_Updates',
          PROGRAM_CHANGES: 'Program_Changes',
          SPECIAL_OFFERS: 'Special_Offers',
          COMMUNITY_NEWS: 'Community_News'
        },
        notificationTypesArray: [
          'Carnival_Notifications',
          'Delegate_Alerts',
          'Website_Updates',
          'Program_Changes',
          'Special_Offers',
          'Community_News'
        ]
      });
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected server errors in createSubscription', async () => {
      req.body = { email: 'test@example.com' };

      const unexpectedError = new Error('Unexpected database error');
      mockEmailSubscription.create.mockRejectedValue(unexpectedError);

      await createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 500,
          message: 'An unexpected error occurred. Please try again later.'
        }
      });
    });

    it('should handle save errors in verifySubscription', async () => {
      req.params = { token: 'valid-token' };

      const mockSubscription = {
        verificationToken: 'valid-token',
        isVerificationTokenValid: vi.fn().mockReturnValue(true),
        verify: vi.fn().mockReturnValue(true),
        save: vi.fn().mockRejectedValue(new Error('Save failed'))
      };

      mockEmailSubscription.findByVerificationToken.mockResolvedValue(mockSubscription);

      await verifySubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 500,
          message: 'Failed to verify subscription. Please try again later.'
        }
      });
    });

    it('should handle missing token parameter', async () => {
      req.params = {}; // No token
      
      mockEmailSubscription.findByVerificationToken.mockResolvedValue(null);

      await verifySubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: 'Invalid or expired verification token'
        }
      });
    });
  });

  describe('Input validation and sanitization', () => {
    it('should handle malformed notification preferences', async () => {
      req.body = {
        email: 'test@example.com',
        notificationPreferences: 'invalid-format' // String instead of object
      };

      // Mock validation to catch this
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Notification preferences must be an object', path: 'notificationPreferences' }
        ]
      });

      await createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: 'Validation failed',
          details: [{ msg: 'Notification preferences must be an object', path: 'notificationPreferences' }]
        }
      });
    });

    it('should handle empty request body', async () => {
      req.body = {};

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Please provide a valid email address', path: 'email' }
        ]
      });

      await createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});


