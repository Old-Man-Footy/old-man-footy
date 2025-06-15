/**
 * Registration Form Validation and Club Selection Logic
 * Auto-populates state and location fields when selecting existing clubs
 * while maintaining required validation for all scenarios.
 * Handles deactivated club detection and reactivation workflow.
 */
document.addEventListener('DOMContentLoaded', function() {
    const clubNameInput = document.getElementById('clubName');
    const clubStateSelect = document.getElementById('clubState');
    const locationInput = document.getElementById('location');
    const stateRequired = document.getElementById('stateRequired');
    const locationRequired = document.getElementById('locationRequired');
    const stateHelpText = document.getElementById('stateHelpText');
    const locationHelpText = document.getElementById('locationHelpText');
    const form = document.querySelector('form');
    const deactivatedClubWarning = document.getElementById('deactivatedClubWarning');

    // Get existing club data from datalist options
    const clubList = document.getElementById('clubList');
    const existingClubs = new Map();
    
    Array.from(clubList.options).forEach(option => {
        existingClubs.set(option.value, {
            state: option.getAttribute('data-state') || '',
            location: option.getAttribute('data-location') || '',
            isActive: option.getAttribute('data-active') === 'true'
        });
    });

    /**
     * Check if the entered club name matches an existing club
     * @param {string} clubName - The club name to check
     * @returns {boolean} True if club exists, false otherwise
     */
    function isExistingClub(clubName) {
        return existingClubs.has(clubName.trim());
    }

    /**
     * Get club data for an existing club
     * @param {string} clubName - The club name to look up
     * @returns {Object|null} Club data or null if not found
     */
    function getClubData(clubName) {
        return existingClubs.get(clubName.trim()) || null;
    }

    /**
     * Show or hide deactivated club warning
     * @param {boolean} show - Whether to show the warning
     * @param {Object|null} clubData - Club data if available
     */
    function toggleDeactivatedClubWarning(show, clubData = null) {
        if (show && clubData && !clubData.isActive) {
            deactivatedClubWarning.style.display = 'block';
            
            // Update warning text with club name
            const warningText = deactivatedClubWarning.querySelector('p');
            warningText.textContent = `"${clubNameInput.value.trim()}" is currently deactivated. You can reactivate it and become the primary delegate.`;
            
            // Ensure reactivation checkbox is unchecked by default
            const reactivationCheckbox = document.getElementById('confirmReactivation');
            if (reactivationCheckbox) {
                reactivationCheckbox.checked = false;
            }
        } else {
            deactivatedClubWarning.style.display = 'none';
        }
    }

    /**
     * Auto-populate fields for existing clubs or clear for new clubs
     * @param {boolean} isNewClub - Whether this is a new club being created
     * @param {Object|null} clubData - Existing club data if available
     */
    function updateFieldsForClub(isNewClub, clubData = null) {
        if (isNewClub) {
            // New club - clear fields and show as required for manual entry
            stateHelpText.textContent = 'Required for new clubs';
            locationHelpText.textContent = 'General location for your club. Required for new clubs.';
            stateRequired.style.display = 'inline';
            locationRequired.style.display = 'inline';
            
            // Clear any auto-populated values
            if (clubStateSelect.value === '' && locationInput.value === '') {
                clubStateSelect.classList.remove('is-valid');
                locationInput.classList.remove('is-valid');
            }
            
            // Hide deactivated club warning
            toggleDeactivatedClubWarning(false);
        } else if (clubData) {
            // Existing club - handle based on active status
            if (clubData.isActive) {
                // Active club - auto-populate fields
                clubStateSelect.value = clubData.state;
                locationInput.value = clubData.location;
                
                stateHelpText.textContent = 'Auto-populated from existing club data';
                locationHelpText.textContent = 'Auto-populated from existing club data';
                stateRequired.style.display = 'inline'; // Still required, just auto-filled
                locationRequired.style.display = 'inline'; // Still required, just auto-filled
                
                // Mark as valid since they're auto-populated
                clubStateSelect.classList.add('is-valid');
                clubStateSelect.classList.remove('is-invalid');
                locationInput.classList.add('is-valid');
                locationInput.classList.remove('is-invalid');
                
                // Clear any validation errors
                clubStateSelect.setCustomValidity('');
                locationInput.setCustomValidity('');
                
                // Hide deactivated club warning
                toggleDeactivatedClubWarning(false);
            } else {
                // Deactivated club - show warning and auto-populate fields
                clubStateSelect.value = clubData.state;
                locationInput.value = clubData.location;
                
                stateHelpText.textContent = 'Pre-filled from deactivated club (will be updated if reactivated)';
                locationHelpText.textContent = 'Pre-filled from deactivated club (will be updated if reactivated)';
                stateRequired.style.display = 'inline';
                locationRequired.style.display = 'inline';
                
                // Mark as warning style
                clubStateSelect.classList.add('is-valid');
                clubStateSelect.classList.remove('is-invalid');
                locationInput.classList.add('is-valid');
                locationInput.classList.remove('is-invalid');
                
                // Show deactivated club warning
                toggleDeactivatedClubWarning(true, clubData);
            }
        }
        
        // Both fields remain required in all cases
        clubStateSelect.required = true;
        locationInput.required = true;
    }

    /**
     * Handle club name input changes
     */
    function handleClubNameChange() {
        const clubName = clubNameInput.value.trim();
        
        if (clubName === '') {
            // No club name entered - prepare for new club
            updateFieldsForClub(true);
            return;
        }

        const isExisting = isExistingClub(clubName);
        const clubData = isExisting ? getClubData(clubName) : null;
        
        updateFieldsForClub(!isExisting, clubData);

        // Show visual feedback for club name
        if (isExisting) {
            if (clubData && clubData.isActive) {
                clubNameInput.classList.add('is-valid');
                clubNameInput.classList.remove('is-invalid', 'is-warning');
            } else if (clubData && !clubData.isActive) {
                // Deactivated club - show warning style
                clubNameInput.classList.add('is-warning');
                clubNameInput.classList.remove('is-valid', 'is-invalid');
                
                // Add custom CSS for warning style if not already present
                if (!document.getElementById('warningStyles')) {
                    const style = document.createElement('style');
                    style.id = 'warningStyles';
                    style.textContent = `
                        .is-warning {
                            border-color: #ffc107 !important;
                            background-color: #fff3cd;
                        }
                        .is-warning:focus {
                            border-color: #ffc107 !important;
                            box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25) !important;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        } else {
            clubNameInput.classList.remove('is-valid', 'is-invalid', 'is-warning');
        }
    }

    // Attach event listeners
    clubNameInput.addEventListener('input', handleClubNameChange);
    clubNameInput.addEventListener('blur', handleClubNameChange);

    // Handle reactivation checkbox changes
    const reactivationCheckbox = document.getElementById('confirmReactivation');
    if (reactivationCheckbox) {
        reactivationCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // User confirmed reactivation - update help text
                stateHelpText.textContent = 'Will be updated when club is reactivated';
                locationHelpText.textContent = 'Will be updated when club is reactivated';
            } else {
                // User unchecked - revert help text
                stateHelpText.textContent = 'Pre-filled from deactivated club (will be updated if reactivated)';
                locationHelpText.textContent = 'Pre-filled from deactivated club (will be updated if reactivated)';
            }
        });
    }

    // Form submission validation
    form.addEventListener('submit', function(e) {
        let hasErrors = false;
        const clubName = clubNameInput.value.trim();
        const isExisting = isExistingClub(clubName);
        const clubData = isExisting ? getClubData(clubName) : null;

        // Handle deactivated club validation
        if (clubData && !clubData.isActive) {
            const reactivationChecked = document.getElementById('confirmReactivation')?.checked || false;
            if (!reactivationChecked) {
                e.preventDefault();
                hasErrors = true;
                
                // Show error message
                let errorDiv = document.getElementById('reactivationError');
                if (!errorDiv) {
                    errorDiv = document.createElement('div');
                    errorDiv.id = 'reactivationError';
                    errorDiv.className = 'alert alert-danger mt-3';
                    errorDiv.innerHTML = '<i class="bi bi-exclamation-triangle"></i> You must confirm that you want to reactivate this deactivated club.';
                    deactivatedClubWarning.appendChild(errorDiv);
                }
                
                // Scroll to warning
                deactivatedClubWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            } else {
                // Remove any existing error
                const errorDiv = document.getElementById('reactivationError');
                if (errorDiv) {
                    errorDiv.remove();
                }
            }
        }

        // Validate state field (always required)
        if (!clubStateSelect.value) {
            clubStateSelect.setCustomValidity('Please select your club\'s state.');
            clubStateSelect.classList.add('is-invalid');
            hasErrors = true;
        } else {
            clubStateSelect.setCustomValidity('');
            clubStateSelect.classList.remove('is-invalid');
        }

        // Validate location field (always required)
        if (!locationInput.value.trim()) {
            locationInput.setCustomValidity('Please provide your club\'s location.');
            locationInput.classList.add('is-invalid');
            hasErrors = true;
        } else {
            locationInput.setCustomValidity('');
            locationInput.classList.remove('is-invalid');
        }

        // Standard HTML5 validation
        if (!form.checkValidity() || hasErrors) {
            e.preventDefault();
            e.stopPropagation();
        }

        form.classList.add('was-validated');
    });

    // Initialize form state
    handleClubNameChange();
});