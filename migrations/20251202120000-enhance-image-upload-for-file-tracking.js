'use strict';

/**
 * Migration: Enhance ImageUpload table for file tracking
 * 
 * Adds file tracking fields to support local file uploads instead of just URLs.
 * This migration transforms the ImageUpload model from URL-based to file-based
 * to support the gallery upload refactor functionality.
 */

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  // Add file tracking columns
  await queryInterface.addColumn('image_uploads', 'originalName', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Original filename when uploaded'
  });

  await queryInterface.addColumn('image_uploads', 'filename', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Generated filename on server'
  });

  await queryInterface.addColumn('image_uploads', 'path', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Full file path on server'
  });

  await queryInterface.addColumn('image_uploads', 'mimetype', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'MIME type of uploaded file'
  });

  await queryInterface.addColumn('image_uploads', 'size', {
    type: Sequelize.INTEGER,
    allowNull: true,
    comment: 'File size in bytes'
  });

  await queryInterface.addColumn('image_uploads', 'uploadedBy', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'User who uploaded the image'
  });

  // Add index for uploaded by user
  await queryInterface.addIndex('image_uploads', ['uploadedBy'], {
    name: 'idx_image_uploads_uploaded_by'
  });

  // Note: We keep the 'url' field for backward compatibility
  // New uploads will use file fields, existing records can keep URLs
};

/** @type {import('sequelize-cli').Migration} */
export const down = async (queryInterface, Sequelize) => {
  // Remove index
  await queryInterface.removeIndex('image_uploads', 'idx_image_uploads_uploaded_by');
  
  // Remove added columns
  await queryInterface.removeColumn('image_uploads', 'uploadedBy');
  await queryInterface.removeColumn('image_uploads', 'size');
  await queryInterface.removeColumn('image_uploads', 'mimetype');
  await queryInterface.removeColumn('image_uploads', 'path');
  await queryInterface.removeColumn('image_uploads', 'filename');
  await queryInterface.removeColumn('image_uploads', 'originalName');
};
