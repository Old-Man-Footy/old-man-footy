/**
 * Common utilities manager
 */
export const commonUtilsManager = {
    initialize() {
        this.bindEvents();
        // Provide legacy global API shim for inline handlers if present
        try {
            window.oldmanfooty = window.oldmanfooty || {};
            window.oldmanfooty.confirmDelete = (msg) => this.confirmDelete(msg);
        } catch {}
        try { if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') console.log('Common utilities initialized'); } catch {}
    },

    confirmDelete(message = 'Are you sure you want to delete this item? This action cannot be undone.') {
        return confirm(message);
    },

    printPage() { try { window.print(); } catch {} },
    reloadPage() { try { location.reload(); } catch {} },

    togglePassword(fieldId) {
        const passwordField = document.getElementById(fieldId);
        const toggleButton = document.querySelector(`[data-toggle-password="${fieldId}"]`);
        if (passwordField && toggleButton) {
            const isPassword = passwordField.type === 'password';
            passwordField.type = isPassword ? 'text' : 'password';
            const icon = toggleButton.querySelector('i');
            if (icon) icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        }
    },

    proceedAnyway() {
        const warningAlert = document.querySelector('.alert-warning');
        if (warningAlert) warningAlert.style.display = 'none';
        document.querySelectorAll('input[disabled], select[disabled], textarea[disabled]').forEach(field => { field.disabled = false; });
    },

    clearForm() {
        document.querySelectorAll('form').forEach(form => { if (typeof form.reset === 'function') form.reset(); });
    },

    bindEvents() {
        document.querySelectorAll('[data-action="print"]').forEach(btn => btn.addEventListener('click', () => this.printPage()));
        document.querySelectorAll('[data-action="reload"]').forEach(btn => btn.addEventListener('click', () => this.reloadPage()));
        document.querySelectorAll('[data-toggle-password]').forEach(btn => btn.addEventListener('click', (e) => {
            const fieldId = e.currentTarget.getAttribute('data-toggle-password');
            this.togglePassword(fieldId);
        }));
        document.querySelectorAll('[data-action="proceed-anyway"]').forEach(btn => btn.addEventListener('click', () => this.proceedAnyway()));
        document.querySelectorAll('[data-action="clear-form"]').forEach(btn => btn.addEventListener('click', () => this.clearForm()));
        document.querySelectorAll('[data-confirm-delete]').forEach(form => form.addEventListener('submit', (e) => {
            const message = form.getAttribute('data-confirm-delete');
            if (!this.confirmDelete(message)) e.preventDefault();
        }));
        document.querySelectorAll('[data-confirm]').forEach(el => el.addEventListener('click', (e) => {
            const message = el.getAttribute('data-confirm');
            if (!confirm(message)) e.preventDefault();
        }));
        document.querySelectorAll('form[data-confirm-submit]').forEach(form => form.addEventListener('submit', (e) => {
            const message = form.getAttribute('data-confirm-submit');
            if (!confirm(message)) e.preventDefault();
        }));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try { commonUtilsManager.initialize(); } catch {}
});