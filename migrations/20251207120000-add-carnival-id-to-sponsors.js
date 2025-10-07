'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
    // Add carnivalId field to sponsors table
    await queryInterface.addColumn('sponsors', 'carnivalId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'carnivals',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'The carnival that owns this sponsor'
    });

    // Add index for carnivalId
    await queryInterface.addIndex('sponsors', ['carnivalId'], {
      name: 'sponsors_carnival_id_index'
    });

    // Add constraint to ensure either clubId OR carnivalId is set, but not both
    await queryInterface.addConstraint('sponsors', {
      fields: ['clubId', 'carnivalId'],
      type: 'check',
      name: 'sponsors_exclusive_owner_check',
      where: {
        [Sequelize.Op.or]: [
          {
            [Sequelize.Op.and]: [
              { clubId: { [Sequelize.Op.ne]: null } },
              { carnivalId: { [Sequelize.Op.eq]: null } }
            ]
          },
          {
            [Sequelize.Op.and]: [
              { clubId: { [Sequelize.Op.eq]: null } },
              { carnivalId: { [Sequelize.Op.ne]: null } }
            ]
          }
        ]
      }
    });
  };

export const down = async (queryInterface, Sequelize) => {
  // Remove constraint
  await queryInterface.removeConstraint('sponsors', 'sponsors_exclusive_owner_check');
  
  // Remove index
  await queryInterface.removeIndex('sponsors', 'sponsors_carnival_id_index');
  
  // Remove carnivalId column
  await queryInterface.removeColumn('sponsors', 'carnivalId');
};
