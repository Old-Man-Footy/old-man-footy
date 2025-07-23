/**
 * Utility functions for formatting and handling carnival address/location data.
 * Provides helpers to structure address parts, generate Google Maps URLs, and check for location presence.
 */

/**
 * Format address parts into a structured display
 * @param {Object} carnival - Carnival object with location fields
 * @returns {Object} Formatted address data
 */
function formatCarnivalAddress(carnival) {
    // Check if we have MySideline-compatible fields first
    if (carnival.locationSuburb || carnival.locationPostcode || carnival.locationLatitude) {
        const addressComponents = [];
        
        // Add structured address lines from MySideline
        if (carnival.locationAddressLine1) {
            addressComponents.push(carnival.locationAddressLine1.trim());
        }
        if (carnival.locationAddressLine2) {
            addressComponents.push(carnival.locationAddressLine2.trim());
        }
        
        // Add suburb, state, postcode line
        let locationLine = '';
        if (carnival.locationSuburb) {
            locationLine += carnival.locationSuburb;
        }
        if (carnival.state) {
            locationLine += (locationLine ? ' ' : '') + carnival.state;
        }
        if (carnival.locationPostcode) {
            locationLine += (locationLine ? ' ' : '') + carnival.locationPostcode;
        }
        if (locationLine) {
            addressComponents.push(locationLine);
        }
        
        // Add country if different from default
        if (carnival.locationCountry && carnival.locationCountry !== 'Australia') {
            addressComponents.push(carnival.locationCountry);
        }
        
        const displayParts = addressComponents.filter(part => part && part.trim().length > 0);
        const fullAddressForMaps = displayParts.join(', ');
        
        if (displayParts.length > 0) {
            // Generate Google Maps URL - prefer coordinates if available
            let googleMapsUrl;
            if (carnival.locationLatitude && carnival.locationLongitude) {
                googleMapsUrl = `https://maps.google.com/?q=${carnival.locationLatitude},${carnival.locationLongitude}`;
            } else {
                googleMapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(fullAddressForMaps)}`;
            }
            
            return {
                parts: displayParts,
                fullAddress: fullAddressForMaps,
                googleMapsUrl,
                primaryLine: displayParts[0] || '',
                secondaryLines: displayParts.slice(1),
                hasStructuredParts: true
            };
        }
    }
    
    // Fall back to main address field only
    if (carnival.locationAddress && carnival.locationAddress.trim().length > 0) {
        const fullAddress = carnival.locationAddress.trim();
        const googleMapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`;
        
        return {
            parts: [fullAddress],
            fullAddress: fullAddress,
            googleMapsUrl,
            primaryLine: fullAddress,
            secondaryLines: [],
            hasStructuredParts: false
        };
    }
    
    // No address data available
    return null;
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

export {
    formatCarnivalAddress,
    getGoogleMapsUrl,
    hasLocationData
};
