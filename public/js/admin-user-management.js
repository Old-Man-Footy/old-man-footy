/**
 * Admin User Management JavaScript (Refactored)
 * Handles all user management functionality for admin pages in a modular way.
 * This version is decoupled from global `window` objects like `alert` and `confirm`,
 * making it more robust, testable, and suitable for use with modern UI components like modals.
 */

import { showAlert } from './utils/ui-helpers.js';

/**
 * A wrapper for the Fetch API to provide consistent error handling and response parsing.
 * In a real application, this might live in a shared utilities file.
 * @param {string} url - The request URL.
 * @param {object} options - The fetch options object.
 * @returns {Promise<object>} A promise that resolves with the JSON response.
 * @throws {Error} Throws an error for network issues or non-OK HTTP responses.
 */
async function apiRequest(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    return response.json();
}

/**
 * Manages user-related actions on an admin page (list or edit).
 * It uses carnival delegation and requires a "confirmation provider" to handle user prompts,
 * decoupling it from native browser dialogs.
 */
export class AdminUserManager {
    /**
     * @param {HTMLElement} container - The main containing element for user management UI (e.g., a table or form).
     * @param {object} confirmationProvider - An object with `confirm` and `alert` methods.
     * @param {function} confirmationProvider.confirm - An async function that returns a boolean.
     * @param {function} confirmationProvider.alert - An async function to show a message.
     */
    constructor(container, confirmationProvider) {
        if (!container) {
            throw new Error('A container element must be provided.');
        }
        if (!confirmationProvider || typeof confirmationProvider.confirm !== 'function' || typeof confirmationProvider.alert !== 'function') {
            throw new Error('A valid confirmationProvider with confirm() and alert() methods is required.');
        }
        this.container = container;
        this.confirm = confirmationProvider.confirm;
        this.alert = confirmationProvider.alert;
    }

    /**
     * Initializes the manager by attaching a single event listener to the container.
     */
    init() {
        this.container.addEventListener('click', this.handleContainerClick.bind(this));
        this.initializeFormSpecificLogic();
    }

    /**
     * Handles all clicks within the container using carnival delegation.
     * @param {Carnival} e - The click carnival.
     */
    async handleContainerClick(e) {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const { action } = button.dataset;

        // Prevent multiple rapid clicks
        if (button.disabled) return;
        button.disabled = true;

        try {
            switch (action) {
                case 'reset-password':
                    await this.handleResetPassword(button);
                    break;
                case 'toggle-status':
                    await this.handleToggleStatus(button);
                    break;
                case 'delete-user':
                    await this.handleDeleteUser(button);
                    break;
                default:
                    console.warn(`Unknown action: ${action}`);
            }
        } catch (error) {
            console.error(`Action "${action}" failed:`, error);
            await showAlert(`An unexpected error occurred: ${error.message}`);
        } finally {
            button.disabled = false;
        }
    }

    /**
     * Handles the "Reset Password" action.
     * @param {HTMLElement} button - The button element that was clicked.
     */
    async handleResetPassword(button) {
        const { userId, userName } = button.dataset;
        const isConfirmed = await this.confirm(`Are you sure you want to send a password reset email to ${userName}?`);
        if (!isConfirmed) return;

        try {
            const result = await apiRequest(`/admin/users/${userId}/password-reset`, { method: 'POST' });
            await showAlert(result.message || 'Password reset email sent successfully.');
        } catch (error) {
            await showAlert(`Error sending password reset email: ${error.message}`);
        }
    }

    /**
     * Handles the "Toggle Status" action.
     * @param {HTMLElement} button - The button element that was clicked.
     */
    async handleToggleStatus(button) {
        const { userId, userName, newStatus } = button.dataset;
        const isActivating = newStatus === 'true';
        const action = isActivating ? 'activate' : 'deactivate';

        const isConfirmed = await this.confirm(`Are you sure you want to ${action} ${userName}?`);
        if (!isConfirmed) return;

        try {
            await apiRequest(`/admin/users/${userId}/toggle-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: isActivating })
            });
            // Instead of reloading, we can now update the UI dynamically.
            // This part would be specific to the consuming application's UI structure.
            window.location.reload(); // Or emit a custom carnival for the UI to handle.
        } catch (error) {
            await showAlert(`Error updating user status: ${error.message}`);
        }
    }

    /**
     * Handles the "Delete User" action with a double confirmation.
     * @param {HTMLElement} button - The button element that was clicked.
     */
    async handleDeleteUser(button) {
        const { userId, userName, isEditPage } = button.dataset;

        const firstConfirm = await this.confirm(`Are you sure you want to permanently delete ${userName}? This action cannot be undone.`);
        if (!firstConfirm) return;

        const secondConfirm = await this.confirm(`FINAL WARNING: This will permanently delete ${userName} and all associated data. Are you absolutely sure?`);
        if (!secondConfirm) return;

        try {
            const result = await apiRequest(`/admin/users/${userId}/delete`, { method: 'POST' });
            await showAlert(result.message || 'User deleted successfully.');

            if (isEditPage === 'true') {
                window.location.href = '/admin/users';
            } else {
                window.location.reload(); // Or remove the element from the DOM.
            }
        } catch (error) {
            await showAlert(`Error deleting user: ${error.message}`);
        }
    }

    /**
     * Sets up event listeners for form elements that are not action buttons,
     * such as the club select and primary delegate checkbox.
     */
    initializeFormSpecificLogic() {
        const clubSelect = this.container.querySelector('#clubId');
        const primaryDelegateCheckbox = this.container.querySelector('#isPrimaryDelegate');

        if (!clubSelect || !primaryDelegateCheckbox) return;

        clubSelect.addEventListener('change', () => {
            if (shouldCheckPrimaryOnClubChange(clubSelect, primaryDelegateCheckbox, this.confirm)) {
                primaryDelegateCheckbox.checked = true;
            }
        });

        primaryDelegateCheckbox.addEventListener('change', () => {
            if (shouldRevertPrimaryDelegateChange(clubSelect, primaryDelegateCheckbox, this.confirm)) {
                // Revert the change by re-checking the box
                primaryDelegateCheckbox.checked = true;
            }
        });
    }
}

/**
 * Determines if the primary delegate checkbox should be checked when the club changes.
 * This is a pure function, making it easy to test independently.
 * @param {HTMLSelectElement} clubSelect - The club select dropdown element.
 * @param {HTMLInputElement} primaryDelegateCheckbox - The primary delegate checkbox element.
 * @param {function} confirmFn - The confirmation function to use (can be mocked for tests).
 * @returns {Promise<boolean>} Returns true if the checkbox should be checked.
 */
export async function shouldCheckPrimaryOnClubChange(clubSelect, primaryDelegateCheckbox, confirmFn) {
    if (clubSelect?.value && !primaryDelegateCheckbox?.checked) {
        return await confirmFn('Would you like to make this user the primary delegate for the selected club?');
    }
    return false;
}

/**
 * Determines if the primary delegate checkbox state should be reverted upon change.
 * This is a pure function, making it easy to test independently.
 * @param {HTMLSelectElement} clubSelect - The club select dropdown element.
 * @param {HTMLInputElement} primaryDelegateCheckbox - The primary delegate checkbox element.
 * @param {function} confirmFn - The confirmation function to use (can be mocked for tests).
 * @returns {Promise<boolean>} Returns true if the checkbox should be reverted.
 */
export async function shouldRevertPrimaryDelegateChange(clubSelect, primaryDelegateCheckbox, confirmFn) {
    if (clubSelect?.value && !primaryDelegateCheckbox?.checked) {
        // If the user does NOT confirm the removal, we should revert.
        const isConfirmed = await confirmFn('Are you sure you want to remove primary delegate status? This may affect club management capabilities.');
        return !isConfirmed;
    }
    return false;
}
