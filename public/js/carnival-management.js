/**
 * @file carnival-management.js
 * @description Handles carnival-related functionality including registration, unregistration, and ownership.
 * Follows the Manager Object Pattern for maintainability and testability.
 */

/**
 * Carnival Management Manager Object
 */
/**
 * Manages carnival-related actions such as unregistering a club, taking ownership of an event,
 * and handling confirmation dialogs for forms. Provides initialization, element caching,
 * and event binding for carnival management functionality.
 *
 * @namespace carnivalManagementManager
 * @property {Object} elements - Cached DOM elements used for carnival management actions.
 * @method initialize - Initializes the manager by caching elements and binding events.
 * @method cacheElements - Caches necessary DOM elements for carnival management.
 * @method bindEvents - Binds event listeners for carnival management actions.
 * @method handleUnregisterClick - Handles the unregister button click event.
 * @method handleOwnershipClick - Handles the take ownership button click event.
 * @method handleFormConfirm - Handles confirmation dialogs for forms with data-confirm attributes.
 */

export const carnivalManagementManager = {
    elements: {},

    /**
     * Initializes the manager: caches elements and binds events.
     * @returns {void}
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        console.log('Carnival management functionality initialized successfully');
    },

    /**
     * Caches all necessary DOM elements for carnival management.
     * @returns {void}
     */
    cacheElements() {
        this.elements.unregisterBtn = document.querySelector('[data-action="unregister"]');
        this.elements.ownershipBtn = document.querySelector('[data-action="take-ownership-btn"]');
        this.elements.unregisterForm = document.querySelector('[data-action="unregister-carnival"]');
        this.elements.ownershipForm = document.querySelector('[data-action="take-ownership"]');
        this.elements.confirmForms = document.querySelectorAll('[data-confirm]');
    },

    /**
     * Binds all event listeners for carnival management actions.
     * @returns {void}
     */
    bindEvents() {
        if (this.elements.unregisterBtn) {
            this.elements.unregisterBtn.addEventListener('click', this.handleUnregisterClick);
        }
        if (this.elements.ownershipBtn) {
            this.elements.ownershipBtn.addEventListener('click', this.handleOwnershipClick);
        }
        this.elements.confirmForms.forEach(form => {
            form.addEventListener('submit', this.handleFormConfirm);
        });
    },

    /**
     * Handles unregister button click.
     * @param {Event} event
     * @returns {void}
     */
    handleUnregisterClick: (event) => {
        const confirmMessage = 'Are you sure you want to unregister your club from this carnival? This action cannot be undone.';
        if (confirm(confirmMessage)) {
            if (carnivalManagementManager.elements.unregisterForm) {
                carnivalManagementManager.elements.unregisterForm.submit();
            }
        }
    },

    /**
     * Handles take ownership button click.
     * @param {Event} event
     * @returns {void}
     */
    handleOwnershipClick: (event) => {
        const confirmMessage = 'Are you sure you want to take ownership of this event for your club? This will allow you to manage and edit the event details.';
        if (confirm(confirmMessage)) {
            if (carnivalManagementManager.elements.ownershipForm) {
                carnivalManagementManager.elements.ownershipForm.submit();
            }
        }
    },

    /**
     * Handles confirmation dialogs for forms with data-confirm attributes.
     * @param {Event} event
     * @returns {void}
     */
    handleFormConfirm: (event) => {
        const message = event.target.getAttribute('data-confirm');
        if (!confirm(message)) {
            event.preventDefault();
        }
    }
};

// Browser entry point: initialize manager on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    carnivalManagementManager.initialize();
});