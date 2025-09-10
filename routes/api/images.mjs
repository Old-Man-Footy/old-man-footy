/**
 * Image Upload API Routes
 * 
 * Provides API endpoints for image upload functionality.
 * Handles carnival and club gallery image uploads with proper
 * authentication and permission checks.
 */

import express from 'express';
import multer from 'multer';
import { ensureAuthenticated } from '../../middleware/auth.mjs';
import ImageUploadService from '../../services/imageUploadService.mjs';
import ImageUpload from '../../models/ImageUpload.mjs';
import asyncHandler from '../../middleware/asyncHandler.mjs';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: ImageUploadService.MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (ImageUploadService.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed'), false);
    }
  }
});

/**
 * POST /api/images/upload
 * Upload a new gallery image
 */
router.post('/upload', 
  ensureAuthenticated, 
  upload.single('image'), 
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

      // Process the upload
      const result = await ImageUploadService.processUpload(
        req.file,
        {
          attribution: attribution || null,
          carnivalId: hasCarnival ? parseInt(carnivalId) : null,
          clubId: hasClub ? parseInt(clubId) : null
        },
        req.user
      );

      if (!result.success) {
        return res.status(400).json({
          error: {
            status: 400,
            message: result.message
          }
        });
      }

      res.json({
        success: true,
        message: result.message,
        image: result.image
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

      const result = await ImageUploadService.deleteImage(imageId, req.user);

      if (!result.success) {
        return res.status(403).json({
          error: {
            status: 403,
            message: result.message
          }
        });
      }

      res.json({
        success: true,
        message: result.message
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

      const result = await ImageUploadService.getUploadStats();

      if (!result.success) {
        return res.status(500).json({
          error: {
            status: 500,
            message: result.message
          }
        });
      }

      res.json({
        success: true,
        stats: result.stats
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
