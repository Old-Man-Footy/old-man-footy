import { BaseEmailService } from './BaseEmailService.mjs';

/**
 * Security Email Service Class
 * Handles all security-related emails and alerts
 */
export class SecurityEmailService extends BaseEmailService {
    constructor() {
        super();
    }

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
        const fraudReportUrl = `${this._getBaseUrl()}/report-fraud?club=${encodeURIComponent(clubName)}&newDelegate=${encodeURIComponent(newDelegateEmail)}`;
        const clubUrl = `${this._getBaseUrl()}/clubs/${encodeURIComponent(clubName)}`;

        const mailOptions = {
            from: `"Old Man Footy Security" <${process.env.EMAIL_USER}>`,
            to: originalDelegateEmail,
            subject: `🚨 SECURITY ALERT: ${clubName} has been reactivated`,
            html: this._buildClubReactivationAlertHtml(
                originalDelegateName,
                clubName,
                newDelegateName,
                newDelegateEmail,
                fraudReportUrl,
                clubUrl
            )
        };

        const result = await this.sendEmail(mailOptions, 'Club Reactivation Alert');
        if (result.success) {
            console.log(`🚨 Club reactivation alert sent to original delegate: ${originalDelegateEmail}`);
        }
        return result;
    }

    /**
     * Build HTML for club reactivation alert email
     * @param {string} originalDelegateName - Name of original delegate
     * @param {string} clubName - Club name
     * @param {string} newDelegateName - Name of new delegate
     * @param {string} newDelegateEmail - Email of new delegate
     * @param {string} fraudReportUrl - URL to report fraud
     * @param {string} clubUrl - URL to club page
     * @returns {string} HTML content
     */
    _buildClubReactivationAlertHtml(originalDelegateName, clubName, newDelegateName, newDelegateEmail, fraudReportUrl, clubUrl) {
        return `
            <div style="${this._getEmailContainerStyles()}">
                <div style="background: linear-gradient(135deg, #dc3545, #ff6b6b); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🚨 SECURITY ALERT</h1>
                    <p style="color: white; margin: 5px 0 0 0; font-weight: bold;">Old Man Footy - Club Reactivation Notice</p>
                </div>
                
                <div style="${this._getEmailContentStyles()}">
                    <h2 style="color: #dc3545; margin-top: 0;">Club Reactivation Alert</h2>
                    
                    <p>Hello <strong>${originalDelegateName}</strong>,</p>
                    
                    ${this._createWarningBox(`
                        <p style="margin: 0; color: #856404; font-weight: bold;">
                            ⚠️ Your deactivated club <strong>${clubName}</strong> has been reactivated by someone else.
                        </p>
                    `)}
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #dc3545;">
                        <h3 style="color: #dc3545; margin-top: 0;">Reactivation Details</h3>
                        <p><strong>Club:</strong> ${clubName}</p>
                        <p><strong>Reactivated by:</strong> ${newDelegateName}</p>
                        <p><strong>New Delegate Email:</strong> ${newDelegateEmail}</p>
                        <p><strong>Date:</strong> ${this._formatDateTime(new Date())}</p>
                    </div>
                    
                    <h3 style="color: #dc3545;">What does this mean?</h3>
                    <ul style="line-height: 1.6;">
                        <li><strong>${newDelegateName}</strong> has registered and claimed your deactivated club</li>
                        <li>They are now the primary delegate with full administrative control</li>
                        <li>They can create carnivals, manage club information, and invite other delegates</li>
                        <li>Your previous delegate access has been superseded</li>
                    </ul>
                    
                    ${this._createSuccessBox(`
                        <h4 style="color: #155724; margin-top: 0;">✅ If this was legitimate:</h4>
                        <p style="margin: 0; color: #155724;">
                            If you know ${newDelegateName} and expected them to take over the club, 
                            no action is required. You can contact them directly to discuss access or collaboration.
                        </p>
                    `)}
                    
                    ${this._createErrorBox(`
                        <h4 style="color: #721c24; margin-top: 0;">🚨 If this was unauthorized:</h4>
                        <p style="margin: 0; color: #721c24;">
                            If you don't recognize ${newDelegateName} or believe this reactivation was fraudulent, 
                            please report it immediately using the button below.
                        </p>
                    `)}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        ${this._createButton(fraudReportUrl, '🚨 Report as Fraudulent', '#dc3545')}
                        ${this._createButton(clubUrl, '👀 View Club Page', '#6c757d')}
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
                
                ${this._getEmailFooter('This is an automated security alert. For support, email security@oldmanfooty.au')}
            </div>
        `;
    }
}

export default new SecurityEmailService();