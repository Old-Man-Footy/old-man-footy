/**
 * Admin Club Management JavaScript
 * Handles club activation/deactivation toggle functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Handle club status toggle buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="toggle-club-status"]') || 
            e.target.closest('[data-action="toggle-club-status"]')) {
            
            const button = e.target.matches('[data-action="toggle-club-status"]') 
                ? e.target 
                : e.target.closest('[data-action="toggle-club-status"]');
                
            handleClubStatusToggle(button);
        }
        
        // Handle club visibility toggle buttons
        if (e.target.matches('[data-action="toggle-club-visibility"]') || 
            e.target.closest('[data-action="toggle-club-visibility"]')) {
            
            const button = e.target.matches('[data-action="toggle-club-visibility"]') 
                ? e.target 
                : e.target.closest('[data-action="toggle-club-visibility"]');
                
            handleClubVisibilityToggle(button);
        }
    });

    /**
     * Handle club status toggle (activate/deactivate)
     * @param {HTMLElement} button - The toggle button clicked
     */
    async function handleClubStatusToggle(button) {
        const clubId = button.dataset.clubId;
        const clubName = button.dataset.clubName;
        const currentStatus = button.dataset.currentStatus === 'true';
        const newStatus = !currentStatus;
        
        const action = newStatus ? 'reactivate' : 'deactivate';
        
        // Show confirmation dialog
        const confirmed = confirm(
            `Are you sure you want to ${action} "${clubName}"?\n\n` +
            `This will ${newStatus ? 'restore' : 'remove'} the club's visibility and functionality.`
        );
        
        if (!confirmed) return;
        
        await performToggleRequest(
            button,
            `/admin/clubs/${clubId}/toggle-status`,
            { isActive: newStatus },
            action,
            clubName,
            function(button, newStatus) {
                // Update button appearance and data
                button.dataset.currentStatus = newStatus.toString();
                button.className = `btn btn-outline-${newStatus ? 'danger' : 'success'} btn-sm`;
                button.title = `${newStatus ? 'Deactivate' : 'Reactivate'} Club`;
                button.innerHTML = `<i class="bi bi-toggle-${newStatus ? 'off' : 'on'}"></i>`;
                
                // Update status badge in the same row
                const row = button.closest('tr');
                const statusCell = row.cells[4]; // Status column (0-indexed)
                const statusBadge = statusCell.querySelector('.badge');
                if (statusBadge) {
                    statusBadge.className = `badge bg-${newStatus ? 'success' : 'danger'}`;
                    statusBadge.textContent = newStatus ? 'Active' : 'Inactive';
                }
            }
        );
    }

    /**
     * Handle club visibility toggle (publicly listed/hidden)
     * @param {HTMLElement} button - The toggle button clicked
     */
    async function handleClubVisibilityToggle(button) {
        const clubId = button.dataset.clubId;
        const clubName = button.dataset.clubName;
        const currentVisibility = button.dataset.currentVisibility === 'true';
        const newVisibility = !currentVisibility;
        
        const action = newVisibility ? 'show in public listing' : 'hide from public listing';
        
        // Show confirmation dialog
        const confirmed = confirm(
            `Are you sure you want to ${action} "${clubName}"?\n\n` +
            `This will ${newVisibility ? 'make the club visible' : 'hide the club'} on public club listings.`
        );
        
        if (!confirmed) return;
        
        await performToggleRequest(
            button,
            `/admin/clubs/${clubId}/toggle-visibility`,
            { isPubliclyListed: newVisibility },
            action,
            clubName,
            function(button, newVisibility) {
                // Update button appearance and data
                button.dataset.currentVisibility = newVisibility.toString();
                button.className = `btn btn-outline-${newVisibility ? 'secondary' : 'info'} btn-sm`;
                button.title = `${newVisibility ? 'Hide from Public Listing' : 'Show in Public Listing'}`;
                button.innerHTML = `<i class="bi bi-${newVisibility ? 'eye-slash' : 'eye'}"></i>`;
                
                // Update visibility badge in the same row
                const row = button.closest('tr');
                const visibilityCell = row.cells[5]; // Publicly Listed column (0-indexed)
                const visibilityBadge = visibilityCell.querySelector('.badge');
                if (visibilityBadge) {
                    visibilityBadge.className = `badge bg-${newVisibility ? 'info' : 'secondary'}`;
                    visibilityBadge.textContent = newVisibility ? 'Listed' : 'Not Listed';
                }
            }
        );
    }

    /**
     * Perform the toggle request with consistent error handling and UI updates
     * @param {HTMLElement} button - The button element
     * @param {string} url - The API endpoint URL
     * @param {Object} data - The data to send in the request
     * @param {string} action - Description of the action for logging
     * @param {string} clubName - Name of the club for logging
     * @param {Function} updateCallback - Function to update the UI on success
     */
    async function performToggleRequest(button, url, data, action, clubName, updateCallback) {
        // Disable button during request
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Call the update callback with the new value
                const newValue = data.isActive !== undefined ? data.isActive : data.isPubliclyListed;
                updateCallback(button, newValue);
                
                // Show success toast
                showToast('success', result.message);
                
                console.log(`✅ Club ${clubName} ${action} successfully`);
            } else {
                throw new Error(result.message || `Failed to ${action}`);
            }
        } catch (error) {
            console.error(`❌ Error toggling club:`, error);
            showToast('error', `Error: ${error.message}`);
        } finally {
            // Re-enable button
            button.disabled = false;
            if (button.innerHTML.includes('hourglass')) {
                button.innerHTML = originalText;
            }
        }
    }

    /**
     * Show toast notification
     * @param {string} type - 'success' or 'error'
     * @param {string} message - Message to display
     */
    function showToast(type, message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    // Auto-focus search input if present
    const searchInput = document.getElementById('search');
    if (searchInput && searchInput.value) {
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
});