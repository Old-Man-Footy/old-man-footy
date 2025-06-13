const MySidelineScraperService = require('../services/mySidelineScraperService');

/**
 * MySidelineScraperService Integration Tests
 * 
 * These tests run against the live MySideline website to ensure the scraper
 * can actually retrieve data from the real site. They are slower than unit tests
 * but provide confidence that the scraper works with the actual website.
 * 
 * To run these tests: npm test -- "mySidelineScraperService.integration.test.js"
 * 
 * Note: These tests require internet connection and may be affected by:
 * - MySideline website changes
 * - Network connectivity issues
 * - Website maintenance/downtime
 */

// Remove the 'only' from the describe block to run all tests after debugging
describe('MySidelineScraperService Integration Tests', () => {
    let service;
    const INTEGRATION_TIMEOUT = 120000; // 2 minutes for integration tests

    beforeAll(() => {
        // Set up service with live configuration
        process.env.MYSIDELINE_URL = process.env.MYSIDELINE_URL || 'https://profile.mysideline.com.au/register/clubsearch/?criteria=Masters&source=rugby-league';
        process.env.MYSIDELINE_ENABLE_SCRAPING = 'true';
        process.env.MYSIDELINE_USE_MOCK = 'false';
        process.env.NODE_ENV = 'development'; // Set to development to show browser window
        
        service = new MySidelineScraperService();
        
        // Override headless setting for integration tests - show browser window
        service.useHeadlessBrowser = false;
        
        console.log(`\n🔗 Testing against live MySideline URL: ${service.searchUrl}`);
        console.log(`⚙️  Configuration: headless=${service.useHeadlessBrowser}, timeout=${service.timeout}ms`);
        console.log(`👁️  Browser will be VISIBLE for debugging and observation`);
    });

    afterAll(async () => {
        // Clean up any resources
        if (service) {
            // Ensure any open browser instances are closed
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    });

    describe('End-to-End Scraping Process', () => {
        it('should complete full scraping process successfully', async () => {
            // Arrange
            console.log('\n🚀 Starting full end-to-end scraping test...');

            // Act
            const events = await service.scrapeEvents();

            // Assert
            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBeGreaterThan(0);

            console.log(`\n📊 SCRAPING RESULTS SUMMARY:`);
            console.log(`├── Total Events: ${events.length}`);
            console.log(`├── Events with Icons: ${events.filter(e => e.carnivalIcon).length}`);
            console.log(`├── Events with Maps: ${events.filter(e => e.googleMapsUrl?.includes('maps.google.com')).length}`);
            console.log(`├── Events with Contact: ${events.filter(e => e.organiserContactName || e.organiserContactPhone || e.organiserContactEmail).length}`);
            console.log(`├── Active Events: ${events.filter(e => e.isActive).length}`);
            console.log(`└── Australian States: ${[...new Set(events.map(e => e.state).filter(s => s))].join(', ')}`);

            // Validate overall data quality
            const dataQualityScore = events.reduce((score, event) => {
                let eventScore = 0;
                if (event.title) eventScore += 1;
                if (event.date) eventScore += 1;
                if (event.locationAddress) eventScore += 1;
                if (event.carnivalIcon) eventScore += 0.5;
                if (event.organiserContactName || event.organiserContactPhone || event.organiserContactEmail) eventScore += 0.5;
                return score + eventScore;
            }, 0);

            const avgQuality = dataQualityScore / (events.length * 4);
            console.log(`📈 Data Quality Score: ${(avgQuality * 100).toFixed(1)}%`);

            // Expect at least 60% data quality
            expect(avgQuality).toBeGreaterThan(0.6);

        }, INTEGRATION_TIMEOUT);
    });
});