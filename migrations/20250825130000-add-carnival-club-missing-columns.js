'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
    // Add registrationNotes column to carnival_clubs table
    await queryInterface.addColumn('carnival_clubs', 'registrationNotes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Additional notes provided during club registration for carnival'
    });

    // Add additional missing columns that might be needed
    try {
      await queryInterface.addColumn('carnival_clubs', 'paymentAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Payment amount for carnival registration'
      });
    } catch (error) {
      // Column might already exist, ignore
      console.log('paymentAmount column might already exist:', error.message);
    }

    try {
      await queryInterface.addColumn('carnival_clubs', 'paymentDate', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date when payment was received'
      });
    } catch (error) {
      // Column might already exist, ignore
      console.log('paymentDate column might already exist:', error.message);
    }

    try {
      await queryInterface.addColumn('carnival_clubs', 'displayOrder', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 999,
        comment: 'Display order for club listings'
      });
    } catch (error) {
      // Column might already exist, ignore
      console.log('displayOrder column might already exist:', error.message);
    }

    try {
      await queryInterface.addColumn('carnival_clubs', 'approvedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when registration was approved'
      });
    } catch (error) {
      // Column might already exist, ignore
      console.log('approvedAt column might already exist:', error.message);
    }

    try {
      await queryInterface.addColumn('carnival_clubs', 'approvedByUserId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who approved the registration'
      });
    } catch (error) {
      // Column might already exist, ignore
      console.log('approvedByUserId column might already exist:', error.message);
    }
};

export const down = async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('carnival_clubs', 'approvedByUserId');
    await queryInterface.removeColumn('carnival_clubs', 'approvedAt');
    await queryInterface.removeColumn('carnival_clubs', 'displayOrder');
    await queryInterface.removeColumn('carnival_clubs', 'paymentDate');
    await queryInterface.removeColumn('carnival_clubs', 'paymentAmount');
    await queryInterface.removeColumn('carnival_clubs', 'registrationNotes');
};
