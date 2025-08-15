import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { clubClaimOwnershipManager } from '../../../public/js/club-claim-ownership.js';

function setupDOM() {
  document.body.innerHTML = `
    <div>
      <input type="checkbox" id="c1" required />
      <input type="checkbox" id="c2" required />
      <button id="claimButton" class="btn btn-secondary" disabled>Claim</button>
    </div>
  `;
}

describe('clubClaimOwnershipManager', () => {
  beforeEach(() => {
    setupDOM();
    clubClaimOwnershipManager.initialize();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('disables claim button until all required checkboxes are checked', () => {
    const el = clubClaimOwnershipManager.elements;
    expect(el.claimButton.disabled).toBe(true);

    // Check one
    const c1 = document.getElementById('c1');
    c1.checked = true;
    c1.dispatchEvent(new Event('change'));
    expect(el.claimButton.disabled).toBe(true);

    // Check the other
    const c2 = document.getElementById('c2');
    c2.checked = true;
    c2.dispatchEvent(new Event('change'));
    expect(el.claimButton.disabled).toBe(false);
    expect(el.claimButton.classList.contains('btn-primary')).toBe(true);
  });

  it('reverts button styling when a checkbox is unchecked', () => {
    const el = clubClaimOwnershipManager.elements;

    // Make both checked first
    document.getElementById('c1').checked = true;
    document.getElementById('c2').checked = true;
    el.checkboxes[0].dispatchEvent(new Event('change'));
    expect(el.claimButton.disabled).toBe(false);

    // Uncheck one
    document.getElementById('c2').checked = false;
    el.checkboxes[1].dispatchEvent(new Event('change'));
    expect(el.claimButton.disabled).toBe(true);
    expect(el.claimButton.classList.contains('btn-secondary')).toBe(true);
  });
});
