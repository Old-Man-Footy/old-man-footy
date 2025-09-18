/**
 * @file Auth Reset Password JavaScript
 * @description Manages reset password form validation and user interaction
 */

/**
 * Manager for reset password form functionality
 */
export const authResetPasswordManager = {
    /**
     * DOM elements cache
     */
    elements: {},

    /**
     * Initialize the manager
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
            form: document.querySelector('.needs-validation'),
            password: document.getElementById('password'),
            confirmPassword: document.getElementById('confirmPassword')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.form || !this.elements.password || !this.elements.confirmPassword) {
            return; // Elements not found, exit early
        }

        // Real-time password confirmation validation
        this.elements.password.addEventListener('input', () => this.validatePasswordMatch());
        this.elements.confirmPassword.addEventListener('input', () => this.validatePasswordMatch());

        // Form submission validation
        this.elements.form.addEventListener('submit', (event) => this.handleFormSubmit(event));
    },

    /**
     * Validate that passwords match
     */
    validatePasswordMatch() {
        const password = this.elements.password.value;
        const confirmPassword = this.elements.confirmPassword.value;

        if (confirmPassword && password !== confirmPassword) {
            this.elements.confirmPassword.setCustomValidity('Passwords do not match');
            this.elements.confirmPassword.classList.add('is-invalid');
        } else {
            this.elements.confirmPassword.setCustomValidity('');
            this.elements.confirmPassword.classList.remove('is-invalid');
        }
    },

    /**
     * Handle form submission
     * @param {Event} event - The form submit event
     */
    handleFormSubmit(event) {
        this.validatePasswordMatch();
        
        if (!this.elements.form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        this.elements.form.classList.add('was-validated');
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    authResetPasswordManager.initialize();
});
