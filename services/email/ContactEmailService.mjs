import { BaseEmailService } from './BaseEmailService.mjs';

/**
 * Contact Email Service Class
 * Handles contact forms and general communication emails
 */
export class ContactEmailService extends BaseEmailService {
    constructor() {
        super();
    }

    /**
     * Send contact form email to support team
     * @param {Object} contactData - Contact form data
     * @returns {Promise} Promise that resolves when email is sent
     */
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

        const subjectMapping = this._getSubjectMapping();
        const emailSubject = `Contact Form: ${subjectMapping[subject] || 'General Inquiry'} - ${firstName} ${lastName}`;

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@oldmanfooty.au',
            to: process.env.SUPPORT_EMAIL || 'support@oldmanfooty.au',
            replyTo: email,
            subject: emailSubject,
            text: this._buildContactFormTextContent(contactData, subjectMapping),
            html: this._buildContactFormHtmlContent(contactData, subjectMapping, emailSubject)
        };

        try {
            // Route through BaseEmailService to honor environment/site-mode email rules
            await this.sendEmail(mailOptions, 'Contact');
            console.log(`✅ Contact form email processed for ${email}`);
            
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
     * @returns {Promise} Promise that resolves when auto-reply is sent
     */
    async sendContactFormAutoReply(email, firstName, subject) {
        const subjectMapping = this._getSubjectMapping();
        const carnivalsUrl = `${this._getBaseUrl()}/carnivals`;
        const clubsUrl = `${this._getBaseUrl()}/clubs`;

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@oldmanfooty.au',
            to: email,
            subject: `Thank you for contacting Old Man Footy - ${subjectMapping[subject] || 'Your Inquiry'}`,
            text: this._buildAutoReplyTextContent(firstName, subject, subjectMapping, email, carnivalsUrl, clubsUrl),
            html: this._buildAutoReplyHtmlContent(firstName, subject, subjectMapping, email, carnivalsUrl, clubsUrl)
        };

        try {
            await this.sendEmail(mailOptions, 'Contact Auto-Reply');
            console.log(`✅ Contact form auto-reply processed for ${email}`);
        } catch (error) {
            console.error('❌ Error sending contact form auto-reply:', error);
            // Don't throw error here as it's not critical
        }
    }

    /**
     * Get subject mapping for contact form subjects
     * @returns {Object} Subject mapping
     */
    _getSubjectMapping() {
        return {
            'general': 'General Inquiry',
            'technical': 'Technical Support',
            'carnival': 'Carnival Information',
            'delegate': 'Club Delegate Support',
            'registration': 'Registration Help',
            'feedback': 'Feedback/Suggestions',
            'other': 'Other'
        };
    }

    /**
     * Build text content for contact form email
     * @param {Object} contactData - Contact form data
     * @param {Object} subjectMapping - Subject mapping
     * @returns {string} Text content
     */
    _buildContactFormTextContent(contactData, subjectMapping) {
        const { firstName, lastName, email, phone, subject, clubName, message, newsletter, userAgent, ipAddress } = contactData;
        
        return `
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
    }

    /**
     * Build HTML content for contact form email
     * @param {Object} contactData - Contact form data
     * @param {Object} subjectMapping - Subject mapping
     * @param {string} emailSubject - Email subject
     * @returns {string} HTML content
     */
    _buildContactFormHtmlContent(contactData, subjectMapping, emailSubject) {
        const { firstName, lastName, email, phone, subject, clubName, message, newsletter, userAgent, ipAddress } = contactData;
        
        return `
            <div style="${this._getEmailContainerStyles()}">
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
                        ${this._createButton(`mailto:${email}?subject=Re: ${encodeURIComponent(emailSubject)}`, `Reply to ${firstName}`)}
                    </div>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                    <p>This email was sent from the Old Man Footy contact form.</p>
                </div>
            </div>
        `;
    }

    /**
     * Build text content for auto-reply email
     * @param {string} firstName - User's first name
     * @param {string} subject - Contact subject
     * @param {Object} subjectMapping - Subject mapping
     * @param {string} email - User's email
     * @param {string} carnivalsUrl - Carnivals URL
     * @param {string} clubsUrl - Clubs URL
     * @returns {string} Text content
     */
    _buildAutoReplyTextContent(firstName, subject, subjectMapping, email, carnivalsUrl, clubsUrl) {
        return `
Hi ${firstName},

Thank you for reaching out to the Old Man Footy team regarding your ${subjectMapping[subject] || 'inquiry'}.

What happens next?
- We've received your message and it's been forwarded to the appropriate team member
- We typically respond to inquiries within 1-2 business days
- You'll receive a response at this email address: ${email}
- If your inquiry is urgent, you can also email us directly at support@oldmanfooty.au

While you wait, feel free to explore more of what Old Man Footy has to offer:
- Browse Carnivals: ${carnivalsUrl}
- Find Clubs: ${clubsUrl}

This is an automated response. Please do not reply to this email. 
We'll respond to your inquiry from our support team shortly.

© ${new Date().getFullYear()} Old Man Footy. All rights reserved.
        `;
    }

    /**
     * Build HTML content for auto-reply email
     * @param {string} firstName - User's first name
     * @param {string} subject - Contact subject
     * @param {Object} subjectMapping - Subject mapping
     * @param {string} email - User's email
     * @param {string} carnivalsUrl - Carnivals URL
     * @param {string} clubsUrl - Clubs URL
     * @returns {string} HTML content
     */
    _buildAutoReplyHtmlContent(firstName, subject, subjectMapping, email, carnivalsUrl, clubsUrl) {
        return `
            <div style="${this._getEmailContainerStyles()}">
                <div style="background: #006837; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Thank You for Contacting Us</h1>
                </div>
                
                <div style="${this._getEmailContentStyles()}">
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
                            ${this._createButton(carnivalsUrl, 'Browse Carnivals')}
                            ${this._createButton(clubsUrl, 'Find Clubs')}
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
    }
}

export default new ContactEmailService();