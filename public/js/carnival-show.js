/**
 * Carnival Show Page JavaScript
 * Handles club registration and unregistration functionality
 */

/**
 * Handle club unregistration from carnival
 */
function unregisterFromCarnival() {
    if (confirm('Are you sure you want to unregister your club from this carnival? This action cannot be undone.')) {
        const carnivalId = document.querySelector('[data-action="unregister-carnival"]').closest('.card').dataset.carnivalId || 
                          window.location.pathname.split('/')[2];
        
        fetch(`/carnivals/${carnivalId}/register`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message and refresh the page
                alert(data.message);
                window.location.reload();
            } else {
                // Show error message
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while unregistering. Please try again.');
        });
    }
}

/**
 * Email validation helper
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Initialize carnival show page functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Handle unregister button clicks
    const unregisterButton = document.querySelector('[data-action="unregister-carnival"]');
    if (unregisterButton) {
        unregisterButton.addEventListener('click', unregisterFromCarnival);
    }
    
    // Form validation for club registration
    const registrationForm = document.getElementById('clubRegistrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', function(e) {
            const playerCount = document.getElementById('playerCount').value;
            const contactEmail = document.getElementById('contactEmail').value;
            
            // Basic validation
            if (playerCount && (parseInt(playerCount) < 1 || parseInt(playerCount) > 100)) {
                e.preventDefault();
                alert('Player count must be between 1 and 100.');
                return false;
            }
            
            if (contactEmail && !isValidEmail(contactEmail)) {
                e.preventDefault();
                alert('Please enter a valid email address.');
                return false;
            }
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Registering...';
            submitButton.disabled = true;
            
            // Re-enable button after a delay in case of errors
            setTimeout(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }, 10000);
        });
    }
    
    // Character counter for message textarea
    const messageTextarea = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function() {
            const currentLength = this.value.length;
            charCount.textContent = currentLength;
            
            // Change color based on character count
            if (currentLength > 1800) {
                charCount.className = 'text-warning';
            } else if (currentLength > 1900) {
                charCount.className = 'text-danger';
            } else {
                charCount.className = 'text-muted';
            }
        });
    }
    
    // Form submission handling for email attendees
    const emailForm = document.getElementById('emailAttendeesForm');
    if (emailForm) {
        emailForm.addEventListener('submit', function(e) {
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            // Show loading state
            submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
            submitButton.disabled = true;
            
            // Re-enable button after a delay in case of errors
            setTimeout(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }, 10000);
        });
    }
    
    // Initialize modal and merge confirmation functionality
    initializeCarnivalShowPage();
});

/**
 * Initialize all carnival show page functionality
 */
function initializeCarnivalShowPage() {
    initializePostCreationModal();
    initializeMergeConfirmation();
}

/**
 * Initialize post-creation modal functionality
 */
function initializePostCreationModal() {
    const postCreationModal = document.getElementById('postCreationModal');
    
    if (postCreationModal) {
        // Show the post-creation modal automatically
        const modal = new bootstrap.Modal(postCreationModal);
        modal.show();
        
        // Enable/disable acknowledge button based on checkbox states
        const nrlCheckbox = document.getElementById('nrlAcknowledge');
        const mysidelineCheckbox = document.getElementById('mysidelineAcknowledge');
        const acknowledgeButton = document.getElementById('acknowledgeButton');
        
        if (nrlCheckbox && mysidelineCheckbox && acknowledgeButton) {
            function updateButtonState() {
                acknowledgeButton.disabled = !(nrlCheckbox.checked && mysidelineCheckbox.checked);
            }
            
            nrlCheckbox.addEventListener('change', updateButtonState);
            mysidelineCheckbox.addEventListener('change', updateButtonState);
        }
    }
}

/**
 * Initialize merge confirmation functionality
 */
function initializeMergeConfirmation() {
    // Merge confirmation functionality is handled by the global confirmMerge function
    // which is already defined in the page
}

/**
 * Handle post-creation modal acknowledgment and close
 */
function acknowledgeAndClose() {
    // Close the modal
    const postCreationModal = bootstrap.Modal.getInstance(document.getElementById('postCreationModal'));
    if (postCreationModal) {
        postCreationModal.hide();
    }
    
    // Remove the query parameter from the URL without reloading the page
    const url = new URL(window.location);
    url.searchParams.delete('showPostCreationModal');
    window.history.replaceState({}, document.title, url.toString());
}

/**
 * Confirm carnival merge operation
 */
function confirmMerge() {
    const targetSelect = document.getElementById('targetCarnivalId');
    const targetCarnivalName = document.getElementById('targetCarnivalName');
    
    if (!targetSelect || !targetSelect.value) {
        alert('Please select a carnival to merge into.');
        return;
    }
    
    if (targetCarnivalName) {
        // Update confirmation modal with selected carnival name
        const selectedOption = targetSelect.options[targetSelect.selectedIndex];
        targetCarnivalName.textContent = selectedOption.text;
    }
    
    // Hide first modal and show confirmation modal
    const firstModal = bootstrap.Modal.getInstance(document.getElementById('mergeCarnivalModal'));
    if (firstModal) {
        firstModal.hide();
    }
    
    setTimeout(() => {
        const confirmModal = new bootstrap.Modal(document.getElementById('mergeCarnivalConfirmModal'));
        confirmModal.show();
    }, 300);
}

// Make functions available globally for onclick handlers
window.acknowledgeAndClose = acknowledgeAndClose;
window.confirmMerge = confirmMerge;