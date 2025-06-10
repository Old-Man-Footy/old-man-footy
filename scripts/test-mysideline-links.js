#!/usr/bin/env node

/**
 * Development utility to test MySideline registration link capture
 * This script actually connects to MySideline to test the browser automation
 * 
 * Usage: node scripts/test-mysideline-links.js
 */

const mySidelineService = require('../services/mySidelineService');

async function testMySidelineLinks() {
    console.log('Testing MySideline registration link capture...');
    console.log('This will take a moment as it launches a browser and scrapes the site.\n');

    try {
        const searchUrl = 'https://profile.mysideline.com.au/search/events?s=nrl+masters&activeOnly=1';
        
        console.log(`Visiting: ${searchUrl}`);
        const registrationLinks = await mySidelineService.captureRegistrationLinks(searchUrl);
        
        console.log(`\nFound ${registrationLinks.length} registration links:\n`);
        
        registrationLinks.forEach((link, index) => {
            console.log(`${index + 1}. Event: ${link.eventTitle || 'Unknown Title'}`);
            console.log(`   Date: ${link.eventDate || 'Unknown Date'}`);
            console.log(`   Location: ${link.eventLocation || 'Unknown Location'}`);
            console.log(`   Registration URL: ${link.registrationUrl}`);
            console.log(`   Event ID: ${link.eventId || 'Not found'}`);
            console.log('');
        });

        if (registrationLinks.length === 0) {
            console.log('No registration links found. This could mean:');
            console.log('- No events are currently available for registration');
            console.log('- The page structure has changed');
            console.log('- The search returned no results');
        }

    } catch (error) {
        console.error('Error testing MySideline links:', error.message);
        console.error('\nThis could be due to:');
        console.error('- Network connectivity issues');
        console.error('- MySideline website being unavailable');
        console.error('- Changes to the website structure');
        console.error('- Browser automation issues');
    }
}

// Run if called directly
if (require.main === module) {
    testMySidelineLinks()
        .then(() => {
            console.log('Test completed.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = testMySidelineLinks;