/**
 * Coming Soon Mode Integration Tests
 * Tests that the subscription form works when coming soon mode is enabled
 */

import request from 'supertest';
import { EmailSubscription } from '../models/index.mjs';
import { sequelize } from '../config/database.mjs';

// Mock MySideline service to prevent async operations during tests
jest.mock('../services/mySidelineIntegrationService.mjs', () => ({
    initializeScheduledSync: jest.fn(),
    checkAndRunInitialSync: jest.fn()
}));

// Import app after mocking
import app from '../app.mjs';

describe('Coming Soon Mode - Subscription Integration', () => {
    beforeAll(async () => {
        // Enable coming soon mode for these tests
        process.env.FEATURE_COMING_SOON_MODE = 'true';
        process.env.FEATURE_MAINTENANCE_MODE = 'false';
        process.env.FEATURE_MYSIDELINE_SYNC = 'false';
        
        // Ensure test database is set up
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        // Clear subscription attempts cache
        global.subscriptionAttempts = new Map();
        
        // Clear email subscriptions
        await EmailSubscription.destroy({ where: {} });
    });

    afterAll(async () => {
        // Reset environment variables
        delete process.env.FEATURE_COMING_SOON_MODE;
        delete process.env.FEATURE_MAINTENANCE_MODE;
        delete process.env.FEATURE_MYSIDELINE_SYNC;
        
        // Close database connection
        await sequelize.close();
    });

    describe('Coming Soon Page Access', () => {
        test('should allow access to coming soon page', async () => {
            const response = await request(app)
                .get('/coming-soon');

            expect(response.status).toBe(200);
        });

        test('should redirect home page to coming soon when mode is enabled', async () => {
            const response = await request(app)
                .get('/');

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/coming-soon');
        });

        test('should redirect carnivals page to coming soon when mode is enabled', async () => {
            const response = await request(app)
                .get('/carnivals');

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/coming-soon');
        });
    });

    describe('Subscription Endpoint Access', () => {
        test('should allow access to /subscribe endpoint when coming soon mode is enabled', async () => {
            const formTimestamp = Date.now() - 5000;
            
            const response = await request(app)
                .post('/subscribe')
                .send({
                    email: 'comingsoon@example.com',
                    form_timestamp: formTimestamp.toString(),
                    website: ''
                });

            // Should not be redirected, should process the subscription
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Successfully subscribed to newsletter!');

            // Verify subscription was created
            const subscription = await EmailSubscription.findOne({
                where: { email: 'comingsoon@example.com' }
            });
            expect(subscription).toBeTruthy();
            expect(subscription.isActive).toBe(true);
        });

        test('should still apply bot protection when coming soon mode is enabled', async () => {
            const response = await request(app)
                .post('/subscribe')
                .send({
                    email: 'bot@example.com',
                    form_timestamp: (Date.now() - 5000).toString(),
                    website: 'spam-content' // Bot filled honeypot
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
    });

    describe('Static Assets Access', () => {
        test('should allow access to CSS files', async () => {
            const response = await request(app)
                .get('/styles/main.css');

            // Should not redirect (200 or 404 is fine, just not 302)
            expect(response.status).not.toBe(302);
        });

        test('should allow access to JS files', async () => {
            const response = await request(app)
                .get('/js/coming-soon.js');

            // Should not redirect (200 or 404 is fine, just not 302)
            expect(response.status).not.toBe(302);
        });
    });

    describe('Protected Routes During Coming Soon', () => {
        test('should allow access to login page', async () => {
            const response = await request(app)
                .get('/auth/login');

            expect(response.status).not.toBe(302);
        });

        test('should redirect registration page to coming soon', async () => {
            const response = await request(app)
                .get('/auth/register');

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/coming-soon');
        });

        test('should allow access to health check', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.status).not.toBe(302);
        });

        test('should allow access to coming soon status API', async () => {
            const response = await request(app)
                .get('/api/coming-soon/status');

            expect(response.status).not.toBe(302);
        });
    });
});