// Test script to verify MySideline integration with the actual search page
const mySidelineService = require('../services/mySidelineService');
const mongoose = require('mongoose');

async function testMySidelineIntegration() {
    console.log('🔍 Testing MySideline Integration with actual search page...\n');
    
    try {
        // Connect to database (use test DB)
        await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Test the search page scraping
        console.log('\n📡 Testing search page scraping...');
        const events = await mySidelineService.scrapeMySidelineEvents();
        
        console.log(`\n📊 Results:`);
        console.log(`- Found ${events.length} Masters events`);
        
        if (events.length > 0) {
            console.log('\n📅 Sample Events:');
            events.slice(0, 3).forEach((event, index) => {
                console.log(`\n${index + 1}. ${event.title}`);
                console.log(`   📍 Location: ${event.location}`);
                console.log(`   📅 Date: ${event.date}`);
                console.log(`   🏷️  State: ${event.state}`);
                console.log(`   🔗 Registration: ${event.registrationLink || 'Not found'}`);
                console.log(`   📧 Contact: ${event.contactInfo?.email || 'Not found'}`);
                console.log(`   🆔 ID: ${event.mySidelineId}`);
            });

            // Test processing events (without saving to production DB)
            console.log('\n🔄 Testing event processing...');
            const processed = await mySidelineService.processScrapedEvents(events.slice(0, 1));
            console.log(`✅ Successfully processed ${processed.length} test events`);
        }

        // Test sync status
        const status = mySidelineService.getSyncStatus();
        console.log('\n📈 Sync Status:');
        console.log(`- Is Running: ${status.isRunning}`);
        console.log(`- Last Sync: ${status.lastSyncDate || 'Never'}`);
        console.log(`- Next Scheduled: ${status.nextScheduledSync}`);

        console.log('\n✅ MySideline integration test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ MySideline integration test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from database');
    }
}

// Run the test
if (require.main === module) {
    testMySidelineIntegration();
}

module.exports = testMySidelineIntegration;