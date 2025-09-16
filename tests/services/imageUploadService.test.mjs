/**
 * ImageUploadService Test Suite
 * 
 * Tests for the image upload service functionality including
 * file processing, validation, and cleanup operations.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import ImageUploadService from '../../services/imageUploadService.mjs';
import ImageUpload from '../../models/ImageUpload.mjs';

// Mock the filesystem operations
vi.mock('fs/promises');

// Mock the ImageUpload model
vi.mock('../../models/ImageUpload.mjs', () => ({
  default: {
    createImageUpload: vi.fn(),
    findByPk: vi.fn(),
    canUserUploadForCarnival: vi.fn(),
    count: vi.fn(),
    sequelize: {
      Sequelize: {
        Op: {
          ne: Symbol('ne')
        }
      }
    }
  }
}));

describe('ImageUploadService', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to reduce noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock process.cwd()
    vi.spyOn(process, 'cwd').mockReturnValue(path.normalize('/mock/project/root'));
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Static Properties', () => {
    test('should have correct allowed MIME types', () => {
      expect(ImageUploadService.ALLOWED_MIME_TYPES).toEqual([
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ]);
    });

    test('should have correct max file size (5MB)', () => {
      expect(ImageUploadService.MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });
  });

  describe('getUploadDirectory', () => {
    test('should return club gallery directory for club gallery images', () => {
      const uploadData = { clubId: 1, imageType: 'gallery' };
      const result = ImageUploadService.getUploadDirectory(uploadData);
      expect(result).toBe('public/uploads/images/club/gallery');
    });

    test('should return club promo directory for club promo images', () => {
      const uploadData = { clubId: 1, imageType: 'promo' };
      const result = ImageUploadService.getUploadDirectory(uploadData);
      expect(result).toBe('public/uploads/images/club/promo');
    });

    test('should return carnival gallery directory for carnival gallery images', () => {
      const uploadData = { carnivalId: 1, imageType: 'gallery' };
      const result = ImageUploadService.getUploadDirectory(uploadData);
      expect(result).toBe('public/uploads/images/carnival/gallery');
    });

    test('should return carnival promo directory for carnival promo images', () => {
      const uploadData = { carnivalId: 1, imageType: 'promo' };
      const result = ImageUploadService.getUploadDirectory(uploadData);
      expect(result).toBe('public/uploads/images/carnival/promo');
    });

    test('should default to club gallery for images without imageType', () => {
      const uploadData = { clubId: 1 };
      const result = ImageUploadService.getUploadDirectory(uploadData);
      expect(result).toBe('public/uploads/images/club/gallery');
    });

    test('should default to carnival gallery for images without specific entity', () => {
      const uploadData = { imageType: 'gallery' };
      const result = ImageUploadService.getUploadDirectory(uploadData);
      expect(result).toBe('public/uploads/images/carnival/gallery');
    });
  });

  describe('ensureUploadDir', () => {
    test('should return existing directory path when directory exists', async () => {
      const mockCwd = path.normalize('/mock/project/root');
      const uploadDir = 'public/uploads/clubs/gallery';
      const expectedPath = path.join(mockCwd, uploadDir);
      fs.access.mockResolvedValue();
      
      const result = await ImageUploadService.ensureUploadDir(uploadDir);
      
      expect(result).toBe(expectedPath);
      expect(fs.access).toHaveBeenCalledWith(expectedPath);
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    test('should create directory when it does not exist', async () => {
      const mockCwd = path.normalize('/mock/project/root');
      const uploadDir = 'public/uploads/carnivals/promo';
      const expectedPath = path.join(mockCwd, uploadDir);
      fs.access.mockRejectedValue(new Error('Directory not found'));
      fs.mkdir.mockResolvedValue();
      
      const result = await ImageUploadService.ensureUploadDir(uploadDir);
      
      expect(result).toBe(expectedPath);
      expect(fs.access).toHaveBeenCalledWith(expectedPath);
      expect(fs.mkdir).toHaveBeenCalledWith(expectedPath, { recursive: true });
    });
  });

  describe('generateUniqueFilename', () => {
    test('should generate unique filename with proper format', () => {
      const originalName = 'test-image.jpg';
      const filename = ImageUploadService.generateUniqueFilename(originalName);
      
      expect(filename).toMatch(/^gallery_\d+_[a-f0-9]{16}\.jpg$/);
    });

    test('should handle different file extensions', () => {
      const testCases = [
        { input: 'image.PNG', expected: '.png' },
        { input: 'photo.JPEG', expected: '.jpeg' },
        { input: 'pic.webp', expected: '.webp' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const filename = ImageUploadService.generateUniqueFilename(input);
        expect(filename).toMatch(new RegExp(`${expected.replace('.', '\\.')}$`));
      });
    });

    test('should generate different filenames for same input', () => {
      const originalName = 'test.jpg';
      const filename1 = ImageUploadService.generateUniqueFilename(originalName);
      const filename2 = ImageUploadService.generateUniqueFilename(originalName);
      
      expect(filename1).not.toBe(filename2);
    });
  });

  describe('validateFile', () => {
    test('should return invalid when no file provided', () => {
      const result = ImageUploadService.validateFile(null);
      
      expect(result).toEqual({
        valid: false,
        error: 'No file provided'
      });
    });

    test('should return invalid when file size exceeds limit', () => {
      const file = {
        size: ImageUploadService.MAX_FILE_SIZE + 1,
        mimetype: 'image/jpeg'
      };
      
      const result = ImageUploadService.validateFile(file);
      
      expect(result).toEqual({
        valid: false,
        error: 'File size exceeds maximum limit of 5MB'
      });
    });

    test('should return invalid for unsupported MIME type', () => {
      const file = {
        size: 1000,
        mimetype: 'image/bmp'
      };
      
      const result = ImageUploadService.validateFile(file);
      
      expect(result).toEqual({
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed'
      });
    });

    test('should return valid for supported file types', () => {
      const supportedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      
      supportedTypes.forEach(mimetype => {
        const file = {
          size: 1000,
          mimetype
        };
        
        const result = ImageUploadService.validateFile(file);
        
        expect(result).toEqual({
          valid: true
        });
      });
    });

    test('should return valid when file is at max size limit', () => {
      const file = {
        size: ImageUploadService.MAX_FILE_SIZE,
        mimetype: 'image/jpeg'
      };
      
      const result = ImageUploadService.validateFile(file);
      
      expect(result).toEqual({
        valid: true
      });
    });
  });

  describe('processUpload', () => {
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1000,
      buffer: Buffer.from('fake image data')
    };
    
    const mockUploadData = {
      carnivalId: 1,
      clubId: null,
      attribution: 'Test attribution',
      imageType: 'gallery'
    };
    
    const mockUser = {
      id: 1,
      email: 'test@example.com'
    };

    test('should return error for invalid file', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'text/plain'
      };
      
      const result = await ImageUploadService.processUpload(invalidFile, mockUploadData, mockUser);
      
      expect(result).toEqual({
        success: false,
        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed'
      });
    });

    test('should process valid carnival gallery upload successfully', async () => {
      const mockCwd = path.normalize('/mock/project/root');
      const expectedPath = path.join(mockCwd, 'public/uploads/carnivals/gallery');
      fs.access.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      ImageUpload.createImageUpload.mockResolvedValue({
        success: true,
        image: { id: 1, url: '/uploads/images/carnival/gallery/gallery_123_abc.jpg' }
      });
      
      const result = await ImageUploadService.processUpload(mockFile, mockUploadData, mockUser);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Image uploaded successfully');
      expect(result.image).toBeDefined();
      expect(result.url).toMatch(/^\/uploads\/images\/carnival\/gallery\/gallery_\d+_[a-f0-9]{16}\.jpg$/);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    test('should process valid club promo upload successfully', async () => {
      const clubUploadData = {
        clubId: 2,
        carnivalId: null,
        attribution: 'Club promo',
        imageType: 'promo'
      };
      
      const mockCwd = path.normalize('/mock/project/root');
      const expectedPath = path.join(mockCwd, 'public/uploads/images/club/promo');
      fs.access.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      ImageUpload.createImageUpload.mockResolvedValue({
        success: true,
        image: { id: 2, url: '/uploads/images/club/promo/gallery_456_def.jpg' }
      });
      
      const result = await ImageUploadService.processUpload(mockFile, clubUploadData, mockUser);
      
      expect(result.success).toBe(true);
      expect(result.url).toMatch(/^\/uploads\/images\/club\/promo\/gallery_\d+_[a-f0-9]{16}\.jpg$/);
    });

    test('should cleanup file when database creation fails', async () => {
      fs.access.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      fs.unlink.mockResolvedValue();
      
      ImageUpload.createImageUpload.mockResolvedValue({
        success: false,
        message: 'Database error'
      });
      
      const result = await ImageUploadService.processUpload(mockFile, mockUploadData, mockUser);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
      expect(fs.unlink).toHaveBeenCalled();
    });

    test('should handle file write errors gracefully', async () => {
      fs.access.mockResolvedValue();
      fs.writeFile.mockRejectedValue(new Error('Disk full'));
      
      const result = await ImageUploadService.processUpload(mockFile, mockUploadData, mockUser);
      
      expect(result).toEqual({
        success: false,
        message: 'Failed to process image upload'
      });
    });

    test('should handle directory creation during upload', async () => {
      const mockCwd = path.normalize('/mock/project/root');
      const expectedPath = path.join(mockCwd, 'public/uploads/images/carnival/gallery');
      fs.access.mockRejectedValue(new Error('Directory not found'));
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      ImageUpload.createImageUpload.mockResolvedValue({
        success: true,
        image: { id: 1, url: '/uploads/images/carnival/gallery/gallery_123_abc.jpg' }
      });
      
      const result = await ImageUploadService.processUpload(mockFile, mockUploadData, mockUser);
      
      expect(result.success).toBe(true);
      expect(fs.mkdir).toHaveBeenCalledWith(expectedPath, { recursive: true });
    });
  });

  describe('deleteImage', () => {
    const mockUser = {
      id: 1,
      isAdmin: false,
      clubId: 2
    };

    test('should return error when image not found', async () => {
      ImageUpload.findByPk.mockResolvedValue(null);
      
      const result = await ImageUploadService.deleteImage(999, mockUser);
      
      expect(result).toEqual({
        success: false,
        message: 'Image not found'
      });
    });

    test('should allow admin to delete any image', async () => {
      const adminUser = { ...mockUser, isAdmin: true };
      const mockImage = {
        id: 1,
        url: '/uploads/gallery/test.jpg',
        clubId: 5,
        destroy: vi.fn()
      };
      
      ImageUpload.findByPk.mockResolvedValue(mockImage);
      fs.unlink.mockResolvedValue();
      
      const result = await ImageUploadService.deleteImage(1, adminUser);
      
      expect(result).toEqual({
        success: true,
        message: 'Image deleted successfully'
      });
      expect(mockImage.destroy).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalledWith(path.join(path.normalize('/mock/project/root'), 'public/uploads/gallery/test.jpg'));
    });

    test('should allow user to delete images from their club', async () => {
      const mockImage = {
        id: 1,
        url: '/uploads/gallery/test.jpg',
        clubId: 2, // Same as mockUser.clubId
        destroy: vi.fn()
      };
      
      ImageUpload.findByPk.mockResolvedValue(mockImage);
      fs.unlink.mockResolvedValue();
      
      const result = await ImageUploadService.deleteImage(1, mockUser);
      
      expect(result).toEqual({
        success: true,
        message: 'Image deleted successfully'
      });
      expect(mockImage.destroy).toHaveBeenCalled();
    });

    test('should deny deletion when user lacks permission', async () => {
      const mockImage = {
        id: 1,
        url: '/uploads/gallery/test.jpg',
        clubId: 3, // Different from mockUser.clubId
        destroy: vi.fn()
      };
      
      ImageUpload.findByPk.mockResolvedValue(mockImage);
      
      const result = await ImageUploadService.deleteImage(1, mockUser);
      
      expect(result).toEqual({
        success: false,
        message: 'You do not have permission to delete this image'
      });
      expect(mockImage.destroy).not.toHaveBeenCalled();
    });

    test('should allow carnival image deletion when user can upload for carnival', async () => {
      const mockImage = {
        id: 1,
        url: '/uploads/gallery/test.jpg',
        carnivalId: 5,
        destroy: vi.fn()
      };
      
      ImageUpload.findByPk.mockResolvedValue(mockImage);
      ImageUpload.canUserUploadForCarnival.mockResolvedValue(true);
      fs.unlink.mockResolvedValue();
      
      const result = await ImageUploadService.deleteImage(1, mockUser);
      
      expect(result).toEqual({
        success: true,
        message: 'Image deleted successfully'
      });
      expect(mockImage.destroy).toHaveBeenCalled();
    });

    test('should continue with database deletion even when file deletion fails', async () => {
      const mockImage = {
        id: 1,
        url: '/uploads/gallery/test.jpg',
        clubId: 2,
        destroy: vi.fn()
      };
      
      ImageUpload.findByPk.mockResolvedValue(mockImage);
      fs.unlink.mockRejectedValue(new Error('File not found'));
      
      const result = await ImageUploadService.deleteImage(1, mockUser);
      
      expect(result).toEqual({
        success: true,
        message: 'Image deleted successfully'
      });
      expect(mockImage.destroy).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      const mockImage = {
        id: 1,
        url: '/uploads/gallery/test.jpg',
        clubId: 2,
        destroy: vi.fn().mockRejectedValue(new Error('Database error'))
      };
      
      ImageUpload.findByPk.mockResolvedValue(mockImage);
      fs.unlink.mockResolvedValue();
      
      const result = await ImageUploadService.deleteImage(1, mockUser);
      
      expect(result).toEqual({
        success: false,
        message: 'Failed to delete image'
      });
    });
  });

  describe('getUploadStats', () => {
    test('should return upload statistics successfully', async () => {
      ImageUpload.count.mockImplementation((options) => {
        if (!options) return Promise.resolve(100);
        if (options.where.carnivalId) return Promise.resolve(60);
        if (options.where.clubId) return Promise.resolve(40);
        return Promise.resolve(0);
      });
      
      const result = await ImageUploadService.getUploadStats();
      
      expect(result).toEqual({
        success: true,
        stats: {
          totalImages: 100,
          carnivalImages: 60,
          clubImages: 40
        }
      });
    });

    test('should handle database errors gracefully', async () => {
      ImageUpload.count.mockRejectedValue(new Error('Database connection failed'));
      
      const result = await ImageUploadService.getUploadStats();
      
      expect(result).toEqual({
        success: false,
        message: 'Failed to get upload statistics'
      });
    });

    test('should handle zero counts correctly', async () => {
      ImageUpload.count.mockResolvedValue(0);
      
      const result = await ImageUploadService.getUploadStats();
      
      expect(result).toEqual({
        success: true,
        stats: {
          totalImages: 0,
          carnivalImages: 0,
          clubImages: 0
        }
      });
    });
  });
});
