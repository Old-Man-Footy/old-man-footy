import { BaseEmailService } from './BaseEmailService.mjs';
import { EmailSubscription } from '../../models/index.mjs';
import { Op } from 'sequelize';

/**
 * Carnival Email Service Class
 * Handles all carnival-related email communications
 */
export class CarnivalEmailService extends BaseEmailService {
    constructor() {
        super();
    }

    /**
     * Send carnival notification to subscribers
     * @param {Object} carnival - Carnival instance
     * @param {string} type - Type of notification ('new', 'updated', 'merged')
     * @returns {Object} Result object with success status and statistics
     */
    async sendCarnivalNotification(carnival, type = 'new') {
        try {
            // Check if emails can be sent
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Carnival Notification', 'subscribers', `${type} carnival: ${carnival.title}`);
                return { 
                    success: false, 
                    message: 'Email sending is disabled in the current site mode', 
                    emailsSent: 0 
                };
            }

            // Get all email subscriptions that include this carnival's state
            const subscriptions = await EmailSubscription.findAll({ 
                where: {
                    states: { [Op.contains]: [carnival.state] },
                    isActive: true
                }
            });

            if (subscriptions.length === 0) {
                console.log('No active subscriptions found for state:', carnival.state);
                return { success: true, emailsSent: 0 };
            }

            const { subject, headerText } = this._getCarnivalNotificationContent(type, carnival.title);
            const carnivalUrl = `${this._getBaseUrl()}/carnivals/${carnival.id}`;

            const promises = subscriptions.map(subscription => {
                const unsubscribeUrl = `${this._getBaseUrl()}/unsubscribe?token=${subscription.unsubscribeToken}`;
                
                const mailOptions = {
                    from: `"Old Man Footy" <${process.env.EMAIL_FROM}>`,
                    to: subscription.email,
                    subject: subject,
                    html: this._buildCarnivalNotificationHtml(carnival, type, headerText, carnivalUrl, unsubscribeUrl)
                };

                return this.transporter.sendMail(mailOptions);
            });

            const results = await Promise.allSettled(promises);
            const successful = results.filter(result => result.status === 'fulfilled').length;
            const failed = results.filter(result => result.status === 'rejected').length;

            console.log(`Carnival notification emails sent: ${successful} successful, ${failed} failed`);
            
            return { 
                success: true, 
                emailsSent: successful, 
                emailsFailed: failed,
                totalSubscribers: subscriptions.length
            };

        } catch (error) {
            console.error('Failed to send carnival notification emails:', error);
            throw error;
        }
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
        try {
            if (!attendeeClubs || attendeeClubs.length === 0) {
                return { success: true, emailsSent: 0, message: 'No attendee clubs to email' };
            }

            // Check if emails can be sent
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Carnival Attendees Notification', 'subscribers', `attendees carnival: ${carnival.title}`);
                return { 
                    success: false, 
                    message: 'Email sending is disabled in the current site mode', 
                    emailsSent: 0 
                };
            }

            const carnivalUrl = `${this._getBaseUrl()}/carnivals/${carnival.id}`;
            
            const promises = attendeeClubs.map(club => {
                const recipient = this._getRecipientDetails(club);
                if (!recipient.email) {
                    console.warn(`No email found for club: ${club.clubName}`);
                    // Return a rejected promise for Promise.allSettled to correctly handle failures
                    return Promise.reject({ status: 'rejected', reason: 'No email address' });
                }

                const mailOptions = {
                    from: `"Old Man Footy" <${process.env.EMAIL_FROM}>`,
                    to: recipient.email,
                    subject: `Important Update: ${carnival.title}`,
                    html: this._buildCarnivalInfoToAttendeesHtml(carnival, club, senderName, customMessage, carnivalUrl, recipient.name)
                };

                return this.transporter.sendMail(mailOptions);
            });

            const results = await Promise.allSettled(promises);
            const successful = results.filter(result => result.status === 'fulfilled').length;
            const failed = results.filter(result => result.status === 'rejected').length;

            console.log(`Carnival info emails sent to attendees: ${successful} successful, ${failed} failed`);
            
            return { 
                success: true, 
                emailsSent: successful, 
                emailsFailed: failed,
                totalRecipients: attendeeClubs.length,
                message: `Successfully sent carnival information to ${successful} attendee clubs${failed > 0 ? ` (${failed} failed)` : ''}`
            };

        } catch (error) {
            console.error('Failed to send carnival info emails to attendees:', error);
            throw error;
        }
    }

    /**
     * Send registration approval notification email
     * @param {Object} carnival - Carnival instance
     * @param {Object} club - Club instance
     * @param {string} approverName - Name of the person who approved
     * @returns {Object} Result object with success status
     */
    async sendRegistrationApproval(carnival, club, approverName) {
        try {
            const carnivalUrl = `${this._getBaseUrl()}/carnivals/${carnival.id}`;
            const loginUrl = `${this._getBaseUrl()}/auth/login`;
            const recipient = this._getRecipientDetails(club);

            if (!recipient.email) {
                console.warn(`No email found for club: ${club.clubName}`);
                return { success: false, message: 'No email address available' };
            }

            // Check if emails can be sent
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Carnival Registration Approval', 'subscribers', `registration carnival: ${carnival.title}`);
                return { 
                    success: false, 
                    message: 'Email sending is disabled in the current site mode', 
                    emailsSent: 0 
                };
            }

            const mailOptions = {
                from: `"Old Man Footy" <${process.env.EMAIL_FROM}>`,
                to: recipient.email,
                subject: `🎉 Registration Approved: ${carnival.title}`,
                html: this._buildRegistrationApprovalHtml(carnival, club, approverName, recipient.name, carnivalUrl, loginUrl)
            };

            const result = await this.sendEmail(mailOptions, 'Registration Approval');
            if (result.success) {
                console.log(`Registration approval email sent to: ${recipient.email}`);
            }
            return result;

        } catch (error) {
            console.error('Failed to send registration approval email:', error);
            throw error;
        }
    }

    /**
     * Send registration rejection notification email
     * @param {Object} carnival - Carnival instance
     * @param {Object} club - Club instance
     * @param {string} rejectorName - Name of the person who rejected
     * @param {string} rejectionReason - Reason for rejection
     * @returns {Object} Result object with success status
     */
    async sendRegistrationRejection(carnival, club, rejectorName, rejectionReason) {
        try {
            const carnivalUrl = `${this._getBaseUrl()}/carnivals/${carnival.id}`;
            const recipient = this._getRecipientDetails(club);

            if (!recipient.email) {
                console.warn(`No email found for club: ${club.clubName}`);
                return { success: false, message: 'No email address available' };
            }

            // Check if emails can be sent
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Carnival Registration Rejection', 'subscribers', `rejection carnival: ${carnival.title}`);
                return { 
                    success: false, 
                    message: 'Email sending is disabled in the current site mode', 
                    emailsSent: 0 
                };
            }

            const mailOptions = {
                from: `"Old Man Footy" <${process.env.EMAIL_FROM}>`,
                to: recipient.email,
                subject: `Registration Update: ${carnival.title}`,
                html: this._buildRegistrationRejectionHtml(carnival, club, rejectorName, rejectionReason, recipient.name, carnivalUrl)
            };

            const result = await this.sendEmail(mailOptions, 'Registration Rejection');
            if (result.success) {
                console.log(`Registration rejection email sent to: ${recipient.email}`);
            }
            return result;

        } catch (error) {
            console.error('Failed to send registration rejection email:', error);
            throw error;
        }
    }

    /**
     * Send carnival claim notification to original MySideline organiser
     * @param {Object} carnival - Carnival instance
     * @param {Object} claimingUser - User who claimed the carnival
     * @param {Object} claimingClub - Club that claimed the carnival
     * @param {string} originalEmail - Original MySideline contact email
     * @returns {Object} Result object with success status
     */
    async sendCarnivalClaimNotification(carnival, claimingUser, claimingClub, originalEmail) {
        try {
            // Check if emails can be sent
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Carnival Claim Notification', originalEmail, `carnival claimed: ${carnival.title}`);
                return { 
                    success: false, 
                    message: 'Email sending is disabled in the current site mode'
                };
            }

            if (!originalEmail) {
                console.warn('No original email address available for carnival claim notification');
                return { success: false, message: 'No original email address available' };
            }

            // Check if the claiming user has the same email as the original MySideline contact
            // If so, don't send a notification (they're claiming their own carnival)
            if (claimingUser.email && claimingUser.email.toLowerCase() === originalEmail.toLowerCase()) {
                console.log(`Skipping carnival claim notification - claiming user (${claimingUser.email}) is the same as original contact (${originalEmail})`);
                return { 
                    success: false, 
                    message: 'No notification sent - claiming user is the original contact'
                };
            }

            const carnivalUrl = `${this._getBaseUrl()}/carnivals/${carnival.id}`;
            const claimerName = `${claimingUser.firstName} ${claimingUser.lastName}`;

            const mailOptions = {
                from: `"Old Man Footy" <${process.env.EMAIL_FROM}>`,
                to: originalEmail,
                subject: `Your carnival "${carnival.title}" has been claimed on Old Man Footy`,
                html: this._buildCarnivalClaimNotificationHtml(carnival, claimerName, claimingClub, carnivalUrl)
            };

            const result = await this.sendEmail(mailOptions, 'Carnival Claim Notification');
            if (result.success) {
                console.log(`Carnival claim notification email sent to: ${originalEmail}`);
            }
            return result;

        } catch (error) {
            console.error('Failed to send carnival claim notification email:', error);
            throw error;
        }
    }

    /**
     * Get carnival notification content based on type
     * @param {string} type - Notification type
     * @param {string} carnivalTitle - Title of the carnival
     * @returns {Object} Object with subject and headerText
     */
    _getCarnivalNotificationContent(type, carnivalTitle) {
        switch (type) {
            case 'new':
                return {
                    subject: `New Masters Rugby League Carnival: ${carnivalTitle}`,
                    headerText: '🏉 New Carnival Alert!'
                };
            case 'updated':
                return {
                    subject: `Carnival Updated: ${carnivalTitle}`,
                    headerText: '📅 Carnival Update'
                };
            case 'merged':
                return {
                    subject: `Carnival Enhanced: ${carnivalTitle}`,
                    headerText: '🔄 Carnival Enhanced with MySideline Data!'
                };
            default:
                return {
                    subject: `Carnival Notification: ${carnivalTitle}`,
                    headerText: '📢 Carnival Notification'
                };
        }
    }

    /**
     * Get recipient details (email and name) for a club
     * @param {Object} club - Club instance
     * @returns {{email: string|null, name: string}}
     */
    _getRecipientDetails(club) {
        if (club.primaryDelegateEmail && club.primaryDelegateName) {
            return {
                email: club.primaryDelegateEmail,
                name: club.primaryDelegateName.split(' ')[0]
            };
        }
        if (club.contactEmail && club.contactPerson) {
            return {
                email: club.contactEmail,
                name: club.contactPerson.split(' ')[0]
            };
        }
        // Fallback cases
        if (club.primaryDelegateEmail) {
            return {
                email: club.primaryDelegateEmail,
                name: club.clubName // Default to club name if specific name is missing
            };
        }
        if (club.contactEmail) {
            return {
                email: club.contactEmail,
                name: club.clubName
            };
        }
        return { email: null, name: club.clubName };
    }

    /**
     * Build HTML for carnival notification email
     * @param {Object} carnival - Carnival instance
     * @param {string} type - Notification type
     * @param {string} headerText - Header text for email
     * @param {string} carnivalUrl - URL to carnival page
     * @param {string} unsubscribeUrl - Unsubscribe URL
     * @returns {string} HTML content
     */
    _buildCarnivalNotificationHtml(carnival, type, headerText, carnivalUrl, unsubscribeUrl) {
        return `
            <div style="${this._getEmailContainerStyles()}">
                ${this._getEmailHeader()}
                
                <div style="${this._getEmailContentStyles()}">
                    <h2 style="color: #006837;">${headerText}</h2>
                    
                    ${type === 'merged' ? this._createInfoBox(`
                        <p style="margin: 0; color: #006837; font-weight: bold;">
                            This carnival has been enhanced by merging user-provided details with MySideline carnival data, 
                            giving you the most complete and up-to-date information available!
                        </p>
                    `) : ''}
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #006837; margin-top: 0;">${carnival.title}</h3>
                        
                        <p><strong>📅 Date:</strong> ${this._formatDate(carnival.date)}</p>
                        <p><strong>📍 Location:</strong> ${carnival.locationAddress}</p>
                        <p><strong>🏟️ State:</strong> ${carnival.state}</p>
                        
                        ${carnival.scheduleDetails ? `<p><strong>📋 Schedule:</strong> ${carnival.scheduleDetails}</p>` : ''}
                        
                        <p><strong>📞 Contact:</strong> ${carnival.organiserContactName}</p>
                        <p><strong>📧 Email:</strong> ${carnival.organiserContactEmail}</p>
                        <p><strong>📱 Phone:</strong> ${carnival.organiserContactPhone}</p>
                        
                        ${carnival.registrationLink ? `
                            <div style="margin: 20px 0;">
                                ${this._createButton(carnival.registrationLink, 'Register Now', '#FFD700', '#006837')}
                            </div>
                        ` : ''}
                        
                        ${type === 'merged' && carnival.lastMySidelineSync ? `
                            <div style="margin-top: 15px; padding: 10px; background: #f0f8ff; border-radius: 5px;">
                                <small style="color: #666;">
                                    <strong>Data Source:</strong> Enhanced with MySideline integration • 
                                    <strong>Last Updated:</strong> ${new Date().toLocaleDateString('en-AU')}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        ${this._createButton(carnivalUrl, 'View Full Details')}
                    </div>
                    
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        Stay connected with rugby league carnivals across Australia!
                    </p>
                </div>
                
                ${this._getEmailFooter(`<a href="${unsubscribeUrl}" style="color: #ccc;">Unsubscribe from these notifications</a>`)}
            </div>
        `;
    }

    /**
     * Build HTML for carnival info to attendees email
     * @param {Object} carnival - Carnival instance
     * @param {Object} club - Club instance
     * @param {string} senderName - Name of sender
     * @param {string} customMessage - Custom message
     * @param {string} carnivalUrl - URL to carnival page
     * @param {string} contactFirstName - First name of the contact person
     * @returns {string} HTML content
     */
    _buildCarnivalInfoToAttendeesHtml(carnival, club, senderName, customMessage, carnivalUrl, contactFirstName) {
        return `
            <div style="${this._getEmailContainerStyles()}">
                ${this._getEmailHeader()}
                
                <div style="${this._getEmailContentStyles()}">
                    <h2 style="color: #006837;">📢 Carnival Information Update</h2>
                    
                    <p>Hello <strong>${contactFirstName || club.clubName}</strong>,</p>
                    
                    <p><strong>${senderName}</strong> from the hosting club has sent you important information about the carnival you're attending:</p>
                    
                    ${customMessage ? this._createInfoBox(`
                        <h4 style="color: #006837; margin-top: 0;">Message from the Organiser:</h4>
                        <p style="margin: 0; white-space: pre-line;">${customMessage}</p>
                    `) : ''}
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #006837; margin-top: 0;">${carnival.title}</h3>
                        
                        <p><strong>📅 Date:</strong> ${this._formatDate(carnival.date)}</p>
                        <p><strong>📍 Location:</strong> ${carnival.locationAddress}</p>
                        <p><strong>🏟️ State:</strong> ${carnival.state}</p>
                        
                        ${carnival.scheduleDetails ? `<p><strong>📋 Schedule:</strong></p><div style="background: #f8f9fa; padding: 10px; border-radius: 4px; white-space: pre-line;">${carnival.scheduleDetails}</div>` : ''}
                        
                        <p><strong>📞 Contact:</strong> ${carnival.organiserContactName}</p>
                        <p><strong>📧 Email:</strong> <a href="mailto:${carnival.organiserContactEmail}">${carnival.organiserContactEmail}</a></p>
                        <p><strong>📱 Phone:</strong> <a href="tel:${carnival.organiserContactPhone}">${carnival.organiserContactPhone}</a></p>
                        
                        ${carnival.registrationLink ? `
                            <div style="margin: 15px 0;">
                                ${this._createButton(carnival.registrationLink, 'Registration Link', '#FFD700', '#006837')}
                            </div>
                        ` : ''}
                        
                        ${carnival.drawFileURL ? `
                            <div style="margin: 15px 0;">
                                ${this._createButton(carnival.drawFileURL, '📋 Download Draw')}
                            </div>
                        ` : ''}
                        
                        ${carnival.feesDescription ? `<p><strong>💰 Fees:</strong> ${carnival.feesDescription}</p>` : ''}
                        
                        ${carnival.callForVolunteers ? `
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0;">
                                <p style="margin: 0;"><strong>🙋 Volunteers Needed:</strong> ${carnival.callForVolunteers}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        ${this._createButton(carnivalUrl, 'View Full Carnival Details')}
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        Have questions? Reply to this email or contact the organiser directly using the details above.
                    </p>
                    
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        See you on the field! 🏉
                    </p>
                </div>
                
                ${this._getEmailFooter('This email was sent by the carnival organiser to all attending clubs.')}
            </div>
        `;
    }

    /**
     * Build HTML for registration approval email
     * @param {Object} carnival - Carnival instance
     * @param {Object} club - Club instance
     * @param {string} approverName - Name of approver
     * @param {string} contactFirstName - First name of contact
     * @param {string} carnivalUrl - URL to carnival page
     * @param {string} loginUrl - URL to login page
     * @returns {string} HTML content
     */
    _buildRegistrationApprovalHtml(carnival, club, approverName, contactFirstName, carnivalUrl, loginUrl) {
        return `
            <div style="${this._getEmailContainerStyles()}">
                ${this._getEmailHeader()}
                
                <div style="${this._getEmailContentStyles()}">
                    <h2 style="color: #006837;">🎉 Great News! Your Registration is Approved</h2>
                    
                    <p>Hello <strong>${contactFirstName}</strong>,</p>
                    
                    <p>Excellent news! <strong>${approverName}</strong> from the hosting club has approved <strong>${club.clubName}'s</strong> registration for:</p>
                    
                    ${this._createSuccessBox(`
                        <h3 style="color: #006837; margin-top: 0;">${carnival.title}</h3>
                        <p><strong>📅 Date:</strong> ${this._formatDate(carnival.date)}</p>
                        <p><strong>📍 Location:</strong> ${carnival.locationAddress}</p>
                    `)}
                    
                    ${this._createWarningBox(`
                        <h4 style="color: #856404; margin-top: 0;">🏉 Next Step: Add Your Players</h4>
                        <p style="margin: 10px 0; color: #856404;">
                            Now that your registration is approved, you need to log into the Old Man Footy website 
                            and add the list of players from your club who will be attending this carnival.
                        </p>
                        
                        <p style="margin: 10px 0; color: #856404;"><strong>How to add players:</strong></p>
                        <ol style="margin: 10px 0; color: #856404; line-height: 1.6;">
                            <li>Log into your account at <a href="${loginUrl}" style="color: #856404; text-decoration: underline;">oldmanfooty.au/auth/login</a></li>
                            <li>Go to the carnival page by clicking the button below</li>
                            <li>Look for the "Manage Players" button in your registration section</li>
                            <li>Select which players from your club roster will attend</li>
                            <li>Save your player selections</li>
                        </ol>
                        
                        <p style="margin: 10px 0 0 0; color: #856404; font-weight: bold;">
                            ⚠️ Important: Player selections must be completed before the carnival starts.
                        </p>
                    `)}
                    
                    <p><strong>What's next?</strong></p>
                    <ul>
                        <li>✅ Your club is now officially attending this carnival</li>
                        <li>👥 <strong>Log in and add your players (required)</strong></li>
                        <li>📧 The organiser will contact you with payment details if required</li>
                        <li>📋 Keep an eye out for draw information and updates</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        ${this._createButton(carnivalUrl, '🏉 Add Players to Carnival')}
                        ${this._createButton(loginUrl, '🔐 Login to Account', '#ffc107', '#212529')}
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        <strong>Contact:</strong> ${carnival.organiserContactName}<br>
                        <strong>Email:</strong> <a href="mailto:${carnival.organiserContactEmail}">${carnival.organiserContactEmail}</a><br>
                        <strong>Phone:</strong> <a href="tel:${carnival.organiserContactPhone}">${carnival.organiserContactPhone}</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        See you on the field! 🏉
                    </p>
                </div>
                
                ${this._getEmailFooter()}
            </div>
        `;
    }

    /**
     * Build HTML for registration rejection email
     * @param {Object} carnival - Carnival instance
     * @param {Object} club - Club instance
     * @param {string} rejectorName - Name of rejector
     * @param {string} rejectionReason - Reason for rejection
     * @param {string} contactFirstName - First name of contact
     * @param {string} carnivalUrl - URL to carnival page
     * @returns {string} HTML content
     */
    _buildRegistrationRejectionHtml(carnival, club, rejectorName, rejectionReason, contactFirstName, carnivalUrl) {
        return `
            <div style="${this._getEmailContainerStyles()}">
                ${this._getEmailHeader()}
                
                <div style="${this._getEmailContentStyles()}">
                    <h2 style="color: #006837;">Registration Update</h2>
                    
                    <p>Hello <strong>${contactFirstName}</strong>,</p>
                    
                    <p>Thank you for <strong>${club.clubName}'s</strong> interest in attending <strong>${carnival.title}</strong>. Unfortunately, <strong>${rejectorName}</strong> from the hosting club was unable to approve your registration at this time.</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h3 style="color: #006837; margin-top: 0;">${carnival.title}</h3>
                        <p><strong>📅 Date:</strong> ${this._formatDate(carnival.date)}</p>
                        <p><strong>📍 Location:</strong> ${carnival.locationAddress}</p>
                        
                        ${rejectionReason && rejectionReason !== 'No reason provided' ? `
                            <div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin: 15px 0;">
                                <strong>Reason:</strong> ${rejectionReason}
                            </div>
                        ` : ''}
                    </div>
                    
                    <p><strong>What can you do next?</strong></p>
                    <ul>
                        <li>📞 Contact the organiser directly to discuss your registration</li>
                        <li>📧 Reply to this email with any questions</li>
                        <li>👀 Keep an eye out for future carnivals in your area</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        ${this._createButton(carnivalUrl, 'View Carnival Details')}
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        <strong>Contact the Organiser:</strong><br>
                        <strong>Name:</strong> ${carnival.organiserContactName}<br>
                        <strong>Email:</strong> <a href="mailto:${carnival.organiserContactEmail}">${carnival.organiserContactEmail}</a><br>
                        <strong>Phone:</strong> <a href="tel:${carnival.organiserContactPhone}">${carnival.organiserContactPhone}</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        We appreciate your interest and hope to see you at future events! 🏉
                    </p>
                </div>
                
                ${this._getEmailFooter()}
            </div>
        `;
    }

    /**
     * Build HTML for carnival claim notification email
     * @param {Object} carnival - Carnival instance
     * @param {string} claimerName - Name of the person who claimed the carnival
     * @param {Object} claimingClub - Club that claimed the carnival
     * @param {string} carnivalUrl - URL to carnival page
     * @returns {string} HTML content
     */
    _buildCarnivalClaimNotificationHtml(carnival, claimerName, claimingClub, carnivalUrl) {
        return `
            <div style="${this._getEmailContainerStyles()}">
                ${this._getEmailHeader()}
                
                <div style="${this._getEmailContentStyles()}">
                    <h2 style="color: #006837;">🏉 Your Carnival Has Been Claimed</h2>
                    
                    <p>Hello,</p>
                    
                    <p>This is a notification to let you know that your carnival listed on MySideline has been claimed and is now being managed through Old Man Footy.</p>
                    
                    ${this._createInfoBox(`
                        <h3 style="color: #006837; margin-top: 0;">${carnival.title}</h3>
                        <p><strong>📅 Date:</strong> ${this._formatDate(carnival.date)}</p>
                        <p><strong>📍 Location:</strong> ${carnival.locationAddress}</p>
                        <p><strong>🏟️ State:</strong> ${carnival.state}</p>
                    `)}
                    
                    <p><strong>Who claimed your carnival:</strong></p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>👤 Contact Person:</strong> ${claimerName}</p>
                        <p style="margin: 5px 0 0 0;"><strong>🏛️ Club:</strong> ${claimingClub.clubName}</p>
                        ${claimingClub.location ? `<p style="margin: 5px 0 0 0;"><strong>📍 Club Location:</strong> ${claimingClub.location}</p>` : ''}
                    </div>
                    
                    <p><strong>What this means:</strong></p>
                    <ul style="line-height: 1.6;">
                        <li>🎯 Your carnival is now actively managed on Old Man Footy</li>
                        <li>📋 Registration and player management is handled through our platform</li>
                        <li>📧 You can contact the new organiser using the details above</li>
                        <li>🔗 View the full carnival page using the link below</li>
                    </ul>
                    
                    ${this._createWarningBox(`
                        <p style="margin: 0; color: #856404;">
                            <strong>📞 Need to contact the organiser?</strong><br>
                            If you have questions about your carnival or need to coordinate with the new organiser, 
                            you can reach out to ${claimerName} directly or view the carnival page for updated contact information.
                        </p>
                    `)}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        ${this._createButton(carnivalUrl, '🏉 View Your Carnival on Old Man Footy')}
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        <strong>About Old Man Footy:</strong> We're a platform dedicated to connecting masters rugby league clubs across Australia. 
                        Your carnival is now part of a network that makes it easier for teams to find and register for events.
                    </p>
                    
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        Thank you for organizing masters rugby league events! 🏉
                    </p>
                </div>
                
                ${this._getEmailFooter(`Questions? Reply to this email or visit <a href="${this._getBaseUrl()}" style="color: #ccc;">oldmanfooty.au</a>`)}
            </div>
        `;
    }
}

export default new CarnivalEmailService();