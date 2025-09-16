/**
 * Club Options Autocomplete (Manager Object Pattern)
 * Handles autocomplete search for club names and alternate names
 * when users are creating or joining clubs.
 */
export const clubAutocompleteManager = {
    elements: {},
    state: {
        searchTimeout: null,
        selectedClub: null,
    },

    initialize() {
        this.cacheElements();
        // If the primary input is missing, bail quietly (view may not include this feature)
        if (!this.elements.clubNameInput) return;
        this.bindEvents();
    },

    cacheElements() {
        this.elements.clubNameInput = document.getElementById('clubName');
        this.elements.clubSuggestions = document.getElementById('clubSuggestions');
        this.elements.joinClubOption = document.getElementById('joinClubOption');
        this.elements.foundClubDetails = document.getElementById('foundClubDetails');
        this.elements.joinFoundClub = document.getElementById('joinFoundClub');
        this.elements.autocompleteHelp = document.getElementById('autocompleteHelp');
        this.elements.createClubForm = document.getElementById('clubCreationForm');
    },

    bindEvents() {
        const el = this.elements;
        if (el.clubNameInput) {
            el.clubNameInput.addEventListener('input', this.handleInput);
            el.clubNameInput.addEventListener('focus', this.handleFocus);
        }
        // Click outside to hide suggestions
        document.addEventListener('click', this.handleClickOutside);
        // Join button
        if (el.joinFoundClub) {
            el.joinFoundClub.addEventListener('click', this.handleJoinClick);
        }
        // Form reset
        if (el.createClubForm) {
            el.createClubForm.addEventListener('reset', this.handleFormReset);
        }
    },

    // Handlers (arrow functions to preserve lexical scope)
    handleInput: (e) => {
        clubAutocompleteManager.clearValidationErrors();
        const query = e.currentTarget.value.trim();
        clearTimeout(clubAutocompleteManager.state.searchTimeout);
        clubAutocompleteManager.state.searchTimeout = setTimeout(() => {
            clubAutocompleteManager.performSearch(query);
        }, 300);
    },

    handleFocus: () => {
        clubAutocompleteManager.clearValidationErrors();
    },

    handleClickOutside: (carnival) => {
        const el = clubAutocompleteManager.elements;
        if (!el.clubNameInput || !el.clubSuggestions) return;
        if (!el.clubNameInput.contains(carnival.target) && !el.clubSuggestions.contains(carnival.target)) {
            clubAutocompleteManager.hideSuggestions();
        }
    },

    handleJoinClick: (e) => {
        const el = clubAutocompleteManager.elements;
        if (!clubAutocompleteManager.state.selectedClub || !el.joinFoundClub) return;
        const clubId = el.joinFoundClub.dataset.clubId;

        // Show loading state
        el.joinFoundClub.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Joining...';
        el.joinFoundClub.disabled = true;

        // Submit join request via a temporary form post
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/clubs/join/${clubId}`;
        form.style.display = 'none';
        document.body.appendChild(form);
        form.submit();
    },

    handleFormReset: () => {
        clubAutocompleteManager.hideSuggestions();
        clubAutocompleteManager.hideJoinOption();
        clubAutocompleteManager.setAutocompleteHelp('<i class="bi bi-lightbulb"></i> Start typing to see if a club already exists with that name');
    },

    // UI helpers
    setAutocompleteHelp(html) {
        const el = this.elements;
        if (el.autocompleteHelp) el.autocompleteHelp.innerHTML = html;
    },

    clearValidationErrors() {
        const errorAlerts = document.querySelectorAll('.alert-danger');
        errorAlerts.forEach((alert) => {
            if (alert.textContent.includes('undefined') || alert.textContent.includes('validation')) {
                alert.style.display = 'none';
            }
        });
    },

    // Core logic
    async performSearch(query) {
        const el = this.elements;
        if (!el.clubNameInput) return;

        if (!query || query.length < 2) {
            this.hideSuggestions();
            this.hideJoinOption();
            return;
        }

        this.setAutocompleteHelp('<i class="bi bi-arrow-repeat spin"></i> Searching clubs...');

        try {
            const res = await fetch(`/clubs/api/search?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.clubs)) {
                this.displaySuggestions(data.clubs, query);
            } else {
                console.error('Search failed:', data.message || 'Unknown error');
                this.setAutocompleteHelp('<i class="bi bi-exclamation-triangle text-warning"></i> Search temporarily unavailable');
            }
        } catch (err) {
            console.error('Search error:', err);
            this.setAutocompleteHelp('<i class="bi bi-exclamation-triangle text-warning"></i> Search temporarily unavailable');
            this.hideSuggestions();
        }
    },

    displaySuggestions(clubs, originalQuery) {
        const el = this.elements;
        if (!el.clubSuggestions) return;
        el.clubSuggestions.innerHTML = '';

        if (!clubs.length) {
            this.setAutocompleteHelp('<i class="bi bi-lightbulb text-success"></i> No existing clubs found - you can create a new one!');
            this.hideSuggestions();
            this.hideJoinOption();
            return;
        }

        this.setAutocompleteHelp(`<i class="bi bi-search"></i> Found ${clubs.length} club${clubs.length === 1 ? '' : 's'} - click to join or continue typing to create new`);

        clubs.forEach((club) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
            suggestionItem.style.cursor = 'pointer';

            const clubNameHtml = this.highlightMatch(this.escapeHtml(club.clubName ?? ''), originalQuery);
            const subtitleHtml = this.escapeHtml(club.subtitle ?? '');
            const altHtml = club.matchedAlternate
                ? this.highlightMatch(this.escapeHtml(club.matchedAlternate), originalQuery)
                : '';

            suggestionItem.innerHTML = `
                <div class="flex-grow-1">
                    <div class="fw-medium">${clubNameHtml}</div>
                    <small class="text-muted">
                        <i class="bi bi-geo-alt"></i> ${subtitleHtml}
                        ${altHtml ? `<br><i class=\"bi bi-tag\"></i> Also known as: ${altHtml}` : ''}
                    </small>
                </div>
                <div>
                    <span class="badge bg-primary">Join</span>
                </div>
            `;

            suggestionItem.addEventListener('click', () => {
                clubAutocompleteManager.selectClub(club);
            });

            el.clubSuggestions.appendChild(suggestionItem);
        });

        this.showSuggestions();
    },

    highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    selectClub(club) {
        const el = this.elements;
        this.state.selectedClub = club;
        if (el.clubNameInput) el.clubNameInput.value = club.clubName || '';
        this.hideSuggestions();
        this.showJoinOption(club);
    },

    showJoinOption(club) {
        const el = this.elements;
        if (!el.joinClubOption || !el.foundClubDetails) return;
        const name = this.escapeHtml(club.clubName ?? '');
        const subtitle = this.escapeHtml(club.subtitle ?? '');
        const alt = club.matchedAlternate ? this.escapeHtml(club.matchedAlternate) : '';

        el.foundClubDetails.innerHTML = `
            <strong>${name}</strong><br>
            <small class="text-muted">
                <i class="bi bi-geo-alt"></i> ${subtitle}
                ${alt ? `<br><i class=\"bi bi-tag\"></i> Also known as: ${alt}` : ''}
            </small>
        `;
        el.joinClubOption.style.display = 'block';
        if (el.joinFoundClub) el.joinFoundClub.dataset.clubId = club.id;
    },

    hideJoinOption() {
        const el = this.elements;
        if (el.joinClubOption) el.joinClubOption.style.display = 'none';
        this.state.selectedClub = null;
    },

    showSuggestions() {
        const el = this.elements;
        if (el.clubSuggestions) el.clubSuggestions.style.display = 'block';
    },

    hideSuggestions() {
        const el = this.elements;
        if (el.clubSuggestions) el.clubSuggestions.style.display = 'none';
    },
};

// Bootstrap the manager in the browser
document.addEventListener('DOMContentLoaded', () => {
    clubAutocompleteManager.initialize();
});