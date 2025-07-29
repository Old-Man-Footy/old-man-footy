import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubClaimOwnershipManager } from '../../../public/js/club-claim-ownership.js';

/**
 * @file club-claim-ownership.test.js
 * @description Unit tests for clubClaimOwnershipManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
  document.body.innerHTML = `
    <form id="claimForm">
      <input type="checkbox" id="checkbox1" required>
      <input type="checkbox" id="checkbox2" required>
      <button id="claimButton" class="btn-secondary" disabled>Claim Ownership</button>
    </form>
  `;
}

describe('clubClaimOwnershipManager', () => {
  beforeEach(() => {
    setupDOM();
    clubClaimOwnershipManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should cache required elements on initialize', () => {
    expect(clubClaimOwnershipManager.elements.checkboxes.length).toBe(2);
    expect(clubClaimOwnershipManager.elements.claimButton).toBeInstanceOf(HTMLElement);
  });

  it('should disable claim button if not all checkboxes are checked', () => {
    const claimButton = clubClaimOwnershipManager.elements.claimButton;
    claimButton.classList.remove('btn-primary');
    claimButton.classList.add('btn-secondary');
    claimButton.disabled = false;

    clubClaimOwnershipManager.updateButtonState();

    expect(claimButton.disabled).toBe(true);
    expect(claimButton.classList.contains('btn-secondary')).toBe(true);
    expect(claimButton.classList.contains('btn-primary')).toBe(false);
  });

  it('should enable claim button and set correct class when all checkboxes are checked', () => {
    clubClaimOwnershipManager.elements.checkboxes.forEach(cb => cb.checked = true);

    clubClaimOwnershipManager.updateButtonState();

    const claimButton = clubClaimOwnershipManager.elements.claimButton;
    expect(claimButton.disabled).toBe(false);
    expect(claimButton.classList.contains('btn-primary')).toBe(true);
    expect(claimButton.classList.contains('btn-secondary')).toBe(false);
  });

  it('should update button state when a checkbox is changed', () => {
    const spy = vi.spyOn(clubClaimOwnershipManager, 'updateButtonState');
    const checkbox = clubClaimOwnershipManager.elements.checkboxes[0];

    checkbox.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalled();
  });

  it('should bind change event listeners to all required checkboxes', () => {
    const checkbox1 = clubClaimOwnershipManager.elements.checkboxes[0];
    const claimButton = clubClaimOwnershipManager.elements.claimButton;

    // Initially unchecked
    checkbox1.checked = false;
    clubClaimOwnershipManager.updateButtonState();
    expect(claimButton.disabled).toBe(true);

    // Check the box and trigger change
    checkbox1.checked = true;
    checkbox1.dispatchEvent(new Event('change'));
    // Still disabled because not all are checked
    expect(claimButton.disabled).toBe(true);

    // Check the second box and trigger change
    clubClaimOwnershipManager.elements.checkboxes[1].checked = true;
    clubClaimOwnershipManager.elements.checkboxes[1].dispatchEvent(new Event('change'));
    expect(claimButton.disabled).toBe(false);
  });
});