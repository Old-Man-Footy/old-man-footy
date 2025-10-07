export const up = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('carnivals', 'additionalImages');  
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('carnivals', 'additionalImages', {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Additional images for this carnival'
  });  
};