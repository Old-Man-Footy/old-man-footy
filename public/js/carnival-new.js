/**
 * Carnival New JavaScript
 * Handles file upload area interactions, MySideline link generation, and multi-day event functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Make file upload areas clickable
    document.querySelectorAll('.file-upload-area').forEach(area => {
        area.addEventListener('click', function() {
            const input = this.querySelector('input[type="file"]');
            if (input) {
                input.click();
            }
        });
    });

    // MySideline link generation functionality
    const generateBtn = document.getElementById('generateMysidelineBtn');
    const titleInput = document.getElementById('title');
    const registrationLinkInput = document.getElementById('registrationLink');
    const mysidelineContainer = document.getElementById('mysidelineButtonContainer');

    // Show MySideline button when title is entered
    if (titleInput && mysidelineContainer) {
        titleInput.addEventListener('input', function() {
            if (this.value.trim().length > 3) {
                mysidelineContainer.style.display = 'block';
            } else {
                mysidelineContainer.style.display = 'none';
            }
        });

        // Check on page load if title already has content
        if (titleInput.value.trim().length > 3) {
            mysidelineContainer.style.display = 'block';
        }
    }

    if (generateBtn && titleInput && registrationLinkInput) {
        generateBtn.addEventListener('click', function() {
            const title = titleInput.value.trim();
            if (title) {
                // Generate MySideline-style URL based on title
                const slug = title.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
                    .replace(/\s+/g, '-') // Replace spaces with hyphens
                    .replace(/-+/g, '-') // Replace multiple hyphens with single
                    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
                
                const mysidelineUrl = `https://www.mysideline.com.au/event/${slug}`;
                registrationLinkInput.value = mysidelineUrl;
                
                // Show feedback
                generateBtn.innerHTML = '<i class="bi bi-check-circle"></i> Generated!';
                generateBtn.classList.remove('btn-outline-success');
                generateBtn.classList.add('btn-success');
                
                setTimeout(() => {
                    generateBtn.innerHTML = '<i class="bi bi-link-45deg"></i> Generate MySideline Link';
                    generateBtn.classList.remove('btn-success');
                    generateBtn.classList.add('btn-outline-success');
                }, 2000);
            }
        });
    }

    // Multi-day event functionality
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
});

// Global functions for duplicate warning handling
function proceedAnyway() {
    // Set the hidden field to true and submit the form
    document.getElementById('forceCreate').value = 'true';
    document.getElementById('carnivalForm').submit();
}

function clearForm() {
    // Clear the form fields
    document.getElementById('carnivalForm').reset();
}