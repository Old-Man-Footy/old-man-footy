/**
 * Sponsor Sorting Service
 * 
 * Provides sorting functionality for sponsors based on sponsorship levels
 * and other criteria.
 */

import { SPONSORSHIP_LEVEL_ORDER } from '../config/constants.mjs';

/**
 * Sort sponsors hierarchically for display purposes
 * @param {Array} sponsors - Array of sponsor objects
 * @param {string} context - Context for sorting ('carnival', 'club', etc.)
 * @returns {Array} Hierarchically sorted array of sponsors
 */
export function sortSponsorsHierarchically(sponsors, context = 'default') {
  if (!sponsors || !Array.isArray(sponsors)) {
    return [];
  }

  // For carnival context, use display order with level fallback
  if (context === 'carnival') {
    return SponsorSortingService.sortByDisplayOrder(sponsors);
  }
  
  // For other contexts, use level-based sorting
  return SponsorSortingService.sortByLevel(sponsors);
}

/**
 * Sponsor sorting service class
 */
class SponsorSortingService {
  /**
   * Sort sponsors by sponsorship level and sponsor name
   * @param {Array} sponsors - Array of sponsor objects
   * @returns {Array} Sorted array of sponsors
   */
  static sortByLevel(sponsors) {
    return sponsors.sort((a, b) => {
      // Primary sort: sponsorship level (Gold first, then Silver, etc.)
      const levelA = SPONSORSHIP_LEVEL_ORDER[a.sponsorshipLevel] || 999;
      const levelB = SPONSORSHIP_LEVEL_ORDER[b.sponsorshipLevel] || 999;
      
      if (levelA !== levelB) {
        return levelA - levelB;
      }
      
      // Secondary sort: sponsor name alphabetically
      return a.sponsorName.localeCompare(b.sponsorName);
    });
  }

  /**
   * Sort sponsors by sponsorship level and sponsor name (legacy method for backwards compatibility)
   * @param {Array} sponsors - Array of sponsor objects
   * @returns {Array} Sorted array of sponsors
   */
  static sortByDisplayOrder(sponsors) {
    // Since displayOrder is being removed, use level-based sorting
    return this.sortByLevel(sponsors);
  }

  /**
   * Sort sponsors by value (highest first)
   * @param {Array} sponsors - Array of sponsor objects
   * @returns {Array} Sorted array of sponsors
   */
  static sortByValue(sponsors) {
    return sponsors.sort((a, b) => {
      const valueA = parseFloat(a.sponsorshipValue) || 0;
      const valueB = parseFloat(b.sponsorshipValue) || 0;
      
      if (valueA !== valueB) {
        return valueB - valueA; // Highest first
      }
      
      // Fallback to level sorting
      return this.sortByLevel([a, b])[0] === a ? -1 : 1;
    });
  }
}

export default SponsorSortingService;