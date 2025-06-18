/**
 * Application Constants
 * 
 * Shared constants used throughout the application.
 * Centralizes commonly used values to maintain consistency and ease maintenance.
 */

/**
 * Australian states and territories
 * Used for form dropdowns, validation, and data processing
 */
const AUSTRALIAN_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

/**
 * State display names mapping
 * Full names for display purposes
 */
const AUSTRALIAN_STATE_NAMES = {
    'NSW': 'New South Wales',
    'QLD': 'Queensland', 
    'VIC': 'Victoria',
    'WA': 'Western Australia',
    'SA': 'South Australia',
    'TAS': 'Tasmania',
    'NT': 'Northern Territory',
    'ACT': 'Australian Capital Territory'
};

/**
 * Common sponsorship levels used across the application
 */
const SPONSORSHIP_LEVELS = ['Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind'];

module.exports = {
    AUSTRALIAN_STATES,
    AUSTRALIAN_STATE_NAMES,
    SPONSORSHIP_LEVELS
};