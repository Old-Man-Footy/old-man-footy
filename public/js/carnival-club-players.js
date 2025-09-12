/**
 * Carnival Club Players JavaScript
 * Handles player status updates and removal functionality for carnival club players page.
 * Refactored into a testable object pattern.
 */

export const clubPlayersManager = {
    carnivalId: null,
    registrationId: null,
    currentAssignmentId: null,

    // Initializes the manager with necessary IDs and sets up carnival listeners.
    initialize(carnivalId, registrationId) {
        this.carnivalId = carnivalId;
        this.registrationId = registrationId;
        this.initializeStatusUpdateListeners();
        this.initializeRemovePlayerListeners();
    },

    // Sets up carnival listeners for all 'Update Status' buttons.
    initializeStatusUpdateListeners() {
        document.querySelectorAll('.update-status-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const { assignmentId, currentStatus, playerName } = e.currentTarget.dataset;
                this.openUpdateStatusModal(assignmentId, currentStatus, playerName);
            });
        });

        const updateStatusForm = document.getElementById('updateStatusForm');
        if (updateStatusForm) {
            updateStatusForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleStatusUpdateSubmit(new FormData(updateStatusForm));
            });
        }
    },

    // Opens the modal and populates it with the correct player's data.
    openUpdateStatusModal(assignmentId, currentStatus, playerName) {
        this.currentAssignmentId = assignmentId;
        document.getElementById('attendanceStatus').value = currentStatus;
        document.querySelector('#updateStatusModal .modal-title').textContent = `Update Status - ${playerName}`;
        
        const modalElement = document.getElementById('updateStatusModal');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    },

    // **THE FIX IS HERE:** Reverted to async/await for clearer, more testable code.
    async handleStatusUpdateSubmit(formData) {
        const data = {
            attendanceStatus: formData.get('attendanceStatus'),
            notes: formData.get('notes')
        };
        const url = `/carnivals/${this.carnivalId}/attendees/${this.registrationId}/players/${this.currentAssignmentId}/status`;

        try {
            const result = await this.sendRequest(url, 'POST', data);
            if (result.success) {
                window.location.reload();
            } else {
                window.alert(`Error: ${result.message}`);
            }
        } catch (error) {
            window.alert('An error occurred while updating the status.');
        }
    },

    // Sets up carnival listeners for all 'Remove Player' buttons.
    initializeRemovePlayerListeners() {
        document.querySelectorAll('.remove-player-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const { assignmentId, playerName } = e.currentTarget.dataset;
                if (confirm(`Are you sure you want to remove "${playerName}" from this carnival registration?`)) {
                    this.removePlayer(assignmentId);
                }
            });
        });
    },

    // **THE FIX IS HERE:** Reverted to async/await for clearer, more testable code.
    async removePlayer(assignmentId) {
        const url = `/carnivals/${this.carnivalId}/attendees/${this.registrationId}/players/${assignmentId}`;
        try {
            const result = await this.sendRequest(url, 'DELETE');
            if (result.success) {
                window.location.reload();
            } else {
                window.alert(`Error: ${result.message}`);
            }
        } catch (error) {
            window.alert('An error occurred while removing the player.');
        }
    },
    
    // A generic helper function for making API requests.
    async sendRequest(url, method, body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        return response.json();
    }
};

// This part runs in the browser to initialize the application.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const pathParts = window.location.pathname.split('/');
        const carnivalId = pathParts[2];
        const registrationId = pathParts[4];
        clubPlayersManager.initialize(carnivalId, registrationId);
    });
}
