import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
// Ensure the path to your refactored script is correct
import { carnivalListManager } from '../../../public/js/carnival-list.js';

/**
 * @file carnival-list.test.js
 * @description Unit tests for carnivalListManager in carnival-list.js
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <form id="test-form">
            <input id="search" />
            <select id="state"></select>
            <input type="checkbox" id="upcoming" />
        </form>
    `;
}

describe('carnivalListManager', () => {

    beforeEach(() => {
        // Set up the DOM for each test
        setupDOM();
        // Use fake timers to control setTimeout for the debounce test
        vi.useFakeTimers();
    });

    afterEach(() => {
        // Clean up mocks, timers, and the DOM
        vi.restoreAllMocks();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    describe('setupSearchListener', () => {
        it('should debounce and submit the form after the delay', () => {
            const searchInput = document.getElementById('search');
            const form = document.getElementById('test-form');
            // **THE FIX IS HERE:** The mock implementation no longer expects an carnival object.
            const submitSpy = vi.spyOn(form, 'submit').mockImplementation(() => {});

            carnivalListManager.setupSearchListener(searchInput, 500);

            // Simulate a user typing
            searchInput.dispatchEvent(new Carnival('input'));
            
            // Immediately after input, submit should not have been called
            expect(submitSpy).not.toHaveBeenCalled();

            // Advance the timers by the delay
            vi.advanceTimersByTime(501);

            // Now, the submit function should have been called
            expect(submitSpy).toHaveBeenCalledTimes(1);
        });

        it('should clear the previous timeout on rapid input', () => {
            const searchInput = document.getElementById('search');
            const form = document.getElementById('test-form');
            const submitSpy = vi.spyOn(form, 'submit').mockImplementation(() => {});

            carnivalListManager.setupSearchListener(searchInput, 500);

            // Simulate rapid typing
            searchInput.dispatchEvent(new Carnival('input'));
            vi.advanceTimersByTime(200); // Not enough time to submit
            searchInput.dispatchEvent(new Carnival('input'));
            
            // Advance timers past the delay for the *second* input
            vi.advanceTimersByTime(501);

            // The form should have only been submitted once
            expect(submitSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('setupAutoSubmitListener', () => {
        it('should submit the form immediately on carnival', () => {
            const stateSelect = document.getElementById('state');
            const form = document.getElementById('test-form');
            const submitSpy = vi.spyOn(form, 'submit').mockImplementation(() => {});

            carnivalListManager.setupAutoSubmitListener(stateSelect, 'change');
            
            // Simulate the change carnival
            stateSelect.dispatchEvent(new Carnival('change'));

            expect(submitSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('submitForm', () => {
        it("should call submit on the element's form", () => {
            const searchInput = document.getElementById('search');
            const form = document.getElementById('test-form');
            const submitSpy = vi.spyOn(form, 'submit').mockImplementation(() => {});

            carnivalListManager.submitForm(searchInput);

            expect(submitSpy).toHaveBeenCalled();
        });

        it('should do nothing if the element has no form', () => {
            // Create an element that is not inside a form
            const orphanElement = document.createElement('input');
            // This should not throw an error
            expect(() => carnivalListManager.submitForm(orphanElement)).not.toThrow();
        });
    });

    describe('initialize', () => {
        it('should attach listeners to all present elements', () => {
            const setupSearchSpy = vi.spyOn(carnivalListManager, 'setupSearchListener');
            const setupAutoSubmitSpy = vi.spyOn(carnivalListManager, 'setupAutoSubmitListener');

            carnivalListManager.initialize();

            expect(setupSearchSpy).toHaveBeenCalledOnce();
            expect(setupAutoSubmitSpy).toHaveBeenCalledTimes(2);
        });

        it('should not throw an error if elements are missing', () => {
            // Clear the DOM so no elements are found
            document.body.innerHTML = '';
            expect(() => carnivalListManager.initialize()).not.toThrow();
        });
    });
});
