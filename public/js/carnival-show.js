/**
 * Carnival Show Page JavaScript
 * Handles club registration and unregistration functionality
 */

export const carnivalShowManager = {
    elements: {},

    /**
     * Initialize carnival show page functionality
     */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initializeCarnivalShowPage();
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements.unregisterButton = document.querySelector('[data-action="unregister-carnival"]');
        this.elements.registrationForm = document.getElementById('clubRegistrationForm');
        this.elements.messageTextarea = document.getElementById('message');
        this.elements.charCount = document.getElementById('charCount');
        this.elements.emailForm = document.getElementById('emailAttendeesForm');
        this.elements.postCreationModal = document.getElementById('postCreationModal');
        this.elements.nrlCheckbox = document.getElementById('nrlAcknowledge');
        this.elements.mysidelineCheckbox = document.getElementById('mysidelineAcknowledge');
        this.elements.acknowledgeButton = document.getElementById('acknowledgeButton');
        this.elements.statusToggleButtons = document.querySelectorAll('[data-toggle-carnival-status]');
    },

    /**
     * Bind event listeners to cached elements
     */
    bindEvents() {
        if (this.elements.unregisterButton) {
            this.elements.unregisterButton.addEventListener('click', this.unregisterFromCarnival.bind(this));
        }

        if (this.elements.registrationForm) {
            this.elements.registrationForm.addEventListener('submit', this.handleRegistrationFormSubmit.bind(this));
        }

        if (this.elements.messageTextarea && this.elements.charCount) {
            this.elements.messageTextarea.addEventListener('input', this.updateCharCount.bind(this));
        }

        if (this.elements.emailForm) {
            this.elements.emailForm.addEventListener('submit', this.handleEmailFormSubmit.bind(this));
        }

        if (this.elements.nrlCheckbox && this.elements.mysidelineCheckbox && this.elements.acknowledgeButton) {
            this.elements.nrlCheckbox.addEventListener('change', this.updateAcknowledgeButtonState.bind(this));
            this.elements.mysidelineCheckbox.addEventListener('change', this.updateAcknowledgeButtonState.bind(this));
        }

        this.elements.statusToggleButtons.forEach(button => {
            button.addEventListener('click', this.handleStatusToggle.bind(this));
        });
    },

    /**
     * Handle club unregistration from carnival
     */
    unregisterFromCarnival() {
        if (confirm('Are you sure you want to unregister your club from this carnival? This action cannot be undone.')) {
            const carnivalId = this.elements.unregisterButton.closest('.card').dataset.carnivalId || 
                              window.location.pathname.split('/')[2];

            return fetch(`/carnivals/${carnivalId}/register`, {
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
    },

    /**
     * Handle registration form submission
     */
    handleRegistrationFormSubmit(e) {
        const playerCount = document.getElementById('playerCount').value;
        const contactEmail = document.getElementById('contactEmail').value;

        // Basic validation
        if (playerCount && (parseInt(playerCount) < 1 || parseInt(playerCount) > 100)) {
            e.preventDefault();
            alert('Player count must be between 1 and 100.');
            return false;
        }

        if (contactEmail && !this.isValidEmail(contactEmail)) {
            e.preventDefault();
            alert('Please enter a valid email address.');
            return false;
        }

        // Show loading state
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Registering...';
        submitButton.disabled = true;

        // Re-enable button after a delay in case of errors
        setTimeout(() => {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }, 10000);
    },

    /**
     * Update character count for message textarea
     */
    updateCharCount(e) {
        const currentLength = e.target.value.length;
        this.elements.charCount.textContent = currentLength;

        // Change color based on character count
        if (currentLength > 1900) {
            this.elements.charCount.className = 'text-danger';
        } else if (currentLength > 1800) {
            this.elements.charCount.className = 'text-warning';
        } else {
            this.elements.charCount.className = 'text-muted';
        }
    },

    /**
     * Handle email attendees form submission
     */
    handleEmailFormSubmit(e) {
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        // Show loading state
        submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
        submitButton.disabled = true;

        // Re-enable button after a delay in case of errors
        setTimeout(() => {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }, 10000);
    },

    /**
     * Update state of the acknowledge button in post-creation modal
     */
    updateAcknowledgeButtonState() {
        this.elements.acknowledgeButton.disabled = 
            !(this.elements.nrlCheckbox.checked && this.elements.mysidelineCheckbox.checked);
    },

    /**
     * Handle admin carnival status toggle (activate/deactivate)
     */
    handleStatusToggle(e) {
        const button = e.target;
        const carnivalId = button.getAttribute('data-toggle-carnival-status');
        const carnivalTitle = button.getAttribute('data-carnival-title');
        const currentStatus = button.getAttribute('data-current-status');

        const action = currentStatus === 'true' ? 'deactivate' : 'reactivate';
        const confirmMessage = currentStatus === 'true' 
            ? `Are you sure you want to deactivate "${carnivalTitle}"? This will hide it from public listings and disable registration.`
            : `Are you sure you want to reactivate "${carnivalTitle}"? This will make it visible in public listings again.`;

        if (confirm(confirmMessage)) {
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
            button.disabled = true;

            return fetch(`/admin/carnivals/${carnivalId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ action })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message and reload the page to reflect changes
                    alert(`Carnival ${action}d successfully!`);
                    window.location.reload();
                } else {
                    // Show error message and restore button
                    alert('Error: ' + (data.message || 'Failed to update carnival status'));
                    button.innerHTML = originalContent;
                    button.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while updating the carnival status. Please try again.');
                button.innerHTML = originalContent;
                button.disabled = false;
            });
        }
    },

    /**
     * Email validation helper
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Initialize all carnival show page functionality
     */
    initializeCarnivalShowPage() {
        this.initializePostCreationModal();
        this.initializeMergeConfirmation();
    },

    /**
     * Initialize post-creation modal functionality
     */
    initializePostCreationModal() {
        if (this.elements.postCreationModal) {
            // Show the post-creation modal automatically
            const modal = new bootstrap.Modal(this.elements.postCreationModal);
            modal.show();
        }
    },

    /**
     * Initialize merge confirmation functionality
     */
    initializeMergeConfirmation() {
        // Merge confirmation functionality is handled by the global confirmMerge function
    }
};

document.addEventListener('DOMContentLoaded', () => {
    carnivalShowManager.initialize();
});

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
window.confirmMerge = confirmMerge;
