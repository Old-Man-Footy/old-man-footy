const mySidelineService = require('../services/mySidelineService');

// Mock the browser automation to avoid actual web scraping in tests
jest.mock('puppeteer', () => ({
    launch: jest.fn(() => ({
        newPage: jest.fn(() => ({
            goto: jest.fn(),
            evaluate: jest.fn(),
            click: jest.fn(),
            waitForNavigation: jest.fn(),
            setRequestInterception: jest.fn(),
            on: jest.fn(),
            close: jest.fn()
        })),
        close: jest.fn()
    }))
}));

describe('MySideline Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('extractEventIdFromUrl', () => {
        test('should extract event ID from standard registration URL', () => {
            // Arrange
            const url = 'https://profile.mysideline.com.au/register/12345';
            
            // Act
            const eventId = mySidelineService.extractEventIdFromUrl(url);
            
            // Assert
            expect(eventId).toBe('12345');
        });

        test('should extract event ID from event URL with parameters', () => {
            // Arrange
            const url = 'https://profile.mysideline.com.au/event/67890?param=value';
            
            // Act
            const eventId = mySidelineService.extractEventIdFromUrl(url);
            
            // Assert
            expect(eventId).toBe('67890');
        });

        test('should extract event ID from query parameter', () => {
            // Arrange
            const url = 'https://profile.mysideline.com.au/register?eventid=54321&other=param';
            
            // Act
            const eventId = mySidelineService.extractEventIdFromUrl(url);
            
            // Assert
            expect(eventId).toBe('54321');
        });

        test('should return null for URL without event ID', () => {
            // Arrange
            const url = 'https://profile.mysideline.com.au/about';
            
            // Act
            const eventId = mySidelineService.extractEventIdFromUrl(url);
            
            // Assert
            expect(eventId).toBeNull();
        });
    });

    describe('captureRegistrationLinks', () => {
        test('should return empty array when no registration buttons found', async () => {
            // Arrange
            const mockPage = {
                goto: jest.fn(),
                evaluate: jest.fn().mockResolvedValue([]),
                setRequestInterception: jest.fn(),
                on: jest.fn(),
                close: jest.fn()
            };
            const mockBrowser = {
                newPage: jest.fn().mockResolvedValue(mockPage),
                close: jest.fn()
            };
            require('puppeteer').launch.mockResolvedValue(mockBrowser);

            // Act
            const result = await mySidelineService.captureRegistrationLinks('https://test.com');

            // Assert
            expect(result).toEqual([]);
            expect(mockPage.goto).toHaveBeenCalledWith('https://test.com', expect.any(Object));
        });

        test('should handle browser errors gracefully', async () => {
            // Arrange
            require('puppeteer').launch.mockRejectedValue(new Error('Browser launch failed'));

            // Act & Assert
            await expect(mySidelineService.captureRegistrationLinks('https://test.com'))
                .rejects.toThrow('Browser launch failed');
        });
    });
});