/**
 * Migration: Create HelpContent table
 * @description Creates the HelpContent table for contextual help popups.
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('HelpContent', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    pageIdentifier: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });
  await queryInterface.addIndex('HelpContent', ['pageIdentifier'], {
    unique: true,
    name: 'IX_HelpContent_PageIdentifier',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('HelpContent');
}
