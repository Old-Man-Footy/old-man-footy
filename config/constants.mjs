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
export const AUSTRALIAN_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

/**
 * State display names mapping
 * Full names for display purposes
 */
export const AUSTRALIAN_STATE_NAMES = {
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
 * Sponsorship levels with consistent ordering
 */
export const SPONSORSHIP_LEVELS = {
    GOLD: 'Gold',
    SILVER: 'Silver', 
    BRONZE: 'Bronze',
    SUPPORTING: 'Supporting',
    IN_KIND: 'In-Kind'
};

/**
 * Array of sponsorship levels for form dropdowns and validation
 */
export const SPONSORSHIP_LEVELS_ARRAY = Object.values(SPONSORSHIP_LEVELS);

/**
 * Sponsorship level display order mapping
 */
export const SPONSORSHIP_LEVEL_ORDER = {
    [SPONSORSHIP_LEVELS.GOLD]: 1,
    [SPONSORSHIP_LEVELS.SILVER]: 2,
    [SPONSORSHIP_LEVELS.BRONZE]: 3,
    [SPONSORSHIP_LEVELS.SUPPORTING]: 4,
    [SPONSORSHIP_LEVELS.IN_KIND]: 5
};

/**
 * Approval status constants
 */
export const APPROVAL_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

/**
 * Array of approval statuses for validation
 */
export const APPROVAL_STATUS_ARRAY = Object.values(APPROVAL_STATUS);

/**
 * Attendance status constants for carnival players
 */
export const ATTENDANCE_STATUS = {
    CONFIRMED: 'confirmed',
    TENTATIVE: 'tentative',
    UNAVAILABLE: 'unavailable'
};

/**
 * Array of attendance statuses for validation
 */
export const ATTENDANCE_STATUS_ARRAY = Object.values(ATTENDANCE_STATUS);

/**
 * Player shorts color constants
 */
export const PLAYER_SHORTS_COLORS = {
    UNRESTRICTED: 'Unrestricted',
    RED: 'Red',
    YELLOW: 'Yellow',
    BLUE: 'Blue',
    GREEN: 'Green'
};

/**
 * Array of shorts colors for validation
 */
export const PLAYER_SHORTS_COLORS_ARRAY = Object.values(PLAYER_SHORTS_COLORS);

/**
 * Logo display size constants for sponsors
 */
export const LOGO_DISPLAY_SIZES = {
    LARGE: 'Large',
    MEDIUM: 'Medium',
    SMALL: 'Small'
};

/**
 * Array of logo display sizes for validation
 */
export const LOGO_DISPLAY_SIZES_ARRAY = Object.values(LOGO_DISPLAY_SIZES);

/**
 * Image directory paths used by CarouselImageService
 */
export const IMAGE_DIRECTORIES = {
    CARNIVAL_GALLERY: 'images/carnival/gallery',
    CARNIVAL_PROMO: 'images/carnival/promo',
    CLUB_GALLERY: 'images/club/gallery', 
    CLUB_PROMO: 'images/club/promo',
    SPONSOR_GALLERY: 'images/sponsor/gallery',
    SPONSOR_PROMO: 'images/sponsor/promo'
};

/**
 * Array of image directories for scanning
 */
export const IMAGE_DIRECTORIES_ARRAY = Object.values(IMAGE_DIRECTORIES);

/**
 * Supported image file extensions
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

/**
 * Upload directory paths
 */
export const UPLOAD_DIRECTORIES = {
    CLUB_LOGOS: 'public/uploads/logos/club',
    CARNIVAL_LOGOS: 'public/uploads/logos/carnival',
    CLUB_PROMO: 'public/uploads/images/club/promo',
    CARNIVAL_PROMO: 'public/uploads/images/carnival/promo',
    CLUB_GALLERY: 'public/uploads/images/club/gallery',
    CARNIVAL_GALLERY: 'public/uploads/images/carnival/gallery',
    DOCUMENTS: 'public/uploads/documents'
};

/**
 * Array of upload directories for scanning
 */
export const UPLOAD_DIRECTORIES_ARRAY = Object.values(UPLOAD_DIRECTORIES);