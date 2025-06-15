/**
 * Registration Form Validation and Club Selection Logic
 * Auto-populates state and location fields when selecting existing clubs
 * while maintaining required validation for all scenarios.
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

    // Get existing club data from datalist options
    const clubList = document.getElementById('clubList');
    const existingClubs = new Map();
    
    Array.from(clubList.options).forEach(option => {
        existingClubs.set(option.value, {
            state: option.getAttribute('data-state') || '',
            location: option.getAttribute('data-location') || ''
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
        } else if (clubData) {
            // Existing club - auto-populate fields
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
            clubNameInput.classList.add('is-valid');
            clubNameInput.classList.remove('is-invalid');
        } else {
            clubNameInput.classList.remove('is-valid', 'is-invalid');
        }
    }

    // Attach event listeners
    clubNameInput.addEventListener('input', handleClubNameChange);
    clubNameInput.addEventListener('blur', handleClubNameChange);

    // Form submission validation
    form.addEventListener('submit', function(e) {
        let hasErrors = false;

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