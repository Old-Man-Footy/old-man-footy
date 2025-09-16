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
 * @param {string} [outputDir] - Optional directory to save the fixture file.
 */
async function captureMySidelineData(outputDir) {
    console.log('🌐 Capturing MySideline data...');
    
    const fixturesDir = outputDir || path.join(__dirname, '/tests/fixtures');
    const fixturesPath = path.join(fixturesDir, 'mysideline-captured-data.mjs');

    try {
        // Import the scraper service
        const { default: MySidelineScraperService } = await import('../services/mySidelineScraperService.mjs');
        
        const scraperService = new MySidelineScraperService();
        
        // Capture live carnivals
        console.log('📡 Fetching live carnivals from MySideline...');
        const liveCarnivals = await scraperService.scrapeCarnivals();
        
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
        
        if (liveCarnivals && liveCarnivals.length > 0) {
            console.log(`✅ Captured ${liveCarnivals.length} live carnivals`);
            
            // Generate test fixtures content with real data
            const fixtureContent = generateFixtureFile(liveCarnivals, rawHTML);
            
            // Ensure fixtures directory exists
            await fs.mkdir(fixturesDir, { recursive: true });
            
            // Save to fixtures file
            await fs.writeFile(fixturesPath, fixtureContent, 'utf8');
            
            console.log(`💾 Saved captured data to: ${fixturesPath}`);
            console.log('🎯 Test fixtures updated with real MySideline data!');
            
            // Log sample of captured data
            console.log('\n📋 Sample captured carnival:');
            console.log(`   Title: ${liveCarnivals[0].title}`);
            console.log(`   ID: ${liveCarnivals[0].mySidelineId}`);
            console.log(`   Location: ${liveCarnivals[0].locationAddress}`);
            console.log(`   Date: ${liveCarnivals[0].date}`);
            
        } else {
            console.log('⚠️  No carnivals found on MySideline');
            console.log('📝 This could be normal if no carnivals are currently listed');
            
            // Still create a fixture file with empty data for testing
            const fixtureContent = generateEmptyFixtureFile();
            await fs.mkdir(fixturesDir, { recursive: true });
            await fs.writeFile(fixturesPath, fixtureContent, 'utf8');
            
            console.log('📝 Created empty fixture file for testing');
        }
        
    } catch (error) {
        console.error('❌ Failed to capture MySideline data:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Create fallback fixture for testing
        console.log('📝 Creating fallback fixture file...');
        const fallbackContent = generateFallbackFixtureFile(error);
        await fs.mkdir(fixturesDir, { recursive: true });
        await fs.writeFile(fixturesPath, fallbackContent, 'utf8');
        
        throw error;
    }
}

/**
 * Generates the fixture file content with real captured data
 * @param {Array} capturedCarnivals - Real carnivals captured from MySideline
 * @param {string|null} rawHTML - Raw HTML captured from MySideline (if available)
 * @returns {string} File content for the fixture
 */
function generateFixtureFile(capturedCarnivals, rawHTML = null) {
    const timestamp = new Date().toISOString();
    const sanitizedHTML = rawHTML ? sanitizeHTMLForFixture(rawHTML) : '<html><body><!-- HTML not captured --></body></html>';
    
    return `/**
 * MySideline Captured Test Data - REAL DATA
 * 
 * Real data captured from MySideline for reliable testing.
 * 
 * Data captured on: ${timestamp}
 * Source: MySideline website (live data)
 * Carnivals captured: ${capturedCarnivals.length}
 * 
 * ⚠️  This file contains REAL data captured from MySideline.
 * DO NOT modify manually - regenerate using: node scripts/capture-mysideline-data.mjs
 */

import { vi } from 'vitest';

// Real HTML structure captured from MySideline
export const MYSIDELINE_CAPTURED_HTML = \`${sanitizedHTML}\`;

// Real carnivals captured from MySideline
export const MYSIDELINE_CAPTURED_CARNIVALS = ${JSON.stringify(capturedCarnivals, null, 4)};

// Mock responses using real captured data
export const MYSIDELINE_CAPTURED_RESPONSES = {
    SUCCESS: {
        status: 200,
        ok: true,
        text: () => Promise.resolve(MYSIDELINE_CAPTURED_HTML),
        json: () => Promise.resolve({ carnivals: MYSIDELINE_CAPTURED_CARNIVALS })
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
 * Helper function to get captured carnivals with custom modifications
 * @param {Object} overrides - Properties to override in the captured data
 * @returns {Array} Modified captured carnivals
 */
export function getCapturedCarnivals(overrides = {}) {
    return MYSIDELINE_CAPTURED_CARNIVALS.map(carnival => ({
        ...carnival,
        ...overrides
    }));
}

/**
 * Database test data derived from captured carnivals
 */
export const MYSIDELINE_DB_TEST_DATA = {
    EXPECTED_CARNIVALS: MYSIDELINE_CAPTURED_CARNIVALS.map(carnival => ({
        title: carnival.title,
        mySidelineId: carnival.mySidelineId,
        mySidelineTitle: carnival.mySidelineTitle,
        mySidelineAddress: carnival.mySidelineAddress,
        mySidelineDate: carnival.mySidelineDate,
        date: carnival.date,
        locationAddress: carnival.locationAddress,
        state: carnival.state,
        organiserContactEmail: carnival.organiserContactEmail,
        description: carnival.description,
        isActive: true,
        source: 'MySideline'
    }))
};

export default {
    MYSIDELINE_CAPTURED_HTML,
    MYSIDELINE_CAPTURED_CARNIVALS,
    MYSIDELINE_CAPTURED_RESPONSES,
    MYSIDELINE_DB_TEST_DATA,
    createCapturedMockFetch,
    getCapturedCarnivals
};
`;
}

/**
 * Generates an empty fixture file when no carnivals are found
 * @returns {string} Empty fixture file content
 */
function generateEmptyFixtureFile() {
    const timestamp = new Date().toISOString();
    
    return `/**
 * MySideline Captured Test Data - EMPTY RESULT
 * 
 * No carnivals were found on MySideline when data was captured.
 * 
 * Data captured on: ${timestamp}
 * Source: MySideline website (live data)
 * Carnivals captured: 0
 */

import { vi } from 'vitest';

export const MYSIDELINE_CAPTURED_HTML = '<html><body><div class="carnival-list"></div></body></html>';
export const MYSIDELINE_CAPTURED_CARNIVALS = [];

export const MYSIDELINE_CAPTURED_RESPONSES = {
    SUCCESS: {
        status: 200,
        ok: true,
        text: () => Promise.resolve(MYSIDELINE_CAPTURED_HTML),
        json: () => Promise.resolve({ carnivals: MYSIDELINE_CAPTURED_CARNIVALS })
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

export function getCapturedCarnivals(overrides = {}) {
    return [];
}

export const MYSIDELINE_DB_TEST_DATA = {
    EXPECTED_CARNIVALS: []
};

export default {
    MYSIDELINE_CAPTURED_HTML,
    MYSIDELINE_CAPTURED_CARNIVALS,
    MYSIDELINE_CAPTURED_RESPONSES,
    MYSIDELINE_DB_TEST_DATA,
    createCapturedMockFetch,
    getCapturedCarnivals
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
export const MYSIDELINE_CAPTURED_CARNIVALS = [];

export const MYSIDELINE_CAPTURED_RESPONSES = {
    SUCCESS: {
        status: 200,
        ok: true,
        text: () => Promise.resolve(MYSIDELINE_CAPTURED_HTML),
        json: () => Promise.resolve({ carnivals: MYSIDELINE_CAPTURED_CARNIVALS })
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

export function getCapturedCarnivals(overrides = {}) {
    return [];
}

export const MYSIDELINE_DB_TEST_DATA = {
    EXPECTED_CARNIVALS: []
};

export default {
    MYSIDELINE_CAPTURED_HTML,
    MYSIDELINE_CAPTURED_CARNIVALS,
    MYSIDELINE_CAPTURED_RESPONSES,
    MYSIDELINE_DB_TEST_DATA,
    createCapturedMockFetch,
    getCapturedCarnivals
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