/**
 * Dashboard JavaScript (Manager Object Pattern)
 * Handles dashboard functionality including carnival filtering and user interactions
 */

export const dashboardManager = {
    elements: {},

    initialize() {
        this.cacheElements();
        this.bindEvents();
        // Initialize with all carnivals showing for both tabs
        this.showAll('hosted');
        this.showAll('attending');
        // Hide checklist if previously dismissed
        if (localStorage.getItem('checklistDismissed') === 'true') {            
            if (this.elements.checklistCard) this.elements.checklistCard.style.display = 'none';
        }
        // Initialize Leave Club modal helpers
        this.initializeLeaveClubModal();
        // Initialize checklist interactions
        this.initializeChecklist();
        // Initialize password reset functionality
        this.initializePasswordReset();
        // Initialize email subscription functionality
        this.initializeEmailSubscription();
    },

    cacheElements() {
        this.elements.checklistCard = document.getElementById('quickStartChecklist');
        this.elements.dismissChecklistBtn = document.querySelector('[data-action="dismiss-checklist"]');
        this.elements.transferForm = document.querySelector('[data-action="transfer-role"]');
        this.elements.tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
        
        // Password reset elements
        this.elements.passwordResetForm = document.getElementById('passwordResetForm');
        this.elements.submitPasswordReset = document.getElementById('submitPasswordReset');
        this.elements.passwordResetMessages = document.getElementById('passwordResetMessages');
        this.elements.updatePasswordModal = document.getElementById('updatePasswordModal');
        
        // Email subscription elements
        this.elements.emailSubscriptionModal = document.getElementById('emailSubscriptionModal');
        this.elements.subscriptionToggle = document.getElementById('subscriptionToggle');
        this.elements.stateSelection = document.getElementById('stateSelection');
        this.elements.stateCheckboxes = document.querySelectorAll('.state-checkbox');
        this.elements.selectAllStatesBtn = document.getElementById('selectAllStates');
        this.elements.clearAllStatesBtn = document.getElementById('clearAllStates');
        this.elements.unsubscribeSection = document.getElementById('unsubscribeSection');
        this.elements.unsubscribeBtn = document.getElementById('unsubscribeBtn');
        this.elements.saveSubscriptionBtn = document.getElementById('saveSubscriptionBtn');
        this.elements.subscriptionAlert = document.getElementById('subscriptionAlert');
    },

    bindEvents() {
        // Delegated filter buttons
        document.addEventListener('click', (carnival) => {
            const filterButton = carnival.target.closest('[data-filter]');
            if (!filterButton) return;
            carnival.preventDefault();
            const filter = filterButton.dataset.filter;
            const target = filterButton.dataset.target;
            switch (filter) {
                case 'all':
                    this.showAll(target);
                    break;
                case 'upcoming':
                    this.showUpcoming(target);
                    break;
                case 'past':
                    this.showPast(target);
                    break;
            }
        });

        // Dismiss checklist
        if (this.elements.dismissChecklistBtn) {
            this.elements.dismissChecklistBtn.addEventListener('click', () => this.dismissChecklist());
        }

        // Navigation buttons
        document.querySelectorAll('[data-action="navigate"]').forEach((button) => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                if (target) this.navigateTo(target);
            });
        });

        // Transfer role form
        if (this.elements.transferForm) {
            this.elements.transferForm.addEventListener('submit', (e) => {
                if (!this.confirmTransfer()) e.preventDefault();
            });
        }

        // Tab switching
        this.elements.tabButtons?.forEach((tab) => {
            tab.addEventListener('shown.bs.tab', (carnival) => {
                const targetPane = carnival.target.getAttribute('data-bs-target');
                if (targetPane === '#hosted-carnivals') this.showAll('hosted');
                else if (targetPane === '#attending-carnivals') this.showAll('attending');
            });
        });
    },

    // Filtering
    showAll(target = null) {
        const selector = target ? `.${target}-carnival` : '.carnival-item';
        document.querySelectorAll(selector).forEach((item) => {
            item.style.display = 'block';
        });
        this.updateActiveFilter('all', target);
    },

    showUpcoming(target = null) {
        const now = Date.now();
        const selector = target ? `.${target}-carnival` : '.carnival-item';
        document.querySelectorAll(selector).forEach((item) => {
            const itemDate = parseInt(item.dataset.date);
            item.style.display = itemDate >= now ? 'block' : 'none';
        });
        this.updateActiveFilter('upcoming', target);
    },

    showPast(target = null) {
        const now = Date.now();
        const selector = target ? `.${target}-carnival` : '.carnival-item';
        document.querySelectorAll(selector).forEach((item) => {
            const itemDate = parseInt(item.dataset.date);
            item.style.display = itemDate < now ? 'block' : 'none';
        });
        this.updateActiveFilter('past', target);
    },

    updateActiveFilter(filter, target = null) {
        const buttonSelector = target ? `[data-target="${target}"]` : '[data-filter]';
        document.querySelectorAll(buttonSelector).forEach((btn) => btn.classList.remove('active'));
        const activeSelector = target
            ? `[data-filter="${filter}"][data-target="${target}"]`
            : `[data-filter="${filter}"]`;
        document.querySelector(activeSelector)?.classList.add('active');
    },

    // Confirm transfer role
    confirmTransfer() {
        const select = document.getElementById('newPrimaryUserId');
        if (!select || !select.value) {
            alert('Please select a delegate to transfer the role to.');
            return false;
        }
        const selectedOption = select.options[select.selectedIndex];
        const delegateName = (selectedOption?.text || '').split(' (')[0];
        const confirmMessage = `Are you sure you want to transfer the primary delegate role to ${delegateName}?\n\nThis action cannot be undone. You will lose your primary delegate privileges and ${delegateName} will become the new primary delegate.`;
        return confirm(confirmMessage);
    },

    // Checklist dismissal
    dismissChecklist() {
        const card = this.elements.checklistCard || document.getElementById('quickStartChecklist');
        if (card) card.style.display = 'none';
        localStorage.setItem('checklistDismissed', 'true');
    },

    // Checklist interactions
    initializeChecklist() {
        const checklistItems = document.querySelectorAll('.checklist-item');
        checklistItems.forEach((checkbox) => {
            const step = checkbox.dataset.step;
            const savedState = localStorage.getItem(`checklist-${step}`);
            if (savedState === 'completed') this.applyChecklistCompleted(checkbox);
            checkbox.addEventListener('change', function () {
                const listItem = this.closest('.list-group-item');
                const label = listItem?.querySelector('label');
                const actionButton = listItem?.querySelector('.btn');
                if (this.checked) {
                    this.disabled = true;
                    localStorage.setItem(`checklist-${this.dataset.step}`, 'completed');
                    listItem?.classList.add('checklist-completed');
                    if (label) {
                        label.style.opacity = '0.7';
                        label.style.textDecoration = 'line-through';
                    }
                    if (actionButton) actionButton.style.display = 'none';
                    dashboardManager.showChecklistSuccess(this);
                } else {
                    this.disabled = false;
                    localStorage.removeItem(`checklist-${this.dataset.step}`);
                    listItem?.classList.remove('checklist-completed');
                    if (label) {
                        label.style.opacity = '1';
                        label.style.textDecoration = 'none';
                    }
                    if (actionButton) actionButton.style.display = 'inline-block';
                }
            });
        });
    },

    applyChecklistCompleted(checkbox) {
        checkbox.checked = true;
        checkbox.disabled = true;
        const listItem = checkbox.closest('.list-group-item');
        listItem?.classList.add('checklist-completed');
        const label = listItem?.querySelector('label');
        if (label) {
            label.style.opacity = '0.7';
            label.style.textDecoration = 'line-through';
        }
        const actionButton = listItem?.querySelector('.btn');
        if (actionButton) actionButton.style.display = 'none';
    },

    showChecklistSuccess(checkbox) {
        const container = checkbox.closest('.list-group-item');
        if (!container) return;
        const successIcon = document.createElement('i');
        successIcon.className = 'bi bi-check-circle-fill text-success position-absolute';
        successIcon.style.cssText = `font-size: 1.5rem; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; animation: checklistSuccess 0.6s ease-out;`;
        container.style.position = 'relative';
        container.appendChild(successIcon);
        setTimeout(() => {
            successIcon.remove();
            container.style.position = '';
        }, 600);
    },

    // Leave Club modal helpers (guard for missing ids)
    initializeLeaveClubModal() {
        const leaveClubModal = document.getElementById('leaveClubModal');
        if (!leaveClubModal) return;
        const radioButtons = leaveClubModal.querySelectorAll('input[name="leaveAction"]');
        const delegateSelection = document.getElementById('delegateSelection');
        const delegateSelect = document.getElementById('newPrimaryDelegateId');
        const submitButton = leaveClubModal.querySelector('button[type="submit"]');

        radioButtons.forEach((radio) => {
            radio.addEventListener('change', function () {
                if (delegateSelection && delegateSelect) {
                    if (this.value === 'transfer') {
                        delegateSelection.style.display = 'block';
                        delegateSelect.required = true;
                    } else {
                        delegateSelection.style.display = 'none';
                        delegateSelect.required = false;
                        delegateSelect.value = '';
                    }
                }
                dashboardManager.updateLeaveSubmitButtonText(submitButton, this.value);
            });
        });

        const leaveClubForm = leaveClubModal.querySelector('form');
        if (leaveClubForm && submitButton) {
            leaveClubForm.addEventListener('submit', function (e) {
                const selectedAction = leaveClubModal.querySelector('input[name="leaveAction"]:checked');
                if (selectedAction?.value === 'transfer' && delegateSelect && !delegateSelect.value) {
                    e.preventDefault();
                    alert('Please select a delegate to transfer the primary role to.');
                    delegateSelect?.focus();
                    return false;
                }
                const confirmCheckbox = leaveClubModal.querySelector('#confirmLeave');
                if (confirmCheckbox && !confirmCheckbox.checked) {
                    e.preventDefault();
                    alert('Please confirm that you want to leave the club.');
                    confirmCheckbox.focus();
                    return false;
                }
                return true;
            });
        }

        leaveClubModal.addEventListener('show.bs.modal', function () {
            const transferRadio = leaveClubModal.querySelector('#transferToDelegate');
            if (transferRadio?.checked && delegateSelection && delegateSelect) {
                delegateSelection.style.display = 'block';
                delegateSelect.required = true;
            }
            const checkedRadio = leaveClubModal.querySelector('input[name="leaveAction"]:checked');
            if (checkedRadio) dashboardManager.updateLeaveSubmitButtonText(submitButton, checkedRadio.value);
        });
    },

    updateLeaveSubmitButtonText(submitButton, actionValue) {
        if (!submitButton) return;
        const icon = '<i class="bi bi-box-arrow-right"></i>';
        switch (actionValue) {
            case 'transfer':
                submitButton.innerHTML = `${icon} Leave & Transfer Role`;
                submitButton.className = 'btn btn-tertiary';
                break;
            case 'deactivate':
                submitButton.innerHTML = `${icon} Leave & Deactivate Club`;
                submitButton.className = 'btn btn-danger';
                break;
            case 'available':
            default:
                submitButton.innerHTML = `${icon} Leave Club`;
                submitButton.className = 'btn btn-danger';
                break;
        }
    },

    /**
     * Initialize password reset functionality
     */
    initializePasswordReset() {
        if (!this.elements.passwordResetForm || !this.elements.submitPasswordReset) {
            return; // Elements not found, skip initialization
        }

        // Handle password reset form submission
        this.elements.submitPasswordReset.addEventListener('click', (e) => {
            e.preventDefault();
            this.handlePasswordResetSubmission();
        });

        // Clear messages when modal is opened
        if (this.elements.updatePasswordModal) {
            this.elements.updatePasswordModal.addEventListener('show.bs.modal', () => {
                this.clearPasswordResetMessages();
                this.clearPasswordResetForm();
            });
        }
    },

    /**
     * Handle password reset form submission
     */
    async handlePasswordResetSubmission() {
        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        // Clear any existing messages
        this.clearPasswordResetMessages();

        // Client-side validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showPasswordResetMessage('All fields are required.', 'danger');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showPasswordResetMessage('New password and confirmation do not match.', 'danger');
            return;
        }

        if (newPassword.length < 8) {
            this.showPasswordResetMessage('New password must be at least 8 characters long.', 'danger');
            return;
        }

        // Disable submit button during processing
        const originalButtonText = this.elements.submitPasswordReset.innerHTML;
        this.elements.submitPasswordReset.disabled = true;
        this.elements.submitPasswordReset.innerHTML = '<i class="bi bi-hourglass-split"></i> Updating...';

        try {
            const response = await fetch('/auth/password-reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    existingPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showPasswordResetMessage('Password updated successfully!', 'success');
                // Clear form after success
                setTimeout(() => {
                    this.clearPasswordResetForm();
                    // Close modal after short delay
                    const modal = bootstrap.Modal.getInstance(this.elements.updatePasswordModal);
                    if (modal) {
                        modal.hide();
                    }
                }, 2000);
            } else {
                this.showPasswordResetMessage(result.message || 'Failed to update password. Please try again.', 'danger');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            this.showPasswordResetMessage('An error occurred. Please try again.', 'danger');
        } finally {
            // Re-enable submit button
            this.elements.submitPasswordReset.disabled = false;
            this.elements.submitPasswordReset.innerHTML = originalButtonText;
        }
    },

    /**
     * Show password reset message
     */
    showPasswordResetMessage(message, type = 'info') {
        if (!this.elements.passwordResetMessages) return;

        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'danger' ? 'alert-danger' : 'alert-info';
        
        const icon = type === 'success' ? 'bi-check-circle' : 
                    type === 'danger' ? 'bi-exclamation-triangle' : 'bi-info-circle';

        this.elements.passwordResetMessages.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="bi ${icon}"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    },

    /**
     * Clear password reset messages
     */
    clearPasswordResetMessages() {
        if (this.elements.passwordResetMessages) {
            this.elements.passwordResetMessages.innerHTML = '';
        }
    },

    /**
     * Clear password reset form
     */
    clearPasswordResetForm() {
        if (this.elements.passwordResetForm) {
            this.elements.passwordResetForm.reset();
        }
    },

    /**
     * Initialize email subscription functionality
     */
    initializeEmailSubscription() {
        if (!this.elements.emailSubscriptionModal) return;

        // Load subscription data when modal opens
        this.elements.emailSubscriptionModal.addEventListener('shown.bs.modal', () => {
            this.loadSubscriptionData();
        });

        // Handle subscription toggle
        this.elements.subscriptionToggle?.addEventListener('change', () => {
            this.toggleSubscriptionState();
        });

        // Handle select all states
        this.elements.selectAllStatesBtn?.addEventListener('click', () => {
            this.selectAllStates();
        });

        // Handle clear all states
        this.elements.clearAllStatesBtn?.addEventListener('click', () => {
            this.clearAllStates();
        });

        // Handle unsubscribe
        this.elements.unsubscribeBtn?.addEventListener('click', () => {
            this.handleUnsubscribe();
        });

        // Handle save subscription
        this.elements.saveSubscriptionBtn?.addEventListener('click', () => {
            this.saveSubscription();
        });
    },

    /**
     * Load subscription data from API
     */
    async loadSubscriptionData() {
        try {
            const response = await fetch('/api/subscriptions/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load subscription data');
            }

            const data = await response.json();
            this.populateSubscriptionForm(data.subscription);
        } catch (error) {
            console.error('Error loading subscription data:', error);
            this.showSubscriptionAlert('Error loading subscription data', 'danger');
        }
    },

    /**
     * Populate the subscription form with data
     */
    populateSubscriptionForm(subscription) {
        const isSubscribed = subscription && subscription.isActive;
        
        // Set subscription toggle
        if (this.elements.subscriptionToggle) {
            this.elements.subscriptionToggle.checked = isSubscribed;
        }

        // Show/hide sections based on subscription status
        this.toggleSubscriptionState();

        // Set state checkboxes
        if (subscription && subscription.states) {
            this.elements.stateCheckboxes.forEach(checkbox => {
                checkbox.checked = subscription.states.includes(checkbox.value);
            });
        }
    },

    /**
     * Toggle subscription state sections
     */
    toggleSubscriptionState() {
        const isChecked = this.elements.subscriptionToggle?.checked;
        
        if (this.elements.stateSelection) {
            this.elements.stateSelection.style.display = isChecked ? 'block' : 'none';
        }
        
        if (this.elements.unsubscribeSection) {
            this.elements.unsubscribeSection.style.display = isChecked ? 'block' : 'none';
        }
    },

    /**
     * Select all states
     */
    selectAllStates() {
        this.elements.stateCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    },

    /**
     * Clear all states
     */
    clearAllStates() {
        this.elements.stateCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    },

    /**
     * Handle unsubscribe action
     */
    async handleUnsubscribe() {
        if (!confirm('Are you sure you want to unsubscribe from all email notifications?')) {
            return;
        }

        try {
            const response = await fetch('/api/subscriptions/me', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to unsubscribe');
            }

            this.showSubscriptionAlert('Successfully unsubscribed from all email notifications', 'success');
            
            // Reset form
            this.elements.subscriptionToggle.checked = false;
            this.toggleSubscriptionState();
            this.clearAllStates();
            
            // Close modal after delay
            setTimeout(() => {
                bootstrap.Modal.getInstance(this.elements.emailSubscriptionModal)?.hide();
                // Refresh page to update subscription status in dashboard
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error unsubscribing:', error);
            this.showSubscriptionAlert('Error unsubscribing. Please try again.', 'danger');
        }
    },

    /**
     * Save subscription preferences
     */
    async saveSubscription() {
        const isSubscribed = this.elements.subscriptionToggle?.checked;
        
        if (!isSubscribed) {
            this.showSubscriptionAlert('Please enable email notifications first', 'warning');
            return;
        }

        // Get selected states
        const selectedStates = Array.from(this.elements.stateCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        if (selectedStates.length === 0) {
            this.showSubscriptionAlert('Please select at least one state/territory', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/subscriptions/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isActive: true,
                    states: selectedStates
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save subscription');
            }

            this.showSubscriptionAlert('Email preferences saved successfully!', 'success');
            
            // Close modal after delay
            setTimeout(() => {
                bootstrap.Modal.getInstance(this.elements.emailSubscriptionModal)?.hide();
                // Refresh page to update subscription status in dashboard
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error saving subscription:', error);
            this.showSubscriptionAlert('Error saving preferences. Please try again.', 'danger');
        }
    },

    /**
     * Show subscription alert message
     */
    showSubscriptionAlert(message, type = 'info') {
        if (!this.elements.subscriptionAlert) return;

        this.elements.subscriptionAlert.className = `alert alert-${type}`;
        this.elements.subscriptionAlert.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;
        this.elements.subscriptionAlert.style.display = 'block';

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                this.elements.subscriptionAlert.style.display = 'none';
            }, 3000);
        }
    },

    // Navigation (testable)
    navigateTo(url) {
        try {
            window.location.href = url;
        } catch {
            /* noop for jsdom */
        }
    },

    // Utilities (legacy shim)
    confirmDelete(message) {
        return confirm(message || 'Are you sure you want to delete this item? This action cannot be undone.');
    },

    showSuccessMessage(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }
};

// Legacy global shim for any external calls
window.dashboard = window.dashboard || {
    confirmDelete: (msg) => dashboardManager.confirmDelete(msg),
    showSuccessMessage: (msg) => dashboardManager.showSuccessMessage(msg)
};

// Auto-initialize in browser
document.addEventListener('DOMContentLoaded', () => {
    dashboardManager.initialize();
});