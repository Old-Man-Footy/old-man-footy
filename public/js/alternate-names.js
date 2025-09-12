/**
 * Alternate Names Management (Refactored)
 * Handles adding, editing, and deleting alternate names for clubs using a modular,
 * carnival-driven approach.
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
export const alternateNamesManager = {
    elements: {},
    provider: null,
    _bound: {
        containerClick: null,
        addSubmit: null,
        editSubmit: null,
    },

    /**
     * Initialize the manager.
     * @param {object} provider Optional provider override for confirm/alert/modal (useful for tests)
     */
    initialize(provider) {
        // Allow tests to provide a mock provider
        this.provider = provider || this.provider || this._defaultProvider();
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        // Prefer to scope delegated clicks to a surrounding '.container' when present.
        // Fall back to an element with id 'container' (used in tests) or document.body.
        const addForm = document.getElementById('addAlternateNameForm');
        if (addForm) {
            this.elements.container = addForm.closest('.container') || document.getElementById('container') || document.body;
        } else {
            this.elements.container = document.getElementById('container') || document.body;
        }

        this.elements.addForm = addForm;
        this.elements.editForm = document.getElementById('editAlternateNameForm');
    },

    bindEvents() {
        if (this.elements.container) {
            // use named bound functions so we can remove listeners on destroy
            this._bound.containerClick = this.handleContainerClick.bind(this);
            this.elements.container.addEventListener('click', this._bound.containerClick);
        }

        if (this.elements.addForm) {
            this._bound.addSubmit = this.handleAddSubmit.bind(this);
            this.elements.addForm.addEventListener('submit', this._bound.addSubmit);
        }

        if (this.elements.editForm) {
            this._bound.editSubmit = this.handleEditSubmit.bind(this);
            this.elements.editForm.addEventListener('submit', this._bound.editSubmit);
        }
    },

    destroy() {
        if (this.elements && this.elements.container && this._bound.containerClick) {
            this.elements.container.removeEventListener('click', this._bound.containerClick);
        }
        if (this.elements && this.elements.addForm && this._bound.addSubmit) {
            this.elements.addForm.removeEventListener('submit', this._bound.addSubmit);
        }
        if (this.elements && this.elements.editForm && this._bound.editSubmit) {
            this.elements.editForm.removeEventListener('submit', this._bound.editSubmit);
        }
        // Clear bound references
        this._bound.containerClick = null;
        this._bound.addSubmit = null;
        this._bound.editSubmit = null;
    },

    async handleContainerClick(e) {
        // Support both data-action attributes and legacy class-based buttons
        // (some templates render buttons with classes like 'edit-alternate-name'
        // and 'delete-alternate-name' instead of data-action attributes).
        let button = e.target.closest('button[data-action]');
        if (!button) {
            button = e.target.closest('button.edit-alternate-name, button.delete-alternate-name');
        }
        if (!button || button.disabled) return;

        // Determine the action from data-action if present, otherwise from classes
        let { action } = button.dataset;
        if (!action) {
            if (button.classList.contains('edit-alternate-name')) action = 'edit-alternate-name';
            else if (button.classList.contains('delete-alternate-name')) action = 'delete-alternate-name';
        }
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
    },

    async handleAddSubmit(e) {
        e.preventDefault();
        const form = this.elements.addForm;
        const formData = new FormData(form);
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
    },

    handleEditClick(button) {
        const { id, name } = button.dataset;
        if (this.provider && this.provider.showEditModal) this.provider.showEditModal(id, name);
    },

    async handleEditSubmit(e) {
        e.preventDefault();
        const id = this.elements.editForm.querySelector('#editAlternateNameId').value;
        const alternateName = this.elements.editForm.querySelector('#editAlternateName').value;

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
    },

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
    },

    _defaultProvider() {
        const editModalEl = document.getElementById('editAlternateNameModal');
        const bootstrapModal = (typeof bootstrap !== 'undefined' && editModalEl) ? new bootstrap.Modal(editModalEl) : null;
        return {
            confirm: async (msg) => confirm(msg),
            alert: async (msg) => alert(msg),
            showEditModal: (id, name) => {
                const idInput = document.getElementById('editAlternateNameId');
                const nameInput = document.getElementById('editAlternateName');
                if (idInput) idInput.value = id;
                if (nameInput) nameInput.value = name;
                if (bootstrapModal) bootstrapModal.show();
            }
        };
    }
};

// Auto-initialize in browser pages that include the alternate-names UI.
// This is guarded so it only runs in real browser environments and only when
// the expected DOM exists. It will not run during server-side tests which
// import this module before the DOM is available.
// Per project client scripting standards, initialize on DOMContentLoaded
// so that templates don't contain inline script. Tests may call
// `alternateNamesManager.initialize(provider)` directly.
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            // Only auto-init when the add form exists
            if (document.getElementById('addAlternateNameForm')) {
                alternateNamesManager.initialize();
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to auto-initialize alternateNamesManager', err);
        }
    });
}
