import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
// Import the manager object directly
import { adminClaimCarnivalManager } from '../../../public/js/admin-claim-carnival.js';

/**
 * @file admin-claim-carnival.test.js
 * @description Unit tests for adminClaimCarnivalManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <form id="claim-carnival-form" data-carnival-state="VIC">
            <select id="targetClubId">
                <option value="">Select a club</option>
                <option value="1" data-delegate-name="Alice" data-delegate-email="alice@club.com" data-club-state="VIC">Club A</option>
                <option value="2" data-delegate-name="Bob" data-delegate-email="bob@club.com" data-club-state="NSW">Club B</option>
            </select>
            <div id="selectedClubInfo" class="d-none">
                <span id="delegateName"></span>
                <span id="delegateEmail"></span>
                <span id="clubState"></span>
            </div>
            <div id="stateWarning" class="d-none">Warning</div>
            <button id="claimButton" disabled>Claim</button>
        </form>
    `;
}

describe('adminClaimCarnivalManager', () => {
    beforeEach(() => {
        // Set up the DOM
        setupDOM();
        // Initialize the manager, which caches elements and sets up listeners
        adminClaimCarnivalManager.initialize();
    });

    afterEach(() => {
        // Clean up the DOM
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('should populate club info and enable button when a matching-state club is selected', () => {
        const clubSelect = document.getElementById('targetClubId');
        
        // Simulate selecting Club A (VIC)
        clubSelect.value = '1';
        clubSelect.dispatchEvent(new Event('change'));

        expect(document.getElementById('delegateName').textContent).toBe('Alice');
        expect(document.getElementById('delegateEmail').textContent).toBe('alice@club.com');
        expect(document.getElementById('clubState').textContent).toBe('VIC');
        expect(document.getElementById('selectedClubInfo').classList.contains('d-none')).toBe(false);
        expect(document.getElementById('claimButton').disabled).toBe(false);
        expect(document.getElementById('stateWarning').classList.contains('d-none')).toBe(true);
    });

    it('should show state warning when a different-state club is selected', () => {
        const clubSelect = document.getElementById('targetClubId');
        
        // Simulate selecting Club B (NSW)
        clubSelect.value = '2';
        clubSelect.dispatchEvent(new Event('change'));

        expect(document.getElementById('delegateName').textContent).toBe('Bob');
        expect(document.getElementById('stateWarning').classList.contains('d-none')).toBe(false);
        expect(document.getElementById('claimButton').disabled).toBe(false);
    });

    it('should hide info and disable button when no club is selected', () => {
        const clubSelect = document.getElementById('targetClubId');
        
        // First, select a club to make sure the info is visible
        clubSelect.value = '1';
        clubSelect.dispatchEvent(new Event('change'));
        expect(document.getElementById('claimButton').disabled).toBe(false);

        // Now, simulate selecting the default "Select a club" option
        clubSelect.value = '';
        clubSelect.dispatchEvent(new Event('change'));

        expect(document.getElementById('selectedClubInfo').classList.contains('d-none')).toBe(true);
        expect(document.getElementById('claimButton').disabled).toBe(true);
        expect(document.getElementById('stateWarning').classList.contains('d-none')).toBe(true);
    });

    it('should call handleClubChange when the select value changes', () => {
        const clubSelect = document.getElementById('targetClubId');
        // Spy on the method we expect to be called
        const handleChangeSpy = vi.spyOn(adminClaimCarnivalManager, 'handleClubChange');

        // Simulate the user carnival
        clubSelect.dispatchEvent(new Event('change'));

        // Assert that the carnival handler called our method
        expect(handleChangeSpy).toHaveBeenCalled();
    });

    it('should not throw an error if key elements are missing', () => {
        // Clear the DOM so no elements are found
        document.body.innerHTML = '';
        // The initialize method should run without throwing an error
        expect(() => adminClaimCarnivalManager.initialize()).not.toThrow();
    });
});
