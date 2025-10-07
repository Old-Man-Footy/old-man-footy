/**
 * Carnival Attendees JavaScript
 * Handles attendee removal, approval/rejection, and filtering functionality.
 * Refactored into a testable object pattern.
 */

import { showAlert } from './utils/ui-helpers.js';

export const attendeesManager = {
    carnivalId: null,

    // Initializes the manager with the carnival ID and sets up event listeners.
    initialize(carnivalId) {
        this.carnivalId = carnivalId;
        this.initializeFiltering();
        this.initializeApprovalActions();
        this.initializeRemoveActions();
    },

    // Sets up event listeners for the filter radio buttons.
    initializeFiltering() {
        document.querySelectorAll('input[name="approvalFilter"], input[name="paymentFilter"]')
            .forEach(filter => {
                filter.addEventListener('change', () => this.applyFilters());
            });
    },

    // Applies the currently selected filters to the attendee cards.
    applyFilters() {
        const { approvalFilter, paymentFilter } = this.getFilterValues();
        const registrationCards = document.querySelectorAll('[data-registration-id]');
        let visibleCount = 0;

        registrationCards.forEach(card => {
            const approvalStatus = card.dataset.approvalStatus;
            const paymentStatus = card.dataset.paymentStatus;
            const showCard = this.shouldShowCard(approvalFilter, paymentFilter, approvalStatus, paymentStatus);

            // Use Bootstrap classes instead of inline styles to preserve grid layout
            if (showCard) {
                card.classList.remove('d-none');
                // Explicitly ensure approval buttons are visible when card is shown
                const approvalButtons = card.querySelectorAll('.approve-registration, .reject-registration');
                approvalButtons.forEach(btn => btn.classList.remove('d-none'));
                visibleCount++;
            } else {
                card.classList.add('d-none');
            }
        });

        this.updateFilterResults(visibleCount);
    },
    
    // Gets the current values from the filter radio buttons.
    getFilterValues() {
        const approvalFilter = document.querySelector('input[name="approvalFilter"]:checked').value;
        const paymentFilter = document.querySelector('input[name="paymentFilter"]:checked').value;
        return { approvalFilter, paymentFilter };
    },

    // Business logic to determine if a card should be visible.
    shouldShowCard(approvalFilter, paymentFilter, approvalStatus, paymentStatus) {
        if (approvalFilter !== 'all' && approvalStatus !== approvalFilter) return false;
        if (paymentFilter !== 'all' && paymentStatus !== paymentFilter) return false;
        return true;
    },

    // Shows or hides the "no results" message.
    updateFilterResults(visibleCount) {
        const attendeesList = document.getElementById('attendeesList');
        let noResultsMsg = document.getElementById('noFilterResults');
        if (visibleCount === 0) {
            if (!noResultsMsg) {
                noResultsMsg = this.createNoResultsMessage();
                attendeesList.appendChild(noResultsMsg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    },

    // Creates the "no results" message element.
    createNoResultsMessage() {
        const noResultsMsg = document.createElement('div');
        noResultsMsg.id = 'noFilterResults';
        noResultsMsg.className = 'col-12 text-center py-5';
        noResultsMsg.innerHTML = `<div class="mb-3"><i class="bi bi-search text-muted" style="font-size: 3rem;"></i></div><h5 class="text-muted">No clubs match your filters</h5><p class="text-muted">Try adjusting your filter settings to see more results.</p>`;
        return noResultsMsg;
    },

    // Sets up event listeners for approve/reject buttons.
    initializeApprovalActions() {
        document.querySelectorAll('.approve-registration').forEach(button => {
            button.addEventListener('click', () => {
                if (confirm(`Are you sure you want to approve ${button.dataset.clubName}'s registration?`)) {
                    this.approveRegistration(button.dataset.registrationId);
                }
            });
        });
        
        // ... other approval/rejection listeners
        document.querySelectorAll('.reject-registration').forEach(button => {
            button.addEventListener('click', () => {
                this.showRejectionModal(button.dataset.registrationId, button.dataset.clubName);
            });
        });

        document.getElementById('confirmRejectBtn')?.addEventListener('click', () => {
            const registrationId = document.getElementById('confirmRejectBtn').dataset.registrationId;
            const rejectionReason = document.getElementById('rejectionReason').value;
            this.rejectRegistration(registrationId, rejectionReason);
        });
    },

    // Approves a registration via an API call.
    async approveRegistration(registrationId) {
        try {
            const result = await this.sendRequest(`/carnivals/${this.carnivalId}/attendees/${registrationId}/approve`, 'POST');
            if (result.success) {
                this.updateRegistrationUI(registrationId, 'approved');
                showAlert('success', result.message);
            } else {
                showAlert('danger', result.message || 'Error approving registration');
            }
        } catch (error) {
            showAlert('danger', 'Error approving registration');
        }
    },
    
    // ... other action methods (reject, remove)
    async rejectRegistration(registrationId, rejectionReason) {
        try {
            const result = await this.sendRequest(`/carnivals/${this.carnivalId}/attendees/${registrationId}/reject`, 'POST', { rejectionReason });
            if (result.success) {
                this.updateRegistrationUI(registrationId, 'rejected', rejectionReason);
                showAlert('success', result.message);
                // Close the rejection modal
                const modalElement = document.getElementById('rejectionModal');
                if (modalElement && typeof bootstrap !== 'undefined') {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) modal.hide();
                }
            } else {
                showAlert('danger', result.message || 'Error rejecting registration');
            }
        } catch (error) {
            showAlert('danger', 'Error rejecting registration');
        }
    },

    // Updates the UI elements for a registration after approval/rejection
    updateRegistrationUI(registrationId, newStatus, rejectionReason = null) {
        const card = document.querySelector(`[data-registration-id="${registrationId}"]`);
        if (!card) return;

        // Update the data attribute
        card.dataset.approvalStatus = newStatus;

        // Find and update the status badge
        const badgeContainer = card.querySelector('.position-absolute.top-0.end-0 .badge');
        if (badgeContainer) {
            if (newStatus === 'approved') {
                badgeContainer.className = 'badge bg-primary';
                badgeContainer.innerHTML = '<i class="bi bi-check-circle"></i> Approved';
            } else if (newStatus === 'rejected') {
                badgeContainer.className = 'badge bg-danger';
                badgeContainer.innerHTML = '<i class="bi bi-x-circle"></i> Rejected';
            }
        }

        // Remove approval/rejection buttons since status is no longer pending
        const approvalButtonsContainer = card.querySelector('.mt-3.pt-2.border-top');
        if (approvalButtonsContainer) {
            approvalButtonsContainer.remove();
        }

        // Add approval/rejection information
        const detailsContainer = card.querySelector('.flex-grow-1');
        if (detailsContainer && newStatus === 'approved') {
            // Add approval information
            const approvalInfo = document.createElement('div');
            approvalInfo.className = 'mt-2';
            approvalInfo.innerHTML = `
                <small class="text-success">
                    <i class="bi bi-check-circle"></i> 
                    <strong>Approved:</strong> ${new Date().toLocaleDateString()}
                </small>
            `;
            detailsContainer.appendChild(approvalInfo);
        } else if (detailsContainer && newStatus === 'rejected') {
            // Add rejection information
            const rejectionInfo = document.createElement('div');
            rejectionInfo.className = 'mt-2';
            rejectionInfo.innerHTML = `
                <small class="text-danger">
                    <i class="bi bi-exclamation-triangle"></i> 
                    <strong>Rejection Reason:</strong> ${rejectionReason || 'No reason provided'}
                </small>
            `;
            detailsContainer.appendChild(rejectionInfo);
        }

        // Update statistics counters
        this.updateAttendanceStatistics(newStatus);

        // Reapply filters to ensure the card visibility is correct
        this.applyFilters();
    },

    // Updates the attendance statistics cards at the top of the page
    updateAttendanceStatistics(newStatus) {
        const approvedStat = document.querySelector('.bg-primary .display-6');
        const pendingStat = document.querySelector('.bg-tertiary .display-6');
        
        if (approvedStat && pendingStat) {
            const currentApproved = parseInt(approvedStat.textContent) || 0;
            const currentPending = parseInt(pendingStat.textContent) || 0;

            if (newStatus === 'approved') {
                approvedStat.textContent = currentApproved + 1;
                pendingStat.textContent = Math.max(0, currentPending - 1);
            } else if (newStatus === 'rejected') {
                pendingStat.textContent = Math.max(0, currentPending - 1);
            }
        }
    },

    async removeAttendee(registrationId) {
        try {
            const result = await this.sendRequest(`/carnivals/${this.carnivalId}/attendees/${registrationId}`, 'DELETE');
            this.handleActionResult(result, 'Error removing club from carnival', () => {
                const card = document.querySelector(`[data-registration-id="${registrationId}"]`);
                if (card) card.remove();
            });
        } catch (error) {
            showAlert('danger', 'Error removing club from carnival');
        }
    },

    initializeRemoveActions() {
        document.querySelectorAll('.remove-attendee').forEach(button => {
            button.addEventListener('click', () => {
                if (confirm(`Are you sure you want to remove "${button.dataset.clubName}" from this carnival?`)) {
                    this.removeAttendee(button.dataset.registrationId);
                }
            });
        });
    },

    showRejectionModal(registrationId, clubName) {
        document.getElementById('rejectionClubName').textContent = clubName;
        document.getElementById('confirmRejectBtn').dataset.registrationId = registrationId;
        document.getElementById('rejectionReason').value = '';

        const modalElement = document.getElementById('rejectionModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    },

    // Handles the result from an API call.
    handleActionResult(result, errorMessage, onSuccess = null) {
        if (result.success) {
            // This now correctly calls the method on the same object.
            showAlert('success', result.message);
            if (onSuccess) onSuccess();
            // Remove the automatic page reload to allow for immediate UI updates
            // setTimeout(() => window.location.reload(), 1500);
        } else {
            showAlert('danger', result.message || errorMessage);
        }
    },
    
    // Sends an API request.
    async sendRequest(url, method, body = null) {
        const options = { 
            method, 
            headers: { 
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            } 
        };
        if (body) options.body = JSON.stringify(body);
        const response = await fetch(url, options);
        return response.json();
    }
};

// This part runs in the browser to initialize the application.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        const pathParts = window.location.pathname.split('/');
        const carnivalId = pathParts[2];
        attendeesManager.initialize(carnivalId);
    });
}
