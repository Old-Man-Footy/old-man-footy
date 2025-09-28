/**
 * Email Subscription Routes
 * 
 * Handles all email subscription management endpoints
 */

import express from 'express';
import { 
  createSubscription,
  verifySubscription,
  updateSubscription,
  unsubscribe,
  getSubscriptionStatus,
  getNotificationTypes,
  validateSubscriptionCreation,
  validateSubscriptionUpdate,
  validateToken,
  validateEmailParam
} from '../controllers/subscription.controller.mjs';

const router = express.Router();

/**
 * @route   POST /api/subscribe
 * @desc    Create a new email subscription
 * @access  Public
 */
router.post('/', validateSubscriptionCreation, createSubscription);

/**
 * @route   GET /api/subscribe/verify/:token
 * @desc    Verify email subscription via verification token
 * @access  Public
 */
router.get('/verify/:token', validateToken, verifySubscription);

/**
 * @route   PUT /api/subscribe/:email
 * @desc    Update subscription notification preferences
 * @access  Public
 */
router.put('/:email', validateSubscriptionUpdate, updateSubscription);

/**
 * @route   DELETE /api/subscribe/unsubscribe/:token
 * @desc    Unsubscribe from notifications via unsubscribe token
 * @access  Public
 */
router.delete('/unsubscribe/:token', validateToken, unsubscribe);

/**  
 * @route   GET /api/subscribe/status/:email
 * @desc    Get subscription status for an email
 * @access  Public
 */
router.get('/status/:email', validateEmailParam, getSubscriptionStatus);

/**
 * @route   GET /api/subscribe/notification-types
 * @desc    Get available notification types
 * @access  Public
 */
router.get('/notification-types', getNotificationTypes);

export default router;
