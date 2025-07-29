/**
 * @file club-claim-ownership.js
 * @description Manager for club ownership claim form validation and interaction.
 * @module public/js/club-claim-ownership.js
 */

export const clubClaimOwnershipManager = {
  elements: {},

  /**
   * Initialize the manager: cache elements and bind events.
   */
  initialize() {
    this.cacheElements();
    this.bindEvents();
    this.updateButtonState();
  },

  /**
   * Cache all required DOM elements for efficient access.
   */
  cacheElements() {
    this.elements.checkboxes = document.querySelectorAll('input[type="checkbox"][required]');
    this.elements.claimButton = document.getElementById('claimButton');
  },

  /**
   * Bind all event listeners for the form.
   */
  bindEvents() {
    this.elements.checkboxes.forEach(checkbox => {
      // Use a wrapper to ensure correct 'this' context for updateButtonState
      checkbox.addEventListener('change', (event) => this.updateButtonState(event));
    });
  },

  /**
   * Update the claim button state based on checkbox selection.
   */
  updateButtonState: () => {
    const manager = clubClaimOwnershipManager;
    const allChecked = Array.from(manager.elements.checkboxes).every(checkbox => checkbox.checked);
    manager.elements.claimButton.disabled = !allChecked;
    if (allChecked) {
      manager.elements.claimButton.classList.remove('btn-secondary');
      manager.elements.claimButton.classList.add('btn-primary');
    } else {
      manager.elements.claimButton.classList.remove('btn-primary');
      manager.elements.claimButton.classList.add('btn-secondary');
    }
  }
};

// Initialize manager on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  clubClaimOwnershipManager.initialize();
});