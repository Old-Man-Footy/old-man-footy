/**
 * Upload Processing Utility
 * 
 * Provides standardized, defensive processing of structured uploads
 * to prevent corruption and ensure consistent handling across controllers.
 * 
 * @author Old Man Footy Team
 * @date September 30, 2025
 */

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

    // Process based on field type
    switch (upload.fieldname) {
      case 'logo':
        updateData.logoUrl = upload.path;
        console.log(`📸 Updated ${entityType} ${entityId} logo: ${upload.path}`);
        break;
      
      case 'promotionalImage':
        updateData.promotionalImageUrl = upload.path;
        console.log(`📸 Updated ${entityType} ${entityId} promotional image: ${upload.path}`);
        break;
      
      case 'galleryImage':
        // Handle gallery images - store as array for multiple images
        if (!updateData.galleryImages) {
          updateData.galleryImages = [];
        }
        updateData.galleryImages.push(upload.path);
        console.log(`📸 Added gallery image to ${entityType} ${entityId}: ${upload.path}`);
        break;
      
      case 'drawDocument':
        // Handle draw documents for carnivals
        if (!updateData.drawDocuments) {
          updateData.drawDocuments = [];
        }
        updateData.drawDocuments.push(upload.path);
        console.log(`📸 Added draw document to ${entityType} ${entityId}: ${upload.path}`);
        break;
      
      case 'bannerImage':
        // Handle banner images
        if (!updateData.bannerImages) {
          updateData.bannerImages = [];
        }
        updateData.bannerImages.push(upload.path);
        console.log(`📸 Added banner image to ${entityType} ${entityId}: ${upload.path}`);
        break;
      
      case 'avatar':
        updateData.avatarUrl = upload.path;
        console.log(`📸 Updated ${entityType} ${entityId} avatar: ${upload.path}`);
        break;
      
      default:
        console.warn(`⚠️ Unknown upload field '${upload.fieldname}' for ${entityType} ${entityId}: ${upload.path}`);
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
 * @param {string} fieldname - Field name to extract (e.g., 'logo', 'bannerImage')
 * @returns {Object|null} Upload object or null if not found
 */
export const extractUploadByFieldname = (uploads, fieldname) => {
  if (!validateStructuredUploads(uploads)) {
    return null;
  }

  return uploads.find(upload => upload.fieldname === fieldname) || null;
};
