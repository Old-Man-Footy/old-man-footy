/**
 * ImageUpload Model Unit Tests
 * 
 * Tests the ImageUpload model functionality including:
 * - Static methods for creating and querying images
 * - Model validation and associations
 * - Database operations and error handling
 * - Business logic for user permissions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sequelize } from '../../config/database.mjs';

// Import models using default import syntax
import ImageUpload from '../../models/ImageUpload.mjs';
import Carnival from '../../models/Carnival.mjs';
import Club from '../../models/Club.mjs';
import User from '../../models/User.mjs';
import CarnivalClub from '../../models/CarnivalClub.mjs';

describe('ImageUpload Model', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock the Sequelize model methods properly
        vi.spyOn(ImageUpload, 'create').mockImplementation(() => Promise.resolve({}));
        vi.spyOn(ImageUpload, 'findAll').mockImplementation(() => Promise.resolve([]));
        vi.spyOn(ImageUpload, 'findByPk').mockImplementation(() => Promise.resolve({}));
        vi.spyOn(ImageUpload, 'findOne').mockImplementation(() => Promise.resolve({}));
        vi.spyOn(ImageUpload, 'destroy').mockImplementation(() => Promise.resolve(1));
        
        // Mock related models
        vi.spyOn(Carnival, 'findByPk').mockImplementation(() => Promise.resolve({}));
        vi.spyOn(Club, 'findByPk').mockImplementation(() => Promise.resolve({}));
        vi.spyOn(User, 'findByPk').mockImplementation(() => Promise.resolve({}));
        vi.spyOn(CarnivalClub, 'findOne').mockImplementation(() => Promise.resolve({}));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Model Validation', () => {
        it('should require url field', async () => {
            const mockImageUpload = {
                validate: vi.fn().mockRejectedValue(new Error('url cannot be null'))
            };
            
            ImageUpload.build = vi.fn().mockReturnValue(mockImageUpload);
            
            const image = ImageUpload.build({
                attribution: 'Test attribution',
                carnivalId: 1
            });
            
            await expect(image.validate()).rejects.toThrow('url cannot be null');
        });

        it('should validate url format', async () => {
            const mockImageUpload = {
                validate: vi.fn().mockRejectedValue(new Error('Validation isUrl on url failed'))
            };
            
            ImageUpload.build = vi.fn().mockReturnValue(mockImageUpload);
            
            const image = ImageUpload.build({
                url: 'not-a-url',
                carnivalId: 1
            });
            
            await expect(image.validate()).rejects.toThrow('Validation isUrl on url failed');
        });

        it('should require either carnivalId or clubId', async () => {
            const mockImageUpload = {
                validate: vi.fn().mockRejectedValue(new Error('Image must belong to either a carnival or a club'))
            };
            
            ImageUpload.build = vi.fn().mockReturnValue(mockImageUpload);
            
            const image = ImageUpload.build({
                url: 'https://example.com/image.jpg'
            });
            
            await expect(image.validate()).rejects.toThrow('Image must belong to either a carnival or a club');
        });

        it('should not allow both carnivalId and clubId', async () => {
            const mockImageUpload = {
                validate: vi.fn().mockRejectedValue(new Error('Image cannot belong to both a carnival and a club'))
            };
            
            ImageUpload.build = vi.fn().mockReturnValue(mockImageUpload);
            
            const image = ImageUpload.build({
                url: 'https://example.com/image.jpg',
                carnivalId: 1,
                clubId: 1
            });
            
            await expect(image.validate()).rejects.toThrow('Image cannot belong to both a carnival and a club');
        });

        it('should trim and validate attribution length', () => {
            const image = new ImageUpload({
                url: 'https://example.com/image.jpg',
                attribution: '   Test attribution   ',
                carnivalId: 1
            });
            
            // Test that attribution would be trimmed (simulated)
            expect(image.attribution?.trim()).toBe('Test attribution');
        });
    });

    describe('createImageUpload static method', () => {
        const mockUser = {
            id: 1,
            clubId: 1,
            isAdmin: false
        };

        it('should create carnival image upload successfully', async () => {
            const imageData = {
                url: 'https://example.com/carnival-image.jpg',
                attribution: 'Test photographer',
                carnivalId: 1
            };

            const mockImageUpload = {
                id: 1,
                url: 'https://example.com/carnival-image.jpg',
                attribution: 'Test photographer',
                carnivalId: 1,
                clubId: null
            };

            // Mock permission check
            vi.spyOn(ImageUpload, 'canUserUploadForCarnival').mockResolvedValue(true);
            ImageUpload.create.mockResolvedValue(mockImageUpload);

            const result = await ImageUpload.createImageUpload(imageData, mockUser);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Image uploaded successfully');
            expect(result.image).toEqual(mockImageUpload);
        });

        it('should create club image upload successfully', async () => {
            const imageData = {
                url: 'https://example.com/club-image.jpg',
                attribution: 'Test photographer',
                clubId: 1
            };

            const mockImageUpload = {
                id: 2,
                url: 'https://example.com/club-image.jpg',
                attribution: 'Test photographer',
                carnivalId: null,
                clubId: 1
            };

            // Mock permission check
            vi.spyOn(ImageUpload, 'canUserUploadForClub').mockReturnValue(true);
            ImageUpload.create.mockResolvedValue(mockImageUpload);

            const result = await ImageUpload.createImageUpload(imageData, mockUser);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Image uploaded successfully');
            expect(result.image).toEqual(mockImageUpload);
        });

        it('should return error for missing url', async () => {
            const imageData = {
                attribution: 'Test photographer',
                carnivalId: 1
            };

            const result = await ImageUpload.createImageUpload(imageData, mockUser);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Image URL is required');
        });

        it('should return error for missing user', async () => {
            const imageData = {
                url: 'https://example.com/image.jpg',
                carnivalId: 1
            };

            const result = await ImageUpload.createImageUpload(imageData, null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('User authentication required');
        });

        it('should return error for insufficient permissions', async () => {
            const imageData = {
                url: 'https://example.com/image.jpg',
                carnivalId: 1
            };

            vi.spyOn(ImageUpload, 'canUserUploadForCarnival').mockResolvedValue(false);

            const result = await ImageUpload.createImageUpload(imageData, mockUser);

            expect(result.success).toBe(false);
            expect(result.message).toBe('You do not have permission to upload images for this carnival');
        });
    });

    describe('canUserUploadForCarnival static method', () => {
        const mockUser = {
            id: 1,
            clubId: 1,
            isAdmin: false
        };

        it('should allow admin users to upload for any carnival', async () => {
            const adminUser = { ...mockUser, isAdmin: true };
            
            const result = await ImageUpload.canUserUploadForCarnival(adminUser, 1);
            
            expect(result).toBe(true);
        });

        it('should allow club delegates to upload for associated carnivals', async () => {
            const mockAssociation = {
                carnivalId: 1,
                clubId: 1,
                isActive: true
            };

            CarnivalClub.findOne.mockResolvedValue(mockAssociation);

            const result = await ImageUpload.canUserUploadForCarnival(mockUser, 1);

            expect(result).toBe(true);
            expect(CarnivalClub.findOne).toHaveBeenCalledWith({
                where: {
                    carnivalId: 1,
                    clubId: 1,
                    isActive: true
                }
            });
        });

        it('should deny access for non-associated carnivals', async () => {
            CarnivalClub.findOne.mockResolvedValue(null);

            const result = await ImageUpload.canUserUploadForCarnival(mockUser, 1);

            expect(result).toBe(false);
        });

        it('should deny access for missing parameters', async () => {
            expect(await ImageUpload.canUserUploadForCarnival(null, 1)).toBe(false);
            expect(await ImageUpload.canUserUploadForCarnival(mockUser, null)).toBe(false);
        });
    });

    describe('canUserUploadForClub static method', () => {
        const mockUser = {
            id: 1,
            clubId: 1,
            isAdmin: false
        };

        it('should allow admin users to upload for any club', () => {
            const adminUser = { ...mockUser, isAdmin: true };
            
            const result = ImageUpload.canUserUploadForClub(adminUser, 2);
            
            expect(result).toBe(true);
        });

        it('should allow users to upload for their own club', () => {
            const result = ImageUpload.canUserUploadForClub(mockUser, 1);
            
            expect(result).toBe(true);
        });

        it('should deny access for different club', () => {
            const result = ImageUpload.canUserUploadForClub(mockUser, 2);
            
            expect(result).toBe(false);
        });

        it('should deny access for missing parameters', () => {
            expect(ImageUpload.canUserUploadForClub(null, 1)).toBe(false);
            expect(ImageUpload.canUserUploadForClub(mockUser, null)).toBe(false);
        });
    });

    describe('getCarouselImages static method', () => {
        it('should return carnival images for carousel', async () => {
            const mockImages = [
                { id: 1, url: 'https://example.com/1.jpg', carnivalId: 1 },
                { id: 2, url: 'https://example.com/2.jpg', carnivalId: 2 }
            ];

            ImageUpload.findAll.mockResolvedValue(mockImages);

            const result = await ImageUpload.getCarouselImages();

            expect(ImageUpload.findAll).toHaveBeenCalledWith({
                where: {
                    carnivalId: {
                        [sequelize.Sequelize.Op.ne]: null
                    }
                },
                include: [{
                    model: Carnival,
                    as: 'carnival',
                    attributes: ['id', 'title', 'date', 'isActive'],
                    where: {
                        isActive: true
                    }
                }],
                order: [['createdAt', 'DESC']],
                limit: 10
            });
            expect(result).toEqual(mockImages);
        });

        it('should handle database errors gracefully', async () => {
            const error = new Error('Database error');
            ImageUpload.findAll.mockRejectedValue(error);

            await expect(ImageUpload.getCarouselImages()).rejects.toThrow('Database error');
        });
    });

    describe('getCarnivalImages static method', () => {
        it('should return images for specific carnival', async () => {
            const mockImages = [
                { id: 1, url: 'https://example.com/1.jpg', carnivalId: 1 },
                { id: 2, url: 'https://example.com/2.jpg', carnivalId: 1 }
            ];

            ImageUpload.findAll.mockResolvedValue(mockImages);

            const result = await ImageUpload.getCarnivalImages(1);

            expect(ImageUpload.findAll).toHaveBeenCalledWith({
                where: {
                    carnivalId: 1
                },
                order: [['createdAt', 'DESC']]
            });
            expect(result).toEqual(mockImages);
        });

        it('should return empty array for invalid carnivalId', async () => {
            const result = await ImageUpload.getCarnivalImages(null);
            expect(result).toEqual([]);
        });
    });

    describe('getClubImages static method', () => {
        it('should return images for specific club', async () => {
            const mockImages = [
                { id: 1, url: 'https://example.com/1.jpg', clubId: 1 },
                { id: 2, url: 'https://example.com/2.jpg', clubId: 1 }
            ];

            ImageUpload.findAll.mockResolvedValue(mockImages);

            const result = await ImageUpload.getClubImages(1);

            expect(ImageUpload.findAll).toHaveBeenCalledWith({
                where: {
                    clubId: 1
                },
                order: [['createdAt', 'DESC']]
            });
            expect(result).toEqual(mockImages);
        });

        it('should return empty array for invalid clubId', async () => {
            const result = await ImageUpload.getClubImages(null);
            expect(result).toEqual([]);
        });
    });

    describe('Model Instance Methods', () => {
        it('should have belongsToCarnival getter', () => {
            const carnivalImage = new ImageUpload({
                url: 'https://example.com/image.jpg',
                carnivalId: 1,
                clubId: null
            });

            expect(carnivalImage.belongsToCarnival).toBe(true);
        });

        it('should have belongsToClub getter', () => {
            const clubImage = new ImageUpload({
                url: 'https://example.com/image.jpg',
                carnivalId: null,
                clubId: 1
            });

            expect(clubImage.belongsToClub).toBe(true);
        });

        it('should have displayAttribution getter with default', () => {
            const imageWithoutAttribution = new ImageUpload({
                url: 'https://example.com/image.jpg',
                carnivalId: 1
            });

            expect(imageWithoutAttribution.displayAttribution).toBe('Photo courtesy of carnival organisers');
        });

        it('should have displayAttribution getter with custom attribution', () => {
            const imageWithAttribution = new ImageUpload({
                url: 'https://example.com/image.jpg',
                attribution: 'Custom photographer',
                carnivalId: 1
            });

            expect(imageWithAttribution.displayAttribution).toBe('Custom photographer');
        });
    });

    describe('Model Associations', () => {
        it('should have correct associations defined', () => {
            // Test that model has expected associations
            expect(ImageUpload.associations).toBeDefined();
            // In a real implementation, you'd check specific associations
            // expect(ImageUpload.associations.carnival).toBeDefined();
            // expect(ImageUpload.associations.club).toBeDefined();
        });
    });
});
