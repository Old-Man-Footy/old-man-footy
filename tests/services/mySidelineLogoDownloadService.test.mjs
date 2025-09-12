import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MySidelineLogoDownloadService from '../../services/mySidelineLogoDownloadService.mjs';
import ImageNamingService from '../../services/imageNamingService.mjs';
import path from 'path';

// Mock dependencies
vi.mock('/services/imageNamingService.mjs', () => ({
  default: {
    IMAGE_TYPES: { LOGO: 'logo' },
    generateImageName: vi.fn(async ({ entityType, entityId, imageType, uploaderId, originalName, customSuffix }) => ({
      filename: `${entityType}-${entityId}-${imageType}-${customSuffix}${path.extname(originalName)}`,
      relativePath: `${entityType}/${entityId}`,
      fullPath: `${entityType}/${entityId}/${entityType}-${entityId}-${imageType}-${customSuffix}${path.extname(originalName)}`,
      metadata: { entityType, entityId, imageType, uploaderId, customSuffix },
    })),
    getEntityImages: vi.fn(async (entityType, entityId, imageType) => [
      { customSuffix: 'mysideline', filename: 'test-logo.jpg' }
    ]),
  }
}));

// Mock fs methods
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(async () => {}),
  writeFile: vi.fn(async () => {}),
  rename: vi.fn(async () => {}),
}));

// Mock https and http
vi.mock('https', () => ({
  default: {
    get: vi.fn((url, options, cb) => {
      const response = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {
          'content-type': 'image/png',
          'content-length': '100'
        },
        on: (carnival, handler) => {
          if (carnival === 'data') handler(Buffer.from([1, 2, 3]));
          if (carnival === 'end') handler();
        }
      };
      cb(response);
      return {
        on: vi.fn(),
        setTimeout: vi.fn(),
        destroy: vi.fn()
      };
    })
  }
}));
vi.mock('http', () => ({
  default: {
    get: vi.fn((url, options, cb) => {
      const response = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {
          'content-type': 'image/png',
          'content-length': '100'
        },
        on: (carnival, handler) => {
          if (carnival === 'data') handler(Buffer.from([1, 2, 3]));
          if (carnival === 'end') handler();
        }
      };
      cb(response);
      return {
        on: vi.fn(),
        setTimeout: vi.fn(),
        destroy: vi.fn()
      };
    })
  }
}));

describe('MySidelineLogoDownloadService', () => {
  let service;

  beforeEach(() => {
    service = new MySidelineLogoDownloadService();
    vi.clearAllMocks();
  });

  describe('downloadLogo', () => {
    it('should fail with invalid logoUrl', async () => {
      const result = await service.downloadLogo('', 'club', 1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid logo URL provided');
    });

    it('should fail with invalid URL format', async () => {
      const result = await service.downloadLogo('not-a-url', 'club', 1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });

    it('should fail with unsupported protocol', async () => {
      const result = await service.downloadLogo('ftp://example.com/logo.png', 'club', 1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Only HTTP/HTTPS URLs are supported');
    });

    it('should succeed with valid logoUrl', async () => {
      const result = await service.downloadLogo('https://example.com/logo.png', 'club', 1);
      expect(result.success).toBe(true);
      expect(result.filename).toContain('club-1-logo-mysideline');
      expect(result.publicUrl).toMatch(/^\/uploads\//);
      expect(result.originalUrl).toBe('https://example.com/logo.png');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.contentType).toBe('image/png');
      expect(result.metadata.entityType).toBe('club');
    });
  });

  describe('downloadWithRetries', () => {
    it('should call downloadFile and return result', async () => {
      const spy = vi.spyOn(service, 'downloadFile').mockResolvedValue({ success: true, data: Buffer.from([1]), contentType: 'image/png' });
      const result = await service.downloadWithRetries('https://example.com/logo.png');
      expect(spy).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should retry on failure and throw after maxRetries', async () => {
      const spy = vi.spyOn(service, 'downloadFile').mockRejectedValue(new Error('fail'));
      await expect(service.downloadWithRetries('https://example.com/logo.png')).rejects.toThrow('fail');
      expect(spy).toHaveBeenCalledTimes(service.maxRetries);
    });
  });

  describe('isValidImageContentType', () => {
    it('should return true for valid image types', () => {
      expect(service.isValidImageContentType('image/png')).toBe(true);
      expect(service.isValidImageContentType('image/jpeg')).toBe(true);
      expect(service.isValidImageContentType('image/svg+xml')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(service.isValidImageContentType('application/json')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should get extension from URL', () => {
      expect(service.getFileExtension('https://x.com/logo.png', 'image/png')).toBe('.png');
    });

    it('should fallback to content type', () => {
      expect(service.getFileExtension('https://x.com/logo', 'image/png')).toBe('.png');
      expect(service.getFileExtension('https://x.com/logo', 'image/svg+xml')).toBe('.svg');
    });

    it('should default to .jpg', () => {
      expect(service.getFileExtension('https://x.com/logo', 'unknown/type')).toBe('.jpg');
    });
  });

  describe('downloadLogos', () => {
    it('should return empty array for non-array input', async () => {
      const result = await service.downloadLogos('not-an-array');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty array input', async () => {
      const result = await service.downloadLogos([]);
      expect(result).toEqual([]);
    });

    it('should process valid logoRequests', async () => {
      const requests = [
        { logoUrl: 'https://example.com/logo.png', entityType: 'club', entityId: 1 },
        { logoUrl: 'https://example.com/logo2.png', entityType: 'club', entityId: 2 }
      ];
      const result = await service.downloadLogos(requests);
      expect(result.length).toBe(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
    });

    it('should handle invalid request objects', async () => {
      const requests = [null, { logoUrl: '', entityType: 'club', entityId: 1 }];
      const result = await service.downloadLogos(requests);
      expect(result[0].success).toBe(false);
      expect(result[1].success).toBe(false);
    });
  });

  describe('findExistingLogo', () => {
    it('should return existing logo info', async () => {
      const result = await service.findExistingLogo('https://example.com/logo.png', 'club', 1);
      expect(result).not.toBeNull();
      expect(result.customSuffix).toBe('mysideline');
    });

    it('should return null on error', async () => {
      vi.spyOn(ImageNamingService, 'getEntityImages').mockRejectedValue(new Error('fail'));
      const result = await service.findExistingLogo('https://example.com/logo.png', 'club', 1);
      expect(result).toBeNull();
    });
  });
});