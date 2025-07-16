import InvitationEmailService from './email/InvitationEmailService.mjs';
import CarnivalEmailService from './email/CarnivalEmailService.mjs';
import AuthEmailService from './email/AuthEmailService.mjs';
import ContactEmailService from './email/ContactEmailService.mjs';
import SecurityEmailService from './email/SecurityEmailService.mjs';
import { BaseEmailService } from './email/BaseEmailService.mjs';

/**
 * Main Email Service Class
 * Aggregates all specialized email services and provides backward compatibility
 * This class maintains the same interface as the original EmailService for existing code
 */
class EmailService extends BaseEmailService {
    constructor() {
        super();
        
        // Initialize specialized services
        this.invitation = InvitationEmailService;
        this.carnival = CarnivalEmailService;
        this.auth = AuthEmailService;
        this.contact = ContactEmailService;
        this.security = SecurityEmailService;
    }

    // =====================
    // INVITATION METHODS
    // =====================

    /**
     * Send invitation email to new club delegates
     * @param {string} email - Recipient email
     * @param {string} inviteToken - Invitation token
     * @param {string} inviterName - Name of the person sending the invitation
     * @param {string} clubName - Name of the club
     * @returns {Object} Result object with success status
     */
    async sendInvitationEmail(email, inviteToken, inviterName, clubName) {
        return await this.invitation.sendDelegateInvitation(email, inviteToken, inviterName, clubName);
    }

    /**
     * Send delegate role transfer notification email
     * @param {string} newPrimaryEmail - Email of new primary delegate
     * @param {string} newPrimaryName - Name of new primary delegate
     * @param {string} formerPrimaryName - Name of former primary delegate
     * @param {string} clubName - Name of the club
     * @returns {Object} Result object with success status
     */
    async sendDelegateRoleTransferNotification(newPrimaryEmail, newPrimaryName, formerPrimaryName, clubName) {
        return await this.invitation.sendDelegateRoleTransfer(newPrimaryEmail, newPrimaryName, formerPrimaryName, clubName);
    }

    /**
     * Send club ownership invitation email
     * @param {Object} club - Club instance
     * @param {Object} proxyCreator - User who created the proxy club
     * @param {string} inviteEmail - Email to send invitation to
     * @param {string} customMessage - Custom message from the proxy creator
     * @returns {Object} Result object with success status
     */
    async sendClubOwnershipInvitation(club, proxyCreator, inviteEmail, customMessage = '') {
        return await this.invitation.sendClubOwnershipInvitation(club, proxyCreator, inviteEmail, customMessage);
    }

    // =====================
    // CARNIVAL METHODS
    // =====================

    /**
     * Send carnival notification to subscribers
     * @param {Object} carnival - Carnival instance
     * @param {string} type - Type of notification ('new', 'updated', 'merged')
     * @returns {Object} Result object with success status and statistics
     */
    async sendCarnivalNotification(carnival, type = 'new') {
        return await this.carnival.sendCarnivalNotification(carnival, type);
    }

    /**
     * Send carnival information to attendee clubs
     * @param {Object} carnival - Carnival instance
     * @param {Array} attendeeClubs - Array of club objects attending the carnival
     * @param {string} senderName - Name of person sending the info
     * @param {string} customMessage - Custom message from sender
     * @returns {Object} Result object with success status and statistics
     */
    async sendCarnivalInfoToAttendees(carnival, attendeeClubs, senderName, customMessage = '') {
        return await this.carnival.sendCarnivalInfoToAttendees(carnival, attendeeClubs, senderName, customMessage);
    }

    /**
     * Send registration approval notification email
     * @param {Object} carnival - Carnival instance
     * @param {Object} club - Club instance
     * @param {string} approverName - Name of the person who approved
     * @returns {Object} Result object with success status
     */
    async sendRegistrationApprovalEmail(carnival, club, approverName) {
        return await this.carnival.sendRegistrationApproval(carnival, club, approverName);
    }

    /**
     * Send registration rejection notification email
     * @param {Object} carnival - Carnival instance
     * @param {Object} club - Club instance
     * @param {string} rejectorName - Name of the person who rejected
     * @param {string} rejectionReason - Reason for rejection
     * @returns {Object} Result object with success status
     */
    async sendRegistrationRejectionEmail(carnival, club, rejectorName, rejectionReason) {
        return await this.carnival.sendRegistrationRejection(carnival, club, rejectorName, rejectionReason);
    }

    // =====================
    // AUTHENTICATION METHODS
    // =====================

    /**
     * Send welcome email to new subscribers
     * @param {string} email - Recipient email
     * @param {Array|string} states - States for subscription (array or single string)
     * @returns {Object} Result object with success status
     */
    async sendWelcomeEmail(email, states) {
        return await this.auth.sendWelcomeEmail(email, states);
    }

    /**
     * Send password reset email
     * @param {string} email - Recipient email
     * @param {string} resetToken - Password reset token
     * @param {string} firstName - User's first name
     * @returns {Object} Result object with success status
     */
    async sendPasswordResetEmail(email, resetToken, firstName) {
        return await this.auth.sendPasswordResetEmail(email, resetToken, firstName);
    }

    // =====================
    // CONTACT METHODS
    // =====================

    /**
     * Send contact form email to support team
     * @param {Object} contactData - Contact form data
     * @returns {Promise} Promise that resolves when email is sent
     */
    async sendContactFormEmail(contactData) {
        return await this.contact.sendContactFormEmail(contactData);
    }

    /**
     * Send auto-reply to contact form submitter
     * @param {string} email - User's email address
     * @param {string} firstName - User's first name
     * @param {string} subject - Contact subject
     * @returns {Promise} Promise that resolves when auto-reply is sent
     */
    async sendContactFormAutoReply(email, firstName, subject) {
        return await this.contact.sendContactFormAutoReply(email, firstName, subject);
    }

    // =====================
    // SECURITY METHODS
    // =====================

    /**
     * Send club reactivation alert to original delegate
     * @param {string} originalDelegateEmail - Email of the original delegate
     * @param {string} originalDelegateName - Name of the original delegate
     * @param {string} clubName - Name of the reactivated club
     * @param {string} newDelegateName - Name of the new delegate who reactivated
     * @param {string} newDelegateEmail - Email of the new delegate
     * @returns {Object} Result object with success status
     */
    async sendClubReactivationAlert(originalDelegateEmail, originalDelegateName, clubName, newDelegateName, newDelegateEmail) {
        return await this.security.sendClubReactivationAlert(originalDelegateEmail, originalDelegateName, clubName, newDelegateName, newDelegateEmail);
    }

    // =====================
    // UTILITY METHODS
    // =====================

    /**
     * Test email configuration
     * @returns {Object} Result object with success status
     */
    async testEmailConfiguration() {
        return await super.testEmailConfiguration();
    }
}

export default new EmailService();