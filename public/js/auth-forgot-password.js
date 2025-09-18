/**
 * @file Auth Forgot Password JavaScript
 * @description Manages forgot password form validation and user interaction
 */

/**
 * Manager for forgot password form functionality
 */
export const authForgotPasswordManager = {
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
            email: document.getElementById('email'),
            submitButton: document.querySelector('button[type="submit"]')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.form || !this.elements.email) {
            return; // Elements not found, exit early
        }

        // Email validation on input
        this.elements.email.addEventListener('input', () => this.validateEmail());

        // Form submission handling
        this.elements.form.addEventListener('submit', (event) => this.handleFormSubmit(event));
    },

    /**
     * Validate email format
     */
    validateEmail() {
        const email = this.elements.email.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email && !emailRegex.test(email)) {
            this.elements.email.setCustomValidity('Please enter a valid email address');
            this.elements.email.classList.add('is-invalid');
        } else {
            this.elements.email.setCustomValidity('');
            this.elements.email.classList.remove('is-invalid');
        }
    },

    /**
     * Handle form submission
     * @param {Event} event - The form submit event
     */
    handleFormSubmit(event) {
        this.validateEmail();
        
        if (!this.elements.form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        } else {
            // Show loading state
            this.showLoadingState();
        }
        
        this.elements.form.classList.add('was-validated');
    },

    /**
     * Show loading state during form submission
     */
    showLoadingState() {
        if (this.elements.submitButton) {
            this.elements.submitButton.disabled = true;
            this.elements.submitButton.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Sending...
            `;
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    authForgotPasswordManager.initialize();
});
