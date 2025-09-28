/**
 * Subscription Controller
 * 
 * Handles email subscription management including:
 * - Creating new subscriptions with verification
 * - Verifying email addresses via token
 * - Managing subscription preferences
 * - Unsubscribing from notifications
 */

import EmailSubscription from '../models/EmailSubscription.mjs';
import { NOTIFICATION_TYPES, NOTIFICATION_TYPES_ARRAY } from '../config/constants.mjs';
import { body, param, validationResult } from 'express-validator';

/**
 * Create a new email subscription
 * POST /api/subscribe
 */
export const createSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          status: 400,
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { email, notificationPreferences = NOTIFICATION_TYPES_ARRAY, source = 'homepage' } = req.body;

    // Check if subscription already exists
    let subscription = await EmailSubscription.findOne({ where: { email: email.toLowerCase().trim() } });

    if (subscription) {
      if (subscription.isActive) {
        return res.status(200).json({
          message: 'You are already subscribed to our notifications',
          subscription: {
            email: subscription.email,
            isActive: subscription.isActive,
            notificationPreferences: subscription.notificationPreferences
          }
        });
      } else {
        // Reactivate existing subscription
        subscription.isActive = false; // Will be activated upon verification
        subscription.notificationPreferences = notificationPreferences;
        subscription.source = source;
        subscription.generateVerificationToken();
        await subscription.save();
      }
    } else {
      // Create new subscription
      subscription = await EmailSubscription.create({
        email: email.toLowerCase().trim(),
        isActive: false, // Requires verification
        notificationPreferences,
        source
      });
      subscription.generateVerificationToken();
      await subscription.save();
    }

    // TODO: Send verification email in Phase 4
    // await sendVerificationEmail(subscription);

    res.status(201).json({
      message: 'Subscription created successfully. Please check your email to verify your subscription.',
      subscription: {
        email: subscription.email,
        isActive: subscription.isActive,
        notificationPreferences: subscription.notificationPreferences,
        // Don't expose tokens in response
      }
    });

  } catch (error) {
    // Handle specific errors for public API
    if (error.name === 'SequelizeUniqueConstraintError' && error.errors?.some(e => e.path === 'email')) {
      return res.status(409).json({
        error: {
          status: 409,
          message: 'This email address is already subscribed to our newsletter.'
        }
      });
    }
    
    // Handle general server errors
    return res.status(500).json({
      error: {
        status: 500,
        message: 'An unexpected error occurred. Please try again later.'
      }
    });
  }
};

/**
 * Verify email subscription via token
 * GET /api/subscribe/verify/:token
 */
export const verifySubscription = async (req, res) => {
  try {
    const { token } = req.params;

    // Check if token parameter is provided
    if (!token) {
      return res.status(400).json({
        error: {
          status: 400,
          message: 'Invalid or expired verification token'
        }
      });
    }

    const subscription = await EmailSubscription.findByVerificationToken(token);

    if (!subscription) {
      return res.status(400).json({
        error: {
          status: 400,
          message: 'Invalid or expired verification token'
        }
      });
    }

    subscription.verify();
    
    try {
      await subscription.save();
    } catch (saveError) {
      return res.status(500).json({
        error: {
          status: 500,
          message: 'Failed to verify subscription. Please try again later.'
        }
      });
    }

    res.status(200).json({
      message: 'Email subscription verified successfully!',
      subscription: {
        email: subscription.email,
        isActive: subscription.isActive,
        notificationPreferences: subscription.notificationPreferences
      }
    });

  } catch (error) {
    // Handle server errors for public API
    return res.status(500).json({
      error: {
        status: 500,
        message: 'An unexpected error occurred while verifying your subscription. Please try again later.'
      }
    });
  }
};

/**
 * Update subscription preferences
 * PUT /api/subscribe/:email
 */
export const updateSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          status: 400,
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { email } = req.params;
    const { notificationPreferences } = req.body;

    const subscription = await EmailSubscription.findOne({ 
      where: { email: email.toLowerCase().trim(), isActive: true }
    });

    if (!subscription) {
      return res.status(404).json({
        error: {
          status: 404,
          message: 'Active subscription not found'
        }
      });
    }

    subscription.notificationPreferences = notificationPreferences;
    await subscription.save();

    res.status(200).json({
      message: 'Subscription preferences updated successfully',
      subscription: {
        email: subscription.email,
        isActive: subscription.isActive,
        notificationPreferences: subscription.notificationPreferences
      }
    });

  } catch (error) {
    // Handle server errors for public API
    return res.status(500).json({
      error: {
        status: 500,
        message: 'An unexpected error occurred while updating your subscription. Please try again later.'
      }
    });
  }
};

/**
 * Unsubscribe from notifications
 * DELETE /api/subscribe/:token
 */
export const unsubscribe = async (req, res) => {
  try {
    const { token } = req.params;

    const subscription = await EmailSubscription.findOne({ 
      where: { unsubscribeToken: token }
    });

    if (!subscription) {
      return res.status(404).json({
        error: {
          status: 404,
          message: 'Subscription not found'
        }
      });
    }

    subscription.isActive = false;
    await subscription.save();

    res.status(200).json({
      message: 'Successfully unsubscribed from notifications'
    });

  } catch (error) {
    // Handle server errors for public API
    return res.status(500).json({
      error: {
        status: 500,
        message: 'An unexpected error occurred while unsubscribing. Please try again later.'
      }
    });
  }
};

/**
 * Get subscription status
 * GET /api/subscribe/status/:email
 */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const { email } = req.params;

    const subscription = await EmailSubscription.findOne({ 
      where: { email: email.toLowerCase().trim() }
    });

    if (!subscription) {
      return res.status(404).json({
        error: {
          status: 404,
          message: 'Subscription not found'
        }
      });
    }

    res.status(200).json({
      subscription: {
        email: subscription.email,
        isActive: subscription.isActive,
        notificationPreferences: subscription.notificationPreferences,
        subscribedAt: subscription.createdAt
      }
    });

  } catch (error) {
    // Handle server errors for public API
    return res.status(500).json({
      error: {
        status: 500,
        message: 'An unexpected error occurred while retrieving subscription status. Please try again later.'
      }
    });
  }
};

/**
 * Get available notification types
 * GET /api/subscribe/notification-types
 */
export const getNotificationTypes = async (req, res) => {
  try {
    res.status(200).json({
      notificationTypes: NOTIFICATION_TYPES,
      notificationTypesArray: NOTIFICATION_TYPES_ARRAY
    });
  } catch (error) {
    // Handle server errors for public API
    return res.status(500).json({
      error: {
        status: 500,
        message: 'An unexpected error occurred while retrieving notification types. Please try again later.'
      }
    });
  }
};

/**
 * Validation middleware for subscription creation
 */
export const validateSubscriptionCreation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('notificationPreferences')
    .optional()
    .isArray()
    .withMessage('Notification preferences must be an array')
    .custom((value) => {
      if (value && !value.every(type => NOTIFICATION_TYPES_ARRAY.includes(type))) {
        throw new Error('Invalid notification type provided');
      }
      return true;
    }),
  body('source')
    .optional()
    .isString()
    .withMessage('Source must be a string')
];

/**
 * Validation middleware for subscription updates
 */
export const validateSubscriptionUpdate = [
  param('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('notificationPreferences')
    .isArray()
    .withMessage('Notification preferences must be an array')
    .custom((value) => {
      if (!value.every(type => NOTIFICATION_TYPES_ARRAY.includes(type))) {
        throw new Error('Invalid notification type provided');
      }
      return true;
    })
];

/**
 * Validation middleware for token parameters
 */
export const validateToken = [
  param('token')
    .isString()
    .isLength({ min: 32, max: 256 })
    .withMessage('Invalid token format')
];

/**
 * Validation middleware for email parameters
 */
export const validateEmailParam = [
  param('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];
