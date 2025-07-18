/**
 * InvitationEmailService Tests
 *
 * Tests for the invitation email service, ensuring that delegate invitations,
 * role transfers, and club ownership claims are handled correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvitationEmailService } from '/services/email/InvitationEmailService.mjs';
import { BaseEmailService } from '/services/email/BaseEmailService.mjs';

// Mock dependencies
vi.mock('/services/email/BaseEmailService.mjs');

describe('InvitationEmailService', () => {
  let invitationEmailService;
  let sendEmailMock;

  beforeEach(() => {
    vi.clearAllMocks();

    sendEmailMock = vi.fn().mockResolvedValue({ success: true });

    // Mock methods from BaseEmailService
    BaseEmailService.prototype.sendEmail = sendEmailMock;
    BaseEmailService.prototype._getBaseUrl = vi.fn().mockReturnValue('http://localhost:3050');
    BaseEmailService.prototype._getEmailHeader = vi.fn().mockReturnValue('<div>Header</div>');
    BaseEmailService.prototype._getEmailFooter = vi.fn((content = '') => `<div>Footer ${content}</div>`);
    BaseEmailService.prototype._createButton = vi.fn((url, text) => `<a href="${url}">${text}</a>`);
    BaseEmailService.prototype._getEmailContainerStyles = vi.fn().mockReturnValue('');
    BaseEmailService.prototype._getEmailContentStyles = vi.fn().mockReturnValue('');
    BaseEmailService.prototype._createSuccessBox = vi.fn(content => `<div>${content}</div>`);
    BaseEmailService.prototype._createWarningBox = vi.fn(content => `<div>${content}</div>`);
    BaseEmailService.prototype._createInfoBox = vi.fn(content => `<div>${content}</div>`);

    invitationEmailService = new InvitationEmailService();
  });

  describe('sendDelegateInvitation', () => {
    it('should send a delegate invitation email with correct details', async () => {
      const result = await invitationEmailService.sendDelegateInvitation(
        'new.delegate@example.com',
        'test-token',
        'Admin User',
        'Test Club'
      );

      expect(sendEmailMock).toHaveBeenCalledOnce();
      const mailOptions = sendEmailMock.mock.calls[0][0];

      expect(mailOptions.to).toBe('new.delegate@example.com');
      expect(mailOptions.subject).toBe('Invitation to join Test Club on Old Man Footy');
      expect(mailOptions.html).toContain('http://localhost:3050/auth/register?token=test-token');
      expect(mailOptions.html).toContain('<strong>Admin User</strong> has invited you to join <strong>Test Club</strong>');
      expect(result).toEqual({ success: true });
    });
  });

  describe('sendDelegateRoleTransfer', () => {
    it('should send a role transfer notification with correct details', async () => {
      const result = await invitationEmailService.sendDelegateRoleTransfer(
        'new.primary@example.com',
        'New Primary',
        'Old Primary',
        'Test Club'
      );

      expect(sendEmailMock).toHaveBeenCalledOnce();
      const mailOptions = sendEmailMock.mock.calls[0][0];

      expect(mailOptions.to).toBe('new.primary@example.com');
      expect(mailOptions.subject).toBe('You are now the Primary Delegate for Test Club');
      expect(mailOptions.html).toContain('Hello <strong>New Primary</strong>');
      expect(mailOptions.html).toContain('<strong>Old Primary</strong> has transferred the primary delegate role');
      expect(result).toEqual({ success: true });
    });
  });

  describe('sendClubOwnershipInvitation', () => {
    const mockClub = {
      id: 1,
      clubName: 'Proxy Club',
      state: 'NSW',
      location: 'Sydney',
      contactEmail: 'contact@proxy.com',
      contactPhone: '123456789',
      description: 'A club created by a proxy.'
    };
    const mockProxyCreator = {
      firstName: 'Proxy',
      lastName: 'Creator',
      email: 'proxy.creator@example.com'
    };

    it('should send a club ownership invitation with a custom message', async () => {
      const result = await invitationEmailService.sendClubOwnershipInvitation(
        mockClub,
        mockProxyCreator,
        'owner@example.com',
        'Please take over.'
      );

      expect(sendEmailMock).toHaveBeenCalledOnce();
      const mailOptions = sendEmailMock.mock.calls[0][0];

      expect(mailOptions.to).toBe('owner@example.com');
      expect(mailOptions.subject).toBe('You\'ve been invited to claim Proxy Club on Old Man Footy');
      expect(mailOptions.html).toContain('http://localhost:3050/clubs/1/claim');
      expect(mailOptions.html).toContain('<strong>Proxy Creator</strong> has created a club profile');
      expect(mailOptions.html).toContain('Message from Proxy:');
      expect(mailOptions.html).toContain('Please take over.');
      expect(result).toEqual({ success: true });
    });

    it('should send a club ownership invitation without a custom message', async () => {
        await invitationEmailService.sendClubOwnershipInvitation(
          mockClub,
          mockProxyCreator,
          'owner@example.com'
        );
  
        const mailOptions = sendEmailMock.mock.calls[0][0];
        expect(mailOptions.html).not.toContain('Message from Proxy:');
      });
  });
});
