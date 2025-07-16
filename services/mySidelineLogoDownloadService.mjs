/**
 * MySideline Logo Download Service
 * 
 * Handles downloading club logos from MySideline URLs and storing them locally
 * using the project's image naming conventions.
 */

import https from 'https';
import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { URL } from 'url';
import ImageNamingService from './imageNamingService.mjs';

class MySidelineLogoDownloadService {
    constructor() {
        this.maxRetries = 3;
        this.timeoutMs = 10000; // 10 seconds
        this.maxFileSizeBytes = 5 * 1024 * 1024; // 5MB
        this.allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        this.systemUserId = 1; // System user ID for MySideline downloads
    }

    /**
     * Download a logo from MySideline URL and store it locally
     * 
     * @param {string} logoUrl - URL of the logo to download
     * @param {string} entityType - Type of entity (club, carnival, etc.)
     * @param {number} entityId - ID of the entity
     * @param {string} [imageType] - Type of image (defaults to logo)
     * @returns {Promise<Object>} Result object with success status and local path
     */
    async downloadLogo(logoUrl, entityType, entityId, imageType = ImageNamingService.IMAGE_TYPES.LOGO) {
        try {
            // Validate input parameters, and ignore default NRL Logo.
            if (!logoUrl 
                || typeof logoUrl !== 'string') {
                return {
                    success: false,
                    error: 'Invalid logo URL provided',
                    originalUrl: logoUrl
                };
            }

            // Parse and validate URL
            let parsedUrl;
            try {
                parsedUrl = new URL(logoUrl);
            } catch (urlError) {
                return {
                    success: false,
                    error: 'Invalid URL format',
                    originalUrl: logoUrl
                };
            }

            // Only allow HTTP/HTTPS protocols
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return {
                    success: false,
                    error: 'Only HTTP/HTTPS URLs are supported',
                    originalUrl: logoUrl
                };
            }

            console.log(`📥 Downloading logo from: ${logoUrl}`);

            // Download the image with retries
            const downloadResult = await this.downloadWithRetries(logoUrl);
            
            if (!downloadResult.success) {
                return {
                    success: false,
                    error: downloadResult.error,
                    originalUrl: logoUrl
                };
            }

            // Generate local filename using ImageNamingService (same as upload middleware)
            const extension = this.getFileExtension(logoUrl, downloadResult.contentType);
            const originalName = `mysideline-logo${extension}`;

            const namingResult = await ImageNamingService.generateImageName({
                entityType,
                entityId,
                imageType,
                uploaderId: this.systemUserId, // Use same system user ID as upload middleware
                originalName,
                customSuffix: 'mysideline'
            });

            // Follow same pattern as upload middleware - create temp file first, then move to final location
            const tempDir = path.join('uploads', 'temp');
            await fs.mkdir(tempDir, { recursive: true });
            
            // Write to temp location first (same as upload middleware)
            const tempFilePath = path.join(tempDir, namingResult.filename);
            await fs.writeFile(tempFilePath, downloadResult.data);

            // Ensure final upload directory exists
            const finalUploadPath = path.join('uploads', namingResult.relativePath);
            await fs.mkdir(finalUploadPath, { recursive: true });

            // Move from temp to final location (same as processStructuredUpload middleware)
            const finalFilePath = path.join(finalUploadPath, namingResult.filename);
            await fs.rename(tempFilePath, finalFilePath);

            // Generate the public URL for the stored image (same format as upload middleware)
            const publicUrl = `/uploads/${namingResult.fullPath.replace(/\\/g, '/')}`;

            console.log(`✅ Logo downloaded and stored: ${publicUrl}`);

            return {
                success: true,
                localPath: finalFilePath,
                publicUrl,
                filename: namingResult.filename,
                originalUrl: logoUrl,
                fileSize: downloadResult.data.length,
                contentType: downloadResult.contentType,
                metadata: namingResult.metadata,
                structuredPath: namingResult.fullPath
            };

        } catch (error) {
            console.error(`❌ Error downloading logo from ${logoUrl}:`, error.message);
            return {
                success: false,
                error: error.message,
                originalUrl: logoUrl
            };
        }
    }

    /**
     * Download file with retry logic
     * 
     * @private
     * @param {string} url - URL to download
     * @param {number} [attempt=1] - Current attempt number
     * @returns {Promise<Object>} Download result
     */
    async downloadWithRetries(url, attempt = 1) {
        try {
            const result = await this.downloadFile(url);
            return result;
        } catch (error) {
            if (attempt < this.maxRetries) {
                console.log(`⚠️  Download attempt ${attempt} failed, retrying... (${error.message})`);
                await this.delay(1000 * attempt); // Progressive delay
                return this.downloadWithRetries(url, attempt + 1);
            } else {
                throw error;
            }
        }
    }

    /**
     * Download a single file from URL
     * 
     * @private
     * @param {string} url - URL to download
     * @returns {Promise<Object>} Download result with data and metadata
     */
    downloadFile(url) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const request = client.get(url, {
                timeout: this.timeoutMs,
                headers: {
                    'User-Agent': 'Old-Man-Footy-Platform/1.0 (Logo Sync Service)',
                    'Accept': 'image/*,*/*;q=0.8',
                    'Accept-Encoding': 'identity' // Don't compress to avoid issues
                }
            }, (response) => {
                // Check for successful status codes
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                // Check content type
                const contentType = response.headers['content-type'] || '';
                if (!this.isValidImageContentType(contentType)) {
                    reject(new Error(`Invalid content type: ${contentType}`));
                    return;
                }

                // Check content length if provided
                const contentLength = parseInt(response.headers['content-length'] || '0', 10);
                if (contentLength > this.maxFileSizeBytes) {
                    reject(new Error(`File too large: ${contentLength} bytes (max: ${this.maxFileSizeBytes})`));
                    return;
                }

                const chunks = [];
                let totalSize = 0;

                response.on('data', (chunk) => {
                    totalSize += chunk.length;
                    
                    // Check size limit during download
                    if (totalSize > this.maxFileSizeBytes) {
                        request.destroy();
                        reject(new Error(`File too large: ${totalSize} bytes (max: ${this.maxFileSizeBytes})`));
                        return;
                    }
                    
                    chunks.push(chunk);
                });

                response.on('end', () => {
                    const data = Buffer.concat(chunks);
                    resolve({
                        success: true,
                        data,
                        contentType,
                        size: totalSize
                    });
                });

                response.on('error', (error) => {
                    reject(new Error(`Response error: ${error.message}`));
                });
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error(`Request timeout after ${this.timeoutMs}ms`));
            });

            request.on('error', (error) => {
                reject(new Error(`Request error: ${error.message}`));
            });

            // Set timeout
            request.setTimeout(this.timeoutMs);
        });
    }

    /**
     * Check if content type is a valid image type
     * 
     * @private
     * @param {string} contentType - MIME content type
     * @returns {boolean} True if valid image type
     */
    isValidImageContentType(contentType) {
        const validTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml'
        ];
        
        return validTypes.some(type => contentType.toLowerCase().includes(type));
    }

    /**
     * Determine file extension from URL or content type
     * 
     * @private
     * @param {string} url - Original URL
     * @param {string} contentType - MIME content type
     * @returns {string} File extension including dot
     */
    getFileExtension(url, contentType) {
        // First try to get extension from URL
        const urlExt = path.extname(new URL(url).pathname).toLowerCase();
        if (this.allowedExtensions.includes(urlExt)) {
            return urlExt;
        }

        // Fallback to content type mapping
        const contentTypeMap = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg'
        };

        for (const [mimeType, ext] of Object.entries(contentTypeMap)) {
            if (contentType.toLowerCase().includes(mimeType)) {
                return ext;
            }
        }

        // Default fallback
        return '.jpg';
    }

    /**
     * Utility method to add delays
     * 
     * @private
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after the delay
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Bulk download logos for multiple entities
     * 
     * @param {Array} logoRequests - Array of logo download requests
     * @returns {Promise<Array>} Array of download results
     */
    async downloadLogos(logoRequests) {
        const results = [];
        
        console.log(`📥 Starting bulk logo download for ${logoRequests.length} logos...`);
        
        for (let i = 0; i < logoRequests.length; i++) {
            const request = logoRequests[i];
            console.log(`📥 Downloading logo ${i + 1}/${logoRequests.length}...`);
            
            const result = await this.downloadLogo(
                request.logoUrl,
                request.entityType,
                request.entityId,
                request.imageType
            );
            
            results.push({
                ...result,
                requestIndex: i,
                originalRequest: request
            });
            
            // Small delay between downloads to be respectful
            if (i < logoRequests.length - 1) {
                await this.delay(500);
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Bulk logo download completed: ${successCount}/${logoRequests.length} successful`);
        
        return results;
    }

    /**
     * Check if a logo URL is already downloaded and stored locally
     * 
     * @param {string} logoUrl - URL to check
     * @param {string} entityType - Type of entity
     * @param {number} entityId - ID of the entity
     * @returns {Promise<Object|null>} Existing logo info or null
     */
    async findExistingLogo(logoUrl, entityType, entityId) {
        try {
            const existingImages = await ImageNamingService.getEntityImages(
                entityType, 
                entityId, 
                ImageNamingService.IMAGE_TYPES.LOGO
            );

            // Look for MySideline logos by checking custom suffix
            const mySidelineLogos = existingImages.filter(img => 
                img.customSuffix && img.customSuffix.includes('mysideline')
            );

            return mySidelineLogos.length > 0 ? mySidelineLogos[0] : null;
        } catch (error) {
            console.error('Error checking for existing logo:', error);
            return null;
        }
    }
}

export default MySidelineLogoDownloadService;