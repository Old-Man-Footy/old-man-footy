/**
 * Address utility functions for carnival location handling
 */

/**
 * Format address parts into a structured display
 * @param {Object} carnival - Carnival object with location fields
 * @returns {Object} Formatted address data
 */
function formatCarnivalAddress(carnival) {
    // Use individual parts if available, otherwise fall back to main address
    const parts = [
        carnival.locationAddressPart1,
        carnival.locationAddressPart2,
        carnival.locationAddressPart3,
        carnival.locationAddressPart4
    ].filter(part => part && part.trim().length > 0);
    
    // Determine which address data to use for display and Google Maps
    let displayParts = [];
    let fullAddressForMaps = '';
    
    if (parts.length > 0) {
        // Use structured address parts
        displayParts = parts;
        fullAddressForMaps = parts.join(', ');
    } else if (carnival.locationAddress && carnival.locationAddress.trim().length > 0) {
        // Fall back to main address field
        displayParts = [carnival.locationAddress.trim()];
        fullAddressForMaps = carnival.locationAddress.trim();
    } else {
        // No address data available
        return null;
    }
    
    const googleMapsUrl = `https://maps.google.com/maps?q=$${encodeURIComponent(fullAddressForMaps)}`;
    
    return {
        parts: displayParts,
        fullAddress: fullAddressForMaps,
        googleMapsUrl,
        primaryLine: displayParts[0] || '',
        secondaryLines: displayParts.slice(1),
        hasStructuredParts: parts.length > 0
    };
}

/**
 * Generate Google Maps URL from carnival location data
 * @param {Object} carnival - Carnival object
 * @returns {string} Google Maps URL
 */
function getGoogleMapsUrl(carnival) {
    const addressData = formatCarnivalAddress(carnival);
    return addressData ? addressData.googleMapsUrl : '#';
}

/**
 * Check if carnival has any location data
 * @param {Object} carnival - Carnival object
 * @returns {boolean} True if carnival has location data
 */
function hasLocationData(carnival) {
    return formatCarnivalAddress(carnival) !== null;
}

// Make functions available globally for EJS templates
if (typeof window !== 'undefined') {
    window.formatCarnivalAddress = formatCarnivalAddress;
    window.getGoogleMapsUrl = getGoogleMapsUrl;
    window.hasLocationData = hasLocationData;
} else if (typeof global !== 'undefined') {
    global.formatCarnivalAddress = formatCarnivalAddress;
    global.getGoogleMapsUrl = getGoogleMapsUrl;
    global.hasLocationData = hasLocationData;
}

// Export for Node.js modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCarnivalAddress,
        getGoogleMapsUrl,
        hasLocationData
    };
}