/**
 * Club Create On Behalf (Manager Object Pattern)
 * Handles form validation and interaction for creating clubs on behalf of others
 */
export const clubCreateOnBehalfManager = {
    elements: {},
    state: {
        availableStates: [],
        userEmail: '',
    },

    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.readDatasets();
        this.prefillFromUserEmail();
        this.tryPrefillStateFromGeolocation();
    },

    cacheElements() {
        this.elements.form = document.querySelector('form');
        this.elements.stateSelect = document.getElementById('state');
        this.elements.inviteEmailInput = document.getElementById('inviteEmail');
        this.elements.customMessageTextarea = document.getElementById('customMessage');
        this.elements.userEmailElement = document.querySelector('[data-user-email]');
        this.elements.statesElement = document.querySelector('[data-states]');
    },

    bindEvents() {
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', this.handleFormSubmit);
        }
    },

    readDatasets() {
        const el = this.elements;
        this.state.userEmail = el.userEmailElement?.dataset?.userEmail || '';
        try {
            this.state.availableStates = el.statesElement?.dataset?.states
                ? JSON.parse(el.statesElement.dataset.states)
                : [];
        } catch (e) {
            console.warn('Invalid states dataset payload:', e);
            this.state.availableStates = [];
        }
    },

    prefillFromUserEmail() {
        const el = this.elements;
        if (this.state.userEmail && el.inviteEmailInput && !el.inviteEmailInput.value) {
            el.inviteEmailInput.value = this.state.userEmail;
            if (el.customMessageTextarea && !el.customMessageTextarea.value) {
                el.customMessageTextarea.value = `Hi, I've created a profile for your club on Old Man Footy. This platform helps connect Masters Rugby League clubs across Australia for carnivals and events. Would you like to take ownership of your club's profile?`;
            }
        }
    },

    tryPrefillStateFromGeolocation() {
        const el = this.elements;
        if (!el.stateSelect || !Array.isArray(this.state.availableStates) || this.state.availableStates.length === 0) return;
        if (typeof navigator === 'undefined' || !navigator.geolocation?.getCurrentPosition) return;
        try {
            navigator.geolocation.getCurrentPosition((position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLng}&format=json`)
                    .then((response) => response.json())
                    .then((data) => {
                        const userState = data?.address?.state;
                        if (!userState) return;
                        this.state.availableStates.forEach((state) => {
                            if (userState && userState.toLowerCase() === String(state).toLowerCase()) {
                                el.stateSelect.value = state;
                            }
                        });
                    })
                    .catch((err) => console.error('Error fetching state from location:', err));
            });
        } catch (err) {
            // Silently ignore geolocation errors in unsupported environments
        }
    },

    handleFormSubmit: (carnival) => {
        const isValid = clubCreateOnBehalfManager.validateRequiredFields(['clubName', 'state', 'inviteEmail']);
        if (!isValid) {
            carnival.preventDefault?.();
            try {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (_) {
                // ignore in non-browser environments
            }
        }
    },

    validateRequiredFields(requiredFields) {
        let allValid = true;
        requiredFields.forEach((field) => {
            const input = document.querySelector(`[name="${field}"]`);
            if (input && !String(input.value || '').trim()) {
                allValid = false;
                input.classList.add('is-invalid');
            } else if (input) {
                input.classList.remove('is-invalid');
            }
        });
        return allValid;
    },
};

// Bootstrap in the browser
document.addEventListener('DOMContentLoaded', () => {
    clubCreateOnBehalfManager.initialize();
});