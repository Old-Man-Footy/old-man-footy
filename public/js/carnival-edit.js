/**
 * Carnival Edit JavaScript
 * Handles file upload area interactions and multi-day carnival functionality for the carnival edit page.
 * Refactored into a testable object pattern.
 */

export const carnivalEditManager = {
    // DOM element references
    elements: {},

    // Initializes the entire manager.
    initialize() {
        this.cacheDOMElements();
        this.initializePageStyling();
        this.initializeFileUploads();
        this.initializeMultiDayCarnivalFunctionality();
        this.initializeMySidelineIntegration();
    },

    // Caches frequently accessed DOM elements for performance and convenience.
    cacheDOMElements() {
        this.elements = {
            endDateContainer: document.getElementById('endDateContainer'),
            logoPreviewImages: document.querySelectorAll('.carnival-logo-preview'),
            promoPreviewImages: document.querySelectorAll('.carnival-promo-preview'),
            fileInputs: document.querySelectorAll('.file-input-hidden'),
            fileUploadAreas: document.querySelectorAll('.file-upload-area'),
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

    // Sets initial styles and visibility for page elements.
    initializePageStyling() {
        if (this.elements.endDateContainer) {
            const hasEndDate = this.elements.endDateContainer.dataset.hasEndDate === 'true';
            if (!hasEndDate) {
                this.elements.endDateContainer.style.display = 'none';
            }
        }
        this.elements.logoPreviewImages.forEach(img => {
            img.style.height = '150px';
            img.style.objectFit = 'contain';
        });
        this.elements.promoPreviewImages.forEach(img => {
            img.style.height = '150px';
            img.style.objectFit = 'cover';
        });
        this.elements.fileInputs.forEach(input => {
            input.style.display = 'none';
        });
    },

    // Makes file upload areas clickable.
    initializeFileUploads() {
        this.elements.fileUploadAreas.forEach(area => {
            area.addEventListener('click', this.handleFileAreaClick);
        });
    },

    // Handle click on a file upload area using an arrow function for proper scoping.
    // Handle click on a file upload area using a regular function for proper `this` binding.
    handleFileAreaClick: function(carnival) {
        const area = carnival.currentTarget;
        const input = area?.querySelector('input[type="file"]');
        if (input) input.click();
    },

    // Sets up carnival listeners and logic for multi-day events.
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

    // Sets up carnival listeners and logic for MySideline integration.
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
                this.updateRegistrationLink(url, '✓ Custom registration link', 'text-info');
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
});
