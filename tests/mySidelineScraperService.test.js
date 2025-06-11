const MySidelineScraperService = require('../services/mySidelineScraperService');
const MySidelineEventParserService = require('../services/mySidelineEventParserService');
const { chromium } = require('playwright');

// Mock all external dependencies
jest.mock('playwright', () => ({
    chromium: {
        launch: jest.fn()
    }
}));

jest.mock('../services/mySidelineEventParserService', () => {
    return jest.fn().mockImplementation(() => ({
        parseEventFromElement: jest.fn()
    }));
});

describe('MySidelineScraperService', () => {
    let service;
    let mockBrowser;
    let mockContext;
    let mockPage;
    let mockParserService;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Create fresh service instance
        service = new MySidelineScraperService();
        
        // Mock parser service
        mockParserService = {
            parseEventFromElement: jest.fn()
        };
        MySidelineEventParserService.mockImplementation(() => mockParserService);
        service.parserService = mockParserService;
        
        // Mock Playwright objects
        mockPage = {
            setDefaultTimeout: jest.fn(),
            setDefaultNavigationTimeout: jest.fn(),
            goto: jest.fn(),
            waitForSelector: jest.fn(),
            waitForFunction: jest.fn(),
            waitForTimeout: jest.fn(),
            waitForEvent: jest.fn(),
            waitForNavigation: jest.fn(),
            evaluate: jest.fn(),
            screenshot: jest.fn(),
            locator: jest.fn(),
            url: jest.fn(),
            goBack: jest.fn()
        };
        
        mockContext = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            close: jest.fn()
        };
        
        mockBrowser = {
            newContext: jest.fn().mockResolvedValue(mockContext),
            close: jest.fn()
        };
        
        chromium.launch.mockResolvedValue(mockBrowser);
        
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
        it('should initialize with default configuration values', () => {
            // Arrange & Act
            const newService = new MySidelineScraperService();
            
            // Assert
            expect(newService.timeout).toBe(60000);
            expect(newService.retryCount).toBe(3);
            expect(newService.requestDelay).toBe(2000);
            expect(newService.useHeadlessBrowser).toBe(true); // NODE_ENV !== 'development'
            expect(newService.enableScraping).toBe(true);
            expect(newService.useMockData).toBe(false);
            expect(newService.parserService).toBeDefined();
        });

        it('should use environment variables when available', () => {
            // Arrange
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                MYSIDELINE_REQUEST_TIMEOUT: '30000',
                MYSIDELINE_RETRY_ATTEMPTS: '5',
                MYSIDELINE_URL: 'https://test.mysideline.com',
                NODE_ENV: 'development',
                MYSIDELINE_ENABLE_SCRAPING: 'false',
                MYSIDELINE_USE_MOCK: 'true'
            };
            
            // Act
            const newService = new MySidelineScraperService();
            
            // Assert
            expect(newService.timeout).toBe(30000);
            expect(newService.retryCount).toBe(5);
            expect(newService.searchUrl).toBe('https://test.mysideline.com');
            expect(newService.useHeadlessBrowser).toBe(false); // NODE_ENV === 'development'
            expect(newService.enableScraping).toBe(false);
            expect(newService.useMockData).toBe(true);
            
            // Restore environment
            process.env = originalEnv;
        });
    });

    describe('scrapeEvents', () => {
        it('should return mock data when useMockData is true', async () => {
            // Arrange
            service.useMockData = true;
            jest.spyOn(service, 'generateMockEvents').mockReturnValue(['mock event']);
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual(['mock event']);
            expect(service.generateMockEvents).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('Using mock MySideline data (development mode)...');
        });

        it('should return empty array when scraping is disabled', async () => {
            // Arrange
            service.useMockData = false;
            service.enableScraping = false;
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual([]);
            expect(console.log).toHaveBeenCalledWith('MySideline scraping is disabled via configuration');
        });

        it('should scrape events when enabled', async () => {
            // Arrange
            service.useMockData = false;
            service.enableScraping = true;
            const mockEvents = [{ title: 'Test Event' }];
            jest.spyOn(service, 'fetchEventsWithBrowser').mockResolvedValue(mockEvents);
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual(mockEvents);
            expect(service.fetchEventsWithBrowser).toHaveBeenCalled();
        });

        it('should handle errors and fallback to mock data in development', async () => {
            // Arrange
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            service.useMockData = false;
            service.enableScraping = true;
            const mockEvents = [{ title: 'Mock Event' }];
            jest.spyOn(service, 'fetchEventsWithBrowser').mockRejectedValue(new Error('Scraping failed'));
            jest.spyOn(service, 'generateMockEvents').mockReturnValue(mockEvents);
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual(mockEvents);
            expect(console.error).toHaveBeenCalledWith('Failed to scrape MySideline events:', 'Scraping failed');
            expect(console.log).toHaveBeenCalledWith('Browser automation failed in development, using mock data...');
            
            // Restore environment
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('fetchEventsWithBrowser', () => {
        beforeEach(() => {
            // Mock all the wait methods
            jest.spyOn(service, 'waitForPageStructure').mockResolvedValue();
            jest.spyOn(service, 'waitForJavaScriptInitialization').mockResolvedValue();
            jest.spyOn(service, 'waitForDynamicContentLoading').mockResolvedValue();
            jest.spyOn(service, 'waitForSearchResults').mockResolvedValue();
            jest.spyOn(service, 'validatePageContent').mockResolvedValue();
            jest.spyOn(service, 'waitForContentStabilization').mockResolvedValue();
            jest.spyOn(service, 'waitForMeaningfulContent').mockResolvedValue();
            jest.spyOn(service, 'extractEvents').mockResolvedValue([]);
        });

        it('should launch browser and fetch events', async () => {
            // Arrange
            service.searchUrl = 'https://test.mysideline.com';
            
            // Act
            const result = await service.fetchEventsWithBrowser();
            
            // Assert
            expect(chromium.launch).toHaveBeenCalledWith({
                headless: service.useHeadlessBrowser,
                timeout: service.timeout
            });
            expect(mockBrowser.newContext).toHaveBeenCalled();
            expect(mockContext.newPage).toHaveBeenCalled();
            expect(mockPage.goto).toHaveBeenCalledWith(service.searchUrl, { waitUntil: 'domcontentloaded' });
            expect(mockContext.close).toHaveBeenCalled();
            expect(mockBrowser.close).toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should handle browser launch errors', async () => {
            // Arrange
            const error = new Error('Browser launch failed');
            chromium.launch.mockRejectedValue(error);
            
            // Act
            const result = await service.fetchEventsWithBrowser();
            
            // Assert
            expect(result).toEqual([]);
            expect(console.error).toHaveBeenCalledWith('Error during browser fetching:', 'Browser launch failed');
        });

        it('should handle page navigation errors', async () => {
            // Arrange
            mockPage.goto.mockRejectedValue(new Error('Navigation failed'));
            
            // Act
            const result = await service.fetchEventsWithBrowser();
            
            // Assert
            expect(result).toEqual([]);
            expect(mockContext.close).toHaveBeenCalled();
            expect(mockBrowser.close).toHaveBeenCalled();
        });
    });

    describe('extractEvents', () => {
        beforeEach(() => {
            // Mock locator for cards
            const mockLocator = {
                all: jest.fn().mockResolvedValue([
                    { /* mock card element */ }
                ])
            };
            mockPage.locator.mockReturnValue(mockLocator);
            
            // Mock page evaluate for page info
            mockPage.evaluate.mockResolvedValue({
                url: 'https://test.mysideline.com',
                title: 'MySideline Test',
                bodyTextLength: 5000,
                elementCount: 100,
                cardCount: 2,
                clickExpandCount: 1
            });
        });

        it('should extract events from MySideline page using sequential processing', async () => {
            // Arrange
            const mockCardData = {
                title: 'NSW Masters Carnival',
                fullContent: 'NSW Masters Rugby League Carnival 2025',
                cardIndex: 0,
                isMySidelineCard: true,
                hasLocation: true,
                dates: ['15/08/2025']
            };
            
            const mockParsedEvent = {
                title: 'NSW Masters Carnival',
                date: new Date('2025-08-15'),
                state: 'NSW'
            };
            
            jest.spyOn(service, 'expandCardClickExpandElements').mockResolvedValue(true);
            jest.spyOn(service, 'extractSingleCardData').mockResolvedValue(mockCardData);
            jest.spyOn(service, 'isRelevantMastersEvent').mockReturnValue(true);
            jest.spyOn(service, 'extractRegistrationUrl').mockResolvedValue('https://registration.com');
            jest.spyOn(service, 'delay').mockResolvedValue();
            mockParserService.parseEventFromElement.mockReturnValue(mockParsedEvent);

            // Act
            const result = await service.extractEvents(mockPage);

            // Assert
            expect(result).toEqual([mockParsedEvent]);
            expect(service.expandCardClickExpandElements).toHaveBeenCalledWith(mockPage, 0);
            expect(service.extractSingleCardData).toHaveBeenCalledWith(mockPage, 0, true);
            expect(service.isRelevantMastersEvent).toHaveBeenCalledWith(mockCardData);
            expect(mockParserService.parseEventFromElement).toHaveBeenCalledWith({
                ...mockCardData,
                registrationUrl: 'https://registration.com'
            });
        });

        it('should skip irrelevant cards', async () => {
            // Arrange
            const mockCardData = {
                title: 'Touch Football Event',
                fullContent: 'Touch football tournament',
                cardIndex: 0
            };
            
            jest.spyOn(service, 'expandCardClickExpandElements').mockResolvedValue(false);
            jest.spyOn(service, 'extractSingleCardData').mockResolvedValue(mockCardData);
            jest.spyOn(service, 'isRelevantMastersEvent').mockReturnValue(false);
            jest.spyOn(service, 'delay').mockResolvedValue();

            // Act
            const result = await service.extractEvents(mockPage);

            // Assert
            expect(result).toEqual([]);
            expect(service.isRelevantMastersEvent).toHaveBeenCalledWith(mockCardData);
            expect(mockParserService.parseEventFromElement).not.toHaveBeenCalled();
        });

        it('should handle parser errors gracefully', async () => {
            // Arrange
            const mockCardData = {
                title: 'NSW Masters Carnival',
                fullContent: 'NSW Masters Rugby League Carnival',
                cardIndex: 0,
                isMySidelineCard: true
            };
            
            jest.spyOn(service, 'expandCardClickExpandElements').mockResolvedValue(true);
            jest.spyOn(service, 'extractSingleCardData').mockResolvedValue(mockCardData);
            jest.spyOn(service, 'isRelevantMastersEvent').mockReturnValue(true);
            jest.spyOn(service, 'delay').mockResolvedValue();
            mockParserService.parseEventFromElement.mockImplementation(() => {
                throw new Error('Parser error');
            });

            // Act
            const result = await service.extractEvents(mockPage);

            // Assert
            expect(result).toEqual([]);
            expect(console.log).toHaveBeenCalledWith('Failed to parse MySideline event: Parser error');
        });
    });

    describe('extractRegistrationUrl', () => {
        it('should extract registration URL from card', async () => {
            // Arrange
            mockPage.evaluate.mockResolvedValue('https://registration.com');

            // Act
            const result = await service.extractRegistrationUrl(mockPage, '.el-card.is-always-shadow', 0);

            // Assert
            expect(result).toBe('https://registration.com');
            expect(console.log).toHaveBeenCalledWith('Extracting registration URL from card 1...');
            expect(console.log).toHaveBeenCalledWith('✅ Found registration URL from attributes: https://registration.com');
        });

        it('should return null when no register button exists', async () => {
            // Arrange
            mockPage.evaluate.mockResolvedValue(null);

            // Act
            const result = await service.extractRegistrationUrl(mockPage, '.el-card.is-always-shadow', 0);

            // Assert
            expect(result).toBeNull();
            expect(console.log).toHaveBeenCalledWith('Extracting registration URL from card 1...');
            expect(console.log).toHaveBeenCalledWith('❌ No registration URL found in card 1');
        });

        it('should handle extraction errors gracefully', async () => {
            // Arrange
            mockPage.evaluate.mockRejectedValue(new Error('Extraction failed'));

            // Act
            const result = await service.extractRegistrationUrl(mockPage, '.el-card.is-always-shadow', 0);

            // Assert
            expect(result).toBeNull();
            expect(console.log).toHaveBeenCalledWith('Error extracting registration URL: Extraction failed');
        });
    });

    describe('expandCardClickExpandElements', () => {
        beforeEach(() => {
            jest.spyOn(service, 'delay').mockResolvedValue();
            jest.spyOn(service, 'waitForCardExpandedContent').mockResolvedValue();
        });

        it('should expand click-expand elements in specific card', async () => {
            // Arrange
            const mockElement = {
                isVisible: jest.fn().mockResolvedValue(true),
                scrollIntoViewIfNeeded: jest.fn(),
                click: jest.fn()
            };
            const mockLocator = {
                all: jest.fn().mockResolvedValue([mockElement])
            };
            mockPage.locator.mockReturnValue(mockLocator);

            // Act
            const result = await service.expandCardClickExpandElements(mockPage, 0);

            // Assert
            expect(result).toBe(true);
            expect(mockElement.click).toHaveBeenCalled();
            expect(service.waitForCardExpandedContent).toHaveBeenCalledWith(mockPage, 0, 0);
        });

        it('should return false when no click-expand elements found', async () => {
            // Arrange
            const mockLocator = {
                all: jest.fn().mockResolvedValue([])
            };
            mockPage.locator.mockReturnValue(mockLocator);

            // Act
            const result = await service.expandCardClickExpandElements(mockPage, 0);

            // Assert
            expect(result).toBe(false);
            expect(console.log).toHaveBeenCalledWith('No click-expand elements found in card 1');
        });

        it('should skip invisible elements', async () => {
            // Arrange
            const mockElement = {
                isVisible: jest.fn().mockResolvedValue(false),
                scrollIntoViewIfNeeded: jest.fn(),
                click: jest.fn()
            };
            const mockLocator = {
                all: jest.fn().mockResolvedValue([mockElement])
            };
            mockPage.locator.mockReturnValue(mockLocator);

            // Act
            const result = await service.expandCardClickExpandElements(mockPage, 0);

            // Assert
            expect(result).toBe(false);
            expect(mockElement.click).not.toHaveBeenCalled();
        });

        it('should handle click errors gracefully', async () => {
            // Arrange
            const mockElement = {
                isVisible: jest.fn().mockResolvedValue(true),
                scrollIntoViewIfNeeded: jest.fn(),
                click: jest.fn().mockRejectedValue(new Error('Click failed'))
            };
            const mockLocator = {
                all: jest.fn().mockResolvedValue([mockElement])
            };
            mockPage.locator.mockReturnValue(mockLocator);

            // Act
            const result = await service.expandCardClickExpandElements(mockPage, 0);

            // Assert
            expect(result).toBe(false);
            expect(console.log).toHaveBeenCalledWith('Failed to expand element 1 in card 1: Click failed');
        });
    });

    describe('expandAllClickExpandElements', () => {
        beforeEach(() => {
            jest.spyOn(service, 'delay').mockResolvedValue();
        });

        it('should expand all visible click-expand elements', async () => {
            // Arrange
            const mockElement = {
                isVisible: jest.fn().mockResolvedValue(true),
                scrollIntoViewIfNeeded: jest.fn(),
                click: jest.fn()
            };
            const mockLocator = {
                all: jest.fn().mockResolvedValue([mockElement, mockElement])
            };
            mockPage.locator.mockReturnValue(mockLocator);

            // Act
            const result = await service.expandAllClickExpandElements(mockPage);

            // Assert
            expect(result).toBe(true);
            expect(mockElement.click).toHaveBeenCalledTimes(2);
            expect(console.log).toHaveBeenCalledWith('📊 Successfully expanded 2/2 elements');
        });

        it('should return false when no click-expand elements found', async () => {
            // Arrange
            const mockLocator = {
                all: jest.fn().mockResolvedValue([])
            };
            mockPage.locator.mockReturnValue(mockLocator);

            // Act
            const result = await service.expandAllClickExpandElements(mockPage);

            // Assert
            expect(result).toBe(false);
            expect(console.log).toHaveBeenCalledWith('No click-expand elements found on the page');
        });

        it('should handle click errors gracefully', async () => {
            // Arrange
            const mockElement = {
                isVisible: jest.fn().mockResolvedValue(true),
                scrollIntoViewIfNeeded: jest.fn(),
                click: jest.fn().mockRejectedValue(new Error('Click failed'))
            };
            const mockLocator = {
                all: jest.fn().mockResolvedValue([mockElement])
            };
            mockPage.locator.mockReturnValue(mockLocator);

            // Act
            const result = await service.expandAllClickExpandElements(mockPage);

            // Assert
            expect(result).toBe(false);
            expect(console.log).toHaveBeenCalledWith('Failed to expand element 1: Click failed');
            expect(console.log).toHaveBeenCalledWith('📊 Successfully expanded 0/1 elements');
        });
    });

    describe('waitForCardExpandedContent', () => {
        it('should wait for expanded content to appear', async () => {
            // Arrange
            mockPage.waitForFunction.mockResolvedValue();

            // Act
            await service.waitForCardExpandedContent(mockPage, 0, 0);

            // Assert
            expect(mockPage.waitForFunction).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('✅ Expanded content detected in card 1, element 1');
        });

        it('should handle timeout gracefully', async () => {
            // Arrange
            mockPage.waitForFunction.mockRejectedValue(new Error('Timeout'));
            jest.spyOn(service, 'delay').mockResolvedValue();

            // Act
            await service.waitForCardExpandedContent(mockPage, 0, 0);

            // Assert
            expect(console.log).toHaveBeenCalledWith('Could not detect expanded content in card 1, element 1, continuing...');
            expect(service.delay).toHaveBeenCalledWith(1000);
        });
    });

    describe('extractSingleCardData', () => {
        it('should extract data from a single card', async () => {
            // Arrange
            const mockCardData = {
                title: 'Test Event',
                subtitle: 'Test Subtitle',
                text: 'Test content',
                cardIndex: 0,
                isMySidelineCard: true
            };
            mockPage.evaluate.mockResolvedValue(mockCardData);

            // Act
            const result = await service.extractSingleCardData(mockPage, 0, false);

            // Assert
            expect(result).toEqual(mockCardData);
            expect(mockPage.evaluate).toHaveBeenCalled();
        });

        it('should return null when card not found', async () => {
            // Arrange
            mockPage.evaluate.mockResolvedValue(null);

            // Act
            const result = await service.extractSingleCardData(mockPage, 0, false);

            // Assert
            expect(result).toBeNull();
        });

        it('should handle extraction errors', async () => {
            // Arrange
            mockPage.evaluate.mockRejectedValue(new Error('Extraction failed'));

            // Act
            const result = await service.extractSingleCardData(mockPage, 0, false);

            // Assert
            expect(result).toBeNull();
            expect(console.log).toHaveBeenCalledWith('Error extracting data from card 1: Extraction failed');
        });
    });

    describe('isRelevantMastersEvent', () => {
        it('should return true for relevant Masters events', () => {
            // Arrange
            const cardData = {
                title: 'NSW Masters Rugby League Carnival',
                fullContent: 'NSW Masters Rugby League carnival event with registration',
                dates: ['15/08/2025'],
                hasLocation: true
            };

            // Act
            const result = service.isRelevantMastersEvent(cardData);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for Touch events', () => {
            // Arrange
            const cardData = {
                title: 'Touch Football Masters',
                fullContent: 'touch football masters event',
                dates: ['15/08/2025'],
                hasLocation: true
            };

            // Act
            const result = service.isRelevantMastersEvent(cardData);

            // Assert
            expect(result).toBe(false);
            expect(console.log).toHaveBeenCalledWith('❌ Filtering out Touch event: Touch Football Masters');
        });

        it('should return false for events with insufficient data', () => {
            // Arrange
            const cardData = {
                title: '',
                fullContent: 'short',
                dates: [],
                hasLocation: false
            };

            // Act
            const result = service.isRelevantMastersEvent(cardData);

            // Assert
            expect(result).toBe(false);
        });

        it('should return true for non-Touch events with sufficient content', () => {
            // Arrange
            const cardData = {
                title: 'Some Event',
                fullContent: 'Some random event content that has enough characters to meet minimum requirements',
                dates: [],
                hasLocation: false
            };

            // Act
            const result = service.isRelevantMastersEvent(cardData);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('generateMockEvents', () => {
        it('should generate mock events for testing', () => {
            // Act
            const result = service.generateMockEvents();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('title');
            expect(result[0]).toHaveProperty('date');
            expect(result[0]).toHaveProperty('state');
            expect(result[0]).toHaveProperty('registrationLink');
            expect(result[0].sourceData.isMockData).toBe(true);
        });

        it('should generate events for NSW, QLD, and VIC', () => {
            // Act
            const result = service.generateMockEvents();

            // Assert
            const states = result.map(event => event.state);
            expect(states).toContain('NSW');
            expect(states).toContain('QLD');
            expect(states).toContain('VIC');
        });
    });

    describe('validateExtractedData', () => {
        it('should validate extracted events', () => {
            // Arrange
            const events = [
                {
                    title: 'NSW Masters Carnival',
                    date: new Date('2025-08-15'),
                    locationAddress: 'Sydney, NSW',
                    registrationLink: 'https://register.com'
                },
                {
                    title: 'QLD Masters',
                    date: new Date('2025-09-15'),
                    locationAddress: 'Brisbane, QLD'
                    // Missing registration link
                }
            ];

            // Act
            const result = service.validateExtractedData(events);

            // Assert
            expect(result.totalEvents).toBe(2);
            expect(result.validEvents).toBe(2); // Both events are valid since they have titles
            expect(result.eventsWithTitle).toBe(2);
            expect(result.eventsWithDate).toBe(2);
            expect(result.eventsWithLocation).toBe(2);
            expect(result.eventsWithRegistration).toBe(1); // Only first event has registration
            expect(result.issues).toContain('Event 2: Missing registration link');
        });
    });

    describe('isProperlyConfigured', () => {
        it('should return true when properly configured', () => {
            // Arrange
            service.searchUrl = 'https://test.mysideline.com';
            service.timeout = 60000;
            service.parserService = mockParserService;

            // Act
            const result = service.isProperlyConfigured();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when missing configuration', () => {
            // Arrange
            service.searchUrl = null;
            service.timeout = 5000;
            service.parserService = null;

            // Act
            const result = service.isProperlyConfigured();

            // Assert
            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith('❌ MySidelineScraperService configuration issues:');
        });
    });

    describe('getConfigurationInfo', () => {
        it('should return configuration information', () => {
            // Act
            const result = service.getConfigurationInfo();

            // Assert
            expect(result).toHaveProperty('searchUrl');
            expect(result).toHaveProperty('timeout');
            expect(result).toHaveProperty('retryCount');
            expect(result).toHaveProperty('requestDelay');
            expect(result).toHaveProperty('useHeadlessBrowser');
            expect(result).toHaveProperty('enableScraping');
            expect(result).toHaveProperty('useMockData');
            expect(result).toHaveProperty('parserServiceInitialized');
        });
    });

    describe('utility methods', () => {
        describe('cleanTextContent', () => {
            it('should clean text content', () => {
                // Arrange
                const dirtyText = '  Multiple   spaces\n\nNew lines\t\tTabs  ';

                // Act
                const result = service.cleanTextContent(dirtyText);

                // Assert
                expect(result).toBe('Multiple spaces New lines Tabs');
            });

            it('should handle empty or null text', () => {
                // Act & Assert
                expect(service.cleanTextContent('')).toBe('');
                expect(service.cleanTextContent(null)).toBe('');
                expect(service.cleanTextContent(undefined)).toBe('');
            });
        });

        describe('extractDatesFromText', () => {
            it('should extract dates from text', () => {
                // Arrange
                const text = 'Event on 15/08/2025 and also on Jan 20, 2025';

                // Act
                const result = service.extractDatesFromText(text);

                // Assert
                expect(result).toContain('15/08/2025');
                expect(result).toContain('Jan 20, 2025');
            });
        });

        describe('extractTimesFromText', () => {
            it('should extract times from text', () => {
                // Arrange
                const text = 'Event starts at 9:00 AM and ends at 5:30 PM';

                // Act
                const result = service.extractTimesFromText(text);

                // Assert
                expect(result).toContain('9:00 AM');
                expect(result).toContain('5:30 PM');
            });
        });

        describe('extractContactInfo', () => {
            it('should extract contact information', () => {
                // Arrange
                const text = 'Contact us at test@example.com or call 02 1234 5678. Visit https://example.com';

                // Act
                const result = service.extractContactInfo(text);

                // Assert
                expect(result.emails).toContain('test@example.com');
                expect(result.phones).toContain('02 1234 5678');
                expect(result.websites).toContain('https://example.com');
            });
        });

        describe('extractVenueInfo', () => {
            it('should extract venue information', () => {
                // Arrange
                const text = 'Event at Central Park and address is 123 Main Street';

                // Act
                const result = service.extractVenueInfo(text);

                // Assert
                expect(result.locations).toContain('Central Park');
                expect(result.addresses).toContain('123 Main Street');
            });
        });

        describe('extractFeeInfo', () => {
            it('should extract fee information', () => {
                // Arrange
                const text = 'Registration fee: $50.00 and entry costs $25';

                // Act
                const result = service.extractFeeInfo(text);

                // Assert
                expect(result).toContain('$50.00');
                expect(result).toContain('$25');
            });
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete scraping workflow', async () => {
            // Arrange
            service.useMockData = false;
            service.enableScraping = true;
            
            const mockEvents = [{
                title: 'Masters Event',
                date: new Date('2025-08-15'),
                state: 'NSW'
            }];
            
            jest.spyOn(service, 'fetchEventsWithBrowser').mockResolvedValue(mockEvents);

            // Act
            const result = await service.scrapeEvents();

            // Assert
            expect(result).toEqual(mockEvents);
            expect(service.fetchEventsWithBrowser).toHaveBeenCalled();
        });

        it('should handle browser automation failure gracefully', async () => {
            // Arrange
            service.useMockData = false;
            service.enableScraping = true;
            
            jest.spyOn(service, 'fetchEventsWithBrowser').mockRejectedValue(new Error('Browser failed'));

            // Act
            const result = await service.scrapeEvents();

            // Assert
            expect(result).toEqual([]);
            expect(console.error).toHaveBeenCalledWith('Failed to scrape MySideline events:', 'Browser failed');
        });
    });
});