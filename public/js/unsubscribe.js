/**
 * Unsubscribe Page JavaScript
 * Handles form submission with confirmation
 */

export const unsubscribeManager = {
    elements: {},

    /**
     * Initialize the unsubscribe manager
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
    },

    /**
     * Cache DOM elements for efficient access
     */
    cacheElements() {
        this.elements = {
            form: document.getElementById('unsubscribeForm'),
            confirmBtn: document.querySelector('.btn-danger'),
            keepBtn: document.querySelector('.btn-secondary')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
          if (this.elements.form) {
            this.elements.form.addEventListener('submit', this.handleFormSubmit);
        }

        if (this.elements.keepBtn) {
            this.elements.keepBtn.addEventListener('click', this.handleKeepSubscription);
        }
    },

    /**
     * Handle form submission with confirmation
     * @param {Event} e - Form submit event
     */
    handleFormSubmit: (e) => {
        const confirmed = confirm(
            'Are you sure you want to unsubscribe from all email notifications?\n\n' +
            'This action cannot be undone and you will miss important updates about carnivals.'
        );
        
        if (!confirmed) {
            e.preventDefault();
            return false;
        }

        // Show loading state
        const submitBtn = e.target.querySelector('.btn-danger');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
            submitBtn.disabled = true;
        }

        return true;
    },

    /**
     * Handle keep subscription button click
     * @param {Event} e - Click event
     */
    handleKeepSubscription: (e) => {
        // Add confirmation for users who might accidentally click
        const confirmed = confirm(
            'Great choice! You will continue to receive important updates.\n\n' +
            'Click OK to return to the homepage.'
        );
        
        if (!confirmed) {
            e.preventDefault();
            return false;
        }

        return true;
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    unsubscribeManager.initialize();
});
