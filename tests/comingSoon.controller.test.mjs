/**
 * Coming Soon Controller Tests
 * Tests for coming soon mode functionality following TDD guidelines
 */

import * as comingSoonController from '../controllers/comingSoon.controller.mjs';

describe('Coming Soon Controller', () => {
    let req, res;

    beforeEach(() => {
        // Mock Express request and response objects
        req = {
            path: '/',
            headers: {},
            ip: '127.0.0.1'
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            render: jest.fn(),
            json: jest.fn()
        };

        // Clear environment variables
        delete process.env.FEATURE_COMING_SOON_MODE;
        delete process.env.EMAIL_FROM;
        delete process.env.APP_NAME;
        delete process.env.APP_URL;
        delete process.env.SOCIAL_FACEBOOK_URL;
        delete process.env.SOCIAL_INSTAGRAM_URL;
        delete process.env.SOCIAL_TWITTER_URL;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('showComingSoonPage', () => {
        it('should render coming soon page with correct data', () => {
            // Arrange
            process.env.EMAIL_FROM = 'test@example.com';
            process.env.APP_NAME = 'Test App';
            process.env.APP_URL = 'https://test.com';
            process.env.SOCIAL_FACEBOOK_URL = 'https://facebook.com/test';

            // Act
            comingSoonController.showComingSoonPage(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.render).toHaveBeenCalledWith('coming-soon', {
                title: 'Coming Soon - Old Man Footy',
                heading: 'Something Exciting is Coming!',
                message: 'We\'re putting the finishing touches on Old Man Footy - your ultimate hub for Masters Rugby League.',
                subMessage: 'Get ready to discover carnivals, connect with clubs, and be part of the growing Masters community across Australia.',
                launchMessage: 'Launch coming soon! Stay tuned for updates.',
                contactEmail: 'test@example.com',
                appName: 'Test App',
                appUrl: 'https://test.com',
                socialMedia: {
                    facebook: 'https://facebook.com/test',
                    instagram: '',
                    twitter: ''
                }
            });
        });

        it('should render coming soon page with default values when env vars not set', () => {
            // Act
            comingSoonController.showComingSoonPage(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.render).toHaveBeenCalledWith('coming-soon', {
                title: 'Coming Soon - Old Man Footy',
                heading: 'Something Exciting is Coming!',
                message: 'We\'re putting the finishing touches on Old Man Footy - your ultimate hub for Masters Rugby League.',
                subMessage: 'Get ready to discover carnivals, connect with clubs, and be part of the growing Masters community across Australia.',
                launchMessage: 'Launch coming soon! Stay tuned for updates.',
                contactEmail: 'support@oldmanfooty.au',
                appName: 'Old Man Footy',
                appUrl: 'https://oldmanfooty.au',
                socialMedia: {
                    facebook: '',
                    instagram: '',
                    twitter: ''
                }
            });
        });
    });

    describe('getComingSoonStatus', () => {
        it('should return coming soon mode enabled when environment variable is true', () => {
            // Arrange
            process.env.FEATURE_COMING_SOON_MODE = 'true';

            // Act
            comingSoonController.getComingSoonStatus(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                comingSoonMode: true,
                message: 'Site is currently in coming soon mode'
            });
        });

        it('should return coming soon mode disabled when environment variable is false', () => {
            // Arrange
            process.env.FEATURE_COMING_SOON_MODE = 'false';

            // Act
            comingSoonController.getComingSoonStatus(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                comingSoonMode: false,
                message: 'Site is live and operational'
            });
        });

        it('should return coming soon mode disabled when environment variable is not set', () => {
            // Act
            comingSoonController.getComingSoonStatus(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                comingSoonMode: false,
                message: 'Site is live and operational'
            });
        });
    });
});