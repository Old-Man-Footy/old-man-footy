import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.mjs';

/**
 * ContactSubmission model for persisted contact form messages.
 */
class ContactSubmission extends Model {
  /**
   * Mark a support notification email as dispatched.
   * @param {object} dispatchResult
   * @param {string|null} dispatchResult.provider
   * @param {string|null} dispatchResult.messageId
   * @returns {Promise<ContactSubmission>}
   */
  async markEmailDispatched(dispatchResult = {}) {
    return this.update({
      emailDeliveryStatus: 'sent',
      emailProvider: dispatchResult.provider || null,
      emailProviderMessageId: dispatchResult.messageId || null,
      emailErrorMessage: null,
      lastEmailedAt: new Date(),
    });
  }

  /**
   * Mark a support notification email as blocked.
   * @param {string} reason
   * @returns {Promise<ContactSubmission>}
   */
  async markEmailBlocked(reason = 'Email delivery blocked by environment policy') {
    return this.update({
      emailDeliveryStatus: 'blocked',
      emailErrorMessage: reason,
    });
  }

  /**
   * Mark a support notification email as failed.
   * @param {string} errorMessage
   * @returns {Promise<ContactSubmission>}
   */
  async markEmailFailed(errorMessage) {
    return this.update({
      emailDeliveryStatus: 'failed',
      emailErrorMessage: errorMessage,
    });
  }
}

ContactSubmission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    subject: {
      type: DataTypes.STRING(32),
      allowNull: false,
      validate: {
        isIn: [['general', 'technical', 'carnival', 'delegate', 'registration', 'feedback', 'other']],
      },
    },
    clubName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    newsletterOptIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'new',
      validate: {
        isIn: [['new', 'in_progress', 'replied', 'closed', 'spam']],
      },
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'contact_form',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    emailDeliveryStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'sent', 'failed', 'blocked']],
      },
    },
    emailProvider: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    emailProviderMessageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    emailErrorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastEmailedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastRepliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastRepliedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ContactSubmission',
    tableName: 'contact_submissions',
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['submittedAt'] },
      { fields: ['email'] },
      { fields: ['emailDeliveryStatus'] },
      { fields: ['lastRepliedByUserId'] },
    ],
  }
);

export default ContactSubmission;
