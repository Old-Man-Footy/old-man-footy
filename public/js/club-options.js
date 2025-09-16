/**
 * Club Options Page Manager
 * Handles search/filtering, delegate contact modal, basic autocomplete, and form validation
 */
export const clubOptionsManager = {
    elements: {},
    state: {
        selectedClubId: null,
        searchTimeout: null,
        availableClubsData: [],
        contactModal: null
    },

    initialize() {
        this.cacheElements();
        this.bindEvents();
        // Preload clubs from DOM for basic autocomplete
        this.state.availableClubsData = this.getAvailableClubsFromDOM();
    },

    cacheElements() {
        // Filters/search
        this.elements.searchInput = document.getElementById('clubSearch');
        this.elements.stateFilter = document.getElementById('stateFilter');
        this.elements.clubItems = document.querySelectorAll('.club-item');

        // Contact modal
        this.elements.contactButtons = document.querySelectorAll('.contact-delegate-btn');
        this.elements.contactModalElement = document.getElementById('contactDelegateModal');
        this.elements.modalClubName = document.getElementById('modalClubName');
        this.elements.modalDelegateName = document.getElementById('modalDelegateName');
        this.elements.modalClubProfileLink = document.getElementById('modalClubProfileLink');

        // Autocomplete
        this.elements.clubNameInput = document.getElementById('clubName');
        this.elements.clubSuggestions = document.getElementById('clubSuggestions');
        this.elements.joinClubOption = document.getElementById('joinClubOption');
        this.elements.foundClubDetails = document.getElementById('foundClubDetails');
        this.elements.joinFoundClub = document.getElementById('joinFoundClub');

        // Form
        this.elements.clubCreationForm = document.getElementById('clubCreationForm');
    },

    bindEvents() {
        // Search/filter
        if (this.elements.searchInput && this.elements.stateFilter) {
            this.elements.searchInput.addEventListener('input', this.filterClubs);
            this.elements.stateFilter.addEventListener('change', this.filterClubs);
        }

        // Contact modal
        if (this.elements.contactModalElement && this.elements.contactButtons.length > 0 && typeof window !== 'undefined' && window.bootstrap && window.bootstrap.Modal) {
            try {
                this.state.contactModal = new window.bootstrap.Modal(this.elements.contactModalElement);
            } catch {
                this.state.contactModal = null;
            }
            this.elements.contactButtons.forEach(btn => btn.addEventListener('click', this.handleContactClick));
        }

        // Autocomplete input
        if (this.elements.clubNameInput && this.elements.clubSuggestions) {
            this.elements.clubNameInput.addEventListener('input', this.handleClubNameInput);
            document.addEventListener('click', this.handleDocumentClick);
        }

        // Join found club
        if (this.elements.joinFoundClub) {
            this.elements.joinFoundClub.addEventListener('click', this.handleJoinFoundClub);
        }

        // Form validation
        if (this.elements.clubCreationForm) {
            // prevent browser built-in validation UI
            this.elements.clubCreationForm.setAttribute('novalidate', 'novalidate');
            const inputs = this.elements.clubCreationForm.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.hasAttribute('required')) {
                    input.setAttribute('data-required', 'true');
                    input.removeAttribute('required');
                }
                input.addEventListener('input', this.clearValidationErrors);
                input.addEventListener('change', this.clearValidationErrors);
            });
            this.elements.clubCreationForm.addEventListener('submit', this.handleClubCreationSubmit);
        }
    },

    // Search/filter
    filterClubs: () => {
        const items = document.querySelectorAll('.club-item');
        const searchInput = document.getElementById('clubSearch');
        const stateFilter = document.getElementById('stateFilter');
        if (!searchInput || !stateFilter) return;
        const searchTerm = (searchInput.value || '').toLowerCase();
        const selectedState = stateFilter.value || '';
        items.forEach(item => {
            const clubName = (item.dataset.clubName || '').toLowerCase();
            const location = (item.dataset.location || '').toLowerCase();
            const state = item.dataset.state || '';
            const matchesSearch = !searchTerm || clubName.includes(searchTerm) || location.includes(searchTerm);
            const matchesState = !selectedState || state === selectedState;
            item.style.display = matchesSearch && matchesState ? 'block' : 'none';
        });
    },

    // Contact modal
    handleContactClick: (carnival) => {
        const btn = carnival.currentTarget;
        const clubName = btn.dataset.clubName || 'Unknown Club';
        const delegateName = btn.dataset.delegateName || 'Unknown Delegate';
        const clubId = clubOptionsManager.extractClubIdFromButton(btn);
        if (clubOptionsManager.elements.modalClubName) clubOptionsManager.elements.modalClubName.textContent = clubName;
        if (clubOptionsManager.elements.modalDelegateName) clubOptionsManager.elements.modalDelegateName.textContent = delegateName;
        if (clubOptionsManager.elements.modalClubProfileLink && clubId) {
            clubOptionsManager.elements.modalClubProfileLink.setAttribute('href', `/clubs/${clubId}`);
        }
        if (clubOptionsManager.state.contactModal && typeof clubOptionsManager.state.contactModal.show === 'function') {
            clubOptionsManager.state.contactModal.show();
        }
    },

    extractClubIdFromButton(button) {
        const clubItem = button.closest('.club-item');
        if (!clubItem) return null;
        const clubLink = clubItem.querySelector('a[href*="/clubs/"]');
        if (!clubLink) return null;
        const href = clubLink.getAttribute('href');
        return href.split('/').pop();
    },

    // Autocomplete
    handleClubNameInput: (e) => {
        const input = e.currentTarget;
        const query = (input.value || '').toLowerCase().trim();
        const suggestions = clubOptionsManager.elements.clubSuggestions;
        // clear validation state when typing
        input.classList.remove('is-invalid');
        const err = document.getElementById('formErrors');
        if (err) err.remove();

        clearTimeout(clubOptionsManager.state.searchTimeout);
        if (query.length < 3) {
            clubOptionsManager.hideSuggestions();
            clubOptionsManager.hideJoinOption();
            return;
        }
        clubOptionsManager.state.searchTimeout = setTimeout(() => {
            const filtered = clubOptionsManager.state.availableClubsData.filter(c =>
                (c.clubName || '').toLowerCase().includes(query) || (c.location || '').toLowerCase().includes(query)
            );
            clubOptionsManager.displayBasicSuggestions(filtered, query);
        }, 300);
    },

    handleDocumentClick: (carnival) => {
        const input = clubOptionsManager.elements.clubNameInput;
        const suggestions = clubOptionsManager.elements.clubSuggestions;
        if (!input || !suggestions) return;
        if (!input.contains(carnival.target) && !suggestions.contains(carnival.target)) {
            clubOptionsManager.hideSuggestions();
        }
    },

    displayBasicSuggestions(clubs, query) {
        const suggestions = this.elements.clubSuggestions;
        suggestions.innerHTML = '';
        if (!clubs || clubs.length === 0) {
            this.hideSuggestions();
            this.hideJoinOption();
            return;
        }
        clubs.slice(0, 5).forEach(club => {
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
            item.style.cursor = 'pointer';
            item.dataset.clubId = club.id;

            const safeName = this.escapeHtml(club.clubName || '');
            const highlighted = this.highlightMatch(safeName, query);
            item.innerHTML = `
                <div class="flex-grow-1">
                    <div class="fw-medium">${highlighted}</div>
                    <small class="text-muted">
                        <i class="bi bi-geo-alt"></i> ${this.escapeHtml(club.location || 'Location not specified')}, ${this.escapeHtml(club.state || '')}
                    </small>
                </div>
                <div>
                    <span class="badge bg-primary">Join</span>
                </div>`;
            item.addEventListener('click', () => this.selectClub(club));
            suggestions.appendChild(item);
        });
        this.showSuggestions();
    },

    selectClub(club) {
        this.state.selectedClubId = club.id;
        if (this.elements.clubNameInput) this.elements.clubNameInput.value = club.clubName;
        this.hideSuggestions();
        this.showJoinOption(club);
    },

    showJoinOption(club) {
        if (!this.elements.joinClubOption || !this.elements.foundClubDetails) return;
        this.elements.foundClubDetails.innerHTML = `
            <strong>${this.escapeHtml(club.clubName || '')}</strong><br>
            <small class="text-muted">
                <i class="bi bi-geo-alt"></i> ${this.escapeHtml(club.location || 'Location not specified')}, ${this.escapeHtml(club.state || '')}
            </small>`;
        this.elements.joinClubOption.style.display = 'block';
        if (this.elements.joinFoundClub) this.elements.joinFoundClub.dataset.clubId = club.id;
    },

    hideJoinOption() {
        if (this.elements.joinClubOption) this.elements.joinClubOption.style.display = 'none';
        this.state.selectedClubId = null;
    },

    showSuggestions() {
        if (this.elements.clubSuggestions) this.elements.clubSuggestions.style.display = 'block';
    },

    hideSuggestions() {
        if (this.elements.clubSuggestions) this.elements.clubSuggestions.style.display = 'none';
    },

    handleJoinFoundClub: (e) => {
        const btn = e.currentTarget;
        const clubId = btn.dataset.clubId || clubOptionsManager.state.selectedClubId;
        if (!clubId) return;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Joining...';
        btn.disabled = true;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/clubs/join/${clubId}`;
        form.style.display = 'none';
        document.body.appendChild(form);
        try {
            form.submit();
        } catch {
            // ignore jsdom not implemented
        }
    },

    // Form validation
    handleClubCreationSubmit: (carnival) => {
        carnival.preventDefault();
        carnival.stopPropagation();
        clubOptionsManager.clearValidationErrors();
        const form = clubOptionsManager.elements.clubCreationForm;
        const clubNameInput = document.getElementById('clubName');
        const stateSelect = document.getElementById('state');
        const locationInput = document.getElementById('location');
        let isValid = true;
        const errors = [];

        if (!clubNameInput || !clubNameInput.value.trim() || clubNameInput.value.trim().length < 2) {
            errors.push('Club name must be at least 2 characters long');
            if (clubNameInput) {
                clubNameInput.classList.add('is-invalid');
                clubOptionsManager.showFieldError(clubNameInput, 'Club name must be at least 2 characters long');
            }
            isValid = false;
        }
        if (!stateSelect || !stateSelect.value) {
            errors.push('Please select a state');
            if (stateSelect) {
                stateSelect.classList.add('is-invalid');
                clubOptionsManager.showFieldError(stateSelect, 'Please select a state');
            }
            isValid = false;
        }
        if (!locationInput || !locationInput.value.trim() || locationInput.value.trim().length < 2) {
            errors.push('Location must be at least 2 characters long');
            if (locationInput) {
                locationInput.classList.add('is-invalid');
                clubOptionsManager.showFieldError(locationInput, 'Location must be at least 2 characters long');
            }
            isValid = false;
        }

        if (!isValid) {
            clubOptionsManager.showFormErrors(errors);
            const firstInvalid = form.querySelector('.is-invalid');
            if (firstInvalid) {
                try { firstInvalid.focus(); } catch {}
                try { firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
            }
            return false;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Creating Club...';
            submitButton.disabled = true;
        }
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.getAttribute('data-required') === 'true') input.setAttribute('required', 'required');
        });
        try {
            form.submit();
        } catch {
            // ignore jsdom not implemented
        }
    },

    clearValidationErrors: () => {
        const form = document.getElementById('clubCreationForm');
        if (!form) return;
        const errorAlerts = document.querySelectorAll('.alert-danger');
        errorAlerts.forEach(alert => {
            const t = alert.textContent || '';
            if (t.includes('undefined') || t.includes('validation') || t.includes('Validation errors') || t.includes('Please check your form input')) {
                alert.remove();
            }
        });
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
        const errorContainer = document.getElementById('formErrors');
        if (errorContainer) errorContainer.remove();
    },

    showFieldError(field, message) {
        const existingError = field.parentNode ? field.parentNode.querySelector('.invalid-feedback') : null;
        if (existingError) existingError.remove();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        if (field.parentNode) field.parentNode.appendChild(errorDiv);
    },

    showFormErrors(errors) {
        const existingContainer = document.getElementById('formErrors');
        if (existingContainer) existingContainer.remove();
        const errorContainer = document.createElement('div');
        errorContainer.id = 'formErrors';
        errorContainer.className = 'alert alert-danger mt-3';
        const list = errors.map(e => `<li>${this.escapeHtml(e)}</li>`).join('');
        errorContainer.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
                <div>
                    <strong>Please correct the following errors:</strong>
                    <ul class="mb-0 mt-2">${list}</ul>
                </div>
            </div>`;
        const form = document.getElementById('clubCreationForm');
        if (form) form.insertBefore(errorContainer, form.firstChild);
    },

    // Utilities
    getAvailableClubsFromDOM() {
        const items = document.querySelectorAll('.club-item');
        const clubs = [];
        items.forEach(item => {
            const clubLink = item.querySelector('a[href*="/clubs/"]');
            if (!clubLink) return;
            const clubId = clubLink.getAttribute('href').split('/').pop();
            const clubName = (clubLink.textContent || '').trim().replace(/\s+/g, ' ');
            const locationElement = item.querySelector('.text-muted');
            const locationText = locationElement ? (locationElement.textContent || '').trim() : '';
            const locationMatch = locationText.match(/(.+),\s*([A-Z]{2,3})/);
            const location = locationMatch ? locationMatch[1].replace(/^\s*\S+\s*/, '').trim() : '';
            const state = item.dataset.state || '';
            clubs.push({ id: clubId, clubName, location, state });
        });
        return clubs;
    },

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};

// Browser bootstrap
document.addEventListener('DOMContentLoaded', () => {
    try { clubOptionsManager.initialize(); } catch {}
});
