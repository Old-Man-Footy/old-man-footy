/**
 * Alternate Names Management (Refactored)
 * Handles adding, editing, and deleting alternate names for clubs using a modular,
 * event-driven approach.
 */

/**
 * A reusable wrapper for the Fetch API to provide consistent error handling.
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
 * Manages all UI interactions for alternate club names.
 */
export class AlternateNamesManager {
    /**
     * @param {HTMLElement} container - The main containing element for the UI.
     * @param {object} provider - An object to handle interactions like modals and alerts.
     * @param {function} provider.confirm - An async function that returns a boolean.
     * @param {function} provider.alert - An async function to show a message.
     * @param {function} provider.showEditModal - A function to display the edit modal.
     */
    constructor(container, provider) {
        if (!container) throw new Error('A container element must be provided.');
        if (!provider) throw new Error('A provider for UI interactions is required.');

        this.container = container;
        this.provider = provider;
        this.addForm = this.container.querySelector('#addAlternateNameForm');
        this.editForm = this.container.querySelector('#editAlternateNameForm');
    }

    /**
     * Initializes the manager by attaching event listeners.
     */
    init() {
        this.container.addEventListener('click', this.handleContainerClick.bind(this));

        if (this.addForm) {
            this.addForm.addEventListener('submit', this.handleAddSubmit.bind(this));
        }

        if (this.editForm) {
            this.editForm.addEventListener('submit', this.handleEditSubmit.bind(this));
        }
    }

    /**
     * Handles all clicks within the container using event delegation.
     * @param {Event} e - The click event.
     */
    async handleContainerClick(e) {
        const button = e.target.closest('button[data-action]');
        if (!button || button.disabled) return;

        const { action } = button.dataset;
        button.disabled = true;

        try {
            if (action === 'edit-alternate-name') {
                this.handleEditClick(button);
            } else if (action === 'delete-alternate-name') {
                await this.handleDeleteClick(button);
            }
        } finally {
            button.disabled = false;
        }
    }

    /**
     * Handles the submission of the "add new name" form.
     * @param {Event} e - The submit event.
     */
    async handleAddSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.addForm);
        const alternateName = formData.get('alternateName');

        try {
            const result = await apiRequest('/clubs/manage/alternate-names', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alternateName })
            });
            if (result.success) {
                location.reload();
            } else {
                await this.provider.alert(result.message || 'An unknown error occurred.');
            }
        } catch (error) {
            await this.provider.alert(`Error adding alternate name: ${error.message}`);
        }
    }

    /**
     * Handles the click on an "edit" button, triggering the modal.
     * @param {HTMLElement} button - The edit button that was clicked.
     */
    handleEditClick(button) {
        const { id, name } = button.dataset;
        this.provider.showEditModal(id, name);
    }

    /**
     * Handles the submission of the "edit name" form from the modal.
     * @param {Event} e - The submit event.
     */
    async handleEditSubmit(e) {
        e.preventDefault();
        const id = this.editForm.querySelector('#editAlternateNameId').value;
        const alternateName = this.editForm.querySelector('#editAlternateName').value;

        try {
            const result = await apiRequest(`/clubs/manage/alternate-names/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alternateName })
            });
            if (result.success) {
                location.reload();
            } else {
                await this.provider.alert(result.message || 'An unknown error occurred.');
            }
        } catch (error) {
            await this.provider.alert(`Error updating alternate name: ${error.message}`);
        }
    }

    /**
     * Handles the click on a "delete" button.
     * @param {HTMLElement} button - The delete button that was clicked.
     */
    async handleDeleteClick(button) {
        const { id, name } = button.dataset;
        const confirmed = await this.provider.confirm(`Are you sure you want to delete the alternate name "${name}"?`);
        if (!confirmed) return;

        try {
            const result = await apiRequest(`/clubs/manage/alternate-names/${id}`, {
                method: 'DELETE'
            });
            if (result.success) {
                location.reload();
            } else {
                await this.provider.alert(result.message || 'An unknown error occurred.');
            }
        } catch (error) {
            await this.provider.alert(`Error deleting alternate name: ${error.message}`);
        }
    }
}
