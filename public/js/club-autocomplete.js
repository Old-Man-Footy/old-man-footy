/**
 * Club Options Autocomplete - Client-side functionality
 * 
 * Handles autocomplete search for club names and alternate names
 * when users are creating or joining clubs.
 */

document.addEventListener('DOMContentLoaded', function() {
    const clubNameInput = document.getElementById('clubName');
    const clubSuggestions = document.getElementById('clubSuggestions');
    const joinClubOption = document.getElementById('joinClubOption');
    const foundClubDetails = document.getElementById('foundClubDetails');
    const joinFoundClub = document.getElementById('joinFoundClub');
    const autocompleteHelp = document.getElementById('autocompleteHelp');
    const createClubForm = document.getElementById('clubCreationForm');
    
    let searchTimeout;
    let selectedClub = null;

    if (!clubNameInput) return; // Exit if elements don't exist

    /**
     * Clear any existing validation errors when user starts typing
     */
    function clearValidationErrors() {
        const errorAlerts = document.querySelectorAll('.alert-danger');
        errorAlerts.forEach(alert => {
            if (alert.textContent.includes('undefined') || alert.textContent.includes('validation')) {
                alert.style.display = 'none';
            }
        });
    }

    /**
     * Debounced search function to avoid excessive API calls
     */
    function performSearch(query) {
        if (query.length < 2) {
            hideSuggestions();
            hideJoinOption();
            return;
        }

        // Show loading state
        if (autocompleteHelp) {
            autocompleteHelp.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Searching clubs...';
        }

        // Perform API search with proper error handling
        fetch(`/clubs/api/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.clubs) {
                    displaySuggestions(data.clubs, query);
                } else {
                    console.error('Search failed:', data.message || 'Unknown error');
                    if (autocompleteHelp) {
                        autocompleteHelp.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i> Search temporarily unavailable';
                    }
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                if (autocompleteHelp) {
                    autocompleteHelp.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i> Search temporarily unavailable';
                }
                // Don't show validation errors from search failures
                hideSuggestions();
            });
    }

    /**
     * Display search suggestions
     */
    function displaySuggestions(clubs, originalQuery) {
        clubSuggestions.innerHTML = '';
        
        if (clubs.length === 0) {
            autocompleteHelp.innerHTML = '<i class="bi bi-lightbulb text-success"></i> No existing clubs found - you can create a new one!';
            hideSuggestions();
            hideJoinOption();
            return;
        }

        autocompleteHelp.innerHTML = `<i class="bi bi-search"></i> Found ${clubs.length} club${clubs.length === 1 ? '' : 's'} - click to join or continue typing to create new`;

        clubs.forEach(club => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
            suggestionItem.style.cursor = 'pointer';
            
            suggestionItem.innerHTML = `
                <div class="flex-grow-1">
                    <div class="fw-medium">${highlightMatch(club.clubName, originalQuery)}</div>
                    <small class="text-muted">
                        <i class="bi bi-geo-alt"></i> ${club.subtitle}
                        ${club.matchedAlternate ? `<br><i class="bi bi-tag"></i> Also known as: ${highlightMatch(club.matchedAlternate, originalQuery)}` : ''}
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
     * Highlight matching text in search results
     */
    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Escape special regex characters
     */
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Select a club from suggestions
     */
    function selectClub(club) {
        selectedClub = club;
        clubNameInput.value = club.clubName;
        hideSuggestions();
        showJoinOption(club);
    }

    /**
     * Show join club option
     */
    function showJoinOption(club) {
        foundClubDetails.innerHTML = `
            <strong>${club.clubName}</strong><br>
            <small class="text-muted">
                <i class="bi bi-geo-alt"></i> ${club.subtitle}
                ${club.matchedAlternate ? `<br><i class="bi bi-tag"></i> Also known as: ${club.matchedAlternate}` : ''}
            </small>
        `;
        joinClubOption.style.display = 'block';
        
        // Update join button with club ID
        joinFoundClub.dataset.clubId = club.id;
    }

    /**
     * Hide join club option
     */
    function hideJoinOption() {
        joinClubOption.style.display = 'none';
        selectedClub = null;
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

    // Input event handler with debouncing
    clubNameInput.addEventListener('input', function() {
        clearValidationErrors();
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performSearch(query), 300);
    });

    // Prevent form submission validation errors from autocomplete
    clubNameInput.addEventListener('focus', clearValidationErrors);

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(event) {
        if (!clubNameInput.contains(event.target) && !clubSuggestions.contains(event.target)) {
            hideSuggestions();
        }
    });

    // Handle join club button click
    joinFoundClub.addEventListener('click', function() {
        if (!selectedClub) return;

        const clubId = this.dataset.clubId;
        
        // Show loading state
        this.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Joining...';
        this.disabled = true;

        // Submit join request
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/clubs/join/${clubId}`;
        form.style.display = 'none';
        
        document.body.appendChild(form);
        form.submit();
    });

    // Reset autocomplete when form is reset
    document.getElementById('clubCreationForm').addEventListener('reset', function() {
        hideSuggestions();
        hideJoinOption();
        autocompleteHelp.innerHTML = '<i class="bi bi-lightbulb"></i> Start typing to see if a club already exists with that name';
    });
});