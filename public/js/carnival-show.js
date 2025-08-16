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
        window.acknowledgeAndClose = () => this.acknowledgeAndClose();
        window.confirmMerge = () => this.confirmMerge();
    },

    /** Cache all required DOM elements */
    cacheElements() {
        this.elements.unregisterButton = document.querySelector('[data-action="unregister-carnival"]');
        this.elements.registrationForm = document.getElementById('clubRegistrationForm');
        this.elements.emailForm = document.getElementById('emailAttendeesForm');
        this.elements.messageTextarea = document.getElementById('message');
        this.elements.charCount = document.getElementById('charCount');

        // Post-creation modal elements
        this.elements.postCreationModal = document.getElementById('postCreationModal');
        this.elements.nrlCheckbox = document.getElementById('nrlAcknowledge');
        this.elements.mysidelineCheckbox = document.getElementById('mysidelineAcknowledge');
        this.elements.acknowledgeButton = document.getElementById('acknowledgeButton');

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
                alert(data.message);
                // Defer reload to avoid jsdom navigation errors in tests
                setTimeout(() => {
                    try { window.location.reload(); } catch (_) { /* noop in non-browser env */ }
                }, 0);
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('An error occurred while unregistering. Please try again.');
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
            alert('Player count must be between 1 and 100.');
            return false;
        }

        if (contactEmail && !carnivalShowManager.isValidEmail(contactEmail)) {
            e.preventDefault();
            alert('Please enter a valid email address.');
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

    /** Initialize post-creation modal and acknowledge logic */
    initializePostCreationModal() {
        const modalEl = this.elements.postCreationModal;
        if (!modalEl) return;
        // Guard if Bootstrap isn't available (tests or minimal pages)
        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) return;

        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const updateButtonState = () => {
            if (!this.elements.acknowledgeButton) return;
            const nrl = !!(this.elements.nrlCheckbox && this.elements.nrlCheckbox.checked);
            const mys = !!(this.elements.mysidelineCheckbox && this.elements.mysidelineCheckbox.checked);
            this.elements.acknowledgeButton.disabled = !(nrl && mys);
        };

        if (this.elements.nrlCheckbox) this.elements.nrlCheckbox.addEventListener('change', updateButtonState);
        if (this.elements.mysidelineCheckbox) this.elements.mysidelineCheckbox.addEventListener('change', updateButtonState);
        updateButtonState();
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
                alert(`Carnival ${action}d successfully!`);
                // Defer reload to avoid jsdom navigation errors in tests
                setTimeout(() => {
                    try { window.location.reload(); } catch (_) { /* noop in non-browser env */ }
                }, 0);
            } else {
                alert('Error: ' + (data.message || 'Failed to update carnival status'));
                if (button && originalContent !== null) {
                    button.innerHTML = originalContent;
                    button.disabled = false;
                }
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('An error occurred while updating the carnival status. Please try again.');
            if (button && originalContent !== null) {
                button.innerHTML = originalContent;
                button.disabled = false;
            }
        });
    },

    /** Acknowledge and close post-creation modal */
    acknowledgeAndClose() {
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const instance = bootstrap.Modal.getInstance(document.getElementById('postCreationModal'));
            if (instance) instance.hide();
        }

        const url = new URL(window.location);
        url.searchParams.delete('showPostCreationModal');
        try {
            window.history.replaceState({}, document.title, url.toString());
        } catch (_) {
            // ignore in test environments without full URL support
        }
    },

    /** Confirm merge operation flow */
    confirmMerge() {
        const targetSelect = document.getElementById('targetCarnivalId');
        const targetCarnivalName = document.getElementById('targetCarnivalName');
        if (!targetSelect || !targetSelect.value) {
            alert('Please select a carnival to merge into.');
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
