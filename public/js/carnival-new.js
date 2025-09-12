/**
 * Carnival New JavaScript
 * Handles file upload area interactions, MySideline link generation, and multi-day carnival functionality
 * Refactored to the Manager Object Pattern per repository standards.
 */

/**
 * Encapsulates all behaviour for the Carnival New page.
 * - Use initialize() to set up the module.
 * - Carnival handlers are arrow functions and reference carnivalNewManager directly.
 */
export const carnivalNewManager = {
    /** Cached DOM elements */
    elements: {},

    /** Entry point: cache elements, bind events, and perform initial UI state updates. */
    initialize() {
        this.cacheElements();
        this.bindEvents();

        // Initial MySideline visibility
        this.toggleMysidelineButtonVisibility();

        // Initialize multi-day UI if applicable
        if (
            this.elements.isMultiDay &&
            this.elements.endDateContainer &&
            this.elements.endDateInput &&
            this.elements.dateLabel
        ) {
            if (this.elements.isMultiDay.checked) {
                this.elements.dateLabel.textContent = 'Carnival Start Date *';
                this.elements.endDateInput.required = true;
                this.elements.endDateContainer.style.display = 'block';
                this.updateEndDateMin();
            } else {
                // Ensure proper initial state when not a multi-day carnival
                this.elements.endDateContainer.style.display = 'none';
                this.elements.dateLabel.textContent = 'Date *';
                this.elements.endDateInput.required = false;
            }
        }

        // Backwards compatibility: expose commonly used functions on window
        // Remove these when templates stop referencing global functions.
        // eslint-disable-next-line no-undef
        window.proceedAnyway = carnivalNewManager.proceedAnyway;
        // eslint-disable-next-line no-undef
        window.clearForm = carnivalNewManager.clearForm;
    },

    /** Find and cache required DOM elements. */
    cacheElements() {
        const d = document;
        this.elements.fileUploadAreas = Array.from(d.querySelectorAll('.file-upload-area'));
        this.elements.title = d.getElementById('title');
        this.elements.registrationLink = d.getElementById('registrationLink');
        this.elements.mysidelineContainer = d.getElementById('mysidelineButtonContainer');
        this.elements.isMultiDay = d.getElementById('isMultiDay');
        this.elements.endDateContainer = d.getElementById('endDateContainer');
        this.elements.endDateInput = d.getElementById('endDate');
        this.elements.dateLabel = d.getElementById('dateLabel');
        this.elements.startDateInput = d.getElementById('date');
        this.elements.forceCreate = d.getElementById('forceCreate');
        this.elements.carnivalForm = d.getElementById('carnivalForm');
    },

    /** Attach carnival listeners. */
    bindEvents() {
        // Make file upload areas clickable
        if (this.elements.fileUploadAreas?.length) {
            this.elements.fileUploadAreas.forEach((area) =>
                area.addEventListener('click', carnivalNewManager.handleFileUploadAreaClick)
            );
        }

        // MySideline visibility when title changes
        if (this.elements.title && this.elements.mysidelineContainer) {
            this.elements.title.addEventListener('input', carnivalNewManager.handleTitleInput);
        }

        // Multi-day carnival interactions
        if (
            this.elements.isMultiDay &&
            this.elements.endDateContainer &&
            this.elements.endDateInput &&
            this.elements.dateLabel
        ) {
            this.elements.isMultiDay.addEventListener('change', carnivalNewManager.handleMultiDayToggle);

            if (this.elements.startDateInput) {
                this.elements.startDateInput.addEventListener('change', carnivalNewManager.handleStartDateChange);
            }

            this.elements.endDateInput.addEventListener('change', carnivalNewManager.handleEndDateChange);
        }
    },

    /** File upload area click handler: forwards click to the hidden file input. */
    handleFileUploadAreaClick: (carnival) => {
        const area = carnival.currentTarget;
        const input = area?.querySelector('input[type="file"]');
        if (input) input.click();
    },

    /** Title input handler. */
    handleTitleInput: () => {
        carnivalNewManager.toggleMysidelineButtonVisibility();
    },

    /** Show/hide the MySideline button container based on title length. */
    toggleMysidelineButtonVisibility() {
        const titleEl = this.elements.title;
        const container = this.elements.mysidelineContainer;
        if (!titleEl || !container) return;
        if (titleEl.value.trim().length > 3) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    },

    /** Multi-day checkbox toggle handler. */
    handleMultiDayToggle: () => {
        const els = carnivalNewManager.elements;
        if (!els.endDateContainer || !els.endDateInput || !els.dateLabel || !els.isMultiDay) return;
        if (els.isMultiDay.checked) {
            els.endDateContainer.style.display = 'block';
            els.dateLabel.textContent = 'Carnival Start Date *';
            els.endDateInput.required = true;
            carnivalNewManager.updateEndDateMin();
        } else {
            els.endDateContainer.style.display = 'none';
            els.dateLabel.textContent = 'Date *';
            els.endDateInput.required = false;
            els.endDateInput.value = '';
        }
    },

    /** Start date change handler. */
    handleStartDateChange: () => {
        if (carnivalNewManager.elements.isMultiDay?.checked) {
            carnivalNewManager.updateEndDateMin();
        }
    },

    /** End date change handler. */
    handleEndDateChange: () => {
        carnivalNewManager.validateEndDate();
    },

    /**
     * Set minimum end date to one day after the selected start date.
     * Also normalizes existing end date if it's before the minimum.
     */
    updateEndDateMin() {
        const startInput = this.elements.startDateInput;
        const endInput = this.elements.endDateInput;
        if (startInput && endInput && startInput.value) {
            const startDate = new Date(startInput.value);
            if (Number.isNaN(startDate.getTime())) return;
            startDate.setDate(startDate.getDate() + 1);
            const minEndDate = startDate.toISOString().split('T')[0];
            endInput.min = minEndDate;
            if (endInput.value && endInput.value <= startInput.value) {
                endInput.value = minEndDate;
            }
        }
    },

    /** Validate that end date is strictly after start date. */
    validateEndDate() {
        const startInput = this.elements.startDateInput;
        const endInput = this.elements.endDateInput;
        if (startInput && endInput && endInput.value && startInput.value) {
            if (endInput.value <= startInput.value) {
                endInput.setCustomValidity('End date must be after the start date');
                endInput.classList.add('is-invalid');
            } else {
                endInput.setCustomValidity('');
                endInput.classList.remove('is-invalid');
            }
        }
    },

    /** Set forceCreate and submit the form. Exposed on window for backwards compat. */
    proceedAnyway: () => {
        const force = carnivalNewManager.elements.forceCreate;
        const form = carnivalNewManager.elements.carnivalForm;
        if (force) force.value = 'true';
        if (form) form.submit();
    },

    /** Reset the carnival form. Exposed on window for backwards compat. */
    clearForm: () => {
        const form = carnivalNewManager.elements.carnivalForm;
            if (!form) return;
            // Reset to default first
            form.reset();
            // Explicitly clear fields so jsdom-based tests and UX match expectations
            const fields = form.querySelectorAll('input, textarea, select');
            fields.forEach((el) => {
                const tag = el.tagName?.toLowerCase();
                const type = (el.getAttribute?.('type') || '').toLowerCase();
                if (tag === 'select') {
                    el.selectedIndex = -1;
                    el.value = '';
                } else if (type === 'checkbox' || type === 'radio') {
                    el.checked = false;
                } else if (type === 'file') {
                    el.value = '';
                } else {
                    el.value = '';
                }
                if (typeof el.setCustomValidity === 'function') el.setCustomValidity('');
                el.classList?.remove('is-invalid');
            });

            // Derived UI updates
            carnivalNewManager.toggleMysidelineButtonVisibility();
            const { endDateContainer, dateLabel, endDateInput } = carnivalNewManager.elements;
            if (endDateContainer && dateLabel && endDateInput) {
                endDateContainer.style.display = 'none';
                dateLabel.textContent = 'Date *';
                endDateInput.required = false;
                endDateInput.value = '';
                endDateInput.min = '';
                endDateInput.classList.remove('is-invalid');
                endDateInput.setCustomValidity?.('');
            }
    }
};

// Bootstrap in the browser
document.addEventListener('DOMContentLoaded', () => {
    carnivalNewManager.initialize();
});