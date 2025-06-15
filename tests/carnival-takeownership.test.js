/**
 * Unit Tests for Carnival takeOwnership functionality
 * Tests the business logic for claiming MySideline carnival ownership
 * Following TDD principles with proper mocking of database dependencies
 */

const { Carnival, User, Club } = require('../models');

// Mock all model dependencies
jest.mock('../models', () => ({
    Carnival: {
        findByPk: jest.fn(),
        takeOwnership: jest.fn()
    },
    User: {
        findByPk: jest.fn()
    },
    Club: {
        findByPk: jest.fn()
    }
}));

describe('Carnival.takeOwnership', () => {
    let mockCarnival, mockUser, mockClub;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup mock data
        mockClub = {
            id: 1,
            clubName: 'Test Rugby Club',
            isActive: true
        };

        mockUser = {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@test.com',
            clubId: 1,
            club: mockClub
        };

        mockCarnival = {
            id: 1,
            title: 'Test MySideline Carnival',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isActive: true,
            isManuallyEntered: false,
            lastMySidelineSync: new Date(),
            createdByUserId: null,
            update: jest.fn().mockResolvedValue(true),
            reload: jest.fn().mockResolvedValue(true)
        };

        // Import the actual implementation after mocking
        const CarnivalModel = require('../models/Carnival');
        Carnival.takeOwnership = CarnivalModel.takeOwnership;
    });

    describe('Successful ownership claim', () => {
        test('should successfully claim ownership of valid MySideline carnival', async () => {
            // Arrange
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            User.findByPk.mockResolvedValue(mockUser);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(result.success).toBe(true);
            expect(result.message).toContain('successfully claimed ownership');
            expect(result.carnival).toBeDefined();
            expect(result.claimedBy.userId).toBe(mockUser.id);
            expect(result.claimedBy.clubName).toBe(mockClub.clubName);
            expect(mockCarnival.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    createdByUserId: mockUser.id,
                    claimedAt: expect.any(Date)
                })
            );
        });
    });

    describe('Input validation', () => {
        test('should reject missing carnival ID', async () => {
            // Act
            const result = await Carnival.takeOwnership(null, mockUser.id);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Carnival ID and User ID are required');
            expect(Carnival.findByPk).not.toHaveBeenCalled();
        });

        test('should reject missing user ID', async () => {
            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, null);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Carnival ID and User ID are required');
            expect(Carnival.findByPk).not.toHaveBeenCalled();
        });

        test('should reject non-existent carnival', async () => {
            // Arrange
            Carnival.findByPk.mockResolvedValue(null);

            // Act
            const result = await Carnival.takeOwnership(99999, mockUser.id);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Carnival not found');
            expect(Carnival.findByPk).toHaveBeenCalledWith(99999);
        });

        test('should reject non-existent user', async () => {
            // Arrange
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            User.findByPk.mockResolvedValue(null);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, 99999);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('User not found');
            expect(User.findByPk).toHaveBeenCalledWith(99999, expect.any(Object));
        });
    });

    describe('Authorization checks', () => {
        test('should reject user without club association', async () => {
            // Arrange
            const userWithoutClub = { ...mockUser, clubId: null };
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            User.findByPk.mockResolvedValue(userWithoutClub);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, userWithoutClub.id);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('You must be associated with a club to claim carnival ownership');
        });

        test('should reject user with inactive club', async () => {
            // Arrange
            const userWithInactiveClub = {
                ...mockUser,
                club: { ...mockClub, isActive: false }
            };
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            User.findByPk.mockResolvedValue(userWithInactiveClub);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Your club must be active to claim carnival ownership');
        });
    });

    describe('Business rule validation', () => {
        test('should reject inactive carnival', async () => {
            // Arrange
            const inactiveCarnival = { ...mockCarnival, isActive: false };
            Carnival.findByPk.mockResolvedValue(inactiveCarnival);
            User.findByPk.mockResolvedValue(mockUser);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Cannot claim ownership of inactive carnivals');
        });

        test('should reject manually entered carnival', async () => {
            // Arrange
            const manualCarnival = { ...mockCarnival, isManuallyEntered: true };
            Carnival.findByPk.mockResolvedValue(manualCarnival);
            User.findByPk.mockResolvedValue(mockUser);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Can only claim ownership of MySideline imported events');
        });

        test('should reject carnival without MySideline sync', async () => {
            // Arrange
            const noSyncCarnival = { ...mockCarnival, lastMySidelineSync: null };
            Carnival.findByPk.mockResolvedValue(noSyncCarnival);
            User.findByPk.mockResolvedValue(mockUser);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('This carnival was not imported from MySideline');
        });

        test('should reject already claimed carnival', async () => {
            // Arrange
            const claimedCarnival = { ...mockCarnival, createdByUserId: 999 };
            Carnival.findByPk.mockResolvedValue(claimedCarnival);
            User.findByPk.mockResolvedValue(mockUser);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('This carnival already has an owner');
        });
    });

    describe('Edge cases', () => {
        test('should allow claiming carnival from any time in the past', async () => {
            // Arrange
            const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
            const pastCarnival = { ...mockCarnival, date: pastDate };
            Carnival.findByPk.mockResolvedValue(pastCarnival);
            User.findByPk.mockResolvedValue(mockUser);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(result.success).toBe(true);
            expect(result.message).toContain('successfully claimed ownership');
        });

        test('should allow claiming carnival in the future', async () => {
            // Arrange
            const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const futureCarnival = { ...mockCarnival, date: futureDate };
            Carnival.findByPk.mockResolvedValue(futureCarnival);
            User.findByPk.mockResolvedValue(mockUser);

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(result.success).toBe(true);
            expect(result.message).toContain('successfully claimed ownership');
        });

        test('should handle database errors gracefully', async () => {
            // Arrange
            Carnival.findByPk.mockRejectedValue(new Error('Database connection failed'));

            // Act
            const result = await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('error');
        });
    });

    describe('Data integrity', () => {
        test('should call update with correct parameters', async () => {
            // Arrange
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            User.findByPk.mockResolvedValue(mockUser);

            // Act
            await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(mockCarnival.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    createdByUserId: mockUser.id,
                    claimedAt: expect.any(Date),
                    updatedAt: expect.any(Date)
                })
            );
        });

        test('should include user lookup with club relationship', async () => {
            // Arrange
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            User.findByPk.mockResolvedValue(mockUser);

            // Act
            await Carnival.takeOwnership(mockCarnival.id, mockUser.id);

            // Assert
            expect(User.findByPk).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    include: expect.arrayContaining([
                        expect.objectContaining({
                            model: expect.anything(),
                            as: 'club'
                        })
                    ])
                })
            );
        });
    });
});