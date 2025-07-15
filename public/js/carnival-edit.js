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
    
    // MySideline integration functionality
    initializeMySidelineIntegration();
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

/**
 * Initialize MySideline integration
 */
function initializeMySidelineIntegration() {
    const mySidelineIdInput = document.getElementById('mySidelineId');
    const registrationLinkInput = document.getElementById('registrationLink');
    const linkStatusElement = document.getElementById('linkStatus');
    const testLinkBtn = document.getElementById('testLinkBtn');

    if (!mySidelineIdInput || !registrationLinkInput || !linkStatusElement) {
        return; // Elements not found, exit gracefully
    }

    /**
     * Generate MySideline registration URL from event ID
     * @param {string} eventId - The MySideline event ID
     * @returns {string} - The complete registration URL
     */
    function generateMySidelineUrl(eventId) {
        // Clean the event ID - remove any non-numeric characters
        const cleanId = eventId.replace(/\D/g, '');
        if (!cleanId) return '';
        
        // Generate the MySideline registration URL
        return `${MYSIDELINE_EVENT_URL}${cleanId}`;
    }

    /**
     * Update the registration link field and status
     * @param {string} url - The registration URL
     * @param {string} status - Status message to display
     * @param {string} statusClass - CSS class for status styling
     */
    function updateRegistrationLink(url, status, statusClass = 'text-muted') {
        registrationLinkInput.value = url;
        linkStatusElement.textContent = status;
        linkStatusElement.className = statusClass;
        
        // Show/hide test link button
        if (url && isValidUrl(url)) {
            testLinkBtn.style.display = 'block';
            testLinkBtn.onclick = () => window.open(url, '_blank');
        } else {
            testLinkBtn.style.display = 'none';
        }
    }

    /**
     * Validate if a string is a valid URL
     * @param {string} string - The string to validate
     * @returns {boolean} - True if valid URL
     */
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Handle MySideline ID input changes
     */
    function handleMySidelineIdChange() {
        const eventId = mySidelineIdInput.value.trim();
        
        if (!eventId) {
            updateRegistrationLink('', 'Player registration link - will auto-update when MySideline ID is entered');
            return;
        }

        // Clean the event ID
        const cleanId = eventId.replace(/\D/g, '');
        
        if (!cleanId) {
            updateRegistrationLink('', 'Please enter a valid numeric MySideline event ID', 'text-warning');
            return;
        }

        // If the cleaned ID is different from input, update the input field
        if (cleanId !== eventId) {
            mySidelineIdInput.value = cleanId;
        }

        // Generate and set the MySideline URL
        const mySidelineUrl = generateMySidelineUrl(cleanId);
        updateRegistrationLink(
            mySidelineUrl, 
            `✓ Registration link auto-generated from MySideline event ${cleanId}`, 
            'text-success'
        );
    }

    /**
     * Handle manual registration link changes
     */
    function handleRegistrationLinkChange() {
        const url = registrationLinkInput.value.trim();
        
        if (!url) {
            linkStatusElement.textContent = 'Player registration link - will auto-update when MySideline ID is entered';
            linkStatusElement.className = 'text-muted';
            testLinkBtn.style.display = 'none';
            return;
        }

        if (isValidUrl(url)) {
            // Check if it's a MySideline URL and extract ID if possible
            const mySidelineMatch = url.match(/mysideline\.com\/register\/(\d+)/);
            if (mySidelineMatch) {
                const extractedId = mySidelineMatch[1];
                linkStatusElement.textContent = `✓ MySideline registration link (Event ID: ${extractedId})`;
                linkStatusElement.className = 'text-success';
                
                // Update MySideline ID field if it's empty or different
                if (!mySidelineIdInput.value || mySidelineIdInput.value !== extractedId) {
                    mySidelineIdInput.value = extractedId;
                }
            } else {
                linkStatusElement.textContent = '✓ Custom registration link';
                linkStatusElement.className = 'text-info';
            }
            
            testLinkBtn.style.display = 'block';
            testLinkBtn.onclick = () => window.open(url, '_blank');
        } else {
            linkStatusElement.textContent = '⚠ Please enter a valid URL';
            linkStatusElement.className = 'text-warning';
            testLinkBtn.style.display = 'none';
        }
    }

    // Add event listeners
    mySidelineIdInput.addEventListener('input', handleMySidelineIdChange);
    mySidelineIdInput.addEventListener('blur', handleMySidelineIdChange);
    registrationLinkInput.addEventListener('input', handleRegistrationLinkChange);
    registrationLinkInput.addEventListener('blur', handleRegistrationLinkChange);

    // Initialize on page load - check if there are existing values
    if (mySidelineIdInput.value) {
        handleMySidelineIdChange();
    } else if (registrationLinkInput.value) {
        handleRegistrationLinkChange();
    }
}