/**
 * Carnival Edit Registration JavaScript
 * Handles registration removal functionality for the carnival edit registration page.
 * Refactored into a testable object pattern.
 */

import { showAlert } from './utils/ui-helpers.js';

export const editRegistrationManager = {
    carnivalId: null,

    // Initializes the manager with the carnival ID and sets up the event listener.
    initialize(carnivalId) {
        this.carnivalId = carnivalId;
        const removeButton = document.querySelector('.remove-registration');
        if (removeButton) {
            removeButton.addEventListener('click', (e) => {
                this.handleRemoveClick(e.currentTarget);
            });
        }
    },

    // Handles the click carnival on the remove button.
    handleRemoveClick(button) {
        const { registrationId, clubName } = button.dataset;
        if (confirm(`Are you sure you want to remove "${clubName}" from this carnival?`)) {
            this.removeRegistration(registrationId);
        }
    },

    // Performs the API call to remove the registration.
    async removeRegistration(registrationId) {
        try {
            const result = await this.sendRequest(`/carnivals/${this.carnivalId}/attendees/${registrationId}`, 'DELETE');
            
            if (result.success) {
                // On success, redirect to the attendees page.
                window.location.href = `/carnivals/${this.carnivalId}/attendees`;
            } else {
               showAlert(result.message || 'Error removing registration');
            }
        } catch (error) {
            console.error('Error:', error);
           showAlert('An error occurred while removing the registration.');
        }
    },

    // A generic helper function for making API requests.
    async sendRequest(url, method, body = null) {
        const options = {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
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
        const carnivalId = pathParts[2]; // Assumes URL structure: /carnivals/{id}/...
        editRegistrationManager.initialize(carnivalId);
    });
}
