import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactEmailService } from '../../../services/email/ContactEmailService.mjs';
import { BaseEmailService } from '../../../services/email/BaseEmailService.mjs';

describe('ContactEmailService', () => {
  let contactEmailService;

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
    ipAddress: '127.0.0.1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    BaseEmailService.prototype._getBaseUrl = vi.fn().mockReturnValue('http://localhost:3050');
    BaseEmailService.prototype._createButton = vi.fn((url, text) => `<a href="${url}">${text}</a>`);
    BaseEmailService.prototype._getEmailContainerStyles = vi.fn().mockReturnValue('');
    BaseEmailService.prototype._getEmailContentStyles = vi.fn().mockReturnValue('');
    BaseEmailService.prototype._canSendEmails = vi.fn().mockReturnValue(true);
    contactEmailService = new ContactEmailService();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should send the contact form email and an auto-reply through transactional client', async () => {
    const sendTransactionalSpy = vi
      .spyOn(contactEmailService, '_sendTransactionalEmail')
      .mockResolvedValueOnce({ success: true, provider: 'resend', messageId: 'support-123' })
      .mockResolvedValueOnce({ success: true, provider: 'resend', messageId: 'autoreply-123' });

    const result = await contactEmailService.sendContactFormEmail(mockContactData);

    expect(sendTransactionalSpy).toHaveBeenCalledTimes(2);
    expect(result.supportEmail.messageId).toBe('support-123');
    expect(result.autoReply.messageId).toBe('autoreply-123');
  });

  it('should throw an error if support email dispatch fails', async () => {
    const testError = new Error('Resend unavailable');
    vi.spyOn(contactEmailService, '_sendTransactionalEmail').mockRejectedValueOnce(testError);

    await expect(contactEmailService.sendContactFormEmail(mockContactData)).rejects.toThrow('Resend unavailable');
    expect(console.error).toHaveBeenCalledWith('❌ Error sending contact form email:', testError);
  });

  it('should return a non-throwing failure object if auto-reply fails', async () => {
    vi.spyOn(contactEmailService, '_sendTransactionalEmail').mockRejectedValueOnce(new Error('Auto-reply failed'));

    const result = await contactEmailService.sendContactFormAutoReply('test@test.com', 'Test', 'general');

    expect(result.success).toBe(false);
    expect(result.provider).toBe('resend');
  });

  it('should dispatch admin replies with support reply-to', async () => {
    const sendTransactionalSpy = vi
      .spyOn(contactEmailService, '_sendTransactionalEmail')
      .mockResolvedValue({ success: true, provider: 'resend', messageId: 'reply-1' });

    const result = await contactEmailService.sendAdminReplyEmail({
      toEmail: 'visitor@example.com',
      subject: 'Support follow-up',
      message: 'Thanks for your message.',
    });

    expect(sendTransactionalSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});
