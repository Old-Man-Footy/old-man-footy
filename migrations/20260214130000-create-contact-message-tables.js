'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('contact_submissions', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    firstName: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    lastName: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    email: {
      type: Sequelize.STRING(254),
      allowNull: false
    },
    phone: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    subject: {
      type: Sequelize.STRING(32),
      allowNull: false
    },
    clubName: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    newsletterOptIn: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'new'
    },
    source: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'contact_form'
    },
    ipAddress: {
      type: Sequelize.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    submittedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    emailDeliveryStatus: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    emailProvider: {
      type: Sequelize.STRING(30),
      allowNull: true
    },
    emailProviderMessageId: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    emailErrorMessage: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    lastEmailedAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    lastRepliedAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    lastRepliedByUserId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    closedAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.createTable('contact_replies', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    contactSubmissionId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'contact_submissions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    repliedByUserId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    recipientEmail: {
      type: Sequelize.STRING(254),
      allowNull: false
    },
    subject: {
      type: Sequelize.STRING(200),
      allowNull: false
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    deliveryStatus: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    emailProvider: {
      type: Sequelize.STRING(30),
      allowNull: true
    },
    emailProviderMessageId: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    deliveryError: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    sentAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('contact_submissions', ['status'], { name: 'contact_submissions_status_index' });
  await queryInterface.addIndex('contact_submissions', ['submittedAt'], { name: 'contact_submissions_submitted_at_index' });
  await queryInterface.addIndex('contact_submissions', ['email'], { name: 'contact_submissions_email_index' });
  await queryInterface.addIndex('contact_submissions', ['emailDeliveryStatus'], { name: 'contact_submissions_email_delivery_status_index' });
  await queryInterface.addIndex('contact_submissions', ['lastRepliedByUserId'], { name: 'contact_submissions_last_replied_by_user_id_index' });

  await queryInterface.addIndex('contact_replies', ['contactSubmissionId'], { name: 'contact_replies_submission_id_index' });
  await queryInterface.addIndex('contact_replies', ['repliedByUserId'], { name: 'contact_replies_replied_by_user_id_index' });
  await queryInterface.addIndex('contact_replies', ['createdAt'], { name: 'contact_replies_created_at_index' });
  await queryInterface.addIndex('contact_replies', ['sentAt'], { name: 'contact_replies_sent_at_index' });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('contact_replies');
  await queryInterface.dropTable('contact_submissions');
};
