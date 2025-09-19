/**
 * Email Subscription API Controller
 * Handles AJAX requests for email subscription management
 */

import { validationResult } from 'express-validator';
import { EmailSubscription } from '../../models/index.mjs';
import { AUSTRALIAN_STATES } from '../../config/constants.mjs';

/**
 * Get current user's email subscription status and preferences
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 */
export const getUserSubscription = async (req, res) => {
    try {
        const userEmail = req.user.email;
        
        // Find subscription by user's email
        const subscription = await EmailSubscription.findOne({
            where: { email: userEmail }
        });

        if (!subscription) {
            return res.json({
                success: true,
                subscription: {
                    email: userEmail,
                    isActive: false,
                    states: [],
                    availableStates: AUSTRALIAN_STATES
                }
            });
        }

        return res.json({
            success: true,
            subscription: {
                email: subscription.email,
                isActive: subscription.isActive,
                states: subscription.states || [],
                subscribedAt: subscription.subscribedAt,
                availableStates: AUSTRALIAN_STATES
            }
        });

    } catch (error) {
        console.error('Error fetching user subscription:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch subscription data'
        });
    }
};

/**
 * Update user's email subscription preferences
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 */
export const updateUserSubscription = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const userEmail = req.user.email;
        const { states, isActive } = req.body;

        // Find or create subscription
        let subscription = await EmailSubscription.findOne({
            where: { email: userEmail }
        });

        if (!subscription) {
            // Create new subscription
            subscription = await EmailSubscription.create({
                email: userEmail,
                isActive: isActive !== undefined ? isActive : true,
                states: states || [],
                source: 'dashboard',
                subscribedAt: new Date()
            });
        } else {
            // Update existing subscription
            const updateData = {};
            
            if (states !== undefined) {
                updateData.states = states;
            }
            
            if (isActive !== undefined) {
                updateData.isActive = isActive;
                if (isActive) {
                    updateData.subscribedAt = new Date();
                    updateData.unsubscribedAt = null;
                } else {
                    updateData.unsubscribedAt = new Date();
                }
            }

            await subscription.update(updateData);
        }

        return res.json({
            success: true,
            message: 'Subscription preferences updated successfully',
            subscription: {
                email: subscription.email,
                isActive: subscription.isActive,
                states: subscription.states,
                subscribedAt: subscription.subscribedAt
            }
        });

    } catch (error) {
        console.error('Error updating user subscription:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update subscription preferences'
        });
    }
};

/**
 * Unsubscribe user completely from all email notifications
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 */
export const unsubscribeUser = async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Find subscription by user's email
        const subscription = await EmailSubscription.findOne({
            where: { email: userEmail }
        });

        if (!subscription) {
            return res.json({
                success: true,
                message: 'No active subscription found'
            });
        }

        // Update subscription to inactive
        await subscription.update({
            isActive: false,
            states: [],
            unsubscribedAt: new Date()
        });

        return res.json({
            success: true,
            message: 'Successfully unsubscribed from all email notifications'
        });

    } catch (error) {
        console.error('Error unsubscribing user:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to unsubscribe'
        });
    }
};
