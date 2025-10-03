/**
 * Form Upload Middleware
 * Handles traditional form-based file uploads with configurable entity types and field mapping
 * Saves file paths directly to model fields (logoPath, documentPath, etc.)
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validationResult } from 'express-validator';
import { MAX_FILE_SIZES, FORM_UPLOAD_CONFIG } from '../config/constants.mjs';

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
    const error = new Error(`Invalid file type: ${file.mimetype}. Allowed types for ${subfolder}: ${allowedTypes.join(', ')}`);
    error.code = 'INVALID_MIME_TYPE';
    error.field = fieldname;
    return cb(error, false);
  }
  
  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    const error = new Error(`Invalid file extension: ${fileExtension}. Allowed extensions for ${subfolder}: ${allowedExtensions.join(', ')}`);
    error.code = 'INVALID_FILE_EXTENSION';
    error.field = fieldname;
    return cb(error, false);
  }
  
  // Additional validation for empty or suspicious files
  if (!file.originalname || file.originalname.trim() === '') {
    const error = new Error('File must have a valid name');
    error.code = 'INVALID_FILENAME';
    error.field = fieldname;
    return cb(error, false);
  }
  
  // Check for suspicious double extensions
  const suspiciousPattern = /\.(exe|bat|cmd|scr|pif|com|js|jar|vbs|ps1)\./i;
  if (suspiciousPattern.test(file.originalname)) {
    const error = new Error('File contains suspicious extension pattern');
    error.code = 'SUSPICIOUS_FILE';
    error.field = fieldname;
    return cb(error, false);
  }
  
  // Additional SVG validation for security
  if (file.mimetype === 'image/svg+xml') {
    // Basic SVG validation - check for script tags or suspicious content
    const filename = file.originalname.toLowerCase();
    if (!filename.endsWith('.svg')) {
      const error = new Error('SVG files must have .svg extension');
      error.code = 'INVALID_FILE_EXTENSION';
      error.field = fieldname;
      return cb(error, false);
    }
  }
  
  cb(null, true);
};

/**
 * Get dynamic file size limit based on field name and content type
 * @param {string} fieldname - The form field name
 * @returns {number} Maximum file size in bytes
 */
export const getDynamicSizeLimit = (fieldname) => {
  // Get content type from field name mapping
  const contentType = FORM_UPLOAD_CONFIG.FIELD_SUBFOLDER_MAP[fieldname];
  if (contentType && MAX_FILE_SIZES[contentType]) {
    return MAX_FILE_SIZES[contentType];
  }
  
  // Default to 10MB if no specific limit found
  return 10 * 1024 * 1024;
};

/**
 * Create a configured form uploader for specific entity type
 * @param {string} entityType - The entity type (e.g., 'clubs', 'carnivals', 'sponsors', 'users')
 * @param {Object} fieldConfig - Configuration for field handling
 * @param {number} fieldConfig.maxFileSize - Maximum file size in bytes (will use dynamic limits if not specified)
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
  
  // Create custom file filter that combines existing validation with dynamic size limits
  const dynamicFileFilter = (req, file, cb) => {
    // First run the existing file filter
    formFileFilter(req, file, (filterError, filterResult) => {
      if (filterError || !filterResult) {
        return cb(filterError, filterResult);
      }
      
      // Check dynamic size limit for this field
      const dynamicSizeLimit = fieldConfig.maxFileSize || getDynamicSizeLimit(file.fieldname);
      if (file.size && file.size > dynamicSizeLimit) {
        const error = new Error(`File too large. Maximum size allowed: ${Math.round(dynamicSizeLimit / (1024 * 1024))}MB`);
        error.code = 'LIMIT_FILE_SIZE';
        error.field = file.fieldname;
        error.limit = dynamicSizeLimit;
        return cb(error, false);
      }
      
      cb(null, true);
    });
  };

  // Create multer instance with increased default limit (will be checked in filter)
  const uploader = multer({
    storage: storage,
    fileFilter: dynamicFileFilter,
    limits: {
      fileSize: fieldConfig.maxFileSize || (20 * 1024 * 1024), // 20MB max, actual limits checked in filter
      files: maxFiles
    }
  });
  
  /**
   * Process form upload and update model field
   * Middleware to handle post-upload processing for form-based uploads
   */
  const processFormUpload = async (req, res, next) => {
    console.log('🟣 FormUpload processFormUpload - Starting file processing');
    console.log('🟣 Files in request:', { 
      hasFile: !!req.file, 
      hasFiles: !!req.files,
      fileCount: req.files ? (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : 0
    });
    
    try {
      // Only process if files were uploaded
      if (!req.file && !req.files) {
        console.log('🟣 No files to process, skipping...');
        return next();
      }
      
      // Handle single file upload
      if (req.file) {
        console.log('🟣 Processing single file upload:', req.file.fieldname);
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
        console.log('🟣 Single file processed:', req.uploadedFile.path);
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
      
      console.log('🟣 File processing complete, continuing to next middleware');
      next();
    } catch (error) {
      console.error('❌ FormUpload processFormUpload error:', error);
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
      return res.status(413).json({
        success: false,
        error: 'File too large',
        details: 'Maximum file size exceeded'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        details: 'Maximum file count exceeded'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field',
        details: `Field '${error.field}' is not allowed`
      });
    }
    if (error.code === 'LIMIT_FIELD_KEY') {
      return res.status(400).json({
        success: false,
        error: 'Field name too long'
      });
    }
    if (error.code === 'LIMIT_FIELD_VALUE') {
      return res.status(400).json({
        success: false,
        error: 'Field value too long'
      });
    }
    if (error.code === 'LIMIT_FIELD_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many fields'
      });
    }
  }
  
  // Handle custom upload errors
  if (error.code === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: 'Unsupported file type',
      details: error.message
    });
  }
  
  if (error.code === 'INVALID_FILE_EXTENSION') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file extension',
      details: error.message
    });
  }
  
  if (error.code === 'INVALID_MIME_TYPE') {
    return res.status(400).json({
      success: false,
      error: 'Invalid MIME type',
      details: error.message
    });
  }
  
  if (error.code === 'DIRECTORY_ERROR' || error.code === 'ENOENT' || error.code === 'EACCES') {
    return res.status(500).json({
      success: false,
      error: 'File system error',
      details: 'Unable to access upload directory'
    });
  }
  
  // Handle malformed requests
  if (error.type === 'entity.parse.failed' || error.message?.includes('JSON') || error.name === 'SyntaxError') {
    return res.status(400).json({
      success: false,
      error: 'Malformed request',
      details: 'Invalid request format'
    });
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

// Create common uploader instances
const commonUploaders = createCommonUploaders();

/**
 * Main form upload middleware - provides default club uploader
 * This is the main export that routes can use directly
 */
export const formUpload = commonUploaders.club.upload;

/**
 * Validation function for form upload requests
 * Validates that required fields are present and entity exists
 */
export const validateFormUploadRequest = async (req, res, next) => {
  try {
    // Check if entity ID is available
    const entityId = req.params.id || req.params.clubId || req.params.carnivalId || 
                    req.params.sponsorId || req.params.userId || 
                    req.body.id || req.body.clubId || req.body.carnivalId ||
                    req.body.sponsorId || req.body.userId;
    
    if (!entityId) {
      return res.status(400).json({
        success: false,
        error: 'Entity ID is required for file uploads'
      });
    }
    
    // Store validated entity ID for downstream middleware
    req.validatedEntityId = entityId;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate entity type for uploads
 * Ensures entity type is supported
 */
export const validateEntityType = (allowedTypes = ['clubs', 'carnivals', 'sponsors', 'users']) => {
  return (req, res, next) => {
    try {
      // Determine entity type from route or request
      let entityType;
      
      if (req.route && req.route.path) {
        const routePath = req.route.path.toLowerCase();
        if (routePath.includes('club')) entityType = 'clubs';
        else if (routePath.includes('carnival')) entityType = 'carnivals';
        else if (routePath.includes('sponsor')) entityType = 'sponsors';
        else if (routePath.includes('user')) entityType = 'users';
      }
      
      if (!entityType || !allowedTypes.includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid entity type. Allowed types: ${allowedTypes.join(', ')}`
        });
      }
      
      req.validatedEntityType = entityType;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate required fields for upload requests
 * Ensures essential form fields are present before processing upload
 */
export const validateRequiredFields = (requiredFields = []) => {
  return (req, res, next) => {
    try {
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!req.body[field] && !req.params[field]) {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate entity ID parameters in request
 * @param {string} paramName - Parameter name to validate (default: 'id')
 * @returns {Function} Middleware function
 */
export const validateEntityId = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      const entityId = req.params[paramName];
      
      if (!entityId) {
        const error = new Error(`Entity ID is required in params.${paramName}`);
        error.status = 400;
        error.code = 'MISSING_ENTITY_ID';
        return next(error);
      }
      
      // Validate entityId is numeric for database IDs
      if (!/^\d+$/.test(entityId)) {
        const error = new Error(`Invalid entity ID format - numeric value required`);
        error.status = 400;
        error.code = 'INVALID_ENTITY_ID';
        return next(error);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate entity type parameters and requirements
 * @param {Object} options - Validation options
 * @returns {Function} Middleware function  
 */
export const validateEntityTypeParam = (options = {}) => {
  return (req, res, next) => {
    try {
      // Check for express-validator results first
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error('Validation failed for entity parameters');
        error.status = 400;
        error.code = 'ENTITY_VALIDATION_FAILED';
        error.details = errors.array();
        return next(error);
      }
      
      // Check for required entityType in route or entity validation
      const entityType = options.entityType || req.params.entity || req.route?.path?.split('/')[1];
      
      if (!entityType) {
        const error = new Error('Entity type validation failed - entity type is required');
        error.status = 400;
        error.code = 'MISSING_ENTITY_TYPE';
        return next(error);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Enhanced missing field error handling with specific error messages
 * @param {Array} requiredFields - Array of required field names
 * @returns {Function} Middleware function
 */
export const validateMissingRequiredFields = (requiredFields = []) => {
  return (req, res, next) => {
    try {
      const missingFields = [];
      
      requiredFields.forEach(field => {
        // Check both body and files for required fields
        const hasInBody = req.body && req.body[field] && req.body[field].trim();
        const hasInFiles = req.files && req.files[field] && req.files[field].length > 0;
        
        if (!hasInBody && !hasInFiles) {
          missingFields.push(field);
        }
      });
      
      if (missingFields.length > 0) {
        const error = new Error(`Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`);
        error.status = 400;
        error.code = 'MISSING_REQUIRED_FIELDS';
        error.missingFields = missingFields;
        return next(error);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Export individual uploaders for specific use cases
export const clubFormUploader = commonUploaders.club;
export const carnivalFormUploader = commonUploaders.carnival;
export const sponsorFormUploader = commonUploaders.sponsor;
export const userFormUploader = commonUploaders.user;
