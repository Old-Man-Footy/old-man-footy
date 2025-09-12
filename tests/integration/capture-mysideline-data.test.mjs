/**
 * MySideline Capture Script Test Suite
 * Tests the capture-mysideline-data.mjs script functionality
 * 
 * @requires vitest
 * @requires supertest
 */

import { describe, test, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test constants
const MOCK_FIXTURES_DIR = path.join(__dirname, 'fixtures');
const MOCK_CAPTURE_OUTPUT = path.join(MOCK_FIXTURES_DIR, 'mysideline-captured-data.mjs');

/**
 * Mock MySideline scraper service for testing
 */
class MockMySidelineScraperService {
    constructor() {
        this.mockCarnivals = [];
        this.shouldThrow = false;
        this.throwMessage = 'Mock error';
    }

    setMockCarnivals(events) {
        this.mockCarnivals = events;
    }

    setShouldThrow(shouldThrow, message = 'Mock error') {
        this.shouldThrow = shouldThrow;
        this.throwMessage = message;
    }

    async scrapeCarnivals() {
        if (this.shouldThrow) {
            throw new Error(this.throwMessage);
        }
        return this.mockCarnivals;
    }
}

// Sample test data
const SAMPLE_MYSIDELINE_EVENTS = [
    {
        title: 'Masters Rugby League Carnival 2025',
        mySidelineId: '123456789',
        mySidelineTitle: 'Masters Rugby League Carnival 2025 - QLD',
        mySidelineAddress: 'Redcliffe, QLD',
        mySidelineDate: new Date('2025-08-15'),
        date: new Date('2025-08-15'),
        locationAddress: 'Redcliffe Recreation Reserve, QLD',
        state: 'QLD',
        organiserContactEmail: 'test@example.com',
        description: 'Annual masters rugby league carnival',
        isActive: true,
        source: 'MySideline',
        clubLogoURL: 'https://example.com/logo.png',
        registrationLink: 'https://profile.mysideline.com.au/register/123456789'
    },
    {
        title: 'NSW Masters Championship',
        mySidelineId: '987654321',
        mySidelineTitle: 'NSW Masters Championship 2025',
        mySidelineAddress: 'Sydney, NSW',
        mySidelineDate: new Date('2025-09-20'),
        date: new Date('2025-09-20'),
        locationAddress: 'ANZ Stadium, Sydney, NSW',
        state: 'NSW',
        organiserContactEmail: 'nsw@example.com',
        description: 'NSW state masters championship',
        isActive: true,
        source: 'MySideline',
        clubLogoURL: null,
        registrationLink: 'https://profile.mysideline.com.au/register/987654321'
    }
];

const SAMPLE_HTML_RESPONSE = `
<!DOCTYPE html>
<html>
<head>
    <title>MySideline - Masters Rugby League</title>
</head>
<body>
    <div class="carnival-list">
        <div class="carnival-item" data-carnival-id="123456789">
            <h3>Masters Rugby League Carnival 2025 - QLD</h3>
            <p>Redcliffe, QLD</p>
        </div>
        <div class="carnival-item" data-carnival-id="987654321">
            <h3>NSW Masters Championship 2025</h3>
            <p>Sydney, NSW</p>
        </div>
    </div>
</body>
</html>
`;

describe('MySideline Capture Script', () => {
    let mockScraperService;
    let originalEnv;
    let mockFetch;
    let captureModule;

    beforeAll(async () => {
        // Backup original environment
        originalEnv = { ...process.env };
        
        // Ensure test fixtures directory exists
        await fs.mkdir(MOCK_FIXTURES_DIR, { recursive: true });
    });

    beforeEach(() => {
        // Reset environment variables
        process.env.MYSIDELINE_URL = 'https://profile.mysideline.com.au/register/clubsearch/?criteria=Masters&source=rugby-league';
        
        // Create fresh mock scraper service
        mockScraperService = new MockMySidelineScraperService();
        
        // Mock fetch for HTML capture
        mockFetch = vi.fn();
        global.fetch = mockFetch;
        
        // Clear all mocks
        vi.clearAllMocks();
    });

    afterEach(async () => {
        // Clean up test files
        try {
            await fs.unlink(MOCK_CAPTURE_OUTPUT);
        } catch (error) {
            // File might not exist, ignore
        }
        
        // Reset mocks
        vi.restoreAllMocks();
        delete global.fetch;
    });

    afterAll(async () => {
        // Restore original environment
        process.env = originalEnv;
        
        // Clean up test fixtures directory
        try {
            await fs.rmdir(MOCK_FIXTURES_DIR, { recursive: true });
        } catch (error) {
            // Directory might not be empty or not exist, ignore
        }
    });

    describe('Successful Data Capture', () => {
        beforeEach(async () => {
            // Mock successful scraper service
            mockScraperService.setMockCarnivals(SAMPLE_MYSIDELINE_EVENTS);
            
            // Mock successful HTML fetch
            mockFetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(SAMPLE_HTML_RESPONSE)
            });

            // Mock the MySidelineScraperService import
            vi.doMock('/services/mySidelineScraperService.mjs', () => ({
                default: class {
                    async scrapeCarnivals() {
                        return mockScraperService.scrapeCarnivals();
                    }
                }
            }));

            // Import the capture module after mocking
            captureModule = await import('../../scripts/capture-mysideline-data.mjs');
        });

        test('should capture MySideline data successfully', async () => {
            // Act
            await captureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert - Check that fixture file was created
            const fixtureExists = await fs.access(MOCK_CAPTURE_OUTPUT)
                .then(() => true)
                .catch(() => false);
            
            expect(fixtureExists).toBe(true);
        });

        test('should generate correct fixture file content', async () => {
            // Act
            await captureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert - Read and validate fixture file content
            const fixtureContent = await fs.readFile(MOCK_CAPTURE_OUTPUT, 'utf8');
            
            expect(fixtureContent).toContain('MYSIDELINE_CAPTURED_EVENTS');
            expect(fixtureContent).toContain('MYSIDELINE_CAPTURED_HTML');
            expect(fixtureContent).toContain('Masters Rugby League Carnival 2025');
            expect(fixtureContent).toContain('NSW Masters Championship');
            expect(fixtureContent).toContain('123456789');
            expect(fixtureContent).toContain('987654321');
        });

        test('should use correct MySideline URL', async () => {
            // Act
            await captureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert - Check that fetch was called with correct URL
            expect(mockFetch).toHaveBeenCalledWith(
                'https://profile.mysideline.com.au/register/clubsearch/?criteria=Masters&source=rugby-league'
            );
        });

        test('should handle HTML capture failure gracefully', async () => {
            // Arrange - Mock HTML fetch failure
            mockFetch.mockRejectedValue(new Error('Network error'));

            // Act & Assert - Should not throw
            await expect(captureModule.captureMySidelineData(MOCK_FIXTURES_DIR)).resolves.not.toThrow();
            
            // Check that fixture was still created (without HTML)
            const fixtureExists = await fs.access(MOCK_CAPTURE_OUTPUT)
                .then(() => true)
                .catch(() => false);
            
            expect(fixtureExists).toBe(true);
        });

        test('should sanitize HTML for template literal inclusion', async () => {
            // Arrange - HTML with template literal characters
            const dangerousHTML = `<script>const x = \`template\`; const y = \${expression};</script>`;
            mockFetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(dangerousHTML)
            });

            // Act
            await captureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert - Check that dangerous characters are escaped
            const fixtureContent = await fs.readFile(MOCK_CAPTURE_OUTPUT, 'utf8');
            expect(fixtureContent).toContain('\\`');  // Escaped backticks
            expect(fixtureContent).toContain('\\${'); // Escaped template expressions
        });
    });

    describe('Empty Carnivals Scenario', () => {
        beforeEach(async () => {
            // Mock empty events response
            mockScraperService.setMockCarnivals([]);
            
            // Mock successful HTML fetch
            mockFetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<html><body><div class="carnival-list"></div></body></html>')
            });

            // Mock the MySidelineScraperService import
            vi.doMock('/services/mySidelineScraperService.mjs', () => ({
                default: class {
                    async scrapeCarnivals() {
                        return mockScraperService.scrapeCarnivals();
                    }
                }
            }));

            captureModule = await import('../../scripts/capture-mysideline-data.mjs');
        });

        test('should handle empty events gracefully', async () => {
            // Act & Assert - Should not throw
            await expect(captureModule.captureMySidelineData(MOCK_FIXTURES_DIR)).resolves.not.toThrow();
        });

        test('should create empty fixture file when no events found', async () => {
            // Act
            await captureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert - Check fixture file was created
            const fixtureExists = await fs.access(MOCK_CAPTURE_OUTPUT)
                .then(() => true)
                .catch(() => false);
            
            expect(fixtureExists).toBe(true);

            // Check content indicates empty result
            const fixtureContent = await fs.readFile(MOCK_CAPTURE_OUTPUT, 'utf8');
            expect(fixtureContent).toContain('EMPTY RESULT');
            expect(fixtureContent).toContain('MYSIDELINE_CAPTURED_EVENTS = []');
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            // Mock scraper service that throws errors
            mockScraperService.setShouldThrow(true, 'MySideline scraping failed');
            
            // Mock HTML fetch failure
            mockFetch.mockRejectedValue(new Error('Network error'));

            // Mock the MySidelineScraperService import
            vi.doMock('/services/mySidelineScraperService.mjs', () => ({
                default: class {
                    async scrapeCarnivals() {
                        return mockScraperService.scrapeCarnivals();
                    }
                }
            }));

            captureModule = await import('../../scripts/capture-mysideline-data.mjs');
        });

        test('should handle scraper service errors', async () => {
            // Act & Assert - Should throw the error
            await expect(captureModule.captureMySidelineData(MOCK_FIXTURES_DIR)).rejects.toThrow('MySideline scraping failed');
        });

        test('should create fallback fixture on error', async () => {
            // Act - Try to capture, expect it to fail
            try {
                await captureModule.captureMySidelineData(MOCK_FIXTURES_DIR);
            } catch (error) {
                // Expected to fail
            }

            // Assert - Check fallback fixture was created
            const fixtureExists = await fs.access(MOCK_CAPTURE_OUTPUT)
                .then(() => true)
                .catch(() => false);
            
            expect(fixtureExists).toBe(true);

            // Check content indicates fallback
            const fixtureContent = await fs.readFile(MOCK_CAPTURE_OUTPUT, 'utf8');
            expect(fixtureContent).toContain('FALLBACK');
            expect(fixtureContent).toContain('MySideline scraping failed');
        });
    });

    describe('Environment Variable Handling', () => {
        test('should use environment variable for MySideline URL', async () => {
            // Arrange
            const customUrl = 'https://custom.mysideline.url/test';
            process.env.MYSIDELINE_URL = customUrl;
            
            mockScraperService.setMockCarnivals([]);
            mockFetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<html></html>')
            });

            vi.doMock('/services/mySidelineScraperService.mjs', () => ({
                default: class {
                    async scrapeCarnivals() {
                        return mockScraperService.scrapeCarnivals();
                    }
                }
            }));

            const freshCaptureModule = await import('../../scripts/capture-mysideline-data.mjs?t=' + Date.now());

            // Act
            await freshCaptureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(customUrl);
        });

        test('should use fallback URL when environment variable not set', async () => {
            // Arrange
            delete process.env.MYSIDELINE_URL;
            
            mockScraperService.setMockCarnivals([]);
            mockFetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<html></html>')
            });

            vi.doMock('/services/mySidelineScraperService.mjs', () => ({
                default: class {
                    async scrapeCarnivals() {
                        return mockScraperService.scrapeCarnivals();
                    }
                }
            }));

            const freshCaptureModule = await import('../../scripts/capture-mysideline-data.mjs?t=' + Date.now());

            // Act
            await freshCaptureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert - Should use fallback URL
            expect(mockFetch).toHaveBeenCalledWith(
                'https://profile.mysideline.com.au/register/clubsearch/?criteria=Masters&source=rugby-league'
            );
        });
    });

    describe('Fixture File Structure', () => {
        beforeEach(async () => {
            mockScraperService.setMockCarnivals(SAMPLE_MYSIDELINE_EVENTS);
            mockFetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(SAMPLE_HTML_RESPONSE)
            });

            vi.doMock('/services/mySidelineScraperService.mjs', () => ({
                default: class {
                    async scrapeCarnivals() {
                        return mockScraperService.scrapeCarnivals();
                    }
                }
            }));

            captureModule = await import('../../scripts/capture-mysideline-data.mjs');
        });

        test('should generate valid JavaScript module', async () => {
            // Act
            await captureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert - Try to import the generated fixture
            const fixtureContent = await fs.readFile(MOCK_CAPTURE_OUTPUT, 'utf8');
            
            // Check for required exports
            expect(fixtureContent).toContain('export const MYSIDELINE_CAPTURED_HTML');
            expect(fixtureContent).toContain('export const MYSIDELINE_CAPTURED_EVENTS');
            expect(fixtureContent).toContain('export const MYSIDELINE_CAPTURED_RESPONSES');
            expect(fixtureContent).toContain('export function createCapturedMockFetch');
            expect(fixtureContent).toContain('export function getCapturedCarnivals');
            expect(fixtureContent).toContain('export default');
        });

        test('should include proper metadata in fixture', async () => {
            // Act
            await captureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert
            const fixtureContent = await fs.readFile(MOCK_CAPTURE_OUTPUT, 'utf8');
            
            expect(fixtureContent).toContain('REAL DATA');
            expect(fixtureContent).toContain('Data captured on:');
            expect(fixtureContent).toContain('Carnivals captured: 2');
            expect(fixtureContent).toContain('Source: MySideline website (live data)');
        });

        test('should include helper functions for testing', async () => {
            // Act
            await captureModule.captureMySidelineData(MOCK_FIXTURES_DIR);

            // Assert
            const fixtureContent = await fs.readFile(MOCK_CAPTURE_OUTPUT, 'utf8');
            
            expect(fixtureContent).toContain('createCapturedMockFetch');
            expect(fixtureContent).toContain('getCapturedCarnivals');
            expect(fixtureContent).toContain('MYSIDELINE_DB_TEST_DATA');
            expect(fixtureContent).toContain('EXPECTED_CARNIVALS');
        });
    });
});