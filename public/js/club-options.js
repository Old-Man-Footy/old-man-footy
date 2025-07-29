/**
 * @file club-options.js
 * @description Manager for club options page: search, filtering, delegate contact modal, and basic autocomplete.
 * @module public/js/club-options.js
 */

export const clubOptionsManager = {
    elements: {},
    searchTimeout: null,
    selectedClubId: null,
  
    /**
     * Initialize the manager: cache elements and bind events.
     */
    initialize() {
      this.cacheElements();
      this.initializeClubSearch();
      this.initializeContactDelegateModal();
      this.initializeBasicAutocomplete();
      this.initializeFormValidation();
    },
  
    /**
     * Cache all required DOM elements for efficient access.
     */
    cacheElements() {
      this.elements.clubCreationForm = document.getElementById('clubCreationForm');
      this.elements.searchInput = document.getElementById('clubSearch');
      this.elements.stateFilter = document.getElementById('stateFilter');
      this.elements.clubItems = document.querySelectorAll('.club-item');
      this.elements.contactButtons = document.querySelectorAll('.contact-delegate-btn');
      this.elements.contactModalElement = document.getElementById('contactDelegateModal');
      this.elements.clubNameInput = document.getElementById('clubName');
      this.elements.clubSuggestions = document.getElementById('clubSuggestions');
      this.elements.joinClubOption = document.getElementById('joinClubOption');
      this.elements.foundClubDetails = document.getElementById('foundClubDetails');
      this.elements.joinFoundClub = document.getElementById('joinFoundClub');
    },
  
    /**
     * Prevents default browser validation and sets up our custom submit handler.
     */
    initializeFormValidation() {
      const form = this.elements.clubCreationForm;
      if (!form) return;
      // Add novalidate to prevent default browser validation.
      form.setAttribute('novalidate', '');
  
      // Use an arrow function to ensure 'this' is the clubOptionsManager object when the event fires.
      form.addEventListener('submit', (event) => this.handleFormSubmit(event));
    },
  
    /**
     * Validates fields that have the `data-required="true"` attribute.
     * @returns {Array<{field: HTMLElement, message: string}>} An array of error objects.
     */
    validateRequiredFields() {
      const errors = [];
      const form = this.elements.clubCreationForm;
      if (!form) return errors;
  
      // Look for the data-required attribute, which matches the production EJS template.
      const requiredFields = form.querySelectorAll('[data-required="true"]');
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          const label = form.querySelector(`label[for="${field.id}"]`);
          const fieldName = label ? label.textContent.replace('*','').trim() : (field.name || field.id);
          errors.push({
            field,
            message: `${fieldName} is a required field.`
          });
        }
      });
      return errors;
    },
  
  
    /**
     * Handle form submission and validation.
     */
    handleFormSubmit(event) {
      event.preventDefault();
      event.stopPropagation();
  
      this.clearValidationErrors();
  
      const validationErrors = this.validateRequiredFields();
  
      if (validationErrors.length > 0) {
        const errorMessages = validationErrors.map(e => e.message);
        this.showFormErrors(errorMessages);
  
        validationErrors.forEach(error => {
          error.field.classList.add('is-invalid');
          this.showFieldError(error.field, 'This field is required.');
        });
  
        const firstInvalidField = this.elements.clubCreationForm.querySelector('.is-invalid');
        if (firstInvalidField) {
          firstInvalidField.focus();
        }
        return false;
      }
  
      const submitButton = this.elements.clubCreationForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Creating Club...';
        submitButton.disabled = true;
      }
      this.elements.clubCreationForm.submit();
    },
  
    /**
     * Clear all validation errors from the form.
     */
    clearValidationErrors() {
      const form = this.elements.clubCreationForm;
      if (!form) return;
  
      const errorAlerts = document.querySelectorAll('.alert-danger');
      errorAlerts.forEach(alert => {
        if (alert.textContent.includes('undefined') ||
          alert.textContent.includes('validation') ||
          alert.textContent.includes('Validation errors') ||
          alert.textContent.includes('Please check your form input') ||
          alert.id === 'formErrors') {
          alert.remove();
        }
      });
  
      const invalidInputs = form.querySelectorAll('.is-invalid');
      invalidInputs.forEach(input => {
        input.classList.remove('is-invalid');
      });
  
      const fieldErrors = form.querySelectorAll('.invalid-feedback');
      fieldErrors.forEach(error => error.remove());
  
      const errorContainer = document.getElementById('formErrors');
      if (errorContainer) {
        errorContainer.remove();
      }
    },
  
    /**
     * Show error message for a specific field.
     */
    showFieldError(field, message) {
      const existingError = field.parentElement.querySelector('.invalid-feedback');
      if (existingError) {
        existingError.remove();
      }
      const errorDiv = document.createElement('div');
      errorDiv.className = 'invalid-feedback';
      errorDiv.textContent = message;
      field.insertAdjacentElement('afterend', errorDiv);
    },
  
    /**
     * Show consolidated error messages at top of form.
     */
    showFormErrors(errors) {
      const form = this.elements.clubCreationForm;
      if (!form) return;
  
      const existingContainer = document.getElementById('formErrors');
      if (existingContainer) {
        existingContainer.remove();
      }
  
      const errorContainer = document.createElement('div');
      errorContainer.id = 'formErrors';
      errorContainer.className = 'alert alert-danger mt-3';
      errorContainer.setAttribute('role', 'alert');
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
      form.insertBefore(errorContainer, form.firstChild);
    },
  
    /**
     * Club search and filtering functionality.
     */
    initializeClubSearch() {
      const searchInput = this.elements.searchInput;
      const stateFilter = this.elements.stateFilter;
      const clubItems = this.elements.clubItems;
      if (!searchInput || !stateFilter) return;
      const filterClubs = () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedState = stateFilter.value;
        clubItems.forEach(item => {
          const clubName = (item.dataset.clubName || '').toLowerCase();
          const location = (item.dataset.location || '').toLowerCase();
          const state = item.dataset.state || '';
          if (selectedState && state !== selectedState) {
            item.style.display = 'none';
            return;
          }
          if (searchTerm && !clubName.includes(searchTerm) && !location.includes(searchTerm)) {
            item.style.display = 'none';
            return;
          }
          item.style.display = 'block';
        });
      };
      searchInput.addEventListener('input', filterClubs);
      stateFilter.addEventListener('change', filterClubs);
    },
  
    /**
     * Contact delegate modal functionality.
     */
    initializeContactDelegateModal() {
      const contactButtons = this.elements.contactButtons;
      const contactModalElement = this.elements.contactModalElement;
      if (!contactModalElement || contactButtons.length === 0) return;
      const contactModal = new bootstrap.Modal(contactModalElement);
      contactButtons.forEach(button => {
        button.addEventListener('click', () => {
          const clubName = button.dataset.clubName || 'Unknown Club';
          const delegateName = button.dataset.delegateName || 'Unknown Delegate';
          const clubId = this.extractClubIdFromButton(button);
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
    },
  
    /**
     * Extract club ID from contact button's parent club item.
     */
    extractClubIdFromButton(button) {
      const clubItem = button.closest('.club-item');
      if (!clubItem) return null;
      const clubLink = clubItem.querySelector('a[href*="/clubs/"]');
      if (!clubLink) return null;
      const href = clubLink.getAttribute('href');
      return href.split('/').pop();
    },
  
    /**
     * Basic autocomplete for club name input (client-side filtering).
     */
    initializeBasicAutocomplete() {
      const clubNameInput = this.elements.clubNameInput;
      const clubSuggestions = this.elements.clubSuggestions;
      const joinClubOption = this.elements.joinClubOption;
      const foundClubDetails = this.elements.foundClubDetails;
      const joinFoundClub = this.elements.joinFoundClub;
      if (!clubNameInput || !clubSuggestions) return;
      const availableClubsData = this.getAvailableClubsFromDOM();
      clubNameInput.addEventListener('input', (event) => {
        clubNameInput.classList.remove('is-invalid');
        const errorContainer = document.getElementById('formErrors');
        if (errorContainer) errorContainer.remove();
        const query = clubNameInput.value.toLowerCase().trim();
        clearTimeout(this.searchTimeout);
        if (query.length < 3) {
          this.hideSuggestions();
          this.hideJoinOption();
          return;
        }
        this.searchTimeout = setTimeout(() => {
          const filteredClubs = availableClubsData.filter(club =>
            club.clubName.toLowerCase().includes(query) ||
            (club.location && club.location.toLowerCase().includes(query))
          );
          this.displayBasicSuggestions(filteredClubs, query);
        }, 300);
      });
      if (joinFoundClub) {
        joinFoundClub.addEventListener('click', () => {
          const clubId = joinFoundClub.dataset.clubId || this.selectedClubId;
          if (!clubId) return;
          joinFoundClub.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Joining...';
          joinFoundClub.disabled = true;
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = `/clubs/join/${clubId}`;
          form.style.display = 'none';
          document.body.appendChild(form);
          form.submit();
        });
      }
      document.addEventListener('click', (event) => {
        if (!clubNameInput.contains(event.target) && !clubSuggestions.contains(event.target)) {
          this.hideSuggestions();
        }
      });
    },
  
    /**
     * Display basic suggestions for club name input.
     */
    displayBasicSuggestions(clubs, query) {
      const clubSuggestions = this.elements.clubSuggestions;
      if (!clubSuggestions) return;
      clubSuggestions.innerHTML = '';
      if (clubs.length === 0) {
        this.hideSuggestions();
        this.hideJoinOption();
        return;
      }
      clubs.slice(0, 5).forEach(club => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
        suggestionItem.style.cursor = 'pointer';
        suggestionItem.dataset.clubId = club.id;
        suggestionItem.innerHTML = `
          <div class="flex-grow-1">
            <div class="fw-medium">${this.highlightMatch(club.clubName, query)}</div>
            <small class="text-muted">
              <i class="bi bi-geo-alt"></i> ${club.location || 'Location not specified'}, ${club.state}
            </small>
          </div>
          <div>
            <span class="badge bg-primary">Join</span>
          </div>
        `;
        suggestionItem.addEventListener('click', () => {
          this.selectClub(club);
        });
        clubSuggestions.appendChild(suggestionItem);
      });
      this.showSuggestions();
    },
  
    /**
     * Select a club from suggestions.
     */
    selectClub(club) {
      this.selectedClubId = club.id;
      this.elements.clubNameInput.value = club.clubName;
      this.hideSuggestions();
      this.showJoinOption(club);
    },
  
    /**
     * Show join club option.
     */
    showJoinOption(club) {
      const joinClubOption = this.elements.joinClubOption;
      const foundClubDetails = this.elements.foundClubDetails;
      const joinFoundClub = this.elements.joinFoundClub;
      if (!joinClubOption || !foundClubDetails) return;
      foundClubDetails.innerHTML = `
        <strong>${club.clubName}</strong><br>
        <small class="text-muted">
          <i class="bi bi-geo-alt"></i> ${club.location || 'Location not specified'}, ${club.state}
        </small>
      `;
      joinClubOption.style.display = 'block';
      if (joinFoundClub) {
        joinFoundClub.dataset.clubId = club.id;
      }
    },
  
    /**
     * Hide join club option.
     */
    hideJoinOption() {
      const joinClubOption = this.elements.joinClubOption;
      if (joinClubOption) {
        joinClubOption.style.display = 'none';
      }
      this.selectedClubId = null;
    },
  
    /**
     * Show suggestions dropdown.
     */
    showSuggestions() {
      const clubSuggestions = this.elements.clubSuggestions;
      if (clubSuggestions) clubSuggestions.style.display = 'block';
    },
  
    /**
     * Hide suggestions dropdown.
     */
    hideSuggestions() {
      const clubSuggestions = this.elements.clubSuggestions;
      if (clubSuggestions) clubSuggestions.style.display = 'none';
    },
  
    /**
     * Extract available clubs data from DOM elements.
     */
    getAvailableClubsFromDOM() {
      const clubItems = this.elements.clubItems;
      const clubs = [];
      clubItems.forEach(item => {
        const clubLink = item.querySelector('a[href*="/clubs/"]');
        if (!clubLink) return;
        const clubId = clubLink.getAttribute('href').split('/').pop();
        const clubName = clubLink.textContent.trim().replace(/\s+/g, ' ');
        const locationElement = item.querySelector('.text-muted');
        const locationText = locationElement ? locationElement.textContent.trim() : '';
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
    },
  
    /**
     * Highlight matching text in search results.
     */
    highlightMatch(text, query) {
      if (!query) return text;
      const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    },
  
    /**
     * Escape special regex characters.
     */
    escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  };
  
  // Initialize manager on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    clubOptionsManager.initialize();
  });
  