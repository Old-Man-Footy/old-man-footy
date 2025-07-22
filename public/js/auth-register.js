/**
 * @file Auth Register JavaScript
 * @description Handles password confirmation validation for the registration form.
 * Attaches event listeners robustly for both runtime and test environments.
 */

/**
 * Attach password confirmation validation to the registration form.
 */
function setupPasswordConfirmationValidation() {
  const confirmPasswordField = document.getElementById('confirmPassword');
  const passwordField = document.getElementById('password');

  if (confirmPasswordField && passwordField) {
    confirmPasswordField.addEventListener('input', function () {
      const password = passwordField.value;
      const confirmPassword = this.value;

      if (password !== confirmPassword) {
        this.setCustomValidity('Passwords do not match');
      } else {
        this.setCustomValidity('');
      }
    });
  }
}

// Attach immediately if DOM is ready, otherwise on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPasswordConfirmationValidation);
} else {
  setupPasswordConfirmationValidation();
}

export { setupPasswordConfirmationValidation };