/**
 * ImageUpload Model - SQLite/Sequelize Implementation
 * 
 * Manages gallery images associated with carnivals and clubs.
 * Supports multiple images per carnival/club with attribution.
 */

import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../config/database.mjs';

/**
 * ImageUpload model class extending Sequelize Model
 */
class ImageUpload extends Model {
  /**
   * Get the public URL for this image
   * Supports both legacy URL field and new file-based uploads
   * @returns {string} Public URL to access the image
   */
  get publicUrl() {
    if (this.url) {
      // Legacy URL-based image
      return this.url;
    } else if (this.path) {
      // File-based upload - convert server path to public URL
      const publicPath = this.path.replace(/^.*[\/\\]public[\/\\]/, '/');
      return publicPath.replace(/\\/g, '/'); // Normalize path separators
    }
    return null;
  }

  /**
   * Check if this is a file-based upload (vs URL-based)
   * @returns {boolean} True if this uses file tracking fields
   */
  get isFileUpload() {
    return !!(this.filename && this.path);
  }
  /**
   * Check if this image belongs to a carnival
   * @returns {boolean} True if carnivalId is set
   */
  get belongsToCarnival() {
    return this.carnivalId !== null;
  }

  /**
   * Check if this image belongs to a club
   * @returns {boolean} True if clubId is set
   */
  get belongsToClub() {
    return this.clubId !== null;
  }

  /**
   * Get display attribution text
   * @returns {string} Attribution text or default message
   */
  get displayAttribution() {
    return this.attribution || 'Photo courtesy of carnival organisers';
  }

  /**
   * Get images for carousel display (carnival images only)
   * @returns {Promise<Array>} Array of carousel images with carnival info
   */
  static async getCarouselImages() {
    const Carnival = (await import('./Carnival.mjs')).default;
    
    return await this.findAll({
      where: {
        carnivalId: {
          [sequelize.Sequelize.Op.ne]: null
        }
      },
      include: [{
        model: Carnival,
        as: 'carnival',
        attributes: ['id', 'title', 'date', 'isActive'],
        where: {
          isActive: true
        }
      }],
      order: [['createdAt', 'DESC']],
      limit: 10 // Limit for carousel performance
    });
  }

  /**
   * Get images for a specific carnival
   * @param {number} carnivalId - Carnival ID
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Images per page (default: 12)
   * @returns {Promise<Object>} Object with images array and pagination info
   */
  static async getCarnivalImages(carnivalId, options = {}) {
    if (!carnivalId) return { images: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
    
    const { page = 1, limit = 12 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await this.findAndCountAll({
      where: {
        carnivalId: carnivalId
      },
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset
    });

    const totalPages = Math.ceil(count / limit);

    return {
      images: rows,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get images for a specific club
   * @param {number} clubId - Club ID
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Images per page (default: 12)
   * @returns {Promise<Object>} Object with images array and pagination info
   */
  static async getClubImages(clubId, options = {}) {
    if (!clubId) return { images: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
    
    const { page = 1, limit = 12 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await this.findAndCountAll({
      where: {
        clubId: clubId
      },
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset
    });

    const totalPages = Math.ceil(count / limit);

    return {
      images: rows,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Check if user can upload images for a carnival
   * @param {Object} user - User object
   * @param {number} carnivalId - Carnival ID
   * @returns {Promise<boolean>} Upload permission status
   */
  static async canUserUploadForCarnival(user, carnivalId) {
    if (!user || !user.clubId || !carnivalId) return false;
    
    // Admin users can upload for any carnival
    if (user.isAdmin) return true;
    
    // Check if user's club is associated with the carnival
    const CarnivalClub = (await import('./CarnivalClub.mjs')).default;
    const association = await CarnivalClub.findOne({
      where: {
        carnivalId: carnivalId,
        clubId: user.clubId,
        isActive: true
      }
    });
    
    return !!association;
  }

  /**
   * Check if user can upload images for their club
   * @param {Object} user - User object
   * @param {number} clubId - Club ID
   * @returns {boolean} Upload permission status
   */
  static canUserUploadForClub(user, clubId) {
    if (!user || !user.clubId || !clubId) return false;
    
    // Admin users can upload for any club
    if (user.isAdmin) return true;
    
    // Users can only upload for their own club
    return user.clubId === clubId;
  }

  /**
   * Create a new image upload with validation
   * @param {Object} imageData - Image data
   * @param {Object} user - User creating the image
   * @returns {Promise<Object>} Result with success status and image or error
   */
  static async createImageUpload(imageData, user) {
    try {
      const { url, attribution, carnivalId, clubId } = imageData;
      
      // Validate required data
      if (!url) {
        throw new Error('Image URL is required');
      }
      
      if (!user) {
        throw new Error('User authentication required');
      }
      
      // Validate that image belongs to either carnival or club (but not both)
      if (carnivalId && clubId) {
        throw new Error('Image cannot belong to both a carnival and a club');
      }
      
      if (!carnivalId && !clubId) {
        throw new Error('Image must belong to either a carnival or a club');
      }
      
      // Check permissions
      if (carnivalId) {
        const canUpload = await this.canUserUploadForCarnival(user, carnivalId);
        if (!canUpload) {
          throw new Error('You do not have permission to upload images for this carnival');
        }
      }
      
      if (clubId) {
        const canUpload = this.canUserUploadForClub(user, clubId);
        if (!canUpload) {
          throw new Error('You do not have permission to upload images for this club');
        }
      }
      
      // Create the image upload
      const imageUpload = await this.create({
        url: url.trim(),
        attribution: attribution ? attribution.trim() : null,
        carnivalId: carnivalId || null,
        clubId: clubId || null
      });
      
      return {
        success: true,
        message: 'Image uploaded successfully',
        image: imageUpload
      };
      
    } catch (error) {
      console.error('Failed to create image upload:', error.message);
      
      return {
        success: false,
        message: error.message || 'Failed to upload image'
      };
    }
  }
}

/**
 * Initialize ImageUpload model with schema definition
 */
ImageUpload.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: true, // Now nullable for file-based uploads
    validate: {
      isUrl: {
        msg: 'URL must be a valid URL format'
      },
      urlOrFileRequired(value) {
        // Either URL or file fields must be present
        if (!value && !this.filename) {
          throw new Error('Either URL or file upload information must be provided');
        }
      }
    },
    set(value) {
      this.setDataValue('url', value ? value.trim() : value);
    }
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Original filename when uploaded'
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Generated filename on server'
  },
  path: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Full file path on server'
  },
  mimetype: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'MIME type of uploaded file',
    validate: {
      isImageMimetype(value) {
        if (value && !value.startsWith('image/')) {
          throw new Error('File must be an image');
        }
      }
    }
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in bytes',
    validate: {
      min: 0
    }
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who uploaded the image'
  },
  attribution: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      this.setDataValue('attribution', value ? value.trim() : value);
    }
  },
  carnivalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Carnivals',
      key: 'id'
    }
  },
  clubId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Clubs',
      key: 'id'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'ImageUpload',
  tableName: 'image_uploads',
  timestamps: true,
  indexes: [
    {
      fields: ['carnivalId']
    },
    {
      fields: ['clubId']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['uploadedBy']
    },
    {
      fields: ['filename'],
      unique: true,
      where: {
        filename: {
          [Op.ne]: null
        }
      }
    }
  ],
  validate: {
    // Ensure image belongs to either carnival or club, but not both or neither
    belongsToEitherCarnivalOrClub() {
      const hasCarnival = this.carnivalId !== null;
      const hasClub = this.clubId !== null;
      
      if (hasCarnival && hasClub) {
        throw new Error('Image cannot belong to both a carnival and a club');
      }
      
      if (!hasCarnival && !hasClub) {
        throw new Error('Image must belong to either a carnival or a club');
      }
    }
  }
});

export default ImageUpload;
