/**
 * Add Club Auto-Populate JavaScript
 * Handles auto-population of team name and contact information when a club is selected.
 * Refactored into a testable object pattern.
 */

export const addClubManager = {
    // An object to hold references to DOM elements
    elements: {},

    /**
     * Initializes the manager by caching DOM elements and setting up event listeners.
     */
    initialize() {
        this.cacheElements();
        
        if (this.elements.clubSelect) {
            this.elements.clubSelect.addEventListener('change', (e) => this.handleClubChange(e.target));
        }
    },

    /**
     * Finds and stores all necessary DOM elements for easy access.
     */
    cacheElements() {
        this.elements = {
            clubSelect: document.getElementById('clubId'),
            teamNameInput: document.getElementById('teamName'),
            contactPersonInput: document.getElementById('contactPerson'),
            contactEmailInput: document.getElementById('contactEmail'),
            contactPhoneInput: document.getElementById('contactPhone')
        };
    },

    /**
     * Handles the 'change' event on the club select dropdown.
     * @param {HTMLSelectElement} selectElement - The select element that triggered the change.
     */
    handleClubChange(selectElement) {
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        
        if (!selectedOption || selectedOption.value === '') {
            this.clearAutoPopulatedFields();
            return;
        }

        const data = {
            clubName: selectedOption.getAttribute('data-club-name') || '',
            contactPerson: selectedOption.getAttribute('data-contact-person') || '',
            contactEmail: selectedOption.getAttribute('data-contact-email') || '',
            contactPhone: selectedOption.getAttribute('data-contact-phone') || ''
        };

        this.populateFields(data);
    },

    /**
     * Populates the form fields with data from the selected club.
     * @param {object} data - An object containing the club's data.
     */
    populateFields(data) {
        this.updateField(this.elements.teamNameInput, data.clubName);
        this.updateField(this.elements.contactPersonInput, data.contactPerson);
        this.updateField(this.elements.contactEmailInput, data.contactEmail);
        this.updateField(this.elements.contactPhoneInput, data.contactPhone);
    },

    /**
     * A helper function to update a single field's value and add a temporary highlight class.
     * @param {HTMLInputElement} field - The input field to update.
     * @param {string} value - The new value for the field.
     */
    updateField(field, value) {
        if (field && value) {
            field.value = value;
            field.classList.add('auto-populated');
            setTimeout(() => field.classList.remove('auto-populated'), 2000);
        }
    },

    /**
     * Clears all auto-populated fields.
     */
    clearAutoPopulatedFields() {
        const fields = [
            this.elements.teamNameInput,
            this.elements.contactPersonInput,
            this.elements.contactEmailInput,
            this.elements.contactPhoneInput
        ];
        fields.forEach(field => {
            if (field) {
                field.value = '';
                field.classList.remove('auto-populated');
            }
        });
    }
};

// This part runs in the browser to initialize the application.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        addClubManager.initialize();
    });
}
