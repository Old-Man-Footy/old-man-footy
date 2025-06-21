/**
 * Coming Soon Middleware Tests
 * Tests for coming soon mode middleware following TDD guidelines
 */

const { comingSoonMode } = require('../middleware/comingSoon');

describe('Coming Soon Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        // Mock Express request, response, and next function
        req = {
            path: '/',
            user: null
        };
        
        res = {
            redirect: jest.fn()
        };
        
        next = jest.fn();

        // Clear environment variables
        delete process.env.FEATURE_COMING_SOON_MODE;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('when coming soon mode is disabled', () => {
        it('should call next() when FEATURE_COMING_SOON_MODE is not set', () => {
            // Act
            comingSoonMode(req, res, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        it('should call next() when FEATURE_COMING_SOON_MODE is false', () => {
            // Arrange
            process.env.FEATURE_COMING_SOON_MODE = 'false';

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

        it('should allow access to static assets', () => {
            const staticPaths = ['/styles/main.css', '/js/app.js', '/images/logo.png', '/icons/favicon.ico'];

            staticPaths.forEach(path => {
                // Arrange
                req.path = path;
                next.mockClear();
                res.redirect.mockClear();

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });
        });

        it('should allow admin access when user is authenticated and is admin', () => {
            // Arrange
            req.path = '/dashboard';
            req.user = { id: 1, isAdmin: true };

            // Act
            comingSoonMode(req, res, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        it('should allow access to admin routes for login', () => {
            const adminPaths = ['/admin/login', '/auth/login', '/auth/register'];

            adminPaths.forEach(path => {
                // Arrange
                req.path = path;
                next.mockClear();
                res.redirect.mockClear();

                // Act
                comingSoonMode(req, res, next);

                // Assert
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });
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

        it('should allow access to coming soon status API endpoint', () => {
            // Arrange
            req.path = '/api/coming-soon/status';

            // Act
            comingSoonMode(req, res, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        it('should redirect regular users to coming soon page', () => {
            // Arrange
            req.path = '/carnivals';

            // Act
            comingSoonMode(req, res, next);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith('/coming-soon');
            expect(next).not.toHaveBeenCalled();
        });

        it('should redirect non-admin authenticated users to coming soon page', () => {
            // Arrange
            req.path = '/clubs';
            req.user = { id: 1, isAdmin: false, isPrimaryDelegate: true };

            // Act
            comingSoonMode(req, res, next);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith('/coming-soon');
            expect(next).not.toHaveBeenCalled();
        });
    });
});