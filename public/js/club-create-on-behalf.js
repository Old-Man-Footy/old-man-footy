/**
 * Club Create On Behalf JavaScript
 * Handles form validation and interaction for creating clubs on behalf of others
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const stateSelect = document.getElementById('state');
    const inviteEmailInput = document.getElementById('inviteEmail');
    const customMessageTextarea = document.getElementById('customMessage');

    // Get user email from data attribute if available
    const userEmailElement = document.querySelector('[data-user-email]');
    const userEmail = userEmailElement ? userEmailElement.dataset.userEmail : '';

    // Get available states from data attribute
    const statesElement = document.querySelector('[data-states]');
    const availableStates = statesElement ? JSON.parse(statesElement.dataset.states) : [];

    // State selection - preselect based on user's location (if available)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // Reverse geocoding to get state from latitude and longitude
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLng}&format=json`)
                .then(response => response.json())
                .then(data => {
                    const userState = data.address.state;
                    // Check if the state is in the predefined list
                    availableStates.forEach(state => {
                        if (userState && userState.toLowerCase() === state.toLowerCase()) {
                            stateSelect.value = state;
                        }
                    });
                })
                .catch(err => console.error('Error fetching state from location:', err));
        });
    }

    // Invite email - prefill based on user's email (if logged in)
    if (userEmail && !inviteEmailInput.value) {
        inviteEmailInput.value = userEmail;
        if (!customMessageTextarea.value) {
            customMessageTextarea.value = `Hi, I've created a profile for your club on Old Man Footy. This platform helps connect Masters Rugby League clubs across Australia for carnivals and events. Would you like to take ownership of your club's profile?`;
        }
    }

    // Form submission handler
    if (form) {
        form.addEventListener('submit', function(event) {
            // Basic client-side validation
            let isValid = true;
            const requiredFields = ['clubName', 'state', 'inviteEmail'];
            
            requiredFields.forEach(field => {
                const input = document.querySelector(`[name="${field}"]`);
                if (input && !input.value.trim()) {
                    isValid = false;
                    input.classList.add('is-invalid');
                } else if (input) {
                    input.classList.remove('is-invalid');
                }
            });

            if (!isValid) {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
});