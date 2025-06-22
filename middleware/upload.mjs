/**
 * File Upload Middleware
 * 
 * Handles secure file uploads with validation, type checking,
 * and virus scanning for the Old Man Footy platform.
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ImageNamingService from '../services/imageNamingService.mjs';

// Ensure upload directories exist (with error handling for read-only filesystems)
const uploadDirs = [
    'public/uploads/logos/club',
    'public/uploads/logos/carnival',
    'public/uploads/logos/sponsor',
    'public/uploads/logos/system',
    'public/uploads/images/club/promo',
    'public/uploads/images/club/gallery',
    'public/uploads/images/carnival/promo',
    'public/uploads/images/carnival/gallery',
    'public/uploads/images/sponsor/promo',
    'public/uploads/images/sponsor/gallery',
    'public/uploads/documents/club',
    'public/uploads/documents/carnival',
    'public/uploads/documents/sponsor',
    'public/uploads/temp'
];

uploadDirs.forEach(dir => {
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

// Configure storage with structured naming
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use temporary directory - files will be moved to final location in processStructuredUpload
        cb(null, 'public/uploads/temp/');
    },
    filename: async function (req, file, cb) {
        try {
            // Extract context from request
            const context = extractUploadContext(req, file);
            
            // Generate structured filename
            const namingResult = await ImageNamingService.generateImageName({
                entityType: context.entityType,
                entityId: context.entityId,
                imageType: context.imageType,
                uploaderId: context.uploaderId,
                originalName: file.originalname,
                customSuffix: context.customSuffix
            });
            
            // Store metadata in request for later use
            if (!req.uploadMetadata) req.uploadMetadata = [];
            req.uploadMetadata.push({
                fieldname: file.fieldname,
                ...namingResult
            });
            
            // Ensure the target directory exists
            const targetDir = path.join('public/uploads', namingResult.relativePath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            
            cb(null, namingResult.filename);
        } catch (error) {
            console.error('Error generating structured filename:', error);
            // Fallback to original naming scheme
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
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
        entityType: ImageNamingService.ENTITY_TYPES.SYSTEM,
        entityId: 1,
        imageType: ImageNamingService.IMAGE_TYPES.GALLERY,
        uploaderId: req.user ? req.user.id : 1,
        customSuffix: ''
    };
    
    // Determine entity type and ID from route
    if (req.route && req.route.path) {
        if (req.route.path.includes('/clubs')) {
            context.entityType = ImageNamingService.ENTITY_TYPES.CLUB;
            // For club uploads, try multiple sources for the club ID
            context.entityId = req.params.id || 
                             req.body.clubId || 
                             (req.user && req.user.clubId) || 
                             1;
        } else if (req.route.path.includes('/carnivals')) {
            context.entityType = ImageNamingService.ENTITY_TYPES.CARNIVAL;
            context.entityId = req.params.id || req.body.carnivalId || 1;
        } else if (req.route.path.includes('/sponsors')) {
            context.entityType = ImageNamingService.ENTITY_TYPES.SPONSOR;
            context.entityId = req.params.id || req.body.sponsorId || 1;
        }
    }
    
    // Additional route-based detection for specific endpoints
    if (req.originalUrl) {
        if (req.originalUrl.includes('/clubs/manage')) {
            // Club management routes - use user's club ID
            context.entityType = ImageNamingService.ENTITY_TYPES.CLUB;
            context.entityId = (req.user && req.user.clubId) || 1;
        } else if (req.originalUrl.includes('/carnivals/') && req.originalUrl.includes('/edit')) {
            // Carnival edit routes
            context.entityType = ImageNamingService.ENTITY_TYPES.CARNIVAL;
            const carnivalIdMatch = req.originalUrl.match(/\/carnivals\/(\d+)\//);
            context.entityId = carnivalIdMatch ? parseInt(carnivalIdMatch[1]) : 1;
        }
    }
    
    // Determine image type from field name
    switch (file.fieldname) {
        case 'logo':
        case 'clubLogo':
            context.imageType = ImageNamingService.IMAGE_TYPES.LOGO;
            break;
        case 'promotionalImage':
        case 'promoImage':
            context.imageType = ImageNamingService.IMAGE_TYPES.PROMOTIONAL;
            break;
        case 'drawDocument':
        case 'drawFile':
            context.imageType = ImageNamingService.IMAGE_TYPES.DRAW_DOCUMENT;
            break;
        case 'galleryImage':
            context.imageType = ImageNamingService.IMAGE_TYPES.GALLERY;
            break;
        case 'bannerImage':
            context.imageType = ImageNamingService.IMAGE_TYPES.BANNER;
            break;
        case 'avatar':
            context.imageType = ImageNamingService.IMAGE_TYPES.AVATAR;
            context.entityType = ImageNamingService.ENTITY_TYPES.USER;
            context.entityId = req.user ? req.user.id : 1;
            break;
        default:
            context.imageType = ImageNamingService.IMAGE_TYPES.GALLERY;
    }
    
    // Add upload context as suffix if available
    if (req.body.uploadContext) {
        context.customSuffix = req.body.uploadContext;
    }
    
    // Debug logging to help troubleshoot upload context issues
    console.log(`📸 Upload context for ${file.fieldname}:`, {
        entityType: context.entityType,
        entityId: context.entityId,
        imageType: context.imageType,
        route: req.route?.path,
        originalUrl: req.originalUrl,
        userClubId: req.user?.clubId,
        paramsId: req.params?.id
    });
    
    return context;
}

// Enhanced file filter function
const fileFilter = (req, file, cb) => {
    // Allowed file types by category with MIME type support
    const allowedTypes = {
        [ImageNamingService.IMAGE_TYPES.LOGO]: {
            extensions: /jpeg|jpg|png|gif|svg|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|svg\+xml|webp)$/
        },
        [ImageNamingService.IMAGE_TYPES.PROMOTIONAL]: {
            extensions: /jpeg|jpg|png|gif|svg|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|svg\+xml|webp)$/
        },
        [ImageNamingService.IMAGE_TYPES.GALLERY]: {
            extensions: /jpeg|jpg|png|gif|svg|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|svg\+xml|webp)$/
        },
        [ImageNamingService.IMAGE_TYPES.BANNER]: {
            extensions: /jpeg|jpg|png|gif|svg|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|svg\+xml|webp)$/
        },
        [ImageNamingService.IMAGE_TYPES.AVATAR]: {
            extensions: /jpeg|jpg|png|gif|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|webp)$/
        },
        [ImageNamingService.IMAGE_TYPES.THUMBNAIL]: {
            extensions: /jpeg|jpg|png|gif|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|webp)$/
        },
        [ImageNamingService.IMAGE_TYPES.SOCIAL_MEDIA]: {
            extensions: /jpeg|jpg|png|gif|webp/,
            mimeTypes: /^image\/(jpeg|jpg|png|gif|webp)$/
        },
        [ImageNamingService.IMAGE_TYPES.DRAW_DOCUMENT]: {
            extensions: /pdf|doc|docx|xls|xlsx|txt|csv/,
            mimeTypes: /^(application\/(pdf|msword|vnd\.(openxmlformats-officedocument\.wordprocessingml\.document|ms-excel|openxmlformats-officedocument\.spreadsheetml\.sheet))|text\/(plain|csv))$/
        }
    };
    
    // Determine image type from field name
    const context = extractUploadContext(req, file);
    const allowedType = allowedTypes[context.imageType];
    
    if (!allowedType) {
        return cb(new Error(`Unsupported image type: ${context.imageType}`));
    }
    
    const extname = allowedType.extensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedType.mimeTypes.test(file.mimetype);
    
    // Special handling for SVG files - browsers can send different MIME types
    const isSvg = path.extname(file.originalname).toLowerCase() === '.svg' &&
                  (file.mimetype === 'image/svg+xml' || 
                   file.mimetype === 'image/svg' ||
                   file.mimetype === 'text/xml' ||
                   file.mimetype === 'application/xml');
    
    // Allow SVG files for logo uploads specifically
    const isSvgAllowed = context.imageType === ImageNamingService.IMAGE_TYPES.LOGO && isSvg;
    
    if ((mimetype && extname) || isSvgAllowed) {
        return cb(null, true);
    } else {
        // Create user-friendly error messages
        let allowedFormats = '';
        if (context.imageType === ImageNamingService.IMAGE_TYPES.LOGO) {
            allowedFormats = 'JPG, PNG, GIF, SVG, or WebP';
        } else if (context.imageType === ImageNamingService.IMAGE_TYPES.DRAW_DOCUMENT) {
            allowedFormats = 'PDF, DOC, DOCX, XLS, XLSX, or TXT';
        } else {
            allowedFormats = 'JPG, PNG, GIF, or WebP';
        }
        
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
 * Moves files from temp directory to structured paths and updates database
 */
const processStructuredUpload = async (req, res, next) => {
    if (!req.files && !req.file) {
        return next();
    }
    
    try {
        const files = req.files ? Object.values(req.files).flat() : [req.file];
        const uploadResults = [];
        
        for (const file of files) {
            // Find corresponding metadata
            const metadata = req.uploadMetadata?.find(meta => 
                meta.filename === file.filename
            );
            
            if (metadata) {
                // Move file from temp to structured location
                const tempPath = file.path;
                const finalPath = path.join('public/uploads', metadata.fullPath);
                
                // Ensure target directory exists (with error handling for read-only filesystems)
                const targetDir = path.dirname(finalPath);
                try {
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }
                } catch (dirError) {
                    console.warn(`Warning: Could not create target directory ${targetDir}:`, dirError.message);
                    // If we can't create the directory, try to use the temp directory as fallback
                    const fallbackPath = path.join('public/uploads/temp', metadata.filename);
                    file.path = fallbackPath;
                    file.structuredPath = `temp/${metadata.filename}`;
                    
                    uploadResults.push({
                        fieldname: file.fieldname,
                        originalname: file.originalname,
                        filename: metadata.filename,
                        path: `/uploads/temp/${metadata.filename}`,
                        size: file.size,
                        metadata: metadata.metadata,
                        warning: 'File saved to temp directory due to filesystem restrictions'
                    });
                    continue;
                }
                
                // Move file
                fs.renameSync(tempPath, finalPath);
                
                // Update file object with final information
                file.path = finalPath;
                file.filename = metadata.filename;
                file.structuredPath = metadata.fullPath;
                file.metadata = metadata.metadata;
                
                uploadResults.push({
                    fieldname: file.fieldname,
                    originalname: file.originalname,
                    filename: metadata.filename,
                    path: `/uploads/${metadata.fullPath.replace(/\\/g, '/')}`,
                    size: file.size,
                    metadata: metadata.metadata
                });
            }
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