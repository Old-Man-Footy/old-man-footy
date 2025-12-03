/**
 * Gallery Upload Middleware
 * 
 * Specialized middleware for AJAX-based gallery image uploads.
 * Handles uploads to gallery subfolders with entity-based organization.
 * 
 * Usage: Used by API routes for dynamic gallery management
 * Storage: public/uploads/{entityType}/{entityId}/gallery/
 * 
 * @module middleware/galleryUpload
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GALLERY_UPLOAD_CONFIG } from '../config/constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * File filter for gallery images
 * Uses same validation logic as original upload middleware
 */
const galleryFileFilter = (req, file, cb) => {
  // Gallery image validation - matches original middleware gallery field validation
  const allowedExtensions = /jpeg|jpg|png|gif|svg|webp/;
  const allowedMimeTypes = /^image\/(jpeg|jpg|png|gif|svg\+xml|webp)$/;
  
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.test(file.mimetype);
  
  // Special handling for SVG files - browsers can send different MIME types
  const isSvg = path.extname(file.originalname).toLowerCase() === '.svg' &&
                (file.mimetype === 'image/svg+xml' || 
                 file.mimetype === 'image/svg' ||
                 file.mimetype === 'text/xml' ||
                 file.mimetype === 'application/xml');
  
  if ((mimetype && extname) || isSvg) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPG, PNG, GIF, SVG, or WebP images are allowed for gallery uploads.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

/**
 * Configure multer storage for gallery uploads
 * Destination: public/uploads/{entityType}/{entityId}/gallery
 * Filename: timestamp-random-originalname
 */
const galleryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      // Extract entity information from request body
      const { carnivalId, clubId } = req.body;
      
      let entityType, entityId;
      
      if (carnivalId) {
        entityType = 'carnivals';
        entityId = carnivalId;
      } else if (clubId) {
        entityType = 'clubs';  
        entityId = clubId;
      } else {
        return cb(new Error('Must specify carnivalId or clubId for gallery upload'));
      }
      
      // Create destination path
      const uploadDir = path.join(__dirname, '..', 'public', 'uploads', entityType, entityId.toString(), 'gallery');
      
      // Create directory if it doesn't exist
      fs.mkdirSync(uploadDir, { recursive: true });
      
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random suffix
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    
    const filename = `${timestamp}-${randomSuffix}-${basename}${extension}`;
    cb(null, filename);
  }
});

/**
 * Gallery upload middleware configuration
 * Supports multiple file upload with 10MB limit per file, max 10 files
 */
const galleryUpload = multer({
  storage: galleryStorage,
  fileFilter: galleryFileFilter,
  limits: {
    fileSize: GALLERY_UPLOAD_CONFIG.MAX_FILE_SIZE || (10 * 1024 * 1024), // 10MB default per file
    files: GALLERY_UPLOAD_CONFIG.MAX_FILES || 10 // Allow up to 10 files
  }
}).array('images', GALLERY_UPLOAD_CONFIG.MAX_FILES || 10); // Field name 'images' with max file count

/**
 * Enhanced error handling middleware for gallery uploads
 * Provides specific error messages for gallery upload failures
 */
const handleGalleryUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message;
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        const maxSize = GALLERY_UPLOAD_CONFIG.MAX_FILE_SIZE || (10 * 1024 * 1024);
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        message = `File too large. Maximum size is ${maxSizeMB}MB.`;
        break;
      case 'LIMIT_FILE_COUNT':
        const maxFiles = GALLERY_UPLOAD_CONFIG.MAX_FILES || 10;
        message = `Too many files. Maximum ${maxFiles} images can be uploaded at a time.`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name. Use "images" field for gallery uploads.';
        break;
      default:
        message = `Upload error: ${error.message}`;
    }
    
    return res.status(400).json({
      error: {
        status: 400,
        message,
        type: 'gallery_upload_error'
      }
    });
  }
  
  if (error.message.includes('carnivalId or clubId')) {
    return res.status(400).json({
      error: {
        status: 400,
        message: 'Gallery upload requires either carnivalId or clubId to be specified.',
        type: 'validation_error'
      }
    });
  }
  
  if (error.message.includes('Invalid file')) {
    return res.status(400).json({
      error: {
        status: 400,
        message: error.message,
        type: 'file_validation_error'
      }
    });
  }
  
  // Generic error handling
  return res.status(500).json({
    error: {
      status: 500,
      message: 'Gallery upload failed due to server error.',
      type: 'server_error'
    }
  });
};

/**
 * Validation helper: Check if request has required entity ID
 */
const validateGalleryUploadRequest = (req, res, next) => {
  const { carnivalId, clubId } = req.body;
  
  if (!carnivalId && !clubId) {
    return res.status(400).json({
      error: {
        status: 400,
        message: 'Gallery upload requires either carnivalId or clubId.',
        type: 'validation_error'
      }
    });
  }
  
  // Ensure IDs are valid integers
  if (carnivalId && (!Number.isInteger(Number(carnivalId)) || Number(carnivalId) <= 0)) {
    return res.status(400).json({
      error: {
        status: 400,
        message: 'Invalid carnivalId. Must be a positive integer.',
        type: 'validation_error'
      }
    });
  }
  
  if (clubId && (!Number.isInteger(Number(clubId)) || Number(clubId) <= 0)) {
    return res.status(400).json({
      error: {
        status: 400,
        message: 'Invalid clubId. Must be a positive integer.',
        type: 'validation_error'
      }
    });
  }
  
  next();
};

export {
  galleryUpload,
  handleGalleryUploadError,
  validateGalleryUploadRequest,
  galleryFileFilter
};
