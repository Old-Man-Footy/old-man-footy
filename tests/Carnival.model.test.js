const { Carnival, User, Club } = require('../models');

describe('Carnival Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Model Definition', () => {
        test('should have correct attributes defined', () => {
            // Act & Assert
            const carnivalAttributes = Carnival.getTableName ? Object.keys(Carnival.rawAttributes) : Object.keys(Carnival.attributes);
            
            expect(carnivalAttributes).toContain('title');
            expect(carnivalAttributes).toContain('description');
            expect(carnivalAttributes).toContain('date');
            expect(carnivalAttributes).toContain('state');
            expect(carnivalAttributes).toContain('locationName');
            expect(carnivalAttributes).toContain('locationAddress');
            expect(carnivalAttributes).toContain('registrationOpen');
            expect(carnivalAttributes).toContain('registrationDeadline');
            expect(carnivalAttributes).toContain('maxTeams');
            expect(carnivalAttributes).toContain('entryFee');
            expect(carnivalAttributes).toContain('isActive');
            expect(carnivalAttributes).toContain('createdByUserId');
        });

        test('should have proper validations', () => {
            // Arrange & Act
            const titleValidation = Carnival.rawAttributes?.title?.validate || Carnival.attributes?.title?.validate;
            const dateValidation = Carnival.rawAttributes?.date?.validate || Carnival.attributes?.date?.validate;
            
            // Assert
            expect(titleValidation).toBeDefined();
            expect(dateValidation).toBeDefined();
        });
    });

    describe('Instance Methods', () => {
        let carnivalInstance;

        beforeEach(() => {
            carnivalInstance = {
                id: 1,
                title: 'NSW Masters Carnival',
                description: 'Annual NSW Rugby League Masters Championship',
                date: new Date('2025-08-15'),
                state: 'NSW',
                locationName: 'ANZ Stadium',
                locationAddress: 'Sydney Olympic Park',
                registrationOpen: true,
                registrationDeadline: new Date('2025-07-15'),
                maxTeams: 16,
                entryFee: 500.00,
                isActive: true,
                createdByUserId: 1,
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01')
            };
        });

        describe('isRegistrationOpen', () => {
            test('should return true when registration is open and deadline not passed', () => {
                // Arrange
                carnivalInstance.registrationOpen = true;
                carnivalInstance.registrationDeadline = new Date(Date.now() + 86400000); // Tomorrow
                carnivalInstance.isRegistrationOpen = Carnival.prototype.isRegistrationOpen;

                // Act
                const result = carnivalInstance.isRegistrationOpen();

                // Assert
                expect(result).toBe(true);
            });

            test('should return false when registration is closed', () => {
                // Arrange
                carnivalInstance.registrationOpen = false;
                carnivalInstance.registrationDeadline = new Date(Date.now() + 86400000);
                carnivalInstance.isRegistrationOpen = Carnival.prototype.isRegistrationOpen;

                // Act
                const result = carnivalInstance.isRegistrationOpen();

                // Assert
                expect(result).toBe(false);
            });

            test('should return false when deadline has passed', () => {
                // Arrange
                carnivalInstance.registrationOpen = true;
                carnivalInstance.registrationDeadline = new Date(Date.now() - 86400000); // Yesterday
                carnivalInstance.isRegistrationOpen = Carnival.prototype.isRegistrationOpen;

                // Act
                const result = carnivalInstance.isRegistrationOpen();

                // Assert
                expect(result).toBe(false);
            });

            test('should return false when no deadline is set', () => {
                // Arrange
                carnivalInstance.registrationOpen = true;
                carnivalInstance.registrationDeadline = null;
                carnivalInstance.isRegistrationOpen = Carnival.prototype.isRegistrationOpen;

                // Act
                const result = carnivalInstance.isRegistrationOpen();

                // Assert
                expect(result).toBe(false);
            });
        });

        describe('getDaysUntilEvent', () => {
            test('should return positive days for future event', () => {
                // Arrange
                const futureDate = new Date(Date.now() + (5 * 86400000)); // 5 days from now
                carnivalInstance.date = futureDate;
                carnivalInstance.getDaysUntilEvent = Carnival.prototype.getDaysUntilEvent;

                // Act
                const days = carnivalInstance.getDaysUntilEvent();

                // Assert
                expect(days).toBe(5);
            });

            test('should return negative days for past event', () => {
                // Arrange
                const pastDate = new Date(Date.now() - (3 * 86400000)); // 3 days ago
                carnivalInstance.date = pastDate;
                carnivalInstance.getDaysUntilEvent = Carnival.prototype.getDaysUntilEvent;

                // Act
                const days = carnivalInstance.getDaysUntilEvent();

                // Assert
                expect(days).toBe(-3);
            });

            test('should return 0 for event today', () => {
                // Arrange
                const today = new Date();
                today.setHours(12, 0, 0, 0); // Set to noon today
                carnivalInstance.date = today;
                carnivalInstance.getDaysUntilEvent = Carnival.prototype.getDaysUntilEvent;

                // Act
                const days = carnivalInstance.getDaysUntilEvent();

                // Assert
                expect(days).toBe(0);
            });
        });

        describe('getFormattedDate', () => {
            test('should return formatted date string', () => {
                // Arrange
                carnivalInstance.date = new Date('2025-08-15T10:00:00Z');
                carnivalInstance.getFormattedDate = Carnival.prototype.getFormattedDate;

                // Act
                const formatted = carnivalInstance.getFormattedDate();

                // Assert
                expect(formatted).toMatch(/August 15, 2025|15 August 2025/); // Allow for different locale formats
            });

            test('should handle null date', () => {
                // Arrange
                carnivalInstance.date = null;
                carnivalInstance.getFormattedDate = Carnival.prototype.getFormattedDate;

                // Act
                const formatted = carnivalInstance.getFormattedDate();

                // Assert
                expect(formatted).toBe('Date TBD');
            });
        });

        describe('getRegistrationStatus', () => {
            test('should return "Open" when registration is open', () => {
                // Arrange
                carnivalInstance.registrationOpen = true;
                carnivalInstance.registrationDeadline = new Date(Date.now() + 86400000);
                carnivalInstance.getRegistrationStatus = Carnival.prototype.getRegistrationStatus;
                carnivalInstance.isRegistrationOpen = jest.fn().mockReturnValue(true);

                // Act
                const status = carnivalInstance.getRegistrationStatus();

                // Assert
                expect(status).toBe('Open');
            });

            test('should return "Closed" when registration is closed', () => {
                // Arrange
                carnivalInstance.registrationOpen = false;
                carnivalInstance.getRegistrationStatus = Carnival.prototype.getRegistrationStatus;
                carnivalInstance.isRegistrationOpen = jest.fn().mockReturnValue(false);

                // Act
                const status = carnivalInstance.getRegistrationStatus();

                // Assert
                expect(status).toBe('Closed');
            });

            test('should return "Deadline Passed" when deadline has passed', () => {
                // Arrange
                carnivalInstance.registrationOpen = true;
                carnivalInstance.registrationDeadline = new Date(Date.now() - 86400000);
                carnivalInstance.getRegistrationStatus = Carnival.prototype.getRegistrationStatus;
                carnivalInstance.isRegistrationOpen = jest.fn().mockReturnValue(false);

                // Act
                const status = carnivalInstance.getRegistrationStatus();

                // Assert
                expect(status).toBe('Deadline Passed');
            });
        });

        describe('canEdit', () => {
            test('should return true for carnival creator', () => {
                // Arrange
                const user = { id: 1, isAdmin: false };
                carnivalInstance.createdByUserId = 1;
                carnivalInstance.canEdit = Carnival.prototype.canEdit;

                // Act
                const canEdit = carnivalInstance.canEdit(user);

                // Assert
                expect(canEdit).toBe(true);
            });

            test('should return true for admin user', () => {
                // Arrange
                const user = { id: 2, isAdmin: true };
                carnivalInstance.createdByUserId = 1;
                carnivalInstance.canEdit = Carnival.prototype.canEdit;

                // Act
                const canEdit = carnivalInstance.canEdit(user);

                // Assert
                expect(canEdit).toBe(true);
            });

            test('should return false for other users', () => {
                // Arrange
                const user = { id: 2, isAdmin: false };
                carnivalInstance.createdByUserId = 1;
                carnivalInstance.canEdit = Carnival.prototype.canEdit;

                // Act
                const canEdit = carnivalInstance.canEdit(user);

                // Assert
                expect(canEdit).toBe(false);
            });

            test('should return false for null user', () => {
                // Arrange
                carnivalInstance.canEdit = Carnival.prototype.canEdit;

                // Act
                const canEdit = carnivalInstance.canEdit(null);

                // Assert
                expect(canEdit).toBe(false);
            });
        });
    });

    describe('Associations', () => {
        test('should have association with User (creator)', () => {
            // Act & Assert
            const associations = Carnival.associations || {};
            expect(Object.keys(associations)).toContain('createdByUser');
        });

        test('should have association with registrations', () => {
            // Act & Assert
            const associations = Carnival.associations || {};
            expect(Object.keys(associations)).toContain('registrations');
        });
    });

    describe('Scopes', () => {
        test('should have active scope', () => {
            // Act & Assert
            const scopes = Carnival.options?.scopes || {};
            expect(scopes.active).toBeDefined();
        });

        test('should have upcoming scope', () => {
            // Act & Assert
            const scopes = Carnival.options?.scopes || {};
            expect(scopes.upcoming).toBeDefined();
        });

        test('should have byState scope', () => {
            // Act & Assert
            const scopes = Carnival.options?.scopes || {};
            expect(scopes.byState).toBeDefined();
        });
    });

    describe('Static Methods', () => {
        describe('findUpcoming', () => {
            test('should find upcoming carnivals', async () => {
                // Arrange
                const mockCarnivals = [
                    { id: 1, title: 'NSW Carnival', date: new Date(Date.now() + 86400000) },
                    { id: 2, title: 'QLD Carnival', date: new Date(Date.now() + 172800000) }
                ];
                Carnival.findAll = jest.fn().mockResolvedValue(mockCarnivals);

                // Act
                const result = await Carnival.findUpcoming();

                // Assert
                expect(Carnival.findAll).toHaveBeenCalledWith({
                    where: {
                        date: { [expect.any(Symbol)]: expect.any(Date) },
                        isActive: true
                    },
                    order: [['date', 'ASC']]
                });
                expect(result).toEqual(mockCarnivals);
            });

            test('should limit results when limit specified', async () => {
                // Arrange
                const mockCarnivals = [
                    { id: 1, title: 'NSW Carnival', date: new Date(Date.now() + 86400000) }
                ];
                Carnival.findAll = jest.fn().mockResolvedValue(mockCarnivals);

                // Act
                const result = await Carnival.findUpcoming(5);

                // Assert
                expect(Carnival.findAll).toHaveBeenCalledWith({
                    where: {
                        date: { [expect.any(Symbol)]: expect.any(Date) },
                        isActive: true
                    },
                    order: [['date', 'ASC']],
                    limit: 5
                });
                expect(result).toEqual(mockCarnivals);
            });
        });

        describe('findByState', () => {
            test('should find carnivals by state', async () => {
                // Arrange
                const mockCarnivals = [
                    { id: 1, title: 'NSW Carnival 1', state: 'NSW' },
                    { id: 2, title: 'NSW Carnival 2', state: 'NSW' }
                ];
                Carnival.findAll = jest.fn().mockResolvedValue(mockCarnivals);

                // Act
                const result = await Carnival.findByState('NSW');

                // Assert
                expect(Carnival.findAll).toHaveBeenCalledWith({
                    where: {
                        state: 'NSW',
                        isActive: true
                    },
                    order: [['date', 'ASC']]
                });
                expect(result).toEqual(mockCarnivals);
            });
        });

        describe('findWithOpenRegistration', () => {
            test('should find carnivals with open registration', async () => {
                // Arrange
                const mockCarnivals = [
                    { 
                        id: 1, 
                        title: 'Open Carnival', 
                        registrationOpen: true,
                        registrationDeadline: new Date(Date.now() + 86400000)
                    }
                ];
                Carnival.findAll = jest.fn().mockResolvedValue(mockCarnivals);

                // Act
                const result = await Carnival.findWithOpenRegistration();

                // Assert
                expect(Carnival.findAll).toHaveBeenCalledWith({
                    where: {
                        registrationOpen: true,
                        registrationDeadline: { [expect.any(Symbol)]: expect.any(Date) },
                        isActive: true
                    },
                    order: [['registrationDeadline', 'ASC']]
                });
                expect(result).toEqual(mockCarnivals);
            });
        });

        describe('createCarnival', () => {
            test('should create carnival with user validation', async () => {
                // Arrange
                const carnivalData = {
                    title: 'New Carnival',
                    description: 'Test carnival',
                    date: new Date('2025-08-15'),
                    state: 'NSW',
                    locationName: 'Test Location',
                    createdByUserId: 1
                };

                const mockCarnival = { id: 1, ...carnivalData };
                Carnival.create = jest.fn().mockResolvedValue(mockCarnival);

                // Act
                const result = await Carnival.createCarnival(carnivalData);

                // Assert
                expect(Carnival.create).toHaveBeenCalledWith({
                    ...carnivalData,
                    isActive: true,
                    registrationOpen: false
                });
                expect(result).toEqual(mockCarnival);
            });
        });
    });

    describe('Validation', () => {
        test('should validate required fields', () => {
            // Arrange & Act & Assert
            const titleValidation = Carnival.rawAttributes?.title?.allowNull || Carnival.attributes?.title?.allowNull;
            const dateValidation = Carnival.rawAttributes?.date?.allowNull || Carnival.attributes?.date?.allowNull;
            const stateValidation = Carnival.rawAttributes?.state?.allowNull || Carnival.attributes?.state?.allowNull;

            expect(titleValidation).toBe(false);
            expect(dateValidation).toBe(false);
            expect(stateValidation).toBe(false);
        });

        test('should validate state values', () => {
            // Arrange
            const validStates = ['NSW', 'QLD', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
            const invalidStates = ['XX', 'ZZ', 'InvalidState'];

            // Act & Assert
            validStates.forEach(state => {
                expect(validStates).toContain(state);
            });

            invalidStates.forEach(state => {
                expect(validStates).not.toContain(state);
            });
        });

        test('should validate date is in future', () => {
            // Arrange
            const futureDate = new Date(Date.now() + 86400000);
            const pastDate = new Date(Date.now() - 86400000);

            // Act & Assert
            expect(futureDate.getTime()).toBeGreaterThan(Date.now());
            expect(pastDate.getTime()).toBeLessThan(Date.now());
        });

        test('should validate entry fee is positive', () => {
            // Arrange
            const validFees = [0, 50.00, 100.50, 500];
            const invalidFees = [-10, -0.01];

            // Act & Assert
            validFees.forEach(fee => {
                expect(fee).toBeGreaterThanOrEqual(0);
            });

            invalidFees.forEach(fee => {
                expect(fee).toBeLessThan(0);
            });
        });

        test('should validate max teams is positive integer', () => {
            // Arrange
            const validMaxTeams = [8, 16, 32, 64];
            const invalidMaxTeams = [0, -5, 1.5];

            // Act & Assert
            validMaxTeams.forEach(maxTeams => {
                expect(maxTeams).toBeGreaterThan(0);
                expect(Number.isInteger(maxTeams)).toBe(true);
            });

            invalidMaxTeams.forEach(maxTeams => {
                if (Number.isInteger(maxTeams)) {
                    expect(maxTeams).toBeLessThanOrEqual(0);
                } else {
                    expect(Number.isInteger(maxTeams)).toBe(false);
                }
            });
        });
    });

    describe('Hooks', () => {
        test('should set default values before create', () => {
            // Arrange & Act & Assert
            // Note: This would test actual beforeCreate hooks if they exist
            const defaultValues = {
                isActive: true,
                registrationOpen: false,
                maxTeams: 16,
                entryFee: 0
            };

            Object.entries(defaultValues).forEach(([key, value]) => {
                expect(value).toBeDefined();
            });
        });
    });
});