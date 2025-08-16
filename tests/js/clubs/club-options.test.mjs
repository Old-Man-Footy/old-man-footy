import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clubOptionsManager } from '../../../public/js/club-options.js';

function setupDOM() {
  document.body.innerHTML = `
    <div class="filters">
      <input id="clubSearch" />
      <select id="stateFilter">
        <option value="">All</option>
        <option value="NSW">NSW</option>
      </select>
    </div>
    <div class="clubs">
      <div class="club-item" data-club-name="Tigers" data-location="Sydney" data-state="NSW">
        <a href="/clubs/1">Tigers</a>
        <div class="text-muted">Sydney, NSW</div>
        <button class="contact-delegate-btn" data-club-name="Tigers" data-delegate-name="Alex"></button>
      </div>
      <div class="club-item" data-club-name="Lions" data-location="Melbourne" data-state="VIC">
        <a href="/clubs/2">Lions</a>
        <div class="text-muted">Melbourne, VIC</div>
        <button class="contact-delegate-btn" data-club-name="Lions" data-delegate-name="Sam"></button>
      </div>
    </div>

    <div id="contactDelegateModal"></div>
    <div id="modalClubName"></div>
    <div id="modalDelegateName"></div>
    <a id="modalClubProfileLink"></a>

    <form id="clubCreationForm">
      <div>
        <input id="clubName" />
      </div>
      <div>
        <select id="state">
          <option value="">Select</option>
          <option value="NSW">NSW</option>
        </select>
      </div>
      <div>
        <input id="location" />
      </div>
      <button type="submit">Create</button>
    </form>

    <div>
      <div id="clubSuggestions" style="display:none"></div>
      <div id="joinClubOption" style="display:none">
        <div id="foundClubDetails"></div>
        <button id="joinFoundClub" type="button">Join</button>
      </div>
    </div>
  `;
}

describe('clubOptionsManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    setupDOM();
    // stub bootstrap.Modal to avoid jsdom errors
    global.window.bootstrap = {
      Modal: vi.fn().mockImplementation(() => ({ show: vi.fn(), hide: vi.fn() }))
    };
    clubOptionsManager.initialize();
  });

  it('filters clubs by search and state', () => {
    const search = document.getElementById('clubSearch');
    const stateFilter = document.getElementById('stateFilter');

    // search Tigers
    search.value = 'tig';
    search.dispatchEvent(new Event('input'));
    // NSW state
    stateFilter.value = 'NSW';
    stateFilter.dispatchEvent(new Event('change'));

    const items = document.querySelectorAll('.club-item');
    expect(items[0].style.display).toBe('block');
    expect(items[1].style.display).toBe('none');
  });

  it('shows suggestions after typing 3+ chars and allows selecting a club', () => {
    const input = document.getElementById('clubName');
    const suggestions = document.getElementById('clubSuggestions');

    input.value = 'tig';
    input.dispatchEvent(new Event('input'));

    vi.advanceTimersByTime(350);

    // one suggestion rendered
    expect(suggestions.style.display).toBe('block');
    const items = suggestions.querySelectorAll('.list-group-item');
    expect(items.length).toBeGreaterThan(0);

    // click first suggestion
    items[0].dispatchEvent(new Event('click'));

    // join section shown
    const joinSection = document.getElementById('joinClubOption');
    expect(joinSection.style.display).toBe('block');

    // clicking join builds and submits a form (guarded in jsdom)
    const joinBtn = document.getElementById('joinFoundClub');
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    joinBtn.click();
    expect(submitSpy).toHaveBeenCalled();
  });

  it('validates form and shows errors when required fields are invalid', () => {
    const form = document.getElementById('clubCreationForm');
    const clubName = document.getElementById('clubName');
    const state = document.getElementById('state');
    const location = document.getElementById('location');
    const submitBtn = form.querySelector('button[type="submit"]');

    clubName.value = '';
    state.value = '';
    location.value = '';

  const submitSpy = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
  // call handler directly to avoid jsdom submit quirks
  clubOptionsManager.handleClubCreationSubmit({ preventDefault: () => {}, stopPropagation: () => {} });

    // no submission
    expect(submitSpy).not.toHaveBeenCalled();

    // mark invalid
    expect(clubName.classList.contains('is-invalid')).toBe(true);
    expect(state.classList.contains('is-invalid')).toBe(true);
    expect(location.classList.contains('is-invalid')).toBe(true);
  });

  it('submits form when valid and re-applies required attributes', () => {
    const form = document.getElementById('clubCreationForm');
    const clubName = document.getElementById('clubName');
    const state = document.getElementById('state');
    const location = document.getElementById('location');

    clubName.value = 'Tigers';
    state.value = 'NSW';
    location.value = 'Sydney';

    // mark these as originally required to verify re-adding
    clubName.setAttribute('data-required', 'true');
    state.setAttribute('data-required', 'true');
    location.setAttribute('data-required', 'true');

    const submitSpy = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    form.dispatchEvent(new Event('submit'));

    expect(submitSpy).toHaveBeenCalled();
    expect(clubName.hasAttribute('required')).toBe(true);
    expect(state.hasAttribute('required')).toBe(true);
    expect(location.hasAttribute('required')).toBe(true);
  });
});
