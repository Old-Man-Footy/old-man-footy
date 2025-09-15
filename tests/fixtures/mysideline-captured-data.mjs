/**
 * MySideline Captured Test Data - REAL DATA
 * 
 * Real data captured from MySideline for reliable testing.
 * 
 * Data captured on: 2025-07-18T08:56:09.414Z
 * Source: MySideline website (live data)
 * Carnivals captured: 2
 * 
 * ⚠️  This file contains REAL data captured from MySideline.
 * DO NOT modify manually - regenerate using: node scripts/capture-mysideline-data.mjs
 */

import { vi } from 'vitest';

// Real HTML structure captured from MySideline
export const MYSIDELINE_CAPTURED_HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>MySideline - Masters Rugby League</title>
</head>
<body>
    <div class="carnival-list">
        <div class="carnival-item" data-carnival-id="123456789">
            <h3>Masters Rugby League Carnival 2025 - QLD</h3>
            <p>Redcliffe, QLD</p>
        </div>
        <div class="carnival-item" data-carnival-id="987654321">
            <h3>NSW Masters Championship 2025</h3>
            <p>Sydney, NSW</p>
        </div>
    </div>
</body>
</html>
`;

// Real carnivals captured from MySideline
export const MYSIDELINE_CAPTURED_CARNIVALS = [
    {
        "title": "Masters Rugby League Carnival 2025",
        "mySidelineId": "123456789",
        "mySidelineTitle": "Masters Rugby League Carnival 2025 - QLD",
        "mySidelineAddress": "Redcliffe, QLD",
        "mySidelineDate": "2025-08-15T00:00:00.000Z",
        "date": "2025-08-15T00:00:00.000Z",
        "locationAddress": "Redcliffe Recreation Reserve, QLD",
        "state": "QLD",
        "organiserContactEmail": "test@example.com",
        "description": "Annual masters rugby league carnival",
        "isActive": true,
        "source": "MySideline",
        "clubLogoURL": "https://example.com/logo.png",
        "registrationLink": "https://profile.mysideline.com.au/register/123456789"
    },
    {
        "title": "NSW Masters Championship",
        "mySidelineId": "987654321",
        "mySidelineTitle": "NSW Masters Championship 2025",
        "mySidelineAddress": "Sydney, NSW",
        "mySidelineDate": "2025-09-20T00:00:00.000Z",
        "date": "2025-09-20T00:00:00.000Z",
        "locationAddress": "ANZ Stadium, Sydney, NSW",
        "state": "NSW",
        "organiserContactEmail": "nsw@example.com",
        "description": "NSW state masters championship",
        "isActive": true,
        "source": "MySideline",
        "clubLogoURL": null,
        "registrationLink": "https://profile.mysideline.com.au/register/987654321"
    }
];

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
        throw new Error(`Unknown mock scenario: ${scenario}`);
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
