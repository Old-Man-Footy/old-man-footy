/**
 * Maintenance Middleware Tests
 * Tests for maintenance mode middleware following TDD guidelines
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { maintenanceMode } from '../middleware/maintenance.mjs';

describe('Maintenance Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        // Mock Express request, response, and next function
        req = {
            path: '/',
            user: null,
            flash: vi.fn(),
            isAuthenticated: vi.fn(() => false)
        };
        
        res = {
            redirect: vi.fn()
        };
        
        next = vi.fn();

        // Clear environment variables
        delete process.env.FEATURE_MAINTENANCE_MODE;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('when maintenance mode is disabled', () => {
        it('should call next() when FEATURE_MAINTENANCE_MODE is not set', () => {
            // Act
            maintenanceMode(req, res, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        it('should call next() when FEATURE_MAINTENANCE_MODE is false', () => {
            // Arrange
            process.env.FEATURE_MAINTENANCE_MODE = 'false';

            // Act
            maintenanceMode(req, res, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });
    });

    describe('when maintenance mode is enabled', () => {
        beforeEach(() => {
            process.env.FEATURE_MAINTENANCE_MODE = 'true';
        });

        it('should allow access to maintenance page', () => {
            // Arrange
            req.path = '/maintenance';

            // Act
            maintenanceMode(req, res, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        it('should allow access to static assets', () => {
            const staticPaths = ['/styles/main.css', '/js/app.js', '/images/logo.png', '/icons/favicon.ico'];

            staticPaths.forEach(path => {
                // Arrange
                req.path = path;
                next.mockClear();
                res.redirect.mockClear();

                // Act
                maintenanceMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });
        });

        it('should allow access for admin users', () => {
            // Arrange
            req.user = { id: 1, isAdmin: true };

            // Act
            maintenanceMode(req, res, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        describe('should allow access to admin and auth routes', () => {
            const adminRoutes = [
                '/admin',
                '/admin/dashboard', 
                '/auth/login'
                // Note: /auth/logout is not explicitly allowed by the middleware
            ];

            adminRoutes.forEach(route => {
                it(`should allow access to ${route}`, () => {
                    // Arrange
                    const req = { path: route };
                    const res = { redirect: vi.fn() };
                    const next = vi.fn();

                    // Act
                    maintenanceMode(req, res, next);

                    // Assert
                    expect(next).toHaveBeenCalled();
                    expect(res.redirect).not.toHaveBeenCalled();
                });
            });
        });

        it('should allow access to health check endpoint', () => {
            // Arrange
            req.path = '/health';

            // Act
            maintenanceMode(req, res, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        it('should allow access to maintenance status API endpoint', () => {
            // Arrange
            req.path = '/api/maintenance/status';

            // Act
            maintenanceMode(req, res, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        it('should redirect regular users to maintenance page', () => {
            // Arrange
            req.path = '/dashboard';
            req.user = { id: 1, isAdmin: false };

            // Act
            maintenanceMode(req, res, next);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith('/maintenance');
            expect(next).not.toHaveBeenCalled();
        });

        it('should redirect unauthenticated users to maintenance page', () => {
            // Arrange
            req.path = '/carnivals';

            // Act
            maintenanceMode(req, res, next);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith('/maintenance');
            expect(next).not.toHaveBeenCalled();
        });

        it('should redirect non-admin authenticated users to maintenance page', () => {
            // Arrange
            req.path = '/clubs';
            req.user = { id: 1, isAdmin: false, isPrimaryDelegate: true };

            // Act
            maintenanceMode(req, res, next);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith('/maintenance');
            expect(next).not.toHaveBeenCalled();
        });
    });
});