/**
 * UI Helper Utilities
 * Shared utility functions for client-side UI interactions
 */

/**
 * Show alert banner using Bootstrap alert classes
 * @param {string} message - Alert message to display  
 * @param {string} type - Bootstrap alert type ('success', 'danger', 'warning', 'info')
 */
export function showAlert(message, type = 'danger') {
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
 * Show success alert
 * @param {string} message - Success message to display
 */
export function showSuccess(message) {
    showAlert(message, 'success');
}

/**
 * Show error alert
 * @param {string} message - Error message to display
 */
export function showError(message) {
    showAlert(message, 'danger');
}

/**
 * Show warning alert
 * @param {string} message - Warning message to display
 */
export function showWarning(message) {
    showAlert(message, 'warning');
}

/**
 * Show info alert
 * @param {string} message - Info message to display
 */
export function showInfo(message) {
    showAlert(message, 'info');
}
