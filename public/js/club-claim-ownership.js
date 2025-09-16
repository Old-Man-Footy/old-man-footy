/**
 * Club Claim Ownership (Manager Object Pattern)
 * Handles form validation and interaction for club ownership claiming
 */
export const clubClaimOwnershipManager = {
    elements: {},

    initialize() {
        this.cacheElements();
        if (!this.elements.claimButton) return; // View may not include this feature
        this.bindEvents();
        this.updateButtonState();
    },

    cacheElements() {
        this.elements.checkboxes = document.querySelectorAll('input[type="checkbox"][required]');
        this.elements.claimButton = document.getElementById('claimButton');
    },

    bindEvents() {
        this.elements.checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', this.handleCheckboxChange);
        });
    },

    // Carnival handler (arrow function preserves lexical scope)
    handleCheckboxChange: () => {
        clubClaimOwnershipManager.updateButtonState();
    },

    updateButtonState() {
        const el = this.elements;
        const allChecked = Array.from(el.checkboxes || []).every((cb) => cb.checked);
        if (!el.claimButton) return;
        el.claimButton.disabled = !allChecked;
        if (allChecked) {
            el.claimButton.classList.remove('btn-secondary');
            el.claimButton.classList.add('btn-primary');
        } else {
            el.claimButton.classList.remove('btn-primary');
            el.claimButton.classList.add('btn-secondary');
        }
    },
};

// Bootstrap in the browser
document.addEventListener('DOMContentLoaded', () => {
    clubClaimOwnershipManager.initialize();
});