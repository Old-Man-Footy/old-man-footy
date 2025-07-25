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
    ATTENDANCE_STATUS,
    CONTACT_INQUIRY_TYPES,
    FEATURE_FLAGS,
    BOOLEAN_STRINGS,
    UI_STATES,
    BOOTSTRAP_COLORS,
    AUDIT_RESULTS
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
        ATTENDANCE_STATUS,
        CONTACT_INQUIRY_TYPES,
        FEATURE_FLAGS,
        BOOLEAN_STRINGS,
        UI_STATES,
        BOOTSTRAP_COLORS,
        AUDIT_RESULTS
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

/**
 * Check if user has admin or primary delegate role
 * @param {Object} user - User object
 * @returns {boolean} True if user has admin or primary delegate role
 */
export function isAdminOrPrimaryDelegate(user) {
    return user && (user.isAdmin || user.isPrimaryDelegate);
}

/**
 * Check if user has admin role
 * @param {Object} user - User object
 * @returns {boolean} True if user has admin role
 */
export function isAdmin(user) {
    return user && user.isAdmin;
}

/**
 * Get display name for user role based on boolean flags
 * @param {Object} user - User object with isAdmin and isPrimaryDelegate boolean fields
 * @returns {string} Display name for role
 */
export function formatUserRole(user) {
    if (!user) return 'Unknown';
    
    if (user.isAdmin) {
        return 'Administrator';
    } else if (user.isPrimaryDelegate) {
        return 'Primary Delegate';
    } else {
        return 'Delegate';
    }
}

/**
 * Get Bootstrap color class for attendance status
 * @param {string} status - Attendance status
 * @returns {string} Bootstrap color class
 */
export function getAttendanceStatusClass(status) {
    switch (status) {
        case ATTENDANCE_STATUS.CONFIRMED:
            return BOOTSTRAP_COLORS.SUCCESS;
        case ATTENDANCE_STATUS.TENTATIVE:
            return BOOTSTRAP_COLORS.WARNING;
        case ATTENDANCE_STATUS.UNAVAILABLE:
            return BOOTSTRAP_COLORS.DANGER;
        default:
            return BOOTSTRAP_COLORS.SECONDARY;
    }
}

/**
 * Get Bootstrap color class for audit result
 * @param {string} result - Audit result
 * @returns {string} Bootstrap color class
 */
export function getAuditResultClass(result) {
    switch (result) {
        case AUDIT_RESULTS.SUCCESS:
            return BOOTSTRAP_COLORS.PRIMARY;
        case AUDIT_RESULTS.FAILURE:
            return BOOTSTRAP_COLORS.WARNING;
        case AUDIT_RESULTS.ERROR:
            return BOOTSTRAP_COLORS.DANGER;
        default:
            return BOOTSTRAP_COLORS.SECONDARY;
    }
}

/**
 * Get user status button class
 * @param {boolean} isActive - User active status
 * @returns {string} Bootstrap button class
 */
export function getUserStatusButtonClass(isActive) {
    return isActive ? BOOTSTRAP_COLORS.DANGER : BOOTSTRAP_COLORS.SUCCESS;
}