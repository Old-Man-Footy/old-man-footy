/**
 * Contact Page JavaScript (Manager Object Pattern)
 * Handles form character counting and submit loading state.
 */

export const contactManager = {
    elements: {},
    originalSubmitHtml: '',

    /** Initialize module: cache DOM and bind events */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        // Initialize counter on load to reflect any prefilled content
        if (this.elements.message && this.elements.charCount) {
            this.updateCharCount();
        }
    },

    /** Cache required DOM elements */
    cacheElements() {
        this.elements.form = document.getElementById('contactForm');
        this.elements.message = document.getElementById('message');
        this.elements.charCount = document.getElementById('charCount');
        this.elements.submitButton = this.elements.form?.querySelector('button[type="submit"]') || null;
    },

    /** Attach carnival listeners */
    bindEvents() {
        if (this.elements.message && this.elements.charCount) {
            this.elements.message.addEventListener('input', this.updateCharCount);
        }
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', this.handleSubmit);
        }
    },

    /** Update character count and apply threshold styles */
    updateCharCount: () => {
        const el = contactManager.elements;
        if (!el.message || !el.charCount) return;
        const len = el.message.value.length;
        el.charCount.textContent = String(len);
        // Apply classes based on thresholds (danger > 1900, warning > 1800, else muted)
        el.charCount.classList.remove('text-danger', 'text-warning', 'text-muted');
        if (len > 1900) {
            el.charCount.classList.add('text-danger');
        } else if (len > 1800) {
            el.charCount.classList.add('text-warning');
        } else {
            el.charCount.classList.add('text-muted');
        }
    },

    /** Handle form submit: show loading, auto-reset after timeout */
    handleSubmit: (e) => {
        const el = contactManager.elements;
        if (!el.submitButton) return;
        contactManager.originalSubmitHtml = el.submitButton.innerHTML;
        contactManager.setLoadingState(true);
        // Re-enable in case of client-side errors after 10s
        setTimeout(() => contactManager.setLoadingState(false), 10000);
    },

    /** Toggle the submit button loading state */
    setLoadingState(isLoading) {
        const btn = this.elements.submitButton;
        if (!btn) return;
        if (isLoading) {
            btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
            btn.disabled = true;
        } else {
            btn.innerHTML = this.originalSubmitHtml || btn.innerHTML;
            btn.disabled = false;
        }
    }
};

// Auto-initialize in browser
document.addEventListener('DOMContentLoaded', () => {
    contactManager.initialize();
});