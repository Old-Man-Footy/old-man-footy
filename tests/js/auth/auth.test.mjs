import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { AuthFormManager } from '../../../public/js/auth.js';

describe('AuthFormManager', () => {
    let container, manager;

    /**
     * Sets up the DOM structure needed for the tests.
     */
    function setupDOM() {
        document.body.innerHTML = `
            <div id="auth-container">
                <!-- Invitation Form for password confirmation and toggle tests -->
                <form data-form-type="accept-invitation">
                    <input type="password" id="password" value="password123">
                    <input type="password" id="confirmPassword" value="password123">
                    <button type="button" data-toggle-password="password">Toggle</button>
                    <i id="password-toggle-icon" class="bi bi-eye"></i>
                </form>

                <!-- Login Form for basic validation test -->
                <form data-form-type="login">
                    <input name="email" value="">
                    <input name="password" value="">
                    <button type="submit">Login</button>
                </form>
            </div>
        `;
        container = document.getElementById('auth-container');
    }

    beforeEach(() => {
        setupDOM();
        manager = new AuthFormManager(container);
        manager.init();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    describe('Password Visibility Toggle', () => {
        it('should toggle password field to text and update icon on click', () => {
            const passwordField = container.querySelector('#password');
            const icon = container.querySelector('#password-toggle-icon');
            const toggleButton = container.querySelector('[data-toggle-password="password"]');

            toggleButton.click();

            expect(passwordField.type).toBe('text');
            expect(icon.className).toBe('bi bi-eye-slash');
        });

        it('should toggle password field back to password and update icon on second click', () => {
            const passwordField = container.querySelector('#password');
            const icon = container.querySelector('#password-toggle-icon');
            const toggleButton = container.querySelector('[data-toggle-password="password"]');

            // First click
            toggleButton.click();
            // Second click
            toggleButton.click();

            expect(passwordField.type).toBe('password');
            expect(icon.className).toBe('bi bi-eye');
        });
    });

    describe('Invitation Form Validation', () => {
        it('should set custom validity if passwords do not match', () => {
            const passwordField = container.querySelector('#password');
            const confirmPasswordField = container.querySelector('#confirmPassword');
            confirmPasswordField.setCustomValidity = vi.fn();

            passwordField.value = 'password123';
            confirmPasswordField.value = 'password456';

            // Simulate input carnival on the form
            const form = container.querySelector('form[data-form-type="accept-invitation"]');
            form.dispatchEvent(new Carnival('input', { bubbles: true }));

            expect(confirmPasswordField.setCustomValidity).toHaveBeenCalledWith('Passwords do not match');
        });

        it('should clear custom validity if passwords match', () => {
            const passwordField = container.querySelector('#password');
            const confirmPasswordField = container.querySelector('#confirmPassword');
            confirmPasswordField.setCustomValidity = vi.fn();
            
            // Set to a non-matching state first
            passwordField.value = 'password123';
            confirmPasswordField.value = 'password456';
            
            // Correct the value
            confirmPasswordField.value = 'password123';

            // Simulate input carnival on the form
            const form = container.querySelector('form[data-form-type="accept-invitation"]');
            form.dispatchEvent(new Carnival('input', { bubbles: true }));

            expect(confirmPasswordField.setCustomValidity).toHaveBeenCalledWith('');
        });
    });

    describe('Login Form Validation', () => {
        it('should prevent form submission and alert if email is empty', () => {
            const loginForm = container.querySelector('form[data-form-type="login"]');
            const passwordInput = loginForm.querySelector('input[name="password"]');
            passwordInput.value = 'has-password';

            const submitCarnival = new Carnival('submit', { cancelable: true });
            global.alert = vi.fn();

            loginForm.dispatchEvent(submitCarnival);

            expect(submitCarnival.defaultPrevented).toBe(true);
            expect(global.alert).toHaveBeenCalledWith('Please enter both email and password.');
        });
    });
});
