/**
 * @file HelpContent.mjs
 * @description Sequelize model for contextual help content.
 */
import { DataTypes } from 'sequelize';
import sequelize from './index.mjs';

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
  tableName: 'HelpContent',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['pageIdentifier'],
    },
  ],
});

export default HelpContent;
