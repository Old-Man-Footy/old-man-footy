/**
 * Sponsor Sorting Service
 * 
 * Provides utility functions for consistent sponsor sorting across the application.
 * Implements hierarchical sorting by sponsor level, display order, and creation date.
 */

/**
 * Define sponsor level hierarchy (lower number = higher priority)
 */
const SPONSOR_LEVEL_PRIORITY = {
    'Gold': 1,
    'Silver': 2,
    'Bronze': 3,
    'Supporting': 4,
    'In-Kind': 5
};

/**
 * Sort sponsors hierarchically by:
 * 1. Sponsor Level (Gold, Silver, Bronze, Supporting, In-Kind)
 * 2. Display Order (ascending)
 * 3. Creation date (oldest first) if display orders are the same
 * 
 * @param {Array} sponsors - Array of sponsor objects
 * @param {string} relationshipType - Type of relationship ('club' or 'carnival')
 * @returns {Array} Sorted array of sponsors
 */
const sortSponsorsHierarchically = (sponsors, relationshipType = 'club') => {
    if (!Array.isArray(sponsors) || sponsors.length === 0) {
        return sponsors;
    }

    return sponsors.sort((a, b) => {
        // 1. Primary sort: Sponsor Level (Gold > Silver > Bronze > Supporting > In-Kind)
        const levelA = SPONSOR_LEVEL_PRIORITY[a.sponsorshipLevel] || 999;
        const levelB = SPONSOR_LEVEL_PRIORITY[b.sponsorshipLevel] || 999;
        
        if (levelA !== levelB) {
            return levelA - levelB;
        }

        // 2. Secondary sort: Display Order (ascending)
        let displayOrderA, displayOrderB;
        
        if (relationshipType === 'carnival') {
            displayOrderA = a.CarnivalSponsor?.displayOrder || 999;
            displayOrderB = b.CarnivalSponsor?.displayOrder || 999;
        } else {
            displayOrderA = a.ClubSponsor?.displayOrder || a.clubSponsor?.displayOrder || 999;
            displayOrderB = b.ClubSponsor?.displayOrder || b.clubSponsor?.displayOrder || 999;
        }
        
        if (displayOrderA !== displayOrderB) {
            return displayOrderA - displayOrderB;
        }

        // 3. Tertiary sort: Creation date (oldest first)
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        
        return dateA - dateB;
    });
};

/**
 * Get sponsor level display name with priority indicator
 * @param {string} level - Sponsor level
 * @returns {string} Display name with priority
 */
const getSponsorLevelDisplay = (level) => {
    const priority = SPONSOR_LEVEL_PRIORITY[level];
    return priority ? `${level} (Priority: ${priority})` : level || 'Unspecified';
};

/**
 * Get all sponsor levels in order of priority
 * @returns {Array} Array of sponsor levels ordered by priority
 */
const getSponsorLevelsByPriority = () => {
    return Object.keys(SPONSOR_LEVEL_PRIORITY).sort((a, b) => 
        SPONSOR_LEVEL_PRIORITY[a] - SPONSOR_LEVEL_PRIORITY[b]
    );
};

export {
    sortSponsorsHierarchically,
    getSponsorLevelDisplay,
    getSponsorLevelsByPriority,
    SPONSOR_LEVEL_PRIORITY
};