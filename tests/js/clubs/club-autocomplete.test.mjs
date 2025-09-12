import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubAutocompleteManager } from '../../../public/js/club-autocomplete.js';

/**
 * @file club-autocomplete.test.mjs
 * @description Unit tests for clubAutocompleteManager.
 */

function setupDOM() {
  document.body.innerHTML = `
    <form id="clubCreationForm">
      <div class="mb-3">
        <input id="clubName" type="text" />
        <div id="autocompleteHelp"></div>
        <div id="clubSuggestions" class="list-group" style="display:none;"></div>
      </div>
      <div id="joinClubOption" style="display:none;">
        <div id="foundClubDetails"></div>
        <button id="joinFoundClub" type="button">Join</button>
      </div>
    </form>
  `;
}

describe('clubAutocompleteManager', () => {
  beforeEach(() => {
    setupDOM();
    vi.useFakeTimers();
    clubAutocompleteManager.initialize();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    clubAutocompleteManager.state.searchTimeout = null;
    clubAutocompleteManager.state.selectedClub = null;
  });

  it('should cache elements and bind when input exists', () => {
    const el = clubAutocompleteManager.elements;
    expect(el.clubNameInput).toBeInstanceOf(HTMLInputElement);
    expect(el.clubSuggestions).toBeInstanceOf(HTMLElement);
    expect(el.joinClubOption).toBeInstanceOf(HTMLElement);
  });

  it('should hide suggestions and join option for short queries', async () => {
    const input = clubAutocompleteManager.elements.clubNameInput;
    input.value = 'a';
    input.dispatchEvent(new Carnival('input'));
    vi.runAllTimers();
    expect(clubAutocompleteManager.elements.clubSuggestions.style.display).toBe('none');
    expect(clubAutocompleteManager.elements.joinClubOption.style.display).toBe('none');
  });

  it('should display suggestions and allow selecting a club', async () => {
    // Directly call displaySuggestions to avoid fetch
    const clubs = [
      { id: 1, clubName: 'Alpha FC', subtitle: 'Sydney, NSW', matchedAlternate: 'AFC' },
    ];
    clubAutocompleteManager.displaySuggestions(clubs, 'Al');
  const list = clubAutocompleteManager.elements.clubSuggestions;
  expect(list.style.display).toBe('block');
  // Use textContent to avoid brittleness due to <mark> highlights in innerHTML
  expect(list.textContent).toContain('Alpha FC');

    // Click the first suggestion
    const firstItem = list.querySelector('.list-group-item');
    firstItem.dispatchEvent(new Carnival('click'));
    expect(clubAutocompleteManager.state.selectedClub?.id).toBe(1);
    expect(clubAutocompleteManager.elements.joinClubOption.style.display).toBe('block');
    expect(clubAutocompleteManager.elements.joinFoundClub.dataset.clubId).toBe('1');
  });

  it('should debounce input and call performSearch once with latest value', async () => {
    const input = clubAutocompleteManager.elements.clubNameInput;
    const spy = vi.spyOn(clubAutocompleteManager, 'performSearch').mockResolvedValue();
    input.value = 'Cl';
    input.dispatchEvent(new Carnival('input'));
    input.value = 'Club';
    input.dispatchEvent(new Carnival('input'));
    vi.advanceTimersByTime(300);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Club');
    spy.mockRestore();
  });

  it('should submit join form and show loading state on join click', () => {
    // Prepare state and UI
    clubAutocompleteManager.state.selectedClub = { id: 7, clubName: 'Beta FC', subtitle: '' };
    clubAutocompleteManager.elements.joinFoundClub.dataset.clubId = '7';
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});

    clubAutocompleteManager.handleJoinClick();
    expect(clubAutocompleteManager.elements.joinFoundClub.disabled).toBe(true);
    expect(clubAutocompleteManager.elements.joinFoundClub.innerHTML).toContain('Joining...');
    expect(submitSpy).toHaveBeenCalled();
    submitSpy.mockRestore();
  });
});
