import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { carnivalNewManager } from '../../../public/js/carnival-new.js';

/**
 * @file carnival-new.test.js
 * @description Unit tests for carnivalNewManager (Manager Object Pattern).
 */

// Helper to set up DOM structure for each test
function setupDOM() {
  document.body.innerHTML = `
    <form id="carnivalForm">
      <input id="title" value="Carnival" />npm 
      <div id="mysidelineButtonContainer" style="display:none"></div>
      <input type="checkbox" id="isMultiDay" />
      <div id="endDateContainer" style="display:none"></div>
      <input id="endDate" type="date" />
      <label id="dateLabel">Date *</label>
      <input id="date" type="date" />
      <input id="forceCreate" />
    </form>
    <div class="file-upload-area"><input type="file" /></div>
  `;
}

describe('carnivalNewManager', () => {
  beforeEach(() => {
    setupDOM();
    carnivalNewManager.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should cache DOM elements on initialize', () => {
    expect(carnivalNewManager.elements.title).toBeInstanceOf(HTMLInputElement);
    expect(carnivalNewManager.elements.carnivalForm).toBeInstanceOf(HTMLFormElement);
    expect(Array.isArray(carnivalNewManager.elements.fileUploadAreas)).toBe(true);
  });

  it('should show mysidelineButtonContainer when title length > 3', () => {
    const title = carnivalNewManager.elements.title;
    const container = carnivalNewManager.elements.mysidelineContainer;
    title.value = 'Carnival Carnival';
    carnivalNewManager.handleTitleInput();
    expect(container.style.display).toBe('block');
  });

  it('should hide mysidelineButtonContainer when title length <= 3', () => {
    const title = carnivalNewManager.elements.title;
    const container = carnivalNewManager.elements.mysidelineContainer;
    title.value = 'abc';
    carnivalNewManager.handleTitleInput();
    expect(container.style.display).toBe('none');
  });

  it('should forward click to file input in file upload area', () => {
    const area = carnivalNewManager.elements.fileUploadAreas[0];
    const input = area.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(input, 'click');
    area.dispatchEvent(new Event('click', { bubbles: true }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should show endDateContainer and set required when multi-day is checked', () => {
    const els = carnivalNewManager.elements;
    els.isMultiDay.checked = true;
    carnivalNewManager.handleMultiDayToggle();
    expect(els.endDateContainer.style.display).toBe('block');
    expect(els.endDateInput.required).toBe(true);
    expect(els.dateLabel.textContent).toBe('Carnival Start Date *');
  });

  it('should hide endDateContainer and clear endDate when multi-day is unchecked', () => {
    const els = carnivalNewManager.elements;
    els.isMultiDay.checked = false;
    els.endDateInput.value = '2024-06-01';
    carnivalNewManager.handleMultiDayToggle();
    expect(els.endDateContainer.style.display).toBe('none');
    expect(els.endDateInput.required).toBe(false);
    expect(els.endDateInput.value).toBe('');
    expect(els.dateLabel.textContent).toBe('Date *');
  });

  it('should set endDate min to one day after startDate', () => {
    const els = carnivalNewManager.elements;
    els.startDateInput.value = '2024-06-01';
    els.endDateInput.value = '2024-06-01';
    carnivalNewManager.updateEndDateMin();
    expect(els.endDateInput.min).toBe('2024-06-02');
    expect(els.endDateInput.value).toBe('2024-06-02');
  });

  it('should not update endDate min if startDate is invalid', () => {
    const els = carnivalNewManager.elements;
    els.startDateInput.value = 'invalid-date';
    els.endDateInput.value = '';
    carnivalNewManager.updateEndDateMin();
    expect(els.endDateInput.min).toBe('');
  });

  it('should set custom validity if endDate <= startDate', () => {
    const els = carnivalNewManager.elements;
    els.startDateInput.value = '2024-06-01';
    els.endDateInput.value = '2024-06-01';
    carnivalNewManager.validateEndDate();
    expect(els.endDateInput.validationMessage).toBe('End date must be after the start date');
    expect(els.endDateInput.classList.contains('is-invalid')).toBe(true);
  });

  it('should clear custom validity if endDate > startDate', () => {
    const els = carnivalNewManager.elements;
    els.startDateInput.value = '2024-06-01';
    els.endDateInput.value = '2024-06-02';
    carnivalNewManager.validateEndDate();
    expect(els.endDateInput.validationMessage).toBe('');
    expect(els.endDateInput.classList.contains('is-invalid')).toBe(false);
  });

  it('should set forceCreate and submit the form on proceedAnyway', () => {
    const els = carnivalNewManager.elements;
    const submitSpy = vi.spyOn(els.carnivalForm, 'submit');
    carnivalNewManager.proceedAnyway();
    expect(els.forceCreate.value).toBe('true');
    expect(submitSpy).toHaveBeenCalled();
  });

  it('should reset the form on clearForm', () => {
    const els = carnivalNewManager.elements;
    els.title.value = 'Test';
    carnivalNewManager.clearForm();
    expect(els.title.value).toBe('');
  });
});