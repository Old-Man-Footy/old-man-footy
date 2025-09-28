/**
 * Email Subscription Bot Protection Tests
 * Tests the bot protection mechanisms implemented for the /subscribe endpoint
 */

import request from 'supertest';
import express from 'express';
import { EmailSubscription } from '../../models/index.mjs';
import { sequelize } from '../../config/database.mjs';
import { describe, test, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';

// Mock asyncHandler first
vi.mock('/middleware/asyncHandler.mjs', () => ({
  default: (fn) => fn // Simple passthrough for tests
}));

// Mock all services that might cause module conflicts
vi.mock('/services/imageNamingService.mjs');
vi.mock('/services/mySidelineIntegrationService.mjs');
vi.mock('/services/mySidelineDataService.mjs');
vi.mock('/services/mySidelineLogoDownloadService.mjs');
vi.mock('/services/mySidelineScraperService.mjs');
vi.mock('/services/email/AuthEmailService.mjs', () => ({
  default: {
    sendWelcomeEmail: vi.fn().mockResolvedValue(true)
  }
}));

// Import controller directly instead of full app
import { postSubscribe } from '../../controllers/main.controller.mjs';

// Create minimal test app
const createTestApp = () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Add session middleware mock
    app.use((req, res, next) => {
        req.session = {};
        next();
    });
    
    // Add flash middleware mock
    app.use((req, res, next) => {
        req.flash = vi.fn();
        next();
    });
    
    // Add subscribe route directly
    app.post('/subscribe', postSubscribe);
    
    return app;
};

describe('POST /subscribe - Bot Protection', () => {
    let app;

    beforeAll(async () => {
        // Disable features that could interfere with tests
        process.env.FEATURE_COMING_SOON_MODE = 'false';
        process.env.FEATURE_MAINTENANCE_MODE = 'false';
        process.env.FEATURE_MYSIDELINE_SYNC = 'false';
    });

    beforeEach(async () => {
        app = createTestApp();

        // Clear subscription attempts cache
        global.subscriptionAttempts = new Map();
        
        // Clear email subscriptions
        await EmailSubscription.destroy({ where: {} });
    });

    afterAll(async () => {
        // Clear any running timeouts/intervals
        if (global.mySidelineInitTimeout) {
            clearTimeout(global.mySidelineInitTimeout);
            global.mySidelineInitTimeout = null;
        }
        
        // Reset environment variables
        delete process.env.FEATURE_COMING_SOON_MODE;
        delete process.env.FEATURE_MAINTENANCE_MODE;
        delete process.env.FEATURE_MYSIDELINE_SYNC;        
    });

    describe('Legitimate Submissions', () => {
        test('should accept valid submission with proper timing', async () => {
            const formTimestamp = Date.now() - 5000; // 5 seconds ago
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'test@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: '' // Empty honeypot
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Successfully subscribed to newsletter!');

            // Verify subscription was created
            const subscription = await EmailSubscription.findOne({
                where: { email: 'test@example.com' }
            });
            expect(subscription).toBeTruthy();
            expect(subscription.isActive).toBe(true);
        });

        test('should reactivate existing inactive subscription', async () => {
            // Create inactive subscription
            await EmailSubscription.create({
                email: 'inactive@example.com',
                isActive: false
            });

            const formTimestamp = Date.now() - 5000;
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'inactive@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify subscription was reactivated
            const subscription = await EmailSubscription.findOne({
                where: { email: 'inactive@example.com' }
            });
            expect(subscription.isActive).toBe(true);
        });
    });

    describe('Bot Protection - Honeypot Field', () => {
        test('should reject submission when honeypot field is filled', async () => {
            const formTimestamp = Date.now() - 5000;
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'bot@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: 'https://spam-site.com' // Bot filled honeypot
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid request');

            // Verify no subscription was created
            const subscription = await EmailSubscription.findOne({
                where: { email: 'bot@example.com' }
            });
            expect(subscription).toBeFalsy();
        });

        test('should reject submission when honeypot field has whitespace', async () => {
            const formTimestamp = Date.now() - 5000;
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'bot2@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: '   ' // Whitespace in honeypot
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid request');
        });
    });

    describe('Bot Protection - Timing Validation', () => {
        test('should reject submission that is too fast (under 3 seconds)', async () => {
            const formTimestamp = Date.now() - 1000; // 1 second ago (too fast)
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'fast@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Please wait a moment before submitting');

            // Verify no subscription was created
            const subscription = await EmailSubscription.findOne({
                where: { email: 'fast@example.com' }
            });
            expect(subscription).toBeFalsy();
        });

        test('should reject submission that is too old (over 30 minutes)', async () => {
            const formTimestamp = Date.now() - (31 * 60 * 1000); // 31 minutes ago
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'old@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Form session expired, please refresh and try again');

            // Verify no subscription was created
            const subscription = await EmailSubscription.findOne({
                where: { email: 'old@example.com' }
            });
            expect(subscription).toBeFalsy();
        });

        test('should accept submission within valid time window', async () => {
            const formTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago (valid)
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'timing@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Bot Protection - Rate Limiting', () => {
        test('should allow first submission from IP', async () => {
            const formTimestamp = Date.now() - 5000;
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'first@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('should reject rapid subsequent submissions from same IP', async () => {
            const formTimestamp = Date.now() - 5000;
            
            // First submission should succeed
            await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'rate1@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            // Second submission immediately after should be rate limited
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'rate2@example.com',
                    form_timestamp: (Date.now() - 5000).toString(),
                    website: ''
                });

            expect(response.status).toBe(429);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Too many requests. Please wait a moment before trying again.');

            // Verify second subscription was not created
            const subscription = await EmailSubscription.findOne({
                where: { email: 'rate2@example.com' }
            });
            expect(subscription).toBeFalsy();
        });
    });

    describe('Input Validation', () => {
        test('should reject submission without email', async () => {
            const formTimestamp = Date.now() - 5000;
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Email address is required');
        });

        test('should reject submission with invalid email format', async () => {
            const formTimestamp = Date.now() - 5000;
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'invalid-email',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid email address');
        });

        test('should reject duplicate active subscription', async () => {
            // Create existing active subscription
            await EmailSubscription.create({
                email: 'duplicate@example.com',
                isActive: true
            });

            const formTimestamp = Date.now() - 5000;
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'duplicate@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('This email is already subscribed to our newsletter!');
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing timestamp gracefully', async () => {
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'notimestamp@example.com',
                    website: ''
                });

            // Should still work without timestamp (graceful degradation)
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('should handle invalid timestamp format', async () => {
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'invalidtime@example.com',
                    form_timestamp: 'not-a-number',
                    website: ''
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('should normalize email to lowercase', async () => {
            const formTimestamp = Date.now() - 5000;
            
            const response = await request(app)
                .post('/subscribe')
                .set('Accept', 'application/json')
                .send({
                    email: 'UPPERCASE@EXAMPLE.COM',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify email was stored in lowercase
            const subscription = await EmailSubscription.findOne({
                where: { email: 'uppercase@example.com' }
            });
            expect(subscription).toBeTruthy();
        });
    });
});