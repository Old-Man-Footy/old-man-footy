/**
 * Carnival Club Players JavaScript
 * Handles player status updates and removal functionality for carnival club players page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get carnival and registration IDs from the current URL
    const pathParts = window.location.pathname.split('/');
    const carnivalId = pathParts[2]; // /carnivals/{id}/attendees/{regId}/players
    const registrationId = pathParts[4];
    
    let currentAssignmentId = null;

    // Update status functionality
    document.querySelectorAll('.update-status-btn').forEach(button => {
        button.addEventListener('click', function() {
            currentAssignmentId = this.dataset.assignmentId;
            const currentStatus = this.dataset.currentStatus;
            const playerName = this.dataset.playerName;
            
            document.getElementById('attendanceStatus').value = currentStatus;
            document.querySelector('#updateStatusModal .modal-title').textContent = `Update Status - ${playerName}`;
            
            const modal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
            modal.show();
        });
    });

    // Handle status update form submission
    const updateStatusForm = document.getElementById('updateStatusForm');
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = {
                attendanceStatus: formData.get('attendanceStatus'),
                notes: formData.get('notes')
            };

            try {
                const response = await fetch(`/carnivals/${carnivalId}/attendees/${registrationId}/players/${currentAssignmentId}/status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                
                if (result.success) {
                    location.reload(); // Refresh to show updated status
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while updating the status.');
            }
        });
    }

    // Remove player functionality
    document.querySelectorAll('.remove-player-btn').forEach(button => {
        button.addEventListener('click', function() {
            const assignmentId = this.dataset.assignmentId;
            const playerName = this.dataset.playerName;
            
            if (confirm(`Are you sure you want to remove "${playerName}" from this carnival registration?`)) {
                removePlayer(assignmentId);
            }
        });
    });

    async function removePlayer(assignmentId) {
        try {
            const response = await fetch(`/carnivals/${carnivalId}/attendees/${registrationId}/players/${assignmentId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                location.reload(); // Refresh to show updated list
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while removing the player.');
        }
    }
});