import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { initializeAdminClaimCarnival } from '/public/js/admin-claim-carnival.js';

// Mock DOM API
function setupDOM() {
  document.body.innerHTML = `
    <form id="claim-carnival-form" data-carnival-state="VIC">
      <select id="targetClubId">
        <option value="">Select a club</option>
        <option value="1" data-delegate-name="Alice" data-delegate-email="alice@club.com" data-club-state="VIC">Club A</option>
        <option value="2" data-delegate-name="Bob" data-delegate-email="bob@club.com" data-club-state="NSW">Club B</option>
      </select>
      <div id="selectedClubInfo" class="d-none"></div>
      <span id="delegateName"></span>
      <span id="delegateEmail"></span>
      <span id="clubState"></span>
      <div id="stateWarning" class="d-none"></div>
      <button id="claimButton" disabled>Claim</button>
    </form>
  `;

  // Ensure all elements have a working classList API
  [
    'selectedClubInfo',
    'stateWarning'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.classList) {
      el.classList = {
        classes: new Set(el.className.split(' ')),
        contains(cls) { return this.classes.has(cls); },
        add(cls) { this.classes.add(cls); el.className = Array.from(this.classes).join(' '); },
        remove(cls) { this.classes.delete(cls); el.className = Array.from(this.classes).join(' '); }
      };
    }
  });
}

describe('admin-claim-carnival.js', () => {
  beforeEach(() => {
    setupDOM();
    initializeAdminClaimCarnival();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.resetModules();
  });

  it('should initialize and attach change event to club select', () => {
    const clubSelect = document.getElementById('targetClubId');
    // Simulate change event
    const event = new Event('change');
    clubSelect.selectedIndex = 1; // Select Club A
    clubSelect.dispatchEvent(event);

    expect(document.getElementById('selectedClubInfo').classList.contains('d-none')).toBe(false);
    expect(document.getElementById('delegateName').textContent).toBe('Alice');
    expect(document.getElementById('delegateEmail').textContent).toBe('alice@club.com');
    expect(document.getElementById('clubState').textContent).toBe('VIC');
    expect(document.getElementById('claimButton').disabled).toBe(false);
    expect(document.getElementById('stateWarning').classList.contains('d-none')).toBe(true);
  });

  it('should show state warning if club state does not match carnival state', () => {
    const clubSelect = document.getElementById('targetClubId');
    clubSelect.selectedIndex = 2; // Select Club B (NSW)
    clubSelect.dispatchEvent(new Event('change'));

    expect(document.getElementById('stateWarning').classList.contains('d-none')).toBe(false);
    expect(document.getElementById('claimButton').disabled).toBe(false);
  });

  it('should hide info and disable button when no club is selected', () => {
    const clubSelect = document.getElementById('targetClubId');
    clubSelect.selectedIndex = 0; // No club selected
    clubSelect.dispatchEvent(new Event('change'));

    expect(document.getElementById('selectedClubInfo').classList.contains('d-none')).toBe(true);
    expect(document.getElementById('claimButton').disabled).toBe(true);
    expect(document.getElementById('stateWarning').classList.contains('d-none')).toBe(true);
  });

  it('should not initialize if claim form is missing', () => {
    document.body.innerHTML = '';
    expect(() => {
      initializeAdminClaimCarnival();
    }).not.toThrow();
  });
});