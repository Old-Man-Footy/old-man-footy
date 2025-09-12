import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registrationFormManager } from '../../../public/js/registration-form.js';

function setupDOM() {
  document.body.innerHTML = `
    <form id="regForm" class="needs-validation" novalidate>
      <div>
        <label for="clubName">Club Name</label>
        <input id="clubName" />
        <datalist id="clubList">
          <option value="Tigers" data-state="NSW" data-location="Sydney" data-active="true"></option>
          <option value="Falcons" data-state="QLD" data-location="Brisbane" data-active="false"></option>
        </datalist>
      </div>
      <div>
        <label for="clubState">State <span id="stateRequired" style="display:none">*</span></label>
        <select id="clubState"></select>
        <div id="stateHelpText"></div>
      </div>
      <div>
        <label for="location">Location <span id="locationRequired" style="display:none">*</span></label>
        <input id="location" />
        <div id="locationHelpText"></div>
      </div>
      <div id="deactivatedClubWarning" style="display:none">
        <p></p>
        <div class="form-check">
          <input type="checkbox" id="confirmReactivation" />
          <label for="confirmReactivation">Confirm Reactivation</label>
        </div>
      </div>
      <button type="submit">Submit</button>
    </form>
  `;
}

describe('registration-form.js', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDOM();
    registrationFormManager.initialize();
  });

  it('initializes for new club when name empty', () => {
    const stateHelp = document.getElementById('stateHelpText');
    const locHelp = document.getElementById('locationHelpText');
    const stateReq = document.getElementById('stateRequired');
    const locReq = document.getElementById('locationRequired');
    const warn = document.getElementById('deactivatedClubWarning');

    // On init with empty club name -> new club state
    expect(stateHelp.textContent).toContain('Required for new clubs');
    expect(locHelp.textContent).toContain('Required for new clubs');
    expect(stateReq.style.display).toBe('inline');
    expect(locReq.style.display).toBe('inline');
    expect(warn.style.display).toBe('none');
  });

  it('auto-fills for existing active club and hides warning', () => {
    const name = document.getElementById('clubName');
    const stateSel = document.getElementById('clubState');
    const loc = document.getElementById('location');
    const warn = document.getElementById('deactivatedClubWarning');

    name.value = 'Tigers';
    name.dispatchEvent(new Carnival('input'));

    expect(stateSel.value).toBe('NSW');
    expect(loc.value).toBe('Sydney');
    expect(warn.style.display).toBe('none');
  });

  it('shows warning and requires reactivation for deactivated club', () => {
    const name = document.getElementById('clubName');
    const stateHelp = document.getElementById('stateHelpText');
    const locHelp = document.getElementById('locationHelpText');
    const warn = document.getElementById('deactivatedClubWarning');
    const cb = document.getElementById('confirmReactivation');

    name.value = 'Falcons';
    name.dispatchEvent(new Carnival('input'));

    expect(warn.style.display).toBe('block');
    expect(stateHelp.textContent).toContain('Pre-filled from deactivated club');
    expect(locHelp.textContent).toContain('Pre-filled from deactivated club');
    expect(cb.checked).toBe(false);

    // When user confirms reactivation, help text updates
    cb.checked = true;
    cb.dispatchEvent(new Carnival('change'));
    expect(stateHelp.textContent).toContain('Will be updated when club is reactivated');
    expect(locHelp.textContent).toContain('Will be updated when club is reactivated');
  });

  it('blocks submit for deactivated club without confirmation, then allows when confirmed', () => {
    const form = document.querySelector('form');
    const name = document.getElementById('clubName');
    const stateSel = document.getElementById('clubState');
    const loc = document.getElementById('location');
    const cb = document.getElementById('confirmReactivation');

    // Choose deactivated club and ensure fields have values
    name.value = 'Falcons';
    name.dispatchEvent(new Carnival('input'));
    stateSel.value = 'QLD';
    loc.value = 'Brisbane';

    const prevent = vi.fn();
    const stop = vi.fn();
    // Directly call the handler to capture preventDefault
    registrationFormManager.handleSubmit({ preventDefault: prevent, stopPropagation: stop });
    expect(prevent).toHaveBeenCalledTimes(1);
    expect(document.getElementById('reactivationError')).toBeTruthy();

    // Now confirm reactivation and submit again -> should not prevent
    document.getElementById('reactivationError').remove();
    cb.checked = true;
    registrationFormManager.handleSubmit({ preventDefault: prevent, stopPropagation: stop });
    // Called once previously; no new preventDefault call
    expect(prevent).toHaveBeenCalledTimes(1);
  });
});
