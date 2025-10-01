/**
 * Form Upload Middleware
 * Handles traditional form-based file uploads with configurable entity types and field mapping
 * Saves file paths directly to model fields (logoPath, documentPath, etc.)
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get subfolder based on field name for content type organization
 * @param {string} fieldname - The form field name (e.g., 'logo', 'document', 'avatar')
 * @returns {string} The subfolder name
 */
export const getSubfolderForField = (fieldname) => {
  const fieldToSubfolder = {
    'logo': 'logos',
    'logoFile': 'logos',
    'clubLogo': 'logos',
    'carnivalLogo': 'logos',
    'sponsorLogo': 'logos',
    'avatar': 'avatars',
    'profileImage': 'avatars',
    'document': 'documents',
    'attachment': 'documents',
    'certificate': 'documents',
    'drawDocument': 'documents',
    'draw': 'documents',
    'image': 'gallery',
    'gallery': 'gallery',
    'photo': 'gallery'
  };
  
  return fieldToSubfolder[fieldname] || 'general';
};

/**
 * File filter for form uploads
 * Supports images, documents, and other common file types
 */
const formFileFilter = (req, file, cb) => {
  // Get allowed types based on field name
  const subfolder = getSubfolderForField(file.fieldname);
  
  let allowedTypes = [];
  let allowedExtensions = [];
  
  switch (subfolder) {
    case 'logos':
    case 'avatars':
    case 'gallery':
      // Image files only
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      allowedExtensions = ['.jpg', '.jpeg', '.png'];
      
      // Special handling for SVG (logos and avatars only, not gallery)
      if (subfolder !== 'gallery') {
        allowedTypes.push('image/svg+xml');
        allowedExtensions.push('.svg');
      }
      break;
      
    case 'documents':
      // Document files
      allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ];
      allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];
      break;
      
    default:
      // General files - allow images and documents
      allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml',
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',        
        'text/csv'
      ];
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.csv'];
      break;
  }
  
  // Check mimetype
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types for ${subfolder}: ${allowedTypes.join(', ')}`), false);
  }
  
  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error(`Invalid file extension: ${fileExtension}. Allowed extensions for ${subfolder}: ${allowedExtensions.join(', ')}`), false);
  }
  
  // Additional SVG validation for security
  if (file.mimetype === 'image/svg+xml') {
    // Basic SVG validation - check for script tags or suspicious content
    const filename = file.originalname.toLowerCase();
    if (!filename.endsWith('.svg')) {
      return cb(new Error('SVG files must have .svg extension'), false);
    }
  }
  
  cb(null, true);
};

/**
 * Create a configured form uploader for specific entity type
 * @param {string} entityType - The entity type (e.g., 'clubs', 'carnivals', 'sponsors', 'users')
 * @param {Object} fieldConfig - Configuration for field handling
 * @param {number} fieldConfig.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param {number} fieldConfig.maxFiles - Maximum number of files (default: 1)
 * @returns {Object} Object containing multer middleware and processing function
 */
export const createFormUploader = (entityType, fieldConfig = {}) => {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    maxFiles = 1
  } = fieldConfig;
  
  // Create storage configuration
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      try {
        // Determine entity ID from request
        let entityId;
        
        // Try different ways to get entity ID
        if (req.params.id) {
          entityId = req.params.id;
        } else if (req.params.clubId) {
          entityId = req.params.clubId;
        } else if (req.params.carnivalId) {
          entityId = req.params.carnivalId;
        } else if (req.params.sponsorId) {
          entityId = req.params.sponsorId;
        } else if (req.params.userId) {
          entityId = req.params.userId;
        } else if (req.body.id) {
          entityId = req.body.id;
        } else if (req.body.clubId) {
          entityId = req.body.clubId;
        } else if (req.body.carnivalId) {
          entityId = req.body.carnivalId;
        } else if (req.body.sponsorId) {
          entityId = req.body.sponsorId;
        } else if (req.body.userId) {
          entityId = req.body.userId;
        }
        
        if (!entityId) {
          return cb(new Error(`Entity ID is required for ${entityType} uploads`));
        }
        
        // Get subfolder based on field name
        const subfolder = getSubfolderForField(file.fieldname);
        
        // Create destination path
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', entityType, entityId.toString(), subfolder);
        
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
  
  // Create multer instance
  const uploader = multer({
    storage: storage,
    fileFilter: formFileFilter,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles
    }
  });
  
  /**
   * Process form upload and update model field
   * Middleware to handle post-upload processing for form-based uploads
   */
  const processFormUpload = async (req, res, next) => {
    try {
      // Only process if files were uploaded
      if (!req.file && !req.files) {
        return next();
      }
      
      // Handle single file upload
      if (req.file) {
        const file = req.file;
        const subfolder = getSubfolderForField(file.fieldname);
        const relativePath = `/uploads/${entityType}/${req.params.id || req.body.id}/${subfolder}/${file.filename}`;
        
        // Store the path in request for controller to use
        req.uploadedFile = {
          fieldname: file.fieldname,
          path: relativePath,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        };
      }
      
      // Handle multiple file upload
      if (req.files && Array.isArray(req.files)) {
        req.uploadedFiles = req.files.map(file => {
          const subfolder = getSubfolderForField(file.fieldname);
          const relativePath = `/uploads/${entityType}/${req.params.id || req.body.id}/${subfolder}/${file.filename}`;
          
          return {
            fieldname: file.fieldname,
            path: relativePath,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          };
        });
      }
      
      // Handle multiple fields with files
      if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
        req.uploadedFilesByField = {};
        
        Object.keys(req.files).forEach(fieldname => {
          const filesArray = Array.isArray(req.files[fieldname]) ? req.files[fieldname] : [req.files[fieldname]];
          
          req.uploadedFilesByField[fieldname] = filesArray.map(file => {
            const subfolder = getSubfolderForField(file.fieldname);
            const relativePath = `/uploads/${entityType}/${req.params.id || req.body.id}/${subfolder}/${file.filename}`;
            
            return {
              fieldname: file.fieldname,
              path: relativePath,
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size
            };
          });
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
  
  return {
    upload: uploader,
    process: processFormUpload
  };
};

/**
 * Helper function to create common uploader configurations
 */
export const createCommonUploaders = () => {
  return {
    club: createFormUploader('clubs', { maxFileSize: 5 * 1024 * 1024 }), // 5MB for club files
    carnival: createFormUploader('carnivals', { maxFileSize: 10 * 1024 * 1024 }), // 10MB for carnival files
    sponsor: createFormUploader('sponsors', { maxFileSize: 5 * 1024 * 1024 }), // 5MB for sponsor files
    user: createFormUploader('users', { maxFileSize: 2 * 1024 * 1024 }) // 2MB for user avatars
  };
};

/**
 * Handle upload errors with appropriate error responses
 */
export const handleFormUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum file size exceeded.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum file count exceeded.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field. Check your form field names.'
      });
    }
  }
  
  // Handle other upload-related errors
  if (error.message && error.message.includes('Invalid file')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  // Pass other errors to default error handler
  next(error);
};
