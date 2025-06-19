const nodemailer = require('nodemailer');
const { EmailSubscription } = require('../models');
const { Op } = require('sequelize');

/**
 * Email Service Class
 * Handles all email communications with built-in mode checks
 */
class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            // Gmail configuration (can be switched to other providers)
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    /**
     * Check if emails should be sent based on site mode
     * @returns {boolean} True if emails can be sent, false otherwise
     */
    _canSendEmails() {
        // Don't send emails if coming soon mode is enabled
        if (process.env.FEATURE_COMING_SOON_MODE === 'true') {
            console.log('📧 Email sending disabled: Coming Soon mode is active');
            return false;
        }

        // Don't send emails if maintenance mode is enabled
        if (process.env.FEATURE_MAINTENANCE_MODE === 'true') {
            console.log('📧 Email sending disabled: Maintenance mode is active');
            return false;
        }

        return true;
    }

    /**
     * Log email that would have been sent but was blocked by mode check
     * @param {string} type - Type of email (invitation, notification, etc.)
     * @param {string} recipient - Email recipient
     * @param {string} subject - Email subject
     */
    _logBlockedEmail(type, recipient, subject) {
        const mode = process.env.FEATURE_COMING_SOON_MODE === 'true' ? 'Coming Soon' : 'Maintenance';
        console.log(`📧 ${type} email blocked (${mode} mode): ${recipient} - "${subject}"`);
    }

    // Send invitation email to new club delegates
    async sendInvitationEmail(email, inviteToken, inviterName, clubName) {
        const inviteUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/auth/register?token=${inviteToken}`;
        
        const mailOptions = {
            from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Invitation to join ${clubName} on Old Man Footy`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                        <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
                    </div>
                    
                    <div style="padding: 30px; background: #f9f9f9;">
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
                            <a href="${inviteUrl}" 
                               style="background: #006837; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Accept Invitation
                            </a>
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
                    
                    <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                        <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                    </div>
                </div>
            `
        };

        try {
            // Check if emails can be sent (not in coming soon or maintenance mode)
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Invitation', email, mailOptions.subject);
                return { success: false, message: 'Email sending is disabled in the current site mode' };
            }

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Invitation email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send invitation email:', error);
            throw error;
        }
    }

    // Send carnival notification to subscribers
    async sendCarnivalNotification(carnival, type = 'new') {
        try {
            // Check if emails can be sent (not in coming soon or maintenance mode)
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Carnival Notification', 'subscribers', `${type} carnival: ${carnival.title}`);
                return { success: false, message: 'Email sending is disabled in the current site mode', emailsSent: 0 };
            }

            // Get all email subscriptions that include this carnival's state in their stateFilter
            const subscriptions = await EmailSubscription.findAll({ 
                where: {
                    stateFilter: { [Op.contains]: [carnival.state] },
                    isActive: true
                }
            });

            if (subscriptions.length === 0) {
                console.log('No active subscriptions found for state:', carnival.state);
                return { success: true, emailsSent: 0 };
            }

            let subject, actionText, headerText;
            switch (type) {
                case 'new':
                    subject = `New Masters Rugby League Carnival: ${carnival.title}`;
                    actionText = 'new carnival';
                    headerText = '🏉 New Carnival Alert!';
                    break;
                case 'updated':
                    subject = `Carnival Updated: ${carnival.title}`;
                    actionText = 'carnival update';
                    headerText = '📅 Carnival Update';
                    break;
                case 'merged':
                    subject = `Carnival Enhanced: ${carnival.title}`;
                    actionText = 'carnival enhancement';
                    headerText = '🔄 Carnival Enhanced with MySideline Data!';
                    break;
                default:
                    subject = `Carnival Notification: ${carnival.title}`;
                    actionText = 'carnival notification';
                    headerText = '📢 Carnival Notification';
            }

            const carnivalUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/carnivals/${carnival.id}`;

            const promises = subscriptions.map(subscription => {
                const unsubscribeUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/unsubscribe?token=${subscription.unsubscribeToken}`;
                
                const mailOptions = {
                    from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
                    to: subscription.email,
                    subject: subject,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                                <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                                <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
                            </div>
                            
                            <div style="padding: 30px; background: #f9f9f9;">
                                <h2 style="color: #006837;">${headerText}</h2>
                                
                                ${type === 'merged' ? `
                                    <div style="background: #e8f5e8; border-left: 4px solid #006837; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                                        <p style="margin: 0; color: #006837; font-weight: bold;">
                                            This carnival has been enhanced by merging user-provided details with MySideline event data, 
                                            giving you the most complete and up-to-date information available!
                                        </p>
                                    </div>
                                ` : ''}
                                
                                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="color: #006837; margin-top: 0;">${carnival.title}</h3>
                                    
                                    <p><strong>📅 Date:</strong> ${carnival.date.toLocaleDateString('en-AU', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}</p>
                                    
                                    <p><strong>📍 Location:</strong> ${carnival.locationAddress}</p>
                                    <p><strong>🏟️ State:</strong> ${carnival.state}</p>
                                    
                                    ${carnival.scheduleDetails ? `<p><strong>📋 Schedule:</strong> ${carnival.scheduleDetails}</p>` : ''}
                                    
                                    <p><strong>📞 Contact:</strong> ${carnival.organiserContactName}</p>
                                    <p><strong>📧 Email:</strong> ${carnival.organiserContactEmail}</p>
                                    <p><strong>📱 Phone:</strong> ${carnival.organiserContactPhone}</p>
                                    
                                    ${carnival.registrationLink ? `
                                        <div style="margin: 20px 0;">
                                            <a href="${carnival.registrationLink}" 
                                               style="background: #FFD700; color: #006837; padding: 10px 20px; 
                                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                                Register Now
                                            </a>
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
                                    <a href="${carnivalUrl}" 
                                       style="background: #006837; color: white; padding: 15px 30px; 
                                              text-decoration: none; border-radius: 5px; font-weight: bold;">
                                        View Full Details
                                    </a>
                                </div>
                                
                                <p style="font-size: 14px; color: #666; text-align: center;">
                                    Stay connected with rugby league carnivals across Australia!
                                </p>
                            </div>
                            
                            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                                <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                                <p>
                                    <a href="${unsubscribeUrl}" style="color: #ccc;">Unsubscribe from these notifications</a>
                                </p>
                            </div>
                        </div>
                    `
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

    // Send welcome email to new subscribers
    async sendWelcomeEmail(email, states) {
        const unsubscribeUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/unsubscribe?email=${encodeURIComponent(email)}`;
        
        // Handle both single state (string) and multiple states (array) for backward compatibility
        const stateArray = Array.isArray(states) ? states : [states];
        const stateText = stateArray.length === 1 
            ? `in ${stateArray[0]}` 
            : `in ${stateArray.slice(0, -1).join(', ')} and ${stateArray[stateArray.length - 1]}`;
        
        const mailOptions = {
            from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Old Man Footy - Masters Carnival Notifications',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                        <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
                    </div>
                    
                    <div style="padding: 30px; background: #f9f9f9;">
                        <h2 style="color: #006837;">Welcome to Old Man Footy! 🏉</h2>
                        
                        <p>Thank you for subscribing to our carnival notifications!</p>
                        
                        <p>You'll now receive email updates about:</p>
                        <ul>
                            <li>New rugby league carnivals ${stateText}</li>
                            <li>Event updates and schedule changes</li>
                            <li>Registration reminders</li>
                            <li>Important announcements</li>
                        </ul>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #006837; margin-top: 0;">What's Next?</h3>
                            <p>Keep an eye on your inbox for upcoming carnival announcements. You can also visit our website anytime to browse current events and get the latest information.</p>
                            
                            <p><strong>Your subscription covers:</strong> ${stateArray.join(', ')}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.BASE_URL || 'http://localhost:3050'}/carnivals" 
                               style="background: #006837; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Browse Current Carnivals
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666; text-align: center;">
                            Together, we're building stronger rugby league communities across Australia!
                        </p>
                    </div>
                    
                    <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                        <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                        <p>
                            <a href="${unsubscribeUrl}" style="color: #ccc;">Unsubscribe from these notifications</a>
                        </p>
                    </div>
                </div>
            `
        };

        try {
            // Check if emails can be sent (not in coming soon or maintenance mode)
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Welcome', email, mailOptions.subject);
                return { success: false, message: 'Email sending is disabled in the current site mode' };
            }

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Welcome email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send welcome email:', error);
            throw error;
        }
    }

    // Send notification email when delegate role is transferred
    async sendDelegateRoleTransferNotification(newPrimaryEmail, newPrimaryName, formerPrimaryName, clubName) {
        const mailOptions = {
            from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
            to: newPrimaryEmail,
            subject: `You are now the Primary Delegate for ${clubName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                        <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
                    </div>
                    
                    <div style="padding: 30px; background: #f9f9f9;">
                        <h2 style="color: #006837;">🏆 Primary Delegate Role Transferred</h2>
                        
                        <p>Hello <strong>${newPrimaryName}</strong>,</p>
                        
                        <p><strong>${formerPrimaryName}</strong> has transferred the primary delegate role for <strong>${clubName}</strong> to you.</p>
                        
                        <div style="background: #e8f5e8; border-left: 4px solid #006837; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                            <h3 style="color: #006837; margin-top: 0;">Your New Responsibilities</h3>
                            <p style="margin: 0;">As the primary delegate, you now have additional privileges:</p>
                            <ul style="margin: 10px 0 0 0;">
                                <li>Invite new delegates to your club</li>
                                <li>Transfer the primary delegate role to other club members</li>
                                <li>Manage club settings and profile information</li>
                                <li>Full access to all club carnival management features</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.BASE_URL || 'http://localhost:3050'}/dashboard" 
                               style="background: #006837; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Access Your Dashboard
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">
                            If you have any questions about your new role or need assistance, 
                            please don't hesitate to contact our support team.
                        </p>
                        
                        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
                            Thank you for your continued support of Masters Rugby League!
                        </p>
                    </div>
                    
                    <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                        <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                    </div>
                </div>
            `
        };

        try {
            // Check if emails can be sent (not in coming soon or maintenance mode)
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Delegate Role Transfer', newPrimaryEmail, mailOptions.subject);
                return { success: false, message: 'Email sending is disabled in the current site mode' };
            }

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Delegate role transfer notification sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send delegate role transfer notification:', error);
            throw error;
        }
    }

    // Send carnival information to attendee clubs
    async sendCarnivalInfoToAttendees(carnival, attendeeClubs, senderName, customMessage = '') {
        try {
            if (!attendeeClubs || attendeeClubs.length === 0) {
                return { success: true, emailsSent: 0, message: 'No attendee clubs to email' };
            }

            const carnivalUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/carnivals/${carnival.id}`;
            
            const promises = attendeeClubs.map(club => {
                // Get primary delegate email or use a fallback
                const recipientEmail = club.primaryDelegateEmail || club.contactEmail;
                if (!recipientEmail) {
                    console.warn(`No email found for club: ${club.clubName}`);
                    return Promise.resolve({ status: 'rejected', reason: 'No email address' });
                }

                const mailOptions = {
                    from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
                    to: recipientEmail,
                    subject: `Important Update: ${carnival.title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                                <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                                <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
                            </div>
                            
                            <div style="padding: 30px; background: #f9f9f9;">
                                <h2 style="color: #006837;">📢 Carnival Information Update</h2>
                                
                                <p>Hello <strong>${club.clubName}</strong>,</p>
                                
                                <p><strong>${senderName}</strong> from the hosting club has sent you important information about the carnival you're attending:</p>
                                
                                ${customMessage ? `
                                    <div style="background: #e8f5e8; border-left: 4px solid #006837; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                                        <h4 style="color: #006837; margin-top: 0;">Message from the Organiser:</h4>
                                        <p style="margin: 0; white-space: pre-line;">${customMessage}</p>
                                    </div>
                                ` : ''}
                                
                                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="color: #006837; margin-top: 0;">${carnival.title}</h3>
                                    
                                    <p><strong>📅 Date:</strong> ${carnival.date.toLocaleDateString('en-AU', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}</p>
                                    
                                    <p><strong>📍 Location:</strong> ${carnival.locationAddress}</p>
                                    <p><strong>🏟️ State:</strong> ${carnival.state}</p>
                                    
                                    ${carnival.scheduleDetails ? `<p><strong>📋 Schedule:</strong></p><div style="background: #f8f9fa; padding: 10px; border-radius: 4px; white-space: pre-line;">${carnival.scheduleDetails}</div>` : ''}
                                    
                                    <p><strong>📞 Contact:</strong> ${carnival.organiserContactName}</p>
                                    <p><strong>📧 Email:</strong> <a href="mailto:${carnival.organiserContactEmail}">${carnival.organiserContactEmail}</a></p>
                                    <p><strong>📱 Phone:</strong> <a href="tel:${carnival.organiserContactPhone}">${carnival.organiserContactPhone}</a></p>
                                    
                                    ${carnival.registrationLink ? `
                                        <div style="margin: 15px 0;">
                                            <a href="${carnival.registrationLink}" 
                                               style="background: #FFD700; color: #006837; padding: 10px 20px; 
                                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                                Registration Link
                                            </a>
                                        </div>
                                    ` : ''}
                                    
                                    ${carnival.drawFileURL ? `
                                        <div style="margin: 15px 0;">
                                            <a href="${carnival.drawFileURL}" 
                                               style="background: #006837; color: white; padding: 10px 20px; 
                                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                                📋 Download Draw
                                            </a>
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
                                    <a href="${carnivalUrl}" 
                                       style="background: #006837; color: white; padding: 15px 30px; 
                                              text-decoration: none; border-radius: 5px; font-weight: bold;">
                                        View Full Carnival Details
                                    </a>
                                </div>
                                
                                <p style="font-size: 14px; color: #666;">
                                    Have questions? Reply to this email or contact the organiser directly using the details above.
                                </p>
                                
                                <p style="font-size: 14px; color: #666; text-align: center;">
                                    See you on the field! 🏉
                                </p>
                            </div>
                            
                            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                                <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                                <p>This email was sent by the carnival organiser to all attending clubs.</p>
                            </div>
                        </div>
                    `
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

    // Send club ownership invitation email
    async sendClubOwnershipInvitation(club, proxyCreator, inviteEmail, customMessage = '') {
        try {
            const claimUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/clubs/${club.id}/claim`;
            const clubUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/clubs/${club.id}`;
            
            const mailOptions = {
                from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
                to: inviteEmail,
                subject: `You've been invited to claim ${club.clubName} on Old Man Footy`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                            <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
                        </div>
                        
                        <div style="padding: 30px; background: #f9f9f9;">
                            <h2 style="color: #006837;">🏉 Club Ownership Invitation</h2>
                            
                            <p>Hello,</p>
                            
                            <p><strong>${proxyCreator.firstName} ${proxyCreator.lastName}</strong> has created a club profile for <strong>${club.clubName}</strong> on Old Man Footy and would like to invite you to take ownership of it.</p>
                            
                            ${customMessage ? `
                                <div style="background: #e8f5e8; border-left: 4px solid #006837; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                                    <h4 style="color: #006837; margin-top: 0;">Message from ${proxyCreator.firstName}:</h4>
                                    <p style="margin: 0; white-space: pre-line;">${customMessage}</p>
                                </div>
                            ` : ''}
                            
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
                                <a href="${claimUrl}" 
                                   style="background: #006837; color: white; padding: 15px 30px; 
                                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                    🏆 Claim ${club.clubName}
                                </a>
                            </div>
                            
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <h4 style="margin-top: 0; color: #856404;">📋 Important Notes:</h4>
                                <ul style="margin: 0; color: #856404;">
                                    <li>You need to register or login with this email address (${inviteEmail}) to claim ownership</li>
                                    <li>Once claimed, you'll be the primary delegate and can manage everything about your club</li>
                                    <li>If you don't claim ownership, the club profile will remain as a placeholder</li>
                                </ul>
                            </div>
                            
                            <div style="text-align: center; margin: 20px 0;">
                                <a href="${clubUrl}" 
                                   style="background: #ffc107; color: #212529; padding: 10px 20px; 
                                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                                    👀 View Club Profile
                                </a>
                            </div>
                            
                            <p style="font-size: 14px; color: #666;">
                                Questions about this invitation? Contact ${proxyCreator.firstName} ${proxyCreator.lastName} at 
                                <a href="mailto:${proxyCreator.email}">${proxyCreator.email}</a> or reply to this email.
                            </p>
                        </div>
                        
                        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                            <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                            <p>This invitation was sent by ${proxyCreator.firstName} ${proxyCreator.lastName} on behalf of ${club.clubName}.</p>
                        </div>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Club ownership invitation sent to ${inviteEmail} for club: ${club.clubName}`);
            
            return { 
                success: true, 
                message: `Ownership invitation sent to ${inviteEmail}` 
            };

        } catch (error) {
            console.error('Failed to send club ownership invitation:', error);
            throw error;
        }
    }

    // Send contact form email to support team
    async sendContactFormEmail(contactData) {
        const {
            firstName,
            lastName,
            email,
            phone,
            subject,
            clubName,
            message,
            newsletter,
            userAgent,
            ipAddress
        } = contactData;

        const subjectMapping = {
            'general': 'General Inquiry',
            'technical': 'Technical Support',
            'carnival': 'Carnival Information',
            'delegate': 'Club Delegate Support',
            'registration': 'Registration Help',
            'feedback': 'Feedback/Suggestions',
            'other': 'Other'
        };

        const emailSubject = `Contact Form: ${subjectMapping[subject] || 'General Inquiry'} - ${firstName} ${lastName}`;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #006837; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Old Man Footy - Contact Form</h1>
                </div>
                
                <div style="padding: 30px; background: #f8f9fa;">
                    <h2 style="color: #006837; margin-top: 0;">New Contact Form Submission</h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #006837; margin-top: 0;">Contact Information</h3>
                        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
                        <p><strong>Subject:</strong> ${subjectMapping[subject] || 'Other'}</p>
                        ${clubName ? `<p><strong>Club:</strong> ${clubName}</p>` : ''}
                        <p><strong>Newsletter Subscription:</strong> ${newsletter ? 'Yes' : 'No'}</p>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #006837; margin-top: 0;">Message</h3>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: Arial, sans-serif;">${message}</div>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #006837; margin-top: 0;">Technical Information</h3>
                        <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
                        <p><strong>IP Address:</strong> ${ipAddress}</p>
                        <p><strong>User Agent:</strong> ${userAgent}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="mailto:${email}?subject=Re: ${encodeURIComponent(emailSubject)}" 
                           style="background: #006837; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Reply to ${firstName}
                        </a>
                    </div>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                    <p>This email was sent from the Old Man Footy contact form.</p>
                </div>
            </div>
        `;

        const textContent = `
Old Man Footy - Contact Form Submission

Contact Information:
Name: ${firstName} ${lastName}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}
Subject: ${subjectMapping[subject] || 'Other'}
${clubName ? `Club: ${clubName}` : ''}
Newsletter Subscription: ${newsletter ? 'Yes' : 'No'}

Message:
${message}

Technical Information:
Submitted: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
IP Address: ${ipAddress}
User Agent: ${userAgent}

Reply to: ${email}
        `;

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@oldmanfooty.au',
            to: process.env.SUPPORT_EMAIL || 'support@oldmanfooty.au',
            replyTo: email,
            subject: emailSubject,
            text: textContent,
            html: htmlContent
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Contact form email sent successfully from ${email}`);
            
            // Send auto-reply to the user
            await this.sendContactFormAutoReply(email, firstName, subject);
            
        } catch (error) {
            console.error('❌ Error sending contact form email:', error);
            throw error;
        }
    }

    /**
     * Send auto-reply to contact form submitter
     * @param {string} email - User's email address
     * @param {string} firstName - User's first name
     * @param {string} subject - Contact subject
     */
    async sendContactFormAutoReply(email, firstName, subject) {
        const subjectMapping = {
            'general': 'General Inquiry',
            'technical': 'Technical Support',
            'carnival': 'Carnival Information',
            'delegate': 'Club Delegate Support',
            'registration': 'Registration Help',
            'feedback': 'Feedback/Suggestions',
            'other': 'Other'
        };

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #006837; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Thank You for Contacting Us</h1>
                </div>
                
                <div style="padding: 30px; background: #f8f9fa;">
                    <h2 style="color: #006837; margin-top: 0;">Hi ${firstName},</h2>
                    
                    <p>Thank you for reaching out to the Old Man Footy team regarding your <strong>${subjectMapping[subject] || 'inquiry'}</strong>.</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #006837; margin-top: 0;">What happens next?</h3>
                        <ul style="line-height: 1.6;">
                            <li>We've received your message and it's been forwarded to the appropriate team member</li>
                            <li>We typically respond to inquiries within 1-2 business days</li>
                            <li>You'll receive a response at this email address: <strong>${email}</strong></li>
                            <li>If your inquiry is urgent, you can also email us directly at support@oldmanfooty.au</li>
                        </ul>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #006837; margin-top: 0;">While you wait...</h3>
                        <p>Feel free to explore more of what Old Man Footy has to offer:</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="${process.env.BASE_URL || 'http://localhost:3050'}/carnivals" 
                               style="background: #006837; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; margin: 0 10px; display: inline-block;">
                                Browse Carnivals
                            </a>
                            <a href="${process.env.BASE_URL || 'http://localhost:3050'}/clubs" 
                               style="background: #006837; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; margin: 0 10px; display: inline-block;">
                                Find Clubs
                            </a>
                        </div>
                    </div>
                    
                    <p style="color: #666; font-style: italic;">
                        This is an automated response. Please do not reply to this email. 
                        We'll respond to your inquiry from our support team shortly.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Old Man Footy. All rights reserved.</p>
                </div>
            </div>
        `;

        const textContent = `
Hi ${firstName},

Thank you for reaching out to the Old Man Footy team regarding your ${subjectMapping[subject] || 'inquiry'}.

What happens next?
- We've received your message and it's been forwarded to the appropriate team member
- We typically respond to inquiries within 1-2 business days
- You'll receive a response at this email address: ${email}
- If your inquiry is urgent, you can also email us directly at support@oldmanfooty.au

While you wait, feel free to explore more of what Old Man Footy has to offer:
- Browse Carnivals: ${process.env.BASE_URL || 'http://localhost:3050'}/carnivals
- Find Clubs: ${process.env.BASE_URL || 'http://localhost:3050'}/clubs

This is an automated response. Please do not reply to this email. 
We'll respond to your inquiry from our support team shortly.

© ${new Date().getFullYear()} Old Man Footy. All rights reserved.
        `;

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@oldmanfooty.au',
            to: email,
            subject: `Thank you for contacting Old Man Footy - ${subjectMapping[subject] || 'Your Inquiry'}`,
            text: textContent,
            html: htmlContent
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Contact form auto-reply sent to ${email}`);
        } catch (error) {
            console.error('❌ Error sending contact form auto-reply:', error);
            // Don't throw error here as it's not critical
        }
    }

    // Send password reset email
    async sendPasswordResetEmail(email, resetToken, firstName) {
        const resetUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/auth/reset-password/${resetToken}`;
        
        const mailOptions = {
            from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request - Old Man Footy',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                        <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
                    </div>
                    
                    <div style="padding: 30px; background: #f9f9f9;">
                        <h2 style="color: #006837;">🔐 Password Reset Request</h2>
                        
                        <p>Hello <strong>${firstName}</strong>,</p>
                        
                        <p>We received a request to reset your password for your Old Man Footy account. If you made this request, please click the button below to reset your password:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background: #006837; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Reset My Password
                            </a>
                        </div>
                        
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                            <h4 style="color: #856404; margin-top: 0;">Security Information</h4>
                            <ul style="color: #856404; margin: 10px 0 0 0;">
                                <li>This link will expire in 24 hours</li>
                                <li>If you didn't request this reset, please ignore this email</li>
                                <li>Your password will remain unchanged if you don't click the link</li>
                                <li>For security, this request was initiated by an administrator</li>
                            </ul>
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">
                            If the button doesn't work, you can copy and paste this link into your browser:<br>
                            <a href="${resetUrl}" style="color: #006837;">${resetUrl}</a>
                        </p>
                        
                        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
                            If you have any questions, please contact our support team.
                        </p>
                    </div>
                    
                    <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                        <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                    </div>
                </div>
            `
        };

        try {
            // Check if emails can be sent (not in coming soon or maintenance mode)
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Password Reset', email, mailOptions.subject);
                return { success: false, message: 'Email sending is disabled in the current site mode' };
            }

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Password reset email sent to ${email}`);
        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    // Test email configuration
    async testEmailConfiguration() {
        try {
            const result = await this.transporter.verify();
            console.log('Email configuration is valid');
            return { success: true, message: 'Email configuration is valid' };
        } catch (error) {
            console.error('Email configuration error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send club reactivation alert to original delegate
     * @param {string} originalDelegateEmail - Email of the original delegate
     * @param {string} originalDelegateName - Name of the original delegate
     * @param {string} clubName - Name of the reactivated club
     * @param {string} newDelegateName - Name of the new delegate who reactivated
     * @param {string} newDelegateEmail - Email of the new delegate
     */
    async sendClubReactivationAlert(originalDelegateEmail, originalDelegateName, clubName, newDelegateName, newDelegateEmail) {
        const fraudReportUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/report-fraud?club=${encodeURIComponent(clubName)}&newDelegate=${encodeURIComponent(newDelegateEmail)}`;
        const clubUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/clubs/${encodeURIComponent(clubName)}`;

        const mailOptions = {
            from: `"Old Man Footy Security" <${process.env.EMAIL_USER}>`,
            to: originalDelegateEmail,
            subject: `🚨 SECURITY ALERT: ${clubName} has been reactivated`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #dc3545, #ff6b6b); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🚨 SECURITY ALERT</h1>
                        <p style="color: white; margin: 5px 0 0 0; font-weight: bold;">Old Man Footy - Club Reactivation Notice</p>
                    </div>
                    
                    <div style="padding: 30px; background: #f9f9f9;">
                        <h2 style="color: #dc3545; margin-top: 0;">Club Reactivation Alert</h2>
                        
                        <p>Hello <strong>${originalDelegateName}</strong>,</p>
                        
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                            <p style="margin: 0; color: #856404; font-weight: bold;">
                                ⚠️ Your deactivated club <strong>${clubName}</strong> has been reactivated by someone else.
                            </p>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #dc3545;">
                            <h3 style="color: #dc3545; margin-top: 0;">Reactivation Details</h3>
                            <p><strong>Club:</strong> ${clubName}</p>
                            <p><strong>Reactivated by:</strong> ${newDelegateName}</p>
                            <p><strong>New Delegate Email:</strong> ${newDelegateEmail}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-AU', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Australia/Sydney'
                            })} AEDT</p>
                        </div>
                        
                        <h3 style="color: #dc3545;">What does this mean?</h3>
                        <ul style="line-height: 1.6;">
                            <li><strong>${newDelegateName}</strong> has registered and claimed your deactivated club</li>
                            <li>They are now the primary delegate with full administrative control</li>
                            <li>They can create carnivals, manage club information, and invite other delegates</li>
                            <li>Your previous delegate access has been superseded</li>
                        </ul>
                        
                        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                            <h4 style="color: #155724; margin-top: 0;">✅ If this was legitimate:</h4>
                            <p style="margin: 0; color: #155724;">
                                If you know ${newDelegateName} and expected them to take over the club, 
                                no action is required. You can contact them directly to discuss access or collaboration.
                            </p>
                        </div>
                        
                        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                            <h4 style="color: #721c24; margin-top: 0;">🚨 If this was unauthorized:</h4>
                            <p style="margin: 0; color: #721c24;">
                                If you don't recognize ${newDelegateName} or believe this reactivation was fraudulent, 
                                please report it immediately using the button below.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${fraudReportUrl}" 
                               style="background: #dc3545; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 10px; display: inline-block;">
                                🚨 Report as Fraudulent
                            </a>
                            <a href="${clubUrl}" 
                               style="background: #6c757d; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 10px; display: inline-block;">
                                👀 View Club Page
                            </a>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="color: #006837; margin-top: 0;">Security Best Practices</h4>
                            <ul style="line-height: 1.6; margin: 0;">
                                <li>Always verify the identity of anyone claiming to represent your club</li>
                                <li>If you plan to deactivate your club temporarily, inform trusted club members</li>
                                <li>Consider reactivating your club yourself if you plan to use it again</li>
                                <li>Report any suspicious activity to our security team immediately</li>
                            </ul>
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">
                            This alert was sent because you were previously the primary delegate for ${clubName}. 
                            If you have questions or concerns, please contact our security team immediately.
                        </p>
                        
                        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
                            <strong>Time is important:</strong> Report any fraud within 48 hours for fastest resolution.
                        </p>
                    </div>
                    
                    <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                        <p>© 2025 Old Man Footy Security Team. Protecting Rugby League Communities Across Australia.</p>
                        <p>This is an automated security alert. For support, email security@oldmanfooty.au</p>
                    </div>
                </div>
            `
        };

        try {
            // Check if emails can be sent (not in coming soon or maintenance mode)
            if (!this._canSendEmails()) {
                this._logBlockedEmail('Club Reactivation Alert', originalDelegateEmail, mailOptions.subject);
                return { success: false, message: 'Email sending is disabled in the current site mode' };
            }

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`🚨 Club reactivation alert sent to original delegate: ${originalDelegateEmail}`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Failed to send club reactivation alert:', error);
            throw error;
        }
    }

    /**
     * Send registration approval notification email
     * @param {Object} carnival - Carnival instance
     * @param {Object} club - Club instance
     * @param {string} approverName - Name of the person who approved
     */
    async sendRegistrationApprovalEmail(carnival, club, approverName) {
        try {
            const carnivalUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/carnivals/${carnival.id}`;
            const loginUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/auth/login`;
            const recipientEmail = club.primaryDelegateEmail || club.contactEmail;
            
            // Get the primary contact's first name - try multiple sources
            let contactFirstName = 'there'; // Default fallback
            if (club.contactPerson) {
                // If contactPerson exists, try to extract first name
                contactFirstName = club.contactPerson.split(' ')[0];
            } else if (club.primaryDelegateName) {
                // If we have primary delegate name, use that
                contactFirstName = club.primaryDelegateName.split(' ')[0];
            }

            if (!recipientEmail) {
                console.warn(`No email found for club: ${club.clubName}`);
                return { success: false, message: 'No email address available' };
            }

            const mailOptions = {
                from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
                to: recipientEmail,
                subject: `🎉 Registration Approved: ${carnival.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                            <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
                        </div>
                        
                        <div style="padding: 30px; background: #f9f9f9;">
                            <h2 style="color: #006837;">🎉 Great News! Your Registration is Approved</h2>
                            
                            <p>Hello <strong>${contactFirstName}</strong>,</p>
                            
                            <p>Excellent news! <strong>${approverName}</strong> from the hosting club has approved <strong>${club.clubName}'s</strong> registration for:</p>
                            
                            <div style="background: #e8f5e8; border-left: 4px solid #006837; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                                <h3 style="color: #006837; margin-top: 0;">${carnival.title}</h3>
                                <p><strong>📅 Date:</strong> ${carnival.date.toLocaleDateString('en-AU', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}</p>
                                <p><strong>📍 Location:</strong> ${carnival.locationAddress}</p>
                            </div>
                            
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
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
                            </div>
                            
                            <p><strong>What's next?</strong></p>
                            <ul>
                                <li>✅ Your club is now officially attending this carnival</li>
                                <li>👥 <strong>Log in and add your players (required)</strong></li>
                                <li>📧 The organiser will contact you with payment details if required</li>
                                <li>📋 Keep an eye out for draw information and updates</li>
                            </ul>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${carnivalUrl}" 
                                   style="background: #006837; color: white; padding: 15px 30px; 
                                          text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 5px; display: inline-block;">
                                    🏉 Add Players to Carnival
                                </a>
                                <a href="${loginUrl}" 
                                   style="background: #ffc107; color: #212529; padding: 15px 30px; 
                                          text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 5px; display: inline-block;">
                                    🔐 Login to Account
                                </a>
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
                        
                        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                            <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                        </div>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Registration approval email sent to: ${recipientEmail}`);
            
            return { success: true, message: 'Approval email sent successfully' };

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
     */
    async sendRegistrationRejectionEmail(carnival, club, rejectorName, rejectionReason) {
        try {
            const carnivalUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/carnivals/${carnival.id}`;
            const recipientEmail = club.primaryDelegateEmail || club.contactEmail;
            
            // Get the primary contact's first name - try multiple sources
            let contactFirstName = 'there'; // Default fallback
            if (club.contactPerson) {
                // If contactPerson exists, try to extract first name
                contactFirstName = club.contactPerson.split(' ')[0];
            } else if (club.primaryDelegateName) {
                // If we have primary delegate name, use that
                contactFirstName = club.primaryDelegateName.split(' ')[0];
            }

            if (!recipientEmail) {
                console.warn(`No email found for club: ${club.clubName}`);
                return { success: false, message: 'No email address available' };
            }

            const mailOptions = {
                from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
                to: recipientEmail,
                subject: `Registration Update: ${carnival.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                            <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
                        </div>
                        
                        <div style="padding: 30px; background: #f9f9f9;">
                            <h2 style="color: #006837;">Registration Update</h2>
                            
                            <p>Hello <strong>${contactFirstName}</strong>,</p>
                            
                            <p>Thank you for <strong>${club.clubName}'s</strong> interest in attending <strong>${carnival.title}</strong>. Unfortunately, <strong>${rejectorName}</strong> from the hosting club was unable to approve your registration at this time.</p>
                            
                            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                                <h3 style="color: #006837; margin-top: 0;">${carnival.title}</h3>
                                <p><strong>📅 Date:</strong> ${carnival.date.toLocaleDateString('en-AU', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}</p>
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
                                <a href="${carnivalUrl}" 
                                   style="background: #006837; color: white; padding: 15px 30px; 
                                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                                    View Carnival Details
                                </a>
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
                        
                        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                            <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                        </div>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Registration rejection email sent to: ${recipientEmail}`);
            
            return { success: true, message: 'Rejection email sent successfully' };

        } catch (error) {
            console.error('Failed to send registration rejection email:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();