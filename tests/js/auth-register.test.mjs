import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { setupPasswordConfirmationValidation } from '/public/js/auth-register.js';

/**
 * Mocks DOM elements and simulates user input for password confirmation validation.
 */
describe('auth-register.js', () => {
  let passwordField;
  let confirmPasswordField;
  let originalAddEventListener;

  beforeEach(() => {
    // Set up DOM elements
    passwordField = document.createElement('input');
    passwordField.type = 'password';
    passwordField.id = 'password';

    confirmPasswordField = document.createElement('input');
    confirmPasswordField.type = 'password';
    confirmPasswordField.id = 'confirmPassword';

    document.body.appendChild(passwordField);
    document.body.appendChild(confirmPasswordField);

    // Mock setCustomValidity
    confirmPasswordField.setCustomValidity = vi.fn();

    // Attach the event listener directly
    setupPasswordConfirmationValidation();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should set custom validity if passwords do not match', () => {
    passwordField.value = 'password123';
    confirmPasswordField.value = 'password321';

    // Simulate input event
    const event = new Event('input');
    confirmPasswordField.dispatchEvent(event);

    expect(confirmPasswordField.setCustomValidity).toHaveBeenCalledWith('Passwords do not match');
  });

  it('should clear custom validity if passwords match', () => {
    passwordField.value = 'password123';
    confirmPasswordField.value = 'password123';

    // Simulate input event
    const event = new Event('input');
    confirmPasswordField.dispatchEvent(event);

    expect(confirmPasswordField.setCustomValidity).toHaveBeenCalledWith('');
  });

  it('should not throw if fields are missing', async () => {
    document.body.innerHTML = '';
    await import('/public/js/auth-register.js');
    // No error should be thrown
  });
});