/**
 * Auth Register JavaScript
 * Handles password confirmation validation for the registration form
 */

document.addEventListener('DOMContentLoaded', function() {
    // Password confirmation validation
    const confirmPasswordField = document.getElementById('confirmPassword');
    const passwordField = document.getElementById('password');
    
    if (confirmPasswordField && passwordField) {
        confirmPasswordField.addEventListener('input', function() {
            const password = passwordField.value;
            const confirmPassword = this.value;
            
            if (password !== confirmPassword) {
                this.setCustomValidity('Passwords do not match');
            } else {
                this.setCustomValidity('');
            }
        });
    }
});