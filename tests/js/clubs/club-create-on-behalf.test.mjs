import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubCreateOnBehalfManager } from '../../../public/js/club-create-on-behalf.js';

/**
 * @file club-create-on-behalf.test.js
 * @description Unit tests for clubCreateOnBehalfManager.
 */

// Helper to set up DOM for each test
function setupDOM({ userEmail = '', states = ['Queensland', 'New South Wales'] } = {}) {
  document.body.innerHTML = `
    <form>
      <input name="clubName" id="clubName" value="">
      <select id="state" name="state">
        <option value="">Select State</option>
        ${states.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <input name="inviteEmail" id="inviteEmail" value="">
      <textarea id="customMessage"></textarea>
    </form>
    <div data-user-email="${userEmail}"></div>
    <div data-states='${JSON.stringify(states)}'></div>
  `;
}

describe('clubCreateOnBehalfManager', () => {
  beforeEach(() => {
    setupDOM();
    vi.restoreAllMocks();
    clubCreateOnBehalfManager.initialize();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should cache DOM elements on initialize', () => {
    expect(clubCreateOnBehalfManager.elements.form).toBeInstanceOf(HTMLFormElement);
    expect(clubCreateOnBehalfManager.elements.stateSelect).toBeInstanceOf(HTMLSelectElement);
    expect(clubCreateOnBehalfManager.elements.inviteEmailInput).toBeInstanceOf(HTMLInputElement);
    expect(clubCreateOnBehalfManager.elements.customMessageTextarea).toBeInstanceOf(HTMLTextAreaElement);
    expect(clubCreateOnBehalfManager.elements.userEmailElement).toBeInstanceOf(HTMLDivElement);
    expect(clubCreateOnBehalfManager.elements.statesElement).toBeInstanceOf(HTMLDivElement);
  });

  it('should cache userEmail and availableStates from data attributes', () => {
    expect(clubCreateOnBehalfManager.userEmail).toBe('');
    expect(clubCreateOnBehalfManager.availableStates).toEqual(['Queensland', 'New South Wales']);
  });

  it('should prefill inviteEmail and customMessage if userEmail is present', () => {
    setupDOM({ userEmail: 'test@example.com' });
    clubCreateOnBehalfManager.initialize();
    expect(clubCreateOnBehalfManager.elements.inviteEmailInput.value).toBe('test@example.com');
    expect(clubCreateOnBehalfManager.elements.customMessageTextarea.value).toContain('Hi, I\'ve created a profile for your club');
  });

  it('should not overwrite inviteEmail or customMessage if already filled', () => {
    setupDOM({ userEmail: 'test@example.com' });
    document.getElementById('inviteEmail').value = 'already@filled.com';
    document.getElementById('customMessage').value = 'Custom message';
    clubCreateOnBehalfManager.initialize();
    expect(clubCreateOnBehalfManager.elements.inviteEmailInput.value).toBe('already@filled.com');
    expect(clubCreateOnBehalfManager.elements.customMessageTextarea.value).toBe('Custom message');
  });

  it('should add is-invalid class to empty required fields on submit', () => {
    const form = clubCreateOnBehalfManager.elements.form;
    const clubName = document.getElementById('clubName');
    const state = document.getElementById('state');
    const inviteEmail = document.getElementById('inviteEmail');
    clubName.value = '';
    state.value = '';
    inviteEmail.value = '';
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(clubName.classList.contains('is-invalid')).toBe(true);
    expect(state.classList.contains('is-invalid')).toBe(true);
    expect(inviteEmail.classList.contains('is-invalid')).toBe(true);
  });

  it('should remove is-invalid class from filled required fields on submit', () => {
    const form = clubCreateOnBehalfManager.elements.form;
    const clubName = document.getElementById('clubName');
    const state = document.getElementById('state');
    const inviteEmail = document.getElementById('inviteEmail');
    clubName.value = 'Club Name';
    state.value = 'Queensland';
    inviteEmail.value = 'test@example.com';
    clubName.classList.add('is-invalid');
    state.classList.add('is-invalid');
    inviteEmail.classList.add('is-invalid');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(clubName.classList.contains('is-invalid')).toBe(false);
    expect(state.classList.contains('is-invalid')).toBe(false);
    expect(inviteEmail.classList.contains('is-invalid')).toBe(false);
  });

  it('should prevent form submission and scroll to top if validation fails', () => {
    const form = clubCreateOnBehalfManager.elements.form;
    const clubName = document.getElementById('clubName');
    clubName.value = '';
    const preventDefault = vi.fn();
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    form.addEventListener('submit', (event) => {
      preventDefault();
    });
    const event = new Event('submit', { bubbles: true, cancelable: true });
    event.preventDefault = preventDefault;
    form.dispatchEvent(event);
    expect(preventDefault).toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('should attempt to prefill state from geolocation if available', async () => {
    setupDOM();
    // Mock navigator.geolocation
    const mockGetCurrentPosition = vi.fn((cb) => {
      cb({
        coords: { latitude: -27.4698, longitude: 153.0251 }
      });
    });
    global.navigator.geolocation = { getCurrentPosition: mockGetCurrentPosition };
    // Mock fetch
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ address: { state: 'Queensland' } })
      })
    ));
    clubCreateOnBehalfManager.initialize();
    // Wait for fetch to resolve
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(clubCreateOnBehalfManager.elements.stateSelect.value).toBe('Queensland');
    vi.unstubAllGlobals();
  });
});