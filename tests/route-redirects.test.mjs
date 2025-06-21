/**
 * Route Redirect Tests
 * Tests for maintenance and coming soon route redirects when disabled
 */

const request = require('supertest');
const app = require('../app');

describe('Route Redirects for Disabled Modes', () => {
    let originalMaintenanceMode, originalComingSoonMode;

    beforeEach(() => {
        // Store original environment variables
        originalMaintenanceMode = process.env.FEATURE_MAINTENANCE_MODE;
        originalComingSoonMode = process.env.FEATURE_COMING_SOON_MODE;
    });

    afterEach(() => {
        // Restore original environment variables
        if (originalMaintenanceMode !== undefined) {
            process.env.FEATURE_MAINTENANCE_MODE = originalMaintenanceMode;
        } else {
            delete process.env.FEATURE_MAINTENANCE_MODE;
        }
        
        if (originalComingSoonMode !== undefined) {
            process.env.FEATURE_COMING_SOON_MODE = originalComingSoonMode;
        } else {
            delete process.env.FEATURE_COMING_SOON_MODE;
        }
    });

    describe('/maintenance route', () => {
        it('should redirect to home page when FEATURE_MAINTENANCE_MODE is false', async () => {
            // Arrange
            process.env.FEATURE_MAINTENANCE_MODE = 'false';

            // Act
            const response = await request(app)
                .get('/maintenance');

            // Assert
            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/');
        });

        it('should redirect to home page when FEATURE_MAINTENANCE_MODE is not set', async () => {
            // Arrange
            delete process.env.FEATURE_MAINTENANCE_MODE;

            // Act
            const response = await request(app)
                .get('/maintenance');

            // Assert
            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/');
        });

        it('should show maintenance page when FEATURE_MAINTENANCE_MODE is true', async () => {
            // Arrange
            process.env.FEATURE_MAINTENANCE_MODE = 'true';

            // Act
            const response = await request(app)
                .get('/maintenance');

            // Assert
            expect(response.status).toBe(503);
            expect(response.text).toContain('Site Maintenance');
        });
    });

    describe('/coming-soon route', () => {
        it('should redirect to home page when FEATURE_COMING_SOON_MODE is false', async () => {
            // Arrange
            process.env.FEATURE_COMING_SOON_MODE = 'false';

            // Act
            const response = await request(app)
                .get('/coming-soon');

            // Assert
            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/');
        });

        it('should redirect to home page when FEATURE_COMING_SOON_MODE is not set', async () => {
            // Arrange
            delete process.env.FEATURE_COMING_SOON_MODE;

            // Act
            const response = await request(app)
                .get('/coming-soon');

            // Assert
            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/');
        });

        it('should show coming soon page when FEATURE_COMING_SOON_MODE is true', async () => {
            // Arrange
            process.env.FEATURE_COMING_SOON_MODE = 'true';

            // Act
            const response = await request(app)
                .get('/coming-soon');

            // Assert
            expect(response.status).toBe(200);
            expect(response.text).toContain('Something Exciting is Coming');
        });
    });
});