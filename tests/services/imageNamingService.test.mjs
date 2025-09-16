import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';

// Mock the fs module with a factory to ensure mock functions have the full API
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    readdir: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn()
  }
}));

import ImageNamingService, {
  ENTITY_TYPES,
  IMAGE_TYPES,
  generateImageName,
  parseImageName
} from '../../services/imageNamingService.mjs';

// Mock dependencies
vi.mock('/models/index.mjs', () => ({
  Club: { findAll: vi.fn() },
  Carnival: { findAll: vi.fn() },
  Sponsor: { findAll: vi.fn() },
  User: { findAll: vi.fn() }
}));

describe('ImageNamingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateImageName', () => {
    it('generates a valid filename and metadata', async () => {
      // Arrange
      // The service calls generateSequenceId, which we mock here
      vi.spyOn(ImageNamingService, 'generateSequenceId').mockResolvedValue(1);
      const options = {
        entityType: ENTITY_TYPES.CLUB,
        entityId: 42,
        imageType: IMAGE_TYPES.LOGO,
        uploaderId: 123,
        originalName: 'logo.jpg'
      };

      // Act
      const result = await generateImageName(options);

      // Assert
      expect(result.filename).toMatch(/^club-000042-logo-\d{8}-000123-001\.jpg$/);
      expect(result.metadata).toMatchObject({
        entityType: 'club',
        entityId: 42,
        imageType: 'logo',
        uploaderId: 123,
        originalName: 'logo.jpg',
        extension: '.jpg'
      });
      expect(result.relativePath).toBe(path.join('logos', 'club'));
      expect(result.fullPath).toBe(path.join('logos', 'club', result.filename));
    });

    it('throws on invalid entityType', async () => {
      const options = {
        entityType: 'invalid',
        entityId: 1,
        imageType: IMAGE_TYPES.LOGO,
        uploaderId: 1,
        originalName: 'file.png'
      };
      await expect(generateImageName(options)).rejects.toThrow(/Invalid entity type/);
    });

    it('throws on invalid imageType', async () => {
      const options = {
        entityType: ENTITY_TYPES.CLUB,
        entityId: 1,
        imageType: 'invalid',
        uploaderId: 1,
        originalName: 'file.png'
      };
      await expect(generateImageName(options)).rejects.toThrow(/Invalid image type/);
    });

    it('includes customSuffix if provided', async () => {
      vi.spyOn(ImageNamingService, 'generateSequenceId').mockResolvedValue(2);
      const options = {
        entityType: ENTITY_TYPES.CARNIVAL,
        entityId: 99,
        imageType: IMAGE_TYPES.PROMOTIONAL,
        uploaderId: 5,
        originalName: 'promo.png',
        customSuffix: 'special'
      };
      const result = await generateImageName(options);
      expect(result.filename).toMatch(/special\.png$/);
    });
  });

  describe('parseImageName', () => {
    it('parses a valid filename', () => {
      const filename = 'club-000042-logo-20240607-000123-001.jpg';
      const parsed = parseImageName(filename);
      expect(parsed).toMatchObject({
        entityType: 'club',
        entityId: 42,
        imageType: 'logo',
        uploadDate: '20240607',
        uploaderId: 123,
        sequenceId: 1,
        extension: '.jpg'
      });
    });

    it('returns null for invalid filename', () => {
      expect(parseImageName('badfilename.jpg')).toBeNull();
    });

    it('parses customSuffix if present', () => {
      const filename = 'club-000042-logo-20240607-000123-001-special-edition.jpg';
      const parsed = parseImageName(filename);
      expect(parsed.customSuffix).toBe('special-edition');
    });
  });

  describe('generateSearchPattern', () => {
    it('generates correct pattern', () => {
      const pattern = ImageNamingService.generateSearchPattern('club', 7, 'logo');
      expect(pattern).toBe('club-000007-logo-*');
    });

    it('defaults imageType to *', () => {
      const pattern = ImageNamingService.generateSearchPattern('club', 7);
      expect(pattern).toBe('club-000007-*-*');
    });
  });

  describe('generateSequenceId', () => {
    it('returns next sequence number based on files', async () => {
      // Arrange
      fs.mkdir.mockResolvedValue();
      fs.readdir.mockImplementation(async (dir) => {
        const normalizedDir = path.normalize(dir);
        if (normalizedDir === path.join('public', 'logos', 'club')) {
          return [
            'club-000042-logo-20240607-000123-001.jpg',
            'club-000042-logo-20240607-000123-002.jpg'
          ];
        }
        return [];
      });
      // Act
      const seq = await ImageNamingService.generateSequenceId('club', 42, 'logo', '20240607');
      // Assert
      expect(seq).toBe(3);
    });

    it('returns 1 if error occurs', async () => {
      fs.mkdir.mockRejectedValue(new Error('fail'));
      const seq = await ImageNamingService.generateSequenceId('club', 42, 'logo', '20240607');
      expect(seq).toBe(1);
    });
  });

  describe('getRelativePath', () => {
    it('returns logos path for logo type', () => {
      expect(ImageNamingService.getRelativePath('club', IMAGE_TYPES.LOGO)).toBe(path.join('logos', 'club'));
    });
    it('returns documents path for draw type', () => {
      expect(ImageNamingService.getRelativePath('club', IMAGE_TYPES.DRAW_DOCUMENT)).toBe(path.join('documents', 'club'));
    });
    it('returns images path for gallery type', () => {
      expect(ImageNamingService.getRelativePath('club', IMAGE_TYPES.GALLERY)).toBe(path.join('images', 'club', 'gallery'));
    });
  });

  describe('generateIntegrityHash', () => {
    it('generates a consistent hash', () => {
      const options = {
        entityType: 'club',
        entityId: 1,
        imageType: 'logo',
        uploaderId: 2
      };
      const hash1 = ImageNamingService.generateIntegrityHash(options, '20240607', 1);
      const hash2 = createHash('sha256')
        .update('club-1-logo-20240607-2-1')
        .digest('hex')
        .substring(0, 8);
      expect(hash1).toBe(hash2);
    });
  });

  describe('getEntityImages', () => {
    it('returns matching images', async () => {
      // Arrange
      fs.mkdir.mockResolvedValue();
      fs.readdir.mockImplementation(async (dir) => {
        const normalizedDir = path.normalize(dir);
        if (normalizedDir === path.join('public', 'logos', 'club')) {
          return [
            'club-000042-logo-20240607-000123-001.jpg',
            'club-000042-logo-20240607-000123-002.jpg',
            'club-000043-logo-20240607-000123-001.jpg'
          ];
        }
        return [];
      });
      // Act
      const images = await ImageNamingService.getEntityImages('club', 42, 'logo');
      // Assert
      expect(images.length).toBe(2);
      expect(images[0].entityId).toBe(42);
    });

    it('returns empty array on error', async () => {
      fs.readdir.mockRejectedValue(new Error('fail'));
      const images = await ImageNamingService.getEntityImages('club', 42, 'logo');
      expect(images).toEqual([]);
    });
  });

  describe('migrateExistingImages', () => {
    it('migrates images and returns results', async () => {
      vi.spyOn(ImageNamingService, 'generateImageName').mockResolvedValue({
        filename: 'club-000042-logo-20240607-000123-001-migrated.jpg',
        relativePath: path.join('logos', 'club'),
        metadata: { test: true }
      });
      fs.mkdir.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      // Act
      const results = await ImageNamingService.migrateExistingImages(
        'club',
        42,
        ['/uploads/old-logo.jpg'],
        123
      );
      // Assert
      expect(results[0].success).toBe(true);
      expect(results[0].metadata).toBeDefined();
    });

    it('handles errors gracefully', async () => {
      vi.spyOn(ImageNamingService, 'generateImageName').mockRejectedValue(new Error('fail'));
      const results = await ImageNamingService.migrateExistingImages(
        'club',
        42,
        ['/uploads/old-logo.jpg'],
        123
      );
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('fail');
    });
  });

  describe('cleanupOrphanedImages', () => {
    it('finds orphaned images', async () => {
      // Arrange
      const clubs = [{ id: 1 }];
      const carnivals = [];
      const sponsors = [];
      const users = [];
      const orphanFile = 'club-000002-logo-20240607-000123-001.jpg';
      const { Club, Carnival, Sponsor, User } = await import('../../models/index.mjs');
      Club.findAll.mockResolvedValue(clubs);
      Carnival.findAll.mockResolvedValue(carnivals);
      Sponsor.findAll.mockResolvedValue(sponsors);
      User.findAll.mockResolvedValue(users);
      fs.readdir.mockImplementation(async (dir) => {
        const normalizedDir = path.normalize(dir);
        if (normalizedDir === path.join('public', 'uploads', 'logos')) return [orphanFile];
        if (normalizedDir === path.join('public', 'uploads', 'images')) return [];
        if (normalizedDir === path.join('public', 'uploads', 'documents')) return [];
        return [];
      });
      fs.unlink.mockResolvedValue();
      // Act
      const result = await ImageNamingService.cleanupOrphanedImages(false);
      // Assert
      expect(result.orphaned.length).toBeGreaterThanOrEqual(1);
      expect(result.orphaned[0].entityId).toBe(2);
    });
    it('handles directory errors', async () => {
      const { Club, Carnival, Sponsor, User } = await import('../../models/index.mjs');
      Club.findAll.mockResolvedValue([]);
      Carnival.findAll.mockResolvedValue([]);
      Sponsor.findAll.mockResolvedValue([]);
      User.findAll.mockResolvedValue([]);
      fs.readdir.mockImplementation(async (dir) => {
        const normalizedDir = path.normalize(dir);
        if (normalizedDir === path.join('public', 'uploads', 'logos')) throw new Error('fail');
        if (normalizedDir === path.join('public', 'uploads', 'images')) throw new Error('fail');
        if (normalizedDir === path.join('public', 'uploads', 'documents')) throw new Error('fail');
        return [];
      });
      // Act
      const result = await ImageNamingService.cleanupOrphanedImages();
      // Assert
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});