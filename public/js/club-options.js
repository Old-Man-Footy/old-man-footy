/**
 * Club Options Page - Client-side functionality
 * 
 * Handles club search, filtering, delegate contact modal, and basic autocomplete
 * for the club options page where users can join or create clubs.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initializeClubSearch();
    initializeContactDelegateModal();
    initializeBasicAutocomplete();
    initializeFormValidation();
});

/**
 * Initialize form validation to only trigger on actual form submission
 */
function initializeFormValidation() {
    const clubCreationForm = document.getElementById('clubCreationForm');
    if (!clubCreationForm) return;

    // Ensure novalidate stays on form to prevent browser validation
    clubCreationForm.setAttribute('novalidate', 'novalidate');
    
    // Prevent any premature form submission
    const formInputs = clubCreationForm.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        // Remove required attributes temporarily to prevent browser validation on change
        if (input.hasAttribute('required')) {
            input.setAttribute('data-required', 'true');
            input.removeAttribute('required');
        }
        
        // Clear validation errors when user interacts with form
        input.addEventListener('input', clearValidationErrors);
        input.addEventListener('focus', clearValidationErrors);
        input.addEventListener('change', clearValidationErrors);
    });
    
    // Only validate when form is actually submitted (button clicked)
    clubCreationForm.addEventListener('submit', function(event) {
        // Prevent default form submission first
        event.preventDefault();
        event.stopPropagation();
        
        // Clear any existing errors first
        clearValidationErrors();
        
        const clubNameInput = document.getElementById('clubName');
        const stateSelect = document.getElementById('state');
        const locationInput = document.getElementById('location');
        
        let isValid = true;
        const errors = [];

        // Validate club name
        if (!clubNameInput || !clubNameInput.value.trim() || clubNameInput.value.trim().length < 2) {
            errors.push('Club name must be at least 2 characters long');
            if (clubNameInput) {
                clubNameInput.classList.add('is-invalid');
                showFieldError(clubNameInput, 'Club name must be at least 2 characters long');
            }
            isValid = false;
        }

        // Validate state
        if (!stateSelect || !stateSelect.value) {
            errors.push('Please select a state');
            if (stateSelect) {
                stateSelect.classList.add('is-invalid');
                showFieldError(stateSelect, 'Please select a state');
            }
            isValid = false;
        }

        // Validate location
        if (!locationInput || !locationInput.value.trim() || locationInput.value.trim().length < 2) {
            errors.push('Location must be at least 2 characters long');
            if (locationInput) {
                locationInput.classList.add('is-invalid');
                showFieldError(locationInput, 'Location must be at least 2 characters long');
            }
            isValid = false;
        }

        // If validation fails, show errors and don't submit
        if (!isValid) {
            // Show consolidated error message at top of form
            showFormErrors(errors);
            
            // Focus on first invalid field
            const firstInvalid = clubCreationForm.querySelector('.is-invalid');
            if (firstInvalid) {
                firstInvalid.focus();
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            return false;
        }

        // If validation passes, show loading state and submit the form
        const submitButton = clubCreationForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Creating Club...';
            submitButton.disabled = true;
        }
        
        // Re-add required attributes for server-side validation
        formInputs.forEach(input => {
            if (input.getAttribute('data-required') === 'true') {
                input.setAttribute('required', 'required');
            }
        });
        
        // Manually submit the form
        clubCreationForm.submit();
    });
    
    /**
     * Clear all validation errors from the form
     */
    function clearValidationErrors() {
        // Remove server-side error messages that contain "undefined"
        const errorAlerts = document.querySelectorAll('.alert-danger');
        errorAlerts.forEach(alert => {
            if (alert.textContent.includes('undefined') || 
                alert.textContent.includes('validation') ||
                alert.textContent.includes('Validation errors') ||
                alert.textContent.includes('Please check your form input')) {
                alert.remove();
            }
        });
        
        // Remove client-side validation styling and messages
        const invalidInputs = clubCreationForm.querySelectorAll('.is-invalid');
        invalidInputs.forEach(input => {
            input.classList.remove('is-invalid');
        });
        
        // Remove individual field error messages
        const fieldErrors = clubCreationForm.querySelectorAll('.invalid-feedback');
        fieldErrors.forEach(error => error.remove());
        
        // Remove consolidated error message
        const errorContainer = document.getElementById('formErrors');
        if (errorContainer) {
            errorContainer.remove();
        }
    }
    
    /**
     * Show error message for a specific field
     */
    function showFieldError(field, message) {
        // Remove any existing error message for this field
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }
        
        // Create and show new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }
    
    /**
     * Show consolidated error messages at top of form
     */
    function showFormErrors(errors) {
        // Remove any existing error container
        const existingContainer = document.getElementById('formErrors');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Create new error container
        const errorContainer = document.createElement('div');
        errorContainer.id = 'formErrors';
        errorContainer.className = 'alert alert-danger mt-3';
        errorContainer.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
                <div>
                    <strong>Please correct the following errors:</strong>
                    <ul class="mb-0 mt-2">
                        ${errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        // Insert at the top of the form
        clubCreationForm.insertBefore(errorContainer, clubCreationForm.firstChild);
    }
}

/**
 * Initialize club search and filtering functionality
 */
function initializeClubSearch() {
    const searchInput = document.getElementById('clubSearch');
    const stateFilter = document.getElementById('stateFilter');
    const clubItems = document.querySelectorAll('.club-item');
    
    if (!searchInput || !stateFilter) return;

    /**
     * Filter clubs based on search term and state selection
     */
    function filterClubs() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedState = stateFilter.value;
        
        clubItems.forEach(item => {
            const clubName = item.dataset.clubName || '';
            const location = item.dataset.location || '';
            const state = item.dataset.state || '';
            
            const matchesSearch = !searchTerm || 
                clubName.includes(searchTerm) || 
                location.includes(searchTerm);
            const matchesState = !selectedState || state === selectedState;
            
            if (matchesSearch && matchesState) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // Attach event listeners
    searchInput.addEventListener('input', filterClubs);
    stateFilter.addEventListener('change', filterClubs);
}

/**
 * Initialize contact delegate modal functionality
 */
function initializeContactDelegateModal() {
    const contactButtons = document.querySelectorAll('.contact-delegate-btn');
    const contactModalElement = document.getElementById('contactDelegateModal');
    
    if (!contactModalElement || contactButtons.length === 0) return;

    const contactModal = new bootstrap.Modal(contactModalElement);
    
    contactButtons.forEach(button => {
        button.addEventListener('click', function() {
            const clubName = this.dataset.clubName || 'Unknown Club';
            const delegateName = this.dataset.delegateName || 'Unknown Delegate';
            const clubId = extractClubIdFromButton(this);
            
            // Update modal content
            const modalClubName = document.getElementById('modalClubName');
            const modalDelegateName = document.getElementById('modalDelegateName');
            const modalClubProfileLink = document.getElementById('modalClubProfileLink');
            
            if (modalClubName) modalClubName.textContent = clubName;
            if (modalDelegateName) modalDelegateName.textContent = delegateName;
            if (modalClubProfileLink && clubId) {
                modalClubProfileLink.setAttribute('href', `/clubs/${clubId}`);
            }
            
            contactModal.show();
        });
    });
}

/**
 * Extract club ID from contact button's parent club item
 * @param {HTMLElement} button - The contact button element
 * @returns {string|null} Club ID or null if not found
 */
function extractClubIdFromButton(button) {
    const clubItem = button.closest('.club-item');
    if (!clubItem) return null;
    
    const clubLink = clubItem.querySelector('a[href*="/clubs/"]');
    if (!clubLink) return null;
    
    const href = clubLink.getAttribute('href');
    const clubId = href.split('/').pop();
    return clubId;
}

/**
 * Initialize basic autocomplete functionality for club name input
 * Note: This provides basic client-side filtering. For full autocomplete,
 * the club-autocomplete.js file should be included instead.
 */
function initializeBasicAutocomplete() {
    const clubNameInput = document.getElementById('clubName');
    const clubSuggestions = document.getElementById('clubSuggestions');
    const joinClubOption = document.getElementById('joinClubOption');
    const foundClubDetails = document.getElementById('foundClubDetails');
    const joinFoundClub = document.getElementById('joinFoundClub');
    
    if (!clubNameInput || !clubSuggestions) return;

    // Get available clubs data from DOM
    const availableClubsData = getAvailableClubsFromDOM();
    let selectedClubId = null;

    // Only trigger autocomplete search after user has typed at least 3 characters
    // and add debouncing to prevent excessive API calls
    let searchTimeout;
    
    clubNameInput.addEventListener('input', function() {
        // Clear any existing validation errors when user starts typing
        clubNameInput.classList.remove('is-invalid');
        const errorContainer = document.getElementById('formErrors');
        if (errorContainer) {
            errorContainer.remove();
        }
        
        const query = this.value.toLowerCase().trim();
        
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        if (query.length < 3) {
            hideSuggestions();
            hideJoinOption();
            return;
        }
        
        // Debounce the search to avoid excessive filtering
        searchTimeout = setTimeout(() => {
            // Filter clubs that match the query
            const filteredClubs = availableClubsData.filter(club => 
                club.clubName.toLowerCase().includes(query) ||
                (club.location && club.location.toLowerCase().includes(query))
            );
            
            displayBasicSuggestions(filteredClubs, query);
        }, 300); // 300ms debounce
    });

    /**
     * Display basic suggestions (fallback when full autocomplete isn't available)
     */
    function displayBasicSuggestions(clubs, query) {
        clubSuggestions.innerHTML = '';
        
        if (clubs.length === 0) {
            hideSuggestions();
            hideJoinOption();
            return;
        }

        clubs.slice(0, 5).forEach(club => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
            suggestionItem.style.cursor = 'pointer';
            suggestionItem.dataset.clubId = club.id;
            
            suggestionItem.innerHTML = `
                <div class="flex-grow-1">
                    <div class="fw-medium">${highlightMatch(club.clubName, query)}</div>
                    <small class="text-muted">
                        <i class="bi bi-geo-alt"></i> ${club.location || 'Location not specified'}, ${club.state}
                    </small>
                </div>
                <div>
                    <span class="badge bg-primary">Join</span>
                </div>
            `;
            
            suggestionItem.addEventListener('click', function() {
                selectClub(club);
            });
            
            clubSuggestions.appendChild(suggestionItem);
        });
        
        showSuggestions();
    }

    /**
     * Select a club from suggestions
     */
    function selectClub(club) {
        selectedClubId = club.id;
        clubNameInput.value = club.clubName;
        hideSuggestions();
        showJoinOption(club);
    }

    /**
     * Show join club option
     */
    function showJoinOption(club) {
        if (!joinClubOption || !foundClubDetails) return;
        
        foundClubDetails.innerHTML = `
            <strong>${club.clubName}</strong><br>
            <small class="text-muted">
                <i class="bi bi-geo-alt"></i> ${club.location || 'Location not specified'}, ${club.state}
            </small>
        `;
        joinClubOption.style.display = 'block';
        
        // Update join button with club ID
        if (joinFoundClub) {
            joinFoundClub.dataset.clubId = club.id;
        }
    }

    /**
     * Hide join club option
     */
    function hideJoinOption() {
        if (joinClubOption) {
            joinClubOption.style.display = 'none';
        }
        selectedClubId = null;
    }

    /**
     * Show suggestions dropdown
     */
    function showSuggestions() {
        clubSuggestions.style.display = 'block';
    }

    /**
     * Hide suggestions dropdown
     */
    function hideSuggestions() {
        clubSuggestions.style.display = 'none';
    }

    // Handle join found club button
    if (joinFoundClub) {
        joinFoundClub.addEventListener('click', function() {
            const clubId = this.dataset.clubId || selectedClubId;
            if (!clubId) return;
            
            // Show loading state
            this.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Joining...';
            this.disabled = true;
            
            // Submit join request via form submission (more reliable than fetch)
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `/clubs/join/${clubId}`;
            form.style.display = 'none';
            
            document.body.appendChild(form);
            form.submit();
        });
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(event) {
        if (!clubNameInput.contains(event.target) && !clubSuggestions.contains(event.target)) {
            hideSuggestions();
        }
    });
}

/**
 * Extract available clubs data from DOM elements
 * @returns {Array} Array of club objects
 */
function getAvailableClubsFromDOM() {
    const clubItems = document.querySelectorAll('.club-item');
    const clubs = [];
    
    clubItems.forEach(item => {
        const clubLink = item.querySelector('a[href*="/clubs/"]');
        if (!clubLink) return;
        
        const clubId = clubLink.getAttribute('href').split('/').pop();
        const clubName = clubLink.textContent.trim().replace(/\s+/g, ' ');
        const locationElement = item.querySelector('.text-muted');
        const locationText = locationElement ? locationElement.textContent.trim() : '';
        
        // Extract location and state from text like "Location, STATE"
        const locationMatch = locationText.match(/(.+),\s*([A-Z]{2,3})/);
        const location = locationMatch ? locationMatch[1].replace(/^\s*\S+\s*/, '').trim() : '';
        const state = item.dataset.state || '';
        
        clubs.push({
            id: clubId,
            clubName: clubName,
            location: location,
            state: state
        });
    });
    
    return clubs;
}

/**
 * Highlight matching text in search results
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} Text with highlighted matches
 */
function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}