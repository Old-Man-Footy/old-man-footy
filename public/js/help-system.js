// public/js/help-system.js
// Centralized, page-configurable help system manager.
// Exported as `helpSystem` following the project "manager" pattern so pages can import and initialize it.

export const helpSystem = {
  elements: {},
  pageId: null,
  config: {},

  /**
   * Initialize the help system for a given page.
   * @param {string} pageId - a short identifier matching the help config (e.g. 'club-options')
   * @param {object} config - help configuration object (see docs/plans/contextual-help-popups-plan.md)
   */
  initialize(pageId, config = {}) {
    this.pageId = pageId;
    this.config = config;
    this.cacheElements();
    this.bindEvents();
  },

  cacheElements() {
  // Default modal id that the legacy templates may include
  this.elements.defaultModalId = 'help-modal';
  this.elements.modal = document.getElementById(this.elements.defaultModalId) || null;
  this.elements.modalTitle = this.elements.modal ? this.elements.modal.querySelector('.help-modal-title') : null;
  this.elements.modalBody = this.elements.modal ? this.elements.modal.querySelector('.help-modal-body') : null;
  },

  bindEvents() {
    // Attach click listeners to any element that declares a data-help-key attribute
    document.querySelectorAll('[data-help-key], .help-trigger').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
  const key = el.dataset.helpKey || el.getAttribute('data-help') || null;
  // allow an element to target a specific modal instance using data-help-modal
  const modalId = el.dataset.helpModal || el.getAttribute('data-help-modal') || this.elements.defaultModalId;
  this.openHelp(key, el, modalId);
      });
    });
  },

  /**
   * Open the help modal for a specific key.
   * Falls back to a default section if key not found.
   * @param {string|null} key
   * @param {Element|null} triggerEl
   */
  /**
   * Open the help modal for a specific key.
   * If modalId is provided, target that modal instance; otherwise use default.
   * @param {string|null} key
   * @param {Element|null} triggerEl
   * @param {string} modalId
   */
  openHelp(key, triggerEl = null, modalId = null) {
    modalId = modalId || this.elements.defaultModalId;
    const modalEl = document.getElementById(modalId) || this.elements.modal;
    if (!modalEl) return;

    // find scoped elements within this modal
    const modalTitleEl = modalEl.querySelector('.help-modal-title');
    const modalBodyEl = modalEl.querySelector('.help-modal-body');

    const pageCfg = (this.config && this.config.pages && this.config.pages[this.pageId]) ? this.config.pages[this.pageId] : this.config.pages && this.config.pages['default'];
    const section = key && pageCfg ? pageCfg[key] : (pageCfg && pageCfg['default']) ? pageCfg['default'] : null;

    if (!section) {
      modalTitleEl && (modalTitleEl.textContent = 'Help');
      if (modalBodyEl) modalBodyEl.innerHTML = '<p>No help content available for this item.</p>';
    } else {
  modalTitleEl && (modalTitleEl.textContent = section.title || 'Help');
  if (modalBodyEl) modalBodyEl.innerHTML = section.content || section.body || '';
    }

    // Emit event including the modal id so listeners know which instance opened
    const event = new CustomEvent('help:open', { detail: { key, section, trigger: triggerEl, modalId } });
    document.dispatchEvent(event);

    const modal = new bootstrap.Modal(modalEl, { keyboard: true });
    modal.show();

    // Focus management: focus first focusable element inside modal body (if any)
    setTimeout(() => {
      const focusable = modalEl.querySelector('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      focusable && focusable.focus();
    }, 50);
  }
};

// Auto-initialize if the page sets a global HELP_SYSTEM_CONFIG and body[data-help-page]
document.addEventListener('DOMContentLoaded', () => {
  try {
    const body = document.body;
    const pageId = body && body.dataset && body.dataset.helpPage;
    if (pageId && window.HELP_SYSTEM_CONFIG) {
      helpSystem.initialize(pageId, window.HELP_SYSTEM_CONFIG);
    }
  } catch (e) {
    // non-fatal
    // eslint-disable-next-line no-console
    console.warn('help-system: auto-init failed', e);
  }
});
