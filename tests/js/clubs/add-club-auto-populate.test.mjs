import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
// Import the manager object directly
import { addClubManager } from '/public/js/add-club-auto-populate.js';

/**
 * @file add-club-manager.test.js
 * @description Unit tests for addClubManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <form>
            <select id="clubId">
                <option value="">Select a Club</option>
                <option 
                    value="1" 
                    data-club-name="Lions" 
                    data-contact-person="John Doe" 
                    data-contact-email="john@lions.com" 
                    data-contact-phone="12345">
                    Lions
                </option>
            </select>
            <input id="teamName" />
            <input id="contactPerson" />
            <input id="contactEmail" />
            <input id="contactPhone" />
        </form>
    `;
}

describe('addClubManager', () => {
    beforeEach(() => {
        // Set up the DOM and use fake timers for setTimeout
        setupDOM();
        vi.useFakeTimers();
        // Initialize the manager, which caches elements and sets up listeners
        addClubManager.initialize();
    });

    afterEach(() => {
        // Clean up mocks and timers
        vi.restoreAllMocks();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('should populate fields when a club is selected', () => {
        const clubSelect = document.getElementById('clubId');
        const teamNameInput = document.getElementById('teamName');
        const contactPersonInput = document.getElementById('contactPerson');

        // Simulate selecting the 'Lions' option
        clubSelect.value = '1';
        clubSelect.dispatchEvent(new Event('change'));

        // Check that the input fields were populated
        expect(teamNameInput.value).toBe('Lions');
        expect(contactPersonInput.value).toBe('John Doe');
        expect(teamNameInput.classList.contains('auto-populated')).toBe(true);
    });

    it('should clear fields when the default option is selected', () => {
        const clubSelect = document.getElementById('clubId');
        const teamNameInput = document.getElementById('teamName');
        
        // First, select a club to populate the fields
        clubSelect.value = '1';
        clubSelect.dispatchEvent(new Event('change'));
        expect(teamNameInput.value).toBe('Lions'); // Verify it's populated

        // Now, select the default "Select a Club" option
        clubSelect.value = '';
        clubSelect.dispatchEvent(new Event('change'));

        // Check that the fields are cleared
        expect(teamNameInput.value).toBe('');
    });

    it('should remove the "auto-populated" class after a delay', () => {
        const clubSelect = document.getElementById('clubId');
        const teamNameInput = document.getElementById('teamName');

        clubSelect.value = '1';
        clubSelect.dispatchEvent(new Event('change'));
        
        // Immediately after, the class should be present
        expect(teamNameInput.classList.contains('auto-populated')).toBe(true);

        // Fast-forward time by 2 seconds
        vi.advanceTimersByTime(2001);

        // Now, the class should be removed
        expect(teamNameInput.classList.contains('auto-populated')).toBe(false);
    });

    it('should call clearAutoPopulatedFields when the selected option has no value', () => {
        // Spy on the method we want to check
        const clearSpy = vi.spyOn(addClubManager, 'clearAutoPopulatedFields');
        const clubSelect = document.getElementById('clubId');
        
        // Simulate selecting the default option
        clubSelect.value = '';
        clubSelect.dispatchEvent(new Event('change'));

        expect(clearSpy).toHaveBeenCalled();
    });
});
