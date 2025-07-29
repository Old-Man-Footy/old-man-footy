import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubAutocompleteManager } from '../../../public/js/club-autocomplete.js';

/**
 * @file club-autocomplete.test.js
 * @description Unit tests for clubAutocompleteManager (client-side autocomplete).
 */

// Helper function to set up the DOM for each test
function setupDOM() {
  document.body.innerHTML = `
    <input id="clubName" type="text" />
    <div id="clubSuggestions" style="display:none"></div>
    <div id="joinClubOption" style="display:none"></div>
    <div id="foundClubDetails"></div>
    <button id="joinFoundClub" data-club-id=""></button>
    <div id="autocompleteHelp"></div>
    <form id="clubCreationForm"></form>
  `;
}

describe('clubAutocompleteManager', () => {
  beforeEach(() => {
    setupDOM();
    clubAutocompleteManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    clubAutocompleteManager.selectedClub = null;
    clubAutocompleteManager.searchTimeout = null;
  });

  it('should cache DOM elements on initialize', () => {
    expect(clubAutocompleteManager.elements.clubNameInput).toBeInstanceOf(HTMLInputElement);
    expect(clubAutocompleteManager.elements.clubSuggestions).toBeInstanceOf(HTMLDivElement);
    expect(clubAutocompleteManager.elements.joinClubOption).toBeInstanceOf(HTMLDivElement);
    expect(clubAutocompleteManager.elements.foundClubDetails).toBeInstanceOf(HTMLDivElement);
    expect(clubAutocompleteManager.elements.joinFoundClub).toBeInstanceOf(HTMLButtonElement);
    expect(clubAutocompleteManager.elements.autocompleteHelp).toBeInstanceOf(HTMLDivElement);
    expect(clubAutocompleteManager.elements.createClubForm).toBeInstanceOf(HTMLFormElement);
  });

  it('should hide suggestions and join option if query is less than 2 characters', async () => {
    const hideSuggestionsSpy = vi.spyOn(clubAutocompleteManager, 'hideSuggestions');
    const hideJoinOptionSpy = vi.spyOn(clubAutocompleteManager, 'hideJoinOption');
    await clubAutocompleteManager.performSearch('a');
    expect(hideSuggestionsSpy).toHaveBeenCalled();
    expect(hideJoinOptionSpy).toHaveBeenCalled();
  });

  it('should display suggestions when clubs are found', async () => {
    const clubs = [
      { id: 1, clubName: 'Alpha FC', subtitle: 'Sydney', matchedAlternate: 'AFC' },
      { id: 2, clubName: 'Beta United', subtitle: 'Melbourne' }
    ];
    clubAutocompleteManager.displaySuggestions(clubs, 'a');
    expect(clubAutocompleteManager.elements.clubSuggestions.style.display).toBe('block');
    expect(clubAutocompleteManager.elements.clubSuggestions.children.length).toBe(2);
    expect(clubAutocompleteManager.elements.autocompleteHelp.innerHTML).toContain('Found 2 clubs');
  });

  it('should highlight matched text in suggestions', () => {
    const result = clubAutocompleteManager.highlightMatch('Alpha FC', 'Al');
    expect(result).toContain('<mark>Al</mark>');
  });

  it('should escape regex characters in query', () => {
    const result = clubAutocompleteManager.escapeRegex('A.F*');
    expect(result).toBe('A\\.F\\*');
  });

  it('should select a club and show join option', () => {
    const club = { id: 1, clubName: 'Alpha FC', subtitle: 'Sydney', matchedAlternate: 'AFC' };
    clubAutocompleteManager.selectClub(club);
    expect(clubAutocompleteManager.selectedClub).toEqual(club);
    expect(clubAutocompleteManager.elements.clubNameInput.value).toBe('Alpha FC');
    expect(clubAutocompleteManager.elements.joinClubOption.style.display).toBe('block');
    expect(clubAutocompleteManager.elements.joinFoundClub.dataset.clubId).toBe('1');
  });

  it('should hide join option and clear selectedClub', () => {
    clubAutocompleteManager.selectedClub = { id: 1 };
    clubAutocompleteManager.hideJoinOption();
    expect(clubAutocompleteManager.elements.joinClubOption.style.display).toBe('none');
    expect(clubAutocompleteManager.selectedClub).toBeNull();
  });

  it('should show and hide suggestions dropdown', () => {
    clubAutocompleteManager.showSuggestions();
    expect(clubAutocompleteManager.elements.clubSuggestions.style.display).toBe('block');
    clubAutocompleteManager.hideSuggestions();
    expect(clubAutocompleteManager.elements.clubSuggestions.style.display).toBe('none');
  });

  it('should handle form reset and clear autocomplete state', () => {
    clubAutocompleteManager.elements.autocompleteHelp.innerHTML = 'Old help';
    clubAutocompleteManager.handleFormReset();
    expect(clubAutocompleteManager.elements.clubSuggestions.style.display).toBe('none');
    expect(clubAutocompleteManager.elements.joinClubOption.style.display).toBe('none');
    expect(clubAutocompleteManager.elements.autocompleteHelp.innerHTML).toContain('Start typing');
  });

  it('should handle join click and submit form', () => {
    const club = { id: 1, clubName: 'Alpha FC', subtitle: 'Sydney' };
    clubAutocompleteManager.selectClub(club);
    clubAutocompleteManager.elements.joinFoundClub.dataset.clubId = '1';
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    clubAutocompleteManager.handleJoinClick();
    expect(clubAutocompleteManager.elements.joinFoundClub.innerHTML).toContain('Joining');
    expect(clubAutocompleteManager.elements.joinFoundClub.disabled).toBe(true);
    expect(submitSpy).toHaveBeenCalled();
    submitSpy.mockRestore();
  });

  it('should clear validation errors when input is focused', () => {
    const alert = document.createElement('div');
    alert.className = 'alert-danger';
    alert.textContent = 'validation error';
    document.body.appendChild(alert);
    clubAutocompleteManager.clearValidationErrors();
    expect(alert.style.display).toBe('none');
    document.body.removeChild(alert);
  });

  it('should debounce input and call performSearch', async () => {
    const performSearchSpy = vi.spyOn(clubAutocompleteManager, 'performSearch').mockImplementation(() => {});
    const input = clubAutocompleteManager.elements.clubNameInput;
    input.value = 'Alpha';
    const event = new Event('input');
    input.dispatchEvent(event);
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(performSearchSpy).toHaveBeenCalledWith('Alpha');
    performSearchSpy.mockRestore();
  });

  it('should hide suggestions when clicking outside', () => {
    clubAutocompleteManager.showSuggestions();
    const hideSuggestionsSpy = vi.spyOn(clubAutocompleteManager, 'hideSuggestions');
    const event = new MouseEvent('click', { bubbles: true });
    document.body.dispatchEvent(event);
    expect(hideSuggestionsSpy).toHaveBeenCalled();
    hideSuggestionsSpy.mockRestore();
  });
});