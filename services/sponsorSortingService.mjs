/**
 * Sponsor Sorting Service
 * 
 * Provides sorting functionality for sponsors based on sponsorship levels
 * and other criteria.
 */

import { SPONSORSHIP_LEVEL_ORDER } from '../config/constants.mjs';

/**
 * Sponsor sorting service class
 */
class SponsorSortingService {
  /**
   * Sort sponsors by sponsorship level and creation date
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
      
      // Secondary sort: creation date (newest first within same level)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  /**
   * Sort sponsors by display order if available, fallback to level sorting
   * @param {Array} sponsors - Array of sponsor objects
   * @returns {Array} Sorted array of sponsors
   */
  static sortByDisplayOrder(sponsors) {
    return sponsors.sort((a, b) => {
      // Primary sort: displayOrder (if both have it)
      if (a.displayOrder !== null && b.displayOrder !== null) {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
      }
      
      // If one has displayOrder and other doesn't, prioritize the one with displayOrder
      if (a.displayOrder !== null && b.displayOrder === null) return -1;
      if (a.displayOrder === null && b.displayOrder !== null) return 1;
      
      // Fallback to level-based sorting
      const levelA = SPONSORSHIP_LEVEL_ORDER[a.sponsorshipLevel] || 999;
      const levelB = SPONSORSHIP_LEVEL_ORDER[b.sponsorshipLevel] || 999;
      
      if (levelA !== levelB) {
        return levelA - levelB;
      }
      
      // Final fallback: creation date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
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