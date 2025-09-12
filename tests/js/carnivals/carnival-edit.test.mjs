import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
// Import the manager object directly.
import { carnivalEditManager } from '../../../public/js/carnival-edit.js';

/**
 * @file carnival-edit.test.js
 * @description Unit tests for carnivalEditManager in carnival-edit.js
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <form data-mysideline-carnival-url="https://mysideline.com/register/">
            <div id="endDateContainer" data-has-end-date="false">
                <input type="date" id="endDate" name="endDate" />
            </div>
            <img class="carnival-logo-preview" />
            <img class="carnival-promo-preview" />
            <div class="file-upload-area">
                <input type="file" class="file-input-hidden" />
            </div>
            <input type="checkbox" id="isMultiDay" />
            <label id="dateLabel" for="date">Date *</label>
            <input type="date" id="date" name="date" />
            <input id="mySidelineId" value="" />
            <input id="registrationLink" value="" />
            <small id="linkStatus"></small>
            <button id="testLinkBtn" style="display: none;"></button>
        </form>
    `;
}

describe('carnivalEditManager', () => {

    beforeEach(() => {
        // Set up the DOM and mock any necessary global functions
        setupDOM();
        
        // **THE FIX IS HERE:**
        // This mock now correctly simulates the behavior of the real URL constructor,
        // which throws an error for invalid URL strings.
        const OriginalURL = global.URL;
        vi.stubGlobal('URL', function(url) {
            // A simple regex to check for something that looks like a URL.
            // This is sufficient for the test cases.
            if (!/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(url)) {
                 throw new TypeError('Invalid URL');
            }
            return new OriginalURL(url);
        });
    });

    afterEach(() => {
        // Clean up mocks and the DOM
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('should cache DOM elements correctly', () => {
        carnivalEditManager.initialize();
        expect(carnivalEditManager.elements.endDateContainer).toBeInstanceOf(HTMLElement);
        expect(carnivalEditManager.elements.isMultiDayCheckbox).toBeInstanceOf(HTMLInputElement);
        expect(carnivalEditManager.elements.form).toBeInstanceOf(HTMLFormElement);
    });

    it('should initialize page styling', () => {
        carnivalEditManager.initialize();
        const container = document.getElementById('endDateContainer');
        const logo = document.querySelector('.carnival-logo-preview');
        const fileInput = document.querySelector('.file-input-hidden');
        
        expect(container.style.display).toBe('none');
        expect(logo.style.height).toBe('150px');
        expect(fileInput.style.display).toBe('none');
    });

    it('should make file upload area clickable', () => {
        carnivalEditManager.initialize();
        const area = document.querySelector('.file-upload-area');
        const input = area.querySelector('input[type="file"]');
        const clickSpy = vi.spyOn(input, 'click');
        
        area.click();
        
        expect(clickSpy).toHaveBeenCalled();
    });

    it('should toggle end date visibility when multi-day is checked', () => {
        carnivalEditManager.initialize();
        const checkbox = document.getElementById('isMultiDay');
        const container = document.getElementById('endDateContainer');
        const label = document.getElementById('dateLabel');
        const endDateInput = document.getElementById('endDate');

        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));

        expect(container.style.display).toBe('block');
        expect(label.textContent).toContain('Carnival Start Date');
        expect(endDateInput.required).toBe(true);
    });

    it('should clear end date when multi-day is unchecked', () => {
        carnivalEditManager.initialize();
        const checkbox = document.getElementById('isMultiDay');
        const endDateInput = document.getElementById('endDate');
        
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        endDateInput.value = '2025-01-02';

        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));

        expect(endDateInput.value).toBe('');
    });

    it('should update end date minimum value', () => {
        carnivalEditManager.initialize();
        const startDateInput = document.getElementById('date');
        const endDateInput = document.getElementById('endDate');

        startDateInput.value = '2025-08-10';
        carnivalEditManager.updateEndDateMin();

        expect(endDateInput.min).toBe('2025-08-11');
    });

    it('should validate end date', () => {
        carnivalEditManager.initialize();
        const startDateInput = document.getElementById('date');
        const endDateInput = document.getElementById('endDate');
        const setValiditySpy = vi.spyOn(endDateInput, 'setCustomValidity');

        startDateInput.value = '2025-08-10';
        endDateInput.value = '2025-08-09'; // Invalid
        carnivalEditManager.validateEndDate();
        expect(setValiditySpy).toHaveBeenCalledWith('End date must be after the start date');

        endDateInput.value = '2025-08-11'; // Valid
        carnivalEditManager.validateEndDate();
        expect(setValiditySpy).toHaveBeenCalledWith('');
    });
    
    it('should generate MySideline URL correctly', () => {
        carnivalEditManager.initialize();
        const url = carnivalEditManager.generateMySidelineUrl('12345');
        expect(url).toBe('https://mysideline.com/register/12345');
    });

    it('should validate URLs correctly', () => {
        carnivalEditManager.initialize();
        expect(carnivalEditManager.isValidUrl('https://example.com')).toBe(true);
        expect(carnivalEditManager.isValidUrl('not-a-valid-url')).toBe(false);
    });

    it('should update registration link and status', () => {
        carnivalEditManager.initialize();
        const registrationLinkInput = document.getElementById('registrationLink');
        const linkStatusElement = document.getElementById('linkStatus');
        const testLinkBtn = document.getElementById('testLinkBtn');
        const url = 'https://example.com';

        carnivalEditManager.updateRegistrationLink(url, 'Test Status', 'text-success');

        expect(registrationLinkInput.value).toBe(url);
        expect(linkStatusElement.textContent).toBe('Test Status');
        expect(linkStatusElement.className).toContain('text-success');
        expect(testLinkBtn.style.display).toBe('block');
    });

    it('should handle MySideline ID changes', () => {
        carnivalEditManager.initialize();
        const mySidelineIdInput = document.getElementById('mySidelineId');
        const registrationLinkInput = document.getElementById('registrationLink');
        
        mySidelineIdInput.value = 'carnival-12345';
        mySidelineIdInput.dispatchEvent(new Event('input'));

        expect(mySidelineIdInput.value).toBe('12345');
        expect(registrationLinkInput.value).toBe('https://mysideline.com/register/12345');
        expect(document.getElementById('linkStatus').textContent).toContain('auto-generated');
    });

    it('should handle manual registration link changes with MySideline URL', () => {
        carnivalEditManager.initialize();
        const mySidelineIdInput = document.getElementById('mySidelineId');
        const registrationLinkInput = document.getElementById('registrationLink');
        
        registrationLinkInput.value = 'https://mysideline.com/register/98765';
        registrationLinkInput.dispatchEvent(new Event('input'));

        expect(mySidelineIdInput.value).toBe('98765');
        expect(document.getElementById('linkStatus').textContent).toContain('Carnival ID: 98765');
    });

    it('should handle registration link changes with invalid URL', () => {
        carnivalEditManager.initialize();
        const registrationLinkInput = document.getElementById('registrationLink');
        const linkStatusElement = document.getElementById('linkStatus');

        registrationLinkInput.value = 'invalid-url';
        registrationLinkInput.dispatchEvent(new Event('input'));

        expect(linkStatusElement.textContent).toContain('Please enter a valid URL');
        expect(linkStatusElement.className).toContain('text-warning');
    });
});
