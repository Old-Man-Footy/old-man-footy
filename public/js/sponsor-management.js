/**
 * Sponsor Management (Manager Object Pattern)
 * Handles sponsor-related functionality including status toggle, deletion confirmation,
 * and removal confirmations.
 */
export const sponsorManagementManager = {
    elements: {},

    initialize() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements.root = document;
        this.elements.sponsorId = document.querySelector('[data-sponsor-id]')?.getAttribute('data-sponsor-id') || null;
        const currentStatusAttr = document.querySelector('[data-current-status]')?.getAttribute('data-current-status');
        this.elements.currentStatus = currentStatusAttr === 'true';
        this.elements.toggleBtn = document.querySelector('[data-action="toggle-status-btn"]');
        this.elements.removeForms = Array.from(document.querySelectorAll('[data-confirm-remove]'));
    },

    bindEvents() {
        if (this.elements.toggleBtn) {
            this.elements.toggleBtn.addEventListener('click', () => this.toggleStatus());
        }
        if (this.elements.deleteBtn) {
            this.elements.deleteBtn.addEventListener('click', () => this.confirmDelete());
        }
        this.elements.removeForms.forEach((form) => {
            form.addEventListener('submit', (e) => {
                const sponsorName = form.getAttribute('data-sponsor-name') || '';
                const message = form.getAttribute('data-confirm-remove') || '';
                const fullMessage = message.replace('SPONSOR_NAME', sponsorName);
                if (!this.safeConfirm(fullMessage)) {
                    e.preventDefault();
                }
            });
        });
    },

    safeConfirm(message) {
        try {
            return typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(message) : true;
        } catch {
            return true;
        }
    },

    safeAlert(message) {
        try {
            if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(message);
        } catch {
            /* no-op in non-browser */
        }
    },

    reloadPage() {
        try {
            if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
                window.location.reload();
            }
        } catch {
            /* no-op in tests */
        }
    },

    redirectToList() {
        try {
            if (typeof window !== 'undefined' && window.location) {
                window.location.href = '/sponsors';
            }
        } catch {
            /* no-op in tests */
        }
    },

    toggleStatus() {
        const sponsorId = this.elements.sponsorId;
        if (!sponsorId) {
            console.error('Sponsor ID not found');
            return;
        }
        const newStatus = !this.elements.currentStatus;
        fetch(`/sponsors/${sponsorId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ isActive: newStatus })
        })
            .then((response) => {
                if (response.ok) {
                    this.reloadPage();
                } else {
                    this.safeAlert('Error updating sponsor status. Please try again.');
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                this.safeAlert('Error updating sponsor status. Please try again.');
            });
    },

    confirmDelete() {
        const sponsorId = this.elements.sponsorId;
        if (!sponsorId) {
            console.error('Sponsor ID not found');
            return;
        }
        const confirmMessage = 'Are you sure you want to delete this sponsor? This action cannot be undone and will remove the sponsor from all associated clubs and carnivals.';
        if (!this.safeConfirm(confirmMessage)) return;
        fetch(`/sponsors/${sponsorId}`, {
            method: 'DELETE',
            headers: { 
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
            .then((response) => {
                if (response.ok) {
                    this.redirectToList();
                } else {
                    this.safeAlert('Error deleting sponsor. Please try again.');
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                this.safeAlert('Error deleting sponsor. Please try again.');
            });
    }
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => sponsorManagementManager.initialize());