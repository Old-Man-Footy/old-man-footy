/**
 * Admin Claim Carnival JavaScript
 * Handles the carnival claiming functionality in the admin interface
 */

document.addEventListener('DOMContentLoaded', function() {
    const claimForm = document.getElementById('claim-carnival-form');
    if (!claimForm) return;

    // Get carnival state from data attribute
    const carnivalState = claimForm.dataset.carnivalState;
    
    // Get DOM elements
    const clubSelect = document.getElementById('targetClubId');
    const selectedClubInfo = document.getElementById('selectedClubInfo');
    const delegateName = document.getElementById('delegateName');
    const delegateEmail = document.getElementById('delegateEmail');
    const clubState = document.getElementById('clubState');
    const stateWarning = document.getElementById('stateWarning');
    const claimButton = document.getElementById('claimButton');

    if (!clubSelect || !selectedClubInfo || !claimButton) {
        console.warn('Admin claim carnival: Required DOM elements not found');
        return;
    }

    /**
     * Handle club selection change
     */
    clubSelect.addEventListener('change', function() {
        const selectedOption = clubSelect.options[clubSelect.selectedIndex];
        
        if (selectedOption.value) {
            // Populate club information from data attributes
            if (delegateName) {
                delegateName.textContent = selectedOption.dataset.delegateName || '';
            }
            if (delegateEmail) {
                delegateEmail.textContent = selectedOption.dataset.delegateEmail || '';
            }
            if (clubState) {
                clubState.textContent = selectedOption.dataset.clubState || '';
            }
            
            // Show state warning if states don't match
            if (stateWarning && carnivalState && selectedOption.dataset.clubState !== carnivalState) {
                stateWarning.classList.remove('d-none');
            } else if (stateWarning) {
                stateWarning.classList.add('d-none');
            }
            
            // Show selected club info and enable claim button
            selectedClubInfo.classList.remove('d-none');
            claimButton.disabled = false;
        } else {
            // Hide info and disable button when no club selected
            selectedClubInfo.classList.add('d-none');
            claimButton.disabled = true;
            
            // Hide state warning
            if (stateWarning) {
                stateWarning.classList.add('d-none');
            }
        }
    });

    console.log('Admin claim carnival functionality initialized');
});