'use strict';

/**
 * Migration: Create ImageUpload table
 * 
 * Creates a new table to support 1:N image uploads for carnivals and clubs.
 * This allows multiple gallery images to be associated with carnivals or clubs
 * while maintaining the existing logo functionality.
 */

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('image_uploads', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    url: {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'The URL where the image is stored'
    },
    attribution: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Photographer or business name attribution'
    },
    carnivalId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'carnivals',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'References the carnival this image belongs to'
    },
    clubId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'clubs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'References the club this image belongs to'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("datetime('now', 'localtime')")
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("datetime('now', 'localtime')")
    }
  });

  // Add indexes for better query performance
  await queryInterface.addIndex('image_uploads', ['carnivalId'], {
    name: 'idx_image_uploads_carnival_id'
  });

  await queryInterface.addIndex('image_uploads', ['clubId'], {
    name: 'idx_image_uploads_club_id'
  });

  // Add a constraint to ensure an image belongs to either a carnival OR a club, but not both or neither
  await queryInterface.addConstraint('image_uploads', {
    fields: ['carnivalId', 'clubId'],
    type: 'check',
    name: 'chk_image_upload_belongs_to_carnival_or_club',
    where: {
      [Sequelize.Op.or]: [
        {
          [Sequelize.Op.and]: [
            { carnivalId: { [Sequelize.Op.ne]: null } },
            { clubId: { [Sequelize.Op.is]: null } }
          ]
        },
        {
          [Sequelize.Op.and]: [
            { carnivalId: { [Sequelize.Op.is]: null } },
            { clubId: { [Sequelize.Op.ne]: null } }
          ]
        }
      ]
    }
  });
};

/** @type {import('sequelize-cli').Migration} */
export const down = async (queryInterface, Sequelize) => {
  // Remove the constraint first
  await queryInterface.removeConstraint('image_uploads', 'chk_image_upload_belongs_to_carnival_or_club');
  
  // Remove indexes
  await queryInterface.removeIndex('image_uploads', 'idx_image_uploads_carnival_id');
  await queryInterface.removeIndex('image_uploads', 'idx_image_uploads_club_id');
  
  // Drop the table
  await queryInterface.dropTable('image_uploads');
};
