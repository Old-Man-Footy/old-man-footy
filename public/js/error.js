/**
 * Error Page JavaScript (Manager Object Pattern)
 * Handles 'Go Back' navigation and 'Copy Error Details' functionality.
 */

export const errorPageManager = {
    elements: {},

    initialize() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements.goBackBtn = document.getElementById('goBackBtn');
        // Add the new elements for the copy functionality
        this.elements.copyBtn = document.getElementById('copyErrorBtn');
        this.elements.errorContent = document.getElementById('errorDetailsContent');
    },

    bindEvents() {
        const { goBackBtn, copyBtn, errorContent } = this.elements;

        // Bind events for the 'Go Back' button
        if (goBackBtn) {
            goBackBtn.addEventListener('click', this.handleGoBack);
            goBackBtn.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    goBackBtn.click();
                }
            });
        }

        // Bind event for the 'Copy Error' button
        if (copyBtn && errorContent) {
            copyBtn.addEventListener('click', this.handleCopyDetails.bind(this));
        }
    },

    /**
     * Copies the error details to the user's clipboard and provides visual feedback.
     */
    handleCopyDetails() {
        const { copyBtn, errorContent } = this.elements;

        // Use the Clipboard API to copy the text content
        navigator.clipboard.writeText(errorContent.innerText).then(() => {
            // Provide visual feedback on success
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
            copyBtn.disabled = true;

            // Revert the button to its original state after 2 seconds
            setTimeout(() => {
                copyBtn.innerHTML = originalHtml;
                copyBtn.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy error details:', err);
            alert('Could not copy error details to clipboard.');
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