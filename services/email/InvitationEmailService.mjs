import { BaseEmailService } from './BaseEmailService.mjs';

/**
 * Invitation Email Service Class
 * Handles all invitation-related emails (delegate invitations, club ownership)
 */
export class InvitationEmailService extends BaseEmailService {
    constructor() {
        super();
    }

    /**
     * Send invitation email to new club delegates
     * @param {string} email - Recipient email
     * @param {string} inviteToken - Invitation token
     * @param {string} inviterName - Name of the person sending the invitation
     * @param {string} clubName - Name of the club
     * @returns {Object} Result object with success status
     */
    async sendDelegateInvitation(email, inviteToken, inviterName, clubName) {
        const inviteUrl = `${this._getBaseUrl()}/auth/register?token=${inviteToken}`;
        
        const mailOptions = {
            from: `"Old Man Footy" <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: `Invitation to join ${clubName} on Old Man Footy`,
            html: `
                <div style="${this._getEmailContainerStyles()}">
                    ${this._getEmailHeader()}
                    
                    <div style="${this._getEmailContentStyles()}">
                        <h2 style="color: #006837;">You're Invited!</h2>
                        
                        <p><strong>${inviterName}</strong> has invited you to join <strong>${clubName}</strong> as a club delegate on the Old Man Footy platform.</p>
                        
                        <p>As a club delegate, you'll be able to:</p>
                        <ul>
                            <li>Create and manage carnivals</li>
                            <li>Upload promotional materials and draws</li>
                            <li>Connect with other clubs across Australia</li>
                            <li>Manage your club's carnival schedule</li>
                        </ul>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            ${this._createButton(inviteUrl, 'Accept Invitation')}
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">
                            This invitation will expire in 7 days. If you have any questions, 
                            please contact ${inviterName} directly.
                        </p>
                        
                        <p style="font-size: 12px; color: #999; margin-top: 30px;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${inviteUrl}">${inviteUrl}</a>
                        </p>
                    </div>
                    
                    ${this._getEmailFooter()}
                </div>
            `
        };

        return await this.sendEmail(mailOptions, 'Invitation');
    }

    /**
     * Send delegate role transfer notification email
     * @param {string} newPrimaryEmail - Email of new primary delegate
     * @param {string} newPrimaryName - Name of new primary delegate
     * @param {string} formerPrimaryName - Name of former primary delegate
     * @param {string} clubName - Name of the club
     * @returns {Object} Result object with success status
     */
    async sendDelegateRoleTransfer(newPrimaryEmail, newPrimaryName, formerPrimaryName, clubName) {
        const dashboardUrl = `${this._getBaseUrl()}/dashboard`;
        
        const mailOptions = {
            from: `"Old Man Footy" <${process.env.EMAIL_FROM}>`,
            to: newPrimaryEmail,
            subject: `You are now the Primary Delegate for ${clubName}`,
            html: `
                <div style="${this._getEmailContainerStyles()}">
                    ${this._getEmailHeader()}
                    
                    <div style="${this._getEmailContentStyles()}">
                        <h2 style="color: #006837;">🏆 Primary Delegate Role Transferred</h2>
                        
                        <p>Hello <strong>${newPrimaryName}</strong>,</p>
                        
                        <p><strong>${formerPrimaryName}</strong> has transferred the primary delegate role for <strong>${clubName}</strong> to you.</p>
                        
                        ${this._createSuccessBox(`
                            <h3 style="color: #155724; margin-top: 0;">Your New Responsibilities</h3>
                            <p style="margin: 0;">As the primary delegate, you now have additional privileges:</p>
                            <ul style="margin: 10px 0 0 0;">
                                <li>Invite new delegates to your club</li>
                                <li>Transfer the primary delegate role to other club members</li>
                                <li>Manage club settings and profile information</li>
                                <li>Full access to all club carnival management features</li>
                            </ul>
                        `)}
                        
                        <div style="text-align: center; margin: 30px 0;">
                            ${this._createButton(dashboardUrl, 'Access Your Dashboard')}
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">
                            If you have any questions about your new role or need assistance, 
                            please don't hesitate to contact our support team.
                        </p>
                        
                        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
                            Thank you for your continued support of Masters Rugby League!
                        </p>
                    </div>
                    
                    ${this._getEmailFooter()}
                </div>
            `
        };

        return await this.sendEmail(mailOptions, 'Delegate Role Transfer');
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
        const claimUrl = `${this._getBaseUrl()}/clubs/${club.id}/claim`;
        const clubUrl = `${this._getBaseUrl()}/clubs/${club.id}`;
        
        const mailOptions = {
            from: `"Old Man Footy" <${process.env.EMAIL_FROM}>`,
            to: inviteEmail,
            subject: `You've been invited to claim ${club.clubName} on Old Man Footy`,
            html: `
                <div style="${this._getEmailContainerStyles()}">
                    ${this._getEmailHeader()}
                    
                    <div style="${this._getEmailContentStyles()}">
                        <h2 style="color: #006837;">🏉 Club Ownership Invitation</h2>
                        
                        <p>Hello,</p>
                        
                        <p><strong>${proxyCreator.firstName} ${proxyCreator.lastName}</strong> has created a club profile for <strong>${club.clubName}</strong> on Old Man Footy and would like to invite you to take ownership of it.</p>
                        
                        ${this._createInfoBox(`
                            <h4 style="color: #006837; margin-top: 0;">${customMessage ? `Message from ${proxyCreator.firstName}:` : 'Invitation Details:'}</h4>
                            <p style="margin: 0; white-space: pre-line;">${customMessage || `${proxyCreator.firstName} ${proxyCreator.lastName} has created a club profile on your behalf to help grow the Old Man Footy community.

We invite you to create an account on our platform using this email address to claim ownership of your club. Claiming ownership will allow you to:

• Manage your club's information and player roster
• Register for carnivals hosted by other clubs  
• Create and manage your own carnivals
• Connect with other Masters Rugby League clubs across Australia
• Submit player lists to carnival organisers

Old Man Footy is dedicated to supporting the Masters Rugby League community by making it easier for clubs to connect, organise events, and grow the sport we all love.`}</p>
                        `)}
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #006837; margin-top: 0;">${club.clubName}</h3>
                            
                            ${club.state ? `<p><strong>📍 State:</strong> ${club.state}</p>` : ''}
                            ${club.location ? `<p><strong>🌍 Location:</strong> ${club.location}</p>` : ''}
                            ${club.contactEmail ? `<p><strong>📧 Email:</strong> ${club.contactEmail}</p>` : ''}
                            ${club.contactPhone ? `<p><strong>📱 Phone:</strong> ${club.contactPhone}</p>` : ''}
                            ${club.description ? `<p><strong>📋 Description:</strong></p><div style="background: #f8f9fa; padding: 10px; border-radius: 4px; white-space: pre-line;">${club.description}</div>` : ''}
                        </div>
                        
                        <h3 style="color: #006837;">What happens when you claim ownership?</h3>
                        <ul>
                            <li>✅ You become the primary delegate for ${club.clubName}</li>
                            <li>✅ You can manage club information and settings</li>
                            <li>✅ You can create and manage carnivals for your club</li>
                            <li>✅ You can invite other club members as delegates</li>
                            <li>✅ You can register your club for carnivals hosted by others</li>
                        </ul>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            ${this._createButton(claimUrl, `🏆 Claim ${club.clubName}`)}
                        </div>
                        
                        ${this._createWarningBox(`
                            <h4 style="margin-top: 0; color: #856404;">📋 Important Notes:</h4>
                            <ul style="margin: 0; color: #856404;">
                                <li>You need to register or login with this email address (${inviteEmail}) to claim ownership</li>
                                <li>Once claimed, you'll be the primary delegate and can manage everything about your club</li>
                                <li>If you don't claim ownership, the club profile will remain as a placeholder</li>
                            </ul>
                        `)}
                        
                        <div style="text-align: center; margin: 20px 0;">
                            ${this._createButton(clubUrl, '👀 View Club Profile', '#ffc107', '#212529')}
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">
                            Questions about this invitation? Contact ${proxyCreator.firstName} ${proxyCreator.lastName} at 
                            <a href="mailto:${proxyCreator.email}">${proxyCreator.email}</a> or reply to this email.
                        </p>
                    </div>
                    
                    ${this._getEmailFooter(`This invitation was sent by ${proxyCreator.firstName} ${proxyCreator.lastName} on behalf of ${club.clubName}.`)}
                </div>
            `
        };

        const result = await this.sendEmail(mailOptions, 'Club Ownership Invitation');
        if (result.success) {
            console.log(`Club ownership invitation sent to ${inviteEmail} for club: ${club.clubName}`);
        }
        return result;
    }
}

export default new InvitationEmailService();