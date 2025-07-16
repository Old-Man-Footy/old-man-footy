/**
 * View Helper Utilities
 * 
 * Provides helper functions and constants for EJS templates
 */

import { 
    APPROVAL_STATUS, 
    SPONSORSHIP_LEVELS, 
    AUSTRALIAN_STATES,
    PLAYER_SHORTS_COLORS,
    ATTENDANCE_STATUS
} from '../config/constants.mjs';

/**
 * Get constants for use in EJS templates
 * @returns {Object} Object containing all constants
 */
export function getViewConstants() {
    return {
        APPROVAL_STATUS,
        SPONSORSHIP_LEVELS,
        AUSTRALIAN_STATES,
        PLAYER_SHORTS_COLORS,
        ATTENDANCE_STATUS
    };
}

/**
 * Format approval status for display
 * @param {string} status - Approval status
 * @returns {string} Formatted status
 */
export function formatApprovalStatus(status) {
    switch (status) {
        case APPROVAL_STATUS.APPROVED:
            return 'Approved';
        case APPROVAL_STATUS.PENDING:
            return 'Pending';
        case APPROVAL_STATUS.REJECTED:
            return 'Rejected';
        default:
            return 'Unknown';
    }
}

/**
 * Get CSS class for approval status
 * @param {string} status - Approval status
 * @returns {string} CSS class name
 */
export function getApprovalStatusClass(status) {
    switch (status) {
        case APPROVAL_STATUS.APPROVED:
            return 'text-success';
        case APPROVAL_STATUS.PENDING:
            return 'text-warning';
        case APPROVAL_STATUS.REJECTED:
            return 'text-danger';
        default:
            return 'text-muted';
    }
}

/**
 * Format sponsorship level for display
 * @param {string} level - Sponsorship level
 * @returns {string} Formatted level
 */
export function formatSponsorshipLevel(level) {
    return level || SPONSORSHIP_LEVELS.BRONZE;
}

/**
 * Get CSS class for sponsorship level
 * @param {string} level - Sponsorship level
 * @returns {string} CSS class name
 */
export function getSponsorshipLevelClass(level) {
    switch (level) {
        case SPONSORSHIP_LEVELS.GOLD:
            return 'tier-gold';
        case SPONSORSHIP_LEVELS.SILVER:
            return 'tier-silver';
        case SPONSORSHIP_LEVELS.BRONZE:
            return 'tier-bronze';
        default:
            return 'tier-supporting';
    }
}