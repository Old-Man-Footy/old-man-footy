const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['uploads/logos', 'uploads/images', 'uploads/documents'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'uploads/';
        
        // Determine upload directory based on field name
        if (file.fieldname === 'logo') {
            uploadPath += 'logos/';
        } else if (file.fieldname === 'promotionalImage') {
            uploadPath += 'images/';
        } else if (file.fieldname === 'drawDocument') {
            uploadPath += 'documents/';
        } else {
            uploadPath += 'misc/';
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = {
        logo: /jpeg|jpg|png|gif/,
        promotionalImage: /jpeg|jpg|png|gif/,
        drawDocument: /pdf|doc|docx|xls|xlsx/
    };
    
    const extname = allowedTypes[file.fieldname]?.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes[file.fieldname]?.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${file.fieldname}. Please check allowed formats.`));
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: fileFilter
});

// Export different upload configurations
module.exports = {
    // For carnival creation/editing (multiple files)
    carnivalUpload: upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'promotionalImage', maxCount: 3 },
        { name: 'drawDocument', maxCount: 5 }
    ]),
    
    // For single logo upload
    logoUpload: upload.single('logo'),
    
    // For single image upload
    imageUpload: upload.single('promotionalImage'),
    
    // For single document upload
    documentUpload: upload.single('drawDocument'),
    
    // Error handling middleware
    handleUploadError: (error, req, res, next) => {
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                req.flash('error', 'File too large. Maximum size is 5MB.');
            } else {
                req.flash('error', 'File upload error: ' + error.message);
            }
        } else if (error) {
            req.flash('error', error.message);
        }
        next();
    }
};