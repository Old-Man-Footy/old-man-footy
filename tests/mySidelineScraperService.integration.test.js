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
describe.only('MySidelineScraperService Integration Tests', () => {
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

    describe('Live Website Integration', () => {
        it('should successfully connect to MySideline website', async () => {
            // Arrange
            const { chromium } = require('playwright');
            let browser, context, page;

            try {
                // Act
                browser = await chromium.launch({ headless: service.useHeadlessBrowser });
                context = await browser.newContext();
                page = await context.newPage();
                
                const response = await page.goto(service.searchUrl, { 
                    waitUntil: 'domcontentloaded',
                    timeout: service.timeout 
                });

                // Assert
                expect(response.status()).toBe(200);
                expect(await page.title()).toBeTruthy();
                
                console.log(`✅ Successfully connected to MySideline website`);
                console.log(`📄 Page title: ${await page.title()}`);
                
            } finally {
                // Cleanup
                if (page) await page.close();
                if (context) await context.close();
                if (browser) await browser.close();
            }
        }, INTEGRATION_TIMEOUT);

        it('should find event cards on the MySideline website', async () => {
            // Arrange
            const { chromium } = require('playwright');
            let browser, context, page;

            try {
                // Act
                browser = await chromium.launch({ headless: service.useHeadlessBrowser });
                context = await browser.newContext();
                page = await context.newPage();
                
                await page.goto(service.searchUrl, { 
                    waitUntil: 'domcontentloaded',
                    timeout: service.timeout 
                });

                // Wait for event cards to load
                await page.waitForSelector('.el-card.is-always-shadow, [id^="clubsearch_"]', { 
                    timeout: 10000 
                });

                const cardCount = await page.$$eval(
                    '.el-card.is-always-shadow, [id^="clubsearch_"]', 
                    cards => cards.length
                );

                // Assert
                expect(cardCount).toBeGreaterThan(0);
                console.log(`✅ Found ${cardCount} event cards on MySideline website`);
                
            } finally {
                // Cleanup
                if (page) await page.close();
                if (context) await context.close();
                if (browser) await browser.close();
            }
        }, INTEGRATION_TIMEOUT);

        it('should extract carnival icon from event cards', async () => {
            // Arrange & Act
            const events = await service.scrapeEvents();

            // Assert
            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBeGreaterThan(0);

            // Check that at least some events have carnival icons
            const eventsWithIcons = events.filter(event => event.carnivalIcon && event.carnivalIcon.length > 0);
            console.log(`📊 Events with carnival icons: ${eventsWithIcons.length}/${events.length}`);

            // Validate carnival icon structure for events that have them
            eventsWithIcons.forEach(event => {
                expect(event.carnivalIcon).toMatch(/^https?:\/\//); // Should be a valid URL
                expect(event.carnivalIcon).toContain('cloudfront'); // Should be CloudFront CDN URL
                console.log(`🎨 Carnival icon found: ${event.carnivalName} -> ${event.carnivalIcon.substring(0, 50)}...`);
            });

            // At least 50% of events should have carnival icons
            expect(eventsWithIcons.length).toBeGreaterThan(events.length * 0.5);
        }, INTEGRATION_TIMEOUT);

        it('should extract structured event data with new HTML format', async () => {
            // Arrange & Act
            const events = await service.scrapeEvents();

            // Assert
            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBeGreaterThan(0);

            // Test the first event for all expected fields from new HTML structure
            const firstEvent = events[0];
            console.log(`🔍 Testing first event: ${firstEvent.carnivalName}`);

            // Core fields that should always be present
            expect(firstEvent).toHaveProperty('title');
            expect(firstEvent).toHaveProperty('carnivalName');
            expect(firstEvent).toHaveProperty('date');
            expect(firstEvent).toHaveProperty('source', 'MySideline');
            expect(firstEvent).toHaveProperty('isMySidelineCard', true);

            // New structure fields
            expect(firstEvent).toHaveProperty('carnivalIcon'); // May be empty string
            expect(firstEvent).toHaveProperty('category');
            expect(firstEvent).toHaveProperty('eventType');
            expect(firstEvent).toHaveProperty('googleMapsUrl');
            expect(firstEvent).toHaveProperty('hasRegistration');

            // Contact information fields
            expect(firstEvent).toHaveProperty('contactName');
            expect(firstEvent).toHaveProperty('contactPhone');
            expect(firstEvent).toHaveProperty('contactEmail');

            // Validate data types
            expect(typeof firstEvent.title).toBe('string');
            expect(typeof firstEvent.carnivalName).toBe('string');
            expect(typeof firstEvent.carnivalIcon).toBe('string');
            expect(typeof firstEvent.isActive).toBe('boolean');
            expect(firstEvent.scrapedAt).toBeInstanceOf(Date);

            console.log(`✅ Event structure validation passed for: ${firstEvent.carnivalName}`);
        }, INTEGRATION_TIMEOUT);

        it('should extract Google Maps URLs from venue addresses', async () => {
            // Arrange & Act
            const events = await service.scrapeEvents();

            // Assert
            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBeGreaterThan(0);

            // Check Google Maps URL extraction
            const eventsWithMaps = events.filter(event => 
                event.googleMapsUrl && 
                event.googleMapsUrl.includes('maps.google.com')
            );

            console.log(`🗺️  Events with Google Maps URLs: ${eventsWithMaps.length}/${events.length}`);

            // Validate Google Maps URLs
            eventsWithMaps.forEach(event => {
                expect(event.googleMapsUrl).toMatch(/^https:\/\/maps\.google\.com/);
                console.log(`📍 Maps URL found: ${event.carnivalName} -> ${event.locationAddress}`);
            });

            // Most events should have location addresses
            const eventsWithAddress = events.filter(event => 
                event.locationAddress && event.locationAddress.length > 0
            );
            expect(eventsWithAddress.length).toBeGreaterThan(events.length * 0.7);
        }, INTEGRATION_TIMEOUT);

        it('should extract contact information from structured paragraphs', async () => {
            // Arrange & Act
            const events = await service.scrapeEvents();

            // Assert
            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBeGreaterThan(0);

            // Check contact information extraction
            const eventsWithContact = events.filter(event => 
                event.contactName || event.contactPhone || event.contactEmail
            );

            console.log(`📞 Events with contact info: ${eventsWithContact.length}/${events.length}`);

            // Validate contact information formats
            eventsWithContact.forEach(event => {
                if (event.contactPhone) {
                    // Phone should be reasonably formatted
                    expect(event.contactPhone.length).toBeGreaterThan(8);
                }
                if (event.contactEmail) {
                    // Email should contain @ symbol
                    expect(event.contactEmail).toContain('@');
                }
                console.log(`👤 Contact: ${event.carnivalName} -> ${event.contactName} | ${event.contactPhone} | ${event.contactEmail}`);
            });

            // Most events should have some contact information
            expect(eventsWithContact.length).toBeGreaterThan(events.length * 0.8);
        }, INTEGRATION_TIMEOUT);

        it('should filter out Touch events as specified', async () => {
            // Arrange & Act
            const events = await service.scrapeEvents();

            // Assert
            expect(Array.isArray(events)).toBe(true);
            
            // Verify no Touch events are included
            const touchEvents = events.filter(event => event.eventType === 'Touch');
            expect(touchEvents.length).toBe(0);

            console.log(`✅ Touch events filtered: 0 Touch events found in ${events.length} total events`);

            // Log event types found
            const eventTypes = [...new Set(events.map(e => e.eventType).filter(t => t))];
            console.log(`📊 Event types found: ${eventTypes.join(', ')}`);
        }, INTEGRATION_TIMEOUT);
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
            console.log(`├── Events with Contact: ${events.filter(e => e.contactName || e.contactPhone || e.contactEmail).length}`);
            console.log(`├── Active Events: ${events.filter(e => e.isActive).length}`);
            console.log(`└── Australian States: ${[...new Set(events.map(e => e.state).filter(s => s))].join(', ')}`);

            // Validate overall data quality
            const dataQualityScore = events.reduce((score, event) => {
                let eventScore = 0;
                if (event.carnivalName) eventScore += 1;
                if (event.date) eventScore += 1;
                if (event.locationAddress) eventScore += 1;
                if (event.carnivalIcon) eventScore += 0.5;
                if (event.contactName || event.contactPhone || event.contactEmail) eventScore += 0.5;
                return score + eventScore;
            }, 0);

            const avgQuality = dataQualityScore / (events.length * 4);
            console.log(`📈 Data Quality Score: ${(avgQuality * 100).toFixed(1)}%`);

            // Expect at least 75% data quality
            expect(avgQuality).toBeGreaterThan(0.75);

        }, INTEGRATION_TIMEOUT);
    });
});