/**
 * ContactEmailService Tests
 * 
 * Tests for the contact email service, ensuring that contact form submissions
 * and auto-replies are generated and sent correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactEmailService } from '/services/email/ContactEmailService.mjs';
import { BaseEmailService } from '/services/email/BaseEmailService.mjs';

// Mock dependencies
vi.mock('/services/email/BaseEmailService.mjs');

describe('ContactEmailService', () => {
  let contactEmailService;
  let sendMailMock;

  const mockContactData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '0412345678',
    subject: 'technical',
    clubName: 'Test Club',
    message: 'This is a test message.',
    newsletter: true,
    userAgent: 'Test Agent',
    ipAddress: '127.0.0.1'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    sendMailMock = vi.fn().mockResolvedValue({ messageId: 'mock-id' });

    BaseEmailService.prototype.transporter = { sendMail: sendMailMock };
    BaseEmailService.prototype._getBaseUrl = vi.fn().mockReturnValue('http://localhost:3050');
    BaseEmailService.prototype._createButton = vi.fn((url, text) => `<a href="${url}">${text}</a>`);
    BaseEmailService.prototype._getEmailContainerStyles = vi.fn().mockReturnValue('');
    BaseEmailService.prototype._getEmailContentStyles = vi.fn().mockReturnValue('');
    BaseEmailService.prototype._canSendEmails = vi.fn().mockReturnValue(true);
    BaseEmailService.prototype.sendEmail = vi.fn().mockImplementation(async (mailOptions, emailType) => {
      return await BaseEmailService.prototype.transporter.sendMail(mailOptions);
    });

    contactEmailService = new ContactEmailService();
    
    // Mock console.error to spy on it
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('sendContactFormEmail', () => {
    it('should send the contact form email and an auto-reply', async () => {
      await contactEmailService.sendContactFormEmail(mockContactData);

      expect(sendMailMock).toHaveBeenCalledTimes(2);

      // Check main email
      const mainEmailOptions = sendMailMock.mock.calls[0][0];
      expect(mainEmailOptions.to).toBe(process.env.SUPPORT_EMAIL || 'support@oldmanfooty.au');
      expect(mainEmailOptions.replyTo).toBe(mockContactData.email);
      expect(mainEmailOptions.subject).toContain('Technical Support');
      expect(mainEmailOptions.html).toContain(mockContactData.message);

      // Check auto-reply
      const autoReplyOptions = sendMailMock.mock.calls[1][0];
      expect(autoReplyOptions.to).toBe(mockContactData.email);
      expect(autoReplyOptions.subject).toContain('Thank you for contacting Old Man Footy');
      expect(autoReplyOptions.html).toContain('Hi John,');
    });

    it('should throw an error if sending the main email fails', async () => {
      const testError = new Error('SMTP Error');
      sendMailMock.mockRejectedValueOnce(testError);

      await expect(contactEmailService.sendContactFormEmail(mockContactData))
        .rejects.toThrow('SMTP Error');
      
      expect(console.error).toHaveBeenCalledWith('❌ Error sending contact form email:', testError);
    });

    it('should not throw an error if only the auto-reply fails', async () => {
        const autoReplyError = new Error('Auto-reply failed');
        sendMailMock
          .mockResolvedValueOnce({ messageId: 'main-id' }) // Main email succeeds
          .mockRejectedValueOnce(autoReplyError);         // Auto-reply fails
  
        await expect(contactEmailService.sendContactFormEmail(mockContactData))
          .resolves.toBeUndefined();
  
        expect(sendMailMock).toHaveBeenCalledTimes(2);
        expect(console.error).toHaveBeenCalledWith('❌ Error sending contact form auto-reply:', autoReplyError);
      });
  });

  describe('sendContactFormAutoReply', () => {
    it('should send an auto-reply email with correct content', async () => {
        await contactEmailService.sendContactFormAutoReply(mockContactData.email, mockContactData.firstName, mockContactData.subject);

        expect(sendMailMock).toHaveBeenCalledOnce();
        const mailOptions = sendMailMock.mock.calls[0][0];
        expect(mailOptions.to).toBe(mockContactData.email);
        expect(mailOptions.subject).toContain('Technical Support');
        expect(mailOptions.html).toContain('Hi John,');
    });

    it('should log an error but not throw if sending fails', async () => {
        const testError = new Error('SMTP Connection Failed');
        sendMailMock.mockRejectedValue(testError);

        await contactEmailService.sendContactFormAutoReply('test@test.com', 'Test', 'general');

        expect(console.error).toHaveBeenCalledWith('❌ Error sending contact form auto-reply:', testError);
    });
  });
});
