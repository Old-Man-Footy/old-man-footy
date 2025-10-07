export const up = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('carnivals', 'drawFiles');  
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('carnivals', 'drawFiles', {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Multiple draw files for this carnival'
  });  
};