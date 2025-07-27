import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { clubAddSponsorManager } from '../../../public/js/club-add-sponsor.js';

/**
 * @file club-add-sponsor.test.js
 * @description Unit tests for clubAddSponsorManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
  document.body.innerHTML = `
    <form id="sponsorForm">
      <div class="mb-3">
        <input id="sponsorName" type="text" />
      </div>
      <input id="sponsorTypeInput" type="hidden" value="new" />
      <button id="createNewBtn" type="button"></button>
      <button id="submitBtn" type="submit"><span id="submitText">Add Sponsor</span></button>
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
    clubAddSponsorManager.existingSponsorData = null;
  });

  it('should cache all required DOM elements', () => {
    expect(clubAddSponsorManager.elements.sponsorNameInput).toBeInstanceOf(HTMLElement);
    expect(clubAddSponsorManager.elements.createNewBtn).toBeInstanceOf(HTMLElement);
    expect(clubAddSponsorManager.elements.sponsorTypeInput).toBeInstanceOf(HTMLElement);
    expect(clubAddSponsorManager.elements.submitText).toBeInstanceOf(HTMLElement);
    expect(clubAddSponsorManager.elements.submitBtn).toBeInstanceOf(HTMLElement);
    expect(clubAddSponsorManager.elements.sponsorForm).toBeInstanceOf(HTMLElement);
  });

  it('should call resetToNewSponsorMode when createNewBtn is clicked', () => {
    const spy = vi.spyOn(clubAddSponsorManager, 'resetToNewSponsorMode');
    clubAddSponsorManager.elements.createNewBtn.dispatchEvent(new Event('click'));
    expect(spy).toHaveBeenCalled();
  });

  it('should reset form to new sponsor mode', () => {
    clubAddSponsorManager.resetToNewSponsorMode();
    expect(clubAddSponsorManager.elements.sponsorTypeInput.value).toBe('new');
    expect(clubAddSponsorManager.elements.submitText.textContent).toBe('Add Sponsor');
    expect(clubAddSponsorManager.elements.submitBtn.className).toBe('btn btn-primary');
    expect(clubAddSponsorManager.elements.submitBtn.innerHTML).toContain('Add Sponsor');
  });

  it('should disable and enable form fields except sponsorName', () => {
    // Add a dummy input to test disabling
    const dummyInput = document.createElement('input');
    dummyInput.id = 'dummyInput';
    clubAddSponsorManager.elements.sponsorForm.appendChild(dummyInput);

    clubAddSponsorManager.disableFormFields(true);
    expect(dummyInput.disabled).toBe(true);
    expect(dummyInput.classList.contains('bg-light')).toBe(true);

    clubAddSponsorManager.disableFormFields(false);
    expect(dummyInput.disabled).toBe(false);
    expect(dummyInput.classList.contains('bg-light')).toBe(false);
  });

  it('should show and remove linking feedback', () => {
    clubAddSponsorManager.existingSponsorData = { sponsorName: 'Test Sponsor' };
    clubAddSponsorManager.showLinkingFeedback();
    const feedback = document.getElementById('linkingFeedback');
    expect(feedback).not.toBeNull();
    expect(feedback.textContent).toContain('Test Sponsor');

    clubAddSponsorManager.removeLinkingFeedback();
    expect(document.getElementById('linkingFeedback')).toBeNull();
  });

  it('should handle form submission and show loading state', () => {
    const submitBtn = clubAddSponsorManager.elements.submitBtn;
    clubAddSponsorManager.elements.sponsorTypeInput.value = 'new';
    vi.useFakeTimers();
    clubAddSponsorManager.handleFormSubmit({ preventDefault: () => {} });
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.innerHTML).toContain('Creating...');
    vi.advanceTimersByTime(10000);
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.innerHTML).toContain('Add Sponsor');
    vi.useRealTimers();
  });

  it('should add border-primary class on sponsorName focus', () => {
    const input = clubAddSponsorManager.elements.sponsorNameInput;
    const event = new Event('focus');
    input.dispatchEvent(event);
    expect(input.classList.contains('border-primary')).toBe(true);
  });

  it('should remove border-primary class on sponsorName blur', () => {
    const input = clubAddSponsorManager.elements.sponsorNameInput;
    input.classList.add('border-primary');
    const event = new Event('blur');
    input.dispatchEvent(event);
    expect(input.classList.contains('border-primary')).toBe(false);
  });
});