/**
 * Sponsor Management JavaScript
 * Handles sponsor-related functionality including status toggle and deletion confirmation
 */

/**
 * Toggle sponsor status (active/inactive)
 */
function toggleStatus() {
    const sponsorId = document.querySelector('[data-sponsor-id]')?.getAttribute('data-sponsor-id');
    const currentStatus = document.querySelector('[data-current-status]')?.getAttribute('data-current-status') === 'true';
    
    if (!sponsorId) {
        console.error('Sponsor ID not found');
        return;
    }
    
    const newStatus = !currentStatus;
    
    fetch(`/sponsors/${sponsorId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus })
    })
    .then(response => {
        if (response.ok) {
            location.reload();
        } else {
            alert('Error updating sponsor status. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating sponsor status. Please try again.');
    });
}

/**
 * Confirm deletion of a sponsor
 */
function confirmDelete() {
    const sponsorId = document.querySelector('[data-sponsor-id]')?.getAttribute('data-sponsor-id');
    
    if (!sponsorId) {
        console.error('Sponsor ID not found');
        return;
    }
    
    const confirmMessage = 'Are you sure you want to delete this sponsor? This action cannot be undone and will remove the sponsor from all associated clubs and carnivals.';
    if (confirm(confirmMessage)) {
        fetch(`/sponsors/${sponsorId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/sponsors';
            } else {
                alert('Error deleting sponsor. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error deleting sponsor. Please try again.');
        });
    }
}

/**
 * Initialize sponsor management functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sponsor management functionality loaded...');
    
    // Setup toggle status button
    const toggleBtn = document.querySelector('[data-action="toggle-status-btn"]');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleStatus);
    }
    
    // Setup delete button
    const deleteBtn = document.querySelector('[data-action="delete-sponsor-btn"]');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', confirmDelete);
    }
    
    // Setup sponsor removal confirmations (for removing from clubs/carnivals)
    document.querySelectorAll('[data-confirm-remove]').forEach(form => {
        form.addEventListener('submit', function(e) {
            const sponsorName = this.getAttribute('data-sponsor-name');
            const message = this.getAttribute('data-confirm-remove');
            const fullMessage = message.replace('SPONSOR_NAME', sponsorName);
            if (!confirm(fullMessage)) {
                e.preventDefault();
            }
        });
    });
    
    console.log('Sponsor management functionality initialized successfully');
});