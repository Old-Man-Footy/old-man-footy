/**
 * Admin Club Management JavaScript
 * Handles club activation/deactivation toggle functionality.
 * Refactored into a testable object pattern.
 * @module admin-clubs
 */

export const adminClubsManager = {
    // An object to hold references to DOM elements
    elements: {},

    /**
     * Initializes the manager by caching DOM elements and setting up carnival listeners.
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.autoFocusSearch();
    },

    /**
     * Finds and stores all necessary DOM elements for easy access.
     */
    cacheElements() {
        this.elements = {
            searchInput: document.getElementById('search'),
            document: document, // For carnival delegation
        };
    },

    /**
     * Sets up a single carnival listener on the document to handle all toggle actions.
     */
    bindEvents() {
        this.elements.document.addEventListener('click', (e) => {
            const statusButton = e.target.closest('[data-action="toggle-club-status"]');
            if (statusButton) {
                this.handleClubStatusToggle(statusButton);
                return;
            }

            const visibilityButton = e.target.closest('[data-action="toggle-club-visibility"]');
            if (visibilityButton) {
                this.handleClubVisibilityToggle(visibilityButton);
            }
        });
    },

    /**
     * Focuses the search input if it has a value on page load.
     */
    autoFocusSearch() {
        const { searchInput } = this.elements;
        if (searchInput && searchInput.value) {
            searchInput.focus();
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
    },

    /**
     * Handle club status toggle (activate/deactivate).
     * @param {HTMLElement} button - The toggle button clicked.
     */
    handleClubStatusToggle(button) {
        const { clubId, clubName, currentStatus } = button.dataset;
        const isActive = currentStatus === 'true';
        const newStatus = !isActive;
        const action = newStatus ? 'reactivate' : 'deactivate';
        
        const confirmed = confirm(
            `Are you sure you want to ${action} "${clubName}"?\n\n` +
            `This will ${newStatus ? 'restore' : 'remove'} the club's visibility and functionality.`
        );
        
        if (!confirmed) return;
        
        this.performToggleRequest(
            button,
            `/admin/clubs/${clubId}/toggle-status`,
            { isActive: newStatus },
            (btn, status) => this.updateStatusUI(btn, status)
        );
    },

    /**
     * Handle club visibility toggle (publicly listed/hidden).
     * @param {HTMLElement} button - The toggle button clicked.
     */
    handleClubVisibilityToggle(button) {
        const { clubId, clubName, currentVisibility } = button.dataset;
        const isVisible = currentVisibility === 'true';
        const newVisibility = !isVisible;
        const action = newVisibility ? 'show in public listing' : 'hide from public listing';
        
        const confirmed = confirm(
            `Are you sure you want to ${action} "${clubName}"?\n\n` +
            `This will ${newVisibility ? 'make the club visible' : 'hide the club'} on public club listings.`
        );
        
        if (!confirmed) return;
        
        this.performToggleRequest(
            button,
            `/admin/clubs/${clubId}/toggle-visibility`,
            { isPubliclyListed: newVisibility },
            (btn, visibility) => this.updateVisibilityUI(btn, visibility)
        );
    },

    /**
     * Perform the toggle request with consistent error handling and UI updates.
     * @param {HTMLElement} button - The button element.
     * @param {string} url - The API endpoint URL.
     * @param {Object} data - The data to send in the request.
     * @param {Function} updateCallback - Function to update the UI on success.
     */
    async performToggleRequest(button, url, data, updateCallback) {
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                const newValue = data.isActive !== undefined ? data.isActive : data.isPubliclyListed;
                updateCallback(button, newValue);
                this.showToast('success', result.message);
            } else {
                throw new Error(result.message || 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('Error toggling club property:', error);
            this.showToast('error', `Error: ${error.message}`);
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    },

    /**
     * Updates the status button and badge UI after a successful toggle.
     * @param {HTMLElement} button - The button that was clicked.
     * @param {boolean} newStatus - The new active status.
     */
    updateStatusUI(button, newStatus) {
        button.dataset.currentStatus = newStatus.toString();
        button.className = `btn btn-outline-${newStatus ? 'danger' : 'success'} btn-sm`;
        button.title = `${newStatus ? 'Deactivate' : 'Reactivate'} Club`;
        button.innerHTML = `<i class="bi bi-toggle-${newStatus ? 'off' : 'on'}"></i>`;
        
        const statusBadge = button.closest('tr')?.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `badge bg-${newStatus ? 'success' : 'danger'} status-badge`;
            statusBadge.textContent = newStatus ? 'Active' : 'Inactive';
        }
    },

    /**
     * Updates the visibility button and badge UI after a successful toggle.
     * @param {HTMLElement} button - The button that was clicked.
     * @param {boolean} newVisibility - The new visibility status.
     */
    updateVisibilityUI(button, newVisibility) {
        button.dataset.currentVisibility = newVisibility.toString();
        button.className = `btn btn-outline-${newVisibility ? 'secondary' : 'info'} btn-sm`;
        button.title = `${newVisibility ? 'Hide from Public Listing' : 'Show in Public Listing'}`;
        button.innerHTML = `<i class="bi bi-${newVisibility ? 'eye-slash' : 'eye'}"></i>`;

        const visibilityBadge = button.closest('tr')?.querySelector('.visibility-badge');
        if (visibilityBadge) {
            visibilityBadge.className = `badge bg-${newVisibility ? 'info' : 'secondary'} visibility-badge`;
            visibilityBadge.textContent = newVisibility ? 'Listed' : 'Not Listed';
        }
    },

    /**
     * Default toast notification implementation.
     * @param {string} type - 'success' or 'error'.
     * @param {string} message - Message to display.
     */
    showToast(type, message) {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
};

// This part runs in the browser to initialize the application.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        adminClubsManager.initialize();
    });
}
