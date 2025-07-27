/**
 * @file club-add-sponsor.js
 * @description Manager for Club Add Sponsor form. Handles duplicate detection and form submission.
 * @module public/js/club-add-sponsor.js
 */

export const clubAddSponsorManager = {
  elements: {},
  existingSponsorData: null,

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
    this.elements.sponsorNameInput = document.getElementById('sponsorName');
    this.elements.createNewBtn = document.getElementById('createNewBtn');
    this.elements.sponsorTypeInput = document.getElementById('sponsorTypeInput');
    this.elements.submitText = document.getElementById('submitText');
    this.elements.submitBtn = document.getElementById('submitBtn');
    this.elements.sponsorForm = document.getElementById('sponsorForm');
  },

  /**
   * Bind all event listeners for the form and its controls.
   */
  bindEvents() {
    this.elements.createNewBtn.addEventListener('click', this.handleCreateNewClick);
    this.elements.sponsorForm.addEventListener('submit', this.handleFormSubmit);
    this.elements.sponsorNameInput.addEventListener('focus', this.handleSponsorNameFocus);
    this.elements.sponsorNameInput.addEventListener('blur', this.handleSponsorNameBlur);
  },

  /**
   * Handle click on create new sponsor button.
   */
  handleCreateNewClick: () => {
    const manager = clubAddSponsorManager;
    manager.resetToNewSponsorMode();
  },

  /**
   * Reset form to new sponsor creation mode.
   */
  resetToNewSponsorMode() {
    this.elements.sponsorTypeInput.value = 'new';
    this.elements.submitText.textContent = 'Add Sponsor';
    this.disableFormFields(false);
    this.elements.submitBtn.className = 'btn btn-primary';
    this.elements.submitBtn.innerHTML = '<i class="bi bi-save me-1"></i><span id="submitText">Add Sponsor</span>';
    this.removeLinkingFeedback();
  },

  /**
   * Enable/disable form fields except sponsor name.
   * @param {boolean} disable
   */
  disableFormFields(disable) {
    const fields = this.elements.sponsorForm.querySelectorAll('input:not([type="hidden"]), select, textarea');
    fields.forEach(field => {
      if (field.id !== 'sponsorName') {
        field.disabled = disable;
        if (disable) {
          field.classList.add('bg-light');
        } else {
          field.classList.remove('bg-light');
        }
      }
    });
  },

  /**
   * Show feedback for linking to existing sponsor.
   */
  showLinkingFeedback() {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.id = 'linkingFeedback';
    feedbackDiv.className = 'alert alert-success mt-3';
    feedbackDiv.innerHTML = `
      <i class="bi bi-check-circle me-2"></i>
      <strong>Ready to link!</strong> You're about to link to the existing sponsor "${this.existingSponsorData.sponsorName}". 
      The form fields below are disabled since you're linking to an existing sponsor.
    `;
    const sponsorNameGroup = this.elements.sponsorNameInput.closest('.mb-3');
    sponsorNameGroup.parentNode.insertBefore(feedbackDiv, sponsorNameGroup.nextSibling);
  },

  /**
   * Remove linking feedback if present.
   */
  removeLinkingFeedback() {
    const feedback = document.getElementById('linkingFeedback');
    if (feedback) feedback.remove();
  },

  /**
   * Handle form submission: show loading state.
   */
  handleFormSubmit: (e) => {
    const manager = clubAddSponsorManager;
    const submitBtn = manager.elements.submitBtn;
    const originalContent = submitBtn.innerHTML;
    const isLinking = manager.elements.sponsorTypeInput.value === 'existing';
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="bi bi-arrow-clockwise spin me-1"></i>${isLinking ? 'Linking...' : 'Creating...'}`;
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalContent;
    }, 10000);
  },

  /**
   * UX: highlight sponsor name field on focus.
   */
  handleSponsorNameFocus: (e) => {
    e.target.classList.add('border-primary');
  },

  /**
   * UX: remove highlight from sponsor name field on blur.
   */
  handleSponsorNameBlur: (e) => {
    e.target.classList.remove('border-primary');
  }
};

// Initialize manager on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  clubAddSponsorManager.initialize();
});