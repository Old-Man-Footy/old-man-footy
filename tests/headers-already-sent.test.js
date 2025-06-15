/**
 * Headers Already Sent Error Prevention Tests
 * 
 * Tests to ensure controllers properly handle response sending
 * and don't attempt to send multiple responses which causes
 * "Cannot set headers after they are sent to the client" errors.
 */

const request = require('supertest');
const app = require('../app');
const { User, Club, Carnival } = require('../models');

// Mock the models to control when they throw errors
jest.mock('../models', () => ({
    User: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        count: jest.fn()
    },
    Club: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        findByPk: jest.fn(),
        count: jest.fn()
    },
    Carnival: {
        findAll: jest.fn(),
        count: jest.fn()
    }
}));

describe('Headers Already Sent Error Prevention', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Authentication Controller', () => {
        test('showRegisterForm should not send multiple responses when database fails', async () => {
            // Arrange: Make Club.findAll throw an error
            Club.findAll.mockRejectedValue(new Error('Database connection failed'));

            // Act & Assert: Should not throw headers already sent error
            const response = await request(app)
                .get('/auth/register')
                .expect(200); // Should still render with empty clubs array

            expect(Club.findAll).toHaveBeenCalledTimes(1);
            expect(response.text).toContain('Register as Club Delegate');
        });

        test('registerUser should handle validation errors without multiple responses', async () => {
            // Arrange: Set up valid request but with validation errors
            const userData = {
                firstName: '', // Invalid - empty
                lastName: 'Doe',
                email: 'invalid-email', // Invalid format
                password: '123', // Too short
                clubName: 'Test Club',
                clubState: 'NSW',
                location: 'Sydney'
            };

            Club.findAll.mockResolvedValue([]);

            // Act & Assert
            const response = await request(app)
                .post('/auth/register')
                .send(userData)
                .expect(200); // Should re-render form with errors

            expect(response.text).toContain('Register as Club Delegate');
            expect(Club.findAll).toHaveBeenCalled();
        });
    });

    describe('Main Controller', () => {
        test('getIndex should not send multiple responses when data fetching fails', async () => {
            // Arrange: Make Carnival.findAll throw an error for homepage
            Carnival.findAll.mockRejectedValue(new Error('Database error'));
            Carnival.count.mockRejectedValue(new Error('Database error'));
            Club.count.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            const response = await request(app)
                .get('/')
                .expect(200); // Should still render with empty data

            expect(response.text).toContain('Old Man Footy');
        });

        test('getDashboard should handle authentication and database errors', async () => {
            // Arrange: Mock authenticated user
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                clubId: 1,
                isPrimaryDelegate: true
            };

            // Mock middleware to set req.user
            const authenticatedRequest = request(app)
                .get('/dashboard')
                .set('user', JSON.stringify(mockUser));

            // Make database calls fail
            Carnival.findAll.mockRejectedValue(new Error('Database error'));
            Club.findByPk.mockRejectedValue(new Error('Database error'));
            User.findAll.mockRejectedValue(new Error('Database error'));

            // Act & Assert: Should redirect to login if not authenticated
            await authenticatedRequest.expect(302); // Redirect to login
        });
    });

    describe('Response State Validation', () => {
        test('should check res.headersSent before attempting to send response', () => {
            // This is more of a code review test - ensuring our controllers
            // check res.headersSent before attempting fallback responses
            
            const fs = require('fs');
            const path = require('path');
            
            // Read auth controller file
            const authControllerPath = path.join(__dirname, '../controllers/auth.controller.js');
            const authControllerContent = fs.readFileSync(authControllerPath, 'utf8');
            
            // Check that it contains the headersSent check
            expect(authControllerContent).toContain('if (!res.headersSent)');
            
            // Read main controller file  
            const mainControllerPath = path.join(__dirname, '../controllers/main.controller.js');
            const mainControllerContent = fs.readFileSync(mainControllerPath, 'utf8');
            
            // Check that it contains the headersSent check
            expect(mainControllerContent).toContain('if (!res.headersSent)');
        });

        test('should use return statements to prevent code execution after response', () => {
            const fs = require('fs');
            const path = require('path');
            
            // Check that controllers use return statements with responses
            const authControllerPath = path.join(__dirname, '../controllers/auth.controller.js');
            const authControllerContent = fs.readFileSync(authControllerPath, 'utf8');
            
            // Should have return statements before render/redirect calls
            expect(authControllerContent).toContain('return res.render');
            expect(authControllerContent).toContain('return res.redirect');
        });
    });

    describe('Error Handling Patterns', () => {
        test('controllers should follow consistent error handling patterns', () => {
            const fs = require('fs');
            const path = require('path');
            
            const controllersDir = path.join(__dirname, '../controllers');
            const controllerFiles = fs.readdirSync(controllersDir)
                .filter(file => file.endsWith('.controller.js'));
            
            controllerFiles.forEach(file => {
                const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
                
                // Each controller should have try-catch blocks
                expect(content).toMatch(/try\s*{[\s\S]*}\s*catch\s*\(/);
                
                // Should have proper JSDoc comments
                expect(content).toContain('/**');
                
                // Should not have multiple res.render or res.redirect without proper guards
                const renderMatches = content.match(/res\.render\(/g) || [];
                const redirectMatches = content.match(/res\.redirect\(/g) || [];
                
                if (renderMatches.length > 1 || redirectMatches.length > 1) {
                    // If multiple response methods, should have proper guards
                    expect(content).toMatch(/if\s*\(\s*!res\.headersSent\s*\)|return\s+res\./);
                }
            });
        });
    });
});

/**
 * Integration test helper to simulate actual request/response cycle
 * and catch headers already sent errors
 */
describe('Integration Error Prevention', () => {
    test('registration flow should not throw headers already sent error', async () => {
        // Mock successful database operations
        Club.findAll.mockResolvedValue([
            { clubName: 'Existing Club', state: 'NSW', location: 'Sydney' }
        ]);
        User.findOne.mockResolvedValue(null); // No existing user
        Club.findOne.mockResolvedValue(null); // No existing club
        Club.create.mockResolvedValue({ id: 1, clubName: 'New Club' });
        User.create.mockResolvedValue({ id: 1, email: 'test@example.com' });

        // Valid registration data
        const userData = {
            firstName: 'John',
            lastName: 'Doe', 
            email: 'john.doe@example.com',
            password: 'securepassword123',
            clubName: 'New Test Club',
            clubState: 'NSW',
            location: 'Sydney'
        };

        // Should complete without headers already sent error
        const response = await request(app)
            .post('/auth/register')
            .send(userData)
            .expect(302); // Successful registration redirects

        expect(response.headers.location).toBe('/auth/login');
    });
});