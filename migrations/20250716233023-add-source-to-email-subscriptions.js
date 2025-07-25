'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  /**
   * Add altering commands here.
   *
   * Example:
   * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
   */
  await queryInterface.addColumn('email_subscriptions', 'source', {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: 'homepage',
    comment: 'Source of the subscription (e.g., homepage, contact_form, admin)'
  });
};

export const down = async (queryInterface, Sequelize) => {
  /**
   * Add reverting commands here.
   *
   * Example:
   * await queryInterface.dropTable('users');
   */
  await queryInterface.removeColumn('email_subscriptions', 'source');
};
