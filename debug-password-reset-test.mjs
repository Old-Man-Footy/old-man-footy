import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetPassword } from './controllers/auth.controller.mjs';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import AuditService from './services/auditService.mjs';

// Mock dependencies
vi.mock('bcrypt');
vi.mock('express-validator');
vi.mock('./services/auditService.mjs', () => ({
  default: {
    logAuthAction: vi.fn(),
    ACTIONS: {
      USER_PASSWORD_RESET: 'USER_PASSWORD_RESET'
    }
  }
}));

describe('Debug Password Reset', () => {
  it('should debug mock setup', async () => {
    // Setup mocks exactly like the test
    const user = {
      id: 'user123',
      email: 'test@example.com',
      checkPassword: vi.fn(),
      update: vi.fn()
    };

    const req = {
      body: {
        existingPassword: 'oldPassword123',
        newPassword: 'newPassword456'
      },
      user,
      xhr: false,
      headers: {},
      flash: vi.fn()
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis()
    };

    const next = vi.fn();

    // Mock validationResult to return no errors
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });

    // Set up user mock behavior
    user.checkPassword
      .mockResolvedValueOnce(true)   // Current password is correct
      .mockResolvedValueOnce(false); // New password is different
    
    bcrypt.hash.mockResolvedValue('hashedNewPassword');
    user.update.mockResolvedValue();

    console.log('Before calling resetPassword:');
    console.log('req.user === user:', req.user === user);
    console.log('req.user.id:', req.user.id);
    console.log('user.checkPassword:', typeof user.checkPassword);

    // Call the function
    await resetPassword(req, res, next);

    console.log('After calling resetPassword:');
    console.log('user.checkPassword called:', user.checkPassword.mock.calls.length);
    console.log('user.checkPassword calls:', user.checkPassword.mock.calls);
    console.log('user.update called:', user.update.mock.calls.length);
    console.log('user.update calls:', user.update.mock.calls);
    console.log('bcrypt.hash called:', bcrypt.hash.mock.calls.length);
    console.log('bcrypt.hash calls:', bcrypt.hash.mock.calls);
    console.log('AuditService.logAuthAction called:', AuditService.logAuthAction.mock.calls.length);
    console.log('AuditService.logAuthAction calls:', AuditService.logAuthAction.mock.calls);
    console.log('req.flash called:', req.flash.mock.calls.length);
    console.log('req.flash calls:', req.flash.mock.calls);
    console.log('res.redirect called:', res.redirect.mock.calls.length);
    console.log('res.redirect calls:', res.redirect.mock.calls);

    // Basic expectations to verify it worked
    expect(user.checkPassword).toHaveBeenCalled();
  });
});
