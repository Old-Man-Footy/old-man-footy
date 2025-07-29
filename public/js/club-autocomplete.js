/**
 * Club Options Autocomplete - Client-side functionality
 * 
 * Handles autocomplete search for club names and alternate names
 * when users are creating or joining clubs.
 */

export const clubAutocompleteManager = {
  elements: {},
  searchTimeout: null,
  selectedClub: null,

  /**
   * Initialize the manager: cache elements and bind events.
   */
  initialize() {
    this.cacheElements();
    this.bindEvents();
  },

  /**
   * Cache all required DOM elements for efficient access.
   */
  cacheElements() {
    this.elements.clubNameInput = document.getElementById('clubName');
    this.elements.clubSuggestions = document.getElementById('clubSuggestions');
    this.elements.joinClubOption = document.getElementById('joinClubOption');
    this.elements.foundClubDetails = document.getElementById('foundClubDetails');
    this.elements.joinFoundClub = document.getElementById('joinFoundClub');
    this.elements.autocompleteHelp = document.getElementById('autocompleteHelp');
    this.elements.createClubForm = document.getElementById('clubCreationForm');
  },

  /**
   * Bind all event listeners for autocomplete and join actions.
   */
  bindEvents() {
    if (!this.elements.clubNameInput) return;
    this.elements.clubNameInput.addEventListener('input', this.handleInput);
    this.elements.clubNameInput.addEventListener('focus', this.clearValidationErrors);
    document.addEventListener('click', this.handleDocumentClick);
    this.elements.joinFoundClub.addEventListener('click', this.handleJoinClick);
    this.elements.createClubForm.addEventListener('reset', this.handleFormReset);
  },

  /**
   * Clear any existing validation errors when user starts typing.
   */
  clearValidationErrors: () => {
    const errorAlerts = document.querySelectorAll('.alert-danger');
    errorAlerts.forEach(alert => {
      if (alert.textContent.includes('undefined') || alert.textContent.includes('validation')) {
        alert.style.display = 'none';
      }
    });
  },

  /**
   * Handle input event with debouncing.
   */
  handleInput: (event) => {
    clubAutocompleteManager.clearValidationErrors();
    const query = event.target.value.trim();
    clearTimeout(clubAutocompleteManager.searchTimeout);
    clubAutocompleteManager.searchTimeout = setTimeout(() => {
      clubAutocompleteManager.performSearch(query);
    }, 300);
  },

  /**
   * Debounced search function to avoid excessive API calls.
   * @param {string} query
   */
  async performSearch(query) {
    if (query.length < 2) {
      this.hideSuggestions();
      this.hideJoinOption();
      return;
    }
    if (this.elements.autocompleteHelp) {
      this.elements.autocompleteHelp.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Searching clubs...';
    }
    try {
      const response = await fetch(`/clubs/api/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.success && data.clubs) {
        this.displaySuggestions(data.clubs, query);
      } else {
        if (this.elements.autocompleteHelp) {
          this.elements.autocompleteHelp.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i> Search temporarily unavailable';
        }
      }
    } catch (error) {
      if (this.elements.autocompleteHelp) {
        this.elements.autocompleteHelp.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i> Search temporarily unavailable';
      }
      this.hideSuggestions();
    }
  },

  /**
   * Display search suggestions.
   * @param {Array} clubs
   * @param {string} originalQuery
   */
  displaySuggestions(clubs, originalQuery) {
    this.elements.clubSuggestions.innerHTML = '';
    if (clubs.length === 0) {
      this.elements.autocompleteHelp.innerHTML = '<i class="bi bi-lightbulb text-success"></i> No existing clubs found - you can create a new one!';
      this.hideSuggestions();
      this.hideJoinOption();
      return;
    }
    this.elements.autocompleteHelp.innerHTML = `<i class="bi bi-search"></i> Found ${clubs.length} club${clubs.length === 1 ? '' : 's'} - click to join or continue typing to create new`;
    clubs.forEach(club => {
      const suggestionItem = document.createElement('div');
      suggestionItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
      suggestionItem.style.cursor = 'pointer';
      suggestionItem.innerHTML = `
        <div class="flex-grow-1">
          <div class="fw-medium">${this.highlightMatch(club.clubName, originalQuery)}</div>
          <small class="text-muted">
            <i class="bi bi-geo-alt"></i> ${club.subtitle}
            ${club.matchedAlternate ? `<br><i class="bi bi-tag"></i> Also known as: ${this.highlightMatch(club.matchedAlternate, originalQuery)}` : ''}
          </small>
        </div>
        <div>
          <span class="badge bg-primary">Join</span>
        </div>
      `;
      suggestionItem.addEventListener('click', () => {
        this.selectClub(club);
      });
      this.elements.clubSuggestions.appendChild(suggestionItem);
    });
    this.showSuggestions();
  },

  /**
   * Highlight matching text in search results.
   * @param {string} text
   * @param {string} query
   * @returns {string}
   */
  highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  /**
   * Escape special regex characters.
   * @param {string} string
   * @returns {string}
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  /**
   * Select a club from suggestions.
   * @param {object} club
   */
  selectClub(club) {
    this.selectedClub = club;
    this.elements.clubNameInput.value = club.clubName;
    this.hideSuggestions();
    this.showJoinOption(club);
  },

  /**
   * Show join club option.
   * @param {object} club
   */
  showJoinOption(club) {
    this.elements.foundClubDetails.innerHTML = `
      <strong>${club.clubName}</strong><br>
      <small class="text-muted">
        <i class="bi bi-geo-alt"></i> ${club.subtitle}
        ${club.matchedAlternate ? `<br><i class="bi bi-tag"></i> Also known as: ${club.matchedAlternate}` : ''}
      </small>
    `;
    this.elements.joinClubOption.style.display = 'block';
    this.elements.joinFoundClub.dataset.clubId = club.id;
  },

  /**
   * Hide join club option.
   */
  hideJoinOption() {
    this.elements.joinClubOption.style.display = 'none';
    this.selectedClub = null;
  },

  /**
   * Show suggestions dropdown.
   */
  showSuggestions() {
    this.elements.clubSuggestions.style.display = 'block';
  },

  /**
   * Hide suggestions dropdown.
   */
  hideSuggestions() {
    this.elements.clubSuggestions.style.display = 'none';
  },

  /**
   * Handle document click to hide suggestions when clicking outside.
   */
  handleDocumentClick: (event) => {
    const manager = clubAutocompleteManager;
    if (!manager.elements.clubNameInput.contains(event.target) && !manager.elements.clubSuggestions.contains(event.target)) {
      manager.hideSuggestions();
    }
  },

  /**
   * Handle join club button click.
   */
  handleJoinClick: () => {
    const manager = clubAutocompleteManager;
    if (!manager.selectedClub) return;
    const clubId = manager.elements.joinFoundClub.dataset.clubId;
    manager.elements.joinFoundClub.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Joining...';
    manager.elements.joinFoundClub.disabled = true;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/clubs/join/${clubId}`;
    form.style.display = 'none';
    document.body.appendChild(form);
    form.submit();
  },

  /**
   * Handle form reset to clear autocomplete state.
   */
  handleFormReset: () => {
    const manager = clubAutocompleteManager;
    manager.hideSuggestions();
    manager.hideJoinOption();
    manager.elements.autocompleteHelp.innerHTML = '<i class="bi bi-lightbulb"></i> Start typing to see if a club already exists with that name';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  clubAutocompleteManager.initialize();
});