/**
 * AuthEmailService Tests
 * 
 * Tests for the authentication email service, ensuring that welcome emails
 * and password reset emails are generated and sent correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthEmailService } from '/services/email/AuthEmailService.mjs';
import { BaseEmailService } from '/services/email/BaseEmailService.mjs';

// Mock the BaseEmailService to prevent actual email sending
vi.mock('/services/email/BaseEmailService.mjs');

describe('AuthEmailService', () => {
  let authEmailService;
  let sendEmailMock;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock the implementation of BaseEmailService's sendEmail method
    sendEmailMock = vi.fn().mockResolvedValue({ success: true });
    BaseEmailService.prototype.sendEmail = sendEmailMock;
    BaseEmailService.prototype._getBaseUrl = vi.fn().mockReturnValue('http://localhost:3050');
    BaseEmailService.prototype._getEmailHeader = vi.fn().mockReturnValue('<div>Header</div>');
    // Correctly mock the footer to accept and render content
    BaseEmailService.prototype._getEmailFooter = vi.fn((content = '') => `<div>Footer ${content}</div>`);
    BaseEmailService.prototype._createButton = vi.fn((url, text) => `<a href="${url}">${text}</a>`);
    BaseEmailService.prototype._createWarningBox = vi.fn((content) => `<div>${content}</div>`);
    BaseEmailService.prototype._getEmailContainerStyles = vi.fn().mockReturnValue('');
    BaseEmailService.prototype._getEmailContentStyles = vi.fn().mockReturnValue('');


    authEmailService = new AuthEmailService();
  });

  describe('sendWelcomeEmail', () => {
    it('should send a welcome email with correct content for a single state', async () => {
      // Arrange
      const email = 'test@example.com';
      const states = 'NSW';

      // Act
      await authEmailService.sendWelcomeEmail(email, states);

      // Assert
      expect(sendEmailMock).toHaveBeenCalledOnce();
      const mailOptions = sendEmailMock.mock.calls[0][0];
      
      expect(mailOptions.to).toBe(email);
      expect(mailOptions.subject).toBe('Welcome to Old Man Footy - Masters Carnival Notifications');
      expect(mailOptions.html).toContain('Welcome to Old Man Footy!');
      expect(mailOptions.html).toContain('in NSW');
      expect(mailOptions.html).toContain('href="http://localhost:3050/unsubscribe?email=test%40example.com"');
    });

    it('should send a welcome email with correct content for multiple states', async () => {
      // Arrange
      const email = 'test@example.com';
      const states = ['NSW', 'QLD', 'VIC'];

      // Act
      await authEmailService.sendWelcomeEmail(email, states);

      // Assert
      expect(sendEmailMock).toHaveBeenCalledOnce();
      const mailOptions = sendEmailMock.mock.calls[0][0];

      expect(mailOptions.subject).toBe('Welcome to Old Man Footy - Masters Carnival Notifications');
      expect(mailOptions.html).toContain('in NSW, QLD and VIC');
      expect(mailOptions.html).toContain('Your subscription covers:</strong> NSW, QLD, VIC');
    });

    it('should handle an empty states array gracefully', async () => {
      // Arrange
      const email = 'test@example.com';
      const states = [];

      // Act
      await authEmailService.sendWelcomeEmail(email, states);

      // Assert
      expect(sendEmailMock).toHaveBeenCalledOnce();
      const mailOptions = sendEmailMock.mock.calls[0][0];
      
      // The text will be "in " which is acceptable.
      expect(mailOptions.html).toContain('in '); 
      // Should be empty after the strong tag
      expect(mailOptions.html).toContain('Your subscription covers:</strong> '); 
      expect(mailOptions.html).not.toContain('undefined');
    });

    it('should throw an error if the base email service fails', async () => {
        // Arrange
        const email = 'test@example.com';
        const states = 'NSW';
        const testError = new Error('SMTP Connection Failed');
        sendEmailMock.mockRejectedValue(testError);
  
        // Act & Assert
        await expect(authEmailService.sendWelcomeEmail(email, states))
          .rejects.toThrow('SMTP Connection Failed');
      });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send a password reset email with the correct reset link and user info', async () => {
      // Arrange
      const email = 'user@example.com';
      const resetToken = 'a-very-secure-token-123';
      const firstName = 'John';

      // Act
      await authEmailService.sendPasswordResetEmail(email, resetToken, firstName);

      // Assert
      expect(sendEmailMock).toHaveBeenCalledOnce();
      const mailOptions = sendEmailMock.mock.calls[0][0];

      expect(mailOptions.to).toBe(email);
      expect(mailOptions.subject).toBe('Password Reset Request - Old Man Footy');
      expect(mailOptions.html).toContain('Hello <strong>John</strong>');
      expect(mailOptions.html).toContain('href="http://localhost:3050/auth/reset-password/a-very-secure-token-123"');
      expect(mailOptions.html).toContain('This link will expire in 24 hours');
    });

    it('should return the result from the base sendEmail method', async () => {
        // Arrange
        sendEmailMock.mockResolvedValue({ success: false, error: 'SMTP Error' });
  
        // Act
        const result = await authEmailService.sendPasswordResetEmail('user@example.com', 'token', 'Jane');
  
        // Assert
        expect(result).toEqual({ success: false, error: 'SMTP Error' });
      });

    it('should throw an error if the base email service fails', async () => {
        // Arrange
        const testError = new Error('Network Error');
        sendEmailMock.mockRejectedValue(testError);
  
        // Act & Assert
        await expect(authEmailService.sendPasswordResetEmail('user@example.com', 'token', 'Jane'))
          .rejects.toThrow('Network Error');
      });
  });
});
