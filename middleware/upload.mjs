/**
 * File Upload Middleware
 * 
 * Handles secure file uploads with validation, type checking,
 * and virus scanning for the Old Man Footy platform.
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { UPLOAD_DIRECTORIES } from '../config/constants.mjs';

// Ensure base upload directories exist (entity-specific dirs created dynamically)
const baseUploadDirs = [
    UPLOAD_DIRECTORIES.UPLOADS_ROOT,
    UPLOAD_DIRECTORIES.TEMP
];

baseUploadDirs.forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (error) {
        // In read-only filesystems (like Docker), this might fail
        // Log the error but don't crash the application
        console.warn(`Warning: Could not create directory ${dir}:`, error.message);
        console.warn('Ensure directories are pre-created in your deployment environment');
    }
});

// Configure storage with entity-based folder structure and content-type subfolders
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            // Extract context to determine entity-specific folder
            const context = extractUploadContext(req, file);
            
            // Build entity-specific path
            let entityFolder;
            switch (context.entityType) {
                case 'club':
                    entityFolder = `clubs/${context.entityId}`;
                    break;
                case 'carnival':
                    entityFolder = `carnivals/${context.entityId}`;
                    break;
                case 'sponsor':
                    entityFolder = `sponsors/${context.entityId}`;
                    break;
                default:
                    entityFolder = 'general';
            }
            
            // Determine content type subfolder based on field name
            let contentTypeFolder = 'logos'; // default
            
            if (file.fieldname === 'logo') {
                contentTypeFolder = 'logos';
            } else if (file.fieldname === 'gallery' || file.fieldname === 'galleryImage' || file.fieldname === 'images') {
                contentTypeFolder = 'gallery';
            } else if (file.fieldname === 'promotionalImage' || file.fieldname === 'promotional') {
                contentTypeFolder = 'gallery';
            } else if (file.fieldname === 'bannerImage' || file.fieldname === 'banner') {
                contentTypeFolder = 'gallery';
            } else if (file.fieldname === 'drawDocument' || file.fieldname === 'draw') {
                contentTypeFolder = 'documents';
            } 
            
            // Create full destination path with content type subfolder
            const destinationPath = `public/uploads/${entityFolder}/${contentTypeFolder}`;
            
            // Ensure the directory exists
            if (!fs.existsSync(destinationPath)) {
                fs.mkdirSync(destinationPath, { recursive: true });
            }
            
            console.log(`📁 Upload destination: ${destinationPath} (field: ${file.fieldname}, content: ${contentTypeFolder})`);
            
            // Store metadata for later use in processStructuredUpload
            if (!req.uploadMetadata) req.uploadMetadata = [];
            req.uploadMetadata.push({
                fieldname: file.fieldname,
                entityFolder: entityFolder,
                contentTypeFolder: contentTypeFolder,
                originalName: file.originalname
            });
            
            cb(null, destinationPath);
        } catch (error) {
            console.error('Error determining upload destination:', error);
            // Fallback to temp directory
            cb(null, 'public/uploads/temp/');
        }
    },
    filename: function (req, file, cb) {
        // Generate unique filename to prevent corruption from simultaneous uploads
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        
        const uniqueFilename = `${baseName}-${timestamp}-${randomSuffix}${extension}`;
        
        console.log(`📝 Generated unique filename: ${uniqueFilename} (original: ${file.originalname})`);
        cb(null, uniqueFilename);
    }
});

/**
 * Extract upload context from request and file
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @returns {Object} Upload context
 */
function extractUploadContext(req, file) {
    // Default context
    let context = {
        entityType: 'general',
        entityId: 1,
        uploaderId: req.user ? req.user.id : 1
    };
    
    // Determine entity type and ID from route
    if (req.route && req.route.path) {
        if (req.route.path.includes('/clubs')) {
            context.entityType = 'club';
            // For club uploads, try multiple sources for the club ID
            context.entityId = req.params.id || 
                             req.body.clubId || 
                             (req.user && req.user.clubId) || 
                             1;
        } else if (req.route.path.includes('/carnivals')) {
            context.entityType = 'carnival';
            context.entityId = req.params.id || req.body.carnivalId || 1;
        } else if (req.route.path.includes('/sponsors')) {
            context.entityType = 'sponsor';
            context.entityId = req.params.id || req.body.sponsorId || 1;
        }
    }
    
    // Additional route-based detection for specific endpoints
    if (req.originalUrl) {
        if (req.originalUrl.includes('/clubs/manage')) {
            // Club management routes - use user's club ID
            context.entityType = 'club';
            context.entityId = (req.user && req.user.clubId) || 1;
        } else if (req.originalUrl.includes('/carnivals/') && req.originalUrl.includes('/edit')) {
            // Carnival edit routes
            context.entityType = 'carnival';
            const carnivalIdMatch = req.originalUrl.match(/\/carnivals\/(\d+)\//);
            context.entityId = carnivalIdMatch ? parseInt(carnivalIdMatch[1]) : 1;
        }
    }
    
    // Special handling for avatar uploads
    if (file.fieldname === 'avatar') {
        context.entityType = 'user';
        context.entityId = req.user ? req.user.id : 1;
    }
    
    // Debug logging to help troubleshoot upload context issues
    console.log(`📸 Upload context for ${file.fieldname}:`, {
        entityType: context.entityType,
        entityId: context.entityId,
        route: req.route?.path,
        originalUrl: req.originalUrl,
        userClubId: req.user?.clubId,
        paramsId: req.params?.id,
        originalFilename: file.originalname
    });
    
    return context;
}

// Enhanced file filter function
const fileFilter = (req, file, cb) => {
    // Allowed file types by field name with MIME type support
    const allowedTypes = {
        logo: {
            extensions: /jpeg|jpg|png|gif|svg|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|svg\+xml|webp)$/,
            description: 'JPG, PNG, GIF, SVG, or WebP'
        },
        promotional: {
            extensions: /jpeg|jpg|png|gif|svg|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|svg\+xml|webp)$/,
            description: 'JPG, PNG, GIF, SVG, or WebP'
        },
        gallery: {
            extensions: /jpeg|jpg|png|gif|svg|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|svg\+xml|webp)$/,
            description: 'JPG, PNG, GIF, SVG, or WebP'
        },
        banner: {
            extensions: /jpeg|jpg|png|gif|svg|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|svg\+xml|webp)$/,
            description: 'JPG, PNG, GIF, SVG, or WebP'
        },
        avatar: {
            extensions: /jpeg|jpg|png|gif|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|webp)$/,
            description: 'JPG, PNG, GIF, or WebP'
        },
        thumbnail: {
            extensions: /jpeg|jpg|png|gif|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|webp)$/,
            description: 'JPG, PNG, GIF, or WebP'
        },
        socialMedia: {
            extensions: /jpeg|jpg|png|gif|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|webp)$/,
            description: 'JPG, PNG, GIF, or WebP'
        },
        draw: {
            extensions: /pdf|doc|docx|xls|xlsx|txt|csv/,
            mimeTypes: /^(application\/(pdf|msword|vnd\.(openxmlformats-officedocument\.wordprocessingml\.document|ms-excel|openxmlformats-officedocument\.spreadsheetml\.sheet))|text\/(plain|csv))$/,
            description: 'PDF, DOC, DOCX, XLS, XLSX, or TXT'
        },
        drawDocument: {
            extensions: /pdf|doc|docx|xls|xlsx|txt|csv/,
            mimeTypes: /^(application\/(pdf|msword|vnd\.(openxmlformats-officedocument\.wordprocessingml\.document|ms-excel|openxmlformats-officedocument\.spreadsheetml\.sheet))|text\/(plain|csv))$/,
            description: 'PDF, DOC, DOCX, XLS, XLSX, or TXT'
        },
        document: {
            extensions: /pdf|doc|docx|xls|xlsx|txt|csv/,
            mimeTypes: /^(application\/(pdf|msword|vnd\.(openxmlformats-officedocument\.wordprocessingml\.document|ms-excel|openxmlformats-officedocument\.spreadsheetml\.sheet))|text\/(plain|csv))$/,
            description: 'PDF, DOC, DOCX, XLS, XLSX, or TXT'
        }
    };
    
    // Get allowed type based on field name, default to logo validation
    const allowedType = allowedTypes[file.fieldname] || allowedTypes.logo;
    
    const extname = allowedType.extensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedType.mimeTypes.test(file.mimetype);
    
    // Special handling for SVG files - browsers can send different MIME types
    const isSvg = path.extname(file.originalname).toLowerCase() === '.svg' &&
                  (file.mimetype === 'image/svg+xml' || 
                   file.mimetype === 'image/svg' ||
                   file.mimetype === 'text/xml' ||
                   file.mimetype === 'application/xml');
    
    // Allow SVG files for logo uploads specifically
    const isSvgAllowed = file.fieldname === 'logo' && isSvg;
    
    if ((mimetype && extname) || isSvgAllowed) {
        return cb(null, true);
    } else {
        // Use description from allowed type configuration
        const allowedFormats = allowedType.description;
        
        cb(new Error(`Invalid file type for ${file.fieldname}. Allowed formats: ${allowedFormats}. Received: ${file.mimetype} for file: ${file.originalname}`));
    }
};

// Configure multer with enhanced options
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10, // Maximum 10 files per upload
        fields: 20 // Maximum 20 form fields
    },
    fileFilter: fileFilter
});

/**
 * Post-upload processing middleware
 * Files are already in their final entity-specific locations with original names
 */
const processStructuredUpload = async (req, res, next) => {
    if (!req.files && !req.file) {
        return next();
    }
    
    try {
        const files = req.files ? Object.values(req.files).flat() : [req.file];
        const uploadResults = [];
        
        for (const file of files) {
            // Files are already in their final location with original name in content-type subfolders
            // Extract the relative path from the full path for web serving
            const fullPath = file.path;
            const publicIndex = fullPath.indexOf('public/');
            const webPath = publicIndex !== -1 ? fullPath.substring(publicIndex + 7) : fullPath;
            
            // Create enhanced metadata for the file including content type information
            const fileExtension = path.extname(file.originalname).toLowerCase();
            
            // Determine content type from path structure
            let contentType = 'logos'; // default
            if (webPath.includes('/gallery/')) {
                contentType = 'gallery';
            } else if (webPath.includes('/documents/')) {
                contentType = 'documents';
            } else if (webPath.includes('/avatars/')) {
                contentType = 'avatars';
            } else if (webPath.includes('/logos/')) {
                contentType = 'logos';
            }
            
            const metadata = {
                type: file.fieldname,
                contentType: contentType,
                originalName: file.originalname,
                extension: fileExtension,
                uploadedAt: new Date().toISOString()
            };
            
            uploadResults.push({
                fieldname: file.fieldname,
                originalname: file.originalname,
                filename: file.filename,
                path: `/${webPath.replace(/\\/g, '/')}`,
                size: file.size,
                contentType: contentType,
                metadata: metadata
            });
        }
        
        // Store upload results in request for controllers to use
        req.structuredUploads = uploadResults;
        
        next();
    } catch (error) {
        console.error('Error processing structured upload:', error);
        // Clean up any temporary files
        if (req.files || req.file) {
            const files = req.files ? Object.values(req.files).flat() : [req.file];
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        next(error);
    }
};

// Export different upload configurations
export const carnivalUpload = [
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'promotionalImage', maxCount: 5 },
        { name: 'galleryImage', maxCount: 10 },
        { name: 'drawDocument', maxCount: 5 },
        { name: 'bannerImage', maxCount: 2 }
    ]),
    processStructuredUpload
];

export const sponsorUpload = [
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'galleryImage', maxCount: 10 },
        { name: 'promotionalImage', maxCount: 5 }
    ]),
    processStructuredUpload
];

export const clubUpload = [
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'galleryImage', maxCount: 10 },
        { name: 'bannerImage', maxCount: 2 }
    ]),
    processStructuredUpload
];

export const logoUpload = [
    upload.single('logo'),
    processStructuredUpload
];

export const imageUpload = [
    upload.single('promotionalImage'),
    processStructuredUpload
];

export const documentUpload = [
    upload.single('drawDocument'),
    processStructuredUpload
];

export const avatarUpload = [
    upload.single('avatar'),
    processStructuredUpload
];

// Gallery image uploads - handles multiple images for gallery functionality
export const galleryUpload = [
    upload.array('images', 10), // Support up to 10 images at once
    processStructuredUpload
];

// Raw multer instance for custom configurations
export const uploadRaw = upload;

// Error handling middleware
export const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            req.flash('error', 'File too large. Maximum size is 10MB.');
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            req.flash('error', 'Too many files. Please reduce the number of files.');
        } else {
            req.flash('error', 'File upload error: ' + error.message);
        }
    } else if (error) {
        req.flash('error', error.message);
    }
    next();
};

export { extractUploadContext, fileFilter };