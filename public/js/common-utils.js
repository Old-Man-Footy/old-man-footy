/**
 * Common JavaScript utilities
 * Shared functionality across multiple pages for CSP compliance
 */

/**
 * Global confirmation dialog for delete actions
 * @param {string} message - The confirmation message to display
 * @returns {boolean} - True if user confirms, false otherwise
 */
function confirmDelete(message = 'Are you sure you want to delete this item? This action cannot be undone.') {
    return confirm(message);
}

/**
 * Print functionality for reports and pages
 */
function printPage() {
    window.print();
}

/**
 * Reload page functionality
 */
function reloadPage() {
    location.reload();
}

/**
 * Toggle password visibility for forms
 * @param {string} fieldId - The ID of the password field to toggle
 */
function togglePassword(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const toggleButton = document.querySelector(`[data-toggle-password="${fieldId}"]`);
    
    if (passwordField && toggleButton) {
        const isPassword = passwordField.type === 'password';
        passwordField.type = isPassword ? 'text' : 'password';
        
        // Update button icon if using Bootstrap Icons
        const icon = toggleButton.querySelector('i');
        if (icon) {
            icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        }
    }
}

/**
 * Proceed anyway functionality for warnings
 */
function proceedAnyway() {
    const warningAlert = document.querySelector('.alert-warning');
    if (warningAlert) {
        warningAlert.style.display = 'none';
    }
    
    // Enable any disabled form fields
    document.querySelectorAll('input[disabled], select[disabled], textarea[disabled]').forEach(field => {
        field.disabled = false;
    });
}

/**
 * Clear form functionality
 */
function clearForm() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if (form.reset) {
            form.reset();
        }
    });
}

/**
 * Setup common event listeners when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Common utilities functionality loaded...');
    
    // Setup print buttons
    document.querySelectorAll('[data-action="print"]').forEach(button => {
        button.addEventListener('click', printPage);
    });
    
    // Setup reload buttons
    document.querySelectorAll('[data-action="reload"]').forEach(button => {
        button.addEventListener('click', reloadPage);
    });
    
    // Setup password toggle buttons
    document.querySelectorAll('[data-toggle-password]').forEach(button => {
        button.addEventListener('click', function() {
            const fieldId = this.getAttribute('data-toggle-password');
            togglePassword(fieldId);
        });
    });
    
    // Setup proceed anyway buttons
    document.querySelectorAll('[data-action="proceed-anyway"]').forEach(button => {
        button.addEventListener('click', proceedAnyway);
    });
    
    // Setup clear form buttons
    document.querySelectorAll('[data-action="clear-form"]').forEach(button => {
        button.addEventListener('click', clearForm);
    });
    
    // Setup delete confirmation forms
    document.querySelectorAll('[data-confirm-delete]').forEach(form => {
        form.addEventListener('submit', function(e) {
            const message = this.getAttribute('data-confirm-delete');
            if (!confirmDelete(message)) {
                e.preventDefault();
            }
        });
    });
    
    // Setup confirmation dialogs for buttons and forms with data-confirm attribute
    document.querySelectorAll('[data-confirm]').forEach(element => {
        element.addEventListener('click', function(e) {
            const message = this.getAttribute('data-confirm');
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });
    
    // Setup form submission confirmations
    document.querySelectorAll('form[data-confirm-submit]').forEach(form => {
        form.addEventListener('submit', function(e) {
            const message = this.getAttribute('data-confirm-submit');
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });
    
    console.log('Common utilities functionality initialized successfully');
});