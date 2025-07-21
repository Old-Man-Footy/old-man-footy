import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CarouselImageService from '/services/carouselImageService.mjs';
import { promises as fs } from 'fs';

/**
 * @fileoverview Unit tests for CarouselImageService
 * @module services/carouselImageService.test.mjs
 */


// Mock dependencies
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: (...args) => args.join('/'),
    extname: (file) => {
      const idx = file.lastIndexOf('.');
      return idx !== -1 ? file.slice(idx) : '';
    },
    dirname: (p) => p.split('/').slice(0, -1).join('/'),
  };
});
vi.mock('url', () => ({
  fileURLToPath: (url) => url.replace('file://', ''),
}));
vi.mock('/config/constants.mjs', () => ({
  IMAGE_DIRECTORIES_ARRAY: ['gallery', 'promo', 'club'],
  SUPPORTED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png'],
}));


describe('CarouselImageService', () => {
  beforeEach(() => {
    CarouselImageService.clearCache();
    vi.clearAllMocks();
  });

  describe('getCarouselImages', () => {
    it('returns empty array if no directories exist', async () => {
      fs.access.mockRejectedValueOnce(new Error('not found'));
      fs.access.mockRejectedValueOnce(new Error('not found'));
      fs.access.mockRejectedValueOnce(new Error('not found'));
      const images = await CarouselImageService.getCarouselImages();
      expect(images).toEqual([]);
    });

    it('returns images from directories, sorted and shuffled', async () => {
      // Arrange
      const now = Date.now();
      fs.access.mockResolvedValue();
      fs.readdir
        .mockResolvedValueOnce(['img1.jpg', 'img2.png'])
        .mockResolvedValueOnce(['promo1.jpg'])
        .mockResolvedValueOnce([]);
      fs.stat
        .mockResolvedValueOnce({
          size: 6000,
          mtime: new Date(now - 1000),
        })
        .mockResolvedValueOnce({
          size: 8000,
          mtime: new Date(now - 2000),
        })
        .mockResolvedValueOnce({
          size: 9000,
          mtime: new Date(now - 500),
        });

      // Act
      const images = await CarouselImageService.getCarouselImages(5);

      // Assert
      expect(images.length).toBe(3);
      expect(images[0]).toHaveProperty('filename');
      expect(images[0]).toHaveProperty('url');
      expect(images[0]).toHaveProperty('uploadTime');
      expect(images[0]).toHaveProperty('size');
      expect(images[0]).toHaveProperty('type');
      expect(images[0]).toHaveProperty('source');
    });

    it('uses cache if not expired', async () => {
      // Arrange
      CarouselImageService.imageCache = [{ filename: 'cached.jpg', uploadTime: Date.now(), size: 6000, url: '/uploads/gallery/cached.jpg', type: 'gallery', source: 'unknown' }];
      CarouselImageService.cacheExpiry = Date.now() + 10000;
      const images = await CarouselImageService.getCarouselImages(1);
      expect(images.length).toBe(1);
      expect(images[0].filename).toBe('cached.jpg');
    });

    it('returns [] on error', async () => {
      fs.access.mockImplementation(() => { throw new Error('fail'); });
      const images = await CarouselImageService.getCarouselImages();
      expect(images).toEqual([]);
    });
  });

  describe('scanDirectory', () => {
    it('returns image objects for supported files', async () => {
      fs.readdir.mockResolvedValue(['img1.jpg', 'img2.png', 'notimage.txt']);
      fs.stat
        .mockResolvedValueOnce({ size: 6000, mtime: new Date(1000) })
        .mockResolvedValueOnce({ size: 8000, mtime: new Date(2000) });

      const images = await CarouselImageService.scanDirectory('/uploads/gallery', 'gallery');
      expect(images.length).toBe(2);
      expect(images[0].filename).toBe('img1.jpg');
      expect(images[1].filename).toBe('img2.png');
    });

    it('skips files smaller than 5000 bytes', async () => {
      fs.readdir.mockResolvedValue(['small.jpg']);
      fs.stat.mockResolvedValueOnce({ size: 4000, mtime: new Date(1000) });
      const images = await CarouselImageService.scanDirectory('/uploads/gallery', 'gallery');
      expect(images).toEqual([]);
    });

    it('returns [] on error', async () => {
      fs.readdir.mockRejectedValue(new Error('fail'));
      const images = await CarouselImageService.scanDirectory('/uploads/gallery', 'gallery');
      expect(images).toEqual([]);
    });
  });

  describe('getImageType', () => {
    it('returns correct type based on path', () => {
      expect(CarouselImageService.getImageType('/gallery/')).toBe('gallery');
      expect(CarouselImageService.getImageType('/promo/')).toBe('promotional');
      expect(CarouselImageService.getImageType('/other/')).toBe('general');
    });
  });

  describe('getImageSource', () => {
    it('returns correct source based on path', () => {
      expect(CarouselImageService.getImageSource('/carnival/')).toBe('carnival');
      expect(CarouselImageService.getImageSource('/club/')).toBe('club');
      expect(CarouselImageService.getImageSource('/sponsor/')).toBe('sponsor');
      expect(CarouselImageService.getImageSource('/other/')).toBe('unknown');
    });
  });

  describe('shuffleAndLimit', () => {
    it('returns empty array if input is empty', () => {
      expect(CarouselImageService.shuffleAndLimit([], 5)).toEqual([]);
    });

    it('returns up to limit images, weighted by recency', () => {
      const now = Date.now();
      const images = [
        { filename: 'a.jpg', uploadTime: now - 1000, size: 6000 },
        { filename: 'b.jpg', uploadTime: now - 2000, size: 6000 },
        { filename: 'c.jpg', uploadTime: now - 3000, size: 6000 },
      ];
      const result = CarouselImageService.shuffleAndLimit(images, 2);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('filename');
    });
  });

  describe('clearCache', () => {
    it('clears the cache', () => {
      CarouselImageService.imageCache = [{ filename: 'foo' }];
      CarouselImageService.cacheExpiry = Date.now() + 10000;
      CarouselImageService.clearCache();
      expect(CarouselImageService.imageCache).toBeNull();
      expect(CarouselImageService.cacheExpiry).toBeNull();
    });
  });

  describe('getImageStats', () => {
    it('returns stats for images', async () => {
      // Arrange
      const now = Date.now();
      CarouselImageService.getCarouselImages = vi.fn().mockResolvedValue([
        { source: 'club', type: 'gallery', uploadTime: now, size: 10000 },
        { source: 'club', type: 'gallery', uploadTime: now - 8 * 24 * 60 * 60 * 1000, size: 20000 },
        { source: 'sponsor', type: 'promotional', uploadTime: now, size: 30000 },
      ]);
      // Act
      const stats = await CarouselImageService.getImageStats();
      // Assert
      expect(stats.total).toBe(3);
      expect(stats.bySource.club).toBe(2);
      expect(stats.bySource.sponsor).toBe(1);
      expect(stats.byType.gallery).toBe(2);
      expect(stats.byType.promotional).toBe(1);
      expect(stats.recentCount).toBe(2);
      expect(stats.totalSize).toBe(60000);
    });

    it('returns default stats on error', async () => {
      CarouselImageService.getCarouselImages = vi.fn().mockRejectedValue(new Error('fail'));
      const stats = await CarouselImageService.getImageStats();
      expect(stats).toEqual({
        total: 0,
        bySource: {},
        byType: {},
        recentCount: 0,
        totalSize: 0,
      });
    });
  });
});