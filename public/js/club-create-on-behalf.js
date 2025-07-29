/**
 * @file club-create-on-behalf.js
 * @description Manager for creating clubs on behalf of others. Handles form validation, geolocation, and email prefill.
 * @module public/js/club-create-on-behalf.js
 */

export const clubCreateOnBehalfManager = {
  elements: {},
  userEmail: '',
  availableStates: [],

  /**
   * Initialize the manager: cache elements, set up state, and bind events.
   */
  initialize() {
    this.cacheElements();
    this.cacheDataAttributes();
    this.prefillStateFromGeolocation();
    this.prefillInviteEmail();
    this.bindEvents();
  },

  /**
   * Cache all required DOM elements for efficient access.
   */
  cacheElements() {
    this.elements.form = document.querySelector('form');
    this.elements.stateSelect = document.getElementById('state');
    this.elements.inviteEmailInput = document.getElementById('inviteEmail');
    this.elements.customMessageTextarea = document.getElementById('customMessage');
    this.elements.userEmailElement = document.querySelector('[data-user-email]');
    this.elements.statesElement = document.querySelector('[data-states]');
  },

  /**
   * Cache data attributes for user email and available states.
   */
  cacheDataAttributes() {
    this.userEmail = this.elements.userEmailElement ? this.elements.userEmailElement.dataset.userEmail : '';
    this.availableStates = this.elements.statesElement ? JSON.parse(this.elements.statesElement.dataset.states) : [];
  },

  /**
   * Prefill state select based on user's geolocation.
   */
  prefillStateFromGeolocation() {
    if (navigator.geolocation && this.elements.stateSelect && this.availableStates.length > 0) {
      navigator.geolocation.getCurrentPosition(position => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLng}&format=json`)
          .then(response => response.json())
          .then(data => {
            const userState = data.address.state;
            this.availableStates.forEach(state => {
              if (userState && userState.toLowerCase() === state.toLowerCase()) {
                this.elements.stateSelect.value = state;
              }
            });
          })
          .catch(err => console.error('Error fetching state from location:', err));
      });
    }
  },

  /**
   * Prefill invite email and custom message if user email is available.
   */
  prefillInviteEmail() {
    if (this.userEmail && this.elements.inviteEmailInput && !this.elements.inviteEmailInput.value) {
      this.elements.inviteEmailInput.value = this.userEmail;
      if (this.elements.customMessageTextarea && !this.elements.customMessageTextarea.value) {
        this.elements.customMessageTextarea.value = `Hi, I've created a profile for your club on Old Man Footy. This platform helps connect Masters Rugby League clubs across Australia for carnivals and events. Would you like to take ownership of your club's profile?`;
      }
    }
  },

  /**
   * Bind all event listeners for the form.
   */
  bindEvents() {
    if (this.elements.form) {
      this.elements.form.addEventListener('submit', this.handleFormSubmit);
    }
  },

  /**
   * Handle form submission with basic client-side validation.
   */
  handleFormSubmit: (event) => {
    let isValid = true;
    const requiredFields = ['clubName', 'state', 'inviteEmail'];
    requiredFields.forEach(field => {
      const input = document.querySelector(`[name="${field}"]`);
      if (input && !input.value.trim()) {
        isValid = false;
        input.classList.add('is-invalid');
      } else if (input) {
        input.classList.remove('is-invalid');
      }
    });
    if (!isValid) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
};

// Initialize manager on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  clubCreateOnBehalfManager.initialize();
});