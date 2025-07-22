import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface) {
    // Add clubId column to carnivals table
    await queryInterface.addColumn('carnivals', 'clubId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'clubs', // fixed case
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'The club that is hosting or claimed this carnival',
    });

    // Data migration: Set clubId for existing carnivals based on createdByUserId
    // This uses a raw SQL update to join carnivals and users
    await queryInterface.sequelize.query(`
      UPDATE carnivals
      SET clubId = (
        SELECT clubId FROM users WHERE users.id = carnivals.createdByUserId
      )
      WHERE createdByUserId IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    // Remove clubId column from carnivals table
    await queryInterface.removeColumn('carnivals', 'clubId');
  },
};
