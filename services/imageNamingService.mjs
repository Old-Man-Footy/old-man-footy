/**
 * Image Naming Service - Complex Naming Standard Implementation
 * 
 * Provides comprehensive naming conventions for uploaded images to ensure
 * proper linking to clubs and carnivals with full traceability.
 * 
 * Naming Convention Format:
 * {entityType}-{entityId}-{imageType}-{uploadDate}-{uploaderId}-{sequenceId}.{ext}
 * 
 * Examples:
 * - club-42-logo-20250607-123-001.jpg
 * - carnival-156-promo-20250607-456-002.png
 * - club-42-gallery-20250607-123-003.webp
 */

import { extname, join, parse, dirname, relative, basename } from 'path';
import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import { Club, Carnival, Sponsor, User } from '../models/index.mjs';

class ImageNamingService {
    /**
     * Entity types for image association
     */
    static ENTITY_TYPES = {
        CLUB: 'club',
        CARNIVAL: 'carnival',
        SPONSOR: 'sponsor',
        USER: 'user',
        SYSTEM: 'system'
    };

    /**
     * Image types for categorization
     */
    static IMAGE_TYPES = {
        LOGO: 'logo',
        PROMOTIONAL: 'promo',
        GALLERY: 'gallery',
        DRAW_DOCUMENT: 'draw',
        AVATAR: 'avatar',
        BANNER: 'banner',
        THUMBNAIL: 'thumb',
        SOCIAL_MEDIA: 'social'
    };

    /**
     * Generate a structured filename for uploaded images
     * 
     * @param {Object} options - Naming options
     * @param {string} options.entityType - Type of entity (club, carnival, etc.)
     * @param {number} options.entityId - ID of the entity
     * @param {string} options.imageType - Type of image (logo, promo, etc.)
     * @param {number} options.uploaderId - ID of the user uploading
     * @param {string} options.originalName - Original filename
     * @param {string} [options.customSuffix] - Custom suffix for the filename
     * @returns {Promise<Object>} Generated filename and metadata
     */
    static async generateImageName(options) {
        const {
            entityType,
            entityId,
            imageType,
            uploaderId,
            originalName,
            customSuffix = ''
        } = options;

        // Validate required parameters
        this.validateNamingOptions(options);

        // Extract file extension
        const extension = extname(originalName).toLowerCase();
        
        // Generate upload date (YYYYMMDD format)
        const uploadDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        
        // Generate sequence ID to handle multiple uploads
        const sequenceId = await this.generateSequenceId(entityType, entityId, imageType, uploadDate);
        
        // Generate secure hash for integrity
        const integrityHash = this.generateIntegrityHash(options, uploadDate, sequenceId);
        
        // Build filename components
        const components = [
            entityType,
            entityId.toString().padStart(6, '0'), // Zero-padded for sorting
            imageType,
            uploadDate,
            uploaderId.toString().padStart(6, '0'),
            sequenceId.toString().padStart(3, '0')
        ];

        // Add custom suffix if provided
        if (customSuffix) {
            components.push(customSuffix);
        }

        // Generate final filename
        const filename = components.join('-') + extension;
        
        // Generate metadata
        const metadata = {
            filename,
            entityType,
            entityId,
            imageType,
            uploaderId,
            uploadDate,
            sequenceId,
            integrityHash,
            originalName,
            extension,
            customSuffix,
            createdAt: new Date().toISOString(),
            version: '1.0'
        };

        return {
            filename,
            metadata,
            relativePath: this.getRelativePath(entityType, imageType),
            fullPath: join(this.getRelativePath(entityType, imageType), filename)
        };
    }

    /**
     * Generate a reverse lookup filename pattern for finding images
     * 
     * @param {string} entityType - Type of entity
     * @param {number} entityId - ID of the entity
     * @param {string} [imageType] - Optional image type filter
     * @returns {string} Glob pattern for finding files
     */
    static generateSearchPattern(entityType, entityId, imageType = '*') {
        const paddedEntityId = entityId.toString().padStart(6, '0');
        return `${entityType}-${paddedEntityId}-${imageType}-*`;
    }

    /**
     * Parse a structured filename back to its components
     * 
     * @param {string} filename - Structured filename to parse
     * @returns {Object|null} Parsed components or null if invalid
     */
    static parseImageName(filename) {
        // Remove extension
        const nameWithoutExt = parse(filename).name;
        const extension = extname(filename);
        
        // Split into components
        const parts = nameWithoutExt.split('-');
        
        // Validate minimum required parts
        if (parts.length < 6) {
            return null;
        }

        try {
            const [entityType, entityId, imageType, uploadDate, uploaderId, sequenceId, ...customParts] = parts;
            
            return {
                entityType,
                entityId: parseInt(entityId, 10),
                imageType,
                uploadDate,
                uploaderId: parseInt(uploaderId, 10),
                sequenceId: parseInt(sequenceId, 10),
                customSuffix: customParts.join('-') || null,
                extension,
                originalFilename: filename
            };
        } catch (error) {
            console.error('Error parsing image name:', error);
            return null;
        }
    }

    /**
     * Get all images associated with an entity
     * 
     * @param {string} entityType - Type of entity
     * @param {number} entityId - ID of the entity
     * @param {string} [imageType] - Optional image type filter
     * @returns {Promise<Array>} Array of image information
     */
    static async getEntityImages(entityType, entityId, imageType = null) {
        const searchPattern = this.generateSearchPattern(entityType, entityId, imageType || '*');
        const basePath = join('public', this.getRelativePath(entityType, imageType || 'logo'));
        
        try {
            const files = await fs.readdir(dirname(basePath));
            const matchingFiles = files.filter(file => {
                const parsed = this.parseImageName(file);
                return parsed && 
                       parsed.entityType === entityType && 
                       parsed.entityId === entityId &&
                       (!imageType || parsed.imageType === imageType);
            });

            return matchingFiles.map(file => ({
                filename: file,
                ...this.parseImageName(file),
                fullPath: join(basePath, file),
                url: `/uploads/${relative('public/uploads', join(basePath, file)).replace(/\\/g, '/')}`
            }));
        } catch (error) {
            console.error('Error reading entity images:', error);
            return [];
        }
    }

    /**
     * Migrate existing images to the new naming convention
     * 
     * @param {string} entityType - Type of entity
     * @param {number} entityId - ID of the entity
     * @param {Array} existingImages - Array of existing image URLs
     * @param {number} uploaderId - ID of the user performing migration
     * @returns {Promise<Array>} Array of migration results
     */
    static async migrateExistingImages(entityType, entityId, existingImages, uploaderId) {
        const results = [];
        
        for (let i = 0; i < existingImages.length; i++) {
            try {
                const imageUrl = existingImages[i];
                const oldPath = join('public/uploads', imageUrl.replace(/^\/uploads\//, ''));
                
                // Determine image type from old path
                let imageType = this.IMAGE_TYPES.GALLERY;
                if (imageUrl.includes('logo')) imageType = this.IMAGE_TYPES.LOGO;
                else if (imageUrl.includes('promo')) imageType = this.IMAGE_TYPES.PROMOTIONAL;
                else if (imageUrl.includes('draw')) imageType = this.IMAGE_TYPES.DRAW_DOCUMENT;
                
                // Generate new name
                const namingResult = await this.generateImageName({
                    entityType,
                    entityId,
                    imageType,
                    uploaderId,
                    originalName: basename(oldPath),
                    customSuffix: 'migrated'
                });
                
                const newPath = join('public/uploads', namingResult.relativePath, namingResult.filename);
                
                // Ensure directory exists
                await fs.mkdir(dirname(newPath), { recursive: true });
                
                // Copy file to new location
                await fs.copyFile(oldPath, newPath);
                
                results.push({
                    success: true,
                    oldPath: imageUrl,
                    newPath: `/uploads/${relative('public/uploads', newPath).replace(/\\/g, '/')}`,
                    metadata: namingResult.metadata
                });
                
                // Optionally remove old file after successful copy
                // await fs.unlink(oldPath);
                
            } catch (error) {
                results.push({
                    success: false,
                    oldPath: existingImages[i],
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Clean up orphaned images (images not linked to any entity)
     * 
     * @param {boolean} dryRun - If true, only report what would be deleted
     * @returns {Promise<Object>} Cleanup results
     */
    static async cleanupOrphanedImages(dryRun = true) {
        const results = {
            processed: 0,
            orphaned: [],
            errors: []
        };

        try {
            // Get all clubs, carnivals, sponsors, and users
            const [clubs, carnivals, sponsors, users] = await Promise.all([
                Club.findAll({ attributes: ['id'] }),
                Carnival.findAll({ attributes: ['id'] }),
                Sponsor.findAll({ attributes: ['id'] }),
                User.findAll({ attributes: ['id'] })
            ]);

            const validEntityIds = {
                club: new Set(clubs.map(c => c.id)),
                carnival: new Set(carnivals.map(c => c.id)),
                sponsor: new Set(sponsors.map(s => s.id)),
                user: new Set(users.map(u => u.id))
            };

            // Scan upload directories
            const uploadDirs = ['public/uploads/logos', 'public/uploads/images', 'public/uploads/documents'];
            
            for (const dir of uploadDirs) {
                try {
                    const files = await fs.readdir(dir);
                    
                    for (const file of files) {
                        results.processed++;
                        const parsed = this.parseImageName(file);
                        
                        if (parsed && validEntityIds[parsed.entityType]) {
                            if (!validEntityIds[parsed.entityType].has(parsed.entityId)) {
                                results.orphaned.push({
                                    file: join(dir, file),
                                    entityType: parsed.entityType,
                                    entityId: parsed.entityId
                                });
                                
                                if (!dryRun) {
                                    await fs.unlink(join(dir, file));
                                }
                            }
                        }
                    }
                } catch (error) {
                    results.errors.push({ directory: dir, error: error.message });
                }
            }
        } catch (error) {
            results.errors.push({ operation: 'main', error: error.message });
        }

        return results;
    }

    /**
     * Validate naming options
     * 
     * @private
     * @param {Object} options - Options to validate
     */
    static validateNamingOptions(options) {
        const { entityType, entityId, imageType, uploaderId, originalName } = options;
        
        if (!Object.values(this.ENTITY_TYPES).includes(entityType)) {
            throw new Error(`Invalid entity type: ${entityType}`);
        }
        
        if (!Object.values(this.IMAGE_TYPES).includes(imageType)) {
            throw new Error(`Invalid image type: ${imageType}`);
        }
        
        if (!Number.isInteger(entityId) || entityId <= 0) {
            throw new Error(`Invalid entity ID: ${entityId}`);
        }
        
        if (!Number.isInteger(uploaderId) || uploaderId <= 0) {
            throw new Error(`Invalid uploader ID: ${uploaderId}`);
        }
        
        if (!originalName || typeof originalName !== 'string') {
            throw new Error('Original filename is required');
        }
    }

    /**
     * Generate sequence ID for handling multiple uploads on same day
     * 
     * @private
     * @param {string} entityType - Type of entity
     * @param {number} entityId - ID of the entity
     * @param {string} imageType - Type of image
     * @param {string} uploadDate - Upload date string
     * @returns {Promise<number>} Next sequence ID
     */
    static async generateSequenceId(entityType, entityId, imageType, uploadDate) {
        const pattern = `${entityType}-${entityId.toString().padStart(6, '0')}-${imageType}-${uploadDate}-*`;
        const basePath = join('public', this.getRelativePath(entityType, imageType));
        
        try {
            await fs.mkdir(basePath, { recursive: true });
            const files = await fs.readdir(basePath);
            const matchingFiles = files.filter(file => {
                const parsed = this.parseImageName(file);
                return parsed && 
                       parsed.entityType === entityType && 
                       parsed.entityId === entityId &&
                       parsed.imageType === imageType &&
                       parsed.uploadDate === uploadDate;
            });
            
            return matchingFiles.length + 1;
        } catch (error) {
            console.error('Error generating sequence ID:', error);
            return 1;
        }
    }

    /**
     * Generate integrity hash for file verification
     * 
     * @private
     * @param {Object} options - Naming options
     * @param {string} uploadDate - Upload date
     * @param {number} sequenceId - Sequence ID
     * @returns {string} Integrity hash
     */
    static generateIntegrityHash(options, uploadDate, sequenceId) {
        const data = `${options.entityType}-${options.entityId}-${options.imageType}-${uploadDate}-${options.uploaderId}-${sequenceId}`;
        return createHash('sha256').update(data).digest('hex').substring(0, 8);
    }

    /**
     * Get relative path for entity and image type
     * 
     * @private
     * @param {string} entityType - Type of entity
     * @param {string} imageType - Type of image
     * @returns {string} Relative path 
     */
    static getRelativePath(entityType, imageType) {
        // Organize by entity type and image type
        if (imageType === this.IMAGE_TYPES.LOGO) {
            return join('logos', entityType);
        } else if (imageType === this.IMAGE_TYPES.DRAW_DOCUMENT) {
            return join('documents', entityType);
        } else {
            return join('images', entityType, imageType);
        }
    }
}

// Export both default and named exports for flexibility
export default ImageNamingService;

// Export static properties directly without binding to avoid duplicate declarations
export const ENTITY_TYPES = {
    CLUB: 'club',
    CARNIVAL: 'carnival',
    SPONSOR: 'sponsor',
    USER: 'user',
    SYSTEM: 'system'
};

export const IMAGE_TYPES = {
    LOGO: 'logo',
    PROMOTIONAL: 'promo',
    GALLERY: 'gallery',
    DRAW_DOCUMENT: 'draw',
    AVATAR: 'avatar',
    BANNER: 'banner',
    THUMBNAIL: 'thumb',
    SOCIAL_MEDIA: 'social'
};

// Export wrapper functions instead of bound methods
export const generateImageName = (options) => ImageNamingService.generateImageName(options);
export const parseImageName = (filename) => ImageNamingService.parseImageName(filename);