/**
 * Unit Tests for Upload Processing Utility
 * 
 * Tests defensive processing, error handling, and edge cases
 * to ensure robust upload handling across all controllers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  processStructuredUploads, 
  validateStructuredUploads, 
  extractUploadByFieldname 
} from '../../../utils/uploadProcessor.mjs';

describe('uploadProcessor', () => {
  let mockReq;
  let mockUpdateData;
  let consoleSpy;

  beforeEach(() => {
    mockReq = {};
    mockUpdateData = {};
    
    // Spy on console methods to verify logging
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processStructuredUploads', () => {
    describe('valid upload processing', () => {
      it('should process a single logo upload correctly', () => {
        mockReq.structuredUploads = [
          { fieldname: 'logo', path: '/uploads/logos/club-123.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result.logoUrl).toBe('/uploads/logos/club-123.jpg');
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 Processing 1 uploads for club 123');
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 Updated club 123 logo: /uploads/logos/club-123.jpg');
      });

      it('should process multiple upload types', () => {
        mockReq.structuredUploads = [
          { fieldname: 'logo', path: '/uploads/logos/club-123.jpg' },
          { fieldname: 'galleryImage', path: '/uploads/gallery/club-123-1.jpg' },
          { fieldname: 'bannerImage', path: '/uploads/banners/club-123.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result.logoUrl).toBe('/uploads/logos/club-123.jpg');
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 Processing 3 uploads for club 123');
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 Updated club 123 logo: /uploads/logos/club-123.jpg');
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 Added gallery image to club 123: /uploads/gallery/club-123-1.jpg');
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 Added banner image to club 123: /uploads/banners/club-123.jpg');
      });

      it('should preserve existing updateData properties', () => {
        mockUpdateData = { name: 'Test Club', location: 'Test Location' };
        mockReq.structuredUploads = [
          { fieldname: 'logo', path: '/uploads/logos/club-123.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result.name).toBe('Test Club');
        expect(result.location).toBe('Test Location');
        expect(result.logoUrl).toBe('/uploads/logos/club-123.jpg');
      });
    });

    describe('edge case handling', () => {
      it('should handle empty uploads array gracefully', () => {
        mockReq.structuredUploads = [];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result).toEqual(mockUpdateData);
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 No structured uploads found for club 123');
      });

      it('should handle missing structuredUploads property', () => {
        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result).toEqual(mockUpdateData);
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 No structured uploads found for club 123');
      });

      it('should handle null structuredUploads', () => {
        mockReq.structuredUploads = null;

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result).toEqual(mockUpdateData);
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 No structured uploads found for club 123');
      });

      it('should handle non-array structuredUploads', () => {
        mockReq.structuredUploads = 'not-an-array';

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result).toEqual(mockUpdateData);
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 No structured uploads found for club 123');
      });
    });

    describe('corrupted upload object handling', () => {
      it('should skip null upload objects', () => {
        mockReq.structuredUploads = [
          null,
          { fieldname: 'logo', path: '/uploads/logos/club-123.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result.logoUrl).toBe('/uploads/logos/club-123.jpg');
        expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️ Invalid upload object for club 123: not an object');
      });

      it('should skip uploads with missing fieldname', () => {
        mockReq.structuredUploads = [
          { path: '/uploads/logos/club-123.jpg' },
          { fieldname: 'logo', path: '/uploads/logos/club-124.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result.logoUrl).toBe('/uploads/logos/club-124.jpg');
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          '⚠️ Invalid upload object for club 123: missing or invalid fieldname', 
          { path: '/uploads/logos/club-123.jpg' }
        );
      });

      it('should skip uploads with missing path', () => {
        mockReq.structuredUploads = [
          { fieldname: 'logo' },
          { fieldname: 'logo', path: '/uploads/logos/club-124.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result.logoUrl).toBe('/uploads/logos/club-124.jpg');
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          '⚠️ Invalid upload object for club 123: missing or invalid path', 
          { fieldname: 'logo' }
        );
      });

      it('should handle unknown field types gracefully', () => {
        mockReq.structuredUploads = [
          { fieldname: 'unknownField', path: '/uploads/unknown/file.jpg' },
          { fieldname: 'logo', path: '/uploads/logos/club-123.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result.logoUrl).toBe('/uploads/logos/club-123.jpg');
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          '⚠️ Unknown upload field \'unknownField\' for club 123: /uploads/unknown/file.jpg'
        );
      });

      it('should handle invalid fieldname types', () => {
        mockReq.structuredUploads = [
          { fieldname: 123, path: '/uploads/logos/club-123.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result.logoUrl).toBeUndefined();
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          '⚠️ Invalid upload object for club 123: missing or invalid fieldname', 
          { fieldname: 123, path: '/uploads/logos/club-123.jpg' }
        );
      });

      it('should handle invalid path types', () => {
        mockReq.structuredUploads = [
          { fieldname: 'logo', path: 123 }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'club', 123);

        expect(result.logoUrl).toBeUndefined();
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          '⚠️ Invalid upload object for club 123: missing or invalid path', 
          { fieldname: 'logo', path: 123 }
        );
      });
    });

    describe('different entity types', () => {
      it('should work with carnival entities', () => {
        mockReq.structuredUploads = [
          { fieldname: 'logo', path: '/uploads/logos/carnival-456.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'carnival', 456);

        expect(result.logoUrl).toBe('/uploads/logos/carnival-456.jpg');
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 Updated carnival 456 logo: /uploads/logos/carnival-456.jpg');
      });

      it('should work with sponsor entities', () => {
        mockReq.structuredUploads = [
          { fieldname: 'logo', path: '/uploads/logos/sponsor-789.jpg' }
        ];

        const result = processStructuredUploads(mockReq, mockUpdateData, 'sponsor', 789);

        expect(result.logoUrl).toBe('/uploads/logos/sponsor-789.jpg');
        expect(consoleSpy.log).toHaveBeenCalledWith('📸 Updated sponsor 789 logo: /uploads/logos/sponsor-789.jpg');
      });
    });
  });

  describe('validateStructuredUploads', () => {
    it('should return true for valid uploads array', () => {
      const uploads = [
        { fieldname: 'logo', path: '/uploads/logos/file.jpg' },
        { fieldname: 'bannerImage', path: '/uploads/banners/file.jpg' }
      ];

      expect(validateStructuredUploads(uploads)).toBe(true);
    });

    it('should return false for non-array input', () => {
      expect(validateStructuredUploads('not-array')).toBe(false);
      expect(validateStructuredUploads(null)).toBe(false);
      expect(validateStructuredUploads(undefined)).toBe(false);
      expect(validateStructuredUploads({})).toBe(false);
    });

    it('should return false for array with invalid upload objects', () => {
      const invalidUploads = [
        { fieldname: 'logo' }, // missing path
        { path: '/uploads/file.jpg' }, // missing fieldname
        null,
        'invalid-object'
      ];

      expect(validateStructuredUploads(invalidUploads)).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(validateStructuredUploads([])).toBe(true);
    });
  });

  describe('extractUploadByFieldname', () => {
    const validUploads = [
      { fieldname: 'logo', path: '/uploads/logos/file.jpg' },
      { fieldname: 'bannerImage', path: '/uploads/banners/file.jpg' },
      { fieldname: 'galleryImage', path: '/uploads/gallery/file.jpg' }
    ];

    it('should extract existing upload by fieldname', () => {
      const result = extractUploadByFieldname(validUploads, 'logo');

      expect(result).toEqual({ fieldname: 'logo', path: '/uploads/logos/file.jpg' });
    });

    it('should return null for non-existing fieldname', () => {
      const result = extractUploadByFieldname(validUploads, 'nonExistent');

      expect(result).toBeNull();
    });

    it('should return null for invalid uploads array', () => {
      const result = extractUploadByFieldname('invalid', 'logo');

      expect(result).toBeNull();
    });

    it('should return null for empty uploads array', () => {
      const result = extractUploadByFieldname([], 'logo');

      expect(result).toBeNull();
    });
  });
});
