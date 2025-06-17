/**
 * Carnival Add Players JavaScript
 * Handles player selection, form validation, and interactions for adding players to carnival registrations
 */

document.addEventListener('DOMContentLoaded', function() {
    const checkboxes = document.querySelectorAll('.player-checkbox');
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('addPlayersForm');

    // Update submit button state based on selections
    function updateSubmitButton() {
        const selectedCount = document.querySelectorAll('.player-checkbox:checked').length;
        submitBtn.disabled = selectedCount === 0;
        submitBtn.innerHTML = selectedCount > 0 
            ? `<i class="bi bi-plus-circle"></i> Add ${selectedCount} Selected Player${selectedCount > 1 ? 's' : ''}`
            : '<i class="bi bi-plus-circle"></i> Add Selected Players';
    }

    // Add event listeners to checkboxes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSubmitButton);
    });

    // Select all functionality
    window.selectAll = function() {
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        updateSubmitButton();
    };

    // Select none functionality
    window.selectNone = function() {
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        updateSubmitButton();
    };

    // Form submission validation
    if (form) {
        form.addEventListener('submit', function(e) {
            const selectedCount = document.querySelectorAll('.player-checkbox:checked').length;
            if (selectedCount === 0) {
                e.preventDefault();
                alert('Please select at least one player to add.');
                return false;
            }
        });
    }

    // Initial state
    updateSubmitButton();
});