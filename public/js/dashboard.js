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
            const checklistCard = document.getElementById('quickStartChecklist');
            if (checklistCard) checklistCard.style.display = 'none';
        }
        // Initialize Leave Club modal helpers
        this.initializeLeaveClubModal();
        // Initialize checklist interactions
        this.initializeChecklist();
    },

    cacheElements() {
        this.elements.checklistCard = document.getElementById('quickStartChecklist');
        this.elements.dismissChecklistBtn = document.querySelector('[data-action="dismiss-checklist"]');
        this.elements.transferForm = document.querySelector('[data-action="transfer-role"]');
        this.elements.tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
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