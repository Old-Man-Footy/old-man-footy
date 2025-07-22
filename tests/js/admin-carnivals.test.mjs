import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DOM elements and bootstrap
let domElements = {};
global.document = {
  getElementById: vi.fn((id) => domElements[id] || null),
  querySelectorAll: vi.fn(() => []),
  querySelector: vi.fn(() => null),
  createElement: vi.fn((tag) => ({
    tag,
    style: {},
    appendChild: vi.fn(),
    insertAdjacentHTML: vi.fn(),
  })),
  body: { appendChild: vi.fn() }
};
global.window = { location: { reload: vi.fn() }, open: vi.fn() };
global.bootstrap = {
  Modal: vi.fn(() => ({ show: vi.fn(), hide: vi.fn() })),
  Toast: vi.fn(() => ({ show: vi.fn() })
  )
};

vi.stubGlobal('console', { log: vi.fn(), error: vi.fn() });

// Add missing DOM event listener mocks for jsdom compatibility
if (!global.document.addEventListener) {
  global.document.addEventListener = vi.fn();
}
if (!global.document.removeEventListener) {
  global.document.removeEventListener = vi.fn();
}

describe('admin-carnivals.js', () => {
  beforeEach(() => {
    domElements = {};
    vi.clearAllMocks();
  });

  describe('showStatusToggleModal', () => {
    it('should set current carnival variables and update modal for active carnival', async () => {
      domElements.toggleCarnivalTitle = { textContent: '' };
      domElements.statusToggleMessage = { textContent: '' };
      domElements.statusWarningText = { textContent: '' };
      domElements.toggleActionText = { textContent: '' };
      domElements.confirmStatusToggle = { className: '', innerHTML: '' };
      domElements.statusToggleModal = {};

      // Import the function from the source file
      const { showStatusToggleModal } = await import('../../public/js/admin-carnivals.js');
      showStatusToggleModal('123', 'Test Carnival', true);

      expect(domElements.toggleCarnivalTitle.textContent).toBe('Test Carnival');
      expect(domElements.statusToggleMessage.textContent).toContain('deactivate');
      expect(domElements.statusWarningText.textContent).toContain('Deactivated');
      expect(domElements.toggleActionText.textContent).toBe('Deactivate');
      expect(domElements.confirmStatusToggle.className).toBe('btn btn-danger');
      expect(domElements.confirmStatusToggle.innerHTML).toContain('Deactivate');
      expect(global.bootstrap.Modal).toHaveBeenCalled();
    });

    it('should update modal for inactive carnival', async () => {
      domElements.toggleCarnivalTitle = { textContent: '' };
      domElements.statusToggleMessage = { textContent: '' };
      domElements.statusWarningText = { textContent: '' };
      domElements.toggleActionText = { textContent: '' };
      domElements.confirmStatusToggle = { className: '', innerHTML: '' };
      domElements.statusToggleModal = {};

      const { showStatusToggleModal } = await import('../../public/js/admin-carnivals.js');
      showStatusToggleModal('456', 'Inactive Carnival', false);

      expect(domElements.toggleCarnivalTitle.textContent).toBe('Inactive Carnival');
      expect(domElements.statusToggleMessage.textContent).toContain('reactivate');
      expect(domElements.statusWarningText.textContent).toContain('Reactivated');
      expect(domElements.toggleActionText.textContent).toBe('Reactivate');
      expect(domElements.confirmStatusToggle.className).toBe('btn btn-success');
      expect(domElements.confirmStatusToggle.innerHTML).toContain('Reactivate');
      expect(global.bootstrap.Modal).toHaveBeenCalled();
    });
  });

  describe('showToast', () => {
    it('should create a toast element and show it', async () => {
      domElements['toast-container'] = null;
      const appendChild = vi.fn();
      global.document.body.appendChild = appendChild;

      const { showToast } = await import('../../public/js/admin-carnivals.js');
      domElements['toast-container'] = null;
      domElements['toast-' + Date.now()] = {
        addEventListener: vi.fn()
      };

      showToast('success', 'Test message');
      expect(appendChild).toHaveBeenCalled();
      expect(global.bootstrap.Toast).toHaveBeenCalled();
    });
  });

  // Additional tests for confirmStatusToggle, initializeAdminPageStyling, etc. can be added similarly.
});