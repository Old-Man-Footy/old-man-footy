/**
 * Carnival Edit JavaScript
 * Handles file upload area interactions and multi-day event functionality for carnival edit page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page styling
    initializePageStyling();
    
    // Make file upload areas clickable
    document.querySelectorAll('.file-upload-area').forEach(area => {
        area.addEventListener('click', function() {
            const input = this.querySelector('input[type="file"]');
            if (input) {
                input.click();
            }
        });
    });

    // Multi-day event functionality
    initializeMultiDayEventFunctionality();
});

/**
 * Initialize page styling that was previously done with inline styles
 */
function initializePageStyling() {
    // Handle end date container visibility based on data attribute
    const endDateContainer = document.getElementById('endDateContainer');
    if (endDateContainer) {
        const hasEndDate = endDateContainer.dataset.hasEndDate === 'true';
        if (!hasEndDate) {
            endDateContainer.style.display = 'none';
        }
    }

    // Style carnival logo preview images
    const logoPreviewImages = document.querySelectorAll('.carnival-logo-preview');
    logoPreviewImages.forEach(img => {
        img.style.height = '150px';
        img.style.objectFit = 'contain';
    });

    // Style carnival promotional preview images
    const promoPreviewImages = document.querySelectorAll('.carnival-promo-preview');
    promoPreviewImages.forEach(img => {
        img.style.height = '150px';
        img.style.objectFit = 'cover';
    });

    // Hide file input elements
    const fileInputs = document.querySelectorAll('.file-input-hidden');
    fileInputs.forEach(input => {
        input.style.display = 'none';
    });
}

/**
 * Initialize multi-day event functionality
 */
function initializeMultiDayEventFunctionality() {
    const isMultiDayCheckbox = document.getElementById('isMultiDay');
    const endDateContainer = document.getElementById('endDateContainer');
    const endDateInput = document.getElementById('endDate');
    const dateLabel = document.getElementById('dateLabel');
    const startDateInput = document.getElementById('date');

    if (isMultiDayCheckbox && endDateContainer && endDateInput && dateLabel) {
        // Toggle end date field visibility
        isMultiDayCheckbox.addEventListener('change', function() {
            if (this.checked) {
                endDateContainer.style.display = 'block';
                dateLabel.textContent = 'Event Start Date *';
                endDateInput.required = true;
                
                // Set minimum end date to start date + 1 day
                updateEndDateMin();
            } else {
                endDateContainer.style.display = 'none';
                dateLabel.textContent = 'Date *';
                endDateInput.required = false;
                endDateInput.value = '';
            }
        });

        // Update end date minimum when start date changes
        startDateInput.addEventListener('change', function() {
            if (isMultiDayCheckbox.checked) {
                updateEndDateMin();
            }
        });

        // Validate end date is after start date
        endDateInput.addEventListener('change', function() {
            validateEndDate();
        });

        function updateEndDateMin() {
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
        }

        function validateEndDate() {
            if (endDateInput.value && startDateInput.value) {
                if (endDateInput.value <= startDateInput.value) {
                    endDateInput.setCustomValidity('End date must be after the start date');
                    endDateInput.classList.add('is-invalid');
                } else {
                    endDateInput.setCustomValidity('');
                    endDateInput.classList.remove('is-invalid');
                }
            }
        }

        // Initialize on page load
        if (isMultiDayCheckbox.checked) {
            dateLabel.textContent = 'Event Start Date *';
            endDateInput.required = true;
            updateEndDateMin();
        }
    }
}