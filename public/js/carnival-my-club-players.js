/**
 * @file carnival-my-club-players.js
 * @description Manages carnival club player assignments and modal interactions.
 * Follows the Manager Object Pattern for maintainability and testability.
 */

export const carnivalMyClubPlayersManager = {
  elements: {},
  carnivalId: null,
  registrationId: null,

  /**
   * Main entry point. Caches DOM elements and binds event listeners.
   */
  initialize() {
    this.cacheElements();
    this.extractIds();
    this.bindEvents();
  },

  /**
   * Caches all necessary DOM elements for efficient access.
   */
  cacheElements() {
    this.elements.registrationElement = document.querySelector('[data-registration-id]');
    this.elements.removePlayerBtns = document.querySelectorAll('.remove-player-btn');
    this.elements.modalCheckboxes = document.querySelectorAll('.modal-player-checkbox');
    this.elements.modalSubmitBtn = document.getElementById('modalSubmitBtn');
    this.elements.modalForm = document.getElementById('addPlayersForm');
  },

  /**
   * Extracts carnival and registration IDs from the DOM and URL.
   */
  extractIds() {
    const pathParts = window.location.pathname.split('/');
    this.carnivalId = pathParts[2];
    this.registrationId = this.elements.registrationElement ? this.elements.registrationElement.dataset.registrationId : null;
  },

  /**
   * Binds all event listeners for player removal and modal interactions.
   */
  bindEvents() {
    this.elements.removePlayerBtns.forEach(btn => {
      btn.addEventListener('click', this.handleRemovePlayerClick);
    });

    if (this.elements.modalCheckboxes.length > 0) {
      this.elements.modalCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', this.updateModalSubmitButton);
      });
      if (this.elements.modalForm) {
        this.elements.modalForm.addEventListener('submit', this.handleModalFormSubmit);
      }
      // Expose selectAllModal/selectNoneModal for modal controls
      window.selectAllModal = this.selectAllModal;
      window.selectNoneModal = this.selectNoneModal;
      this.updateModalSubmitButton();
    }
  },

  /**
   * Handles click event for removing a player from the carnival.
   * @param {Event} event
   */
  handleRemovePlayerClick: (event) => {
    const btn = event.currentTarget;
    const assignmentId = btn.dataset.assignmentId;
    const playerName = btn.dataset.playerName;
    if (confirm(`Are you sure you want to remove "${playerName}" from this carnival?`)) {
      carnivalMyClubPlayersManager.removePlayer(assignmentId);
    }
  },

  /**
   * Reloads the current page. Used for testability.
   */
  locationReload: () => {
    if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
      window.location.reload();
    }
  },

  /**
   * Sends a DELETE request to remove a player assignment.
   * @param {string} assignmentId
   */
  async removePlayer(assignmentId) {
    if (!this.registrationId) {
      alert('Registration ID not found.');
      return;
    }
    try {
      const response = await fetch(`/carnivals/${this.carnivalId}/attendees/${this.registrationId}/players/${assignmentId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        this.locationReload();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while removing the player.');
    }
  },

  /**
   * Updates the modal submit button state and label based on selected checkboxes.
   */
  updateModalSubmitButton: () => {
    const selectedCount = document.querySelectorAll('.modal-player-checkbox:checked').length;
    const btn = carnivalMyClubPlayersManager.elements.modalSubmitBtn;
    if (btn) {
      btn.disabled = selectedCount === 0;
      btn.innerHTML = selectedCount > 0
        ? `<i class="bi bi-plus-circle"></i> Add ${selectedCount} Player${selectedCount > 1 ? 's' : ''}`
        : '<i class="bi bi-plus-circle"></i> Add Selected Players';
    }
  },

  /**
   * Selects all modal player checkboxes.
   */
  selectAllModal: () => {
    carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
    carnivalMyClubPlayersManager.updateModalSubmitButton();
  },

  /**
   * Deselects all modal player checkboxes.
   */
  selectNoneModal: () => {
    carnivalMyClubPlayersManager.elements.modalCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    carnivalMyClubPlayersManager.updateModalSubmitButton();
  },

  /**
   * Validates modal form submission to ensure at least one player is selected.
   * @param {Event} e
   */
  handleModalFormSubmit: (e) => {
    const selectedCount = document.querySelectorAll('.modal-player-checkbox:checked').length;
    if (selectedCount === 0) {
      e.preventDefault();
      alert('Please select at least one player to add.');
      return false;
    }
  }
};

// Browser entry point
// Only job is to call manager.initialize()
document.addEventListener('DOMContentLoaded', () => {
  carnivalMyClubPlayersManager.initialize();
});