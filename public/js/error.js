/**
 * Error Page JavaScript (Manager Object Pattern)
 * Enhanced Go Back functionality with fallback behavior and accessibility.
 */

export const errorPageManager = {
    elements: {},

    initialize() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements.goBackBtn = document.getElementById('goBackBtn');
    },

    bindEvents() {
        const btn = this.elements.goBackBtn;
        if (!btn) return;
        btn.addEventListener('click', this.handleGoBack);
        btn.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                btn.click();
            }
        });
    },

    handleGoBack: () => {
        try {
            if (window.history && window.history.length > 1) {
                window.history.back();
            } else {
                errorPageManager.safeNavigate('/');
            }
        } catch (err) {
            console.warn('Error navigating back:', err);
            errorPageManager.safeNavigate('/');
        }
    },

    safeNavigate(url) {
        try {
            window.location.href = url;
        } catch {
            /* noop for jsdom */
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    errorPageManager.initialize();
});