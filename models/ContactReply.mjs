import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../config/database.mjs';

/**
 * ContactReply model for admin responses to contact submissions.
 */
class ContactReply extends Model {
  /**
   * Cleanup reply records older than retention period.
   * @param {number} retentionDays
   * @returns {Promise<number>}
   */
  static async cleanupOldReplies(retentionDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedCount = await this.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    console.log(`🧹 Cleaned up ${deletedCount} contact reply records older than ${retentionDays} days`);
    return deletedCount;
  }
}

ContactReply.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    contactSubmissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    repliedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    recipientEmail: {
      type: DataTypes.STRING(254),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    deliveryStatus: {
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
    deliveryError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ContactReply',
    tableName: 'contact_replies',
    timestamps: true,
    indexes: [{ fields: ['contactSubmissionId'] }, { fields: ['repliedByUserId'] }, { fields: ['createdAt'] }, { fields: ['sentAt'] }],
  }
);

export default ContactReply;
