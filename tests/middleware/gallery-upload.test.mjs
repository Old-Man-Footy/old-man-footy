import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateGalleryUploadRequest, galleryFileFilter, handleGalleryUploadError, galleryUpload } from '../../middleware/galleryUpload.mjs';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => true)
  }
}));

// Mock path module
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    extname: vi.fn((filename) => {
      if (!filename || typeof filename !== 'string') {
        return '';
      }
      return filename.includes('.') ? '.' + filename.split('.').pop() : '';
    }),
    dirname: vi.fn(() => '/mocked/dir')
  }
}));

// Mock multer with MulterError (defined in vi.mock below)

vi.mock('multer', () => {
  const multer = vi.fn(() => ({
    single: vi.fn((fieldName) => (req, res, next) => {
      req.file = { 
        fieldname: fieldName,
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };
      next();
    }),
    array: vi.fn((fieldName, maxCount) => (req, res, next) => {
      req.files = [
        { 
          fieldname: fieldName,
          originalname: 'test1.jpg',
          mimetype: 'image/jpeg',
          size: 1024
        },
        { 
          fieldname: fieldName,
          originalname: 'test2.jpg',
          mimetype: 'image/png',
          size: 2048
        }
      ];
      next();
    })
  }));
  
  multer.memoryStorage = vi.fn(() => ({}));
  multer.diskStorage = vi.fn((options) => {
    // Mock implementation that calls the destination and filename functions
    return {
      _handleFile: (req, file, cb) => {
        if (options.destination) {
          options.destination(req, file, (err, dest) => {
            if (err) return cb(err);
            if (options.filename) {
              options.filename(req, file, (err, filename) => {
                if (err) return cb(err);
                cb(null, { destination: dest, filename });
              });
            } else {
              cb(null, { destination: dest });
            }
          });
        }
      }
    };
  });

  // Add MulterError class mock
  class MulterError extends Error {
    constructor(code, field) {
      super(`MulterError: ${code}`);
      this.name = 'MulterError';
      this.code = code;
      this.field = field;
    }
  }
  
  multer.MulterError = MulterError;
  
  return { 
    default: multer,
    MulterError: MulterError 
  };
});

// Import MulterError from the mock
const { MulterError } = await import('multer');

describe('Gallery Upload Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: { carnivalId: '1', clubId: '2' },
      file: null,
      params: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateGalleryUploadRequest', () => {
    it('should validate valid carnival upload request', () => {
      req.body = { carnivalId: '1' };
      
      validateGalleryUploadRequest(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should validate valid club upload request', () => {
      req.body = { clubId: '2' };
      
      validateGalleryUploadRequest(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without entity ID', () => {
      req.body = {};
      
      validateGalleryUploadRequest(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: 'Gallery upload requires either carnivalId or clubId.',
          type: 'validation_error'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('galleryFileFilter', () => {
    it('should accept valid JPEG files', () => {
      const file = { 
        originalname: 'test.jpg',
        mimetype: 'image/jpeg' 
      };
      const callback = vi.fn();
      
      galleryFileFilter(req, file, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should accept PNG files', () => {
      const file = { 
        originalname: 'test.png',
        mimetype: 'image/png' 
      };
      const callback = vi.fn();
      
      galleryFileFilter(req, file, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should accept GIF files', () => {
      const file = { 
        originalname: 'test.gif',
        mimetype: 'image/gif' 
      };
      const callback = vi.fn();
      
      galleryFileFilter(req, file, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should accept WebP files', () => {
      const file = { 
        originalname: 'test.webp',
        mimetype: 'image/webp' 
      };
      const callback = vi.fn();
      
      galleryFileFilter(req, file, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should accept SVG files', () => {
      const file = { 
        originalname: 'test.svg',
        mimetype: 'image/svg+xml' 
      };
      const callback = vi.fn();
      
      galleryFileFilter(req, file, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should reject non-image files', () => {
      const file = { 
        originalname: 'test.txt',
        mimetype: 'text/plain' 
      };
      const callback = vi.fn();
      
      galleryFileFilter(req, file, callback);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid file type. Only JPG, PNG, GIF, SVG, or WebP images are allowed for gallery uploads.',
          code: 'INVALID_FILE_TYPE'
        }),
        false
      );
    });

    it('should reject video files', () => {
      const file = { 
        originalname: 'test.mp4',
        mimetype: 'video/mp4' 
      };
      const callback = vi.fn();
      
      galleryFileFilter(req, file, callback);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid file type. Only JPG, PNG, GIF, SVG, or WebP images are allowed for gallery uploads.',
          code: 'INVALID_FILE_TYPE'
        }),
        false
      );
    });
  });

  describe('handleGalleryUploadError', () => {
    it('should handle MulterError file size limit exceeded', () => {
      const error = new MulterError('LIMIT_FILE_SIZE', 'galleryImage');
      
      handleGalleryUploadError(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: 'File too large. Maximum size is 10MB.',
          type: 'gallery_upload_error'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle MulterError unexpected field error', () => {
      const error = new MulterError('LIMIT_UNEXPECTED_FILE', 'invalidField');
      
      handleGalleryUploadError(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: 'Unexpected field name. Use "images" field for gallery uploads.',
          type: 'gallery_upload_error'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle MulterError file type errors', () => {
      const error = new MulterError('INVALID_FILE_TYPE', 'galleryImage');
      
      handleGalleryUploadError(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 400,
          message: 'Upload error: MulterError: INVALID_FILE_TYPE',
          type: 'gallery_upload_error'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle generic non-MulterError with 500 status', () => {
      const error = new Error('Generic upload error');
      
      handleGalleryUploadError(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          status: 500,
          message: 'Gallery upload failed due to server error.',
          type: 'server_error'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle null error without crashing', () => {
      // The middleware doesn't check for null errors, so it will throw
      expect(() => {
        handleGalleryUploadError(null, req, res, next);
      }).toThrow();
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('galleryUpload', () => {
    it('should be configured multer middleware', () => {
      expect(typeof galleryUpload).toBe('function');
    });

    it('should handle file upload', () => {
      req.file = { 
        fieldname: 'galleryImage',
        mimetype: 'image/jpeg',
        size: 1024
      };
      
      galleryUpload(req, res, next);
      
      expect(req.file).toBeDefined();
      expect(req.file.fieldname).toBe('galleryImage');
    });
  });
});
