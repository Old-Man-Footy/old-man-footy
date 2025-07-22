/**
 * Authentication JavaScript
 * Handles authentication-related functionality including password toggle and form validation
 */

/**
 * Toggle password visibility for a given field
 * @param {string} fieldId - The ID of the password field to toggle
 */
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = document.getElementById(fieldId + '-toggle-icon');
    
    if (field && icon) {
        if (field.type === 'password') {
            field.type = 'text';
            icon.className = 'bi bi-eye-slash';
        } else {
            field.type = 'password';
            icon.className = 'bi bi-eye';
        }
    }
}

/**
 * Initialize authentication functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Authentication functionality loaded...');
    
    // Setup password toggle buttons
    document.querySelectorAll('[data-toggle-password]').forEach(button => {
        button.addEventListener('click', function() {
            const fieldId = this.getAttribute('data-toggle-password');
            togglePassword(fieldId);
        });
    });
    
    // Setup password validation for invitation acceptance form
    const form = document.querySelector('form[data-form-type="accept-invitation"]');
    if (form) {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (password && confirmPassword) {
            function validatePasswords() {
                if (password.value !== confirmPassword.value) {
                    confirmPassword.setCustomValidity('Passwords do not match');
                } else {
                    confirmPassword.setCustomValidity('');
                }
            }
            
            password.addEventListener('input', validatePasswords);
            confirmPassword.addEventListener('input', validatePasswords);
            
            form.addEventListener('submit', function(e) {
                validatePasswords();
                if (!form.checkValidity()) {
                    e.preventDefault();
                }
            });
        }
    }
    
    // Setup login form validation
    const loginForm = document.querySelector('form[data-form-type="login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const email = this.querySelector('input[name="email"]');
            const password = this.querySelector('input[name="password"]');
            
            if (!email.value.trim() || !password.value.trim()) {
                e.preventDefault();
                alert('Please enter both email and password.');
            }
        });
    }
    
    console.log('Authentication functionality initialized successfully');
});

export { togglePassword };