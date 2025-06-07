const nodemailer = require('nodemailer');
const { EmailSubscription } = require('../models');
const { Op } = require('sequelize');

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

    // Send invitation email to new club delegates
    async sendInvitationEmail(email, inviteToken, inviterName, clubName) {
        const inviteUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/auth/register?token=${inviteToken}`;
        
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
                            <li>Create and manage carnival events</li>
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

            const carnivalUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/carnivals/${carnival.id}`;

            const promises = subscriptions.map(subscription => {
                const unsubscribeUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/unsubscribe?token=${subscription.unsubscribeToken}`;
                
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
                                    
                                    ${type === 'merged' && carnival.mySidelineEventId ? `
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
        const unsubscribeUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(email)}`;
        
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
                            <a href="${process.env.BASE_URL || 'http://localhost:3000'}/carnivals" 
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
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Welcome email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send welcome email:', error);
            throw error;
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
}

module.exports = new EmailService();