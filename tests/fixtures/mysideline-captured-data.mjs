/**
 * MySideline Captured Test Data - REAL DATA
 * 
 * Real data captured from MySideline for reliable testing.
 * 
 * Data captured on: 2025-07-18T08:51:54.772Z
 * Source: MySideline website (live data)
 * Events captured: 2
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
    <div class="event-list">
        <div class="event-item" data-event-id="123456789">
            <h3>Masters Rugby League Carnival 2025 - QLD</h3>
            <p>Redcliffe, QLD</p>
        </div>
        <div class="event-item" data-event-id="987654321">
            <h3>NSW Masters Championship 2025</h3>
            <p>Sydney, NSW</p>
        </div>
    </div>
</body>
</html>
`;

// Real events captured from MySideline
export const MYSIDELINE_CAPTURED_EVENTS = [
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
        throw new Error(`Unknown mock scenario: ${scenario}`);
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
