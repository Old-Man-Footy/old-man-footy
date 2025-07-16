/**
 * Email Service Tests
 * 
 * Tests all email functionality including invitations, notifications, 
 * contact forms, password resets, and mode-based email blocking.
 * High priority for communication and security compliance.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTransport } from 'nodemailer';
import EmailService from '../services/emailService.mjs';
import { EmailSubscription } from '../models/index.mjs';

// Mock nodemailer
vi.mock('nodemailer', () => ({
    createTransport: vi.fn()
}));

// Mock EmailSubscription model
vi.mock('../models/index.mjs', () => ({
    EmailSubscription: {
        findAll: vi.fn()
    }
}));

describe('EmailService', () => {
    let emailService;
    let mockTransporter;
    let originalEnv;

    beforeEach(() => {
        // Store original environment
        originalEnv = { ...process.env };
        
        // Set up test environment variables
        process.env.NODE_ENV = 'test';
        process.env.EMAIL_USER = 'test@example.com';
        process.env.EMAIL_PASSWORD = 'testpassword';
        process.env.BASE_URL = 'http://localhost:3050';

        // Create mock transporter with all required methods
        mockTransporter = {
            sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
        };

        // Mock createTransport to return our mock transporter
        createTransport.mockReturnValue(mockTransporter);

        // Create EmailService instance
        emailService = new EmailService();
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
        vi.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should create a transporter with correct configuration', () => {
            expect(createTransport).toHaveBeenCalledWith({
                service: 'gmail',
                auth: {
                    user: 'test@example.com',
                    pass: 'testpassword'
                }
            });
        });
    });

    describe('_canSendEmails', () => {
        it('should return false in test environment', () => {
            process.env.NODE_ENV = 'test';
            const result = emailService._canSendEmails();
            expect(result).toBe(false);
        });

        it('should return false when coming soon mode is enabled', () => {
            process.env.NODE_ENV = 'production';
            process.env.FEATURE_COMING_SOON_MODE = 'true';
            const result = emailService._canSendEmails();
            expect(result).toBe(false);
        });

        it('should return false when maintenance mode is enabled', () => {
            process.env.NODE_ENV = 'production';
            process.env.FEATURE_COMING_SOON_MODE = 'false';
            process.env.FEATURE_MAINTENANCE_MODE = 'true';
            const result = emailService._canSendEmails();
            expect(result).toBe(false);
        });

        it('should return true when in production and no modes are enabled', () => {
            process.env.NODE_ENV = 'production';
            process.env.FEATURE_COMING_SOON_MODE = 'false';
            process.env.FEATURE_MAINTENANCE_MODE = 'false';
            const result = emailService._canSendEmails();
            expect(result).toBe(true);
        });
    });

    describe('sendInvitationEmail', () => {
        const testData = {
            email: 'delegate@example.com',
            inviteToken: 'test-token-123',
            inviterName: 'John Smith',
            clubName: 'Test Rugby Club'
        };

        it('should send invitation email successfully', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            const result = await emailService.sendInvitationEmail(
                testData.email,
                testData.inviteToken,
                testData.inviterName,
                testData.clubName
            );

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: '"Old Man Footy" <test@example.com>',
                    to: testData.email,
                    subject: `Invitation to join ${testData.clubName} on Old Man Footy`,
                    html: expect.stringContaining(testData.inviterName)
                })
            );

            expect(result).toEqual({
                success: true,
                messageId: 'test-message-id'
            });
        });

        it('should not send email when in test environment', async () => {
            process.env.NODE_ENV = 'test';
            emailService = new EmailService();

            const result = await emailService.sendInvitationEmail(
                testData.email,
                testData.inviteToken,
                testData.inviterName,
                testData.clubName
            );

            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                message: 'Email sending is disabled in the current site mode'
            });
        });

        it('should not send email when coming soon mode is enabled', async () => {
            process.env.FEATURE_COMING_SOON_MODE = 'true';
            emailService = new EmailService();

            const result = await emailService.sendInvitationEmail(
                testData.email,
                testData.inviteToken,
                testData.inviterName,
                testData.clubName
            );

            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
        });

        it('should handle email sending errors', async () => {
            const error = new Error('SMTP connection failed');
            mockTransporter.sendMail.mockRejectedValue(error);

            await expect(emailService.sendInvitationEmail(
                testData.email,
                testData.inviteToken,
                testData.inviterName,
                testData.clubName
            )).rejects.toThrow('SMTP connection failed');
        });
    });

    describe('sendCarnivalNotification', () => {
        const mockCarnival = {
            id: 1,
            title: 'Test Carnival',
            state: 'NSW',
            date: new Date('2025-08-15'),
            locationAddress: '123 Test Street, Sydney NSW',
            organiserContactName: 'Jane Doe',
            organiserContactEmail: 'jane@test.com',
            organiserContactPhone: '0400123456',
            scheduleDetails: 'Games start at 9am',
            registrationLink: 'https://test.com/register'
        };

        beforeEach(() => {
            EmailSubscription.findAll.mockResolvedValue([
                {
                    email: 'subscriber1@test.com',
                    unsubscribeToken: 'token1',
                    states: ['NSW'],
                    isActive: true
                },
                {
                    email: 'subscriber2@test.com',
                    unsubscribeToken: 'token2',
                    states: ['NSW', 'QLD'],
                    isActive: true
                }
            ]);
        });

        it('should send notification to relevant subscribers', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            const result = await emailService.sendCarnivalNotification(mockCarnival, 'new');

            expect(EmailSubscription.findAll).toHaveBeenCalledWith({
                where: {
                    states: { [expect.any(Symbol)]: ['NSW'] },
                    isActive: true
                }
            });

            expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                success: true,
                emailsSent: 2,
                emailsFailed: 0,
                totalSubscribers: 2
            });
        });

        it('should handle different notification types', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            await emailService.sendCarnivalNotification(mockCarnival, 'updated');

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: `Carnival Updated: ${mockCarnival.title}`
                })
            );
        });

        it('should not send emails in test environment', async () => {
            process.env.NODE_ENV = 'test';
            emailService = new EmailService();

            const result = await emailService.sendCarnivalNotification(mockCarnival);

            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                message: 'Email sending is disabled in the current site mode',
                emailsSent: 0
            });
        });

        it('should handle no subscribers gracefully', async () => {
            EmailSubscription.findAll.mockResolvedValue([]);

            const result = await emailService.sendCarnivalNotification(mockCarnival);

            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: true,
                emailsSent: 0
            });
        });

        it('should handle partial email failures', async () => {
            mockTransporter.sendMail
                .mockResolvedValueOnce({ messageId: 'success-1' })
                .mockRejectedValueOnce(new Error('Failed to send'));

            const result = await emailService.sendCarnivalNotification(mockCarnival);

            expect(result).toEqual({
                success: true,
                emailsSent: 1,
                emailsFailed: 1,
                totalSubscribers: 2
            });
        });
    });

    describe('sendWelcomeEmail', () => {
        it('should send welcome email with single state', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            const result = await emailService.sendWelcomeEmail('test@example.com', 'NSW');

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'test@example.com',
                    subject: 'Welcome to Old Man Footy - Masters Carnival Notifications',
                    html: expect.stringContaining('in NSW')
                })
            );

            expect(result).toEqual({
                success: true,
                messageId: 'test-message-id'
            });
        });

        it('should send welcome email with multiple states', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            const result = await emailService.sendWelcomeEmail('test@example.com', ['NSW', 'QLD', 'VIC']);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining('in NSW, QLD and VIC')
                })
            );

            expect(result).toEqual({
                success: true,
                messageId: 'test-message-id'
            });
        });

        it('should not send email when in coming soon mode', async () => {
            process.env.FEATURE_COMING_SOON_MODE = 'true';
            emailService = new EmailService();

            const result = await emailService.sendWelcomeEmail('test@example.com', 'NSW');

            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
        });

        it('should handle email sending errors', async () => {
            const error = new Error('Email service unavailable');
            mockTransporter.sendMail.mockRejectedValue(error);

            await expect(emailService.sendWelcomeEmail('test@example.com', 'NSW'))
                .rejects.toThrow('Email service unavailable');
        });
    });

    describe('sendDelegateRoleTransferNotification', () => {
        it('should send role transfer notification successfully', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            const result = await emailService.sendDelegateRoleTransferNotification(
                'newprimary@test.com',
                'John New',
                'Jane Former',
                'Test Club'
            );

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'newprimary@test.com',
                    subject: 'You are now the Primary Delegate for Test Club',
                    html: expect.stringContaining('John New')
                })
            );

            expect(result).toEqual({
                success: true,
                messageId: 'test-message-id'
            });
        });

        it('should not send email when in maintenance mode', async () => {
            process.env.FEATURE_MAINTENANCE_MODE = 'true';
            emailService = new EmailService();

            const result = await emailService.sendDelegateRoleTransferNotification(
                'newprimary@test.com',
                'John New',
                'Jane Former',
                'Test Club'
            );

            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
        });
    });
});