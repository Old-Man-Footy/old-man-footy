/**
 * API Subscription Controller Tests
 * Tests for subscription management API endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validationResult } from 'express-validator';
import { EmailSubscription } from '../../models/index.mjs';
import { AUSTRALIAN_STATES, NOTIFICATION_TYPES_ARRAY } from '../../config/constants.mjs';
import * as subscriptionController from '../../controllers/api/subscription.controller.mjs';

// Mock dependencies
vi.mock('express-validator');
vi.mock('../../models/index.mjs');
vi.mock('../../config/constants.mjs', () => ({
    AUSTRALIAN_STATES: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
    NOTIFICATION_TYPES_ARRAY: [
        'Carnival_Notifications',
        'Delegate_Alerts', 
        'Website_Updates',
        'Program_Changes',
        'Special_Offers',
        'Community_News'
    ],
    PLAYER_SHORTS_COLORS_ARRAY: ['Unrestricted', 'Red', 'Yellow', 'Blue', 'Green'],
    APPROVAL_STATUS_ARRAY: ['pending', 'approved', 'rejected'],
    ATTENDANCE_STATUS_ARRAY: ['confirmed', 'tentative', 'unavailable'],
    SPONSORSHIP_LEVELS_ARRAY: ['Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind'],
    LOGO_DISPLAY_SIZES_ARRAY: ['Large', 'Medium', 'Small']
}));

describe('API Subscription Controller', () => {
    let req, res;

    // Mock factories
    const createMockUser = (overrides = {}) => ({
        id: 1,
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        ...overrides
    });

    const createMockEmailSubscription = (overrides = {}) => ({
        id: 1,
        email: 'user@example.com',
        isActive: true,
        states: ['NSW', 'QLD'],
        notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
        subscribedAt: new Date('2024-01-15T10:30:00Z'),
        unsubscribedAt: null,
        source: 'dashboard',
        update: vi.fn().mockResolvedValue(true),
        ...overrides
    });

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        
        // Mock console.error to avoid test output pollution
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Mock request and response objects
        req = {
            user: createMockUser(),
            body: {},
            query: {}
        };

        res = {
            json: vi.fn().mockReturnThis(),
            status: vi.fn().mockReturnThis()
        };

        // Mock validation result as valid by default
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => []
        });
    });

    describe('getUserSubscription', () => {
        it('should return subscription data for existing active subscription', async () => {
            const mockSubscription = createMockEmailSubscription();
            EmailSubscription.findOne.mockResolvedValue(mockSubscription);

            await subscriptionController.getUserSubscription(req, res);

            expect(EmailSubscription.findOne).toHaveBeenCalledWith({
                where: { email: 'user@example.com' }
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                subscription: {
                    email: 'user@example.com',
                    isActive: true,
                    states: ['NSW', 'QLD'],
                    notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                    subscribedAt: expect.any(Date),
                    availableStates: AUSTRALIAN_STATES,
                    availableNotifications: NOTIFICATION_TYPES_ARRAY
                }
            });
        });

        it('should return default subscription data when no subscription exists', async () => {
            EmailSubscription.findOne.mockResolvedValue(null);

            await subscriptionController.getUserSubscription(req, res);

            expect(EmailSubscription.findOne).toHaveBeenCalledWith({
                where: { email: 'user@example.com' }
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                subscription: {
                    email: 'user@example.com',
                    isActive: false,
                    states: [],
                    notificationPreferences: [],
                    availableStates: AUSTRALIAN_STATES,
                    availableNotifications: NOTIFICATION_TYPES_ARRAY
                }
            });
        });

        it('should handle subscription with null states', async () => {
            const mockSubscription = createMockEmailSubscription({
                states: null
            });
            EmailSubscription.findOne.mockResolvedValue(mockSubscription);

            await subscriptionController.getUserSubscription(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                subscription: {
                    email: 'user@example.com',
                    isActive: true,
                    states: [],
                    notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                    subscribedAt: new Date('2024-01-15T10:30:00.000Z'),
                    availableStates: AUSTRALIAN_STATES,
                    availableNotifications: NOTIFICATION_TYPES_ARRAY
                }
            });
        });

        it('should handle database errors gracefully', async () => {
            const dbError = new Error('Database connection failed');
            EmailSubscription.findOne.mockRejectedValue(dbError);

            await subscriptionController.getUserSubscription(req, res);

            expect(console.error).toHaveBeenCalledWith('Error fetching user subscription:', dbError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to fetch subscription data'
            });
        });

        it('should use correct user email from request', async () => {
            req.user.email = 'different@example.com';
            EmailSubscription.findOne.mockResolvedValue(null);

            await subscriptionController.getUserSubscription(req, res);

            expect(EmailSubscription.findOne).toHaveBeenCalledWith({
                where: { email: 'different@example.com' }
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                subscription: {
                    email: 'different@example.com',
                    isActive: false,
                    states: [],
                    notificationPreferences: [],
                    availableStates: AUSTRALIAN_STATES,
                    availableNotifications: NOTIFICATION_TYPES_ARRAY
                }
            });
        });
    });

    describe('updateUserSubscription', () => {
        it('should create new subscription when none exists', async () => {
            req.body = {
                states: ['NSW', 'VIC'],
                notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                isActive: true
            };

            EmailSubscription.findOne.mockResolvedValue(null);
            const newSubscription = createMockEmailSubscription({
                states: ['NSW', 'VIC'],
                notificationPreferences: ['Carnival_Notifications', 'Website_Updates']
            });
            EmailSubscription.create.mockResolvedValue(newSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(EmailSubscription.findOne).toHaveBeenCalledWith({
                where: { email: 'user@example.com' }
            });

            expect(EmailSubscription.create).toHaveBeenCalledWith({
                email: 'user@example.com',
                isActive: true,
                states: ['NSW', 'VIC'],
                notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                source: 'dashboard',
                subscribedAt: expect.any(Date)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Subscription preferences updated successfully',
                subscription: {
                    email: 'user@example.com',
                    isActive: true,
                    states: ['NSW', 'VIC'],
                    notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                    subscribedAt: expect.any(Date)
                }
            });
        });

        it('should update existing subscription with new states', async () => {
            req.body = {
                states: ['QLD', 'WA'],
                notificationPreferences: ['Delegate_Alerts', 'Special_Offers'],
                isActive: true
            };

            const existingSubscription = createMockEmailSubscription({
                states: ['NSW']
            });
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(existingSubscription.update).toHaveBeenCalledWith({
                states: ['QLD', 'WA'],
                notificationPreferences: ['Delegate_Alerts', 'Special_Offers'],
                isActive: true,
                subscribedAt: expect.any(Date),
                unsubscribedAt: null
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Subscription preferences updated successfully',
                subscription: {
                    email: 'user@example.com',
                    isActive: true,
                    states: ['NSW'],
                    notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                    subscribedAt: new Date('2024-01-15T10:30:00.000Z')
                }
            });
        });

        it('should handle unsubscribe action by setting isActive to false', async () => {
            req.body = {
                isActive: false
            };

            const existingSubscription = createMockEmailSubscription();
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(existingSubscription.update).toHaveBeenCalledWith({
                isActive: false,
                unsubscribedAt: expect.any(Date)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Subscription preferences updated successfully',
                subscription: {
                    email: 'user@example.com',
                    isActive: true,
                    states: ['NSW', 'QLD'],
                    notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                    subscribedAt: new Date('2024-01-15T10:30:00.000Z')
                }
            });
        });

        it('should handle reactivation by setting isActive to true', async () => {
            req.body = {
                states: ['NSW'],
                isActive: true
            };

            const existingSubscription = createMockEmailSubscription({
                isActive: false,
                unsubscribedAt: new Date()
            });
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(existingSubscription.update).toHaveBeenCalledWith({
                states: ['NSW'],
                isActive: true,
                subscribedAt: expect.any(Date),
                unsubscribedAt: null
            });
        });

        it('should update only states when isActive is not provided', async () => {
            req.body = {
                states: ['VIC', 'SA']
            };

            const existingSubscription = createMockEmailSubscription();
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(existingSubscription.update).toHaveBeenCalledWith({
                states: ['VIC', 'SA']
            });
        });

        it('should update only isActive when states are not provided', async () => {
            req.body = {
                isActive: false
            };

            const existingSubscription = createMockEmailSubscription();
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(existingSubscription.update).toHaveBeenCalledWith({
                isActive: false,
                unsubscribedAt: expect.any(Date)
            });
        });

        it('should handle validation errors', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [
                    { msg: 'States must be an array', param: 'states' }
                ]
            });

            req.body = {
                states: 'invalid',
                isActive: true
            };

            await subscriptionController.updateUserSubscription(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Validation failed',
                details: [
                    { msg: 'States must be an array', param: 'states' }
                ]
            });
        });

        it('should handle database errors during creation', async () => {
            req.body = {
                states: ['NSW'],
                isActive: true
            };

            EmailSubscription.findOne.mockResolvedValue(null);
            const dbError = new Error('Database creation failed');
            EmailSubscription.create.mockRejectedValue(dbError);

            await subscriptionController.updateUserSubscription(req, res);

            expect(console.error).toHaveBeenCalledWith('Error updating user subscription:', dbError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to update subscription preferences'
            });
        });

        it('should handle database errors during update', async () => {
            req.body = {
                states: ['NSW'],
                isActive: true
            };

            const existingSubscription = createMockEmailSubscription();
            const dbError = new Error('Database update failed');
            existingSubscription.update.mockRejectedValue(dbError);
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(console.error).toHaveBeenCalledWith('Error updating user subscription:', dbError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to update subscription preferences'
            });
        });

        it('should create subscription with default isActive when not provided', async () => {
            req.body = {
                states: ['NSW']
            };

            EmailSubscription.findOne.mockResolvedValue(null);
            const newSubscription = createMockEmailSubscription();
            EmailSubscription.create.mockResolvedValue(newSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(EmailSubscription.create).toHaveBeenCalledWith({
                email: 'user@example.com',
                isActive: true,
                states: ['NSW'],
                notificationPreferences: [],
                source: 'dashboard',
                subscribedAt: expect.any(Date)
            });
        });

        it('should create subscription with default empty states when not provided', async () => {
            req.body = {
                isActive: true
            };

            EmailSubscription.findOne.mockResolvedValue(null);
            const newSubscription = createMockEmailSubscription({
                states: []
            });
            EmailSubscription.create.mockResolvedValue(newSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(EmailSubscription.create).toHaveBeenCalledWith({
                email: 'user@example.com',
                isActive: true,
                states: [],
                notificationPreferences: [],
                source: 'dashboard',
                subscribedAt: expect.any(Date)
            });
        });

        it('should update only notification preferences when provided', async () => {
            req.body = {
                notificationPreferences: ['Community_News', 'Program_Changes']
            };

            const existingSubscription = createMockEmailSubscription();
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(existingSubscription.update).toHaveBeenCalledWith({
                notificationPreferences: ['Community_News', 'Program_Changes']
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Subscription preferences updated successfully',
                subscription: {
                    email: 'user@example.com',
                    isActive: true,
                    states: ['NSW', 'QLD'],
                    notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                    subscribedAt: expect.any(Date)
                }
            });
        });

        it('should create subscription with notification preferences when provided', async () => {
            req.body = {
                states: ['SA'],
                notificationPreferences: ['Carnival_Notifications', 'Delegate_Alerts', 'Community_News'],
                isActive: true
            };

            EmailSubscription.findOne.mockResolvedValue(null);
            const newSubscription = createMockEmailSubscription({
                states: ['SA'],
                notificationPreferences: ['Carnival_Notifications', 'Delegate_Alerts', 'Community_News']
            });
            EmailSubscription.create.mockResolvedValue(newSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(EmailSubscription.create).toHaveBeenCalledWith({
                email: 'user@example.com',
                isActive: true,
                states: ['SA'],
                notificationPreferences: ['Carnival_Notifications', 'Delegate_Alerts', 'Community_News'],
                source: 'dashboard',
                subscribedAt: expect.any(Date)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Subscription preferences updated successfully',
                subscription: {
                    email: 'user@example.com',
                    isActive: true,
                    states: ['SA'],
                    notificationPreferences: ['Carnival_Notifications', 'Delegate_Alerts', 'Community_News'],
                    subscribedAt: expect.any(Date)
                }
            });
        });

        it('should create subscription with empty notification preferences when not provided', async () => {
            req.body = {
                states: ['NT'],
                isActive: true
            };

            EmailSubscription.findOne.mockResolvedValue(null);
            const newSubscription = createMockEmailSubscription({
                states: ['NT'],
                notificationPreferences: []
            });
            EmailSubscription.create.mockResolvedValue(newSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(EmailSubscription.create).toHaveBeenCalledWith({
                email: 'user@example.com',
                isActive: true,
                states: ['NT'],
                notificationPreferences: [],
                source: 'dashboard',
                subscribedAt: expect.any(Date)
            });
        });

        it('should handle empty notification preferences array', async () => {
            req.body = {
                notificationPreferences: []
            };

            const existingSubscription = createMockEmailSubscription();
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            expect(existingSubscription.update).toHaveBeenCalledWith({
                notificationPreferences: []
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Subscription preferences updated successfully',
                subscription: {
                    email: 'user@example.com',
                    isActive: true,
                    states: ['NSW', 'QLD'],
                    notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                    subscribedAt: expect.any(Date)
                }
            });
        });
    });

    describe('unsubscribeUser', () => {
        it('should unsubscribe user with existing active subscription', async () => {
            const existingSubscription = createMockEmailSubscription();
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.unsubscribeUser(req, res);

            expect(EmailSubscription.findOne).toHaveBeenCalledWith({
                where: { email: 'user@example.com' }
            });

            expect(existingSubscription.update).toHaveBeenCalledWith({
                isActive: false,
                states: [],
                unsubscribedAt: expect.any(Date)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Successfully unsubscribed from all email notifications'
            });
        });

        it('should handle case when no subscription exists', async () => {
            EmailSubscription.findOne.mockResolvedValue(null);

            await subscriptionController.unsubscribeUser(req, res);

            expect(EmailSubscription.findOne).toHaveBeenCalledWith({
                where: { email: 'user@example.com' }
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'No active subscription found'
            });
        });

        it('should handle database errors during unsubscribe', async () => {
            const existingSubscription = createMockEmailSubscription();
            const dbError = new Error('Database update failed');
            existingSubscription.update.mockRejectedValue(dbError);
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.unsubscribeUser(req, res);

            expect(console.error).toHaveBeenCalledWith('Error unsubscribing user:', dbError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to unsubscribe'
            });
        });

        it('should handle database errors during lookup', async () => {
            const dbError = new Error('Database query failed');
            EmailSubscription.findOne.mockRejectedValue(dbError);

            await subscriptionController.unsubscribeUser(req, res);

            expect(console.error).toHaveBeenCalledWith('Error unsubscribing user:', dbError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to unsubscribe'
            });
        });

        it('should use correct user email from request', async () => {
            req.user.email = 'another@example.com';
            EmailSubscription.findOne.mockResolvedValue(null);

            await subscriptionController.unsubscribeUser(req, res);

            expect(EmailSubscription.findOne).toHaveBeenCalledWith({
                where: { email: 'another@example.com' }
            });
        });

        it('should clear states and set inactive for existing subscription', async () => {
            const existingSubscription = createMockEmailSubscription({
                states: ['NSW', 'QLD', 'VIC']
            });
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.unsubscribeUser(req, res);

            expect(existingSubscription.update).toHaveBeenCalledWith({
                isActive: false,
                states: [],
                unsubscribedAt: expect.any(Date)
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle missing user in request for getUserSubscription', async () => {
            req.user = null;
            
            // This would cause a runtime error due to req.user.email
            await expect(() => subscriptionController.getUserSubscription(req, res))
                .rejects.toThrow();
        });

        it('should handle missing user in request for updateUserSubscription', async () => {
            req.user = null;
            
            await expect(() => subscriptionController.updateUserSubscription(req, res))
                .rejects.toThrow();
        });

        it('should handle missing user in request for unsubscribeUser', async () => {
            req.user = null;
            
            await expect(() => subscriptionController.unsubscribeUser(req, res))
                .rejects.toThrow();
        });

        it('should handle empty request body in updateUserSubscription', async () => {
            req.body = {};

            const existingSubscription = createMockEmailSubscription();
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            await subscriptionController.updateUserSubscription(req, res);

            // Should not call update if no changes specified
            expect(existingSubscription.update).not.toHaveBeenCalled();

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Subscription preferences updated successfully',
                subscription: {
                    email: 'user@example.com',
                    isActive: true,
                    states: ['NSW', 'QLD'],
                    notificationPreferences: ['Carnival_Notifications', 'Website_Updates'],
                    subscribedAt: new Date('2024-01-15T10:30:00.000Z')
                }
            });
        });
    });
});
