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
        this.elements.selectAllBtn = document.getElementById('selectAllBtn');
        this.elements.selectNoneBtn = document.getElementById('selectNoneBtn');
        
        // Log cache results for debugging
        console.log('Cached elements:', {
            checkboxCount: this.elements.checkboxes.length,
            hasSubmitBtn: !!this.elements.submitBtn,
            hasForm: !!this.elements.form,
            hasSelectAllBtn: !!this.elements.selectAllBtn,
            hasSelectNoneBtn: !!this.elements.selectNoneBtn
        });
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

        // Bind click event listeners to the select buttons
        if (this.elements.selectAllBtn) {
            this.elements.selectAllBtn.addEventListener('click', this.selectAll.bind(this));
        }
        
        if (this.elements.selectNoneBtn) {
            this.elements.selectNoneBtn.addEventListener('click', this.selectNone.bind(this));
        }
        
        // Debug logging to verify event listeners are bound
        console.log('Event listeners bound:', {
            selectAllBtn: !!this.elements.selectAllBtn,
            selectNoneBtn: !!this.elements.selectNoneBtn,
            checkboxCount: this.elements.checkboxes.length
        });
    },

    /**
     * Updates the submit button text and state based on selected players.
     * @function
     */
    updateSubmitButton() {
        const selectedCount = document.querySelectorAll('.player-checkbox:checked').length;
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = selectedCount === 0;
            submitBtn.innerHTML = selectedCount > 0
                ? `<i class="bi bi-plus-circle"></i> Add ${selectedCount} Selected Player${selectedCount > 1 ? 's' : ''}`
                : '<i class="bi bi-plus-circle"></i> Add Selected Players';
        }
    },

    /**
     * Selects all player checkboxes.
     * @function
     */
    selectAll() {
        console.log('selectAll() function called!');
        // Re-cache checkboxes in case they weren't available during initial caching
        const checkboxes = document.querySelectorAll('.player-checkbox');
        console.log('Found checkboxes:', checkboxes.length);
        checkboxes.forEach(checkbox => {
            console.log('Setting checkbox checked to true:', checkbox);
            checkbox.checked = true;
            // Trigger change event to ensure UI updates properly
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });
        this.updateSubmitButton();
    },

    /**
     * Deselects all player checkboxes.
     * @function
     */
    selectNone() {
        // Re-cache checkboxes in case they weren't available during initial caching
        const checkboxes = document.querySelectorAll('.player-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            // Trigger change event to ensure UI updates properly
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
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
    console.log('DOMContentLoaded event fired, initializing carnivalAddPlayersManager');
    carnivalAddPlayersManager.initialize();
    console.log('carnivalAddPlayersManager initialized');
});