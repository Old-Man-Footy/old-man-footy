/**
 * Deactivated Club Reactivation Feature Tests
 * 
 * Tests the complete workflow for detecting, reactivating deactivated clubs
 * and sending fraud alert notifications to original delegates.
 * 
 * Following TDD guidelines with AAA pattern and proper mocking.
 */

const { User, Club } = require('../models');
const emailService = require('../services/emailService');

// Mock dependencies
jest.mock('../models', () => ({
    User: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn()
    },
    Club: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    }
}));

jest.mock('../services/emailService', () => ({
    sendClubReactivationAlert: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../config/database', () => ({
    sequelize: {
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

// Mock express-validator
jest.mock('express-validator', () => ({
    validationResult: jest.fn(() => ({
        isEmpty: jest.fn(() => true)
    }))
}));

// Import controller after mocks
const authController = require('../controllers/auth.controller');

describe('Deactivated Club Reactivation Feature', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Registration Form - Club Data Loading', () => {
        test('should include deactivated clubs in autocomplete data', async () => {
            // Arrange
            const mockClubs = [
                { clubName: 'Active Club', state: 'NSW', location: 'Sydney', isActive: true },
                { clubName: 'Deactivated Club', state: 'QLD', location: 'Brisbane', isActive: false },
                { clubName: 'Another Active Club', state: 'VIC', location: 'Melbourne', isActive: true }
            ];
            
            const mockReq = {};
            const mockRes = {
                render: jest.fn(),
                headersSent: false
            };
            
            Club.findAll.mockResolvedValue(mockClubs);

            // Act
            await authController.showRegisterForm(mockReq, mockRes);

            // Assert
            expect(Club.findAll).toHaveBeenCalledWith({
                attributes: ['clubName', 'state', 'location', 'isActive'],
                order: [['clubName', 'ASC']]
            });
            
            expect(mockRes.render).toHaveBeenCalledWith('auth/register', {
                title: 'Register as Club Delegate',
                clubs: mockClubs
            });
        });

        test('should handle database errors gracefully when loading clubs', async () => {
            // Arrange
            const mockReq = {};
            const mockRes = {
                render: jest.fn(),
                headersSent: false
            };
            
            Club.findAll.mockRejectedValue(new Error('Database connection failed'));

            // Act
            await authController.showRegisterForm(mockReq, mockRes);

            // Assert
            expect(mockRes.render).toHaveBeenCalledWith('auth/register', {
                title: 'Register as Club Delegate',
                clubs: []
            });
        });
    });

    describe('Deactivated Club Detection Logic', () => {
        test('should detect deactivated club and prompt for reactivation', async () => {
            // Arrange
            const deactivatedClub = {
                id: 1,
                clubName: 'Test Deactivated Club',
                state: 'NSW',
                location: 'Sydney',
                isActive: false
            };

            const mockReq = {
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    clubName: 'Test Deactivated Club',
                    clubState: 'NSW',
                    location: 'Sydney'
                    // Note: reactivateClub not included - should trigger confirmation prompt
                }
            };

            const mockRes = {
                render: jest.fn(),
                redirect: jest.fn(),
                headersSent: false
            };

            Club.findAll.mockResolvedValue([deactivatedClub]);
            User.findOne.mockResolvedValue(null); // No existing user
            Club.findOne.mockResolvedValue(deactivatedClub);

            // Act
            await authController.registerUser(mockReq, mockRes);

            // Assert
            expect(mockRes.render).toHaveBeenCalledWith(
                'auth/register',
                expect.objectContaining({
                    showReactivationConfirm: true,
                    deactivatedClub: deactivatedClub,
                    errors: expect.arrayContaining([
                        expect.objectContaining({
                            msg: 'This club is currently deactivated. Please confirm if you want to reactivate it.'
                        })
                    ])
                })
            );
        });
    });

    describe('Club Reactivation Process', () => {
        test('should reactivate club when confirmation is provided', async () => {
            // Arrange
            const deactivatedClub = {
                id: 1,
                clubName: 'Test Deactivated Club',
                state: 'NSW',
                location: 'Sydney',
                isActive: false,
                update: jest.fn().mockResolvedValue(true)
            };

            const originalDelegate = {
                id: 2,
                email: 'original@example.com',
                firstName: 'Original',
                lastName: 'Delegate',
                getFullName: jest.fn().mockReturnValue('Original Delegate')
            };

            const newUser = {
                id: 3,
                email: 'john@example.com',
                firstName: 'John',
                lastName: 'Doe',
                getFullName: jest.fn().mockReturnValue('John Doe')
            };

            const mockReq = {
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    clubName: 'Test Deactivated Club',
                    clubState: 'NSW',
                    location: 'Sydney',
                    reactivateClub: 'true'
                },
                flash: jest.fn()
            };

            const mockRes = {
                redirect: jest.fn(),
                headersSent: false
            };

            // Mock the transaction
            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            const { sequelize } = require('../config/database');
            sequelize.transaction.mockResolvedValue(mockTransaction);

            Club.findAll.mockResolvedValue([deactivatedClub]);
            User.findOne
                .mockResolvedValueOnce(null) // No existing user check
                .mockResolvedValueOnce(originalDelegate); // Original delegate lookup
            Club.findOne.mockResolvedValue(deactivatedClub);
            User.create.mockResolvedValue(newUser);

            // Act
            await authController.registerUser(mockReq, mockRes);

            // Assert
            expect(deactivatedClub.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    isActive: true,
                    state: 'NSW',
                    location: 'Sydney'
                }),
                expect.objectContaining({ transaction: mockTransaction })
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(emailService.sendClubReactivationAlert).toHaveBeenCalledWith(
                'original@example.com',
                'Original Delegate',
                'Test Deactivated Club',
                'John Doe',
                'john@example.com'
            );
            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
        });

        test('should handle reactivation when no original delegate exists', async () => {
            // Arrange
            const deactivatedClub = {
                id: 1,
                clubName: 'Orphaned Club',
                isActive: false,
                update: jest.fn().mockResolvedValue(true)
            };

            const newUser = {
                id: 3,
                getFullName: jest.fn().mockReturnValue('John Doe')
            };

            const mockReq = {
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    clubName: 'Orphaned Club',
                    clubState: 'NSW',
                    location: 'Sydney',
                    reactivateClub: 'true'
                },
                flash: jest.fn()
            };

            const mockRes = {
                redirect: jest.fn(),
                headersSent: false
            };

            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            const { sequelize } = require('../config/database');
            sequelize.transaction.mockResolvedValue(mockTransaction);

            Club.findAll.mockResolvedValue([]);
            User.findOne
                .mockResolvedValueOnce(null) // No existing user
                .mockResolvedValueOnce(null); // No original delegate found
            Club.findOne.mockResolvedValue(deactivatedClub);
            User.create.mockResolvedValue(newUser);

            // Act
            await authController.registerUser(mockReq, mockRes);

            // Assert
            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
            expect(emailService.sendClubReactivationAlert).not.toHaveBeenCalled();
        });
    });

    describe('Email Security Notifications', () => {
        test('should send fraud alert email with correct parameters', async () => {
            // Arrange
            const originalDelegateEmail = 'original@example.com';
            const originalDelegateName = 'Original Delegate';
            const clubName = 'Test Club';
            const newDelegateName = 'New Delegate';
            const newDelegateEmail = 'new@example.com';

            // Act
            await emailService.sendClubReactivationAlert(
                originalDelegateEmail,
                originalDelegateName,
                clubName,
                newDelegateName,
                newDelegateEmail
            );

            // Assert
            expect(emailService.sendClubReactivationAlert).toHaveBeenCalledWith(
                originalDelegateEmail,
                originalDelegateName,
                clubName,
                newDelegateName,
                newDelegateEmail
            );
        });

        test('should handle email service failures gracefully during registration', async () => {
            // Arrange
            const deactivatedClub = {
                id: 1,
                clubName: 'Test Club',
                isActive: false,
                update: jest.fn().mockResolvedValue(true)
            };

            const originalDelegate = {
                id: 2,
                email: 'original@example.com',
                getFullName: jest.fn().mockReturnValue('Original Delegate')
            };

            const newUser = {
                id: 3,
                getFullName: jest.fn().mockReturnValue('John Doe')
            };

            const mockReq = {
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    clubName: 'Test Club',
                    clubState: 'NSW',
                    location: 'Sydney',
                    reactivateClub: 'true'
                },
                flash: jest.fn()
            };

            const mockRes = {
                redirect: jest.fn(),
                headersSent: false
            };

            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            const { sequelize } = require('../config/database');
            sequelize.transaction.mockResolvedValue(mockTransaction);

            Club.findAll.mockResolvedValue([]);
            User.findOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(originalDelegate);
            Club.findOne.mockResolvedValue(deactivatedClub);
            User.create.mockResolvedValue(newUser);
            emailService.sendClubReactivationAlert.mockRejectedValue(new Error('Email service failed'));

            // Act
            await authController.registerUser(mockReq, mockRes);

            // Assert - Registration should still succeed even if email fails
            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
            expect(emailService.sendClubReactivationAlert).toHaveBeenCalled();
        });
    });

    describe('Security Validation', () => {
        test('should reject registration without reactivation confirmation for deactivated club', async () => {
            // Arrange
            const deactivatedClub = {
                id: 1,
                clubName: 'Deactivated Club',
                isActive: false
            };

            const mockReq = {
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    clubName: 'Deactivated Club',
                    clubState: 'NSW',
                    location: 'Sydney'
                    // Missing reactivateClub: 'true'
                }
            };

            const mockRes = {
                render: jest.fn(),
                headersSent: false
            };

            Club.findAll.mockResolvedValue([deactivatedClub]);
            User.findOne.mockResolvedValue(null);
            Club.findOne.mockResolvedValue(deactivatedClub);

            // Act
            await authController.registerUser(mockReq, mockRes);

            // Assert
            expect(mockRes.render).toHaveBeenCalledWith(
                'auth/register',
                expect.objectContaining({
                    showReactivationConfirm: true,
                    errors: expect.arrayContaining([
                        expect.objectContaining({
                            msg: 'This club is currently deactivated. Please confirm if you want to reactivate it.'
                        })
                    ])
                })
            );
            expect(User.create).not.toHaveBeenCalled();
        });

        test('should prevent multiple reactivations by different users', async () => {
            // Arrange
            const activeClub = {
                id: 1,
                clubName: 'Recently Reactivated Club',
                isActive: true
            };

            const existingDelegate = {
                id: 2,
                email: 'existing@example.com',
                isPrimaryDelegate: true
            };

            const mockReq = {
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    clubName: 'Recently Reactivated Club',
                    clubState: 'NSW',
                    location: 'Sydney',
                    reactivateClub: 'true'
                }
            };

            const mockRes = {
                render: jest.fn(),
                headersSent: false
            };

            Club.findAll.mockResolvedValue([activeClub]);
            User.findOne.mockResolvedValue(null);
            Club.findOne.mockResolvedValue(activeClub);
            User.findAll.mockResolvedValue([existingDelegate]);

            // Act
            await authController.registerUser(mockReq, mockRes);

            // Assert
            expect(mockRes.render).toHaveBeenCalledWith(
                'auth/register',
                expect.objectContaining({
                    errors: expect.arrayContaining([
                        expect.objectContaining({
                            msg: 'This club already has a primary delegate. Please contact them for an invitation.'
                        })
                    ])
                })
            );
            expect(User.create).not.toHaveBeenCalled();
        });
    });

    describe('Database Transaction Safety', () => {
        test('should rollback transaction if reactivation fails', async () => {
            // Arrange
            const transaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            const deactivatedClub = {
                id: 1,
                clubName: 'Test Club',
                isActive: false,
                update: jest.fn().mockRejectedValue(new Error('Database error'))
            };

            const mockReq = {
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    clubName: 'Test Club',
                    clubState: 'NSW',
                    location: 'Sydney',
                    reactivateClub: 'true'
                },
                flash: jest.fn()
            };

            const mockRes = {
                redirect: jest.fn(),
                headersSent: false
            };

            const { sequelize } = require('../config/database');
            sequelize.transaction.mockResolvedValue(transaction);

            Club.findAll.mockResolvedValue([]);
            User.findOne.mockResolvedValue(null);
            Club.findOne.mockResolvedValue(deactivatedClub);

            // Act
            await authController.registerUser(mockReq, mockRes);

            // Assert - Controller should handle error gracefully and redirect to register
            expect(transaction.rollback).toHaveBeenCalled();
            expect(transaction.commit).not.toHaveBeenCalled();
            expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'An error occurred during registration. Please try again.');
            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/register');
        });
    });

    describe('Edge Cases', () => {
        test('should handle club with mixed case names correctly', async () => {
            // Arrange
            const deactivatedClub = {
                id: 1,
                clubName: 'Test Club Name',
                isActive: false,
                update: jest.fn().mockResolvedValue(true)
            };

            const mockReq = {
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    clubName: '  Test Club Name  ', // With leading/trailing spaces
                    clubState: 'NSW',
                    location: 'Sydney',
                    reactivateClub: 'true'
                },
                flash: jest.fn()
            };

            const mockRes = {
                redirect: jest.fn(),
                headersSent: false
            };

            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            const { sequelize } = require('../config/database');
            sequelize.transaction.mockResolvedValue(mockTransaction);

            Club.findAll.mockResolvedValue([]);
            User.findOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);
            Club.findOne.mockResolvedValue(deactivatedClub);
            User.create.mockResolvedValue({ 
                id: 3, 
                getFullName: jest.fn().mockReturnValue('John Doe') 
            });

            // Act
            await authController.registerUser(mockReq, mockRes);

            // Assert
            expect(Club.findOne).toHaveBeenCalledWith({ where: { clubName: 'Test Club Name' } });
            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
        });
    });
});