/**
 * Carousel Image Service
 * 
 * Manages the selection and retrieval of gallery images for the home page carousel.
 * Now integrates with the ImageUpload model for database-driven image management.
 * Prioritizes carnival images with recent uploads and proper attribution.
 */

import { promises as fs } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SUPPORTED_GALLERY_EXTENSIONS, getAllEntityGalleryDirectories } from '../config/constants.mjs';
import ImageUpload from '../models/ImageUpload.mjs';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CarouselImageService {
    constructor() {
        this.uploadsPath = join(__dirname, '..', 'public', 'uploads');
        this.publicPath = '/uploads';
        
        this.supportedExtensions = SUPPORTED_GALLERY_EXTENSIONS;
        
        // Cache for performance
        this.imageCache = null;
        this.cacheExpiry = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get carousel images with priority for recent uploads
     * Now uses the ImageUpload model for database-driven images and falls back to filesystem scanning
     * @param {number} limit - Maximum number of images to return
     * @returns {Promise<Array>} Array of image objects with metadata
     */
    async getCarouselImages(limit = 10) {
        try {
            // Check cache first
            if (this.imageCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
                return this.shuffleAndLimit(this.imageCache, limit);
            }

            const allImages = [];

            // First, get images from the ImageUpload model (carnival images only for carousel)
            try {
                const dbImages = await ImageUpload.getCarouselImages();
                const formattedDbImages = dbImages.map(image => ({
                    id: image.id,
                    filename: this.extractFilename(image.url),
                    url: image.url,
                    uploadTime: new Date(image.createdAt).getTime(),
                    size: 100000, // Default size for DB images
                    type: 'gallery',
                    source: 'carnival',
                    displayType: 'Carnival Gallery',
                    entityType: 'carnival',
                    entityId: image.carnivalId,
                    entityName: image.carnival ? image.carnival.title : 'Carnival Carnival',
                    uploader: null, // Not tracking uploader in ImageUpload model
                    attribution: image.displayAttribution,
                    isPrimary: false
                }));
                
                allImages.push(...formattedDbImages);
            } catch (dbError) {
                console.error('Error fetching images from database:', dbError);
            }

            // Scan entity-specific gallery directories for images
            try {
                const entityGalleryDirs = await getAllEntityGalleryDirectories(true); // Get public entity galleries
                
                for (const galleryDir of entityGalleryDirs) {
                    try {
                        const images = await this.scanEntityDirectory(galleryDir);
                        allImages.push(...images);
                    } catch (error) {
                        console.log(`Error scanning entity gallery: ${galleryDir}`, error);
                    }
                }
            } catch (error) {
                console.error('Error getting entity gallery directories:', error);
            }            

            // Sort by upload time (newest first), then add randomization
            const sortedImages = allImages.sort((a, b) => b.uploadTime - a.uploadTime);
            
            // Update cache
            this.imageCache = sortedImages;
            this.cacheExpiry = Date.now() + this.cacheTimeout;

            return this.shuffleAndLimit(sortedImages, limit);

        } catch (error) {
            console.error('Error getting carousel images:', error);
            return [];
        }
    }

    /**
     * Scan a directory for images and collect metadata
     * @param {string} fullPath - Full filesystem path to scan
     * @param {string} relativePath - Relative path for URL generation
     * @returns {Promise<Array>} Array of image objects
     */
    async scanDirectory(fullPath, relativePath) {
        try {
            const files = await fs.readdir(fullPath);
            const images = [];

            for (const file of files) {
                const filePath = join(fullPath, file);
                const ext = extname(file).toLowerCase();
                
                // Only include supported image files
                if (this.supportedExtensions.includes(ext)) {
                    try {
                        const stats = await fs.stat(filePath);
                        
                        // Skip very small files (likely thumbnails or invalid images)
                        if (stats.size < 5000) continue;
                        
                        const imageObject = {
                            filename: file,
                            url: `${this.publicPath}/${relativePath}/${file}`,
                            uploadTime: stats.mtime.getTime(),
                            size: stats.size,
                            type: this.getImageType(relativePath),
                            source: this.getImageSource(relativePath)
                        };

                        images.push(imageObject);
                    } catch (statError) {
                        console.log(`Could not stat file ${filePath}:`, statError.message);
                    }
                }
            }

            return images;
        } catch (error) {
            console.error(`Error scanning directory ${fullPath}:`, error);
            return [];
        }
    }

    /**
     * Scan an entity-specific gallery directory for images
     * @param {Object} galleryInfo - Gallery directory information from getAllEntityGalleryDirectories
     * @returns {Promise<Array>} Array of image objects with entity metadata
     */
    async scanEntityDirectory(galleryInfo) {
        try {
            const fullPath = join(this.uploadsPath, galleryInfo.relativePath);
            const files = await fs.readdir(fullPath);
            const images = [];

            for (const file of files) {
                const filePath = join(fullPath, file);
                const ext = extname(file).toLowerCase();
                
                // Only include supported image files
                if (this.supportedExtensions.includes(ext)) {
                    try {
                        const stats = await fs.stat(filePath);
                        
                        // Skip very small files (likely thumbnails or invalid images)
                        if (stats.size < 5000) continue;
                        
                        const imageObject = {
                            filename: file,
                            url: `${this.publicPath}/${galleryInfo.relativePath}/${file}`,
                            uploadTime: stats.mtime.getTime(),
                            size: stats.size,
                            type: 'gallery', // Entity galleries are always gallery type
                            source: galleryInfo.entityType, // Use entity type as source
                            entityId: galleryInfo.entityId,
                            entityName: galleryInfo.entityName || `${galleryInfo.entityType} ${galleryInfo.entityId}`,
                            isPublic: galleryInfo.isPublic
                        };

                        images.push(imageObject);
                    } catch (statError) {
                        console.log(`Could not stat file ${filePath}:`, statError.message);
                    }
                }
            }

            return images;
        } catch (error) {
            console.error(`Error scanning entity directory ${galleryInfo.relativePath}:`, error);
            return [];
        }
    }

    /**
     * Determine image type from path
     * @param {string} relativePath - Relative path of the image
     * @returns {string} Image type (gallery, promo, etc.)
     */
    getImageType(relativePath) {
        // Handle entity-specific directory paths (uploads/carnival/123/gallery)
        if (relativePath.includes('/gallery')) return 'gallery';
        if (relativePath.includes('/promo')) return 'promotional';
        
        // Handle legacy flat paths
        if (relativePath.includes('/gallery/')) return 'gallery';
        if (relativePath.includes('/promo/')) return 'promotional';
        
        return 'general';
    }

    /**
     * Determine image source from path
     * @param {string} relativePath - Relative path of the image
     * @returns {string} Image source (carnival, club, sponsor)
     */
    getImageSource(relativePath) {
        // Handle entity-specific directory paths first (uploads/carnival/123/gallery or uploads/club/456/gallery)
        if (relativePath.includes('uploads/carnival/') || relativePath.includes('/carnival/')) return 'carnival';
        if (relativePath.includes('uploads/club/') || relativePath.includes('/club/')) return 'club';
        if (relativePath.includes('uploads/sponsor/') || relativePath.includes('/sponsor/')) return 'sponsor';
        
        // Handle legacy flat directory paths
        if (relativePath.includes('/carnival/')) return 'carnival';
        if (relativePath.includes('/club/')) return 'club';
        if (relativePath.includes('/sponsor/')) return 'sponsor';
        
        return 'unknown';
    }

    /**
     * Shuffle images with bias towards recent uploads
     * @param {Array} images - Array of image objects
     * @param {number} limit - Maximum number to return
     * @returns {Array} Shuffled and limited array
     */
    shuffleAndLimit(images, limit) {
        if (images.length === 0) return [];

        // Create weighted array favoring recent images
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        
        const weightedImages = images.map(image => {
            const age = now - image.uploadTime;
            const recencyWeight = Math.max(0, 1 - (age / maxAge)); // 0-1 based on age
            const finalWeight = Math.max(0.1, recencyWeight); // Minimum weight of 0.1
            
            return {
                ...image,
                weight: finalWeight
            };
        });

        // Weighted random selection
        const selected = [];
        const availableImages = [...weightedImages];
        
        while (selected.length < limit && availableImages.length > 0) {
            const totalWeight = availableImages.reduce((sum, img) => sum + img.weight, 0);
            const random = Math.random() * totalWeight;
            
            let currentWeight = 0;
            let selectedIndex = 0;
            
            for (let i = 0; i < availableImages.length; i++) {
                currentWeight += availableImages[i].weight;
                if (random <= currentWeight) {
                    selectedIndex = i;
                    break;
                }
            }
            
            selected.push(availableImages[selectedIndex]);
            availableImages.splice(selectedIndex, 1);
        }

        return selected;
    }

    /**
     * Clear the image cache (useful for testing or manual refresh)
     */
    clearCache() {
        this.imageCache = null;
        this.cacheExpiry = null;
    }

    /**
     * Extract filename from URL
     * @param {string} url - Image URL
     * @returns {string} Filename
     */
    extractFilename(url) {
        return url.split('/').pop() || 'unknown';
    }

    /**
     * Get statistics about available images
     * @returns {Promise<Object>} Statistics object
     */
    async getImageStats() {
        try {
            const allImages = await this.getCarouselImages(1000); // Get all images for stats
            
            const stats = {
                total: allImages.length,
                bySource: {},
                byType: {},
                recentCount: 0,
                totalSize: 0,
                dbImages: 0,
                legacyImages: 0
            };

            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

            allImages.forEach(image => {
                // Count by source
                stats.bySource[image.source] = (stats.bySource[image.source] || 0) + 1;
                
                // Count by type
                stats.byType[image.type] = (stats.byType[image.type] || 0) + 1;
                
                // Count recent images
                if (image.uploadTime > sevenDaysAgo) {
                    stats.recentCount++;
                }
                
                // Total size
                stats.totalSize += image.size;

                // Count DB vs legacy images
                if (image.id) {
                    stats.dbImages++;
                } else {
                    stats.legacyImages++;
                }
            });

            return stats;
        } catch (error) {
            console.error('Error getting image stats:', error);
            return {
                total: 0,
                bySource: {},
                byType: {},
                recentCount: 0,
                totalSize: 0,
                dbImages: 0,
                legacyImages: 0
            };
        }
    }
}

export default new CarouselImageService();