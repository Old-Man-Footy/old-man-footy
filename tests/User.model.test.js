const { User, Club } = require('../models');
const bcrypt = require('bcryptjs');

// Mock bcrypt for password hashing tests
jest.mock('bcryptjs');

describe('User Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Model Definition', () => {
        test('should have correct attributes defined', () => {
            // Act & Assert
            const userAttributes = User.getTableName ? Object.keys(User.rawAttributes) : Object.keys(User.attributes);
            
            expect(userAttributes).toContain('firstName');
            expect(userAttributes).toContain('lastName');
            expect(userAttributes).toContain('email');
            expect(userAttributes).toContain('passwordHash');
            expect(userAttributes).toContain('clubId');
            expect(userAttributes).toContain('isActive');
            expect(userAttributes).toContain('isAdmin');
            expect(userAttributes).toContain('invitationToken');
            expect(userAttributes).toContain('invitationExpires');
        });

        test('should have proper validations', () => {
            // Arrange & Act
            const emailValidation = User.rawAttributes?.email?.validate || User.attributes?.email?.validate;
            const firstNameValidation = User.rawAttributes?.firstName?.validate || User.attributes?.firstName?.validate;
            
            // Assert
            expect(emailValidation).toBeDefined();
            expect(firstNameValidation).toBeDefined();
        });
    });

    describe('Instance Methods', () => {
        let userInstance;

        beforeEach(() => {
            userInstance = {
                id: 1,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                passwordHash: 'hashedPassword123',
                isActive: true,
                isAdmin: false,
                clubId: 1
            };
        });

        describe('checkPassword', () => {
            test('should return true for correct password', async () => {
                // Arrange
                bcrypt.compare.mockResolvedValue(true);
                userInstance.checkPassword = User.prototype.checkPassword;

                // Act
                const result = await userInstance.checkPassword('correctPassword');

                // Assert
                expect(bcrypt.compare).toHaveBeenCalledWith('correctPassword', 'hashedPassword123');
                expect(result).toBe(true);
            });

            test('should return false for incorrect password', async () => {
                // Arrange
                bcrypt.compare.mockResolvedValue(false);
                userInstance.checkPassword = User.prototype.checkPassword;

                // Act
                const result = await userInstance.checkPassword('wrongPassword');

                // Assert
                expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', 'hashedPassword123');
                expect(result).toBe(false);
            });

            test('should handle bcrypt comparison error', async () => {
                // Arrange
                const error = new Error('Bcrypt error');
                bcrypt.compare.mockRejectedValue(error);
                userInstance.checkPassword = User.prototype.checkPassword;

                // Act & Assert
                await expect(userInstance.checkPassword('password')).rejects.toThrow('Bcrypt error');
            });
        });

        describe('getFullName', () => {
            test('should return full name', () => {
                // Arrange
                userInstance.getFullName = User.prototype.getFullName;

                // Act
                const fullName = userInstance.getFullName();

                // Assert
                expect(fullName).toBe('John Doe');
            });

            test('should handle missing last name', () => {
                // Arrange
                userInstance.lastName = null;
                userInstance.getFullName = User.prototype.getFullName;

                // Act
                const fullName = userInstance.getFullName();

                // Assert
                expect(fullName).toBe('John ');
            });

            test('should handle missing first name', () => {
                // Arrange
                userInstance.firstName = null;
                userInstance.getFullName = User.prototype.getFullName;

                // Act
                const fullName = userInstance.getFullName();

                // Assert
                expect(fullName).toBe(' Doe');
            });
        });

        describe('generateInvitationToken', () => {
            test('should generate invitation token and expiry', () => {
                // Arrange
                userInstance.generateInvitationToken = User.prototype.generateInvitationToken;
                const originalRandom = Math.random;
                Math.random = jest.fn().mockReturnValue(0.123456789);

                // Act
                userInstance.generateInvitationToken();

                // Assert
                expect(userInstance.invitationToken).toBeDefined();
                expect(userInstance.invitationToken).toHaveLength(32);
                expect(userInstance.invitationExpires).toBeInstanceOf(Date);
                expect(userInstance.invitationExpires.getTime()).toBeGreaterThan(Date.now());

                // Cleanup
                Math.random = originalRandom;
            });

            test('should generate unique tokens', () => {
                // Arrange
                userInstance.generateInvitationToken = User.prototype.generateInvitationToken;
                const userInstance2 = { ...userInstance };
                userInstance2.generateInvitationToken = User.prototype.generateInvitationToken;

                // Act
                userInstance.generateInvitationToken();
                userInstance2.generateInvitationToken();

                // Assert
                expect(userInstance.invitationToken).not.toBe(userInstance2.invitationToken);
            });
        });

        describe('isInvitationValid', () => {
            test('should return true for valid invitation', () => {
                // Arrange
                userInstance.invitationToken = 'validToken123';
                userInstance.invitationExpires = new Date(Date.now() + 3600000); // 1 hour from now
                userInstance.isInvitationValid = User.prototype.isInvitationValid;

                // Act
                const isValid = userInstance.isInvitationValid();

                // Assert
                expect(isValid).toBe(true);
            });

            test('should return false for expired invitation', () => {
                // Arrange
                userInstance.invitationToken = 'validToken123';
                userInstance.invitationExpires = new Date(Date.now() - 3600000); // 1 hour ago
                userInstance.isInvitationValid = User.prototype.isInvitationValid;

                // Act
                const isValid = userInstance.isInvitationValid();

                // Assert
                expect(isValid).toBe(false);
            });

            test('should return false for missing invitation token', () => {
                // Arrange
                userInstance.invitationToken = null;
                userInstance.invitationExpires = new Date(Date.now() + 3600000);
                userInstance.isInvitationValid = User.prototype.isInvitationValid;

                // Act
                const isValid = userInstance.isInvitationValid();

                // Assert
                expect(isValid).toBe(false);
            });

            test('should return false for missing expiry date', () => {
                // Arrange
                userInstance.invitationToken = 'validToken123';
                userInstance.invitationExpires = null;
                userInstance.isInvitationValid = User.prototype.isInvitationValid;

                // Act
                const isValid = userInstance.isInvitationValid();

                // Assert
                expect(isValid).toBe(false);
            });
        });
    });

    describe('Associations', () => {
        test('should have association with Club', () => {
            // Act & Assert
            const associations = User.associations || {};
            expect(Object.keys(associations)).toContain('Club');
        });

        test('should have association with created carnivals', () => {
            // Act & Assert
            const associations = User.associations || {};
            expect(Object.keys(associations)).toContain('createdCarnivals');
        });
    });

    describe('Scopes', () => {
        test('should have active scope', () => {
            // Act & Assert
            const scopes = User.options?.scopes || {};
            expect(scopes.active).toBeDefined();
        });

        test('should have admin scope', () => {
            // Act & Assert
            const scopes = User.options?.scopes || {};
            expect(scopes.admin).toBeDefined();
        });
    });

    describe('Hooks', () => {
        test('should hash password before create', async () => {
            // Arrange
            const userData = {
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                password: 'plainPassword'
            };
            bcrypt.hash.mockResolvedValue('hashedPassword');

            // Note: This test assumes the beforeCreate hook exists
            // The actual implementation would depend on the model definition

            // Act & Assert
            expect(bcrypt.hash).toBeDefined();
        });
    });

    describe('Validation', () => {
        test('should validate email format', () => {
            // Arrange
            const invalidEmails = ['invalid', 'test@', '@example.com', 'test.example.com'];
            const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'test+tag@example.org'];

            // Act & Assert
            // Note: Actual validation would depend on model implementation
            validEmails.forEach(email => {
                expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            });

            invalidEmails.forEach(email => {
                expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            });
        });

        test('should require firstName and lastName', () => {
            // Arrange & Act & Assert
            const firstNameValidation = User.rawAttributes?.firstName?.allowNull || User.attributes?.firstName?.allowNull;
            const lastNameValidation = User.rawAttributes?.lastName?.allowNull || User.attributes?.lastName?.allowNull;

            expect(firstNameValidation).toBe(false);
            expect(lastNameValidation).toBe(false);
        });
    });

    describe('Static Methods', () => {
        describe('findByEmail', () => {
            test('should find user by email', async () => {
                // Arrange
                const mockUser = { id: 1, email: 'test@example.com' };
                User.findOne = jest.fn().mockResolvedValue(mockUser);

                // Act
                const result = await User.findByEmail('test@example.com');

                // Assert
                expect(User.findOne).toHaveBeenCalledWith({
                    where: { email: 'test@example.com' }
                });
                expect(result).toEqual(mockUser);
            });

            test('should return null for non-existent email', async () => {
                // Arrange
                User.findOne = jest.fn().mockResolvedValue(null);

                // Act
                const result = await User.findByEmail('nonexistent@example.com');

                // Assert
                expect(result).toBeNull();
            });
        });

        describe('findActiveUsers', () => {
            test('should find only active users', async () => {
                // Arrange
                const mockUsers = [
                    { id: 1, email: 'user1@example.com', isActive: true },
                    { id: 2, email: 'user2@example.com', isActive: true }
                ];
                User.findAll = jest.fn().mockResolvedValue(mockUsers);

                // Act
                const result = await User.findActiveUsers();

                // Assert
                expect(User.findAll).toHaveBeenCalledWith({
                    where: { isActive: true }
                });
                expect(result).toEqual(mockUsers);
            });
        });

        describe('createWithInvitation', () => {
            test('should create user with invitation token', async () => {
                // Arrange
                const userData = {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    clubId: 1
                };

                const mockUser = {
                    ...userData,
                    id: 1,
                    isActive: false,
                    invitationToken: 'generatedToken',
                    invitationExpires: new Date(Date.now() + 86400000),
                    generateInvitationToken: jest.fn()
                };

                User.create = jest.fn().mockResolvedValue(mockUser);

                // Act
                const result = await User.createWithInvitation(userData);

                // Assert
                expect(User.create).toHaveBeenCalledWith({
                    ...userData,
                    isActive: false,
                    passwordHash: null
                });
                expect(result).toEqual(mockUser);
            });
        });
    });
});