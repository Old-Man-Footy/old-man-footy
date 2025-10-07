/**
 * Application Constants
 * 
 * Shared constants used throughout the application.
 * Centralizes commonly used values to maintain consistency and ease maintenance.
 */

import fs from 'fs';
import path from 'path';

/**
 * Australian states and territories
 * Used for form dropdowns, validation, and data processing
 */
export const AUSTRALIAN_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];


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
 * Dynamic directory functions for entity-specific gallery scanning
 */

/**
 * Get all gallery directories for a specific entity type
 * @param {string} entityType - Entity type ('carnivals' or 'clubs')
 * @param {boolean} filterPublic - Whether to filter for public entities only
 * @returns {Promise<string[]>} Array of gallery directory paths
 */
export async function getEntityGalleryDirectories(entityType, filterPublic = true) {
    const uploadsPath = path.join('public', 'uploads', entityType);
    const directories = [];
    
    try {
        if (!fs.existsSync(uploadsPath)) {
            return directories;
        }
        
        const entityDirs = fs.readdirSync(uploadsPath);
        
        for (const entityId of entityDirs) {
            const galleryPath = path.join(uploadsPath, entityId, 'gallery');
            
            if (fs.existsSync(galleryPath)) {
                const stat = fs.statSync(galleryPath);
                if (stat.isDirectory()) {
                    // Check for images in the gallery directory
                    const files = fs.readdirSync(galleryPath);
                    const hasImages = files.some(file => 
                        SUPPORTED_GALLERY_EXTENSIONS.includes(path.extname(file).toLowerCase())
                    );
                    
                    if (hasImages) {
                        directories.push(galleryPath);
                    }
                }
            }
        }
        
        // If filtering for public entities, check entity visibility
        if (filterPublic) {
            return await filterPublicEntityDirectories(directories, entityType);
        }
        
        return directories;
    } catch (error) {
        console.error(`Error scanning ${entityType} gallery directories:`, error);
        return directories;
    }
}

/**
 * Filter directories to only include public entities
 * @param {string[]} directories - Array of directory paths
 * @param {string} entityType - Entity type ('carnivals' or 'clubs')
 * @returns {Promise<string[]>} Filtered array of public entity directories
 */
async function filterPublicEntityDirectories(directories, entityType) {
    try {
        // Import models dynamically to avoid circular dependencies
        const { Carnival, Club } = await import('../models/index.mjs');
        
        const publicDirs = [];
        
        for (const dir of directories) {
            // Extract entity ID from path: public/uploads/{entityType}/{id}/gallery
            const pathParts = dir.split(path.sep);
            const entityId = pathParts[pathParts.length - 2]; // Get ID from path
            
            let entity = null;
            if (entityType === 'carnivals') {
                entity = await Carnival.findByPk(entityId, { attributes: ['id', 'isPublic'] });
            } else if (entityType === 'clubs') {
                entity = await Club.findByPk(entityId, { attributes: ['id', 'isPublic'] });
            }
            
            // Include if entity exists and is public (default to true if isPublic field doesn't exist)
            if (entity && (entity.isPublic !== false)) {
                publicDirs.push(dir);
            }
        }
        
        return publicDirs;
    } catch (error) {
        console.error('Error filtering public entity directories:', error);
        // On error, return all directories (fail open)
        return directories;
    }
}

/**
 * Get all entity gallery directories (both carnivals and clubs)
 * @param {boolean} filterPublic - Whether to filter for public entities only
 * @returns {Promise<string[]>} Array of all gallery directory paths
 */
export async function getAllEntityGalleryDirectories(filterPublic = true) {
    const [carnivalDirs, clubDirs] = await Promise.all([
        getEntityGalleryDirectories('carnivals', filterPublic),
        getEntityGalleryDirectories('clubs', filterPublic)
    ]);
    
    return [...carnivalDirs, ...clubDirs];
}

/**
 * Supported image file extensions
 */
export const SUPPORTED_GALLERY_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/**
 * Upload directory paths - Simplified for entity-folder structure compatibility
 * Entity-specific uploads now use: public/uploads/{entityType}s/{id}/{contentType}/
 */
export const UPLOAD_DIRECTORIES = {
    // Root directories (kept for backward compatibility)
    UPLOADS_ROOT: 'public/uploads',
    TEMP: 'public/uploads/temp'
};

/**
 * Array of upload directories for scanning
 */
export const UPLOAD_DIRECTORIES_ARRAY = Object.values(UPLOAD_DIRECTORIES);

/**
 * Upload configuration settings
 */
export const GALLERY_UPLOAD_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/jpg', 
        'image/png'
    ]
};

/**
 * File size limits by content type (also exported individually for test validation)
 */
export const MAX_FILE_SIZES = {
    logos: 5 * 1024 * 1024,      // 5MB for logos
    avatars: 2 * 1024 * 1024,    // 2MB for avatars  
    documents: 10 * 1024 * 1024, // 10MB for documents
    gallery: 10 * 1024 * 1024,   // 10MB for gallery images
    promo: 5 * 1024 * 1024,      // 5MB for promotional images
    promotional: 5 * 1024 * 1024  // 5MB for promotional images
};

/**
 * Allowed file extensions by content type (also exported individually for test validation)
 */
export const ALLOWED_EXTENSIONS = {
    logos: ['.jpg', '.jpeg', '.png', '.svg'],
    avatars: ['.jpg', '.jpeg', '.png'],
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
    gallery: ['.jpg', '.jpeg', '.png'],
    promo: ['.jpg', '.jpeg', '.png'],
    promotional: ['.jpg', '.jpeg', '.png']
};

/**
 * Allowed MIME types by content type (also exported individually for test validation)
 */
export const ALLOWED_MIME_TYPES = {
    logos: ['image/jpeg', 'image/png', 'image/svg+xml'],
    avatars: ['image/jpeg', 'image/png'],
    documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ],
    gallery: ['image/jpeg', 'image/png'],
    promo: ['image/jpeg', 'image/png'],
    promotional: ['image/jpeg', 'image/png']
};

/**
 * Form upload configuration for traditional form-based uploads
 */
export const FORM_UPLOAD_CONFIG = {
    // File size limits by content type
    MAX_FILE_SIZES,
    
    // Allowed file extensions by content type
    ALLOWED_EXTENSIONS,
    
    // Allowed MIME types by content type
    ALLOWED_MIME_TYPES,
    
    // Maximum number of files per upload
    MAX_FILES: 1,
    
    // Field name to subfolder mapping
    FIELD_SUBFOLDER_MAP: {
        logo: 'logos',
        clubLogo: 'logos',
        carnivalLogo: 'logos',
        sponsorLogo: 'logos',
        avatar: 'avatars',
        userAvatar: 'avatars',
        document: 'documents',
        gallery: 'gallery',
        galleryImage: 'gallery',
        promo: 'promo',
        promoImage: 'promo',
        promotional: 'promo'
    }
};

/**
 * Contact inquiry types
 */
export const CONTACT_INQUIRY_TYPES = {
    GENERAL: 'general',
    CARNIVAL: 'carnival',
    DELEGATE: 'delegate',
    TECHNICAL: 'technical',
    SPONSORSHIP: 'sponsorship'
};

/**
 * Feature flags for environment configuration
 */
export const FEATURE_FLAGS = {
    COMING_SOON_MODE: 'FEATURE_COMING_SOON_MODE',
    MAINTENANCE_MODE: 'FEATURE_MAINTENANCE_MODE',
    DEBUG_MODE: 'DEBUG_MODE'
};

/**
 * Boolean string values for consistency
 */
export const BOOLEAN_STRINGS = {
    TRUE: 'true',
    FALSE: 'false'
};

/**
 * Common UI states
 */
export const UI_STATES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ENABLED: 'enabled',
    DISABLED: 'disabled',
    VISIBLE: 'visible',
    HIDDEN: 'hidden'
};

/**
 * Pagination states
 */
export const PAGINATION_STATES = {
    FIRST_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
};

/**
 * Modal and form states
 */
export const FORM_STATES = {
    EXPANDED: 'true',
    COLLAPSED: 'false',
    CHECKED: 'checked',
    SELECTED: 'selected'
};

/**
 * Audit log result constants
 */
export const AUDIT_RESULTS = {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    ERROR: 'ERROR'
};

/**
 * CSS Bootstrap color classes
 */
export const BOOTSTRAP_COLORS = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    DANGER: 'danger',
    WARNING: 'warning',
    INFO: 'info',
    LIGHT: 'light',
    DARK: 'dark'
};

/**
 * Flash message types
 */
export const FLASH_MESSAGE_TYPES = {
    SUCCESS: 'success_msg',
    ERROR: 'error_msg',
    WARNING: 'warning_msg',
    INFO: 'info_msg'
};

/**
 * Email notification types
 * Used for managing user subscription preferences
 */
export const NOTIFICATION_TYPES = {
    CARNIVAL_NOTIFICATIONS: 'Carnival_Notifications',
    DELEGATE_ALERTS: 'Delegate_Alerts',
    WEBSITE_UPDATES: 'Website_Updates',
    PROGRAM_CHANGES: 'Program_Changes',
    SPECIAL_OFFERS: 'Special_Offers',
    COMMUNITY_NEWS: 'Community_News'
};

/**
 * Array of all notification types for iteration and validation
 */
export const NOTIFICATION_TYPES_ARRAY = Object.values(NOTIFICATION_TYPES);

/**
 * Default notification preferences for new user registrations
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = NOTIFICATION_TYPES_ARRAY;