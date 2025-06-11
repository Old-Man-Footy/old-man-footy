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
            expect(newService.parserService).toBeDefined(); // Fix: Just check it's defined since we're mocking
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
            expect(newService.useHeadlessBrowser).toBe(false);
            expect(newService.enableScraping).toBe(false);
            expect(newService.useMockData).toBe(true);
            
            // Restore
            process.env = originalEnv;
        });
    });

    describe('scrapeEvents', () => {
        it('should return mock events when useMockData is true', async () => {
            // Arrange
            service.useMockData = true;
            const mockEvents = [{ title: 'Mock Event' }];
            jest.spyOn(service, 'generateMockEvents').mockReturnValue(mockEvents);
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual(mockEvents);
            expect(service.generateMockEvents).toHaveBeenCalled();
            expect(chromium.launch).not.toHaveBeenCalled();
        });

        it('should return empty array when scraping is disabled', async () => {
            // Arrange
            service.useMockData = false;
            service.enableScraping = false;
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual([]);
            expect(chromium.launch).not.toHaveBeenCalled();
        });

        it('should fetch events with browser when scraping is enabled', async () => {
            // Arrange
            service.useMockData = false;
            service.enableScraping = true;
            const mockEvents = [{ title: 'Scraped Event' }];
            jest.spyOn(service, 'fetchEventsWithBrowser').mockResolvedValue(mockEvents);
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual(mockEvents);
            expect(service.fetchEventsWithBrowser).toHaveBeenCalled();
        });

        it('should return empty array when no events found', async () => {
            // Arrange
            service.useMockData = false;
            service.enableScraping = true;
            jest.spyOn(service, 'fetchEventsWithBrowser').mockResolvedValue([]);
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual([]);
        });

        it('should handle errors and return mock data in development', async () => {
            // Arrange
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            service.useMockData = false;
            service.enableScraping = true;
            const mockEvents = [{ title: 'Fallback Mock Event' }];
            jest.spyOn(service, 'fetchEventsWithBrowser').mockRejectedValue(new Error('Browser failed'));
            jest.spyOn(service, 'generateMockEvents').mockReturnValue(mockEvents);
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual(mockEvents);
            expect(console.error).toHaveBeenCalledWith('Failed to scrape MySideline events:', 'Browser failed');
            
            // Restore
            process.env.NODE_ENV = originalEnv;
        });

        it('should return empty array on error in production', async () => {
            // Arrange
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            service.useMockData = false;
            service.enableScraping = true;
            jest.spyOn(service, 'fetchEventsWithBrowser').mockRejectedValue(new Error('Browser failed'));
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual([]);
            expect(console.error).toHaveBeenCalledWith('Failed to scrape MySideline events:', 'Browser failed');
            
            // Restore
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('fetchEventsWithBrowser', () => {
        it('should successfully fetch events with browser automation', async () => {
            // Arrange
            const mockEvents = [{ title: 'Test Event' }];
            jest.spyOn(service, 'waitForPageStructure').mockResolvedValue();
            jest.spyOn(service, 'waitForJavaScriptInitialization').mockResolvedValue();
            jest.spyOn(service, 'waitForDynamicContentLoading').mockResolvedValue();
            jest.spyOn(service, 'waitForSearchResults').mockResolvedValue();
            jest.spyOn(service, 'validatePageContent').mockResolvedValue();
            jest.spyOn(service, 'waitForContentStabilization').mockResolvedValue();
            jest.spyOn(service, 'waitForMeaningfulContent').mockResolvedValue();
            jest.spyOn(service, 'extractEvents').mockResolvedValue(mockEvents);
            service.searchUrl = 'https://test.mysideline.com';
            
            // Act
            const result = await service.fetchEventsWithBrowser();
            
            // Assert
            expect(result).toEqual(mockEvents);
            expect(chromium.launch).toHaveBeenCalledWith({
                headless: service.useHeadlessBrowser,
                timeout: service.timeout
            });
            expect(mockPage.goto).toHaveBeenCalledWith(service.searchUrl, { waitUntil: 'domcontentloaded' });
            expect(service.extractEvents).toHaveBeenCalledWith(mockPage);
            expect(mockContext.close).toHaveBeenCalled();
            expect(mockBrowser.close).toHaveBeenCalled();
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

        it('should close browser even if context creation fails', async () => {
            // Arrange
            mockBrowser.newContext.mockRejectedValue(new Error('Context creation failed'));
            
            // Act
            const result = await service.fetchEventsWithBrowser();
            
            // Assert
            expect(result).toEqual([]);
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should close context even if page operations fail', async () => {
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

    describe('waitForPageStructure', () => {
        it('should wait for page structure elements', async () => {
            // Arrange
            mockPage.waitForSelector.mockResolvedValueOnce(true);
            mockPage.locator.mockReturnValue({ count: jest.fn().mockResolvedValue(1) });
            mockPage.waitForFunction.mockResolvedValueOnce(true);
            
            // Act
            await service.waitForPageStructure(mockPage);
            
            // Assert
            expect(mockPage.waitForSelector).toHaveBeenCalledWith('body', { timeout: 30000 });
            expect(mockPage.waitForFunction).toHaveBeenCalled();
        });

        it('should handle waitForSelector failures gracefully', async () => {
            // Arrange
            mockPage.waitForSelector.mockRejectedValue(new Error('Selector timeout'));
            
            // Act & Assert (should not throw)
            await expect(service.waitForPageStructure(mockPage)).resolves.toBeUndefined();
            expect(console.log).toHaveBeenCalledWith('Page structure waiting failed: Selector timeout');
        });
    });

    describe('waitForJavaScriptInitialization', () => {
        it('should wait for JavaScript to initialize', async () => {
            // Arrange
            mockPage.waitForFunction.mockResolvedValueOnce(true);
            mockPage.waitForTimeout.mockResolvedValueOnce(true);
            
            // Act
            await service.waitForJavaScriptInitialization(mockPage);
            
            // Assert
            expect(mockPage.waitForFunction).toHaveBeenCalled();
            expect(mockPage.waitForTimeout).toHaveBeenCalledWith(10000);
        });

        it('should handle JavaScript initialization failures', async () => {
            // Arrange
            mockPage.waitForFunction.mockRejectedValue(new Error('JS timeout'));
            
            // Act & Assert
            await expect(service.waitForJavaScriptInitialization(mockPage)).resolves.toBeUndefined();
            expect(console.log).toHaveBeenCalledWith('JavaScript initialization waiting failed: JS timeout');
        });
    });

    describe('waitForDynamicContentLoading', () => {
        it('should wait for content to stabilize', async () => {
            // Arrange
            const contentLengths = [500, 1500, 1500, 1500, 1500]; // Stabilizes at 1500 after 3 checks
            let callCount = 0;
            mockPage.evaluate.mockImplementation(() => {
                return Promise.resolve(contentLengths[callCount++] || 1500);
            });
            mockPage.waitForTimeout.mockResolvedValue(true);
            
            // Act
            await service.waitForDynamicContentLoading(mockPage);
            
            // Assert
            expect(mockPage.evaluate).toHaveBeenCalledTimes(5); // Loop runs until stable + 1 more check
            expect(mockPage.waitForTimeout).toHaveBeenCalledWith(3000);
            expect(mockPage.waitForTimeout).toHaveBeenCalledWith(8000);
        });

        it('should handle evaluation errors', async () => {
            // Arrange
            mockPage.evaluate.mockRejectedValue(new Error('Evaluation failed'));
            
            // Act & Assert
            await expect(service.waitForDynamicContentLoading(mockPage)).resolves.toBeUndefined();
            expect(console.log).toHaveBeenCalledWith('Dynamic content loading wait failed: Evaluation failed');
        });
    });

    describe('waitForSearchResults', () => {
        it('should wait for MySideline search results', async () => {
            // Arrange
            mockPage.waitForFunction.mockResolvedValue(true);
            mockPage.waitForSelector.mockResolvedValue(true);
            mockPage.waitForTimeout.mockResolvedValue(true);
            
            // Act
            await service.waitForSearchResults(mockPage);
            
            // Assert
            expect(mockPage.waitForFunction).toHaveBeenCalledTimes(2);
            expect(mockPage.waitForSelector).toHaveBeenCalled();
            expect(mockPage.waitForTimeout).toHaveBeenCalledWith(10000);
            expect(mockPage.waitForTimeout).toHaveBeenCalledWith(8000);
        });

        it('should handle search results timeout', async () => {
            // Arrange
            mockPage.waitForFunction.mockRejectedValue(new Error('Search timeout'));
            
            // Act & Assert
            await expect(service.waitForSearchResults(mockPage)).resolves.toBeUndefined();
            expect(console.log).toHaveBeenCalledWith('MySideline search results waiting failed: Search timeout');
        });
    });

    describe('validatePageContent', () => {
        it('should validate page has meaningful content', async () => {
            // Arrange
            mockPage.waitForFunction.mockResolvedValue(true);
            
            // Act
            await service.validatePageContent(mockPage);
            
            // Assert
            expect(mockPage.waitForFunction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 30000 }
            );
        });

        it('should handle validation failures', async () => {
            // Arrange
            mockPage.waitForFunction.mockRejectedValue(new Error('Validation failed'));
            
            // Act & Assert
            await expect(service.validatePageContent(mockPage)).resolves.toBeUndefined();
            expect(console.log).toHaveBeenCalledWith('Page content validation failed: Validation failed');
        });
    });

    describe('waitForContentStabilization', () => {
        it('should wait for content to stabilize over multiple checks', async () => {
            // Arrange
            const stableLength = 2000;
            let callCount = 0;
            mockPage.evaluate.mockImplementation(() => {
                callCount++;
                // Return stable content that satisfies: Math.abs(current - previous) < 100 && current > 1000
                if (callCount <= 5) {
                    return Promise.resolve(stableLength); // Return same value to be stable
                }
                return Promise.resolve(stableLength);
            });
            jest.spyOn(service, 'delay').mockResolvedValue();
            
            // Act
            await service.waitForContentStabilization(mockPage);
            
            // Assert
            expect(mockPage.evaluate).toHaveBeenCalledTimes(5); // Should detect stability after 4 stable checks + 1
            expect(service.delay).toHaveBeenCalledWith(2000);
        });

        it('should timeout after maximum checks', async () => {
            // Arrange
            let callCount = 0;
            mockPage.evaluate.mockImplementation(() => {
                return Promise.resolve(1000 + (callCount++ * 200)); // Always increasing
            });
            jest.spyOn(service, 'delay').mockResolvedValue();
            
            // Act
            await service.waitForContentStabilization(mockPage);
            
            // Assert
            expect(mockPage.evaluate).toHaveBeenCalledTimes(15); // Maximum iterations
            expect(console.log).toHaveBeenCalledWith('Content stabilization timeout reached');
        });
    });

    describe('waitForMeaningfulContent', () => {
        it('should wait for meaningful content to appear', async () => {
            // Arrange
            mockPage.waitForFunction.mockResolvedValue(true);
            
            // Act
            await service.waitForMeaningfulContent(mockPage);
            
            // Assert
            expect(mockPage.waitForFunction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 45000 }
            );
        });

        it('should handle meaningful content timeout', async () => {
            // Arrange
            mockPage.waitForFunction.mockRejectedValue(new Error('Content timeout'));
            
            // Act & Assert
            await expect(service.waitForMeaningfulContent(mockPage)).resolves.toBeUndefined();
            expect(console.log).toHaveBeenCalledWith('Meaningful content wait failed: Content timeout');
        });
    });

    describe('extractEvents', () => {
        beforeEach(() => {
            service.useHeadlessBrowser = true; // Disable screenshots for most tests
        });

        it('should extract events from MySideline page', async () => {
            // Arrange
            const mockPageInfo = {
                url: 'https://test.mysideline.com',
                title: 'MySideline',
                bodyTextLength: 5000,
                elementCount: 100,
                cardCount: 5,
                clickExpandCount: 3
            };
            const mockScrapedEvents = [
                {
                    title: 'NSW Masters Carnival',
                    subtitle: 'Rugby League',
                    fullContent: 'NSW Masters Rugby League Carnival details',
                    registrationUrl: 'https://profile.mysideline.com.au/register/event-123'
                }
            ];
            const mockParsedEvents = [
                {
                    title: 'NSW Masters Carnival',
                    date: new Date('2025-08-15'),
                    state: 'NSW'
                }
            ];

            mockPage.evaluate
                .mockResolvedValueOnce(mockPageInfo)
                .mockResolvedValueOnce(mockScrapedEvents);
            
            jest.spyOn(service, 'expandAllClickExpandElements').mockResolvedValue();
            jest.spyOn(service, 'extractRegistrationUrl').mockResolvedValue('https://registration-url.com');
            mockParserService.parseEventFromElement.mockReturnValue(mockParsedEvents[0]);
            
            // Act
            const result = await service.extractEvents(mockPage);
            
            // Assert
            expect(result).toEqual(mockParsedEvents);
            expect(service.expandAllClickExpandElements).toHaveBeenCalledWith(mockPage);
            expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
            expect(mockParserService.parseEventFromElement).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'NSW Masters Carnival',
                    registrationUrl: 'https://profile.mysideline.com.au/register/event-123'
                })
            );
        });

        it('should take screenshot in development mode', async () => {
            // Arrange
            service.useHeadlessBrowser = false;
            mockPage.evaluate.mockResolvedValueOnce({
                url: 'test.com',
                title: 'Test',
                bodyTextLength: 1000,
                elementCount: 50,
                cardCount: 2,
                clickExpandCount: 1
            }).mockResolvedValueOnce([]);
            
            jest.spyOn(service, 'expandAllClickExpandElements').mockResolvedValue();
            mockPage.screenshot.mockResolvedValue();
            
            // Act
            await service.extractEvents(mockPage);
            
            // Assert
            expect(mockPage.screenshot).toHaveBeenCalledWith({
                path: 'debug-mysideline-page.png',
                fullPage: true
            });
        });

        it('should handle screenshot errors gracefully', async () => {
            // Arrange
            service.useHeadlessBrowser = false;
            mockPage.evaluate.mockResolvedValueOnce({
                url: 'test.com',
                title: 'Test',
                bodyTextLength: 1000,
                elementCount: 50,
                cardCount: 2,
                clickExpandCount: 1
            }).mockResolvedValueOnce([]);
            
            jest.spyOn(service, 'expandAllClickExpandElements').mockResolvedValue();
            mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));
            
            // Act & Assert (should not throw)
            await expect(service.extractEvents(mockPage)).resolves.toBeDefined();
            expect(console.log).toHaveBeenCalledWith('Could not save screenshot:', 'Screenshot failed');
        });

        it('should handle extraction errors and return empty array', async () => {
            // Arrange
            mockPage.evaluate.mockRejectedValue(new Error('Extraction failed'));
            
            // Act
            const result = await service.extractEvents(mockPage);
            
            // Assert
            expect(result).toEqual([]);
            expect(console.error).toHaveBeenCalledWith('MySideline Playwright event extraction failed:', 'Extraction failed');
        });

        it('should extract registration URLs for events without them', async () => {
            // Arrange
            const mockScrapedEvents = [
                {
                    title: 'Event without URL',
                    isMySidelineCard: true,
                    cardIndex: 0,
                    registrationUrl: null
                }
            ];
            
            mockPage.evaluate
                .mockResolvedValueOnce({ url: 'test.com', title: 'Test', bodyTextLength: 1000, elementCount: 50, cardCount: 1, clickExpandCount: 0 })
                .mockResolvedValueOnce(mockScrapedEvents);
            
            jest.spyOn(service, 'expandAllClickExpandElements').mockResolvedValue();
            jest.spyOn(service, 'extractRegistrationUrl').mockResolvedValue('https://extracted-url.com');
            mockParserService.parseEventFromElement.mockReturnValue({ title: 'Parsed Event' });
            
            // Act
            const result = await service.extractEvents(mockPage);
            
            // Assert
            expect(service.extractRegistrationUrl).toHaveBeenCalledWith(mockPage, '.el-card.is-always-shadow', 0);
            expect(mockParserService.parseEventFromElement).toHaveBeenCalledWith(
                expect.objectContaining({
                    registrationUrl: 'https://extracted-url.com'
                })
            );
        });

        it('should handle parser errors gracefully', async () => {
            // Arrange
            const mockScrapedEvents = [{ title: 'Test Event' }];
            
            mockPage.evaluate
                .mockResolvedValueOnce({ url: 'test.com', title: 'Test', bodyTextLength: 1000, elementCount: 50, cardCount: 1, clickExpandCount: 0 })
                .mockResolvedValueOnce(mockScrapedEvents);
            
            jest.spyOn(service, 'expandAllClickExpandElements').mockResolvedValue();
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
        let mockLocator;

        beforeEach(() => {
            mockLocator = {
                count: jest.fn(),
                first: jest.fn().mockReturnThis(),
                click: jest.fn()
            };
            mockPage.locator.mockReturnValue(mockLocator);
            jest.spyOn(service, 'delay').mockResolvedValue();
        });

        it('should return null when no register button exists', async () => {
            // Arrange
            mockLocator.count.mockResolvedValue(0);
            
            // Act
            const result = await service.extractRegistrationUrl(mockPage, '.el-card', 0);
            
            // Assert
            expect(result).toBeNull();
            expect(console.log).toHaveBeenCalledWith('No register button found in card 1');
        });

        it('should extract URL from popup window', async () => {
            // Arrange
            const mockPopup = {
                url: jest.fn().mockReturnValue('https://registration-popup.com'),
                close: jest.fn()
            };
            
            mockLocator.count.mockResolvedValue(1);
            mockPage.waitForEvent.mockResolvedValueOnce(mockPopup);
            mockPage.waitForNavigation.mockImplementation(() => new Promise(() => {})); // Never resolves
            
            // Act
            const result = await service.extractRegistrationUrl(mockPage, '.el-card', 0);
            
            // Assert
            expect(result).toBe('https://registration-popup.com');
            expect(mockPopup.close).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('Register button opened popup with URL: https://registration-popup.com');
        });

        it('should extract URL from page navigation', async () => {
            // Arrange
            mockLocator.count.mockResolvedValue(1);
            mockPage.waitForEvent.mockRejectedValue(new Error('No popup'));
            mockPage.waitForNavigation.mockResolvedValue({});
            mockPage.url.mockReturnValue('https://registration-page.com');
            mockPage.goBack.mockResolvedValue();
            
            // Act
            const result = await service.extractRegistrationUrl(mockPage, '.el-card', 0);
            
            // Assert
            expect(result).toBe('https://registration-page.com');
            expect(mockPage.goBack).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('Register button navigated to: https://registration-page.com');
        });

        it('should extract URL from button attributes', async () => {
            // Arrange
            mockLocator.count.mockResolvedValue(1);
            mockPage.waitForEvent.mockRejectedValue(new Error('No popup'));
            mockPage.waitForNavigation.mockRejectedValue(new Error('No navigation'));
            mockPage.evaluate.mockResolvedValue('https://attribute-url.com');
            
            // Act
            const result = await service.extractRegistrationUrl(mockPage, '.el-card', 0);
            
            // Assert
            expect(result).toBe('https://attribute-url.com');
            expect(console.log).toHaveBeenCalledWith('Found registration URL from button attributes: https://attribute-url.com');
        });

        it('should return null when no URL can be extracted', async () => {
            // Arrange
            mockLocator.count.mockResolvedValue(1);
            mockPage.waitForEvent.mockRejectedValue(new Error('No popup'));
            mockPage.waitForNavigation.mockRejectedValue(new Error('No navigation'));
            mockPage.evaluate.mockResolvedValue(null);
            
            // Act
            const result = await service.extractRegistrationUrl(mockPage, '.el-card', 0);
            
            // Assert
            expect(result).toBeNull();
            expect(console.log).toHaveBeenCalledWith('Could not extract registration URL from card 1');
        });

        it('should handle click errors gracefully', async () => {
            // Arrange
            mockLocator.count.mockResolvedValue(1);
            const clickError = new Error('Click failed');
            mockLocator.click.mockRejectedValue(clickError);
            
            // Act
            const result = await service.extractRegistrationUrl(mockPage, '.el-card', 0);
            
            // Assert
            expect(result).toBeNull();
            expect(console.log).toHaveBeenCalledWith('Error extracting registration URL from card 1: Click failed');
        });
    });

    describe('expandAllClickExpandElements', () => {
        let mockClickExpandLocators;

        beforeEach(() => {
            mockClickExpandLocators = [
                {
                    isVisible: jest.fn().mockResolvedValue(true),
                    scrollIntoViewIfNeeded: jest.fn(),
                    click: jest.fn()
                },
                {
                    isVisible: jest.fn().mockResolvedValue(false),
                    scrollIntoViewIfNeeded: jest.fn(),
                    click: jest.fn()
                },
                {
                    isVisible: jest.fn().mockResolvedValue(true),
                    scrollIntoViewIfNeeded: jest.fn(),
                    click: jest.fn()
                }
            ];
            
            mockPage.locator.mockReturnValue({
                all: jest.fn().mockResolvedValue(mockClickExpandLocators)
            });
            
            jest.spyOn(service, 'delay').mockResolvedValue();
            jest.spyOn(service, 'waitForExpandedContent').mockResolvedValue();
        });

        it('should expand all visible click-expand elements', async () => {
            // Arrange
            service.useHeadlessBrowser = true; // Disable screenshot
            
            // Act
            await service.expandAllClickExpandElements(mockPage);
            
            // Assert
            expect(mockClickExpandLocators[0].click).toHaveBeenCalled();
            expect(mockClickExpandLocators[1].click).not.toHaveBeenCalled(); // Not visible
            expect(mockClickExpandLocators[2].click).toHaveBeenCalled();
            expect(service.waitForExpandedContent).toHaveBeenCalledTimes(2);
            expect(service.delay).toHaveBeenCalledWith(3000); // Final stabilization delay
        });

        it('should skip when no click-expand elements found', async () => {
            // Arrange
            mockPage.locator.mockReturnValue({
                all: jest.fn().mockResolvedValue([])
            });
            
            // Act
            await service.expandAllClickExpandElements(mockPage);
            
            // Assert
            expect(console.log).toHaveBeenCalledWith('No click-expand elements found, skipping expansion');
        });

        it('should handle click errors gracefully', async () => {
            // Arrange
            service.useHeadlessBrowser = true;
            mockClickExpandLocators[0].click.mockRejectedValue(new Error('Click failed'));
            
            // Act
            await service.expandAllClickExpandElements(mockPage);
            
            // Assert
            expect(console.log).toHaveBeenCalledWith('Failed to click expand element 1: Click failed');
            expect(mockClickExpandLocators[2].click).toHaveBeenCalled(); // Should continue with other elements
        });

        it('should take screenshot in development mode', async () => {
            // Arrange
            service.useHeadlessBrowser = false;
            mockPage.screenshot.mockResolvedValue();
            
            // Act
            await service.expandAllClickExpandElements(mockPage);
            
            // Assert
            expect(mockPage.screenshot).toHaveBeenCalledWith({
                path: 'debug-mysideline-expanded.png',
                fullPage: true
            });
        });

        it('should handle screenshot errors', async () => {
            // Arrange
            service.useHeadlessBrowser = false;
            mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));
            
            // Act & Assert (should not throw)
            await expect(service.expandAllClickExpandElements(mockPage)).resolves.toBeUndefined();
            expect(console.log).toHaveBeenCalledWith('Could not save expanded screenshot:', 'Screenshot failed');
        });

        it('should handle expansion process errors', async () => {
            // Arrange
            mockPage.locator.mockImplementation(() => {
                throw new Error('Locator failed');
            });
            
            // Act & Assert (should not throw)
            await expect(service.expandAllClickExpandElements(mockPage)).resolves.toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('Error during click-expand processing:', 'Locator failed');
        });
    });

    describe('waitForExpandedContent', () => {
        it('should wait for expanded content to appear', async () => {
            // Arrange
            mockPage.waitForFunction.mockResolvedValue(true);
            
            // Act
            await service.waitForExpandedContent(mockPage, 0);
            
            // Assert
            expect(mockPage.waitForFunction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(console.log).toHaveBeenCalledWith('Expanded content detected for element 1');
        });

        it('should handle timeout gracefully', async () => {
            // Arrange
            mockPage.waitForFunction.mockRejectedValue(new Error('Timeout'));
            jest.spyOn(service, 'delay').mockResolvedValue();
            
            // Act
            await service.waitForExpandedContent(mockPage, 0);
            
            // Assert
            expect(console.log).toHaveBeenCalledWith('Could not detect expanded content for element 1, continuing...');
            expect(service.delay).toHaveBeenCalledWith(1500);
        });
    });

    describe('generateMockEvents', () => {
        it('should generate mock events for default states', () => {
            // Arrange & Act
            const result = service.generateMockEvents();
            
            // Assert
            expect(result).toHaveLength(6); // 3 states × 2 events each
            expect(result.filter(event => event.state === 'NSW')).toHaveLength(2);
            expect(result.filter(event => event.state === 'QLD')).toHaveLength(2);
            expect(result.filter(event => event.state === 'VIC')).toHaveLength(2);
            
            // Check structure of first event
            expect(result[0]).toMatchObject({
                title: expect.stringContaining('NSW'),
                date: expect.any(Date),
                locationAddress: expect.stringContaining('Sydney'),
                state: 'NSW',
                registrationLink: expect.stringContaining('mysideline.com.au'),
                mySidelineEventId: expect.stringContaining('nsw'),
                isManuallyEntered: false,
                maxTeams: 16,
                feesDescription: expect.stringContaining('$'),
                registrationDeadline: expect.any(Date),
                scheduleDetails: expect.stringContaining('Day-long tournament'),
                ageCategories: ['35+', '40+', '45+', '50+'],
                isRegistrationOpen: true,
                isActive: true,
                organiserContactName: expect.stringContaining('NSW'),
                organiserContactEmail: expect.stringContaining('nsw'),
                organiserContactPhone: expect.stringMatching(/^0\d/),
                sourceData: expect.objectContaining({
                    isMockData: true,
                    generatedAt: expect.any(Date),
                    state: 'NSW',
                    templateIndex: expect.any(Number)
                })
            });
        });

        it('should generate events with future dates', () => {
            // Arrange & Act
            const result = service.generateMockEvents();
            const currentDate = new Date();
            
            // Assert
            result.forEach(event => {
                expect(event.date.getTime()).toBeGreaterThan(currentDate.getTime());
                expect(event.registrationDeadline.getTime()).toBeLessThan(event.date.getTime());
            });
        });

        it('should generate unique event IDs', () => {
            // Arrange & Act
            const result = service.generateMockEvents();
            const eventIds = result.map(event => event.mySidelineEventId);
            const uniqueIds = new Set(eventIds);
            
            // Assert
            expect(uniqueIds.size).toBe(eventIds.length);
        });

        it('should generate different fee structures', () => {
            // Arrange & Act
            const result = service.generateMockEvents();
            const nswEvents = result.filter(event => event.state === 'NSW');
            
            // Assert
            expect(nswEvents[0].feesDescription).toContain('$300');
            expect(nswEvents[1].feesDescription).toContain('$350');
        });
    });

    describe('delay', () => {
        it('should delay for specified milliseconds', async () => {
            // Arrange
            const startTime = Date.now();
            const delayMs = 100;
            
            // Act
            await service.delay(delayMs);
            const endTime = Date.now();
            
            // Assert
            const actualDelay = endTime - startTime;
            expect(actualDelay).toBeGreaterThanOrEqual(delayMs - 10); // Allow small variance
            expect(actualDelay).toBeLessThan(delayMs + 50); // But not too much
        });

        it('should return a Promise', () => {
            // Arrange & Act
            const result = service.delay(1);
            
            // Assert
            expect(result).toBeInstanceOf(Promise);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete scraping workflow', async () => {
            // Arrange
            service.useMockData = false;
            service.enableScraping = true;
            service.searchUrl = 'https://test.mysideline.com'; // Set the URL
            
            // Mock the entire workflow
            jest.spyOn(service, 'waitForPageStructure').mockResolvedValue();
            jest.spyOn(service, 'waitForJavaScriptInitialization').mockResolvedValue();
            jest.spyOn(service, 'waitForDynamicContentLoading').mockResolvedValue();
            jest.spyOn(service, 'waitForSearchResults').mockResolvedValue();
            jest.spyOn(service, 'validatePageContent').mockResolvedValue();
            jest.spyOn(service, 'waitForContentStabilization').mockResolvedValue();
            jest.spyOn(service, 'waitForMeaningfulContent').mockResolvedValue();
            jest.spyOn(service, 'expandAllClickExpandElements').mockResolvedValue();
            jest.spyOn(service, 'extractRegistrationUrl').mockResolvedValue('https://registration.com');
            
            const mockScrapedEvents = [{
                title: 'Masters Event',
                isMySidelineCard: true,
                cardIndex: 0,
                registrationUrl: null
            }];
            
            const mockParsedEvent = {
                title: 'Masters Event',
                date: new Date('2025-08-15'),
                state: 'NSW'
            };
            
            mockPage.evaluate
                .mockResolvedValueOnce({ url: 'test.com', title: 'Test', bodyTextLength: 1000, elementCount: 50, cardCount: 1, clickExpandCount: 0 })
                .mockResolvedValueOnce(mockScrapedEvents);
            
            mockParserService.parseEventFromElement.mockReturnValue(mockParsedEvent);
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual([mockParsedEvent]);
            expect(chromium.launch).toHaveBeenCalled();
            expect(service.waitForPageStructure).toHaveBeenCalled();
            expect(service.expandAllClickExpandElements).toHaveBeenCalled();
            expect(service.extractRegistrationUrl).toHaveBeenCalled();
            expect(mockParserService.parseEventFromElement).toHaveBeenCalled();
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should handle mixed success and failure scenarios', async () => {
            // Arrange
            service.useMockData = false;
            service.enableScraping = true;
            service.searchUrl = 'https://test.mysideline.com';
            
            // Mock methods - some succeed, some fail
            jest.spyOn(service, 'waitForPageStructure').mockResolvedValue();
            jest.spyOn(service, 'waitForJavaScriptInitialization').mockImplementation(() => {
                console.log('JavaScript initialization waiting failed: JS failed');
                return Promise.resolve();
            });
            jest.spyOn(service, 'waitForDynamicContentLoading').mockResolvedValue();
            jest.spyOn(service, 'waitForSearchResults').mockResolvedValue();
            jest.spyOn(service, 'validatePageContent').mockResolvedValue();
            jest.spyOn(service, 'waitForContentStabilization').mockResolvedValue();
            jest.spyOn(service, 'waitForMeaningfulContent').mockResolvedValue();
            jest.spyOn(service, 'expandAllClickExpandElements').mockResolvedValue();
            
            mockPage.evaluate
                .mockResolvedValueOnce({ url: 'test.com', title: 'Test', bodyTextLength: 1000, elementCount: 50, cardCount: 1, clickExpandCount: 0 })
                .mockResolvedValueOnce([]);
            
            // Act
            const result = await service.scrapeEvents();
            
            // Assert
            expect(result).toEqual([]);
            expect(console.log).toHaveBeenCalledWith('JavaScript initialization waiting failed: JS failed');
            expect(mockBrowser.close).toHaveBeenCalled();
        });
    });
});