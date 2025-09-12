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
    this.elements.teamAssignmentSelects = document.querySelectorAll('.team-assignment-select');
    this.elements.movePlayerBtns = document.querySelectorAll('.move-player-btn');
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

    // Bind team assignment change events
    this.elements.teamAssignmentSelects.forEach(select => {
      select.addEventListener('change', this.handleTeamAssignmentChange);
    });

    // Bind move player button events
    this.elements.movePlayerBtns.forEach(btn => {
      btn.addEventListener('click', this.handleMovePlayerClick);
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
   * Handles team assignment dropdown changes
   * @param {Event} event
   */
  handleTeamAssignmentChange: async (event) => {
    const select = event.currentTarget;
    const assignmentId = select.dataset.assignmentId;
    const teamNumber = select.value;
    const playerName = select.dataset.playerName;

    try {
      const response = await fetch(`/carnivals/${carnivalMyClubPlayersManager.carnivalId}/register/players/${assignmentId}/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamNumber: teamNumber || null })
      });

      const result = await response.json();
      
      if (result.success) {
        // Show success message briefly
        carnivalMyClubPlayersManager.showMessage(result.message, 'success');
        
        // Optionally reload the page to reflect the change in team containers
        // You can comment this out if you prefer to handle the UI updates dynamically
        setTimeout(() => {
          carnivalMyClubPlayersManager.locationReload();
        }, 500);
      } else {
        alert('Error: ' + result.message);
        // Revert the select value on error
        select.value = select.dataset.currentTeam || '';
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while updating team assignment.');
      // Revert the select value on error
      select.value = select.dataset.currentTeam || '';
    }
  },

  /**
   * Handles move player button clicks in dropdown menus
   * @param {Event} event
   */
  handleMovePlayerClick: async (event) => {
    event.preventDefault();
    const btn = event.currentTarget;
    const assignmentId = btn.dataset.assignmentId;
    const targetTeam = btn.dataset.targetTeam;
    const playerName = btn.dataset.playerName;

    try {
      const response = await fetch(`/carnivals/${carnivalMyClubPlayersManager.carnivalId}/register/players/${assignmentId}/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamNumber: parseInt(targetTeam) })
      });

      const result = await response.json();
      
      if (result.success) {
        // Show success message briefly
        carnivalMyClubPlayersManager.showMessage(result.message, 'success');
        
        // Reload the page to reflect the change in team containers
        setTimeout(() => {
          carnivalMyClubPlayersManager.locationReload();
        }, 500);
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while moving the player.');
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
  },

  /**
   * Shows a temporary message to the user
   * @param {string} message - The message to display
   * @param {string} type - The type of message ('success', 'error', 'info')
   */
  showMessage(message, type = 'info') {
    // Create a temporary alert message
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 3000);
  }
};

// Browser entry point
// Only job is to call manager.initialize()
document.addEventListener('DOMContentLoaded', () => {
  carnivalMyClubPlayersManager.initialize();
});