import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { alternateNamesManager } from '../../../public/js/alternate-names.js';

// Mock global fetch and location
global.fetch = vi.fn();
const mockLocation = {
    reload: vi.fn(),
};
vi.stubGlobal('location', mockLocation);

// Mock provider for UI interactions (modals, alerts)
const mockProvider = {
    confirm: vi.fn(),
    alert: vi.fn(),
    showEditModal: vi.fn((id, name) => {
        // Simulate the modal populating the form
        const idInput = document.getElementById('editAlternateNameId');
        const nameInput = document.getElementById('editAlternateName');
        if (idInput) idInput.value = id;
        if (nameInput) nameInput.value = name;
    }),
};

describe('AlternateNamesManager', () => {
    let container, manager;

    /**
     * Sets up the DOM structure needed for the tests.
     */
    function setupDOM() {
        document.body.innerHTML = `
            <div id="container">
                <form id="addAlternateNameForm">
                    <input name="alternateName" value="New Test Name" />
                    <button type="submit">Add</button>
                </form>

                <div id="name-list">
                    <button data-action="edit-alternate-name" data-id="1" data-name="Old Name"></button>
                    <button data-action="delete-alternate-name" data-id="2" data-name="Delete Me"></button>
                </div>

                <form id="editAlternateNameForm">
                    <input id="editAlternateNameId" />
                    <input id="editAlternateName" />
                    <button type="submit">Save</button>
                </form>
            </div>
        `;
    }

    beforeEach(() => {
        setupDOM();
        container = document.getElementById('container');
        // Initialize the singleton manager with the mock provider
        alternateNamesManager.initialize(mockProvider);
        vi.resetAllMocks();
    });

    afterEach(() => {
    // Destroy event listeners added by the manager to clean up between tests
    alternateNamesManager.destroy();
    document.body.innerHTML = '';
    });

    describe('Add Name', () => {
        it('should send a POST request and reload on successful submission', async () => {
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            const addForm = container.querySelector('#addAlternateNameForm');
            addForm.dispatchEvent(new Event('submit', { bubbles: true }));

            await new Promise(process.nextTick); // Wait for async operations

            expect(fetch).toHaveBeenCalledWith('/clubs/manage/alternate-names', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ alternateName: 'New Test Name' }),
            }));
            expect(mockLocation.reload).toHaveBeenCalled();
            expect(mockProvider.alert).not.toHaveBeenCalled();
        });

        it('should show an alert on a failed API response', async () => {
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: false, message: 'Already exists' }),
            });

            const addForm = container.querySelector('#addAlternateNameForm');
            addForm.dispatchEvent(new Event('submit', { bubbles: true }));

            await new Promise(process.nextTick);

            expect(mockProvider.alert).toHaveBeenCalledWith('Already exists');
            expect(mockLocation.reload).not.toHaveBeenCalled();
        });
    });

    describe('Delete Name', () => {
        it('should not send a request if confirmation is denied', async () => {
            mockProvider.confirm.mockResolvedValue(false);

            const deleteButton = container.querySelector('[data-action="delete-alternate-name"]');
            deleteButton.click();

            await new Promise(process.nextTick);

            expect(mockProvider.confirm).toHaveBeenCalledWith('Are you sure you want to delete the alternate name "Delete Me"?');
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should send a DELETE request and reload if confirmed', async () => {
            mockProvider.confirm.mockResolvedValue(true);
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            const deleteButton = container.querySelector('[data-action="delete-alternate-name"]');
            deleteButton.click();

            await new Promise(process.nextTick);

            expect(fetch).toHaveBeenCalledWith('/clubs/manage/alternate-names/2', { method: 'DELETE' });
            expect(mockLocation.reload).toHaveBeenCalled();
        });
    });

    describe('Edit Name', () => {
        it('should trigger the edit modal with correct data on click', () => {
            const editButton = container.querySelector('[data-action="edit-alternate-name"]');
            editButton.click();

            expect(mockProvider.showEditModal).toHaveBeenCalledWith('1', 'Old Name');
            // Check if the mock function populated the form
            expect(document.getElementById('editAlternateNameId').value).toBe('1');
            expect(document.getElementById('editAlternateName').value).toBe('Old Name');
        });

        it('should send a PUT request and reload on successful edit submission', async () => {
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            // Simulate clicking edit first to populate the form
            const editButton = container.querySelector('[data-action="edit-alternate-name"]');
            editButton.click();
            // Manually update the value as a user would
            document.getElementById('editAlternateName').value = 'Updated Name';

            const editForm = container.querySelector('#editAlternateNameForm');
            editForm.dispatchEvent(new Event('submit', { bubbles: true }));

            await new Promise(process.nextTick);

            expect(fetch).toHaveBeenCalledWith('/clubs/manage/alternate-names/1', expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ alternateName: 'Updated Name' }),
            }));
            expect(mockLocation.reload).toHaveBeenCalled();
        });
    });
});
