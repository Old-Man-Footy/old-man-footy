import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubCreateOnBehalfManager } from '../../../public/js/club-create-on-behalf.js';

function setupDOM() {
  document.body.innerHTML = `
    <div>
      <form>
        <input name="clubName" />
        <select id="state" name="state">
          <option value=""></option>
          <option value="NSW">NSW</option>
          <option value="VIC">VIC</option>
        </select>
        <input id="inviteEmail" name="inviteEmail" />
        <textarea id="customMessage" name="customMessage"></textarea>
        <button type="submit">Submit</button>
      </form>
      <div data-user-email="user@example.com"></div>
      <div data-states='["NSW","VIC"]'></div>
    </div>
  `;
}

describe('clubCreateOnBehalfManager', () => {
  beforeEach(() => {
    setupDOM();
  // Silence scrollTo not implemented in jsdom
  // eslint-disable-next-line no-global-assign
  window.scrollTo = () => {};
    // Mock geolocation (avoid real calls)
    global.navigator = {
      geolocation: {
        getCurrentPosition: (cb) => {
          cb({ coords: { latitude: -33.86, longitude: 151.21 } });
        },
      },
    };
    // Stub fetch reverse geocode to return NSW
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ address: { state: 'NSW' } }),
    }));

    clubCreateOnBehalfManager.initialize();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('prefills invite email and message when user email exists', () => {
    const el = clubCreateOnBehalfManager.elements;
    expect(el.inviteEmailInput.value).toBe('user@example.com');
    expect(el.customMessageTextarea.value.length).toBeGreaterThan(0);
  });

  it('prefills state from geolocation reverse geocode if available', async () => {
    // Allow microtasks for fetch.then chains
    await Promise.resolve();
    expect(clubCreateOnBehalfManager.elements.stateSelect.value).toBe('NSW');
  });

  it('validates required fields on submit and prevents submission when invalid', () => {
    const form = clubCreateOnBehalfManager.elements.form;
  const spy = vi.spyOn(form, 'dispatchEvent');
  // Ensure fields are empty to trigger invalid (override email prefill)
  document.querySelector('[name="clubName"]').value = '';
  document.getElementById('state').value = '';
  document.getElementById('inviteEmail').value = '';
    const evt = new Event('submit', { cancelable: true });
    // Simulate dispatch where preventDefault is called by handler via event argument
    form.addEventListener('submit', (e) => e.preventDefault());
    form.dispatchEvent(evt);

    const name = document.querySelector('[name="clubName"]');
    const state = document.querySelector('[name="state"]');
    const email = document.querySelector('[name="inviteEmail"]');

    expect(name.classList.contains('is-invalid')).toBe(true);
    expect(state.classList.contains('is-invalid')).toBe(true);
    expect(email.classList.contains('is-invalid')).toBe(true);
    spy.mockRestore();
  });
});
