import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { extractUploadContext, fileFilter, handleUploadError } from '/middleware/upload.mjs';

// Mock dependencies
vi.mock('/services/imageNamingService.mjs', () => ({
  default: {
    ENTITY_TYPES: {
      SYSTEM: 'system',
      CLUB: 'club',
      CARNIVAL: 'carnival',
      SPONSOR: 'sponsor',
      USER: 'user',
    },
    IMAGE_TYPES: {
      LOGO: 'logo',
      PROMOTIONAL: 'promotional',
      GALLERY: 'gallery',
      BANNER: 'banner',
      AVATAR: 'avatar',
      THUMBNAIL: 'thumbnail',
      SOCIAL_MEDIA: 'social_media',
      DRAW_DOCUMENT: 'draw_document',
    },
    generateImageName: vi.fn().mockResolvedValue({
      filename: 'test-image.jpg',
      relativePath: 'club/1/gallery',
      fullPath: 'club/1/gallery/test-image.jpg',
      metadata: {},
    }),
  },
}));
vi.mock('/config/constants.mjs', () => ({
  UPLOAD_DIRECTORIES_ARRAY: [
    'public/uploads/temp',
    'public/uploads/club',
    'public/uploads/carnival',
    'public/uploads/sponsor',
  ],
}));

// Re-import after mocking

describe('upload middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractUploadContext', () => {
    it('should extract default context for unknown route', () => {
      const req = { user: { id: 42 }, route: {}, body: {}, params: {} };
      const file = { fieldname: 'galleryImage' };
      const context = extractUploadContext(req, file);
      expect(context.entityType).toBe('system');
      expect(context.entityId).toBe(1);
      expect(context.imageType).toBe('gallery');
      expect(context.uploaderId).toBe(42);
    });

    it('should extract club context from route', () => {
      const req = {
        user: { id: 7, clubId: 99 },
        route: { path: '/clubs/:id/upload' },
        params: { id: 123 },
        body: {},
      };
      const file = { fieldname: 'logo' };
      const context = extractUploadContext(req, file);
      expect(context.entityType).toBe('club');
      expect(context.entityId).toBe(123);
      expect(context.imageType).toBe('logo');
    });

    it('should extract avatar context', () => {
      const req = { user: { id: 5 }, route: {}, params: {}, body: {} };
      const file = { fieldname: 'avatar' };
      const context = extractUploadContext(req, file);
      expect(context.entityType).toBe('user');
      expect(context.entityId).toBe(5);
      expect(context.imageType).toBe('avatar');
    });

    it('should use customSuffix from body', () => {
      const req = { user: { id: 1 }, route: {}, params: {}, body: { uploadContext: 'custom' } };
      const file = { fieldname: 'galleryImage' };
      const context = extractUploadContext(req, file);
      expect(context.customSuffix).toBe('custom');
    });
  });

  describe('fileFilter', () => {
    const cb = vi.fn();

    it('should allow valid logo image', () => {
      const req = { body: {} };
      const file = { fieldname: 'logo', originalname: 'logo.png', mimetype: 'image/png' };
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject invalid file type for logo', () => {
      const req = { body: {} };
      const file = { fieldname: 'logo', originalname: 'logo.exe', mimetype: 'application/octet-stream' };
      fileFilter(req, file, cb);
      expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(cb.mock.calls[0][0].message).toMatch(/Invalid file type/);
    });

    it('should allow valid draw document', () => {
      const req = { body: {} };
      const file = { fieldname: 'drawDocument', originalname: 'draw.pdf', mimetype: 'application/pdf' };
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject unsupported image type', () => {
      const req = { body: {} };
      const file = { fieldname: 'unknownField', originalname: 'file.txt', mimetype: 'text/plain' };
      fileFilter(req, file, cb);
      expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(cb.mock.calls[0][0].message).toMatch(/Invalid file type/);
    });
  });

  describe('handleUploadError', () => {
    it('should flash error for Multer LIMIT_FILE_SIZE', () => {
      const error = new multer.MulterError('LIMIT_FILE_SIZE');
      const req = { flash: vi.fn() };
      const res = {};
      const next = vi.fn();
      handleUploadError(error, req, res, next);
      expect(req.flash).toHaveBeenCalledWith('error', expect.stringContaining('File too large'));
      expect(next).toHaveBeenCalled();
    });

    it('should flash error for generic error', () => {
      const error = new Error('Something went wrong');
      const req = { flash: vi.fn() };
      const res = {};
      const next = vi.fn();
      handleUploadError(error, req, res, next);
      expect(req.flash).toHaveBeenCalledWith('error', 'Something went wrong');
      expect(next).toHaveBeenCalled();
    });
  });
});