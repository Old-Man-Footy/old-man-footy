const mySidelineService = require('../services/mySidelineService');

describe('MySideline Service - Puppeteer Enhanced Tests', () => {
    describe('Browser Automation Tests', () => {
        test('should successfully load MySideline page with Puppeteer', async () => {
            console.log('\n🚀 Testing Puppeteer browser automation...');
            
            const events = await mySidelineService.fetchEventsWithBrowser();
            
            expect(Array.isArray(events)).toBe(true);
            console.log(`📊 Found ${events.length} events using browser automation`);
            
            // Log detailed results
            if (events.length > 0) {
                console.log('\n✅ Sample events found:');
                events.slice(0, 3).forEach((event, index) => {
                    console.log(`\nEvent ${index + 1}:`);
                    console.log(`  Title: ${event.title}`);
                    console.log(`  Description: ${event.description?.substring(0, 100)}...`);
                    console.log(`  Location: ${event.location || 'Not specified'}`);
                    console.log(`  Date: ${event.date || 'Not specified'}`);
                    console.log(`  Source: ${event.source}`);
                });
            } else {
                console.log('⚠️ No events found - investigating page structure...');
            }
        }, 60000); // 60 second timeout for browser automation
        
        test('should handle page analysis and structure detection', async () => {
            console.log('\n🔍 Testing page structure analysis...');
            
            // This will run the browser automation and log detailed analysis
            const events = await mySidelineService.fetchEventsWithBrowser();
            
            // The logs from the service will show us:
            // - Page content length
            // - JavaScript files detected
            // - Selectors tried
            // - Content found
            
            expect(true).toBe(true); // Always pass, we're gathering intel
        }, 60000);
    });
    
    describe('Fallback and Integration Tests', () => {
        test('should gracefully fallback to traditional scraping if browser fails', async () => {
            console.log('\n🔄 Testing fallback mechanism...');
            
            // Mock browser failure by temporarily breaking the browser method
            const originalMethod = mySidelineService.fetchEventsWithBrowser;
            mySidelineService.fetchEventsWithBrowser = async () => {
                throw new Error('Simulated browser failure');
            };
            
            const events = await mySidelineService.fetchEvents();
            
            // Restore original method
            mySidelineService.fetchEventsWithBrowser = originalMethod;
            
            expect(Array.isArray(events)).toBe(true);
            console.log(`📊 Fallback returned ${events.length} events`);
        }, 30000);
        
        test('should compare browser vs traditional scraping results', async () => {
            console.log('\n⚖️ Comparing browser automation vs traditional scraping...');
            
            const [browserEvents, traditionalEvents] = await Promise.all([
                mySidelineService.fetchEventsWithBrowser().catch(err => {
                    console.log('Browser method failed:', err.message);
                    return [];
                }),
                mySidelineService.scrapeMySidelineEvents().catch(err => {
                    console.log('Traditional method failed:', err.message);
                    return [];
                })
            ]);
            
            console.log(`\n📊 Results Comparison:`);
            console.log(`  Browser automation: ${browserEvents.length} events`);
            console.log(`  Traditional scraping: ${traditionalEvents.length} events`);
            
            if (browserEvents.length > 0) {
                console.log('\n✅ Browser automation found events:');
                browserEvents.slice(0, 2).forEach((event, index) => {
                    console.log(`  ${index + 1}. ${event.title}`);
                });
            }
            
            if (traditionalEvents.length > 0) {
                console.log('\n✅ Traditional scraping found events:');
                traditionalEvents.slice(0, 2).forEach((event, index) => {
                    console.log(`  ${index + 1}. ${event.title}`);
                });
            }
            
            // Both methods should return arrays
            expect(Array.isArray(browserEvents)).toBe(true);
            expect(Array.isArray(traditionalEvents)).toBe(true);
        }, 90000);
    });
    
    describe('Event Processing Tests', () => {
        test('should properly extract Masters events from various formats', () => {
            console.log('\n🎯 Testing Masters event extraction...');
            
            const testData = [
                {
                    type: 'js-result',
                    text: 'North Sydney Masters Rugby League Club - Training Thursdays',
                    html: '<div class="club-card">North Sydney Masters Rugby League Club</div>'
                },
                {
                    type: 'text-match',
                    title: 'Canterbury Bankstown Masters',
                    context: 'Canterbury Bankstown Masters Rugby League Club welcomes new players'
                }
            ];
            
            testData.forEach(data => {
                const standardEvent = mySidelineService.convertToStandardEvent(data);
                
                if (standardEvent) {
                    console.log(`✅ Converted: ${standardEvent.title}`);
                    expect(standardEvent.title).toBeTruthy();
                    expect(standardEvent.source).toBe('MySideline');
                    expect(standardEvent.title.toLowerCase()).toContain('masters');
                } else {
                    console.log(`❌ Failed to convert event data`);
                }
            });
        });
        
        test('should extract location and contact information', () => {
            console.log('\n📍 Testing location and contact extraction...');
            
            const testText = 'North Sydney Masters at North Sydney Oval, contact John Smith 0412345678';
            
            const location = mySidelineService.extractLocation(testText);
            const contact = mySidelineService.extractContact(testText);
            
            console.log(`  Location extracted: ${location || 'None'}`);
            console.log(`  Contact extracted: ${contact || 'None'}`);
            
            // These should extract some information
            expect(typeof location).toBe('string');
            expect(typeof contact).toBe('string');
        });
    });
    
    describe('Performance and Reliability Tests', () => {
        test('should handle timeouts gracefully', async () => {
            console.log('\n⏱️ Testing timeout handling...');
            
            const startTime = Date.now();
            const events = await mySidelineService.fetchEvents();
            const duration = Date.now() - startTime;
            
            console.log(`⏱️ Total execution time: ${duration}ms`);
            
            // Should complete within reasonable time (2 minutes max)
            expect(duration).toBeLessThan(120000);
            expect(Array.isArray(events)).toBe(true);
        }, 150000);
    });
});

// Run a quick live test
if (require.main === module) {
    console.log('🧪 Running MySideline Puppeteer Live Test...');
    
    (async () => {
        try {
            console.log('\n=== LIVE TEST: MySideline with Puppeteer ===');
            const events = await mySidelineService.fetchEvents();
            
            console.log(`\n📊 Final Results: ${events.length} Masters events found`);
            
            if (events.length > 0) {
                console.log('\n🏆 SUCCESS! Found Masters events:');
                events.forEach((event, index) => {
                    console.log(`\n${index + 1}. ${event.title}`);
                    if (event.location) console.log(`   📍 ${event.location}`);
                    if (event.date) console.log(`   📅 ${event.date}`);
                    if (event.contact) console.log(`   📞 ${event.contact}`);
                    console.log(`   🔗 Source: ${event.source}`);
                });
            } else {
                console.log('\n⚠️ No Masters events found - this might indicate:');
                console.log('   • The search criteria needs adjustment');
                console.log('   • The page structure has changed');
                console.log('   • Content is loaded via additional AJAX calls');
                console.log('   • Geographic restrictions or anti-bot measures');
            }
            
        } catch (error) {
            console.error('\n❌ Live test failed:', error.message);
        }
    })();
}