/**
 * ImageUploadService - Handle file uploads for carnival and club galleries
 * 
 * Provides secure image upload functionality with proper validation,
 * permission checks, and file management using standardized entity-folder structure.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import ImageUpload from '../models/ImageUpload.mjs';

class ImageUploadService {
  /**
   * Allowed image MIME types
   */
  static ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];

  /**
   * Maximum file size in bytes (5MB)
   */
  static MAX_FILE_SIZE = 5 * 1024 * 1024;

  /**
   * Determine the appropriate upload directory based on upload data
   * @param {Object} uploadData - Upload metadata (carnivalId, clubId, imageType)
   * @returns {string} Entity-based directory path
   */
  static getUploadDirectory(uploadData) {
    const { carnivalId, clubId, imageType = 'gallery' } = uploadData;
    
    if (carnivalId && !clubId) {
      // Carnival image: carnivals/{id}/{imageType}/
      return `public/uploads/carnivals/${carnivalId}/${imageType}`;
    } else if (clubId) {
      // Club image: clubs/{id}/{imageType}/
      return `public/uploads/clubs/${clubId}/${imageType}`;
    }
    
    // Default to carnival gallery if unclear
    return `public/uploads/carnivals/${carnivalId || 'unknown'}/gallery`;
  }

  /**
   * Ensure upload directory exists
   * @param {string} uploadDir - Directory path to ensure exists
   */
  static async ensureUploadDir(uploadDir) {
    const uploadPath = path.join(process.cwd(), uploadDir);
    
    try {
      await fs.access(uploadPath);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(uploadPath, { recursive: true });
      console.log(`📁 Created upload directory: ${uploadPath}`);
    }
    
    return uploadPath;
  }

  /**
   * Generate unique filename for uploaded image
   * @param {string} originalName - Original filename
   * @returns {string} Unique filename
   */
  static generateUniqueFilename(originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString('hex');
    
    return `gallery_${timestamp}_${randomHash}${ext}`;
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Uploaded file object
   * @returns {Object} Validation result
   */
  static validateFile(file) {
    if (!file) {
      return {
        valid: false,
        error: 'No file provided'
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB`
      };
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * Process and save uploaded image
   * @param {Object} file - Uploaded file object
   * @param {Object} uploadData - Upload metadata (carnivalId, clubId, attribution, imageType)
   * @param {Object} user - User uploading the image
   * @returns {Promise<Object>} Upload result
   */
  static async processUpload(file, uploadData, user) {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error
        };
      }

      // Determine the appropriate upload directory
      const uploadDirectory = this.getUploadDirectory(uploadData);

      // Ensure upload directory exists
      const uploadDir = await this.ensureUploadDir(uploadDirectory);

      // Generate unique filename
      const uniqueFilename = this.generateUniqueFilename(file.originalname);
      const filePath = path.join(uploadDir, uniqueFilename);

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Generate URL for the uploaded file - need to remove 'public/' prefix
      const urlPath = uploadDirectory.replace('public/', '');
      const fileUrl = `/${urlPath}/${uniqueFilename}`;

      // Create database record
      const imageUploadResult = await ImageUpload.createImageUpload({
        url: fileUrl,
        attribution: uploadData.attribution,
        carnivalId: uploadData.carnivalId,
        clubId: uploadData.clubId
      }, user);

      if (!imageUploadResult.success) {
        // Remove the uploaded file if database creation failed
        try {
          await fs.unlink(filePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file:', cleanupError);
        }
        
        return imageUploadResult;
      }

      console.log(`✅ Image uploaded successfully: ${uniqueFilename} to ${uploadDirectory} by user ${user.id}`);

      return {
        success: true,
        message: 'Image uploaded successfully',
        image: imageUploadResult.image,
        url: fileUrl
      };

    } catch (error) {
      console.error('Error processing image upload:', error);
      
      return {
        success: false,
        message: 'Failed to process image upload'
      };
    }
  }

  /**
   * Delete an image upload
   * @param {number} imageId - Image upload ID
   * @param {Object} user - User attempting to delete
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteImage(imageId, user) {
    try {
      // Find the image
      const image = await ImageUpload.findByPk(imageId);
      if (!image) {
        return {
          success: false,
          message: 'Image not found'
        };
      }

      // Check permissions
      let canDelete = false;

      if (user.isAdmin) {
        canDelete = true;
      } else if (image.clubId && user.clubId === image.clubId) {
        // User can delete images from their own club
        canDelete = true;
      } else if (image.carnivalId) {
        // Check if user's club is associated with the carnival
        canDelete = await ImageUpload.canUserUploadForCarnival(user, image.carnivalId);
      }

      if (!canDelete) {
        return {
          success: false,
          message: 'You do not have permission to delete this image'
        };
      }

      // Delete file from disk
      const filePath = path.join(process.cwd(), 'public', image.url);
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Deleted file from disk: ${filePath}`);
      } catch (fileError) {
        console.warn(`⚠️ Could not delete file from disk: ${filePath}`, fileError.message);
        // Continue with database deletion even if file deletion fails
      }

      // Delete database record
      await image.destroy();

      console.log(`✅ Image deleted successfully: ID ${imageId} by user ${user.id}`);

      return {
        success: true,
        message: 'Image deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting image:', error);
      
      return {
        success: false,
        message: 'Failed to delete image'
      };
    }
  }

  /**
   * Get upload statistics
   * @returns {Promise<Object>} Upload statistics
   */
  static async getUploadStats() {
    try {
      const totalImages = await ImageUpload.count();
      const carnivalImages = await ImageUpload.count({
        where: {
          carnivalId: {
            [ImageUpload.sequelize.Sequelize.Op.ne]: null
          }
        }
      });
      const clubImages = await ImageUpload.count({
        where: {
          clubId: {
            [ImageUpload.sequelize.Sequelize.Op.ne]: null
          }
        }
      });

      return {
        success: true,
        stats: {
          totalImages,
          carnivalImages,
          clubImages
        }
      };

    } catch (error) {
      console.error('Error getting upload statistics:', error);
      
      return {
        success: false,
        message: 'Failed to get upload statistics'
      };
    }
  }
}

export default ImageUploadService;
