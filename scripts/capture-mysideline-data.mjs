/**
 * MySideline Data Capture Utility
 * 
 * This utility captures real data from MySideline website and saves it locally
 * for use in tests. Run this periodically to refresh test fixtures with actual data.
 * 
 * Usage: node scripts/capture-mysideline-data.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Captures live MySideline data and saves to test fixtures
 */
async function captureMySidelineData() {
    console.log('🌐 Capturing MySideline data...');
    
    try {
        // Import the scraper service
        const { default: MySidelineScraperService } = await import('/services/mySidelineScraperService.mjs');
        
        const scraperService = new MySidelineScraperService();
        
        // Capture live events
        console.log('📡 Fetching live events from MySideline...');
        const liveEvents = await scraperService.scrapeEvents();
        
        // Also capture the raw HTML if possible
        let rawHTML = null;
        try {
            // Use the same URL that the scraper service uses
            const mySidelineUrl = process.env.MYSIDELINE_URL || 'https://profile.mysideline.com.au/register/clubsearch/?criteria=Masters&source=rugby-league';
            const response = await fetch(mySidelineUrl);
            if (response.ok) {
                rawHTML = await response.text();
                console.log('📄 Captured raw HTML from MySideline');
            }
        } catch (htmlError) {
            console.warn('⚠️  Could not capture raw HTML:', htmlError.message);
        }
        
        if (liveEvents && liveEvents.length > 0) {
            console.log(`✅ Captured ${liveEvents.length} live events`);
            
            // Generate test fixtures content with real data
            const fixtureContent = generateFixtureFile(liveEvents, rawHTML);
            
            // Ensure fixtures directory exists
            const fixturesDir = path.join(__dirname, '/tests/fixtures');
            await fs.mkdir(fixturesDir, { recursive: true });
            
            // Save to fixtures file
            const fixturesPath = path.join(fixturesDir, 'mysideline-captured-data.mjs');
            await fs.writeFile(fixturesPath, fixtureContent, 'utf8');
            
            console.log(`💾 Saved captured data to: ${fixturesPath}`);
            console.log('🎯 Test fixtures updated with real MySideline data!');
            
            // Log sample of captured data
            console.log('\n📋 Sample captured event:');
            console.log(`   Title: ${liveEvents[0].title}`);
            console.log(`   ID: ${liveEvents[0].mySidelineId}`);
            console.log(`   Location: ${liveEvents[0].locationAddress}`);
            console.log(`   Date: ${liveEvents[0].date}`);
            
        } else {
            console.log('⚠️  No events found on MySideline');
            console.log('📝 This could be normal if no events are currently listed');
            
            // Still create a fixture file with empty data for testing
            const fixtureContent = generateEmptyFixtureFile();
            const fixturesDir = path.join(__dirname, '/tests/fixtures');
            await fs.mkdir(fixturesDir, { recursive: true });
            const fixturesPath = path.join(fixturesDir, 'mysideline-captured-data.mjs');
            await fs.writeFile(fixturesPath, fixtureContent, 'utf8');
            
            console.log('📝 Created empty fixture file for testing');
        }
        
    } catch (error) {
        console.error('❌ Failed to capture MySideline data:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Create fallback fixture for testing
        console.log('📝 Creating fallback fixture file...');
        const fallbackContent = generateFallbackFixtureFile(error);
        const fixturesDir = path.join(__dirname, '/tests/fixtures');
        await fs.mkdir(fixturesDir, { recursive: true });
        const fixturesPath = path.join(fixturesDir, 'mysideline-captured-data.mjs');
        await fs.writeFile(fixturesPath, fallbackContent, 'utf8');
        
        throw error;
    }
}

/**
 * Generates the fixture file content with real captured data
 * @param {Array} capturedEvents - Real events captured from MySideline
 * @param {string|null} rawHTML - Raw HTML captured from MySideline (if available)
 * @returns {string} File content for the fixture
 */
function generateFixtureFile(capturedEvents, rawHTML = null) {
    const timestamp = new Date().toISOString();
    const sanitizedHTML = rawHTML ? sanitizeHTMLForFixture(rawHTML) : '<html><body><!-- HTML not captured --></body></html>';
    
    return `/**
 * MySideline Captured Test Data - REAL DATA
 * 
 * Real data captured from MySideline for reliable testing.
 * 
 * Data captured on: ${timestamp}
 * Source: MySideline website (live data)
 * Events captured: ${capturedEvents.length}
 * 
 * ⚠️  This file contains REAL data captured from MySideline.
 * DO NOT modify manually - regenerate using: node scripts/capture-mysideline-data.mjs
 */

import { vi } from 'vitest';

// Real HTML structure captured from MySideline
export const MYSIDELINE_CAPTURED_HTML = \`${sanitizedHTML}\`;

// Real events captured from MySideline
export const MYSIDELINE_CAPTURED_EVENTS = ${JSON.stringify(capturedEvents, null, 4)};

// Mock responses using real captured data
export const MYSIDELINE_CAPTURED_RESPONSES = {
    SUCCESS: {
        status: 200,
        ok: true,
        text: () => Promise.resolve(MYSIDELINE_CAPTURED_HTML),
        json: () => Promise.resolve({ events: MYSIDELINE_CAPTURED_EVENTS })
    },
    
    NETWORK_ERROR: {
        status: 500,
        ok: false,
        text: () => Promise.reject(new Error('Network request failed'))
    },
    
    NOT_FOUND: {
        status: 404,
        ok: false,
        text: () => Promise.resolve('<html><body><h1>404 Not Found</h1></body></html>')
    }
};

/**
 * Creates a mock fetch using real captured data
 * @param {string} scenario - 'SUCCESS', 'NETWORK_ERROR', or 'NOT_FOUND'
 * @returns {Function} Mock fetch function for Vitest
 */
export function createCapturedMockFetch(scenario = 'SUCCESS') {
    const mockResponse = MYSIDELINE_CAPTURED_RESPONSES[scenario];
    if (!mockResponse) {
        throw new Error(\`Unknown mock scenario: \${scenario}\`);
    }
    return vi.fn().mockResolvedValue(mockResponse);
}

/**
 * Helper function to get captured events with custom modifications
 * @param {Object} overrides - Properties to override in the captured data
 * @returns {Array} Modified captured events
 */
export function getCapturedEvents(overrides = {}) {
    return MYSIDELINE_CAPTURED_EVENTS.map(event => ({
        ...event,
        ...overrides
    }));
}

/**
 * Database test data derived from captured events
 */
export const MYSIDELINE_DB_TEST_DATA = {
    EXPECTED_CARNIVALS: MYSIDELINE_CAPTURED_EVENTS.map(event => ({
        title: event.title,
        mySidelineId: event.mySidelineId,
        mySidelineTitle: event.mySidelineTitle,
        mySidelineAddress: event.mySidelineAddress,
        mySidelineDate: event.mySidelineDate,
        date: event.date,
        locationAddress: event.locationAddress,
        state: event.state,
        organiserContactEmail: event.organiserContactEmail,
        description: event.description,
        isActive: true,
        source: 'MySideline'
    }))
};

export default {
    MYSIDELINE_CAPTURED_HTML,
    MYSIDELINE_CAPTURED_EVENTS,
    MYSIDELINE_CAPTURED_RESPONSES,
    MYSIDELINE_DB_TEST_DATA,
    createCapturedMockFetch,
    getCapturedEvents
};
`;
}

/**
 * Generates an empty fixture file when no events are found
 * @returns {string} Empty fixture file content
 */
function generateEmptyFixtureFile() {
    const timestamp = new Date().toISOString();
    
    return `/**
 * MySideline Captured Test Data - EMPTY RESULT
 * 
 * No events were found on MySideline when data was captured.
 * 
 * Data captured on: ${timestamp}
 * Source: MySideline website (live data)
 * Events captured: 0
 */

import { vi } from 'vitest';

export const MYSIDELINE_CAPTURED_HTML = '<html><body><div class="event-list"></div></body></html>';
export const MYSIDELINE_CAPTURED_EVENTS = [];

export const MYSIDELINE_CAPTURED_RESPONSES = {
    SUCCESS: {
        status: 200,
        ok: true,
        text: () => Promise.resolve(MYSIDELINE_CAPTURED_HTML),
        json: () => Promise.resolve({ events: MYSIDELINE_CAPTURED_EVENTS })
    },
    NETWORK_ERROR: {
        status: 500,
        ok: false,
        text: () => Promise.reject(new Error('Network request failed'))
    }
};

export function createCapturedMockFetch(scenario = 'SUCCESS') {
    const mockResponse = MYSIDELINE_CAPTURED_RESPONSES[scenario];
    return vi.fn().mockResolvedValue(mockResponse);
}

export function getCapturedEvents(overrides = {}) {
    return [];
}

export const MYSIDELINE_DB_TEST_DATA = {
    EXPECTED_CARNIVALS: []
};

export default {
    MYSIDELINE_CAPTURED_HTML,
    MYSIDELINE_CAPTURED_EVENTS,
    MYSIDELINE_CAPTURED_RESPONSES,
    MYSIDELINE_DB_TEST_DATA,
    createCapturedMockFetch,
    getCapturedEvents
};
`;
}

/**
 * Generates a fallback fixture file when capture fails
 * @param {Error} error - The error that occurred during capture
 * @returns {string} Fallback fixture file content
 */
function generateFallbackFixtureFile(error) {
    const timestamp = new Date().toISOString();
    
    return `/**
 * MySideline Captured Test Data - FALLBACK
 * 
 * Capture failed, using fallback data for testing.
 * 
 * Data capture attempted on: ${timestamp}
 * Error: ${error.message}
 */

import { vi } from 'vitest';

export const MYSIDELINE_CAPTURED_HTML = '<html><body><!-- Capture failed --></body></html>';
export const MYSIDELINE_CAPTURED_EVENTS = [];

export const MYSIDELINE_CAPTURED_RESPONSES = {
    SUCCESS: {
        status: 200,
        ok: true,
        text: () => Promise.resolve(MYSIDELINE_CAPTURED_HTML),
        json: () => Promise.resolve({ events: MYSIDELINE_CAPTURED_EVENTS })
    },
    NETWORK_ERROR: {
        status: 500,
        ok: false,
        text: () => Promise.reject(new Error('${error.message}'))
    }
};

export function createCapturedMockFetch(scenario = 'SUCCESS') {
    const mockResponse = MYSIDELINE_CAPTURED_RESPONSES[scenario];
    return vi.fn().mockResolvedValue(mockResponse);
}

export function getCapturedEvents(overrides = {}) {
    return [];
}

export const MYSIDELINE_DB_TEST_DATA = {
    EXPECTED_CARNIVALS: []
};

export default {
    MYSIDELINE_CAPTURED_HTML,
    MYSIDELINE_CAPTURED_EVENTS,
    MYSIDELINE_CAPTURED_RESPONSES,
    MYSIDELINE_DB_TEST_DATA,
    createCapturedMockFetch,
    getCapturedEvents
};
`;
}

/**
 * Sanitizes HTML for inclusion in a JavaScript template literal
 * @param {string} html - Raw HTML to sanitize
 * @returns {string} Sanitized HTML safe for template literals
 */
function sanitizeHTMLForFixture(html) {
    return html
        .replace(/`/g, '\\`')        // Escape backticks
        .replace(/\${/g, '\\${')     // Escape template literal expressions
        .replace(/\\/g, '\\\\')      // Escape backslashes
        .substring(0, 10000);        // Limit size for fixture files
}

// Run the capture if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    captureMySidelineData()
        .then(() => {
            console.log('✅ Data capture completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Data capture failed:', error.message);
            process.exit(1);
        });
}

export { captureMySidelineData };