/**
 * Carnival Edit JavaScript
 * Handles file upload area interactions and multi-day carnival functionality for the carnival edit page.
 * Refactored into a testable object pattern.
 */

import { showAlert } from './utils/ui-helpers.js';
import { imageUploaderManager } from './image-uploader.js';

export const carnivalEditManager = {
    // DOM element references
    elements: {},
    
    // Initializes the entire manager.
    initialize() {
        this.cacheDOMElements();
        this.bindEvents();
        this.initializePageStyling();
        this.initializeMultiDayCarnivalFunctionality();
        this.initializeMySidelineIntegration();
    },

    // Caches frequently accessed DOM elements for performance and convenience.
    cacheDOMElements() {
        this.elements = {
            endDateContainer: document.getElementById('endDateContainer'),
            isMultiDayCheckbox: document.getElementById('isMultiDay'),
            endDateInput: document.getElementById('endDate'),
            dateLabel: document.getElementById('dateLabel'),
            startDateInput: document.getElementById('date'),
            mySidelineIdInput: document.getElementById('mySidelineId'),
            registrationLinkInput: document.getElementById('registrationLink'),
            linkStatusElement: document.getElementById('linkStatus'),
            testLinkBtn: document.getElementById('testLinkBtn'),
            form: document.querySelector('form[data-mysideline-carnival-url]'),
        };
    },

    // Binds event listeners for form submission
    bindEvents() {
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }
    },

    // Handles form submission with AJAX and file upload
    async handleFormSubmit() {
        try {
            const formData = new FormData(this.elements.form);
            
            const response = await fetch(this.elements.form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            if (response.redirected) {
                // Follow the redirect for successful submissions
                window.location.href = response.url;
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Form submission failed:', errorText);
                showAlert('An error occurred while updating the carnival. Please try again.');
                return;
            }

            // Handle successful response
            const result = await response.json();
            if (result.success) {
                window.location.href = result.redirectUrl || '/admin/carnivals';
            } else {
                showAlert(result.message || 'An error occurred while updating the carnival.');
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            showAlert('An error occurred while updating the carnival. Please try again.');
        }
    },

    // Sets initial styles and visibility for page elements.
    initializePageStyling() {
        if (this.elements.endDateContainer) {
            const hasEndDate = this.elements.endDateContainer.dataset.hasEndDate === 'true';
            if (!hasEndDate) {
                this.elements.endDateContainer.style.display = 'none';
            }
        }
    },

    // Sets up event listeners and logic for file upload areas. // Sets up event listeners and logic for multi-day carnivals.
    initializeMultiDayCarnivalFunctionality() {
        const { isMultiDayCheckbox, endDateContainer, endDateInput, dateLabel, startDateInput } = this.elements;
        if (!isMultiDayCheckbox || !endDateContainer || !endDateInput || !dateLabel || !startDateInput) return;

        isMultiDayCheckbox.addEventListener('change', () => this.toggleEndDateVisibility());
        startDateInput.addEventListener('change', () => {
            if (isMultiDayCheckbox.checked) this.updateEndDateMin();
        });
        endDateInput.addEventListener('change', () => this.validateEndDate());

        if (isMultiDayCheckbox.checked) {
            this.toggleEndDateVisibility(true);
        }
    },

    // Toggles the visibility and requirement of the end date field.
    toggleEndDateVisibility(isInitialLoad = false) {
        const { isMultiDayCheckbox, endDateContainer, endDateInput, dateLabel } = this.elements;
        const isChecked = isMultiDayCheckbox.checked;

        endDateContainer.style.display = isChecked ? 'block' : 'none';
        dateLabel.textContent = isChecked ? 'Carnival Start Date *' : 'Date *';
        endDateInput.required = isChecked;

        if (isChecked) {
            this.updateEndDateMin();
        } else if (!isInitialLoad) {
            endDateInput.value = '';
        }
    },

    // Updates the minimum allowed value for the end date input.
    updateEndDateMin() {
        const { startDateInput, endDateInput } = this.elements;
        if (startDateInput.value) {
            const startDate = new Date(startDateInput.value);
            startDate.setDate(startDate.getDate() + 1);
            const minEndDate = startDate.toISOString().split('T')[0];
            endDateInput.min = minEndDate;
            if (endDateInput.value && endDateInput.value <= startDateInput.value) {
                endDateInput.value = minEndDate;
            }
        }
    },

    // Validates that the end date is after the start date.
    validateEndDate() {
        const { startDateInput, endDateInput } = this.elements;
        if (endDateInput.value && startDateInput.value) {
            if (endDateInput.value <= startDateInput.value) {
                endDateInput.setCustomValidity('End date must be after the start date');
                endDateInput.classList.add('is-invalid');
            } else {
                endDateInput.setCustomValidity('');
                endDateInput.classList.remove('is-invalid');
            }
        }
    },

    // Sets up event listeners and logic for MySideline integration.
    initializeMySidelineIntegration() {
        const { mySidelineIdInput, registrationLinkInput } = this.elements;
        if (!mySidelineIdInput || !registrationLinkInput) return;

        mySidelineIdInput.addEventListener('input', () => this.handleMySidelineIdChange());
        registrationLinkInput.addEventListener('input', () => this.handleRegistrationLinkChange());

        if (mySidelineIdInput.value) {
            this.handleMySidelineIdChange();
        } else if (registrationLinkInput.value) {
            this.handleRegistrationLinkChange();
        }
    },

    // Handles changes to the MySideline ID input.
    handleMySidelineIdChange() {
        const { mySidelineIdInput } = this.elements;
        const eventId = mySidelineIdInput.value.trim();
        if (!eventId) {
            this.updateRegistrationLink('', 'Player registration link - will auto-update when MySideline ID is entered');
            return;
        }
        const cleanId = eventId.replace(/\D/g, '');
        if (!cleanId) {
            this.updateRegistrationLink('', 'Please enter a valid numeric MySideline carnival ID', 'text-warning');
            return;
        }
        if (cleanId !== eventId) {
            mySidelineIdInput.value = cleanId;
        }
        const mySidelineUrl = this.generateMySidelineUrl(cleanId);
        this.updateRegistrationLink(mySidelineUrl, `✓ Registration link auto-generated from MySideline carnival ${cleanId}`, 'text-success');
    },

    // Handles changes to the registration link input.
    handleRegistrationLinkChange() {
        const { registrationLinkInput, linkStatusElement, testLinkBtn, mySidelineIdInput } = this.elements;
        const url = registrationLinkInput.value.trim();
        if (!url) {
            this.updateRegistrationLink('', 'Player registration link - will auto-update when MySideline ID is entered');
            return;
        }
        if (this.isValidUrl(url)) {
            const mySidelineMatch = url.match(/mysideline\.com\/register\/(\d+)/);
            if (mySidelineMatch) {
                const extractedId = mySidelineMatch[1];
                this.updateRegistrationLink(url, `✓ MySideline registration link (Carnival ID: ${extractedId})`, 'text-success');
                if (!mySidelineIdInput.value || mySidelineIdInput.value !== extractedId) {
                    mySidelineIdInput.value = extractedId;
                }
            } else {
                this.updateRegistrationLink(url, '✓ Custom registration link', 'text-dark');
            }
        } else {
            this.updateRegistrationLink(url, '⚠ Please enter a valid URL', 'text-warning');
        }
    },

    // Generates a MySideline URL from an carnival ID.
    generateMySidelineUrl(eventId) {
        const { form } = this.elements;
        const mySidelineBaseUrl = form ? form.dataset.mysidelineCarnivalUrl : '';
        if (!eventId || !mySidelineBaseUrl) return '';
        return `${mySidelineBaseUrl}${eventId}`;
    },

    // Updates the registration link field and its status message.
    updateRegistrationLink(url, status, statusClass = 'text-muted') {
        const { registrationLinkInput, linkStatusElement, testLinkBtn } = this.elements;
        
        if (registrationLinkInput) {
            registrationLinkInput.value = url;
        }
        
        if (linkStatusElement) {
            linkStatusElement.textContent = status;
            linkStatusElement.className = `form-text ${statusClass}`;
        }
        
        if (testLinkBtn) {
            if (url && this.isValidUrl(url)) {
                testLinkBtn.style.display = 'block';
                testLinkBtn.onclick = () => window.open(url, '_blank');
            } else {
                testLinkBtn.style.display = 'none';
            }
        }
    },

    // Validates if a string is a valid URL.
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
};

// This part runs in the browser to initialize the application.
document.addEventListener('DOMContentLoaded', () => {
    carnivalEditManager.initialize();
    imageUploaderManager.initialize();
});
