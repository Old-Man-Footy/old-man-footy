import { BaseEmailService } from './BaseEmailService.mjs';

/**
 * Authentication Email Service Class
 * Handles all authentication-related emails (password reset, welcome emails)
 */
export class AuthEmailService extends BaseEmailService {
    constructor() {
        super();
    }

    /**
     * Send welcome email to new subscribers
     * @param {string} email - Recipient email
     * @param {Array|string} states - States for subscription (array or single string)
     * @returns {Object} Result object with success status
     */
    async sendWelcomeEmail(email, states) {
        const unsubscribeUrl = `${this._getBaseUrl()}/unsubscribe?email=${encodeURIComponent(email)}`;
        
        // Handle both single state (string) and multiple states (array) for backward compatibility
        const stateArray = Array.isArray(states) ? states : [states];
        
        let stateText;
        switch (stateArray.length) {
            case 0:
                stateText = 'in your subscribed regions';
                break;
            case 1:
                stateText = `in ${stateArray[0]}`;
                break;
            default:
                stateText = `in ${stateArray.slice(0, -1).join(', ')} and ${stateArray[stateArray.length - 1]}`;
        }
        
        const mailOptions = {
            from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Old Man Footy - Masters Carnival Notifications',
            html: this._buildWelcomeEmailHtml(stateText, stateArray, unsubscribeUrl)
        };

        return await this.sendEmail(mailOptions, 'Welcome');
    }

    /**
     * Send password reset email
     * @param {string} email - Recipient email
     * @param {string} resetToken - Password reset token
     * @param {string} firstName - User's first name
     * @returns {Object} Result object with success status
     */
    async sendPasswordResetEmail(email, resetToken, firstName) {
        const resetUrl = `${this._getBaseUrl()}/auth/reset-password/${resetToken}`;
        
        const mailOptions = {
            from: `"Old Man Footy" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request - Old Man Footy',
            html: this._buildPasswordResetEmailHtml(firstName, resetUrl)
        };

        const result = await this.sendEmail(mailOptions, 'Password Reset');
        if (result.success) {
            console.log(`✅ Password reset email sent to ${email}`);
        }
        return result;
    }

    /**
     * Build HTML for welcome email
     * @param {string} stateText - Text describing the states
     * @param {Array} stateArray - Array of states
     * @param {string} unsubscribeUrl - Unsubscribe URL
     * @returns {string} HTML content
     */
    _buildWelcomeEmailHtml(stateText, stateArray, unsubscribeUrl) {
        const carnivalsUrl = `${this._getBaseUrl()}/carnivals`;
        
        return `
            <div style="${this._getEmailContainerStyles()}">
                ${this._getEmailHeader()}
                
                <div style="${this._getEmailContentStyles()}">
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
                        ${this._createButton(carnivalsUrl, 'Browse Current Carnivals')}
                    </div>
                    
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        Together, we're building stronger rugby league communities across Australia!
                    </p>
                </div>
                
                ${this._getEmailFooter(`<a href="${unsubscribeUrl}" style="color: #ccc;">Unsubscribe from these notifications</a>`)}
            </div>
        `;
    }

    /**
     * Build HTML for password reset email
     * @param {string} firstName - User's first name
     * @param {string} resetUrl - Password reset URL
     * @returns {string} HTML content
     */
    _buildPasswordResetEmailHtml(firstName, resetUrl) {
        return `
            <div style="${this._getEmailContainerStyles()}">
                ${this._getEmailHeader()}
                
                <div style="${this._getEmailContentStyles()}">
                    <h2 style="color: #006837;">🔐 Password Reset Request</h2>
                    
                    <p>Hello <strong>${firstName}</strong>,</p>
                    
                    <p>We received a request to reset your password for your Old Man Footy account. If you made this request, please click the button below to reset your password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        ${this._createButton(resetUrl, 'Reset My Password')}
                    </div>
                    
                    ${this._createWarningBox(`
                        <h4 style="color: #856404; margin-top: 0;">Security Information</h4>
                        <ul style="color: #856404; margin: 10px 0 0 0;">
                            <li>This link will expire in 24 hours</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Your password will remain unchanged if you don't click the link</li>
                            <li>For security, this request was initiated by an administrator</li>
                        </ul>
                    `)}
                    
                    <p style="font-size: 14px; color: #666;">
                        If the button doesn't work, you can copy and paste this link into your browser:<br>
                        <a href="${resetUrl}" style="color: #006837;">${resetUrl}</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
                        If you have any questions, please contact our support team.
                    </p>
                </div>
                
                ${this._getEmailFooter()}
            </div>
        `;
    }
}

export default new AuthEmailService();