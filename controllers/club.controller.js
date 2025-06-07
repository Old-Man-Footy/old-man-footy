/**
 * Club Controller - MVC Architecture Implementation
 * 
 * Handles club management, public listings, and club profile operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const { Club, User, Carnival } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const ImageNamingService = require('../services/imageNamingService');

/**
 * Display public club listings with search and filter options
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showClubListings = async (req, res) => {
    try {
        const { search, state } = req.query;
        
        // Build where clause for filters
        const whereClause = {
            isActive: true,
            isPubliclyListed: true
        };

        if (search) {
            whereClause[Op.or] = [
                { clubName: { [Op.like]: `%${search}%` } },
                { location: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        if (state) {
            whereClause.state = state;
        }

        const clubs = await Club.findAll({
            where: whereClause,
            order: [['clubName', 'ASC']],
            include: [{
                model: User,
                as: 'delegates',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate']
            }]
        });

        // Get club statistics for each club
        const clubsWithStats = await Promise.all(clubs.map(async (club) => {
            const carnivalCount = await club.getCarnivalCount();
            return {
                ...club.toJSON(),
                carnivalCount
            };
        }));

        res.render('clubs/list', {
            title: 'Find a Masters Rugby League Club',
            clubs: clubsWithStats,
            filters: { search, state },
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']
        });
    } catch (error) {
        console.error('Error loading club listings:', error);
        req.flash('error_msg', 'Error loading club listings.');
        res.redirect('/');
    }
};

/**
 * Display individual club profile page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showClubProfile = async (req, res) => {
    try {
        const { id } = req.params;
        
        const club = await Club.findOne({
            where: {
                id,
                isActive: true,
                isPubliclyListed: true
            },
            include: [{
                model: User,
                as: 'delegates',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate']
            }]
        });

        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/clubs');
        }

        // Get club's carnivals created by this club's delegates
        const delegates = await User.findAll({
            where: {
                clubId: club.id,
                isActive: true
            },
            attributes: ['id']
        });
        
        const delegateIds = delegates.map(d => d.id);
        
        // Get carnivals created by this club's delegates
        const carnivals = await Carnival.findAll({
            where: {
                createdByUserId: { [Op.in]: delegateIds },
                isActive: true
            },
            include: [{
                model: User,
                as: 'creator',
                attributes: ['firstName', 'lastName', 'email']
            }],
            order: [['date', 'ASC']]
        });

        // Calculate upcoming carnivals count
        const upcomingCarnivals = carnivals.filter(carnival => 
            new Date(carnival.date) >= new Date()
        ).length;

        // Get full delegate information
        const delegates_full = await User.findAll({
            where: {
                clubId: club.id,
                isActive: true
            },
            attributes: ['id', 'firstName', 'lastName', 'email', 'isPrimaryDelegate']
        });

        const primaryDelegate = delegates_full.find(delegate => delegate.isPrimaryDelegate);

        res.render('clubs/show', {
            title: `${club.clubName} - Masters Rugby League Club`,
            club,
            clubCarnivals: carnivals,
            upcomingCarnivals,
            delegates: delegates_full,
            primaryDelegate,
            user: req.user || null
        });
    } catch (error) {
        console.error('Error loading club profile:', error);
        req.flash('error_msg', 'Error loading club profile.');
        res.redirect('/clubs');
    }
};

/**
 * Show club profile management form (for delegates)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showClubManagement = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.clubId) {
            req.flash('error_msg', 'You must be associated with a club to manage its profile.');
            return res.redirect('/dashboard');
        }

        const club = await Club.findByPk(user.clubId);
        
        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/dashboard');
        }

        res.render('clubs/manage', {
            title: 'Manage Club Profile',
            club
        });
    } catch (error) {
        console.error('Error loading club management:', error);
        req.flash('error_msg', 'Error loading club management.');
        res.redirect('/dashboard');
    }
};

/**
 * Update club profile information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateClubProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the validation errors.');
            return res.redirect('/clubs/manage');
        }

        const user = req.user;
        
        if (!user.clubId) {
            req.flash('error_msg', 'You must be associated with a club to manage its profile.');
            return res.redirect('/dashboard');
        }

        const club = await Club.findByPk(user.clubId);
        
        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/dashboard');
        }

        const {
            location,
            contactEmail,
            contactPhone,
            contactPerson,
            description,
            website,
            facebookUrl,
            instagramUrl,
            twitterUrl,
            isPubliclyListed
        } = req.body;

        // Prepare update data
        const updateData = {
            location: location?.trim(),
            contactEmail: contactEmail?.trim(),
            contactPhone: contactPhone?.trim(),
            contactPerson: contactPerson?.trim(),
            description: description?.trim(),
            website: website?.trim(),
            facebookUrl: facebookUrl?.trim(),
            instagramUrl: instagramUrl?.trim(),
            twitterUrl: twitterUrl?.trim(),
            isPubliclyListed: isPubliclyListed === 'on'
        };

        // Handle structured file uploads
        if (req.structuredUploads && req.structuredUploads.length > 0) {
            for (const upload of req.structuredUploads) {
                switch (upload.fieldname) {
                    case 'logo':
                        updateData.logoUrl = upload.path;
                        console.log(`📸 Updated club ${club.id} logo: ${upload.path}`);
                        break;
                    case 'galleryImage':
                        // For clubs, we might store gallery images differently
                        // This could be extended to support a gallery field in the Club model
                        console.log(`📸 Added gallery image to club ${club.id}: ${upload.path}`);
                        break;
                    case 'bannerImage':
                        // Store banner image reference if the club model supports it
                        console.log(`📸 Added banner image to club ${club.id}: ${upload.path}`);
                        break;
                }
            }
        }

        await club.update(updateData);

        req.flash('success_msg', 'Club profile updated successfully!');
        res.redirect('/clubs/manage');
    } catch (error) {
        console.error('Error updating club profile:', error);
        req.flash('error_msg', 'Error updating club profile.');
        res.redirect('/clubs/manage');
    }
};

/**
 * Get all images associated with a club
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getClubImages = async (req, res) => {
    try {
        const { clubId } = req.params;
        const { imageType } = req.query;

        // Verify user has access to this club
        if (req.user.clubId !== parseInt(clubId) && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view images for your own club.'
            });
        }

        const images = await ImageNamingService.getEntityImages(
            ImageNamingService.ENTITY_TYPES.CLUB,
            parseInt(clubId),
            imageType
        );

        res.json({
            success: true,
            images,
            total: images.length
        });
    } catch (error) {
        console.error('Error fetching club images:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching club images'
        });
    }
};

/**
 * Delete a specific club image
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteClubImage = async (req, res) => {
    try {
        const { clubId, filename } = req.params;

        // Verify user has access to this club
        if (req.user.clubId !== parseInt(clubId) && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete images for your own club.'
            });
        }

        // Parse the filename to verify it belongs to this club
        const parsed = ImageNamingService.parseImageName(filename);
        if (!parsed || parsed.entityType !== ImageNamingService.ENTITY_TYPES.CLUB || parsed.entityId !== parseInt(clubId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid image file or image does not belong to this club'
            });
        }

        // Get the full path and delete the file
        const imagePath = ImageNamingService.getRelativePath(parsed.entityType, parsed.imageType);
        const fullPath = path.join(imagePath, filename);
        
        const fs = require('fs').promises;
        await fs.unlink(path.join('uploads', fullPath));

        // If this was the club's logo, update the database
        if (parsed.imageType === ImageNamingService.IMAGE_TYPES.LOGO) {
            const club = await Club.findByPk(clubId);
            if (club && club.logoUrl && club.logoUrl.includes(filename)) {
                await club.update({ logoUrl: null });
            }
        }

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting club image:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting image'
        });
    }
};

module.exports = {
    showClubListings,
    showClubProfile,
    showClubManagement,
    updateClubProfile,
    getClubImages,
    deleteClubImage
};