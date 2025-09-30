/**
 * Carnival Show Page script (Manager Object Pattern)
 * Handles club registration, unregistration, admin actions, and modals.
 */
export const carnivalShowManager = {
    /** Cached DOM elements */
    elements: {},

    /** Initialize module */
    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.initializeCarnivalShowPage();
        // Back-compat for any inline handlers still in views
        window.confirmMerge = () => this.confirmMerge();
    },

    /** Cache all required DOM elements */
    cacheElements() {
        this.elements.unregisterButton = document.querySelector('[data-action="unregister-carnival"]');
        this.elements.registrationForm = document.getElementById('clubRegistrationForm');
        this.elements.emailForm = document.getElementById('emailAttendeesForm');
        this.elements.messageTextarea = document.getElementById('message');
        this.elements.charCount = document.getElementById('charCount');

        // Email attendees modal elements
        this.elements.emailAttendeesForm = document.getElementById('emailAttendeesForm');
        this.elements.emailSubject = document.getElementById('emailSubject');
        this.elements.customMessage = document.getElementById('customMessage');
        this.elements.sendEmailBtn = document.getElementById('sendEmailBtn');

        // Post-creation modal elements
        this.elements.postCreationModal = document.getElementById('postCreationModal');

        // Admin status toggle buttons
        this.elements.statusToggleButtons = document.querySelectorAll('[data-toggle-carnival-status]');
    },

    /** Bind DOM events */
    bindEvents() {
        if (this.elements.unregisterButton) {
            this.elements.unregisterButton.addEventListener('click', this.handleUnregisterClick);
        }

        if (this.elements.registrationForm) {
            this.elements.registrationForm.addEventListener('submit', this.handleRegistrationSubmit);
        }

        if (this.elements.messageTextarea && this.elements.charCount) {
            this.elements.messageTextarea.addEventListener('input', this.handleMessageInput);
        }

        if (this.elements.emailForm) {
            this.elements.emailForm.addEventListener('submit', this.handleEmailFormSubmit);
        }

        // Email attendees form
        if (this.elements.emailAttendeesForm) {
            this.elements.emailAttendeesForm.addEventListener('submit', this.handleEmailAttendeesSubmit);
        }

        // Character count for custom message
        if (this.elements.customMessage) {
            this.elements.customMessage.addEventListener('input', this.handleCustomMessageInput);
        }

        if (this.elements.statusToggleButtons && this.elements.statusToggleButtons.length) {
            this.elements.statusToggleButtons.forEach((button) => {
                button.addEventListener('click', (e) => {
                    const carnivalId = button.getAttribute('data-toggle-carnival-status');
                    const carnivalTitle = button.getAttribute('data-carnival-title');
                    const currentStatus = button.getAttribute('data-current-status');
                    this.toggleCarnivalStatus(carnivalId, carnivalTitle, currentStatus);
                });
            });
        }
    },

    /** Show modals and initialize admin helpers */
    initializeCarnivalShowPage() {
        this.initializePostCreationModal();
        this.initializeMergeConfirmation();
        // Admin buttons wired in bindEvents
    },

    /** Unregister club from carnival */
    handleUnregisterClick: () => {
        if (!confirm('Are you sure you want to unregister your club from this carnival? This action cannot be undone.')) return;

        const btn = document.querySelector('[data-action="unregister-carnival"]');
        const carnivalId = (btn && btn.closest('.card') && btn.closest('.card').dataset.carnivalId) ||
            window.location.pathname.split('/')[2];

    return fetch(`/carnivals/${carnivalId}/register`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                this.showAlert(data.message);
                // Defer reload to avoid jsdom navigation errors in tests
                setTimeout(() => {
                    try { window.location.reload(); } catch (_) { /* noop in non-browser env */ }
                }, 0);
            } else {
                this.showAlert('Error: ' + data.message);
            }
        })
        .catch(err => {
            console.error('Error:', err);
            this.showAlert('An error occurred while unregistering. Please try again.');
        });
    },

    /** Simple email validation */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /** Validate and handle club registration submit */
    handleRegistrationSubmit: (e) => {
        const playerCountInput = document.getElementById('playerCount');
        const contactEmailInput = document.getElementById('contactEmail');
        const playerCount = playerCountInput ? playerCountInput.value : '';
        const contactEmail = contactEmailInput ? contactEmailInput.value : '';

        if (playerCount && (parseInt(playerCount, 10) < 1 || parseInt(playerCount, 10) > 100)) {
            e.preventDefault();
            this.showAlert('Player count must be between 1 and 100.');
            return false;
        }

        if (contactEmail && !carnivalShowManager.isValidEmail(contactEmail)) {
            e.preventDefault();
            this.showAlert('Please enter a valid email address.');
            return false;
        }

        const form = e.currentTarget;
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Registering...';
            submitButton.disabled = true;
            setTimeout(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }, 10000);
        }
        return true;
    },

    /** Update live character count and style */
    handleMessageInput: (e) => {
        const textarea = e.currentTarget;
        const counter = carnivalShowManager.elements.charCount;
        if (!counter) return;
        const currentLength = textarea.value.length;
        counter.textContent = currentLength;
        // Fix thresholds: danger first, then warning
        if (currentLength > 1900) {
            counter.className = 'text-danger';
        } else if (currentLength > 1800) {
            counter.className = 'text-warning';
        } else {
            counter.className = 'text-muted';
        }
    },

    /** Handle email attendees submit (loading state only) */
    handleEmailFormSubmit: (e) => {
        const form = e.currentTarget;
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
            submitButton.disabled = true;
            setTimeout(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }, 10000);
        }
    },

    /** Handle email attendees form submission */
    handleEmailAttendeesSubmit: (e) => {
        const form = e.currentTarget;
        const submitButton = carnivalShowManager.elements.sendEmailBtn;
        const subject = carnivalShowManager.elements.emailSubject?.value?.trim();
        const message = carnivalShowManager.elements.customMessage?.value?.trim();

        // Validate required fields
        if (!subject || !message) {
            e.preventDefault();
            this.showAlert('Please fill in both the subject and message fields.');
            return false;
        }

        // Validate length limits
        if (subject.length > 200) {
            e.preventDefault();
            this.showAlert('Subject must be 200 characters or less.');
            return false;
        }

        if (message.length > 2000) {
            e.preventDefault();
            this.showAlert('Message must be 2000 characters or less.');
            return false;
        }

        // Update button state during submission
        if (submitButton) {
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
            submitButton.disabled = true;
            
            // Reset button state after timeout (fallback)
            setTimeout(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }, 15000);
        }

        return true;
    },

    /** Handle character count for custom message field */
    handleCustomMessageInput: (e) => {
        const textarea = e.currentTarget;
        const currentLength = textarea.value.length;
        const maxLength = 2000;
        
        // Find existing character counter
        let counter = textarea.parentNode.querySelector('.char-counter');
        if (!counter) {
            // Create counter if it doesn't exist
            counter = document.createElement('span');
            counter.className = 'char-counter text-muted';
            
            // Try to add it to form-text div
            const formText = textarea.parentNode.querySelector('.form-text');
            if (formText) {
                formText.appendChild(counter);
            } else {
                textarea.parentNode.appendChild(counter);
            }
        }
        
        counter.textContent = `${currentLength}/${maxLength}`;
        
        // Update color based on usage
        if (currentLength > maxLength * 0.95) {
            counter.className = 'char-counter text-danger';
        } else if (currentLength > maxLength * 0.8) {
            counter.className = 'char-counter text-warning';
        } else {
            counter.className = 'char-counter text-muted';
        }
    },

    /** Initialize post-creation modal and acknowledge logic */
    initializePostCreationModal() {
        const modalEl = this.elements.postCreationModal;
        if (!modalEl) return;
        // Guard if Bootstrap isn't available (tests or minimal pages)
        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) return;

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    },

    /** Placeholder for future merge confirmation init (kept for parity) */
    initializeMergeConfirmation() {
        // Merge confirmation uses confirmMerge(), available via window shim.
    },

    /** Toggle carnival status (admin) */
    toggleCarnivalStatus(carnivalId, carnivalTitle, currentStatus) {
        const isActive = currentStatus === 'true';
        const action = isActive ? 'deactivate' : 'reactivate';
        const confirmMessage = isActive
            ? `Are you sure you want to deactivate "${carnivalTitle}"? This will hide it from public listings and disable registration.`
            : `Are you sure you want to reactivate "${carnivalTitle}"? This will make it visible in public listings again.`;

        if (!confirm(confirmMessage)) return;

    const button = document.querySelector(`[data-toggle-carnival-status="${carnivalId}"]`);
        const originalContent = button ? button.innerHTML : null;
        if (button) {
            button.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
            button.disabled = true;
        }

    return fetch(`/admin/carnivals/${carnivalId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ action })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                this.showAlert(`Carnival ${action}d successfully!`);
                // Defer reload to avoid jsdom navigation errors in tests
                setTimeout(() => {
                    try { window.location.reload(); } catch (_) { /* noop in non-browser env */ }
                }, 0);
            } else {
                this.showAlert('Error: ' + (data.message || 'Failed to update carnival status'));
                if (button && originalContent !== null) {
                    button.innerHTML = originalContent;
                    button.disabled = false;
                }
            }
        })
        .catch(err => {
            console.error('Error:', err);
            this.showAlert('An error occurred while updating the carnival status. Please try again.');
            if (button && originalContent !== null) {
                button.innerHTML = originalContent;
                button.disabled = false;
            }
        });
    },

    /** Confirm merge operation flow */
    confirmMerge() {
        const targetSelect = document.getElementById('targetCarnivalId');
        const targetCarnivalName = document.getElementById('targetCarnivalName');
        if (!targetSelect || !targetSelect.value) {
            this.showAlert('Please select a carnival to merge into.');
            return;
        }

        if (targetCarnivalName) {
            const selectedOption = targetSelect.options[targetSelect.selectedIndex];
            targetCarnivalName.textContent = selectedOption.text;
        }

        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) return;

        const firstModal = bootstrap.Modal.getInstance(document.getElementById('mergeCarnivalModal'));
        if (firstModal) firstModal.hide();

        setTimeout(() => {
            const confirmModal = new bootstrap.Modal(document.getElementById('mergeCarnivalConfirmModal'));
            confirmModal.show();
        }, 300);
    }
};

// Bootstrap the manager
document.addEventListener('DOMContentLoaded', () => {
    carnivalShowManager.initialize();
});
