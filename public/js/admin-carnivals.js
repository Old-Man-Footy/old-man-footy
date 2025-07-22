/**
 * Admin Carnival Management JavaScript
 * Handles carnival management functionality including status toggle confirmation
 *
 * @module admin-carnivals
 */

let currentCarnivalId = null;
let currentCarnivalTitle = null;
let currentStatus = null;

/**
 * Show status toggle confirmation modal
 * @param {string} carnivalId - The ID of the carnival to toggle
 * @param {string} carnivalTitle - The title of the carnival for display
 * @param {boolean} isActive - Current status of the carnival
 */
export function showStatusToggleModal(carnivalId, carnivalTitle, isActive) {
    currentCarnivalId = carnivalId;
    currentCarnivalTitle = carnivalTitle;
    currentStatus = isActive;
    
    // Set the carnival title in the modal
    const titleElement = document.getElementById('toggleCarnivalTitle');
    if (titleElement) {
        titleElement.textContent = carnivalTitle;
    }
    
    // Update modal content based on current status
    const messageElement = document.getElementById('statusToggleMessage');
    const warningElement = document.getElementById('statusWarningText');
    const actionTextElement = document.getElementById('toggleActionText');
    const confirmButton = document.getElementById('confirmStatusToggle');
    
    if (isActive) {
        // Currently active, will deactivate
        messageElement.textContent = 'Are you sure you want to deactivate this carnival?';
        warningElement.textContent = 'Deactivated carnivals will no longer be visible on the site';
        actionTextElement.textContent = 'Deactivate';
        confirmButton.className = 'btn btn-danger';
        confirmButton.innerHTML = '<i class="bi bi-eye-slash"></i> <span id="toggleActionText">Deactivate</span> Carnival';
    } else {
        // Currently inactive, will reactivate
        messageElement.textContent = 'Are you sure you want to reactivate this carnival?';
        warningElement.textContent = 'Reactivated carnivals will become visible on the site again';
        actionTextElement.textContent = 'Reactivate';
        confirmButton.className = 'btn btn-success';
        confirmButton.innerHTML = '<i class="bi bi-eye"></i> <span id="toggleActionText">Reactivate</span> Carnival';
    }
    
    // Show the modal
    const statusToggleModal = document.getElementById('statusToggleModal');
    if (statusToggleModal && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(statusToggleModal);
        modal.show();
    }
}

/**
 * Confirm and execute status toggle
 */
export function confirmStatusToggle() {
    if (!currentCarnivalId) {
        console.error('No carnival ID set for status toggle');
        return;
    }
    
    const newStatus = !currentStatus;
    
    // Show loading state
    const confirmButton = document.getElementById('confirmStatusToggle');
    const originalContent = confirmButton.innerHTML;
    confirmButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
    confirmButton.disabled = true;
    
    // Send AJAX request to toggle status
    fetch(`/admin/carnivals/${currentCarnivalId}/toggle-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            isActive: newStatus
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            showToast('success', data.message);
            
            // Reload the page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('error', data.message || 'Error updating carnival status');
        }
    })
    .catch(error => {
        console.error('Error toggling carnival status:', error);
        showToast('error', 'Error updating carnival status');
    })
    .finally(() => {
        // Restore button state
        confirmButton.innerHTML = originalContent;
        confirmButton.disabled = false;
        
        // Close modal
        const statusToggleModal = document.getElementById('statusToggleModal');
        if (statusToggleModal && typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(statusToggleModal);
            if (modal) {
                modal.hide();
            }
        }
    });
}

/**
 * Show toast notification
 * @param {string} type - Type of toast (success, error, warning, info)
 * @param {string} message - Message to display
 */
export function showToast(type, message) {
    // Create toast element if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center bg-${type === 'success' ? 'success' : 'danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    if (toastElement && typeof bootstrap !== 'undefined') {
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });
        toast.show();
        
        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}

/**
 * Initialize admin carnival functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin carnival management functionality loaded...');
    
    // Initialize page styling
    initializeAdminPageStyling();
    
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
    
    // Setup status toggle buttons
    const statusToggleButtons = document.querySelectorAll('[data-toggle-carnival-status]');
    statusToggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const carnivalId = this.getAttribute('data-toggle-carnival-status');
            const carnivalTitle = this.getAttribute('data-carnival-title');
            const currentStatus = this.getAttribute('data-current-status') === 'true';
            
            showStatusToggleModal(carnivalId, carnivalTitle, currentStatus);
        });
    });
    
    // Setup confirm button in modal
    const confirmButton = document.getElementById('confirmStatusToggle');
    if (confirmButton) {
        confirmButton.addEventListener('click', confirmStatusToggle);
    }
    
    // Form validation for edit carnival page
    const editForm = document.querySelector('form[action*="/edit"]');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            const requiredFields = this.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('is-invalid');
                    isValid = false;
                } else {
                    field.classList.remove('is-invalid');
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showToast('error', 'Please fill in all required fields.');
            }
        });
    }
    
    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
    
    console.log('Admin carnival management functionality initialized successfully');
});

/**
 * Initialize page styling that was previously done with inline styles
 */
function initializeAdminPageStyling() {
    // Handle end date container visibility based on data attribute
    const endDateContainer = document.getElementById('endDateContainer');
    if (endDateContainer) {
        const hasEndDate = endDateContainer.dataset.hasEndDate === 'true';
        if (!hasEndDate) {
            endDateContainer.style.display = 'none';
        }
    }

    // Style admin carnival logo preview images
    const adminLogoPreviewImages = document.querySelectorAll('.admin-carnival-logo-preview');
    adminLogoPreviewImages.forEach(img => {
        img.style.height = '150px';
        img.style.objectFit = 'contain';
    });

    // Style admin carnival promotional preview images
    const adminPromoPreviewImages = document.querySelectorAll('.admin-carnival-promo-preview');
    adminPromoPreviewImages.forEach(img => {
        img.style.height = '150px';
        img.style.objectFit = 'cover';
    });

    // Hide admin file input elements
    const adminFileInputs = document.querySelectorAll('.admin-file-input-hidden');
    adminFileInputs.forEach(input => {
        input.style.display = 'none';
    });
}

/**
 * Initialize multi-day event functionality for admin forms
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
                updateEndDateMin();
            } else {
                endDateContainer.style.display = 'none';
                dateLabel.textContent = 'Event Date *';
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

        /**
         * Update minimum end date based on start date
         */
        function updateEndDateMin() {
            if (startDateInput.value) {
                const startDate = new Date(startDateInput.value);
                startDate.setDate(startDate.getDate() + 1);
                const minEndDate = startDate.toISOString().split('T')[0];
                endDateInput.min = minEndDate;
                
                if (endDateInput.value && endDateInput.value <= startDateInput.value) {
                    endDateInput.value = minEndDate;
                }
            }
        }

        /**
         * Validate that end date is after start date
         */
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

    // Get the MySideline event URL from the form's data attribute
    const form = document.querySelector('form[data-mysideline-event-url]');
    const mySidelineBaseUrl = form ? form.dataset.mysidelineEventUrl : '';

    /**
     * Generate MySideline registration URL from event ID
     * @param {string} eventId - The MySideline event ID
     * @returns {string} - The complete registration URL
     */
    function generateMySidelineUrl(eventId) {
        // Clean the event ID - remove any non-numeric characters
        const cleanId = eventId.replace(/\D/g, '');
        if (!cleanId || !mySidelineBaseUrl) return '';
        
        // Generate the MySideline registration URL
        return `${mySidelineBaseUrl}${cleanId}`;
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
            updateRegistrationLink('', 'Player registration link - will auto-update when MySideline ID is entered above');
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
            linkStatusElement.textContent = 'Player registration link - will auto-update when MySideline ID is entered above';
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

    console.log('MySideline integration initialized successfully');
}

export {
    showStatusToggleModal,
    confirmStatusToggle,
    showToast,
    initializeAdminPageStyling,
    initializeMultiDayEventFunctionality,
    initializeMySidelineIntegration
};