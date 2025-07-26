/**
 * @file carnival-new.js
 * @description Handles file upload area interactions, MySideline link generation, and multi-day event functionality for carnival creation.
 * @module carnivalNewManager
 */

/**
 * Carnival New Manager Object
 * Encapsulates all logic for the carnival new page.
 */
export const carnivalNewManager = {
    elements: {},
    /**
     * Initialize the manager: cache DOM elements and bind events.
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initMySidelineButton();
        this.initMultiDayEvent();
    },

    /**
     * Cache all necessary DOM elements for efficient access.
     */
    cacheElements() {
        this.elements.fileUploadAreas = document.querySelectorAll('.file-upload-area');
        this.elements.titleInput = document.getElementById('title');
        this.elements.registrationLinkInput = document.getElementById('registrationLink');
        this.elements.mysidelineContainer = document.getElementById('mysidelineButtonContainer');
        this.elements.isMultiDayCheckbox = document.getElementById('isMultiDay');
        this.elements.endDateContainer = document.getElementById('endDateContainer');
        this.elements.endDateInput = document.getElementById('endDate');
        this.elements.dateLabel = document.getElementById('dateLabel');
        this.elements.startDateInput = document.getElementById('date');
        this.elements.forceCreate = document.getElementById('forceCreate');
        this.elements.carnivalForm = document.getElementById('carnivalForm');
    },

    /**
     * Bind all event listeners for the page.
     */
    bindEvents() {
        // Make file upload areas clickable
        this.elements.fileUploadAreas.forEach(area => {
            area.addEventListener('click', (event) => {
                const input = area.querySelector('input[type="file"]');
                if (input) input.click();
            });
        });

        // MySideline link generation functionality
        if (this.elements.titleInput && this.elements.mysidelineContainer) {
            this.elements.titleInput.addEventListener('input', this.handleTitleInput);
        }

        // Multi-day event functionality
        if (
            this.elements.isMultiDayCheckbox &&
            this.elements.endDateContainer &&
            this.elements.endDateInput &&
            this.elements.dateLabel &&
            this.elements.startDateInput
        ) {
            this.elements.isMultiDayCheckbox.addEventListener('change', this.handleMultiDayChange);
            this.elements.startDateInput.addEventListener('change', this.handleStartDateChange);
            this.elements.endDateInput.addEventListener('change', this.handleEndDateChange);
        }
    },

    /**
     * Show/hide MySideline button based on title input.
     */
    handleTitleInput: (event) => {
        const manager = carnivalNewManager;
        if (event.target.value.trim().length > 3) {
            manager.elements.mysidelineContainer.style.display = 'block';
        } else {
            manager.elements.mysidelineContainer.style.display = 'none';
        }
    },

    /**
     * Initialize MySideline button visibility on page load.
     */
    initMySidelineButton() {
        if (
            this.elements.titleInput &&
            this.elements.mysidelineContainer &&
            this.elements.titleInput.value.trim().length > 3
        ) {
            this.elements.mysidelineContainer.style.display = 'block';
        }
    },

    /**
     * Handle multi-day checkbox change event.
     */
    handleMultiDayChange: (event) => {
        const manager = carnivalNewManager;
        if (event.target.checked) {
            manager.elements.endDateContainer.style.display = 'block';
            manager.elements.dateLabel.textContent = 'Event Start Date *';
            manager.elements.endDateInput.required = true;
            manager.updateEndDateMin();
        } else {
            manager.elements.endDateContainer.style.display = 'none';
            manager.elements.dateLabel.textContent = 'Date *';
            manager.elements.endDateInput.required = false;
            manager.elements.endDateInput.value = '';
        }
    },

    /**
     * Handle start date change event.
     */
    handleStartDateChange: (event) => {
        const manager = carnivalNewManager;
        if (manager.elements.isMultiDayCheckbox.checked) {
            manager.updateEndDateMin();
        }
    },

    /**
     * Handle end date change event.
     */
    handleEndDateChange: (event) => {
        carnivalNewManager.validateEndDate();
    },

    /**
     * Set minimum end date to start date + 1 day.
     */
    updateEndDateMin() {
        const { startDateInput, endDateInput } = this.elements;
        if (startDateInput.value) {
            const startDate = new Date(startDateInput.value);
            startDate.setDate(startDate.getDate() + 1);
            const minEndDate = startDate.toISOString().split('T')[0];
            endDateInput.min = minEndDate;
            // If current end date is before new minimum, clear it
            if (endDateInput.value && endDateInput.value <= startDateInput.value) {
                endDateInput.value = minEndDate;
            }
        }
    },

    /**
     * Validate that end date is after start date.
     */
    validateEndDate() {
        const { endDateInput, startDateInput } = this.elements;
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

    /**
     * Initialize multi-day event fields on page load.
     */
    initMultiDayEvent() {
        if (this.elements.isMultiDayCheckbox && this.elements.isMultiDayCheckbox.checked) {
            this.elements.dateLabel.textContent = 'Event Start Date *';
            this.elements.endDateInput.required = true;
            this.updateEndDateMin();
        }
    },

    /**
     * Proceed anyway for duplicate warning handling.
     * Sets the hidden field to true and submits the form.
     */
    proceedAnyway() {
        this.elements.forceCreate.value = 'true';
        this.elements.carnivalForm.submit();
    },

    /**
     * Clear the carnival form fields.
     */
    clearForm() {
        this.elements.carnivalForm.reset();
    }
};

// At the bottom of the file: DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    carnivalNewManager.initialize();
});