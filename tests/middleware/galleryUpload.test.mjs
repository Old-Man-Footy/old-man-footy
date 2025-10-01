import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { galleryUpload, handleGalleryUploadError, validateGalleryUploadRequest, galleryFileFilter } from '../../middleware/galleryUpload.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Gallery Upload Middleware', () => {
  let mockReq, mockRes, mockNext, mockFile;
  
  beforeEach(() => {
    mockReq = {
      body: { entityType: 'carnivals', entityId: '1' },
      user: { id: 1 }
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
    mockFile = {
      fieldname: 'image',
      originalname: 'test-image.jpg',
      mimetype: 'image/jpeg',
      path: '/fake/path/test-image.jpg'
    };
  });

  describe('validateGalleryUploadRequest', () => {
    it('should pass validation with valid carnival request', () => {
      validateGalleryUploadRequest(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass validation with valid club request', () => {
      mockReq.body = { entityType: 'clubs', entityId: '2' };
      validateGalleryUploadRequest(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid entity type', () => {
      mockReq.body = { entityType: 'invalid', entityId: '1' };
      validateGalleryUploadRequest(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid entity type. Must be "carnivals" or "clubs".'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing entity ID', () => {
      mockReq.body = { entityType: 'carnivals' };
      validateGalleryUploadRequest(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Entity ID is required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid entity ID format', () => {
      mockReq.body = { entityType: 'carnivals', entityId: 'abc' };
      validateGalleryUploadRequest(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Entity ID must be a valid number.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('galleryFileFilter', () => {
    it('should accept valid JPEG image', (done) => {
      const file = { ...mockFile, mimetype: 'image/jpeg', originalname: 'test.jpg' };
      galleryFileFilter(mockReq, file, (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should accept valid PNG image', (done) => {
      const file = { ...mockFile, mimetype: 'image/png', originalname: 'test.png' };
      galleryFileFilter(mockReq, file, (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should accept valid GIF image', (done) => {
      const file = { ...mockFile, mimetype: 'image/gif', originalname: 'test.gif' };
      galleryFileFilter(mockReq, file, (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should accept valid WebP image', (done) => {
      const file = { ...mockFile, mimetype: 'image/webp', originalname: 'test.webp' };
      galleryFileFilter(mockReq, file, (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should accept SVG with standard MIME type', (done) => {
      const file = { ...mockFile, mimetype: 'image/svg+xml', originalname: 'test.svg' };
      galleryFileFilter(mockReq, file, (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should accept SVG with alternative MIME type', (done) => {
      const file = { ...mockFile, mimetype: 'text/xml', originalname: 'test.svg' };
      galleryFileFilter(mockReq, file, (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should reject non-image files', (done) => {
      const file = { ...mockFile, mimetype: 'application/pdf', originalname: 'test.pdf' };
      galleryFileFilter(mockReq, file, (err, result) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('Invalid file type');
        expect(err.code).toBe('INVALID_FILE_TYPE');
        expect(result).toBe(false);
        done();
      });
    });

    it('should reject files with invalid extension', (done) => {
      const file = { ...mockFile, mimetype: 'image/jpeg', originalname: 'test.exe' };
      galleryFileFilter(mockReq, file, (err, result) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('Invalid file type');
        expect(result).toBe(false);
        done();
      });
    });
  });

  describe('handleGalleryUploadError', () => {
    it('should handle file size limit errors', () => {
      const error = new Error('File too large');
      error.code = 'LIMIT_FILE_SIZE';
      handleGalleryUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'File size exceeds limit (10MB maximum)'
      });
    });

    it('should handle file count limit errors', () => {
      const error = new Error('Too many files');
      error.code = 'LIMIT_FILE_COUNT';
      handleGalleryUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many files uploaded'
      });
    });

    it('should handle invalid file type errors', () => {
      const error = new Error('Invalid file type');
      error.code = 'INVALID_FILE_TYPE';
      handleGalleryUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid file type'
      });
    });

    it('should handle generic upload errors', () => {
      const error = new Error('Generic upload error');
      handleGalleryUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Upload failed: Generic upload error'
      });
    });

    it('should pass through non-upload errors', () => {
      const error = new Error('Some other error');
      error.isUploadError = false;
      handleGalleryUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('galleryUpload multer instance', () => {
    it('should be defined and have expected methods', () => {
      expect(galleryUpload).toBeDefined();
      expect(typeof galleryUpload.single).toBe('function');
      expect(typeof galleryUpload.array).toBe('function');
    });
  });
});
