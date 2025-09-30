/**
 * Image Upload API Routes
 * 
 * Provides API endpoints for image upload functionality.
 * Handles carnival and club gallery image uploads with proper
 * authentication and permission checks.
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { ensureAuthenticated } from '../../middleware/auth.mjs';
import { galleryUpload, handleUploadError } from '../../middleware/upload.mjs';
import ImageUpload from '../../models/ImageUpload.mjs';
import { sequelize } from '../../config/database.mjs';
import asyncHandler from '../../middleware/asyncHandler.mjs';

const router = express.Router();

/**
 * POST /api/images/upload
 * Upload a new gallery image
 */
router.post('/upload', 
  ensureAuthenticated, 
  galleryUpload, 
  asyncHandler(async (req, res) => {
    try {
      const { attribution, carnivalId, clubId } = req.body;
      
      // Validate that either carnivalId or clubId is provided (but not both)
      const hasCarnival = carnivalId && carnivalId !== '';
      const hasClub = clubId && clubId !== '';
      
      if (hasCarnival && hasClub) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Image cannot belong to both a carnival and a club'
          }
        });
      }
      
      if (!hasCarnival && !hasClub) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Image must belong to either a carnival or a club'
          }
        });
      }

      // Check if files were uploaded by middleware
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'No image file uploaded'
          }
        });
      }

      // For backward compatibility, only process the first file
      // (frontend sends single files to this endpoint)
      const uploadedFile = req.files[0];
      
      // Create ImageUpload record
      const imageUpload = await ImageUpload.create({
        originalName: uploadedFile.originalname,
        filename: uploadedFile.filename,
        path: uploadedFile.path,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
        uploadedBy: req.user.id,
        attribution: attribution || null,
        carnivalId: hasCarnival ? parseInt(carnivalId) : null,
        clubId: hasClub ? parseInt(clubId) : null
      });

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        image: {
          id: imageUpload.id,
          filename: imageUpload.filename,
          path: imageUpload.path,
          attribution: imageUpload.attribution,
          carnivalId: imageUpload.carnivalId,
          clubId: imageUpload.clubId,
          uploadedAt: imageUpload.createdAt
        }
      });

    } catch (error) {
      console.error('Image upload API error:', error);
      res.status(500).json({
        error: {
          status: 500,
          message: 'Internal server error during image upload'
        }
      });
    }
  })
);

/**
 * DELETE /api/images/:id
 * Delete a gallery image
 */
router.delete('/:id', 
  ensureAuthenticated, 
  asyncHandler(async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      
      if (!imageId || isNaN(imageId)) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Invalid image ID'
          }
        });
      }

      // Find the image
      const image = await ImageUpload.findByPk(imageId);
      if (!image) {
        return res.status(404).json({
          error: {
            status: 404,
            message: 'Image not found'
          }
        });
      }

      // Check permissions
      let canDelete = false;

      if (req.user.isAdmin) {
        canDelete = true;
      } else if (image.clubId && req.user.clubId === image.clubId) {
        // User can delete images from their own club
        canDelete = true;
      } else if (image.carnivalId) {
        // Check if user's club is associated with the carnival
        canDelete = await ImageUpload.canUserUploadForCarnival(req.user, image.carnivalId);
      }

      if (!canDelete) {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'You do not have permission to delete this image'
          }
        });
      }

      // Delete file from disk
      const filePath = path.join(process.cwd(), 'public', image.path);
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Deleted file from disk: ${filePath}`);
      } catch (fileError) {
        console.warn(`⚠️ Could not delete file from disk: ${filePath}`, fileError.message);
        // Continue with database deletion even if file deletion fails
      }

      // Delete database record
      await image.destroy();

      console.log(`✅ Image deleted successfully: ID ${imageId} by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });

    } catch (error) {
      console.error('Image delete API error:', error);
      res.status(500).json({
        error: {
          status: 500,
          message: 'Internal server error during image deletion'
        }
      });
    }
  })
);

/**
 * GET /api/images/carnival/:carnivalId
 * Get all images for a specific carnival
 */
router.get('/carnival/:carnivalId', 
  asyncHandler(async (req, res) => {
    try {
      const carnivalId = parseInt(req.params.carnivalId);
      
      if (!carnivalId || isNaN(carnivalId)) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Invalid carnival ID'
          }
        });
      }

      const images = await ImageUpload.getCarnivalImages(carnivalId);

      res.json({
        success: true,
        images: images
      });

    } catch (error) {
      console.error('Get carnival images API error:', error);
      res.status(500).json({
        error: {
          status: 500,
          message: 'Internal server error while fetching carnival images'
        }
      });
    }
  })
);

/**
 * GET /api/images/club/:clubId
 * Get all images for a specific club
 */
router.get('/club/:clubId', 
  asyncHandler(async (req, res) => {
    try {
      const clubId = parseInt(req.params.clubId);
      
      if (!clubId || isNaN(clubId)) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Invalid club ID'
          }
        });
      }

      const images = await ImageUpload.getClubImages(clubId);

      res.json({
        success: true,
        images: images
      });

    } catch (error) {
      console.error('Get club images API error:', error);
      res.status(500).json({
        error: {
          status: 500,
          message: 'Internal server error while fetching club images'
        }
      });
    }
  })
);

/**
 * GET /api/images/carousel
 * Get carousel images (carnival images only)
 */
router.get('/carousel', 
  asyncHandler(async (req, res) => {
    try {
      const images = await ImageUpload.getCarouselImages();

      res.json({
        success: true,
        images: images
      });

    } catch (error) {
      console.error('Get carousel images API error:', error);
      res.status(500).json({
        error: {
          status: 500,
          message: 'Internal server error while fetching carousel images'
        }
      });
    }
  })
);

/**
 * GET /api/images/stats
 * Get image upload statistics (admin only)
 */
router.get('/stats', 
  ensureAuthenticated, 
  asyncHandler(async (req, res) => {
    try {
      // Only allow admins to view statistics
      if (!req.user.isAdmin) {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'Admin access required'
          }
        });
      }

      // Get upload statistics
      const totalImages = await ImageUpload.count();
      const carnivalImages = await ImageUpload.count({
        where: {
          carnivalId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      });
      const clubImages = await ImageUpload.count({
        where: {
          clubId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      });

      res.json({
        success: true,
        stats: {
          totalImages,
          carnivalImages,
          clubImages
        }
      });

    } catch (error) {
      console.error('Get image stats API error:', error);
      res.status(500).json({
        error: {
          status: 500,
          message: 'Internal server error while fetching image statistics'
        }
      });
    }
  })
);

export default router;
