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
});

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

    clubNameInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 3) {
            hideSuggestions();
            hideJoinOption();
            return;
        }
        
        // Filter clubs that match the query
        const filteredClubs = availableClubsData.filter(club => 
            club.clubName.toLowerCase().includes(query) ||
            (club.location && club.location.toLowerCase().includes(query))
        );
        
        displayBasicSuggestions(filteredClubs, query);
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