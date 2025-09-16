/**
 * Carnival List JavaScript
 * Handles auto-submit functionality for search and filter forms on the carnival list page.
 * Refactored into a testable object pattern.
 */

export const carnivalListManager = {
    // A timer variable for the search input debounce functionality.
    searchTimeout: null,

    /**
     * Initializes the manager by finding relevant form elements and attaching event listeners.
     */
    initialize() {
        const searchInput = document.getElementById('search');
        const stateSelect = document.getElementById('state');
        const upcomingCheckbox = document.getElementById('upcoming');

        if (searchInput) {
            this.setupSearchListener(searchInput);
        }
        if (stateSelect) {
            this.setupAutoSubmitListener(stateSelect, 'change');
        }
        if (upcomingCheckbox) {
            this.setupAutoSubmitListener(upcomingCheckbox, 'change');
        }
    },

    /**
     * Sets up a debounced auto-submit listener for a text input field.
     * The form will submit after the user stops typing for a specified delay.
     * @param {HTMLInputElement} inputElement - The input element to attach the listener to.
     * @param {number} delay - The debounce delay in milliseconds.
     */
    setupSearchListener(inputElement, delay = 1000) {
        inputElement.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.submitForm(inputElement);
            }, delay);
        });
    },

    /**
     * Sets up a standard auto-submit listener for an element.
     * The form will submit immediately when the specified carnival occurs.
     * @param {HTMLElement} element - The element to attach the listener to.
     * @param {string} eventType - The type of carnival to listen for (e.g., 'change').
     */
    setupAutoSubmitListener(element, eventType) {
        element.addEventListener(eventType, () => {
            this.submitForm(element);
        });
    },

    /**
     * Submits the form associated with a given element.
     * This is extracted into its own method to make it easily mockable in tests.
     * @param {HTMLElement} element - The element whose form should be submitted.
     */
    submitForm(element) {
        if (element.form) {
            element.form.submit();
        }
    }
};

// This part runs in the browser to initialize the application.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        carnivalListManager.initialize();
    });
}
