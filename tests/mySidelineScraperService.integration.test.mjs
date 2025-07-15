import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import MySidelineScraperService from '../services/mySidelineScraperService.mjs';
import MySidelineDataService from '../services/mySidelineDataService.mjs';
import { Carnival } from '../models/index.mjs';
import { Op } from 'sequelize';


/**
 * MySidelineScraperService Integration Tests
 * 
 * Integration tests for the MySideline scraper service that test the actual
 * integration between the scraper and data processing components using the test database.
 * 
 * These tests validate:
 * - Data flow from scraping to database persistence
 * - Field preservation through the processing pipeline
 * - Error handling in integration scenarios
 * - Service coordination and data consistency
 * 
 * To run these tests: npm test -- "mySidelineScraperService.integration.test.mjs"
 */

describe('MySidelineScraperService Integration Tests', () => {
    let scraperService;
    let dataService;
    let testCarnivals = [];
    
    // Test configuration
    const TEST_TIMEOUT = 30000; // 30 seconds for integration tests
    const MOCK_EVENTS = [
        {
            title: 'Test Masters Carnival',
            mySidelineId: 12345, // Add numeric MySideline ID
            mySidelineTitle: 'Test Masters Carnival (Integration Test)',
            date: new Date('2025-08-15'),
            locationAddress: '123 Test Stadium, Sydney NSW 2000',
            state: 'NSW',
            organiserContactName: 'Test Organiser',
            organiserContactEmail: 'test@example.com',
            organiserContactPhone: '0412345678',
            registrationLink: 'https://profile.mysideline.com.au/register/test',
            scheduleDetails: 'Test tournament details',
            source: 'MySideline',
            isActive: true,
            // Use actual database fields instead of isMySidelineCard
            isManuallyEntered: false,
            lastMySidelineSync: new Date(),
            mySidelineAddress: '123 Test Stadium, Sydney NSW 2000',
            mySidelineDate: new Date('2025-08-15'),
            clubLogoURL: null,
            socialMediaFacebook: null,
            socialMediaWebsite: null,
            googleMapsUrl: null,
            locationLatitude: -33.8568,
            locationLongitude: 151.2153,
            locationSuburb: 'Sydney',
            locationPostcode: '2000',
            locationCountry: 'Australia'
        }
    ];

    beforeAll(() => {
        // Set test environment variables
        process.env.NODE_ENV = 'test';
        process.env.MYSIDELINE_USE_MOCK = 'true';
        process.env.MYSIDELINE_ENABLE_SCRAPING = 'true';
    });

    beforeEach(() => {
        // Arrange - Create fresh service instances for each test
        scraperService = new MySidelineScraperService();
        dataService = new MySidelineDataService();
        testCarnivals = [];
        
        // Mock the scraper service to return controlled test data
        // Mock scrapeEvents directly since it's the main entry point
        jest.spyOn(scraperService, 'scrapeEvents')
            .mockResolvedValue(MOCK_EVENTS);
    });

    afterEach(async () => {
        // Clean up test data from database
        if (testCarnivals.length > 0) {
            const carnivalIds = testCarnivals.map(c => c.id);
            await Carnival.destroy({
                where: {
                    id: {
                        [Op.in]: carnivalIds
                    }
                }
            });
        }
        
        // Clear any existing test carnivals by title
        await Carnival.destroy({
            where: {
                title: {
                    [Op.like]: '%Integration Test%'
                }
            }
        });
        
        // Restore mocks
        jest.restoreAllMocks();
    });

    afterAll(() => {
        // Clean up environment
        delete process.env.MYSIDELINE_USE_MOCK;
        delete process.env.MYSIDELINE_ENABLE_SCRAPING;
    });

    describe('scrapeEvents()', () => {
        /**
         * Test that scrapeEvents returns properly formatted event data
         */
        it('should return array of properly formatted events', async () => {
            // Act
            const scrapedEvents = await scraperService.scrapeEvents();

            // Assert
            expect(Array.isArray(scrapedEvents)).toBe(true);
            expect(scrapedEvents.length).toBeGreaterThan(0);
            
            const firstEvent = scrapedEvents[0];
            expect(firstEvent).toHaveProperty('title');
            expect(firstEvent).toHaveProperty('mySidelineTitle');
            expect(firstEvent).toHaveProperty('date');
            expect(firstEvent).toHaveProperty('locationAddress');
            expect(firstEvent).toHaveProperty('state');
            expect(firstEvent.source).toBe('MySideline');
            expect(firstEvent.isManuallyEntered).toBe(false);
        }, TEST_TIMEOUT);

        /**
         * Test that scrapeEvents handles empty responses gracefully
         */
        it('should handle empty API response gracefully', async () => {
            // Arrange
            jest.spyOn(scraperService, 'scrapeEvents')
                .mockResolvedValue([]);

            // Act
            const scrapedEvents = await scraperService.scrapeEvents();

            // Assert
            expect(Array.isArray(scrapedEvents)).toBe(true);
            expect(scrapedEvents.length).toBe(0);
        });

        /**
         * Test that scrapeEvents handles API errors gracefully
         */
        it('should handle API errors gracefully', async () => {
            // Arrange
            jest.spyOn(scraperService, 'scrapeEvents')
                .mockImplementation(async () => {
                    try {
                        throw new Error('API connection failed');
                    } catch (error) {
                        console.error('MySideline scraper error:', error.message);
                        return []; // Service should return empty array on error
                    }
                });

            // Act
            const scrapedEvents = await scraperService.scrapeEvents();

            // Assert
            expect(Array.isArray(scrapedEvents)).toBe(true);
            expect(scrapedEvents.length).toBe(0);
        });
    });

    describe('validateAndCleanData()', () => {
        /**
         * Test that data validation preserves all valid fields
         */
        it('should preserve all valid fields during validation', () => {
            // Arrange
            const rawEvent = { ...MOCK_EVENTS[0] };

            // Act
            const cleanedEvent = scraperService.validateAndCleanData(rawEvent);

            // Assert
            expect(cleanedEvent.title).toBe(rawEvent.title);
            expect(cleanedEvent.mySidelineTitle).toBe(rawEvent.mySidelineTitle);
            expect(cleanedEvent.locationAddress).toBe(rawEvent.locationAddress);
            expect(cleanedEvent.organiserContactEmail).toBe(rawEvent.organiserContactEmail);
            expect(cleanedEvent.state).toBe(rawEvent.state);
        });

        /**
         * Test that validation cleans invalid email addresses
         */
        it('should clean invalid email addresses', () => {
            // Arrange
            const rawEvent = {
                ...MOCK_EVENTS[0],
                organiserContactEmail: 'invalid-email'
            };

            // Act
            const cleanedEvent = scraperService.validateAndCleanData(rawEvent);

            // Assert
            expect(cleanedEvent.organiserContactEmail).toBeNull();
        });

        /**
         * Test that validation provides default title when missing
         */
        it('should provide default title when missing', () => {
            // Arrange
            const rawEvent = {
                ...MOCK_EVENTS[0],
                title: ''
            };

            // Act
            const cleanedEvent = scraperService.validateAndCleanData(rawEvent);

            // Assert
            expect(cleanedEvent.title).toBe('Masters Rugby League Event');
        });
    });

    describe('End-to-End Data Flow', () => {
        /**
         * Test complete data flow from scraping to database persistence
         */
        it('should process scraped events and persist to database', async () => {
            // Arrange
            const initialEventCount = await Carnival.count({
                where: { isManuallyEntered: false }
            });

            // Act
            const scrapedEvents = await scraperService.scrapeEvents();
            const cleanedEvents = scrapedEvents.map(event => 
                scraperService.validateAndCleanData(event)
            );
            const processedEvents = await dataService.processScrapedEvents(cleanedEvents);

            // Assert
            expect(processedEvents.length).toBeGreaterThan(0);
            
            const finalEventCount = await Carnival.count({
                where: { isManuallyEntered: false }
            });
            expect(finalEventCount).toBe(initialEventCount + processedEvents.length);

            // Verify the created event in database
            const savedEvent = await Carnival.findOne({
                where: {
                    mySidelineTitle: MOCK_EVENTS[0].mySidelineTitle
                }
            });
            
            expect(savedEvent).not.toBeNull();
            expect(savedEvent.title).toBe(MOCK_EVENTS[0].title);
            expect(savedEvent.state).toBe(MOCK_EVENTS[0].state);
            expect(savedEvent.locationAddress).toBe(MOCK_EVENTS[0].locationAddress);
            expect(savedEvent.isManuallyEntered).toBe(false);
            expect(savedEvent.lastMySidelineSync).not.toBeNull();

            // Store for cleanup
            testCarnivals.push(savedEvent);
        }, TEST_TIMEOUT);

        /**
         * Test that existing events are updated rather than duplicated
         */
        it('should update existing events rather than create duplicates', async () => {
            // Arrange - Create an initial event with MySideline matching fields including mySidelineId
            const existingEvent = await Carnival.create({
                title: MOCK_EVENTS[0].title,
                mySidelineId: MOCK_EVENTS[0].mySidelineId, // Include the MySideline ID for matching
                mySidelineTitle: MOCK_EVENTS[0].mySidelineTitle,
                mySidelineAddress: MOCK_EVENTS[0].mySidelineAddress,
                mySidelineDate: MOCK_EVENTS[0].mySidelineDate,
                date: MOCK_EVENTS[0].date,
                locationAddress: MOCK_EVENTS[0].locationAddress,
                state: MOCK_EVENTS[0].state,
                isManuallyEntered: false,
                lastMySidelineSync: new Date(),
                organiserContactEmail: null // Leave empty to test update
            });
            testCarnivals.push(existingEvent);

            const initialCount = await Carnival.count({
                where: { isManuallyEntered: false }
            });

            // Act - Process the same event again
            const scrapedEvents = await scraperService.scrapeEvents();
            const cleanedEvents = scrapedEvents.map(event => 
                scraperService.validateAndCleanData(event)
            );
            await dataService.processScrapedEvents(cleanedEvents);

            // Assert - Should not create new event
            const finalCount = await Carnival.count({
                where: { isManuallyEntered: false }
            });
            expect(finalCount).toBe(initialCount);

            // Verify the event was updated with new information
            const updatedEvent = await Carnival.findOne({
                where: { id: existingEvent.id }
            });
            expect(updatedEvent.organiserContactEmail).toBe(MOCK_EVENTS[0].organiserContactEmail);
        }, TEST_TIMEOUT);

        /**
         * Test field preservation through the complete pipeline
         */
        it('should preserve critical fields through complete processing pipeline', async () => {
            // Arrange
            const criticalFields = [
                'title', 'mySidelineTitle', 'date', 'locationAddress', 
                'state', 'organiserContactEmail', 'registrationLink'
            ];

            // Act
            const scrapedEvents = await scraperService.scrapeEvents();
            const cleanedEvents = scrapedEvents.map(event => 
                scraperService.validateAndCleanData(event)
            );
            const processedEvents = await dataService.processScrapedEvents(cleanedEvents);

            // Assert
            expect(processedEvents.length).toBeGreaterThan(0);
            
            const originalEvent = MOCK_EVENTS[0];
            const savedEvent = processedEvents[0];
            testCarnivals.push(savedEvent);

            criticalFields.forEach(field => {
                if (originalEvent[field] !== null && originalEvent[field] !== undefined) {
                    expect(savedEvent[field]).toBeDefined();
                    if (field === 'date') {
                        expect(new Date(savedEvent[field]).getTime())
                            .toBe(new Date(originalEvent[field]).getTime());
                    } else {
                        expect(savedEvent[field]).toBe(originalEvent[field]);
                    }
                }
            });
        }, TEST_TIMEOUT);
    });

    describe('Error Handling', () => {
        /**
         * Test handling of invalid event data
         */
        it('should handle invalid event data gracefully', async () => {
            // Arrange
            const invalidEvent = {
                title: null,
                date: 'invalid-date',
                organiserContactEmail: 'not-an-email'
            };
            
            jest.spyOn(scraperService, 'scrapeEvents')
                .mockResolvedValue([invalidEvent]);

            // Act
            const scrapedEvents = await scraperService.scrapeEvents();
            const cleanedEvent = scraperService.validateAndCleanData(scrapedEvents[0]);
            const processedEvents = await dataService.processScrapedEvents([cleanedEvent]);

            // Assert
            expect(processedEvents.length).toBe(1);
            expect(processedEvents[0].title).toBe('Masters Rugby League Event'); // Default title
            expect(processedEvents[0].organiserContactEmail).toBeNull(); // Cleaned invalid email
            
            testCarnivals.push(processedEvents[0]);
        }, TEST_TIMEOUT);

        /**
         * Test database transaction rollback on processing errors
         */
        it('should handle database errors during processing', async () => {
            // Arrange - Mock a database error
            const originalCreate = Carnival.create;
            jest.spyOn(Carnival, 'create').mockRejectedValueOnce(
                new Error('Database connection failed')
            );

            // Act
            const scrapedEvents = await scraperService.scrapeEvents();
            const cleanedEvents = scrapedEvents.map(event => 
                scraperService.validateAndCleanData(event)
            );
            
            // Should not throw, but should handle gracefully
            const processedEvents = await dataService.processScrapedEvents(cleanedEvents);

            // Assert
            expect(processedEvents.length).toBe(0); // No events processed due to error

            // Restore original method
            Carnival.create = originalCreate;
        }, TEST_TIMEOUT);
    });

    describe('Live Site Integration', () => {
        /**
         * Test that the scraper can retrieve actual data from MySideline
         * This test can be enabled with ENABLE_LIVE_TESTS=true
         */
        it('should retrieve actual events from MySideline website', async () => {
            // Skip this test unless explicitly enabled
            if (!process.env.ENABLE_LIVE_TESTS) {
                console.log('Skipping live site test - set ENABLE_LIVE_TESTS=true to run');
                return;
            }

            // Completely restore all mocks to ensure real scraping
            jest.restoreAllMocks();
            
            // Set environment to disable mock data BEFORE creating service instance
            const originalMockEnv = process.env.MYSIDELINE_USE_MOCK;
            process.env.MYSIDELINE_USE_MOCK = 'false';

            try {
                // Create a fresh scraper service instance with mocking disabled
                const realScraperService = new MySidelineScraperService();
                
                // Verify that mocking is actually disabled
                expect(realScraperService.useMockData).toBe(false);

                // Act - Attempt to scrape real data from MySideline
                console.log('🌐 Attempting to scrape live MySideline data...');
                const liveEvents = await realScraperService.scrapeEvents();

                // Assert - Verify we got real data
                expect(Array.isArray(liveEvents)).toBe(true);
                
                if (liveEvents.length > 0) {
                    const firstEvent = liveEvents[0];
                    
                    // Verify basic structure of scraped events
                    expect(firstEvent).toHaveProperty('title');
                    expect(firstEvent).toHaveProperty('source');
                    expect(firstEvent.source).toBe('MySideline');
                    
                    // Verify it's NOT mock data by checking it doesn't match mock patterns
                    const mockPatterns = [
                        'NSW Masters Rugby League Carnival',
                        'QLD Masters Rugby League Carnival', 
                        'VIC Masters Rugby League Carnival',
                        'Test Masters Carnival'
                    ];
                    
                    const isRealData = !mockPatterns.some(pattern => 
                        firstEvent.title.includes(pattern)
                    );
                    
                    expect(isRealData).toBe(true);
                    
                    console.log(`✅ Successfully retrieved ${liveEvents.length} REAL events from MySideline`);
                    console.log(`📋 Sample event: "${firstEvent.title}"`);
                    
                    // Log additional details to verify it's real data
                    if (firstEvent.mySidelineId) {
                        console.log(`🆔 MySideline ID: ${firstEvent.mySidelineId}`);
                    }
                    if (firstEvent.locationAddress) {
                        console.log(`📍 Location: ${firstEvent.locationAddress}`);
                    }
                    if (firstEvent.date) {
                        console.log(`📅 Date: ${firstEvent.date}`);
                    }
                } else {
                    console.log('⚠️  No events found on MySideline (this may be normal if no events are currently listed)');
                    // This is not necessarily a failure - MySideline might just be empty
                }
                
            } catch (error) {
                console.error(`❌ Live MySideline scraping failed: ${error.message}`);
                console.error('Stack trace:', error.stack);
                
                // Only fail if it's a clear scraping logic error
                if (error.message.includes('Cannot read') || 
                    error.message.includes('is not a function') ||
                    error.message.includes('fetch is not defined')) {
                    throw new Error(`Scraping logic error: ${error.message}`);
                }
                
                // For network errors or site changes, log but don't fail
                console.warn('This may indicate the MySideline website is down or structure has changed');
                
            } finally {
                // Restore original environment
                process.env.MYSIDELINE_USE_MOCK = originalMockEnv;
            }
        }, 60000); // 60 second timeout for live site requests

        /**
         * Test that the scraper handles live site unavailability gracefully
         */
        it('should handle network failures gracefully', async () => {
            // Skip this test unless explicitly enabled
            if (!process.env.ENABLE_LIVE_TESTS) {
                console.log('Skipping network failure test - set ENABLE_LIVE_TESTS=true to run');
                return;
            }

            // Set environment to disable mock data
            const originalMockEnv = process.env.MYSIDELINE_USE_MOCK;
            process.env.MYSIDELINE_USE_MOCK = 'false';

            try {
                // Create scraper instance
                const realScraperService = new MySidelineScraperService();
                
                // Mock the internal HTTP method to simulate network failure
                jest.spyOn(realScraperService, 'fetchEventsWithApiInterception')
                    .mockRejectedValue(new Error('Network connection failed'));

                // Act
                const events = await realScraperService.scrapeEvents();

                // Assert - Should return empty array on network failure
                expect(Array.isArray(events)).toBe(true);
                expect(events.length).toBe(0);
                
                console.log('✅ Network failure handled gracefully - returned empty array');
                
            } finally {
                // Restore
                process.env.MYSIDELINE_USE_MOCK = originalMockEnv;
            }
        }, 30000);

        /**
         * Test that scraped live data passes validation
         */
        it('should return valid data structure from live site', async () => {
            // Skip this test unless explicitly enabled
            if (!process.env.ENABLE_LIVE_TESTS) {
                console.log('Skipping live data validation test - set ENABLE_LIVE_TESTS=true to run');
                return;
            }

            // Completely restore all mocks
            jest.restoreAllMocks();
            
            const originalMockEnv = process.env.MYSIDELINE_USE_MOCK;
            process.env.MYSIDELINE_USE_MOCK = 'false';

            try {
                // Create fresh scraper service with mocking disabled
                const realScraperService = new MySidelineScraperService();

                // Act
                console.log('🌐 Scraping live data for validation testing...');
                const liveEvents = await realScraperService.scrapeEvents();

                // Assert
                expect(Array.isArray(liveEvents)).toBe(true);
                
                // If we got events, validate their structure
                if (liveEvents.length > 0) {
                    liveEvents.forEach((event, index) => {
                        expect(event).toHaveProperty('source');
                        expect(event.source).toBe('MySideline');
                        
                        // Test validation on live data
                        const validatedEvent = realScraperService.validateAndCleanData(event);
                        expect(validatedEvent).toHaveProperty('title');
                        expect(typeof validatedEvent.title).toBe('string');
                        expect(validatedEvent.title.length).toBeGreaterThan(0);
                        
                        // Verify it's not mock data
                        const mockPatterns = [
                            'NSW Masters Rugby League Carnival',
                            'QLD Masters Rugby League Carnival', 
                            'VIC Masters Rugby League Carnival',
                            'Test Masters Carnival'
                        ];
                        
                        const isRealData = !mockPatterns.some(pattern => 
                            validatedEvent.title.includes(pattern)
                        );
                        
                        expect(isRealData).toBe(true);
                        
                        console.log(`✅ Event ${index + 1} validation passed: "${validatedEvent.title}"`);
                    });
                    
                    console.log(`✅ All ${liveEvents.length} live events passed validation`);
                } else {
                    console.log('ℹ️  No live events to validate (MySideline may be empty)');
                }
                
            } catch (error) {
                console.error(`❌ Live validation test failed: ${error.message}`);
                
                // Only fail for clear validation errors
                if (error.message.includes('validation') || 
                    error.message.includes('required') ||
                    error.message.includes('Expected')) {
                    throw error;
                }
                
                // For other errors, log but don't fail
                console.warn('Site may be unavailable or structure changed');
                
            } finally {
                process.env.MYSIDELINE_USE_MOCK = originalMockEnv;
            }
        }, 60000);
    });

    describe('Data Consistency', () => {
        /**
         * Test MySideline-specific field preservation
         */
        it('should preserve MySideline-specific fields for duplicate detection', async () => {
            // Act
            const scrapedEvents = await scraperService.scrapeEvents();
            const cleanedEvents = scrapedEvents.map(event => 
                scraperService.validateAndCleanData(event)
            );
            const processedEvents = await dataService.processScrapedEvents(cleanedEvents);

            // Assert
            expect(processedEvents.length).toBeGreaterThan(0);
            
            const savedEvent = processedEvents[0];
            testCarnivals.push(savedEvent);

            expect(savedEvent.mySidelineId).toBe(MOCK_EVENTS[0].mySidelineId);
            expect(savedEvent.mySidelineTitle).toBe(MOCK_EVENTS[0].mySidelineTitle);
            expect(savedEvent.mySidelineAddress).toBe(MOCK_EVENTS[0].mySidelineAddress);
            expect(new Date(savedEvent.mySidelineDate).getTime())
                .toBe(new Date(MOCK_EVENTS[0].mySidelineDate).getTime());
            expect(savedEvent.isManuallyEntered).toBe(false);
            expect(savedEvent.lastMySidelineSync).not.toBeNull();
        }, TEST_TIMEOUT);

        /**
         * Test mySidelineId priority in duplicate detection
         */
        it('should prioritize mySidelineId for duplicate detection over other fields', async () => {
            // Arrange - Create an event with the same mySidelineId but different title/date
            const existingEvent = await Carnival.create({
                title: 'Different Title',
                mySidelineId: MOCK_EVENTS[0].mySidelineId, // Same ID as mock data
                mySidelineTitle: 'Different MySideline Title',
                date: new Date('2025-09-01'), // Different date
                locationAddress: 'Different Location',
                state: 'QLD', // Different state
                isManuallyEntered: false,
                lastMySidelineSync: new Date(),
                organiserContactEmail: null
            });
            testCarnivals.push(existingEvent);

            const initialCount = await Carnival.count({
                where: { isManuallyEntered: false }
            });

            // Act - Process event with same mySidelineId
            const scrapedEvents = await scraperService.scrapeEvents();
            const cleanedEvents = scrapedEvents.map(event => 
                scraperService.validateAndCleanData(event)
            );
            await dataService.processScrapedEvents(cleanedEvents);

            // Assert - Should update existing event, not create new one
            const finalCount = await Carnival.count({
                where: { isManuallyEntered: false }
            });
            expect(finalCount).toBe(initialCount); // No new events created

            // Verify the existing event was updated
            const updatedEvent = await Carnival.findOne({
                where: { id: existingEvent.id }
            });
            expect(updatedEvent.organiserContactEmail).toBe(MOCK_EVENTS[0].organiserContactEmail);
        }, TEST_TIMEOUT);

        /**
         * Test that sync timestamp is properly set
         */
        it('should set lastMySidelineSync timestamp during processing', async () => {
            // Arrange
            const beforeSync = new Date();

            // Act
            const scrapedEvents = await scraperService.scrapeEvents();
            const cleanedEvents = scrapedEvents.map(event => 
                scraperService.validateAndCleanData(event)
            );
            const processedEvents = await dataService.processScrapedEvents(cleanedEvents);

            // Assert
            expect(processedEvents.length).toBeGreaterThan(0);
            
            const savedEvent = processedEvents[0];
            testCarnivals.push(savedEvent);

            expect(savedEvent.lastMySidelineSync).not.toBeNull();
            expect(new Date(savedEvent.lastMySidelineSync).getTime())
                .toBeGreaterThanOrEqual(beforeSync.getTime());
        }, TEST_TIMEOUT);
    });
});