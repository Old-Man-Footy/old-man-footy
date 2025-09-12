/**
 * Carnival Attendees JavaScript
 * Handles attendee removal, approval/rejection, and filtering functionality.
 * Refactored into a testable object pattern.
 */

export const attendeesManager = {
    carnivalId: null,

    // Initializes the manager with the carnival ID and sets up carnival listeners.
    initialize(carnivalId) {
        this.carnivalId = carnivalId;
        this.initializeFiltering();
        this.initializeApprovalActions();
        this.initializeRemoveActions();
    },

    // Sets up carnival listeners for the filter radio buttons.
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

    // Sets up carnival listeners for approve/reject buttons.
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
            this.handleActionResult(result, 'Error approving registration');
        } catch (error) {
            this.showAlert('danger', 'Error approving registration');
        }
    },
    
    // ... other action methods (reject, remove)
    async rejectRegistration(registrationId, rejectionReason) {
        try {
            const result = await this.sendRequest(`/carnivals/${this.carnivalId}/attendees/${registrationId}/reject`, 'POST', { rejectionReason });
            this.handleActionResult(result, 'Error rejecting registration');
        } catch (error) {
            this.showAlert('danger', 'Error rejecting registration');
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
            this.showAlert('danger', 'Error removing club from carnival');
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
            this.showAlert('success', result.message);
            if (onSuccess) onSuccess();
            setTimeout(() => window.location.reload(), 1500);
        } else {
            this.showAlert('danger', result.message || errorMessage);
        }
    },

    // Displays a floating alert message.
    showAlert(type, message) {
        document.querySelectorAll('.alert-floating').forEach(alert => alert.remove());
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show alert-floating`;
        alert.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 9999;`;
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    },
    
    // Sends an API request.
    async sendRequest(url, method, body = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
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
