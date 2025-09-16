/**
 * @file help-system.js
 * @description Manager object for global contextual help popups.
 */
export const helpSystemManager = {
  elements: {},

  initialize() {
    this.cacheElements();
    this.bindEvents();
  },

  cacheElements() {
    this.elements.helpButton = document.getElementById('global-help-button');
    this.elements.helpModal = document.getElementById('global-help-modal');
    this.elements.helpModalTitle = document.getElementById('help-modal-title');
    this.elements.helpModalBody = document.getElementById('help-modal-body');
  },

  bindEvents() {
    if (this.elements.helpButton) {
      this.elements.helpButton.addEventListener('click', this.handleHelpClick);
    }
  },

  handleHelpClick: async (carnival) => {
    carnival.preventDefault(); // Prevent default link behavior
    
    // Look for data-page-id on body first, then search in DOM
    let pageId = document.body.dataset.pageId;
    if (!pageId) {
      const elementWithPageId = document.querySelector('[data-page-id]');
      pageId = elementWithPageId?.dataset.pageId;
    }
    
    const modal = new bootstrap.Modal(helpSystemManager.elements.helpModal);
    if (!pageId) {
      helpSystemManager.elements.helpModalTitle.textContent = 'General Help';
      helpSystemManager.elements.helpModalBody.innerHTML = '<p>No specific help available for this page.</p>';
      modal.show();
      return;
    }
    try {
      const response = await fetch(`/api/help/${pageId}`);
      if (!response.ok) throw new Error('Help content not found.');
      const data = await response.json();
      helpSystemManager.elements.helpModalTitle.textContent = data.title;
      helpSystemManager.elements.helpModalBody.innerHTML = data.content;
      modal.show();
    } catch (error) {
      helpSystemManager.elements.helpModalTitle.textContent = 'General Help';
      helpSystemManager.elements.helpModalBody.innerHTML = '<p>Failed to load help content.</p>';
      modal.show();
      console.error('Failed to load help content:', error);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  helpSystemManager.initialize();
});
