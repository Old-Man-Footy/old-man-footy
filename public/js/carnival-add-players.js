/**
 * Carnival Add Players Manager
 * Manages the behavior of the add players form in the carnival application.
 * @namespace carnivalAddPlayersManager
 */
export const carnivalAddPlayersManager = {
    elements: {},

    /**
     * Initializes the manager, setting up event listeners and UI state.
     * @function
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.updateSubmitButton();
    },

    /**
     * Caches DOM elements for later use.
     * @function
     */
    cacheElements() {
        this.elements.checkboxes = document.querySelectorAll('.player-checkbox');
        this.elements.submitBtn = document.getElementById('submitBtn');
        this.elements.form = document.getElementById('addPlayersForm');
    },

    /**
     * Binds event listeners to cached elements.
     * @function
     */
    bindEvents() {
        this.elements.checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.updateSubmitButton.bind(this));
        });

        if (this.elements.form) {
            this.elements.form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        window.selectAll = this.selectAll.bind(this);
        window.selectNone = this.selectNone.bind(this);
    },

    /**
     * Updates the submit button text and state based on selected players.
     * @function
     */
    updateSubmitButton() {
        const selectedCount = document.querySelectorAll('.player-checkbox:checked').length;
        if (this.elements.submitBtn) {
            this.elements.submitBtn.disabled = selectedCount === 0;
            this.elements.submitBtn.innerHTML = selectedCount > 0
                ? `<i class="bi bi-plus-circle"></i> Add ${selectedCount} Selected Player${selectedCount > 1 ? 's' : ''}`
                : '<i class="bi bi-plus-circle"></i> Add Selected Players';
        }
    },

    /**
     * Selects all player checkboxes.
     * @function
     */
    selectAll() {
        this.elements.checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateSubmitButton();
    },

    /**
     * Deselects all player checkboxes.
     * @function
     */
    selectNone() {
        this.elements.checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSubmitButton();
    },

    /**
     * Handles form submission, ensuring at least one player is selected.
     * @function
     * @param {Event} event - The submit event.
     */
    handleFormSubmit(event) {
        const selectedCount = document.querySelectorAll('.player-checkbox:checked').length;
        if (selectedCount === 0) {
            event.preventDefault();
            alert('Please select at least one player to add.');
        }
    }
};

// At the bottom of the file
document.addEventListener('DOMContentLoaded', () => {
    carnivalAddPlayersManager.initialize();
});