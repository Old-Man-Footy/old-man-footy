/**
 * CarnivalEmailService Tests
 * 
 * Tests for the carnival email service, ensuring that carnival-related
 * notifications, attendee information, and registration status emails
 * are generated and sent correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CarnivalEmailService } from '../../../services/email/CarnivalEmailService.mjs';
import { BaseEmailService } from '../../../services/email/BaseEmailService.mjs';
import { EmailSubscription } from '../../../models/index.mjs';

// Mock dependencies
vi.mock('../../../services/email/BaseEmailService.mjs');
vi.mock('../../../models/index.mjs', () => ({
  EmailSubscription: {
    findAll: vi.fn()
  }
}));

describe('CarnivalEmailService', () => {
  let carnivalEmailService;
  let sendEmailMock;
  let sendMailMock;

  // Mock data
  const mockCarnival = {
    id: 1,
    title: 'Test Carnival 2025',
    state: 'NSW',
    date: '2025-10-20',
    locationAddress: '123 Test St, Sydney',
    scheduleDetails: 'Games start at 9am.',
    organiserContactName: 'John Doe',
    organiserContactEmail: 'john.doe@example.com',
    organiserContactPhone: '0412345678',
    registrationLink: 'http://register.here',
    lastMySidelineSync: new Date()
  };

  const mockClub = {
    clubName: 'Test Tigers',
    primaryDelegateEmail: 'delegate@tigers.com',
    contactEmail: 'contact@tigers.com',
    contactPerson: 'Jane Smith',
    primaryDelegateName: 'Dave Delegate'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    sendEmailMock = vi.fn().mockResolvedValue({ success: true });
    sendMailMock = vi.fn().mockResolvedValue({ messageId: 'mock-id' });

    BaseEmailService.prototype.sendEmail = sendEmailMock;
    BaseEmailService.prototype.transporter = { sendMail: sendMailMock };
    BaseEmailService.prototype._getBaseUrl = vi.fn().mockReturnValue('http://localhost:3050');
    BaseEmailService.prototype._getEmailHeader = vi.fn().mockReturnValue('<div>Header</div>');
    BaseEmailService.prototype._getEmailFooter = vi.fn((content = '') => `<div>Footer ${content}</div>`);
    BaseEmailService.prototype._createButton = vi.fn((url, text) => `<a href="${url}">${text}</a>`);
    BaseEmailService.prototype._createInfoBox = vi.fn(content => `<div>${content}</div>`);
    BaseEmailService.prototype._createSuccessBox = vi.fn(content => `<div>${content}</div>`);
    BaseEmailService.prototype._createWarningBox = vi.fn(content => `<div>${content}</div>`);
    BaseEmailService.prototype._getEmailContainerStyles = vi.fn().mockReturnValue('');
    BaseEmailService.prototype._getEmailContentStyles = vi.fn().mockReturnValue('');
    BaseEmailService.prototype._formatDate = vi.fn(date => new Date(date).toLocaleDateString());
    BaseEmailService.prototype._canSendEmails = vi.fn().mockReturnValue(true);
    BaseEmailService.prototype._logBlockedEmail = vi.fn();

    carnivalEmailService = new CarnivalEmailService();
  });

  describe('sendCarnivalNotification', () => {
    it('should send notifications to active subscribers in the carnival\'s state', async () => {
      const subscriptions = [
        { email: 'sub1@test.com', unsubscribeToken: 'token1' },
        { email: 'sub2@test.com', unsubscribeToken: 'token2' }
      ];
      EmailSubscription.findAll.mockResolvedValue(subscriptions);

      const result = await carnivalEmailService.sendCarnivalNotification(mockCarnival, 'new');

      expect(EmailSubscription.findAll).toHaveBeenCalledWith({
        where: { states: { [Symbol.for('Op.contains')]: ['NSW'] }, isActive: true }
      });
      expect(sendMailMock).toHaveBeenCalledTimes(2);
      expect(sendMailMock.mock.calls[0][0].to).toBe('sub1@test.com');
      expect(sendMailMock.mock.calls[1][0].to).toBe('sub2@test.com');
      expect(sendMailMock.mock.calls[0][0].subject).toContain('New Masters Rugby League Carnival');
      expect(result).toEqual({
        success: true,
        emailsSent: 2,
        emailsFailed: 0,
        totalSubscribers: 2
      });
    });

    it('should return success with 0 emails sent if no subscribers are found', async () => {
      EmailSubscription.findAll.mockResolvedValue([]);
      const result = await carnivalEmailService.sendCarnivalNotification(mockCarnival);
      expect(sendMailMock).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, emailsSent: 0 });
    });

    it('should not send emails if _canSendEmails returns false', async () => {
        carnivalEmailService._canSendEmails.mockReturnValue(false);
        const result = await carnivalEmailService.sendCarnivalNotification(mockCarnival);
        expect(sendMailMock).not.toHaveBeenCalled();
        expect(carnivalEmailService._logBlockedEmail).toHaveBeenCalled();
        expect(result).toEqual({
            success: false,
            message: 'Email sending is disabled in the current site mode',
            emailsSent: 0
        });
    });

    it('should handle different notification types', async () => {
        EmailSubscription.findAll.mockResolvedValue([{ email: 'a@b.com', unsubscribeToken: 't' }]);
        
        await carnivalEmailService.sendCarnivalNotification(mockCarnival, 'updated');
        expect(sendMailMock.mock.calls[0][0].subject).toContain('Carnival Updated');

        await carnivalEmailService.sendCarnivalNotification(mockCarnival, 'merged');
        expect(sendMailMock.mock.calls[1][0].subject).toContain('Carnival Enhanced');
    });
  });

  describe('sendCarnivalInfoToAttendees', () => {
    const attendeeClubs = [
        { ...mockClub, clubName: 'Club A', primaryDelegateEmail: 'a@club.com' },
        { ...mockClub, clubName: 'Club B', contactEmail: 'b@club.com', primaryDelegateEmail: null },
        { ...mockClub, clubName: 'Club C', contactEmail: null, primaryDelegateEmail: null }
    ];

    it('should send info to all attendee clubs with an email', async () => {
        const result = await carnivalEmailService.sendCarnivalInfoToAttendees(mockCarnival, attendeeClubs, 'Host Club');
        expect(sendMailMock).toHaveBeenCalledTimes(2);
        expect(sendMailMock.mock.calls[0][0].to).toBe('a@club.com');
        expect(sendMailMock.mock.calls[1][0].to).toBe('b@club.com');
        expect(result.emailsSent).toBe(2);
        expect(result.emailsFailed).toBe(1);
    });

    it('should include the custom message in the email', async () => {
        const customMessage = 'Please bring your own water bottles.';
        await carnivalEmailService.sendCarnivalInfoToAttendees(mockCarnival, [attendeeClubs[0]], 'Host Club', customMessage);
        expect(sendMailMock).toHaveBeenCalledOnce();
        const html = sendMailMock.mock.calls[0][0].html;
        expect(html).toContain(customMessage);
    });

    it('should return success if no clubs are provided', async () => {
        const result = await carnivalEmailService.sendCarnivalInfoToAttendees(mockCarnival, [], 'Host');
        expect(result).toEqual({ success: true, emailsSent: 0, message: 'No attendee clubs to email' });
    });
  });

  describe('sendRegistrationApproval', () => {
    it('should send an approval email to the primary delegate', async () => {
        const result = await carnivalEmailService.sendRegistrationApproval(mockCarnival, mockClub, 'Admin User');
        expect(sendEmailMock).toHaveBeenCalledOnce();
        const mailOptions = sendEmailMock.mock.calls[0][0];
        expect(mailOptions.to).toBe(mockClub.primaryDelegateEmail);
        expect(mailOptions.subject).toContain('Registration Approved');
        expect(mailOptions.html).toContain('Hello <strong>Dave</strong>');
        expect(result).toEqual({ success: true });
    });

    it('should use contact email if primary delegate email is missing', async () => {
        const clubNoDelegateEmail = { ...mockClub, primaryDelegateEmail: null };
        await carnivalEmailService.sendRegistrationApproval(mockCarnival, clubNoDelegateEmail, 'Admin');
        expect(sendEmailMock.mock.calls[0][0].to).toBe(mockClub.contactEmail);
        expect(sendEmailMock.mock.calls[0][0].html).toContain('Hello <strong>Jane</strong>');
    });

    it('should return failure if no email is available', async () => {
        const clubNoEmail = { ...mockClub, primaryDelegateEmail: null, contactEmail: null };
        const result = await carnivalEmailService.sendRegistrationApproval(mockCarnival, clubNoEmail, 'Admin');
        expect(sendEmailMock).not.toHaveBeenCalled();
        expect(result).toEqual({ success: false, message: 'No email address available' });
    });
  });

  describe('sendRegistrationRejection', () => {
    it('should send a rejection email with a reason', async () => {
        const reason = 'Carnival is full.';
        const result = await carnivalEmailService.sendRegistrationRejection(mockCarnival, mockClub, 'Admin', reason);
        expect(sendEmailMock).toHaveBeenCalledOnce();
        const mailOptions = sendEmailMock.mock.calls[0][0];
        expect(mailOptions.to).toBe(mockClub.primaryDelegateEmail);
        expect(mailOptions.subject).toContain('Registration Update');
        expect(mailOptions.html).toContain(reason);
        expect(result).toEqual({ success: true });
    });

    it('should handle no reason provided', async () => {
        await carnivalEmailService.sendRegistrationRejection(mockCarnival, mockClub, 'Admin', '');
        const html = sendEmailMock.mock.calls[0][0].html;
        expect(html).not.toContain('<strong>Reason:</strong>');
    });

    it('should return failure if no email is available', async () => {
        const clubNoEmail = { ...mockClub, primaryDelegateEmail: null, contactEmail: null };
        const result = await carnivalEmailService.sendRegistrationRejection(mockCarnival, clubNoEmail, 'Admin', 'Full');
        expect(sendEmailMock).not.toHaveBeenCalled();
        expect(result).toEqual({ success: false, message: 'No email address available' });
    });
  });
});
