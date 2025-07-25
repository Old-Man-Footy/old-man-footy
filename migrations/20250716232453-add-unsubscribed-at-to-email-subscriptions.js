/**
 * Migration: Add unsubscribedAt field to email_subscriptions table
 * 
 * This migration adds a timestamp field to track when users unsubscribe
 * from email notifications, supporting audit trail and data integrity.
 */

export async function up(queryInterface, Sequelize) {
  /**
   * Add unsubscribedAt timestamp field to email_subscriptions table
   * This field tracks when a user unsubscribed from email notifications
   */
  await queryInterface.addColumn('email_subscriptions', 'unsubscribedAt', {
    type: Sequelize.DATE,
    allowNull: true,
    comment: 'Timestamp when the user unsubscribed from email notifications'
  });
}

export async function down(queryInterface, Sequelize) {
  /**
   * Remove the unsubscribedAt column if rolling back
   */
  await queryInterface.removeColumn('email_subscriptions', 'unsubscribedAt');
}
