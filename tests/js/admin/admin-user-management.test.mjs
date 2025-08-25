import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    AdminUserManager,
    shouldCheckPrimaryOnClubChange,
    shouldRevertPrimaryDelegateChange,
} from '../../../public/js/admin-user-management.js';

// Mock global fetch and location
global.fetch = vi.fn();
const mockLocation = {
    href: '',
    reload: vi.fn(),
};
vi.stubGlobal('location', mockLocation);


// Create a mock provider for confirmation and alert dialogs
const mockConfirmationProvider = {
    confirm: vi.fn(),
    alert: vi.fn(),
};

describe('AdminUserManager', () => {
    let container, userManager;

    /**
     * Sets up the DOM structure needed for the tests.
     */
    function setupDOM() {
        document.body.innerHTML = `
            <div id="user-management-container">
                <button data-action="delete-user" data-user-id="1" data-user-name="Test User"></button>
                <button data-action="toggle-status" data-user-id="2" data-user-name="Toggle User" data-new-status="true"></button>
                <button data-action="reset-password" data-user-id="3" data-user-name="Reset User"></button>
                <select id="clubId">
                    <option value=""></option>
                    <option value="1">Club One</option>
                </select>
                <input type="checkbox" id="isPrimaryDelegate" />
            </div>
        `;
    }

    beforeEach(() => {
        // Set up a mock DOM for each test
        setupDOM();
        container = document.getElementById('user-management-container');
        
        // Instantiate the manager
        userManager = new AdminUserManager(container, mockConfirmationProvider);
        userManager.init();

        // Reset mocks
        vi.resetAllMocks();
        fetch.mockClear();
        mockLocation.reload.mockClear();
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
    });

    describe('handleDeleteUser', () => {
        it('should not call fetch if the first confirmation is rejected', async () => {
            mockConfirmationProvider.confirm.mockResolvedValueOnce(false);
            const deleteButton = container.querySelector('[data-action="delete-user"]');
            
            await userManager.handleDeleteUser(deleteButton);
            
            expect(mockConfirmationProvider.confirm).toHaveBeenCalledTimes(1);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should not call fetch if the second confirmation is rejected', async () => {
            mockConfirmationProvider.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
            const deleteButton = container.querySelector('[data-action="delete-user"]');
            
            await userManager.handleDeleteUser(deleteButton);

            expect(mockConfirmationProvider.confirm).toHaveBeenCalledTimes(2);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should call fetch and reload on successful deletion', async () => {
            mockConfirmationProvider.confirm.mockResolvedValue(true);
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, message: 'Deleted' }),
            });
            const deleteButton = container.querySelector('[data-action="delete-user"]');
            
            await userManager.handleDeleteUser(deleteButton);

            expect(fetch).toHaveBeenCalledWith('/admin/users/1/delete', { method: 'POST' });
            expect(mockConfirmationProvider.alert).toHaveBeenCalledWith('Deleted');
            expect(location.reload).toHaveBeenCalled();
        });

        it('should redirect if isEditPage is true', async () => {
            mockConfirmationProvider.confirm.mockResolvedValue(true);
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, message: 'Deleted' }),
            });
            const deleteButton = container.querySelector('[data-action="delete-user"]');
            deleteButton.dataset.isEditPage = 'true';

            await userManager.handleDeleteUser(deleteButton);

            expect(location.href).toBe('/admin/users');
        });
    });
    
    // Add similar tests for handleToggleStatus and handleResetPassword...
});


describe('Pure Logic Functions', () => {
    let clubSelect, primaryDelegateCheckbox, mockConfirmFn;

    beforeEach(() => {
        mockConfirmFn = vi.fn();
        // Create mock elements without a full DOM
        clubSelect = { value: '' };
        primaryDelegateCheckbox = { checked: false };
    });

    describe('shouldCheckPrimaryOnClubChange', () => {
        it('should return true if user confirms', async () => {
            mockConfirmFn.mockResolvedValue(true);
            clubSelect.value = '1';
            primaryDelegateCheckbox.checked = false;

            const result = await shouldCheckPrimaryOnClubChange(clubSelect, primaryDelegateCheckbox, mockConfirmFn);

            expect(mockConfirmFn).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return false if club is not selected', async () => {
            clubSelect.value = '';
            const result = await shouldCheckPrimaryOnClubChange(clubSelect, primaryDelegateCheckbox, mockConfirmFn);
            expect(mockConfirmFn).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('shouldRevertPrimaryDelegateChange', () => {
        it('should return true if user cancels removal (confirms NO)', async () => {
            mockConfirmFn.mockResolvedValue(false); // User does NOT confirm removal
            clubSelect.value = '1';
            primaryDelegateCheckbox.checked = false; // Simulate it being unchecked

            const result = await shouldRevertPrimaryDelegateChange(clubSelect, primaryDelegateCheckbox, mockConfirmFn);

            expect(mockConfirmFn).toHaveBeenCalled();
            expect(result).toBe(true); // Revert should happen
        });

        it('should return false if user confirms removal (confirms YES)', async () => {
            mockConfirmFn.mockResolvedValue(true); // User CONFIRMS removal
            clubSelect.value = '1';
            primaryDelegateCheckbox.checked = false;

            const result = await shouldRevertPrimaryDelegateChange(clubSelect, primaryDelegateCheckbox, mockConfirmFn);

            expect(mockConfirmFn).toHaveBeenCalled();
            expect(result).toBe(false); // Revert should NOT happen
        });
    });
});
