import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
// Import the manager object directly
import { adminClubsManager } from '/public/js/admin-clubs.js';

/**
 * @file admin-clubs.test.js
 * @description Unit tests for adminClubsManager.
 */

// Helper function to set up the DOM for each test
function setupDOM() {
    document.body.innerHTML = `
        <input id="search" value="test" />
        <table>
            <tbody>
                <tr>
                    <td>Club Name</td>
                    <td>...</td>
                    <td>...</td>
                    <td>...</td>
                    <td><span class="badge bg-success status-badge">Active</span></td>
                    <td><span class="badge bg-info visibility-badge">Listed</span></td>
                    <td>
                        <button 
                            data-action="toggle-club-status"
                            data-club-id="1"
                            data-club-name="Test Club"
                            data-current-status="true">
                        </button>
                        <button 
                            data-action="toggle-club-visibility"
                            data-club-id="1"
                            data-club-name="Test Club"
                            data-current-visibility="true">
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

describe('adminClubsManager', () => {
    beforeEach(() => {
        // Set up the DOM
        setupDOM();
        // Mock global functions
        vi.stubGlobal('fetch', vi.fn());
        vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    });

    afterEach(() => {
        // Clean up mocks and the DOM
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('should auto-focus the search input if it has a value', () => {
        const searchInput = document.getElementById('search');
        const focusSpy = vi.spyOn(searchInput, 'focus');
        const selectionSpy = vi.spyOn(searchInput, 'setSelectionRange');

        // Initialize the manager, which should trigger the auto-focus
        adminClubsManager.initialize();

        expect(focusSpy).toHaveBeenCalled();
        expect(selectionSpy).toHaveBeenCalledWith(4, 4); // length of "test"
    });

    it('should handle club status toggle successfully and update the UI', async () => {
        // Mock a successful fetch response
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true, message: 'Success!' }),
        });
        
        // Spy on the methods we want to check
        const showToastSpy = vi.spyOn(adminClubsManager, 'showToast');
        const updateUISpy = vi.spyOn(adminClubsManager, 'updateStatusUI');

        // Initialize the manager to set up event listeners
        adminClubsManager.initialize();
        
        const statusButton = document.querySelector('[data-action="toggle-club-status"]');
        
        // Simulate a click
        statusButton.click();

        // Wait for the async operations to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(confirm).toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith('/admin/clubs/1/toggle-status', expect.any(Object));
        expect(updateUISpy).toHaveBeenCalledWith(statusButton, false); // newStatus is false
        expect(showToastSpy).toHaveBeenCalledWith('success', 'Success!');
    });

    it('should handle club visibility toggle successfully and update the UI', async () => {
        // Mock a successful fetch response
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true, message: 'Visibility updated!' }),
        });
        
        const showToastSpy = vi.spyOn(adminClubsManager, 'showToast');
        const updateUISpy = vi.spyOn(adminClubsManager, 'updateVisibilityUI');

        adminClubsManager.initialize();
        
        const visibilityButton = document.querySelector('[data-action="toggle-club-visibility"]');
        
        // Simulate a click
        visibilityButton.click();
        
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(confirm).toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith('/admin/clubs/1/toggle-visibility', expect.any(Object));
        expect(updateUISpy).toHaveBeenCalledWith(visibilityButton, false); // newVisibility is false
        expect(showToastSpy).toHaveBeenCalledWith('success', 'Visibility updated!');
    });

    it('should not proceed with toggle if confirmation is cancelled', () => {
        // Make confirm() return false for this test
        confirm.mockReturnValue(false);
        
        adminClubsManager.initialize();
        const statusButton = document.querySelector('[data-action="toggle-club-status"]');
        
        statusButton.click();

        expect(confirm).toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should show an error toast on a failed API request', async () => {
        // Mock a failed fetch response
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: false, message: 'API Error' }),
        });
        
        const showToastSpy = vi.spyOn(adminClubsManager, 'showToast');

        adminClubsManager.initialize();
        const statusButton = document.querySelector('[data-action="toggle-club-status"]');
        
        statusButton.click();
        
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(showToastSpy).toHaveBeenCalledWith('error', 'Error: API Error');
    });
});
