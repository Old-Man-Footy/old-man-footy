'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('carnivals', 'locationAddressPart1', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('carnivals', 'locationAddressPart2', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('carnivals', 'locationAddressPart3', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('carnivals', 'locationAddressPart4', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('carnivals', 'locationAddressPart1');
    await queryInterface.removeColumn('carnivals', 'locationAddressPart2');
    await queryInterface.removeColumn('carnivals', 'locationAddressPart3');
    await queryInterface.removeColumn('carnivals', 'locationAddressPart4');
  }
};