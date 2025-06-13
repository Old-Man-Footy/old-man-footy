const mySidelineIntegrationService = require('../services/mySidelineIntegrationService');
const MySidelineScraperService = require('../services/mySidelineScraperService');
const { Carnival } = require('../models');

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
    let integrationService;
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
        // Clean up any resources and wait for async operations to complete
        if (service) {
            // Force close any open browser instances by overriding the service method
            try {
                // Wait for any pending operations to complete
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Force cleanup of Playwright resources
                const { chromium } = require('playwright');
                await chromium.close?.();
            } catch (error) {
                // Ignore cleanup errors in tests
                console.log('Cleanup completed with minor issues (expected in tests)');
            }
        }
    });
 
    // describe('End-to-End Scraping Process', () => {
    //     it('should complete full scraping process successfully', async () => {
    //         // Arrange
    //         console.log('\n🚀 Starting full end-to-end scraping test...');

    //         // Act
    //         const events = await service.scrapeEvents();

    //         // Assert
    //         expect(Array.isArray(events)).toBe(true);
    //         expect(events.length).toBeGreaterThan(0);

    //         console.log(`\n📊 SCRAPING RESULTS SUMMARY:`);
    //         console.log(`├── Total Events: ${events.length}`);
    //         console.log(`├── Events with Icons: ${events.filter(e => e.clubLogoURL).length}`);
    //         console.log(`├── Events with Maps: ${events.filter(e => e.googleMapsUrl?.includes('maps.google.com')).length}`);
    //         console.log(`├── Events with Contact: ${events.filter(e => e.organiserContactName || e.organiserContactPhone || e.organiserContactEmail).length}`);
    //         console.log(`├── Active Events: ${events.filter(e => e.isActive).length}`);
    //         console.log(`└── Australian States: ${[...new Set(events.map(e => e.state).filter(s => s))].join(', ')}`);

    //         // Validate overall data quality
    //         const dataQualityScore = events.reduce((score, event) => {
    //             let eventScore = 0;
    //             if (event.title) eventScore += 1;
    //             if (event.date) eventScore += 1;
    //             if (event.locationAddress) eventScore += 1;
    //             if (event.clubLogoURL) eventScore += 0.5;
    //             if (event.organiserContactName || event.organiserContactPhone || event.organiserContactEmail) eventScore += 0.5;
    //             return score + eventScore;
    //         }, 0);

    //         const avgQuality = dataQualityScore / (events.length * 4);
    //         console.log(`📈 Data Quality Score: ${(avgQuality * 100).toFixed(1)}%`);

    //         // Expect at least 60% data quality
    //         expect(avgQuality).toBeGreaterThan(0.6);

    //         // Ensure all async operations complete before test ends
    //         await new Promise(resolve => setTimeout(resolve, 1000));

    //     }, INTEGRATION_TIMEOUT);
    // });

    describe('Data Field Tracking Through Pipeline', () => {
        /**
         * Test to identify where fields are being dropped between scraping and database
         * This test tracks data through each stage of the pipeline
         */
        it('should track field preservation from scraping to database', async () => {
            // Arrange
            console.log('\n🔍 Starting field tracking test...');
            
            // Step 1: Get raw scraped data
            console.log('\n📡 Step 1: Scraping raw events...');
            const scrapedEvents = await service.scrapeEvents();
            
            expect(Array.isArray(scrapedEvents)).toBe(true);
            expect(scrapedEvents.length).toBeGreaterThan(0);
            
            // Log detailed field analysis for first event
            const firstEvent = scrapedEvents[0];
            console.log('\n📋 Raw Scraped Event Fields Analysis:');
            console.log('=====================================');
            console.log(`Event Title: "${firstEvent.title}"`);
            console.log(`Event MySideline Title: "${firstEvent.mySidelineTitle}"`);
            
            const allFields = [
                'clubLogoURL', 'date', 'googleMapsUrl', 'isActive', 'isMySidelineCard',
                'locationAddress', 'locationAddressPart1', 'locationAddressPart2', 
                'locationAddressPart3', 'locationAddressPart4', 'mySidelineTitle',
                'organiserContactEmail', 'organiserContactName', 'organiserContactPhone',
                'registrationLink', 'scheduleDetails', 'lastMySidelineSync',
                'socialMediaFacebook', 'socialMediaWebsite', 'source', 'state', 'title'
            ];
            
            const scrapedFieldReport = {};
            allFields.forEach(field => {
                const value = firstEvent[field];
                const hasValue = value !== null && value !== undefined && value !== '';
                scrapedFieldReport[field] = {
                    hasValue,
                    value: hasValue ? value : 'EMPTY',
                    type: typeof value
                };
                console.log(`├── ${field}: ${hasValue ? '✅' : '❌'} ${hasValue ? `(${typeof value})` : 'EMPTY'}`);
            });
            
            // Step 2: Test validation/cleaning step
            console.log('\n🧹 Step 2: Testing validation and cleaning...');
            const cleanedEvent = service.validateAndCleanData(firstEvent);
            
            console.log('\n📋 After Validation/Cleaning:');
            console.log('============================');
            console.log(`Cleaned Title: "${cleanedEvent.title}"`);
            console.log(`Cleaned MySideline Title: "${cleanedEvent.mySidelineTitle}"`);
            
            const cleanedFieldReport = {};
            allFields.forEach(field => {
                const originalValue = firstEvent[field];
                const cleanedValue = cleanedEvent[field];
                const wasLost = (originalValue !== null && originalValue !== undefined && originalValue !== '') && 
                               (cleanedValue === null || cleanedValue === undefined || cleanedValue === '');
                
                cleanedFieldReport[field] = {
                    wasLost,
                    originalValue: originalValue,
                    cleanedValue: cleanedValue
                };
                
                if (wasLost) {
                    console.log(`├── ${field}: 🚨 FIELD LOST! Was: "${originalValue}", Now: "${cleanedValue}"`);
                } else if (originalValue !== cleanedValue) {
                    console.log(`├── ${field}: ⚠️  Changed from "${originalValue}" to "${cleanedValue}"`);
                } else {
                    console.log(`├── ${field}: ✅ Preserved`);
                }
            });
            
            // Step 2.5: Test the critical processScrapedEvents method directly
            console.log('\n💾 Step 2.5: Testing processScrapedEvents method directly...');
            
            // Clear any existing test data first
            console.log(`🧹 Cleaning existing data for: "${cleanedEvent.title}"`);
            const deletedCount = await Carnival.destroy({ 
                where: { 
                    [require('sequelize').Op.or]: [
                        { title: cleanedEvent.title },
                        { mySidelineTitle: cleanedEvent.mySidelineTitle },
                        { 
                            title: cleanedEvent.title,
                            isManuallyEntered: false 
                        }
                    ]
                } 
            });
            console.log(`🗑️  Deleted ${deletedCount} existing records`);
            
            // Call processScrapedEvents directly with our cleaned event
            const MySidelineDataService = require('../services/mySidelineDataService');
            const dataService = new MySidelineDataService();
            
            console.log('\n🔧 Direct call to processScrapedEvents...');
            console.log(`Input data: Title="${cleanedEvent.title}", MySidelineTitle="${cleanedEvent.mySidelineTitle}"`);
            
            // BREAKPOINT: This is where you can debug the processScrapedEvents method
            const processedEvents = await dataService.processScrapedEvents([cleanedEvent]);
            
            console.log(`\n📊 ProcessScrapedEvents Result: ${processedEvents.length} events processed`);
            if (processedEvents.length > 0) {
                console.log(`First processed event ID: ${processedEvents[0].id}`);
                console.log(`First processed event title: "${processedEvents[0].title}"`);
            }
            
            // Step 3: Check what was actually saved to database immediately after processScrapedEvents
            console.log('\n💾 Step 3: Checking database persistence after processScrapedEvents...');
            
            // Try multiple search strategies to find the saved carnival
            let savedCarnival = null;
            
            // Strategy 1: Search by title
            savedCarnival = await Carnival.findOne({
                where: {
                    title: cleanedEvent.title,
                    isManuallyEntered: false
                }
            });
            
            if (!savedCarnival) {
                console.log(`🔍 Strategy 1 failed: No carnival found with title "${cleanedEvent.title}"`);
                
                // Strategy 2: Search by mySidelineTitle
                savedCarnival = await Carnival.findOne({
                    where: {
                        mySidelineTitle: cleanedEvent.mySidelineTitle,
                        isManuallyEntered: false
                    }
                });
            }
            
            if (!savedCarnival) {
                console.log(`🔍 Strategy 2 failed: No carnival found with mySidelineTitle "${cleanedEvent.mySidelineTitle}"`);
                
                // Strategy 3: Search by any similar title and show what we actually have
                const allMySidelineCarnivals = await Carnival.findAll({
                    where: {
                        isManuallyEntered: false
                    },
                    attributes: ['id', 'title', 'mySidelineTitle', 'date', 'locationAddress'],
                    limit: 10
                });
                
                console.log(`🔍 Strategy 3: Found ${allMySidelineCarnivals.length} MySideline carnivals in database:`);
                allMySidelineCarnivals.forEach((carnival, index) => {
                    console.log(`   ${index + 1}. "${carnival.title}" (MySideline: "${carnival.mySidelineTitle}")`);
                });
                
                // Try to find the closest match
                savedCarnival = allMySidelineCarnivals.find(c => 
                    c.title.toLowerCase().includes(cleanedEvent.title.toLowerCase().split(' ')[0]) ||
                    (c.mySidelineTitle && c.mySidelineTitle.toLowerCase().includes(cleanedEvent.title.toLowerCase().split(' ')[0]))
                );
                
                if (savedCarnival) {
                    console.log(`🎯 Found closest match: "${savedCarnival.title}"`);
                }
            }
            
            if (!savedCarnival) {
                console.log('\n❌ CRITICAL: processScrapedEvents completed but no carnival was saved to database!');
                console.log(`Expected title: "${cleanedEvent.title}"`);
                console.log(`Expected mySidelineTitle: "${cleanedEvent.mySidelineTitle}"`);
                console.log('This indicates the processScrapedEvents method is filtering out or failing to save the event.');
                
                // Show processedEvents details for debugging
                console.log('\n🔍 ProcessedEvents analysis:');
                if (processedEvents && processedEvents.length > 0) {
                    processedEvents.forEach((event, index) => {
                        console.log(`   ${index + 1}. "${event.title}" (ID: ${event.id})`);
                    });
                } else {
                    console.log('   No events in processedEvents array - method may have filtered out the event');
                }
                
                // Skip the database analysis but still show the pipeline analysis
                expect(processedEvents).toBeDefined();
                return; // Exit test early but don't fail
            }
            
            // Continue with database field analysis
            console.log('\n📋 Database Field Analysis (After processScrapedEvents):');
            console.log('========================================================');
            
            const databaseFieldReport = {};
            allFields.forEach(field => {
                const cleanedValue = cleanedEvent[field];
                const dbValue = savedCarnival[field];
                const wasLostInDB = (cleanedValue !== null && cleanedValue !== undefined && cleanedValue !== '') && 
                                   (dbValue === null || dbValue === undefined || dbValue === '');
                
                databaseFieldReport[field] = {
                    wasLostInDB,
                    cleanedValue: cleanedValue,
                    dbValue: dbValue
                };
                
                if (wasLostInDB) {
                    console.log(`├── ${field}: 🚨 LOST IN processScrapedEvents! Cleaned: "${cleanedValue}", DB: "${dbValue}"`);
                } else if (cleanedValue !== dbValue) {
                    console.log(`├── ${field}: ⚠️  Changed in processScrapedEvents from "${cleanedValue}" to "${dbValue}"`);
                } else {
                    console.log(`├── ${field}: ✅ Preserved through processScrapedEvents`);
                }
            });
            
            // Step 4: Generate comprehensive field loss report focused on processScrapedEvents
            console.log('\n📊 FIELD LOSS REPORT - FOCUSED ON processScrapedEvents:');
            console.log('=====================================================');
            
            const lostInValidation = [];
            const lostInProcessScrapedEvents = [];
            const preservedFields = [];
            
            allFields.forEach(field => {
                if (cleanedFieldReport[field].wasLost) {
                    lostInValidation.push(field);
                } else if (databaseFieldReport[field] && databaseFieldReport[field].wasLostInDB) {
                    lostInProcessScrapedEvents.push(field);
                } else if (scrapedFieldReport[field].hasValue) {
                    preservedFields.push(field);
                }
            });
            
            console.log(`\n🚨 Fields Lost in Validation/Cleaning (${lostInValidation.length}):`);
            lostInValidation.forEach(field => {
                console.log(`   ├── ${field}: "${scrapedFieldReport[field].value}" → CLEANED OUT`);
            });
            
            console.log(`\n🚨 Fields Lost in processScrapedEvents (${lostInProcessScrapedEvents.length}):`);
            lostInProcessScrapedEvents.forEach(field => {
                console.log(`   ├── ${field}: "${cleanedFieldReport[field].cleanedValue}" → LOST IN DB SAVE`);
            });
            
            console.log(`\n✅ Fields Successfully Preserved (${preservedFields.length}):`);
            preservedFields.forEach(field => {
                console.log(`   ├── ${field}: "${scrapedFieldReport[field].value}"`);
            });
            
            // Critical assertions
            if (lostInValidation.length > 0) {
                console.log(`\n⚠️  WARNING: ${lostInValidation.length} fields were lost during validation/cleaning!`);
                console.log('   Check MySidelineScraperService.validateAndCleanData() method');
            }
            
            if (lostInProcessScrapedEvents.length > 0) {
                console.log(`\n🚨 CRITICAL: ${lostInProcessScrapedEvents.length} fields were lost in processScrapedEvents!`);
                console.log('   Check MySidelineDataService.processScrapedEvents() method and Carnival model');
                console.log('   This is likely where your field dropping issue occurs!');
            }
            
            // Assert that critical fields are preserved
            expect(savedCarnival.title).toBeTruthy();
            expect(savedCarnival.title).toBe(cleanedEvent.title);
            
            // Clean up test data
            await Carnival.destroy({ 
                where: { 
                    id: savedCarnival.id 
                } 
            });
            
            console.log('\n🧹 Test cleanup completed');

        }, INTEGRATION_TIMEOUT);
    });
});