/**
 * Carnival Attendees JavaScript
 * Handles attendee removal, approval/rejection, and filtering functionality for carnival attendees page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get carnival ID from the current URL
    const pathParts = window.location.pathname.split('/');
    const carnivalId = pathParts[2]; // /carnivals/{id}/attendees

    // Initialize functionality
    initializeFiltering();
    initializeApprovalActions();
    initializeRemoveActions();

    /**
     * Initialize filtering functionality
     */
    function initializeFiltering() {
        const approvalFilters = document.querySelectorAll('input[name="approvalFilter"]');
        const paymentFilters = document.querySelectorAll('input[name="paymentFilter"]');

        approvalFilters.forEach(filter => {
            filter.addEventListener('change', applyFilters);
        });

        paymentFilters.forEach(filter => {
            filter.addEventListener('change', applyFilters);
        });
    }

    /**
     * Apply filters to registration cards
     */
    function applyFilters() {
        const approvalFilter = document.querySelector('input[name="approvalFilter"]:checked').value;
        const paymentFilter = document.querySelector('input[name="paymentFilter"]:checked').value;
        const registrationCards = document.querySelectorAll('[data-registration-id]');

        let visibleCount = 0;

        registrationCards.forEach(card => {
            const approvalStatus = card.dataset.approvalStatus;
            const paymentStatus = card.dataset.paymentStatus;

            let showCard = true;

            // Apply approval filter
            if (approvalFilter !== 'all' && approvalStatus !== approvalFilter) {
                showCard = false;
            }

            // Apply payment filter
            if (paymentFilter !== 'all' && paymentStatus !== paymentFilter) {
                showCard = false;
            }

            if (showCard) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Update visible count or show no results message
        updateFilterResults(visibleCount);
    }

    /**
     * Update filter results display
     */
    function updateFilterResults(visibleCount) {
        const attendeesList = document.getElementById('attendeesList');
        let noResultsMsg = document.getElementById('noFilterResults');

        if (visibleCount === 0) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.id = 'noFilterResults';
                noResultsMsg.className = 'col-12 text-center py-5';
                noResultsMsg.innerHTML = `
                    <div class="mb-3">
                        <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No clubs match your filters</h5>
                    <p class="text-muted">Try adjusting your filter settings to see more results.</p>
                `;
                attendeesList.appendChild(noResultsMsg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    /**
     * Initialize approval/rejection actions
     */
    function initializeApprovalActions() {
        // Approve registration buttons
        document.querySelectorAll('.approve-registration').forEach(button => {
            button.addEventListener('click', function() {
                const registrationId = this.dataset.registrationId;
                const clubName = this.dataset.clubName;
                
                if (confirm(`Are you sure you want to approve ${clubName}'s registration?`)) {
                    approveRegistration(registrationId);
                }
            });
        });

        // Reject registration buttons
        document.querySelectorAll('.reject-registration').forEach(button => {
            button.addEventListener('click', function() {
                const registrationId = this.dataset.registrationId;
                const clubName = this.dataset.clubName;
                
                showRejectionModal(registrationId, clubName);
            });
        });

        // Rejection modal confirm button
        document.getElementById('confirmRejectBtn').addEventListener('click', function() {
            const registrationId = this.dataset.registrationId;
            const rejectionReason = document.getElementById('rejectionReason').value;
            
            rejectRegistration(registrationId, rejectionReason);
        });
    }

    /**
     * Show rejection modal
     */
    function showRejectionModal(registrationId, clubName) {
        document.getElementById('rejectionClubName').textContent = clubName;
        document.getElementById('confirmRejectBtn').dataset.registrationId = registrationId;
        document.getElementById('rejectionReason').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('rejectionModal'));
        modal.show();
    }

    /**
     * Approve a registration
     */
    async function approveRegistration(registrationId) {
        try {
            const response = await fetch(`/carnivals/${carnivalId}/attendees/${registrationId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success message
                showAlert('success', result.message);
                
                // Reload page to reflect changes
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showAlert('danger', result.message || 'Error approving registration');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('danger', 'Error approving registration');
        }
    }

    /**
     * Reject a registration
     */
    async function rejectRegistration(registrationId, rejectionReason) {
        try {
            const response = await fetch(`/carnivals/${carnivalId}/attendees/${registrationId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rejectionReason: rejectionReason
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Hide modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('rejectionModal'));
                modal.hide();
                
                // Show success message
                showAlert('success', result.message);
                
                // Reload page to reflect changes
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showAlert('danger', result.message || 'Error rejecting registration');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('danger', 'Error rejecting registration');
        }
    }

    /**
     * Initialize remove attendee functionality
     */
    function initializeRemoveActions() {
        document.querySelectorAll('.remove-attendee').forEach(button => {
            button.addEventListener('click', function() {
                const registrationId = this.dataset.registrationId;
                const clubName = this.dataset.clubName;
                
                if (confirm(`Are you sure you want to remove "${clubName}" from this carnival?`)) {
                    removeAttendee(registrationId);
                }
            });
        });
    }

    /**
     * Remove an attendee from the carnival
     */
    async function removeAttendee(registrationId) {
        try {
            const response = await fetch(`/carnivals/${carnivalId}/attendees/${registrationId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success message
                showAlert('success', result.message);
                
                // Remove the card from DOM
                const card = document.querySelector(`[data-registration-id="${registrationId}"]`);
                if (card) {
                    card.remove();
                }
                
                // Update statistics (simple refresh for now)
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                showAlert('danger', result.message || 'Error removing club from carnival');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('danger', 'Error removing club from carnival');
        }
    }

    /**
     * Show alert message
     */
    function showAlert(type, message) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert-floating');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show alert-floating`;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        document.body.appendChild(alert);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    // Sortable functionality for reordering (if needed in future)
    // This would require additional JavaScript library like SortableJS
});