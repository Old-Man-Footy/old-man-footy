const MySidelineDataService = require('../services/mySidelineDataService');
const { Carnival } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

// Mock dependencies
jest.mock('../models', () => ({
    Carnival: {
        findOne: jest.fn(),
        create: jest.fn()
    }
}));

jest.mock('sequelize', () => ({
    Op: {
        ne: jest.fn()
    }
}));

jest.mock('../services/emailService', () => ({}));

describe('MySidelineDataService', () => {
    let service;
    let mockCarnival;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Create fresh service instance
        service = new MySidelineDataService();
        
        // Mock carnival data
        mockCarnival = {
            id: 1,
            title: 'Test Carnival',
            date: new Date('2025-07-15'),
            locationAddress: 'Test Location',
            state: 'NSW',
            mySidelineEventId: 'test-event-123',
            isActive: true,
            createdAt: new Date('2025-06-01'),
            updatedAt: new Date('2025-06-01'),
            update: jest.fn().mockResolvedValue(true)
        };
        
        // Reset console methods to avoid test output noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console methods
        console.log.mockRestore();
        console.error.mockRestore();
    });

    describe('constructor', () => {
        it('should initialize with Australian states', () => {
            // Arrange & Act
            const newService = new MySidelineDataService();
            
            // Assert
            expect(newService.australianStates).toEqual(['NSW', 'QLD', 'VIC', 'SA', 'WA', 'NT', 'ACT', 'TAS']);
            expect(newService.australianStates).toHaveLength(8);
        });
    });

    describe('processScrapedEvents', () => {
        it('should process new events and create them in database', async () => {
            // Arrange
            const scrapedEvents = [
                {
                    title: 'New Test Event',
                    date: new Date('2025-08-01'),
                    locationAddress: 'New Location',
                    scheduleDetails: 'Test schedule',
                    state: 'QLD',
                    mySidelineEventId: 'new-event-456'
                }
            ];
            
            Carnival.findOne.mockResolvedValue(null); // Event doesn't exist
            Carnival.create.mockResolvedValue({ ...scrapedEvents[0], id: 2 });
            
            // Act
            const result = await service.processScrapedEvents(scrapedEvents);
            
            // Assert
            expect(Carnival.findOne).toHaveBeenCalledWith({
                where: { mySidelineEventId: 'new-event-456' }
            });
            expect(Carnival.create).toHaveBeenCalledWith({
                ...scrapedEvents[0],
                isManuallyEntered: false,
                isActive: true,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            });
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject(scrapedEvents[0]);
        });

        it('should update existing events instead of creating duplicates', async () => {
            // Arrange
            const scrapedEvents = [
                {
                    title: 'Updated Test Event',
                    date: new Date('2025-08-01'),
                    locationAddress: 'Updated Location',
                    scheduleDetails: 'Updated schedule',
                    state: 'VIC',
                    mySidelineEventId: 'existing-event-789'
                }
            ];
            
            Carnival.findOne.mockResolvedValue(mockCarnival);
            
            // Act
            const result = await service.processScrapedEvents(scrapedEvents);
            
            // Assert
            expect(Carnival.findOne).toHaveBeenCalledWith({
                where: { mySidelineEventId: 'existing-event-789' }
            });
            expect(mockCarnival.update).toHaveBeenCalledWith({
                title: 'Updated Test Event',
                date: new Date('2025-08-01'),
                locationAddress: 'Updated Location',
                scheduleDetails: 'Updated schedule',
                state: 'VIC',
                updatedAt: expect.any(Date)
            });
            expect(Carnival.create).not.toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });

        it('should handle empty events array', async () => {
            // Arrange
            const scrapedEvents = [];
            
            // Act
            const result = await service.processScrapedEvents(scrapedEvents);
            
            // Assert
            expect(result).toEqual([]);
            expect(Carnival.findOne).not.toHaveBeenCalled();
            expect(Carnival.create).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            // Arrange
            const scrapedEvents = [
                {
                    title: 'Error Event',
                    mySidelineEventId: 'error-event-123'
                }
            ];
            
            Carnival.findOne.mockRejectedValue(new Error('Database connection failed'));
            
            // Act
            const result = await service.processScrapedEvents(scrapedEvents);
            
            // Assert
            expect(result).toEqual([]);
            expect(console.error).toHaveBeenCalledWith(
                'Failed to process event "Error Event":',
                'Database connection failed'
            );
        });

        it('should continue processing remaining events after individual failures', async () => {
            // Arrange
            const scrapedEvents = [
                {
                    title: 'Failing Event',
                    mySidelineEventId: 'fail-event'
                },
                {
                    title: 'Success Event',
                    mySidelineEventId: 'success-event'
                }
            ];
            
            Carnival.findOne
                .mockRejectedValueOnce(new Error('First event fails'))
                .mockResolvedValueOnce(null);
            Carnival.create.mockResolvedValue({ ...scrapedEvents[1], id: 3 });
            
            // Act
            const result = await service.processScrapedEvents(scrapedEvents);
            
            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject(scrapedEvents[1]);
            expect(console.error).toHaveBeenCalledWith(
                'Failed to process event "Failing Event":',
                'First event fails'
            );
        });
    });

    describe('shouldRunInitialSync', () => {
        it('should return true when no previous sync exists', async () => {
            // Arrange
            Carnival.findOne.mockResolvedValue(null);
            
            // Act
            const result = await service.shouldRunInitialSync();
            
            // Assert
            expect(result).toBe(true);
            expect(Carnival.findOne).toHaveBeenCalledWith({
                where: { mySidelineEventId: { [Op.ne]: null } },
                order: [['createdAt', 'DESC']]
            });
        });

        it('should return true when last sync is older than 24 hours in production', async () => {
            // Arrange
            process.env.NODE_ENV = 'production';
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 2); // 2 days ago
            
            Carnival.findOne.mockResolvedValue({
                ...mockCarnival,
                createdAt: oldDate
            });
            
            // Act
            const result = await service.shouldRunInitialSync();
            
            // Assert
            expect(result).toBe(true);
        });

        it('should return false when recent sync exists in production', async () => {
            // Arrange
            process.env.NODE_ENV = 'production';
            const recentDate = new Date();
            recentDate.setHours(recentDate.getHours() - 12); // 12 hours ago
            
            Carnival.findOne.mockResolvedValue({
                ...mockCarnival,
                createdAt: recentDate
            });
            
            // Act
            const result = await service.shouldRunInitialSync();
            
            // Assert
            expect(result).toBe(false);
        });

        it('should return true in development mode regardless of recent sync', async () => {
            // Arrange
            process.env.NODE_ENV = 'development';
            const recentDate = new Date();
            recentDate.setMinutes(recentDate.getMinutes() - 30); // 30 minutes ago
            
            Carnival.findOne.mockResolvedValue({
                ...mockCarnival,
                createdAt: recentDate
            });
            
            // Act
            const result = await service.shouldRunInitialSync();
            
            // Assert
            expect(result).toBe(true);
        });

        it('should handle database errors and return false', async () => {
            // Arrange
            Carnival.findOne.mockRejectedValue(new Error('Database error'));
            
            // Act
            const result = await service.shouldRunInitialSync();
            
            // Assert
            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith(
                'Failed to check for initial sync:',
                'Database error'
            );
        });
    });

    describe('extractLocationFromMySidelineText', () => {
        it('should extract location with "at" keyword', () => {
            // Arrange
            const text = 'Tournament held at Leichhardt Oval, Sydney';
            
            // Act
            const result = service.extractLocationFromMySidelineText(text);
            
            // Assert
            expect(result).toBe('Leichhardt Oval');
        });

        it('should extract location with "venue:" keyword', () => {
            // Arrange
            const text = 'Venue: ANZ Stadium, Olympic Park';
            
            // Act
            const result = service.extractLocationFromMySidelineText(text);
            
            // Assert
            expect(result).toBe('ANZ Stadium');
        });

        it('should extract location with "location:" keyword', () => {
            // Arrange
            const text = 'Location: Suncorp Stadium';
            
            // Act
            const result = service.extractLocationFromMySidelineText(text);
            
            // Assert
            expect(result).toBe('Suncorp Stadium');
        });

        it('should extract location with "held at" keyword', () => {
            // Arrange
            const text = 'Event will be held at Marvel Stadium';
            
            // Act
            const result = service.extractLocationFromMySidelineText(text);
            
            // Assert
            expect(result).toBe('Marvel Stadium');
        });

        it('should extract location based on venue keywords in text', () => {
            // Arrange
            const text = 'Come to Jubilee Oval for the big game';
            
            // Act
            const result = service.extractLocationFromMySidelineText(text);
            
            // Assert
            expect(result).toBe('Come to Jubilee Oval');
        });

        it('should return default message for empty text', () => {
            // Arrange
            const text = '';
            
            // Act
            const result = service.extractLocationFromMySidelineText(text);
            
            // Assert
            expect(result).toBe('TBA - Check MySideline for details');
        });

        it('should return default message for null text', () => {
            // Arrange
            const text = null;
            
            // Act
            const result = service.extractLocationFromMySidelineText(text);
            
            // Assert
            expect(result).toBe('TBA - Check MySideline for details');
        });

        it('should return default message when no venue patterns match', () => {
            // Arrange
            const text = 'This is just some random text without sports facilities';
            
            // Act
            const result = service.extractLocationFromMySidelineText(text);
            
            // Assert
            expect(result).toBe('TBA - Check MySideline for details');
        });

        it('should reject matches that are too short (less than 5 characters)', () => {
            // Arrange
            const text = 'at Pub'; // "Pub" is only 3 characters, too short
            
            // Act
            const result = service.extractLocationFromMySidelineText(text);
            
            // Assert
            expect(result).toBe('TBA - Check MySideline for details');
        });
    });

    describe('extractStateFromMySidelineText', () => {
        it('should extract NSW from full text', () => {
            // Arrange
            const fullText = 'Tournament in NSW region';
            const subtitle = 'Sydney event';
            
            // Act
            const result = service.extractStateFromMySidelineText(fullText, subtitle);
            
            // Assert
            expect(result).toBe('NSW');
        });

        it('should extract QLD from subtitle', () => {
            // Arrange
            const fullText = 'Tournament details';
            const subtitle = 'QLD Masters event';
            
            // Act
            const result = service.extractStateFromMySidelineText(fullText, subtitle);
            
            // Assert
            expect(result).toBe('QLD');
        });

        it('should extract VIC from combined text', () => {
            // Arrange
            const fullText = 'Melbourne tournament';
            const subtitle = 'VIC championship';
            
            // Act
            const result = service.extractStateFromMySidelineText(fullText, subtitle);
            
            // Assert
            expect(result).toBe('VIC');
        });

        it('should handle case insensitive matching', () => {
            // Arrange
            const fullText = 'Tournament in nsw';
            const subtitle = '';
            
            // Act
            const result = service.extractStateFromMySidelineText(fullText, subtitle);
            
            // Assert
            expect(result).toBe('NSW');
        });

        it('should return null when no state is found', () => {
            // Arrange
            const fullText = 'Rugby League details';
            const subtitle = 'Local game';
            
            // Act
            const result = service.extractStateFromMySidelineText(fullText, subtitle);
            
            // Assert
            expect(result).toBe(null);
        });

        it('should find first matching state when multiple states present', () => {
            // Arrange
            const fullText = 'NSW and QLD combined tournament';
            const subtitle = '';
            
            // Act
            const result = service.extractStateFromMySidelineText(fullText, subtitle);
            
            // Assert
            expect(result).toBe('NSW'); // First in the australianStates array
        });

        it('should handle empty strings', () => {
            // Arrange
            const fullText = '';
            const subtitle = '';
            
            // Act
            const result = service.extractStateFromMySidelineText(fullText, subtitle);
            
            // Assert
            expect(result).toBe(null);
        });
    });

    describe('extractEventName', () => {
        it('should extract appropriate event name from lines', () => {
            // Arrange
            const lines = [
                'Click to expand',
                'Masters Rugby League Championship 2025',
                'This is a detailed description of the event'
            ];
            
            // Act
            const result = service.extractEventName(lines);
            
            // Assert
            expect(result).toBe('Masters Rugby League Championship 2025');
        });

        it('should skip lines that are too short', () => {
            // Arrange
            const lines = [
                'Short',
                'This is a good event name for testing purposes'
            ];
            
            // Act
            const result = service.extractEventName(lines);
            
            // Assert
            expect(result).toBe('This is a good event name for testing purposes');
        });

        it('should skip lines that are too long', () => {
            // Arrange
            const lines = [
                'This is an extremely long line that exceeds the 100 character limit and should be skipped by the algorithm when selecting event names',
                'Perfect Event Name'
            ];
            
            // Act
            const result = service.extractEventName(lines);
            
            // Assert
            expect(result).toBe('Perfect Event Name');
        });

        it('should skip lines starting with digits', () => {
            // Arrange
            const lines = [
                '123 Main Street',
                'Queensland Masters Tournament'
            ];
            
            // Act
            const result = service.extractEventName(lines);
            
            // Assert
            expect(result).toBe('Queensland Masters Tournament');
        });

        it('should skip lines containing "click"', () => {
            // Arrange
            const lines = [
                'Click here for more information',
                'Annual Masters Carnival'
            ];
            
            // Act
            const result = service.extractEventName(lines);
            
            // Assert
            expect(result).toBe('Annual Masters Carnival');
        });

        it('should skip lines containing "expand"', () => {
            // Arrange
            const lines = [
                'Expand for details',
                'Sydney Masters League'
            ];
            
            // Act
            const result = service.extractEventName(lines);
            
            // Assert
            expect(result).toBe('Sydney Masters League');
        });

        it('should return first line when no suitable line found', () => {
            // Arrange
            const lines = [
                'First',
                'Click',
                '123'
            ];
            
            // Act
            const result = service.extractEventName(lines);
            
            // Assert
            expect(result).toBe('First');
        });

        it('should handle empty lines array', () => {
            // Arrange
            const lines = [];
            
            // Act
            const result = service.extractEventName(lines);
            
            // Assert
            expect(result).toBe('');
        });
    });

    describe('parseDate', () => {
        it('should parse ISO date format', () => {
            // Arrange
            const dateString = '2025-07-15';
            
            // Act
            const result = service.parseDate(dateString);
            
            // Assert
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2025);
        });

        it('should parse month names format', () => {
            // Arrange
            const dateString = 'July 15, 2025';
            
            // Act
            const result = service.parseDate(dateString);
            
            // Assert
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2025);
        });

        it('should parse standard date formats', () => {
            // Arrange
            const dateString = 'Jul 15 2025';
            
            // Act
            const result = service.parseDate(dateString);
            
            // Assert
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2025);
        });

        it('should return null for invalid date strings', () => {
            // Arrange
            const dateString = 'not a date';
            
            // Act
            const result = service.parseDate(dateString);
            
            // Assert
            expect(result).toBe(null);
        });

        it('should return null for empty string', () => {
            // Arrange
            const dateString = '';
            
            // Act
            const result = service.parseDate(dateString);
            
            // Assert
            expect(result).toBe(null);
        });

        it('should return null for null input', () => {
            // Arrange
            const dateString = null;
            
            // Act
            const result = service.parseDate(dateString);
            
            // Assert
            expect(result).toBe(null);
        });

        it('should handle whitespace in date strings', () => {
            // Arrange
            const dateString = '  2025-07-15  ';
            
            // Act
            const result = service.parseDate(dateString);
            
            // Assert
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2025);
        });
    });

    describe('generateMockEvents', () => {
        it('should generate mock events for NSW by default', () => {
            // Arrange & Act
            const result = service.generateMockEvents();
            
            // Assert
            expect(result).toHaveLength(3);
            expect(result[0].state).toBe('NSW');
            expect(result[0].title).toContain('NSW');
            expect(result[0].locationAddress).toContain('Sydney');
            expect(result[0].mySidelineEventId).toContain('nsw');
        });

        it('should generate mock events for specified state', () => {
            // Arrange & Act
            const result = service.generateMockEvents('QLD');
            
            // Assert
            expect(result).toHaveLength(3);
            result.forEach(event => {
                expect(event.state).toBe('QLD');
                expect(event.title).toContain('QLD');
                expect(event.mySidelineEventId).toContain('qld');
            });
        });

        it('should generate events with proper structure and required fields', () => {
            // Arrange & Act
            const result = service.generateMockEvents('VIC');
            
            // Assert
            expect(result).toHaveLength(3);
            
            result.forEach((event, index) => {
                expect(event).toHaveProperty('title');
                expect(event).toHaveProperty('date');
                expect(event).toHaveProperty('locationAddress');
                expect(event).toHaveProperty('state', 'VIC');
                expect(event).toHaveProperty('registrationLink');
                expect(event).toHaveProperty('mySidelineEventId');
                expect(event).toHaveProperty('isManuallyEntered', false);
                expect(event).toHaveProperty('maxTeams', 16);
                expect(event).toHaveProperty('feesDescription');
                expect(event).toHaveProperty('registrationDeadline');
                expect(event).toHaveProperty('scheduleDetails');
                expect(event).toHaveProperty('ageCategories');
                expect(event).toHaveProperty('isRegistrationOpen', true);
                expect(event).toHaveProperty('isActive', true);
                expect(event).toHaveProperty('organiserContactName');
                expect(event).toHaveProperty('organiserContactEmail');
                expect(event).toHaveProperty('organiserContactPhone');
                expect(event).toHaveProperty('sourceData');
                
                // Check sourceData structure
                expect(event.sourceData).toHaveProperty('isMockData', true);
                expect(event.sourceData).toHaveProperty('generatedAt');
                expect(event.sourceData).toHaveProperty('state', 'VIC');
                expect(event.sourceData).toHaveProperty('templateIndex', index);
            });
        });

        it('should generate events with different dates in future months', () => {
            // Arrange & Act
            const result = service.generateMockEvents();
            
            // Assert
            const currentDate = new Date();
            
            expect(result[0].date.getMonth()).toBe((currentDate.getMonth() + 2) % 12);
            expect(result[1].date.getMonth()).toBe((currentDate.getMonth() + 4) % 12);
            expect(result[2].date.getMonth()).toBe((currentDate.getMonth() + 6) % 12);
            
            result.forEach(event => {
                expect(event.date.getDate()).toBe(15); // All set to 15th of month
                expect(event.date.getTime()).toBeGreaterThan(currentDate.getTime());
            });
        });

        it('should generate registration deadlines 2 weeks before event date', () => {
            // Arrange & Act
            const result = service.generateMockEvents();
            
            // Assert
            result.forEach(event => {
                const daysDifference = (event.date.getTime() - event.registrationDeadline.getTime()) / (1000 * 60 * 60 * 24);
                expect(daysDifference).toBe(14); // 2 weeks = 14 days
            });
        });

        it('should generate different fee structures for each event', () => {
            // Arrange & Act
            const result = service.generateMockEvents();
            
            // Assert
            expect(result[0].feesDescription).toContain('$300');
            expect(result[1].feesDescription).toContain('$350');
            expect(result[2].feesDescription).toContain('$400');
        });

        it('should generate age categories for all events', () => {
            // Arrange & Act
            const result = service.generateMockEvents();
            
            // Assert
            result.forEach(event => {
                expect(event.ageCategories).toEqual(['35+', '40+', '45+', '50+']);
            });
        });
    });
});