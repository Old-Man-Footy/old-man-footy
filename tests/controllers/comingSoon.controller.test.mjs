/**
 * Coming Soon Controller Tests
 * Tests for coming soon mode functionality following TDD guidelines
 * Comprehensive test suite covering controller, middleware integration, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as comingSoonController from '../../controllers/comingSoon.controller.mjs';
import { comingSoonMode } from '../../middleware/comingSoon.mjs';

describe('Coming Soon Controller', () => {
    let req, res, next;

    beforeEach(() => {
        // Mock Express request and response objects
        req = {
            path: '/',
            headers: {},
            ip: '127.0.0.1',
            user: null,
            isAuthenticated: vi.fn(() => false),
            flash: vi.fn()
        };
        
        res = {
            status: vi.fn().mockReturnThis(),
            render: vi.fn(),
            json: vi.fn(),
            redirect: vi.fn()
        };

        next = vi.fn();

        // Clear environment variables
        delete process.env.FEATURE_COMING_SOON_MODE;
        delete process.env.EMAIL_FROM;
        delete process.env.APP_NAME;
        delete process.env.APP_URL;
        delete process.env.SUPPORT_EMAIL;
        delete process.env.SOCIAL_FACEBOOK_URL;
        delete process.env.SOCIAL_INSTAGRAM_URL;
        delete process.env.SOCIAL_TWITTER_URL;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('showComingSoonPage', () => {
        it('should render coming soon page with correct data from environment variables', () => {
            // Arrange
            process.env.SUPPORT_EMAIL = 'test@example.com';
            process.env.APP_NAME = 'Test App';
            process.env.APP_URL = 'https://test.com';
            process.env.SOCIAL_FACEBOOK_URL = 'https://facebook.com/test';
            process.env.SOCIAL_INSTAGRAM_URL = 'https://instagram.com/test';
            process.env.SOCIAL_TWITTER_URL = 'https://twitter.com/test';

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
                    instagram: 'https://instagram.com/test',
                    twitter: 'https://twitter.com/test'
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

        it('should handle partial environment variable configuration gracefully', () => {
            // Arrange - only set some env vars
            process.env.APP_NAME = 'Partial Config App';
            process.env.SOCIAL_FACEBOOK_URL = 'https://facebook.com/partial';

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
                appName: 'Partial Config App',
                appUrl: 'https://oldmanfooty.au',
                socialMedia: {
                    facebook: 'https://facebook.com/partial',
                    instagram: '',
                    twitter: ''
                }
            });
        });

        it('should handle empty string environment variables', () => {
            // Arrange - set env vars to empty strings
            process.env.SUPPORT_EMAIL = '';
            process.env.APP_NAME = '';
            process.env.APP_URL = '';

            // Act
            comingSoonController.showComingSoonPage(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            const renderCall = res.render.mock.calls[0];
            expect(renderCall[1].contactEmail).toBe('support@oldmanfooty.au');
            expect(renderCall[1].appName).toBe('Old Man Footy');
            expect(renderCall[1].appUrl).toBe('https://oldmanfooty.au');
        });

        it('should not accept request parameters or modify behavior based on request', () => {
            // Arrange - try to influence behavior with request data
            req.query = { appName: 'Hacker App' };
            req.body = { contactEmail: 'hacker@evil.com' };
            req.headers = { 'x-app-name': 'Evil App' };

            // Act
            comingSoonController.showComingSoonPage(req, res);

            // Assert - should use env vars/defaults, not request data
            expect(res.status).toHaveBeenCalledWith(200);
            const renderCall = res.render.mock.calls[0];
            expect(renderCall[1].contactEmail).toBe('support@oldmanfooty.au');
            expect(renderCall[1].appName).toBe('Old Man Footy');
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

        it('should return coming soon mode disabled for invalid environment variable values', () => {
            // Arrange - test various invalid values
            const invalidValues = ['TRUE', 'True', '1', 'yes', 'on', 'enabled', 'active'];
            
            invalidValues.forEach(value => {
                process.env.FEATURE_COMING_SOON_MODE = value;
                
                // Act
                comingSoonController.getComingSoonStatus(req, res);
                
                // Assert
                expect(res.json).toHaveBeenCalledWith({
                    comingSoonMode: false,
                    message: 'Site is live and operational'
                });
                
                // Reset mocks for next iteration
                res.json.mockClear();
            });
        });

        it('should not be influenced by request parameters', () => {
            // Arrange - try to influence response with request data
            process.env.FEATURE_COMING_SOON_MODE = 'false';
            req.query = { comingSoonMode: 'true' };
            req.body = { mode: 'coming-soon' };
            req.headers = { 'x-coming-soon': 'true' };

            // Act
            comingSoonController.getComingSoonStatus(req, res);

            // Assert - should only use environment variable
            expect(res.json).toHaveBeenCalledWith({
                comingSoonMode: false,
                message: 'Site is live and operational'
            });
        });

        it('should return consistent response format', () => {
            // Act
            comingSoonController.getComingSoonStatus(req, res);

            // Assert - verify response structure
            const responseCall = res.json.mock.calls[0][0];
            expect(responseCall).toHaveProperty('comingSoonMode');
            expect(responseCall).toHaveProperty('message');
            expect(typeof responseCall.comingSoonMode).toBe('boolean');
            expect(typeof responseCall.message).toBe('string');
            expect(responseCall.message.length).toBeGreaterThan(0);
        });
    });

    describe('Coming Soon Middleware Integration', () => {
        beforeEach(() => {
            // Reset environment for each test
            process.env.COMING_SOON_ENABLED = 'true';
            process.env.COMING_SOON_TITLE = 'Test Title';
            process.env.COMING_SOON_MESSAGE = 'Test Message';
            
            // Reset mocks
            vi.clearAllMocks();
        });

        describe('when coming soon mode is disabled', () => {
            it('should allow all routes when coming soon mode is off', () => {
                // Arrange
                process.env.FEATURE_COMING_SOON_MODE = 'false';
                req.path = '/dashboard';

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });

            it('should allow routes when coming soon mode env var is not set', () => {
                // Arrange
                req.path = '/clubs';

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });
        });

        describe('when coming soon mode is enabled', () => {
            beforeEach(() => {
                process.env.FEATURE_COMING_SOON_MODE = 'true';
            });

            it('should allow access to coming soon page', () => {
                // Arrange
                req.path = '/coming-soon';

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });

            it('should allow access to authentication routes', () => {
                // Arrange
                const authPaths = ['/auth/login', '/auth/logout', '/auth/invite/abc123'];
                
                authPaths.forEach(path => {
                    req.path = path;
                    
                    // Act
                    comingSoonMode(req, res, next);
                    
                    // Assert
                    expect(next).toHaveBeenCalled();
                    expect(res.redirect).not.toHaveBeenCalled();
                    
                    // Reset for next iteration
                    next.mockClear();
                    res.redirect.mockClear();
                });
            });

            it('should allow access to static assets', () => {
                // Arrange
                const assetPaths = [
                    '/styles/main.css',
                    '/scripts/app.js',
                    '/images/logo.png',
                    '/icons/favicon.ico',
                    '/js/coming-soon.js'
                ];
                
                assetPaths.forEach(path => {
                    req.path = path;
                    
                    // Act
                    comingSoonMode(req, res, next);
                    
                    // Assert
                    expect(next).toHaveBeenCalled();
                    expect(res.redirect).not.toHaveBeenCalled();
                    
                    // Reset for next iteration
                    next.mockClear();
                    res.redirect.mockClear();
                });
            });

            it('should allow access to subscription endpoint', () => {
                // Arrange
                req.path = '/subscribe';

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });

            it('should allow access to health check endpoint', () => {
                // Arrange
                req.path = '/health';

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });

            it('should allow access to coming soon status API', () => {
                // Arrange
                req.path = '/api/coming-soon/status';

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });

            it('should allow access to admin routes', () => {
                // Arrange
                const adminPaths = ['/admin', '/admin/dashboard', '/admin/users'];
                
                adminPaths.forEach(path => {
                    req.path = path;
                    
                    // Act
                    comingSoonMode(req, res, next);
                    
                    // Assert
                    expect(next).toHaveBeenCalled();
                    expect(res.redirect).not.toHaveBeenCalled();
                    
                    // Reset for next iteration
                    next.mockClear();
                    res.redirect.mockClear();
                });
            });

            it('should allow authenticated users to access dashboard', () => {
                // Arrange
                req.path = '/dashboard';
                req.user = { id: 1, email: 'user@test.com' };
                req.isAuthenticated = vi.fn(() => true);

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });

            it('should allow authenticated users to access protected routes', () => {
                // Arrange
                req.user = { id: 1, email: 'user@test.com' };
                req.isAuthenticated = vi.fn(() => true);
                
                const protectedPaths = ['/clubs', '/carnivals', '/sponsors', '/carnival-sponsors'];
                
                protectedPaths.forEach(path => {
                    req.path = path;
                    
                    // Act
                    comingSoonMode(req, res, next);
                    
                    // Assert
                    expect(next).toHaveBeenCalled();
                    expect(res.redirect).not.toHaveBeenCalled();
                    
                    // Reset for next iteration
                    next.mockClear();
                    res.redirect.mockClear();
                });
            });

            it('should allow admin users full access', () => {
                // Arrange
                req.path = '/any-admin-route';
                req.user = { id: 1, email: 'admin@test.com', isAdmin: true };

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });

            describe('Registration blocking during coming soon mode', () => {
                it('should block registration route and redirect to coming soon page', () => {
                    // Arrange
                    process.env.FEATURE_COMING_SOON_MODE = 'true';
                    req.path = '/auth/register';
                    req.flash = vi.fn();

                    // Act
                    comingSoonMode(req, res, next);

                    // Assert
                    expect(req.flash).toHaveBeenCalledWith('error_msg', 'Registration is currently disabled. Please check back when we launch!');
                    expect(res.redirect).toHaveBeenCalledWith('/coming-soon');
                    expect(next).not.toHaveBeenCalled();
                });

                it('should allow other auth routes during coming soon mode', () => {
                    // Arrange
                    process.env.FEATURE_COMING_SOON_MODE = 'true';
                    const allowedAuthPaths = ['/auth/login', '/auth/logout', '/auth/invite/abc123'];
                    
                    allowedAuthPaths.forEach(path => {
                        req.path = path;
                        
                        // Act
                        comingSoonMode(req, res, next);
                        
                        // Assert
                        expect(next).toHaveBeenCalled();
                        expect(res.redirect).not.toHaveBeenCalled();
                        
                        // Reset for next iteration
                        next.mockClear();
                        res.redirect.mockClear();
                    });
                });
            });

            it('should redirect unauthenticated users to coming soon page', () => {
                // Arrange
                req.path = '/clubs';
                req.user = null;

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(res.redirect).toHaveBeenCalledWith('/coming-soon');
                expect(next).not.toHaveBeenCalled();
            });

            it('should handle missing isAuthenticated method gracefully', () => {
                // Arrange
                req.path = '/dashboard';
                req.user = { id: 1, email: 'user@test.com' };
                req.isAuthenticated = undefined; // Simulate missing method

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle errors gracefully when res.render fails', () => {
            // Arrange
            res.render = vi.fn(() => {
                throw new Error('Render failed');
            });

            // Act & Assert - should not throw unhandled errors
            expect(() => {
                comingSoonController.showComingSoonPage(req, res);
            }).toThrow('Render failed');
        });

        it('should handle errors gracefully when res.json fails', () => {
            // Arrange
            res.json = vi.fn(() => {
                throw new Error('JSON response failed');
            });

            // Act & Assert - should not throw unhandled errors
            expect(() => {
                comingSoonController.getComingSoonStatus(req, res);
            }).toThrow('JSON response failed');
        });

        it('should handle malformed environment variables', () => {
            // Arrange - set malformed env vars
            process.env.SUPPORT_EMAIL = 'not-an-email';
            process.env.APP_URL = 'not-a-url';
            process.env.SOCIAL_FACEBOOK_URL = 'also-not-a-url';

            // Act - should not throw
            expect(() => {
                comingSoonController.showComingSoonPage(req, res);
            }).not.toThrow();

            // Assert - should still render with the provided values
            expect(res.render).toHaveBeenCalled();
            const renderCall = res.render.mock.calls[0];
            expect(renderCall[1].contactEmail).toBe('not-an-email');
            expect(renderCall[1].appUrl).toBe('not-a-url');
        });

        it('should handle very long environment variable values', () => {
            // Arrange - set extremely long env vars
            const longString = 'x'.repeat(10000);
            process.env.APP_NAME = longString;
            process.env.SUPPORT_EMAIL = longString;

            // Act - should not throw
            expect(() => {
                comingSoonController.showComingSoonPage(req, res);
            }).not.toThrow();

            // Assert
            expect(res.render).toHaveBeenCalled();
            const renderCall = res.render.mock.calls[0];
            expect(renderCall[1].appName).toBe(longString);
            expect(renderCall[1].contactEmail).toBe(longString);
        });

        it('should handle special characters in environment variables', () => {
            // Arrange - set env vars with special characters
            process.env.APP_NAME = 'Test & <Script>alert("XSS")</Script>';
            process.env.SUPPORT_EMAIL = 'test+special@example.com';

            // Act
            comingSoonController.showComingSoonPage(req, res);

            // Assert - values should be passed through as-is (XSS protection handled by template engine)
            expect(res.render).toHaveBeenCalled();
            const renderCall = res.render.mock.calls[0];
            expect(renderCall[1].appName).toBe('Test & <Script>alert("XSS")</Script>');
            expect(renderCall[1].contactEmail).toBe('test+special@example.com');
        });
    });

    describe('Performance and Load Testing', () => {
        it('should handle multiple rapid requests to showComingSoonPage', () => {
            // Arrange & Act - simulate rapid requests
            const startTime = Date.now();
            for (let i = 0; i < 100; i++) {
                comingSoonController.showComingSoonPage(req, res);
            }
            const endTime = Date.now();

            // Assert - should complete in reasonable time (under 100ms)
            expect(endTime - startTime).toBeLessThan(100);
            expect(res.render).toHaveBeenCalledTimes(100);
        });

        it('should handle multiple rapid requests to getComingSoonStatus', () => {
            // Arrange & Act - simulate rapid requests
            const startTime = Date.now();
            for (let i = 0; i < 100; i++) {
                comingSoonController.getComingSoonStatus(req, res);
            }
            const endTime = Date.now();

            // Assert - should complete in reasonable time (under 100ms)
            expect(endTime - startTime).toBeLessThan(100);
            expect(res.json).toHaveBeenCalledTimes(100);
        });

        it('should handle concurrent requests without state pollution', () => {
            // Arrange - create multiple request contexts
            const requests = Array.from({ length: 10 }, (_, i) => ({
                req: { ...req, id: i },
                res: { ...res, render: vi.fn(), json: vi.fn() }
            }));

            // Act - execute concurrently
            requests.forEach(({ req: reqCtx, res: resCtx }) => {
                comingSoonController.showComingSoonPage(reqCtx, resCtx);
                comingSoonController.getComingSoonStatus(reqCtx, resCtx);
            });

            // Assert - each should have been called exactly once
            requests.forEach(({ res: resCtx }) => {
                expect(resCtx.render).toHaveBeenCalledTimes(1);
                expect(resCtx.json).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Security Testing', () => {
        it('should not expose sensitive environment variables in response', () => {
            // Arrange - set sensitive env vars
            process.env.DATABASE_URL = 'sqlite://secret-db-path';
            process.env.SECRET_KEY = 'super-secret-key';
            process.env.API_TOKEN = 'secret-api-token';

            // Act
            comingSoonController.showComingSoonPage(req, res);
            comingSoonController.getComingSoonStatus(req, res);

            // Assert - sensitive data should not appear in responses
            const renderCall = res.render.mock.calls[0];
            const jsonCall = res.json.mock.calls[0];
            
            const renderStr = JSON.stringify(renderCall);
            const jsonStr = JSON.stringify(jsonCall);
            
            expect(renderStr).not.toContain('secret-db-path');
            expect(renderStr).not.toContain('super-secret-key');
            expect(renderStr).not.toContain('secret-api-token');
            expect(jsonStr).not.toContain('secret-db-path');
            expect(jsonStr).not.toContain('super-secret-key');
            expect(jsonStr).not.toContain('secret-api-token');
        });

        it('should not be vulnerable to prototype pollution via environment variables', () => {
            // Arrange - attempt prototype pollution
            process.env['__proto__.polluted'] = 'true';
            process.env['constructor.prototype.polluted'] = 'true';

            // Act
            comingSoonController.showComingSoonPage(req, res);

            // Assert - should not pollute prototypes
            expect(Object.prototype.polluted).toBeUndefined();
            expect(String.prototype.polluted).toBeUndefined();
        });

        it('should maintain consistent behavior regardless of request headers', () => {
            // Arrange - set various headers that might influence behavior
            req.headers = {
                'user-agent': 'Mozilla/5.0 (compatible; ScrapingBot/1.0)',
                'x-forwarded-for': '192.168.1.1',
                'x-real-ip': '10.0.0.1',
                'x-app-name': 'Hacker App',
                'authorization': 'Bearer malicious-token'
            };

            // Act
            comingSoonController.showComingSoonPage(req, res);
            const firstCall = res.render.mock.calls[0];

            // Reset and try with different headers
            res.render.mockClear();
            req.headers = {
                'user-agent': 'Chrome/91.0',
                'accept-language': 'en-US'
            };

            comingSoonController.showComingSoonPage(req, res);
            const secondCall = res.render.mock.calls[0];

            // Assert - responses should be identical regardless of headers
            expect(firstCall[1]).toEqual(secondCall[1]);
        });
    });
});