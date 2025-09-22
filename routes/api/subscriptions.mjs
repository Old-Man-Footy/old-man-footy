/**
 * Email Subscription API Routes
 * Handles user email subscription management via AJAX requests
 */

import express from 'express';
import { body } from 'express-validator';
import { ensureAuthenticated } from '../../middleware/auth.mjs';
import { applyApiSecurity } from '../../middleware/security.mjs';
import * as subscriptionController from '../../controllers/api/subscription.controller.mjs';
import { AUSTRALIAN_STATES } from '../../config/constants.mjs';

const router = express.Router();

// Apply API security to all routes
router.use(applyApiSecurity);

// All subscription management routes require authentication
router.use(ensureAuthenticated);

/**
 * Get current user's subscription status and preferences
 * GET /api/subscriptions/me
 */
router.get('/me', subscriptionController.getUserSubscription);

/**
 * Update user's subscription preferences
 * PUT /api/subscriptions/me
 */
router.put('/me', [
    body('states')
        .optional({ nullable: true, checkFalsy: true })
        .isArray()
        .withMessage('States must be an array'),
    body('states.*')
        .optional({ nullable: true, checkFalsy: true })
        .isIn(AUSTRALIAN_STATES)
        .withMessage('Invalid state code'),
    body('isActive')
        .optional({ nullable: true, checkFalsy: true })
        .isBoolean()
        .withMessage('isActive must be a boolean')
], subscriptionController.updateUserSubscription);

/**
 * Unsubscribe user completely
 * DELETE /api/subscriptions/me
 */
router.delete('/me', subscriptionController.unsubscribeUser);

export default router;
