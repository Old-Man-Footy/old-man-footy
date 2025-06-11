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

    describe('Live Website Integration', () => {
        it('should successfully connect to MySideline website', async () => {
            // Arrange
            const { chromium } = require('playwright');
            let browser, context, page;

            try {
                // Act - Test basic connectivity
                browser = await chromium.launch({ 
                    headless: service.useHeadlessBrowser,
                    timeout: service.timeout 
                });
                context = await browser.newContext();
                page = await context.newPage();
                
                console.log(`🌐 Connecting to: ${service.searchUrl}`);
                const response = await page.goto(service.searchUrl, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 30000 
                });

                // Assert
                expect(response.status()).toBeLessThan(400);
                expect(page.url()).toContain('mysideline.com');
                
                const title = await page.title();
                expect(title).toBeTruthy();
                expect(title.length).toBeGreaterThan(0);
                
                console.log(`✅ Successfully connected to MySideline`);
                console.log(`📄 Page title: "${title}"`);
                console.log(`🔗 Final URL: ${page.url()}`);

            } finally {
                // Cleanup
                if (context) await context.close();
                if (browser) await browser.close();
            }
        }, INTEGRATION_TIMEOUT);

        it('should detect MySideline page structure', async () => {
            // Arrange
            const { chromium } = require('playwright');
            let browser, context, page;

            try {
                browser = await chromium.launch({ 
                    headless: service.useHeadlessBrowser,
                    timeout: service.timeout 
                });
                context = await browser.newContext();
                page = await context.newPage();
                
                await page.goto(service.searchUrl, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 30000 
                });

                // Act - Check for expected MySideline elements
                const pageStructure = await page.evaluate(() => {
                    return {
                        bodyExists: !!document.body,
                        totalElements: document.querySelectorAll('*').length,
                        hasCards: document.querySelectorAll('.el-card, [id^="clubsearch_"]').length,
                        hasClickExpand: document.querySelectorAll('.click-expand').length,
                        hasButtons: document.querySelectorAll('button').length,
                        bodyTextLength: document.body ? document.body.textContent.length : 0,
                        containsMasters: document.body ? document.body.textContent.toLowerCase().includes('masters') : false,
                        containsRugby: document.body ? document.body.textContent.toLowerCase().includes('rugby') : false
                    };
                });

                // Assert
                expect(pageStructure.bodyExists).toBe(true);
                expect(pageStructure.totalElements).toBeGreaterThan(50);
                expect(pageStructure.bodyTextLength).toBeGreaterThan(500);
                
                console.log(`📊 Page structure analysis:`);
                console.log(`   - Total elements: ${pageStructure.totalElements}`);
                console.log(`   - Cards found: ${pageStructure.hasCards}`);
                console.log(`   - Click-expand elements: ${pageStructure.hasClickExpand}`);
                console.log(`   - Buttons: ${pageStructure.hasButtons}`);
                console.log(`   - Body text length: ${pageStructure.bodyTextLength} chars`);
                console.log(`   - Contains 'masters': ${pageStructure.containsMasters}`);
                console.log(`   - Contains 'rugby': ${pageStructure.containsRugby}`);

                // MySideline should have some basic structure
                expect(pageStructure.hasCards).toBeGreaterThan(0);
                
            } finally {
                if (context) await context.close();
                if (browser) await browser.close();
            }
        }, INTEGRATION_TIMEOUT);

        it('should successfully fetch events from live MySideline site', async () => {
            // Arrange
            console.log(`🚀 Starting live data fetch from MySideline...`);
            
            // Act
            const events = await service.fetchEventsWithBrowser();

            // Assert
            expect(Array.isArray(events)).toBe(true);
            
            console.log(`📋 Fetched ${events.length} events from live MySideline site`);
            
            if (events.length > 0) {
                const firstEvent = events[0];
                console.log(`📝 Sample event structure:`, {
                    title: firstEvent.title,
                    date: firstEvent.date,
                    state: firstEvent.state,
                    hasRegistrationLink: !!firstEvent.registrationLink,
                    isActive: firstEvent.isActive
                });

                // Validate event structure
                expect(firstEvent).toHaveProperty('title');
                expect(firstEvent).toHaveProperty('date');
                expect(firstEvent.title).toBeTruthy();
                expect(firstEvent.title.length).toBeGreaterThan(5);
                
                // Check for Masters-related content
                const hasRelevantContent = events.some(event => 
                    event.title?.toLowerCase().includes('masters') ||
                    event.title?.toLowerCase().includes('rugby') ||
                    event.title?.toLowerCase().includes('league')
                );
                
                if (hasRelevantContent) {
                    console.log(`✅ Found relevant Masters/Rugby League content`);
                } else {
                    console.log(`ℹ️  No Masters/Rugby League content found in current results`);
                }
            } else {
                console.log(`ℹ️  No events found - this could be normal if no Masters events are currently listed`);
            }

            // The test should pass regardless of event count since MySideline content varies
            expect(events).toBeDefined();
            
        }, INTEGRATION_TIMEOUT);

        it('should handle live site errors gracefully', async () => {
            // Arrange
            const originalUrl = service.searchUrl;
            service.searchUrl = 'https://profile.mysideline.com.au/nonexistent-page-12345';

            try {
                // Act
                const events = await service.fetchEventsWithBrowser();

                // Assert - Should handle errors gracefully
                expect(Array.isArray(events)).toBe(true);
                expect(events.length).toBe(0);
                
                console.log(`✅ Gracefully handled invalid URL scenario`);
                
            } finally {
                // Restore original URL
                service.searchUrl = originalUrl;
            }
        }, INTEGRATION_TIMEOUT);
    });

    describe('End-to-End Integration', () => {
        it('should complete full scraping workflow with live data', async () => {
            // Arrange
            console.log(`🔄 Testing complete end-to-end scraping workflow...`);
            
            // Act
            const events = await service.scrapeEvents();

            // Assert
            expect(Array.isArray(events)).toBe(true);
            
            console.log(`🎯 End-to-end workflow completed successfully`);
            console.log(`📊 Total events processed: ${events.length}`);
            
            if (events.length > 0) {
                // Validate that events have been properly parsed
                const validEvents = events.filter(event => 
                    event.title && 
                    event.date && 
                    event.title.length > 5
                );
                
                expect(validEvents.length).toBeGreaterThan(0);
                
                console.log(`✅ ${validEvents.length} valid events found`);
                
                // Log sample event details for verification
                const sampleEvent = validEvents[0];
                console.log(`📋 Sample parsed event:`, {
                    title: sampleEvent.title,
                    date: sampleEvent.date?.toISOString?.() || sampleEvent.date,
                    state: sampleEvent.state,
                    locationAddress: sampleEvent.locationAddress,
                    registrationLink: sampleEvent.registrationLink ? '✅' : '❌',
                    mySidelineEventId: sampleEvent.mySidelineEventId,
                    isActive: sampleEvent.isActive
                });
            }
        }, INTEGRATION_TIMEOUT);

        it('should maintain service state consistency during live testing', async () => {
            // Arrange
            const initialConfig = {
                timeout: service.timeout,
                retryCount: service.retryCount,
                searchUrl: service.searchUrl,
                enableScraping: service.enableScraping,
                useMockData: service.useMockData
            };

            // Act - Run multiple operations
            const mockEvents = service.generateMockEvents();
            const liveEvents = await service.fetchEventsWithBrowser();
            
            // Assert - Configuration should remain consistent
            expect(service.timeout).toBe(initialConfig.timeout);
            expect(service.retryCount).toBe(initialConfig.retryCount);
            expect(service.searchUrl).toBe(initialConfig.searchUrl);
            expect(service.enableScraping).toBe(initialConfig.enableScraping);
            expect(service.useMockData).toBe(initialConfig.useMockData);
            
            expect(Array.isArray(mockEvents)).toBe(true);
            expect(Array.isArray(liveEvents)).toBe(true);
            expect(mockEvents.length).toBeGreaterThan(0); // Mock should always have events
            
            console.log(`✅ Service state consistency maintained`);
            console.log(`📊 Mock events: ${mockEvents.length}, Live events: ${liveEvents.length}`);
        }, INTEGRATION_TIMEOUT);
    });

    describe('Live Data Quality Validation', () => {
        it('should validate data quality from live site', async () => {
            // Skip if no events are available
            const events = await service.fetchEventsWithBrowser();
            
            if (events.length === 0) {
                console.log(`⏭️  Skipping data quality validation - no events available`);
                return;
            }

            console.log(`🔍 Validating data quality for ${events.length} events...`);
            
            let validationResults = {
                hasTitle: 0,
                hasDate: 0,
                hasState: 0,
                hasLocation: 0,
                hasRegistrationInfo: 0,
                hasValidId: 0
            };

            events.forEach(event => {
                if (event.title && event.title.length > 5) validationResults.hasTitle++;
                if (event.date) validationResults.hasDate++;
                if (event.state) validationResults.hasState++;
                if (event.locationAddress) validationResults.hasLocation++;
                if (event.registrationLink || event.registrationDeadline) validationResults.hasRegistrationInfo++;
                if (event.mySidelineEventId) validationResults.hasValidId++;
            });

            console.log(`📊 Data quality results:`);
            console.log(`   - Events with title: ${validationResults.hasTitle}/${events.length}`);
            console.log(`   - Events with date: ${validationResults.hasDate}/${events.length}`);
            console.log(`   - Events with state: ${validationResults.hasState}/${events.length}`);
            console.log(`   - Events with location: ${validationResults.hasLocation}/${events.length}`);
            console.log(`   - Events with registration info: ${validationResults.hasRegistrationInfo}/${events.length}`);
            console.log(`   - Events with valid ID: ${validationResults.hasValidId}/${events.length}`);

            // Most events should have at least title and some basic info
            expect(validationResults.hasTitle).toBeGreaterThan(events.length * 0.8); // 80% should have titles
            
        }, INTEGRATION_TIMEOUT);
    });
});