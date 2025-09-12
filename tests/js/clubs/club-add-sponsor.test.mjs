import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubAddSponsorManager } from '../../../public/js/club-add-sponsor.js';

/**
 * @file club-add-sponsor.test.js
 * @description Unit tests for clubAddSponsorManager (client-side sponsor add form logic).
 */

// Helper to set up DOM for each test
function setupDOM() {
  document.body.innerHTML = `
    <form id="sponsorForm">
      <div class="mb-3">
        <input id="sponsorName" type="text" />
      </div>
      <div id="duplicateAlert" style="display:none;" class="alert"></div>
      <div id="existingSponsorInfo"></div>
      <button id="linkExistingBtn" type="button"></button>
      <button id="createNewBtn" type="button"></button>
      <input id="sponsorTypeInput" type="hidden" value="new" />
      <input id="existingSponsorIdInput" type="hidden" />
      <span id="submitText">Add Sponsor</span>
      <button id="submitBtn" type="submit" class="btn btn-primary">
        <i class="bi bi-save me-1"></i><span id="submitText">Add Sponsor</span>
      </button>
    </form>
  `;
}

describe('clubAddSponsorManager', () => {
  beforeEach(() => {
    setupDOM();
    clubAddSponsorManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    clubAddSponsorManager.state.duplicateCheckTimeout = null;
    clubAddSponsorManager.state.existingSponsorData = null;
  });

  it('should cache all required DOM elements on initialize', () => {
    expect(clubAddSponsorManager.elements.sponsorNameInput).toBeInstanceOf(HTMLInputElement);
    expect(clubAddSponsorManager.elements.duplicateAlert).toBeInstanceOf(HTMLElement);
    expect(clubAddSponsorManager.elements.sponsorForm).toBeInstanceOf(HTMLFormElement);
  });

  it('should show duplicate alert when checkForDuplicates finds a duplicate', async () => {
    const mockSponsor = {
      id: 42,
      sponsorName: 'Test Sponsor',
      logoUrl: '',
      businessType: 'Retail',
      location: 'Melbourne',
      state: 'VIC',
      description: 'A test sponsor'
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ isDuplicate: true, existingSponsor: mockSponsor })
    }));
    const showSpy = vi.spyOn(clubAddSponsorManager, 'showDuplicateAlert');
    await clubAddSponsorManager.checkForDuplicates('Test Sponsor');
    expect(showSpy).toHaveBeenCalledWith(mockSponsor);
    expect(clubAddSponsorManager.state.existingSponsorData).toEqual(mockSponsor);
    expect(clubAddSponsorManager.elements.duplicateAlert.style.display).toBe('block');
    vi.unstubAllGlobals();
  });

  it('should hide duplicate alert when checkForDuplicates finds no duplicate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ isDuplicate: false })
    }));
    const hideSpy = vi.spyOn(clubAddSponsorManager, 'hideDuplicateAlert');
    await clubAddSponsorManager.checkForDuplicates('Unique Sponsor');
    expect(hideSpy).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('should reset form to new sponsor mode', () => {
    clubAddSponsorManager.resetToNewSponsorMode();
    expect(clubAddSponsorManager.elements.sponsorTypeInput.value).toBe('new');
    expect(clubAddSponsorManager.elements.existingSponsorIdInput.value).toBe('');
    expect(clubAddSponsorManager.elements.submitText.textContent).toBe('Add Sponsor');
    expect(clubAddSponsorManager.elements.submitBtn.className).toContain('btn-primary');
  });

  it('should disable form fields except sponsorName', () => {
    clubAddSponsorManager.disableFormFields(true);
    const fields = clubAddSponsorManager.elements.sponsorForm.querySelectorAll('input:not([type="hidden"]), select, textarea');
    fields.forEach(field => {
      if (field.id !== 'sponsorName') {
        expect(field.disabled).toBe(true);
        expect(field.classList.contains('bg-light')).toBe(true);
      }
    });
  });

  it('should enable form fields except sponsorName', () => {
    clubAddSponsorManager.disableFormFields(false);
    const fields = clubAddSponsorManager.elements.sponsorForm.querySelectorAll('input:not([type="hidden"]), select, textarea');
    fields.forEach(field => {
      if (field.id !== 'sponsorName') {
        expect(field.disabled).toBe(false);
        expect(field.classList.contains('bg-light')).toBe(false);
      }
    });
  });

  it('should show linking feedback when linking to existing sponsor', () => {
    clubAddSponsorManager.state.existingSponsorData = { sponsorName: 'Sponsor X' };
    clubAddSponsorManager.showLinkingFeedback();
    const feedback = document.getElementById('linkingFeedback');
    expect(feedback).toBeTruthy();
    expect(feedback.textContent).toContain('Sponsor X');
  });

  it('should remove linking feedback', () => {
    clubAddSponsorManager.state.existingSponsorData = { sponsorName: 'Sponsor X' };
    clubAddSponsorManager.showLinkingFeedback();
    clubAddSponsorManager.removeLinkingFeedback();
    expect(document.getElementById('linkingFeedback')).toBeNull();
  });

  it('should handle sponsor name input and trigger duplicate check', async () => {
    const input = clubAddSponsorManager.elements.sponsorNameInput;
    const checkSpy = vi.spyOn(clubAddSponsorManager, 'checkForDuplicates').mockResolvedValue();
    input.value = 'Sponsor';
    input.dispatchEvent(new Carnival('input'));
    await new Promise(r => setTimeout(r, 600));
    expect(checkSpy).toHaveBeenCalledWith('Sponsor');
    checkSpy.mockRestore();
  });

  it('should not trigger duplicate check for short sponsor name', () => {
    const input = clubAddSponsorManager.elements.sponsorNameInput;
    const hideSpy = vi.spyOn(clubAddSponsorManager, 'hideDuplicateAlert');
    input.value = 'ab';
    input.dispatchEvent(new Carnival('input'));
    expect(hideSpy).toHaveBeenCalled();
    hideSpy.mockRestore();
  });

  it('should handle link existing click', () => {
    clubAddSponsorManager.state.existingSponsorData = { id: 99, sponsorName: 'Sponsor Y' };
    const el = clubAddSponsorManager.elements;
    clubAddSponsorManager.handleLinkExistingClick();
    expect(el.sponsorTypeInput.value).toBe('existing');
    expect(el.existingSponsorIdInput.value).toBe('99');
    expect(el.submitText.textContent).toBe('Link Existing Sponsor');
    expect(el.submitBtn.className).toContain('btn-light');
  });

  it('should handle create new click', () => {
    const resetSpy = vi.spyOn(clubAddSponsorManager, 'resetToNewSponsorMode');
    clubAddSponsorManager.handleCreateNewClick();
    expect(resetSpy).toHaveBeenCalled();
    resetSpy.mockRestore();
  });

  it('should handle form submit and show loading state', () => {
    const el = clubAddSponsorManager.elements;
    el.sponsorTypeInput.value = 'new';
    const evt = new Carnival('submit');
    el.submitBtn.disabled = false;
    el.submitBtn.innerHTML = '<span id="submitText">Add Sponsor</span>';
    clubAddSponsorManager.handleFormSubmit(evt);
    expect(el.submitBtn.disabled).toBe(true);
    expect(el.submitBtn.innerHTML).toContain('Creating...');
  });

  it('should add and remove border-primary class on focus/blur', () => {
    const input = clubAddSponsorManager.elements.sponsorNameInput;
    clubAddSponsorManager.handleNameFocus({ currentTarget: input });
    expect(input.classList.contains('border-primary')).toBe(true);
    clubAddSponsorManager.handleNameBlur({ currentTarget: input });
    expect(input.classList.contains('border-primary')).toBe(false);
  });
});