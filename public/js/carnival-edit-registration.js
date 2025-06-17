/**
 * Carnival Edit Registration JavaScript
 * Handles registration removal functionality for carnival edit registration page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get carnival ID from the current URL
    const pathParts = window.location.pathname.split('/');
    const carnivalId = pathParts[2]; // /carnivals/{id}/attendees/{regId}/edit

    // Remove registration functionality
    document.querySelector('.remove-registration')?.addEventListener('click', function() {
        const registrationId = this.dataset.registrationId;
        const clubName = this.dataset.clubName;
        
        if (confirm(`Are you sure you want to remove "${clubName}" from this carnival?`)) {
            removeRegistration(registrationId);
        }
    });

    async function removeRegistration(registrationId) {
        try {
            const response = await fetch(`/carnivals/${carnivalId}/attendees/${registrationId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.location.href = `/carnivals/${carnivalId}/attendees`;
            } else {
                alert(result.message || 'Error removing registration');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error removing registration');
        }
    }
});