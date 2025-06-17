/**
 * Carnival My Club Players JavaScript
 * Handles player management functionality for carnival club player assignments
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get carnival and registration IDs from the current URL or data attributes
    const pathParts = window.location.pathname.split('/');
    const carnivalId = pathParts[2]; // /carnivals/{id}/register/players
    
    // Get registration ID from a data attribute on the page
    const registrationElement = document.querySelector('[data-registration-id]');
    const registrationId = registrationElement ? registrationElement.dataset.registrationId : null;

    // Remove player functionality
    document.querySelectorAll('.remove-player-btn').forEach(button => {
        button.addEventListener('click', function() {
            const assignmentId = this.dataset.assignmentId;
            const playerName = this.dataset.playerName;
            
            if (confirm(`Are you sure you want to remove "${playerName}" from this carnival?`)) {
                removePlayer(assignmentId);
            }
        });
    });

    async function removePlayer(assignmentId) {
        if (!registrationId) {
            alert('Registration ID not found.');
            return;
        }

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

    // Modal functionality
    const modalCheckboxes = document.querySelectorAll('.modal-player-checkbox');
    const modalSubmitBtn = document.getElementById('modalSubmitBtn');
    const modalForm = document.getElementById('addPlayersForm');

    if (modalCheckboxes.length > 0) {
        // Update modal submit button state
        function updateModalSubmitButton() {
            const selectedCount = document.querySelectorAll('.modal-player-checkbox:checked').length;
            if (modalSubmitBtn) {
                modalSubmitBtn.disabled = selectedCount === 0;
                modalSubmitBtn.innerHTML = selectedCount > 0 
                    ? `<i class="bi bi-plus-circle"></i> Add ${selectedCount} Player${selectedCount > 1 ? 's' : ''}`
                    : '<i class="bi bi-plus-circle"></i> Add Selected Players';
            }
        }

        // Add event listeners to modal checkboxes
        modalCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateModalSubmitButton);
        });

        // Modal select all/none functions
        window.selectAllModal = function() {
            modalCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            updateModalSubmitButton();
        };

        window.selectNoneModal = function() {
            modalCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            updateModalSubmitButton();
        };

        // Form validation
        if (modalForm) {
            modalForm.addEventListener('submit', function(e) {
                const selectedCount = document.querySelectorAll('.modal-player-checkbox:checked').length;
                if (selectedCount === 0) {
                    e.preventDefault();
                    alert('Please select at least one player to add.');
                    return false;
                }
            });
        }

        // Initial state
        updateModalSubmitButton();
    }
});