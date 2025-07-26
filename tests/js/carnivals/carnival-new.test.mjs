import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { carnivalNewManager } from '../../../public/js/carnival-new.js';

/**
 * @file carnival-new.test.js
 * @description Unit tests for carnivalNewManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
  document.body.innerHTML = `
    <form id="carnivalForm">
      <input id="title" value="Carnival Event">
      <input id="registrationLink">
      <div id="mysidelineButtonContainer" style="display:none"></div>
      <input type="checkbox" id="isMultiDay">
      <div id="endDateContainer" style="display:none"></div>
      <input type="date" id="endDate">
      <label id="dateLabel"></label>
      <input type="date" id="date">
      <input type="hidden" id="forceCreate" value="">
      <div class="file-upload-area"><input type="file"></div>
    </form>
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

  it('should cache all required DOM elements', () => {
    expect(carnivalNewManager.elements.titleInput).toBeInstanceOf(HTMLInputElement);
    expect(carnivalNewManager.elements.registrationLinkInput).toBeInstanceOf(HTMLInputElement);
    expect(carnivalNewManager.elements.mysidelineContainer).toBeInstanceOf(HTMLElement);
    expect(carnivalNewManager.elements.isMultiDayCheckbox).toBeInstanceOf(HTMLInputElement);
    expect(carnivalNewManager.elements.endDateContainer).toBeInstanceOf(HTMLElement);
    expect(carnivalNewManager.elements.endDateInput).toBeInstanceOf(HTMLInputElement);
    expect(carnivalNewManager.elements.dateLabel).toBeInstanceOf(HTMLElement);
    expect(carnivalNewManager.elements.startDateInput).toBeInstanceOf(HTMLInputElement);
    expect(carnivalNewManager.elements.forceCreate).toBeInstanceOf(HTMLInputElement);
    expect(carnivalNewManager.elements.carnivalForm).toBeInstanceOf(HTMLFormElement);
    expect(carnivalNewManager.elements.fileUploadAreas.length).toBeGreaterThan(0);
  });

  it('should show mysideline button when title input length > 3', () => {
    const titleInput = carnivalNewManager.elements.titleInput;
    const mysidelineContainer = carnivalNewManager.elements.mysidelineContainer;
    titleInput.value = 'Carnival';
    titleInput.dispatchEvent(new Event('input'));
    expect(mysidelineContainer.style.display).toBe('block');
  });

  it('should hide mysideline button when title input length <= 3', () => {
    const titleInput = carnivalNewManager.elements.titleInput;
    const mysidelineContainer = carnivalNewManager.elements.mysidelineContainer;
    titleInput.value = 'abc';
    titleInput.dispatchEvent(new Event('input'));
    expect(mysidelineContainer.style.display).toBe('none');
  });

  it('should make file upload area clickable and trigger file input', () => {
    const fileUploadArea = carnivalNewManager.elements.fileUploadAreas[0];
    const fileInput = fileUploadArea.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(fileInput, 'click');
    fileUploadArea.dispatchEvent(new Event('click'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should show endDateContainer and set required when multi-day is checked', () => {
    const checkbox = carnivalNewManager.elements.isMultiDayCheckbox;
    const endDateContainer = carnivalNewManager.elements.endDateContainer;
    const endDateInput = carnivalNewManager.elements.endDateInput;
    const dateLabel = carnivalNewManager.elements.dateLabel;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(endDateContainer.style.display).toBe('block');
    expect(endDateInput.required).toBe(true);
    expect(dateLabel.textContent).toBe('Event Start Date *');
  });

  it('should hide endDateContainer and clear required when multi-day is unchecked', () => {
    const checkbox = carnivalNewManager.elements.isMultiDayCheckbox;
    const endDateContainer = carnivalNewManager.elements.endDateContainer;
    const endDateInput = carnivalNewManager.elements.endDateInput;
    const dateLabel = carnivalNewManager.elements.dateLabel;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(endDateContainer.style.display).toBe('none');
    expect(endDateInput.required).toBe(false);
    expect(dateLabel.textContent).toBe('Date *');
  });

  it('should set minimum end date to start date + 1 day', () => {
    const startDateInput = carnivalNewManager.elements.startDateInput;
    const endDateInput = carnivalNewManager.elements.endDateInput;
    startDateInput.value = '2024-06-01';
    carnivalNewManager.updateEndDateMin();
    expect(endDateInput.min).toBe('2024-06-02');
  });

  it('should validate end date after start date', () => {
    const startDateInput = carnivalNewManager.elements.startDateInput;
    const endDateInput = carnivalNewManager.elements.endDateInput;
    startDateInput.value = '2024-06-01';
    endDateInput.value = '2024-05-31';
    carnivalNewManager.validateEndDate();
    expect(endDateInput.validationMessage).toBe('End date must be after the start date');
    expect(endDateInput.classList.contains('is-invalid')).toBe(true);

    endDateInput.value = '2024-06-02';
    carnivalNewManager.validateEndDate();
    expect(endDateInput.validationMessage).toBe('');
    expect(endDateInput.classList.contains('is-invalid')).toBe(false);
  });

  it('should set forceCreate to true and submit the form on proceedAnyway', () => {
    const form = carnivalNewManager.elements.carnivalForm;
    const forceCreate = carnivalNewManager.elements.forceCreate;
    const submitSpy = vi.spyOn(form, 'submit').mockImplementation(() => {});
    carnivalNewManager.proceedAnyway();
    expect(forceCreate.value).toBe('true');
    expect(submitSpy).toHaveBeenCalled();
  });

  it('should reset the form on clearForm', () => {
    const form = carnivalNewManager.elements.carnivalForm;
    const resetSpy = vi.spyOn(form, 'reset').mockImplementation(() => {});
    carnivalNewManager.clearForm();
    expect(resetSpy).toHaveBeenCalled();
  });
});