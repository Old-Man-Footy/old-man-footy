/**
 * Maintenance Controller Tests
 * Tests for maintenance mode functionality following TDD guidelines
 */

import * as maintenanceController from '../controllers/maintenance.controller.mjs';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';


describe('Maintenance Controller', () => {
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
        delete process.env.FEATURE_MAINTENANCE_MODE;
        delete process.env.EMAIL_FROM;
        delete process.env.APP_NAME;
        delete process.env.APP_URL;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('showMaintenancePage', () => {
        it('should render maintenance page with correct data', () => {
            // Arrange
            process.env.EMAIL_FROM = 'test@example.com';
            process.env.APP_NAME = 'Test App';
            process.env.APP_URL = 'https://test.com';

            // Act
            maintenanceController.showMaintenancePage(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.render).toHaveBeenCalledWith('maintenance', {
                title: 'Site Maintenance - Old Man Footy',
                message: 'We\'re currently performing scheduled maintenance to improve your experience.',
                estimatedReturn: 'We expect to be back online soon. Please check back later.',
                contactEmail: 'test@example.com',
                appName: 'Test App',
                appUrl: 'https://test.com'
            });
        });

        it('should use default values when environment variables are not set', () => {
            // Act
            maintenanceController.showMaintenancePage(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.render).toHaveBeenCalledWith('maintenance', {
                title: 'Site Maintenance - Old Man Footy',
                message: 'We\'re currently performing scheduled maintenance to improve your experience.',
                estimatedReturn: 'We expect to be back online soon. Please check back later.',
                contactEmail: 'support@oldmanfooty.au',
                appName: 'Old Man Footy',
                appUrl: 'https://oldmanfooty.au'
            });
        });
    });

    describe('getMaintenanceStatus', () => {
        it('should return maintenance mode enabled when environment variable is true', () => {
            // Arrange
            process.env.FEATURE_MAINTENANCE_MODE = 'true';

            // Act
            maintenanceController.getMaintenanceStatus(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                maintenanceMode: true,
                message: 'Site is currently in maintenance mode'
            });
        });

        it('should return maintenance mode disabled when environment variable is false', () => {
            // Arrange
            process.env.FEATURE_MAINTENANCE_MODE = 'false';

            // Act
            maintenanceController.getMaintenanceStatus(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                maintenanceMode: false,
                message: 'Site is operational'
            });
        });

        it('should return maintenance mode disabled when environment variable is not set', () => {
            // Act
            maintenanceController.getMaintenanceStatus(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                maintenanceMode: false,
                message: 'Site is operational'
            });
        });
    });
});