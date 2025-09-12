/**
 * Admin Claim Carnival JavaScript
 * Handles the carnival claiming functionality in the admin interface.
 * Refactored into a testable object pattern.
 * @module admin-claim-carnival
 */

export const adminClaimCarnivalManager = {
    // To hold references to DOM elements
    elements: {},
    // To store the state of the carnival being viewed
    carnivalState: null,

    /**
     * Initializes the manager by caching DOM elements and setting up event listeners.
     */
    initialize() {
        this.cacheElements();
        
        if (!this.elements.claimForm || !this.elements.clubSelect) {
            console.warn('Admin claim carnival: Required DOM elements not found for initialization.');
            return;
        }

        this.carnivalState = this.elements.claimForm.dataset.carnivalState;
        this.elements.clubSelect.addEventListener('change', () => this.handleClubChange());
    },

    /**
     * Finds and stores all necessary DOM elements for easy access.
     */
    cacheElements() {
        this.elements = {
            claimForm: document.getElementById('claim-carnival-form'),
            clubSelect: document.getElementById('targetClubId'),
            selectedClubInfo: document.getElementById('selectedClubInfo'),
            delegateName: document.getElementById('delegateName'),
            delegateEmail: document.getElementById('delegateEmail'),
            clubState: document.getElementById('clubState'),
            stateWarning: document.getElementById('stateWarning'),
            claimButton: document.getElementById('claimButton'),
        };
    },

    /**
     * Handles the 'change' carnival on the club select dropdown.
     */
    handleClubChange() {
        const { clubSelect } = this.elements;
        const selectedOption = clubSelect.options[clubSelect.selectedIndex];

        if (selectedOption && selectedOption.value) {
            this.updateClubInfo(selectedOption);
        } else {
            this.resetClubInfo();
        }
    },

    /**
     * Populates the club info section based on the selected club's data.
     * @param {HTMLOptionElement} selectedOption - The option element that was selected.
     */
    updateClubInfo(selectedOption) {
        const { delegateName, delegateEmail, clubState, stateWarning, selectedClubInfo, claimButton } = this.elements;
        const clubData = selectedOption.dataset;

        if (delegateName) delegateName.textContent = clubData.delegateName || '';
        if (delegateEmail) delegateEmail.textContent = clubData.delegateEmail || '';
        if (clubState) clubState.textContent = clubData.clubState || '';

        // Show state warning if the club's state does not match the carnival's state.
        if (stateWarning) {
            const showWarning = this.carnivalState && clubData.clubState !== this.carnivalState;
            stateWarning.classList.toggle('d-none', !showWarning);
        }

        if (selectedClubInfo) selectedClubInfo.classList.remove('d-none');
        if (claimButton) claimButton.disabled = false;
    },

    /**
     * Hides the club info section and disables the claim button.
     */
    resetClubInfo() {
        const { selectedClubInfo, claimButton, stateWarning } = this.elements;
        if (selectedClubInfo) selectedClubInfo.classList.add('d-none');
        if (claimButton) claimButton.disabled = true;
        if (stateWarning) stateWarning.classList.add('d-none');
    }
};

// This part runs in the browser to initialize the application.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        adminClaimCarnivalManager.initialize();
        console.log('Admin claim carnival functionality initialized');
    });
}
