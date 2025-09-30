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
    async downloadLogo(logoUrl, entityType, entityId, imageType = 'logo') {
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

            // Generate folder-based path: carnivals/{id}/logos/mysideline-logo.ext
            const extension = this.getFileExtension(logoUrl, downloadResult.contentType);
            const filename = `mysideline-logo${extension}`;
            
            // Create folder structure: carnivals/{entityId}/logos/
            const entityFolder = `carnivals/${entityId}/logos`;
            const fullUploadPath = path.join('public/uploads', entityFolder);
            
            // Ensure upload directory exists
            await fs.mkdir(fullUploadPath, { recursive: true });
            
            // Write directly to final location (no temp file needed for MySideline downloads)
            const finalFilePath = path.join(fullUploadPath, filename);
            await fs.writeFile(finalFilePath, downloadResult.data);

            // Generate the public URL for the stored image
            const publicUrl = `/uploads/${entityFolder}/${filename}`.replace(/\\/g, '/');

            console.log(`✅ Logo downloaded and stored: ${publicUrl}`);

            return {
                success: true,
                localPath: finalFilePath,
                publicUrl,
                filename,
                originalUrl: logoUrl,
                fileSize: downloadResult.data.length,
                contentType: downloadResult.contentType,
                folderPath: entityFolder
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
        // Input validation following security-first principles
        if (!Array.isArray(logoRequests)) {
            console.error('❌ Invalid input: logoRequests must be an array');
            return [];
        }

        if (logoRequests.length === 0) {
            console.log('📥 No logo download requests provided');
            return [];
        }

        const results = [];
        
        console.log(`📥 Starting bulk logo download for ${logoRequests.length} logo${logoRequests.length === 1 ? '' : 's'}...`);
        
        for (let i = 0; i < logoRequests.length; i++) {
            const request = logoRequests[i];
            
            try {
                // Validate individual request structure
                if (!request || typeof request !== 'object') {
                    console.error(`❌ Invalid request ${i + 1}: Request must be an object`);
                    results.push({
                        success: false,
                        error: 'Invalid request object',
                        requestIndex: i,
                        originalRequest: request
                    });
                    continue;
                }

                const { logoUrl, entityType, entityId, imageType } = request;

                // Validate required parameters with detailed error messages
                if (!logoUrl) {
                    console.error(`❌ Request ${i + 1}: Missing logoUrl`);
                    results.push({
                        success: false,
                        error: 'Missing logoUrl parameter',
                        requestIndex: i,
                        originalRequest: request
                    });
                    continue;
                }

                if (!entityType) {
                    console.error(`❌ Request ${i + 1}: Missing entityType`);
                    results.push({
                        success: false,
                        error: 'Missing entityType parameter',
                        requestIndex: i,
                        originalRequest: request
                    });
                    continue;
                }

                if (!entityId) {
                    console.error(`❌ Request ${i + 1}: Missing entityId`);
                    results.push({
                        success: false,
                        error: 'Missing entityId parameter',
                        requestIndex: i,
                        originalRequest: request
                    });
                    continue;
                }

                console.log(`📥 Downloading logo ${i + 1}/${logoRequests.length} for ${entityType} ${entityId}...`);
                console.log(`🔗 URL: ${logoUrl}`);
                
                const result = await this.downloadLogo(
                    logoUrl,
                    entityType,
                    entityId,
                    imageType
                );
                
                // Add request metadata to result for better tracing
                results.push({
                    ...result,
                    requestIndex: i,
                    originalRequest: request,
                    entityType,
                    entityId
                });

                // Log individual result
                if (result.success) {
                    console.log(`✅ Logo ${i + 1} downloaded successfully: ${result.publicUrl}`);
                } else {
                    console.error(`❌ Logo ${i + 1} download failed: ${result.error}`);
                }
                
            } catch (error) {
                console.error(`❌ Unexpected error processing logo request ${i + 1}:`, error.message);
                results.push({
                    success: false,
                    error: `Unexpected error: ${error.message}`,
                    requestIndex: i,
                    originalRequest: request
                });
            }
            
            // Small delay between downloads to be respectful to remote servers
            if (i < logoRequests.length - 1) {
                await this.delay(500);
            }
        }
        
        // Provide comprehensive summary following project logging standards
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        
        if (successCount === results.length) {
            console.log(`✅ Bulk logo download completed successfully: ${successCount}/${logoRequests.length} logos downloaded`);
        } else if (successCount > 0) {
            console.warn(`⚠️ Bulk logo download completed with issues: ${successCount}/${logoRequests.length} successful, ${failureCount} failed`);
        } else {
            console.error(`❌ Bulk logo download failed: 0/${logoRequests.length} successful`);
        }
        
        // Log failure summary for debugging
        if (failureCount > 0) {
            const failureReasons = results
                .filter(r => !r.success)
                .map(r => `${r.entityType || 'unknown'} ${r.entityId || 'unknown'}: ${r.error}`)
                .join('; ');
            console.error(`📋 Failure summary: ${failureReasons}`);
        }
        
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
            // Check for mysideline logo in the folder structure
            const entityFolder = `${entityType}s/${entityId}/logos`;
            const folderPath = path.join('public', 'uploads', entityFolder);
            
            try {
                const files = await fs.readdir(folderPath);
                const mysidelineFile = files.find(file => file.startsWith('mysideline-logo.'));
                
                if (mysidelineFile) {
                    const filePath = path.join(folderPath, mysidelineFile);
                    const stats = await fs.stat(filePath);
                    return {
                        localPath: filePath,
                        publicUrl: `/uploads/${entityFolder}/${mysidelineFile}`.replace(/\\/g, '/'),
                        fileSize: stats.size,
                        filename: mysidelineFile,
                        folderPath: entityFolder
                    };
                }
            } catch (dirError) {
                // Directory doesn't exist or can't be read
                return null;
            }
            
            return null;
        } catch (error) {
            console.error('Error checking for existing logo:', error);
            return null;
        }
    }
}

export default MySidelineLogoDownloadService;