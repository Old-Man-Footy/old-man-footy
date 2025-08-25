import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { RegistrationFormValidator } from '../../../public/js/auth-register.js';

describe('RegistrationFormValidator', () => {
    let form, passwordField, confirmPasswordField, validator;

    /**
     * Sets up the DOM structure needed for the tests.
     */
    function setupDOM() {
        document.body.innerHTML = `
            <form id="registerForm">
                <input type="password" id="password" />
                <input type="password" id="confirmPassword" />
            </form>
        `;
        form = document.getElementById('registerForm');
        passwordField = document.getElementById('password');
        confirmPasswordField = document.getElementById('confirmPassword');
    }

    beforeEach(() => {
        setupDOM();
        // Mock the setCustomValidity method on the input element
        confirmPasswordField.setCustomValidity = vi.fn();

        // Initialize the validator class
        validator = new RegistrationFormValidator(form);
        validator.init();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('should set custom validity message if passwords do not match', () => {
        passwordField.value = 'password123';
        confirmPasswordField.value = 'password321';

        // Simulate an input event on the confirmation field
        confirmPasswordField.dispatchEvent(new Event('input'));

        expect(confirmPasswordField.setCustomValidity).toHaveBeenCalledWith('Passwords do not match');
    });

    it('should clear custom validity message if passwords match', () => {
        passwordField.value = 'password123';
        confirmPasswordField.value = 'password123';

        // Simulate an input event on the confirmation field
        confirmPasswordField.dispatchEvent(new Event('input'));

        expect(confirmPasswordField.setCustomValidity).toHaveBeenCalledWith('');
    });

    it('should clear custom validity when a non-matching password is corrected to match', () => {
        // Initial non-matching state
        passwordField.value = 'password123';
        confirmPasswordField.value = 'password321';
        confirmPasswordField.dispatchEvent(new Event('input'));
        expect(confirmPasswordField.setCustomValidity).toHaveBeenCalledWith('Passwords do not match');

        // User corrects the password
        confirmPasswordField.value = 'password123';
        confirmPasswordField.dispatchEvent(new Event('input'));
        expect(confirmPasswordField.setCustomValidity).toHaveBeenCalledWith('');
    });

    it('should not throw an error if password fields are not found in the form', () => {
        document.body.innerHTML = '<form id="emptyForm"></form>';
        const emptyForm = document.getElementById('emptyForm');
        
        // Expecting the constructor and init not to throw when elements are missing
        expect(() => {
            const emptyValidator = new RegistrationFormValidator(emptyForm);
            emptyValidator.init();
        }).not.toThrow();
    });
});
