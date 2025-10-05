/**
 * Upload Processing Utility
 * 
 * Provides standardized, defensive processing of structured uploads
 * to prevent corruption and ensure consistent handling across controllers.
 * 
 * @author Old Man Footy Team
 * @date September 30, 2025
 */

import path from 'path';

/**
 * Convert absolute file path to relative web path
 * @param {string} absolutePath - Absolute file system path
 * @returns {string} Relative web path starting with /uploads/
 */
const convertToWebPath = (absolutePath) => {
  if (!absolutePath || typeof absolutePath !== 'string') {
    return '';
  }

  // Find the 'uploads' directory in the path and create web-relative path
  const uploadsIndex = absolutePath.indexOf('uploads');
  if (uploadsIndex === -1) {
    console.warn(`⚠️ Upload path does not contain 'uploads' directory: ${absolutePath}`);
    return '';
  }

  // Extract everything from 'uploads' onwards and normalize path separators
  const relativePath = absolutePath.substring(uploadsIndex).replace(/\\/g, '/');
  
  // Ensure it starts with a forward slash for web paths
  return `/${relativePath}`;
};

/**
 * Get field mapping for different entity types
 * @param {string} entityType - Type of entity (club, carnival, sponsor)
 * @param {string} fieldname - Original field name from upload
 * @returns {string} Mapped field name for database
 */
const getFieldMapping = (entityType, fieldname) => {
  const mappings = {
    carnivals: {
      logo: 'clubLogoURL',
      promotionalImage: 'promotionalImageURL',
      drawDocument: 'drawFileURL',
      galleryImage: 'galleryImages',
    },
    clubs: {
      logo: 'logoUrl',
      galleryImage: 'galleryImages'
    },
    sponsors: {
      logo: 'logoUrl'
    }
  };

  return mappings[entityType]?.[fieldname] || fieldname;
};

/**
 * Processes structured uploads with defensive error handling
 * @param {Object} req - Express request object with structuredUploads
 * @param {Object} updateData - Data object to populate with upload paths
 * @param {string} entityType - Type of entity (club, carnival, sponsor)
 * @param {number} entityId - ID of the entity being updated
 * @returns {Object} Updated data object with upload paths
 */
export const processStructuredUploads = (req, updateData, entityType, entityId) => {
  // Defensive check: ensure we have uploads to process
  if (!req.structuredUploads || !Array.isArray(req.structuredUploads) || req.structuredUploads.length === 0) {
    console.log(`📸 No structured uploads found for ${entityType} ${entityId}`);
    return updateData;
  }

  console.log(`📸 Processing ${req.structuredUploads.length} uploads for ${entityType} ${entityId}`);

  // Process each upload with defensive validation
  for (const upload of req.structuredUploads) {
    // Validate upload object structure
    if (!upload || typeof upload !== 'object') {
      console.warn(`⚠️ Invalid upload object for ${entityType} ${entityId}: not an object`);
      continue;
    }

    if (!upload.fieldname || typeof upload.fieldname !== 'string') {
      console.warn(`⚠️ Invalid upload object for ${entityType} ${entityId}: missing or invalid fieldname`, upload);
      continue;
    }

    if (!upload.path || typeof upload.path !== 'string') {
      console.warn(`⚠️ Invalid upload object for ${entityType} ${entityId}: missing or invalid path`, upload);
      continue;
    }

    // Get the appropriate field name for this entity type
    const mappedField = getFieldMapping(entityType, upload.fieldname);
    
    // Use relativePath if available, otherwise convert absolute path to relative web path
    const webPath = upload.relativePath || convertToWebPath(upload.path);
    
    // Process based on field type
    switch (upload.fieldname) {
      case 'logo':
        updateData[mappedField] = webPath;
        console.log(`📸 Updated ${entityType} ${entityId} logo (${mappedField}): ${webPath}`);
        break;
      
      case 'promotionalImage':
        updateData[mappedField] = webPath;
        console.log(`📸 Updated ${entityType} ${entityId} promotional image (${mappedField}): ${webPath}`);
        break;
      
      case 'galleryImage':
        // Handle gallery images - store as array for multiple images
        if (!updateData[mappedField]) {
          updateData[mappedField] = [];
        }
        updateData[mappedField].push(webPath);
        console.log(`📸 Added gallery image to ${entityType} ${entityId} (${mappedField}): ${webPath}`);
        break;
      
      case 'drawDocument':
        // Handle draw documents for carnivals
        if (!updateData[mappedField]) {
          updateData[mappedField] = [];
        }
        updateData[mappedField].push(webPath);
        console.log(`📸 Added draw document to ${entityType} ${entityId} (${mappedField}): ${webPath}`);
        break;
     
      case 'avatar':
        updateData.avatarUrl = webPath; // Avatar stays the same for all entities
        console.log(`📸 Updated ${entityType} ${entityId} avatar: ${webPath}`);
        break;
      
      default:
        console.warn(`⚠️ Unknown upload field '${upload.fieldname}' for ${entityType} ${entityId}: ${webPath}`);
        break;
    }
  }

  return updateData;
};

/**
 * Validates that structured uploads array is properly formatted
 * @param {Array} uploads - Array of upload objects to validate
 * @returns {boolean} True if uploads are valid, false otherwise
 */
export const validateStructuredUploads = (uploads) => {
  if (!Array.isArray(uploads)) {
    return false;
  }

  for (const upload of uploads) {
    if (!upload || 
        typeof upload !== 'object' || 
        !upload.fieldname || 
        !upload.path ||
        typeof upload.fieldname !== 'string' ||
        typeof upload.path !== 'string') {
      return false;
    }
  }

  return true;
};

/**
 * Extracts specific upload type from structured uploads
 * @param {Array} uploads - Array of structured uploads
 * @param {string} fieldname - Field name to extract (e.g., 'logo')
 * @returns {Object|null} Upload object or null if not found
 */
export const extractUploadByFieldname = (uploads, fieldname) => {
  if (!validateStructuredUploads(uploads)) {
    return null;
  }

  return uploads.find(upload => upload.fieldname === fieldname) || null;
};
