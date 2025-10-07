/**
 * UI Helper Utilities
 * Common UI functions used across the application
 */

/**
 * Show alert banner using Bootstrap alert classes
 * @param {string} message - Alert message to display  
 * @param {string} type - Bootstrap alert type ('success', 'danger', 'warning', 'info')
 */
export function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert-banner');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-banner position-fixed`;
    alert.style.cssText = 'top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; min-width: 300px; text-align: center;';
    alert.innerHTML = message;

    // Add to page
    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert && alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

/**
 * Show confirmation dialog with custom message
 * @param {string} message - Confirmation message
 * @returns {boolean} - User's choice
 */
export function showConfirmation(message) {
    return confirm(message);
}

/**
 * Validate required form fields and show visual feedback
 * @param {HTMLFormElement} form - Form to validate
 * @returns {boolean} - Whether form is valid
 */
export function validateRequiredFields(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!String(field.value || '').trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });

    return isValid;
}

/**
 * Clear validation classes from form fields
 * @param {HTMLFormElement} form - Form to clear
 */
export function clearValidationClasses(form) {
    const fields = form.querySelectorAll('.is-invalid, .is-valid');
    fields.forEach(field => {
        field.classList.remove('is-invalid', 'is-valid');
    });
}

/**
 * Set loading state for a button
 * @param {HTMLButtonElement} button - Button element
 * @param {boolean} isLoading - Whether button should show loading state
 * @param {string} loadingText - Text to show when loading (default: 'Loading...')
 */
export function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
    if (!button) return;

    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
        delete button.dataset.originalText;
    }
}
