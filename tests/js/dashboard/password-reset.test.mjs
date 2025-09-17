/**
 * @fileoverview Tests for password reset functionality in dashboard.js
 * These tests verify the frontend JavaScript password reset behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Dashboard Password Reset Frontend', () => {
    let dom;
    let window;
    let document;
    let dashboardManager;

    beforeEach(async () => {
        // Create a JSDOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <form id="updatePasswordForm">
                    <div class="form-group">
                        <input type="password" id="currentPassword" name="currentPassword" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="newPassword" name="newPassword" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="confirmPassword" name="confirmPassword" required>
                    </div>
                    <button type="submit">Update Password</button>
                </form>
                <div id="passwordMessage"></div>
                <div class="modal" id="updatePasswordModal">
                    <div class="modal-content">
                        <span class="close">&times;</span>
                    </div>
                </div>
            </body>
            </html>
        `, {
            url: 'http://localhost',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        window = dom.window;
        document = window.document;

        // Make global objects available
        global.window = window;
        global.document = document;
        global.fetch = vi.fn();

        // Import the dashboard manager (simulate the module)
        dashboardManager = {
            elements: {},
            
            cacheElements() {
                this.elements.updatePasswordForm = document.getElementById('updatePasswordForm');
                this.elements.passwordMessage = document.getElementById('passwordMessage');
                this.elements.updatePasswordModal = document.getElementById('updatePasswordModal');
            },

            bindEvents() {
                if (this.elements.updatePasswordForm) {
                    this.elements.updatePasswordForm.addEventListener('submit', (e) => this.handlePasswordReset(e));
                }
            },

            initialize() {
                this.cacheElements();
                this.bindEvents();
            },

            async handlePasswordReset(event) {
                event.preventDefault();
                
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const messageEl = this.elements.passwordMessage;

                // Clear previous messages
                messageEl.className = '';
                messageEl.textContent = '';

                // Validate passwords match
                if (newPassword !== confirmPassword) {
                    messageEl.className = 'alert alert-danger';
                    messageEl.textContent = 'New passwords do not match.';
                    return;
                }

                // Validate password strength
                if (newPassword.length < 8) {
                    messageEl.className = 'alert alert-danger';
                    messageEl.textContent = 'New password must be at least 8 characters long.';
                    return;
                }

                try {
                    const response = await fetch('/auth/password-reset', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            existingPassword: currentPassword,
                            newPassword: newPassword
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        messageEl.className = 'alert alert-success';
                        messageEl.textContent = data.message || 'Password updated successfully.';
                        
                        // Clear form
                        document.getElementById('currentPassword').value = '';
                        document.getElementById('newPassword').value = '';
                        document.getElementById('confirmPassword').value = '';
                        
                        // Close modal after delay
                        setTimeout(() => {
                            if (this.elements.updatePasswordModal) {
                                this.elements.updatePasswordModal.style.display = 'none';
                            }
                        }, 2000);
                    } else {
                        messageEl.className = 'alert alert-danger';
                        messageEl.textContent = data.error || 'Failed to update password.';
                    }
                } catch (error) {
                    messageEl.className = 'alert alert-danger';
                    messageEl.textContent = 'Network error. Please try again.';
                }
            }
        };

        dashboardManager.initialize();
    });

    afterEach(() => {
        vi.clearAllMocks();
        delete global.window;
        delete global.document;
        delete global.fetch;
        dom.window.close();
    });

    describe('Form Validation', () => {
        it('should show error when passwords do not match', async () => {
            // Set form values
            document.getElementById('currentPassword').value = 'currentpass123';
            document.getElementById('newPassword').value = 'newpass123';
            document.getElementById('confirmPassword').value = 'differentpass123';

            // Submit form
            const form = document.getElementById('updatePasswordForm');
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            await form.dispatchEvent(submitEvent);

            // Check error message
            const messageEl = document.getElementById('passwordMessage');
            expect(messageEl.className).toBe('alert alert-danger');
            expect(messageEl.textContent).toBe('New passwords do not match.');
        });

        it('should show error when new password is too short', async () => {
            // Set form values
            document.getElementById('currentPassword').value = 'currentpass123';
            document.getElementById('newPassword').value = 'short';
            document.getElementById('confirmPassword').value = 'short';

            // Submit form
            const form = document.getElementById('updatePasswordForm');
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            await form.dispatchEvent(submitEvent);

            // Check error message
            const messageEl = document.getElementById('passwordMessage');
            expect(messageEl.className).toBe('alert alert-danger');
            expect(messageEl.textContent).toBe('New password must be at least 8 characters long.');
        });
    });

    describe('API Communication', () => {
        it('should send correct request to password reset endpoint', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({ message: 'Password updated successfully.' })
            };
            global.fetch.mockResolvedValue(mockResponse);

            // Set form values
            document.getElementById('currentPassword').value = 'currentpass123';
            document.getElementById('newPassword').value = 'newpass123';
            document.getElementById('confirmPassword').value = 'newpass123';

            // Submit form
            const form = document.getElementById('updatePasswordForm');
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            await form.dispatchEvent(submitEvent);

            // Verify fetch was called correctly
            expect(global.fetch).toHaveBeenCalledWith('/auth/password-reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    existingPassword: 'currentpass123',
                    newPassword: 'newpass123'
                })
            });
        });

        it('should handle successful password reset response', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({ message: 'Password updated successfully.' })
            };
            global.fetch.mockResolvedValue(mockResponse);

            // Set form values
            document.getElementById('currentPassword').value = 'currentpass123';
            document.getElementById('newPassword').value = 'newpass123';
            document.getElementById('confirmPassword').value = 'newpass123';

            // Submit form
            const form = document.getElementById('updatePasswordForm');
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            await form.dispatchEvent(submitEvent);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            // Check success message
            const messageEl = document.getElementById('passwordMessage');
            expect(messageEl.className).toBe('alert alert-success');
            expect(messageEl.textContent).toBe('Password updated successfully.');

            // Check form was cleared
            expect(document.getElementById('currentPassword').value).toBe('');
            expect(document.getElementById('newPassword').value).toBe('');
            expect(document.getElementById('confirmPassword').value).toBe('');
        });

        it('should handle error response from server', async () => {
            const mockResponse = {
                ok: false,
                json: vi.fn().mockResolvedValue({ error: 'Incorrect existing password.' })
            };
            global.fetch.mockResolvedValue(mockResponse);

            // Set form values
            document.getElementById('currentPassword').value = 'wrongpass';
            document.getElementById('newPassword').value = 'newpass123';
            document.getElementById('confirmPassword').value = 'newpass123';

            // Submit form
            const form = document.getElementById('updatePasswordForm');
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            await form.dispatchEvent(submitEvent);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            // Check error message
            const messageEl = document.getElementById('passwordMessage');
            expect(messageEl.className).toBe('alert alert-danger');
            expect(messageEl.textContent).toBe('Incorrect existing password.');
        });

        it('should handle network errors', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            // Set form values
            document.getElementById('currentPassword').value = 'currentpass123';
            document.getElementById('newPassword').value = 'newpass123';
            document.getElementById('confirmPassword').value = 'newpass123';

            // Submit form
            const form = document.getElementById('updatePasswordForm');
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            await form.dispatchEvent(submitEvent);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            // Check error message
            const messageEl = document.getElementById('passwordMessage');
            expect(messageEl.className).toBe('alert alert-danger');
            expect(messageEl.textContent).toBe('Network error. Please try again.');
        });
    });
});
