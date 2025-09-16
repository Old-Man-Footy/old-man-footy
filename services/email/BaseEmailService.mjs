import { createTransport } from 'nodemailer';

/**
 * Base Email Service Class
 * Provides core email functionality and utilities for all email services
 */
export class BaseEmailService {
    constructor() {
        this.transporter = createTransport({
            // Gmail configuration (can be switched to other providers)
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    /**
     * Check if emails should be sent based on site mode and configuration
     * @returns {boolean} True if emails can be sent, false otherwise
     */
    _canSendEmails() {
        // Don't send emails in test environment
        if (process.env.NODE_ENV === 'test') {
            console.log(`📧 Email sending disabled: ${process.env.NODE_ENV} environment`);
            return false;
        }

        // Check if email notifications feature flag is enabled
        if (process.env.FEATURE_EMAIL_NOTIFICATIONS !== 'true') {
            console.log('📧 Email sending disabled: Email notifications feature is off')
            return false
        };

        // Check if all required email environment variables are set
        const requiredEmailVars = ['EMAIL_FROM_NAME', 'EMAIL_FROM', 'EMAIL_PASSWORD', 'EMAIL_SERVICE', 'EMAIL_USER'];
        for (const varName of requiredEmailVars) {
            if (!process.env[varName] || process.env[varName].trim() === '') {
                console.log(`📧 Email sending disabled: Required environment variable ${varName} is not set`);
                return false;
            }
        }

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

    /**
     * Get the standard email header HTML
     * @returns {string} HTML for email header
     */
    _getEmailHeader() {
        return `
            <div style="background: linear-gradient(135deg, #006837, #FFD700); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Old Man Footy</h1>
                <p style="color: white; margin: 5px 0 0 0;">Masters Rugby League Carnivals Australia</p>
            </div>
        `;
    }

    /**
     * Get the standard email footer HTML
     * @param {string} additionalText - Additional text for the footer
     * @returns {string} HTML for email footer
     */
    _getEmailFooter(additionalText = '') {
        return `
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p>© 2025 Old Man Footy. Connecting Masters Rugby League Communities Across Australia.</p>
                ${additionalText ? `<p>${additionalText}</p>` : ''}
            </div>
        `;
    }

    /**
     * Get standard email container styles
     * @returns {string} CSS styles for email container
     */
    _getEmailContainerStyles() {
        return 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;';
    }

    /**
     * Get standard email content styles
     * @returns {string} CSS styles for email content
     */
    _getEmailContentStyles() {
        return 'padding: 30px; background: #f9f9f9;';
    }

    /**
     * Create a standard email button
     * @param {string} url - Button URL
     * @param {string} text - Button text
     * @param {string} backgroundColor - Button background color (default: #006837)
     * @param {string} textColor - Button text color (default: white)
     * @returns {string} HTML for button
     */
    _createButton(url, text, backgroundColor = '#006837', textColor = 'white') {
        return `
            <a href="${url}" 
               style="background: ${backgroundColor}; color: ${textColor}; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                ${text}
            </a>
        `;
    }

    /**
     * Create an info box for emails
     * @param {string} content - HTML content for the box
     * @param {string} borderColor - Border color (default: #006837)
     * @param {string} backgroundColor - Background color (default: #e8f5e8)
     * @returns {string} HTML for info box
     */
    _createInfoBox(content, borderColor = '#006837', backgroundColor = '#e8f5e8') {
        return `
            <div style="background: ${backgroundColor}; border-left: 4px solid ${borderColor}; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                ${content}
            </div>
        `;
    }

    /**
     * Create a warning box for emails
     * @param {string} content - HTML content for the box
     * @returns {string} HTML for warning box
     */
    _createWarningBox(content) {
        return this._createInfoBox(content, '#ffc107', '#fff3cd');
    }

    /**
     * Create an error box for emails
     * @param {string} content - HTML content for the box
     * @returns {string} HTML for error box
     */
    _createErrorBox(content) {
        return this._createInfoBox(content, '#dc3545', '#f8d7da');
    }

    /**
     * Create a success box for emails
     * @param {string} content - HTML content for the box
     * @returns {string} HTML for success box
     */
    _createSuccessBox(content) {
        return this._createInfoBox(content, '#28a745', '#d4edda');
    }

    /**
     * Format date for display in emails
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    _formatDate(date) {
        return date.toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    /**
     * Format date and time for display in emails
     * @param {Date} date - Date to format
     * @returns {string} Formatted date and time string
     */
    _formatDateTime(date) {
        return date.toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Australia/Sydney'
        }) + ' AEDT';
    }

    /**
     * Add standard unsubscribe headers to mail options
     * @param {Object} mailOptions - Nodemailer mail options
     * @param {string} unsubscribeToken - Unsubscribe token for the recipient
     * @returns {Object} Enhanced mail options with unsubscribe headers
     */
    _addUnsubscribeHeaders(mailOptions, unsubscribeToken) {
        if (!unsubscribeToken) {
            return mailOptions;
        }

        const unsubscribeUrl = `${this._getBaseUrl()}/unsubscribe?token=${unsubscribeToken}`;
        
        // Add List-Unsubscribe header for email clients
        mailOptions.headers = {
            ...mailOptions.headers,
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        };

        return mailOptions;
    }

    /**
     * Get the base URL for the application
     * @returns {string} Base URL
     * @private
     */
    _getBaseUrl() {
        const { NODE_ENV, BASE_URL } = process.env;
        
        if (BASE_URL) {
            return BASE_URL;
        }
        
        // Fallback URLs based on environment
        if (NODE_ENV === 'production') {
            return 'https://oldmanfooty.com';
        } else if (NODE_ENV === 'test' || NODE_ENV === 'e2e') {
            return 'http://localhost:3055';
        } else {
            return 'http://localhost:3000';
        }
    }

    /**
     * Send an email with mode checking
     * @param {Object} mailOptions - Nodemailer mail options
     * @param {string} emailType - Type of email for logging
     * @returns {Object} Result object with success status
     */
    async sendEmail(mailOptions, emailType = 'email') {
        try {
            // Check if emails can be sent
            if (!this._canSendEmails()) {
                this._logBlockedEmail(emailType, mailOptions.to, mailOptions.subject);
                return { 
                    success: false, 
                    message: 'Email sending is disabled in the current site mode',
                    blocked: true 
                };
            }

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`${emailType} email sent successfully:`, result.messageId);
            return { 
                success: true, 
                messageId: result.messageId 
            };
        } catch (error) {
            console.error(`Failed to send ${emailType} email:`, error);
            throw error;
        }
    }

    /**
     * Test email configuration
     * @returns {Object} Result object with success status
     */
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

export default BaseEmailService;