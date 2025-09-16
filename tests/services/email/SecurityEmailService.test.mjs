/**
 * SecurityEmailService Tests
 *
 * Tests for the security email service, ensuring that security-related
 * notifications and alerts are generated and sent correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityEmailService } from '../../../services/email/SecurityEmailService.mjs';
import { BaseEmailService } from '../../../services/email/BaseEmailService.mjs';

// Mock dependencies
vi.mock('/services/email/BaseEmailService.mjs');

describe('SecurityEmailService', () => {
  let securityEmailService;
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
    BaseEmailService.prototype._createErrorBox = vi.fn(content => `<div>${content}</div>`);
    BaseEmailService.prototype._formatDateTime = vi.fn(date => new Date(date).toLocaleString());

    securityEmailService = new SecurityEmailService();
  });

  describe('sendClubReactivationAlert', () => {
    it('should send a club reactivation alert with all correct details', async () => {
      const result = await securityEmailService.sendClubReactivationAlert(
        'original.delegate@example.com',
        'Original Delegate',
        'Test Club',
        'New Delegate',
        'new.delegate@example.com'
      );

      expect(sendEmailMock).toHaveBeenCalledOnce();
      const mailOptions = sendEmailMock.mock.calls[0][0];

      expect(mailOptions.to).toBe('original.delegate@example.com');
      expect(mailOptions.subject).toBe('🚨 SECURITY ALERT: Test Club has been reactivated');
      
      const expectedFraudUrl = 'http://localhost:3050/report-fraud?club=Test%20Club&newDelegate=new.delegate%40example.com';
      expect(mailOptions.html).toContain(expectedFraudUrl);
      expect(mailOptions.html).toContain('Hello <strong>Original Delegate</strong>');
      expect(mailOptions.html).toContain('Your deactivated club <strong>Test Club</strong> has been reactivated');
      expect(mailOptions.html).toContain('<strong>Reactivated by:</strong> New Delegate');
      expect(mailOptions.html).toContain('<strong>New Delegate Email:</strong> new.delegate@example.com');
      
      expect(result).toEqual({ success: true });
    });

    it('should handle encoding in URLs correctly', async () => {
        await securityEmailService.sendClubReactivationAlert(
          'original.delegate@example.com',
          'Original Delegate',
          'Test Club & Co',
          'New Delegate',
          'new.delegate+alias@example.com'
        );
  
        const mailOptions = sendEmailMock.mock.calls[0][0];
        const expectedFraudUrl = 'http://localhost:3050/report-fraud?club=Test%20Club%20%26%20Co&newDelegate=new.delegate%2Balias%40example.com';
        expect(mailOptions.html).toContain(expectedFraudUrl);
      });
  });
});
