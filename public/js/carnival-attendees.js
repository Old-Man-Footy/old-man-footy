/**
 * Carnival Attendees JavaScript
 * Handles attendee removal and management functionality for carnival attendees page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get carnival ID from the current URL
    const pathParts = window.location.pathname.split('/');
    const carnivalId = pathParts[2]; // /carnivals/{id}/attendees

    // Remove attendee functionality
    document.querySelectorAll('.remove-attendee').forEach(button => {
        button.addEventListener('click', function() {
            const registrationId = this.dataset.registrationId;
            const clubName = this.dataset.clubName;
            
            if (confirm(`Are you sure you want to remove "${clubName}" from this carnival?`)) {
                removeAttendee(registrationId);
            }
        });
    });

    async function removeAttendee(registrationId) {
        try {
            const response = await fetch(`/carnivals/${carnivalId}/attendees/${registrationId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                location.reload(); // Refresh to show updated list
            } else {
                alert(result.message || 'Error removing club from carnival');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error removing club from carnival');
        }
    }

    // Sortable functionality for reordering (if needed in future)
    // This would require additional JavaScript library like SortableJS
});