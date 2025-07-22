import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { togglePassword } from '/public/js/auth.js';

describe('togglePassword', () => {
  let passwordField, icon;

  beforeEach(() => {
    // Set up DOM elements
    passwordField = document.createElement('input');
    passwordField.type = 'password';
    passwordField.id = 'test-password';

    icon = document.createElement('i');
    icon.id = 'test-password-toggle-icon';
    icon.className = 'bi bi-eye';

    document.body.appendChild(passwordField);
    document.body.appendChild(icon);
  });

  afterEach(() => {
    // Clean up DOM
    passwordField.remove();
    icon.remove();
  });

  it('should toggle password field to text and update icon class', () => {
    togglePassword('test-password');
    expect(passwordField.type).toBe('text');
    expect(icon.className).toBe('bi bi-eye-slash');
  });

  it('should toggle password field back to password and update icon class', () => {
    // First toggle to text
    togglePassword('test-password');
    // Second toggle back to password
    togglePassword('test-password');
    expect(passwordField.type).toBe('password');
    expect(icon.className).toBe('bi bi-eye');
  });

  it('should do nothing if field does not exist', () => {
    // Remove field
    passwordField.remove();
    // Should not throw
    expect(() => togglePassword('test-password')).not.toThrow();
    // Icon class should remain unchanged
    expect(icon.className).toBe('bi bi-eye');
  });

  it('should do nothing if icon does not exist', () => {
    // Remove icon
    icon.remove();
    // Should not throw
    expect(() => togglePassword('test-password')).not.toThrow();
    // Field type should remain unchanged
    expect(passwordField.type).toBe('password');
  });
});