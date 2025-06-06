// Simple test for MySideline scraping without database dependency
const mySidelineService = require('../services/mySidelineService');

async function testMySidelineScrapingOnly() {
    console.log('🔍 Testing MySideline Search Page Scraping (No Database)...\n');
    
    try {
        console.log('📡 Fetching events from MySideline search page...');
        console.log('🌐 URL:', mySidelineService.searchUrl);
        console.log('⏱️  This may take a few seconds...\n');
        
        const events = await mySidelineService.scrapeMySidelineEvents();
        
        console.log(`\n📊 RESULTS:`);
        console.log(`✅ Found ${events.length} Masters events`);
        
        if (events.length > 0) {
            console.log('\n🏉 SAMPLE EVENTS:');
            console.log('=' .repeat(60));
            
            events.slice(0, 3).forEach((event, index) => {
                console.log(`\n${index + 1}. ${event.title}`);
                console.log(`   📍 Location: ${event.location}`);
                console.log(`   🗓️  Date: ${new Date(event.date).toLocaleDateString('en-AU')}`);
                console.log(`   🏷️  State: ${event.state}`);
                console.log(`   🔗 Registration: ${event.registrationLink || 'Not found'}`);
                console.log(`   📧 Contact Email: ${event.contactInfo?.email || 'Not found'}`);
                console.log(`   📱 Contact Phone: ${event.contactInfo?.phone || 'Not found'}`);
                console.log(`   🆔 MySideline ID: ${event.mySidelineId}`);
                console.log(`   🔧 Parsed with: ${event.sourceSelector}`);
            });
            
            if (events.length > 3) {
                console.log(`\n... and ${events.length - 3} more events`);
            }
            
            // Statistics
            const stateStats = events.reduce((acc, event) => {
                acc[event.state] = (acc[event.state] || 0) + 1;
                return acc;
            }, {});
            
            console.log('\n📈 STATISTICS:');
            console.log('=' .repeat(60));
            console.log('Events by State:');
            Object.entries(stateStats).forEach(([state, count]) => {
                console.log(`   ${state}: ${count} events`);
            });
            
            const withRegistration = events.filter(e => e.registrationLink).length;
            const withEmail = events.filter(e => e.contactInfo?.email).length;
            
            console.log(`\nData Quality:`);
            console.log(`   Registration Links: ${withRegistration}/${events.length} (${Math.round(withRegistration/events.length*100)}%)`);
            console.log(`   Contact Emails: ${withEmail}/${events.length} (${Math.round(withEmail/events.length*100)}%)`);
            
        } else {
            console.log('\n⚠️  No events found. This could mean:');
            console.log('   - MySideline changed their page structure');
            console.log('   - No Masters events are currently listed');
            console.log('   - The search page is temporarily unavailable');
            console.log('   - Network connectivity issues');
        }

        console.log('\n✅ MySideline scraping test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ MySideline scraping test failed:');
        console.error(`   Error: ${error.message}`);
        
        if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
            console.error('   This appears to be a network connectivity issue.');
        } else if (error.message.includes('status')) {
            console.error('   MySideline may have blocked the request or changed their page.');
        } else {
            console.error('   Stack trace:', error.stack);
        }
    }
}

// Run the test
if (require.main === module) {
    testMySidelineScrapingOnly();
}

module.exports = testMySidelineScrapingOnly;