/**
 * @file HelpContent.mjs
 * @description Sequelize model for contextual help content.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.mjs';

/**
 * HelpContent model
 * Stores help information for each page, identified by a unique pageIdentifier.
 */
const HelpContent = sequelize.define('HelpContent', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  pageIdentifier: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      is: /^[a-zA-Z0-9_-]+$/,
    },
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'help_content',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['pageIdentifier'],
      name: 'IX_help_content_page_identifier',
    },
  ],
});

export default HelpContent;
