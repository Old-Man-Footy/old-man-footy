/**
 * Club Controller - MVC Architecture Implementation
 * 
 * Handles club management, public listings, and club profile operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const { Club, User, Carnival, Sponsor, ClubAlternateName } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const ImageNamingService = require('../services/imageNamingService');
const sponsorSortingService = require('../services/sponsorSortingService');

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

        let clubIdsFromAlternateNames = [];

        if (search) {
            // Search for clubs by alternate names first
            clubIdsFromAlternateNames = await ClubAlternateName.searchClubsByAlternateName(search);
            
            whereClause[Op.or] = [
                { clubName: { [Op.like]: `%${search}%` } },
                { location: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];

            // Include clubs found by alternate names
            if (clubIdsFromAlternateNames.length > 0) {
                whereClause[Op.or].push({ id: { [Op.in]: clubIdsFromAlternateNames } });
            }
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
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
            additionalCSS: ['/styles/club.styles.css']
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
        
        // First check if the club exists at all
        const clubExists = await Club.findByPk(id);
        
        if (!clubExists) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/clubs');
        }
        
        // If club is inactive, redirect with appropriate message
        if (!clubExists.isActive) {
            req.flash('error_msg', 'This club is no longer active. Club profiles are only available for active clubs.');
            return res.redirect('/clubs');
        }
        
        const club = await Club.findOne({
            where: {
                id,
                isActive: true,
                isPubliclyListed: true
            },
            include: [
                {
                    model: User,
                    as: 'delegates',
                    where: { isActive: true },
                    required: false,
                    attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate']
                },
                {
                    model: Sponsor,
                    as: 'sponsors',
                    where: { isActive: true },
                    required: false,
                    through: { attributes: ['displayOrder'] }
                }
            ]
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

        // Sort sponsors using the hierarchical sorting service
        const sortedSponsors = sponsorSortingService.sortSponsorsHierarchically(club.sponsors);

        res.render('clubs/show', {
            title: `${club.clubName} - Masters Rugby League Club`,
            club,
            clubCarnivals: carnivals,
            upcomingCarnivals,
            delegates: delegates_full,
            primaryDelegate,
            sponsors: sortedSponsors,
            user: req.user || null,
            additionalCSS: ['/styles/club.styles.css']
        });
    } catch (error) {
        console.error('Error loading club profile:', error);
        req.flash('error_msg', 'Error loading club profile.');
        res.redirect('/clubs');
    }
};

/**
 * Show club profile management form (for delegates) or club creation/joining options (for users without clubs)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showClubManagement = async (req, res) => {
    try {
        const user = req.user;
        
        // If user doesn't have a club, show creation/joining options
        if (!user.clubId) {
            // Get available clubs that user could potentially join
            const availableClubs = await Club.findAll({
                where: {
                    isActive: true,
                    isPubliclyListed: true
                },
                include: [{
                    model: User,
                    as: 'delegates',
                    where: { isActive: true },
                    required: false,
                    attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate']
                }],
                order: [['clubName', 'ASC']]
            });

            // Get clubs that were created on behalf of others and might match this user's email
            const claimableClubs = await Club.findAll({
                where: {
                    createdByProxy: true,
                    inviteEmail: user.email,
                    isActive: true
                }
            });

            return res.render('clubs/club-options', {
                title: 'Join or Create a Club',
                user,
                availableClubs,
                claimableClubs,
                states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
                additionalCSS: ['/styles/club.styles.css']
            });
        }

        // User has a club - show normal management interface
        const club = await Club.findByPk(user.clubId);
        
        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/dashboard');
        }

        res.render('clubs/manage', {
            title: 'Manage Club Profile',
            club,
            additionalCSS: ['/styles/club.styles.css']
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
            description,
            contactPerson,
            contactEmail,
            contactPhone,
            website,
            facebookUrl,
            instagramUrl,
            twitterUrl,
            isPubliclyListed,
            isActive
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
            isPubliclyListed: isPubliclyListed === 'on',
            isActive: isActive === 'on'
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

/**
 * Show club's sponsors management page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showClubSponsors = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.clubId) {
            req.flash('error_msg', 'You must be associated with a club to manage sponsors.');
            return res.redirect('/dashboard');
        }

        const club = await Club.findByPk(user.clubId, {
            include: [{
                model: Sponsor,
                as: 'sponsors',
                where: { isActive: true },
                required: false,
                through: { 
                    attributes: ['displayOrder'],
                    as: 'clubSponsor'
                }
            }]
        });

        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/dashboard');
        }

        // Sort sponsors by priority
        const sponsors = club.sponsors ? club.sponsors.sort((a, b) => {
            const priorityA = a.clubSponsor?.displayOrder || 999;
            const priorityB = b.clubSponsor?.displayOrder || 999;
            return priorityA - priorityB;
        }) : [];

        res.render('clubs/sponsors', {
            title: 'Manage Club Sponsors',
            club,
            sponsors,
            additionalCSS: ['/styles/club.styles.css']
        });
    } catch (error) {
        console.error('Error loading club sponsors:', error);
        req.flash('error_msg', 'Error loading club sponsors.');
        res.redirect('/clubs/manage');
    }
};

/**
 * Show add sponsor form (create new or link existing)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showAddSponsor = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.clubId) {
            req.flash('error_msg', 'You must be associated with a club to add sponsors.');
            return res.redirect('/dashboard');
        }

        const club = await Club.findByPk(user.clubId);
        
        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/dashboard');
        }

        // Get existing sponsors not already linked to this club
        const existingSponsors = await Sponsor.findAll({
            where: { 
                isActive: true,
                isPubliclyVisible: true 
            },
            include: [{
                model: Club,
                as: 'clubs',
                where: { id: { [Op.ne]: club.id } },
                required: false
            }],
            order: [['sponsorName', 'ASC']]
        });

        // Filter out sponsors already linked to this club
        const availableSponsors = await Promise.all(
            existingSponsors.filter(async (sponsor) => {
                const isLinked = await sponsor.isAssociatedWithClub(club.id);
                return !isLinked;
            })
        );

        res.render('clubs/add-sponsor', {
            title: 'Add Sponsor to Club',
            club,
            availableSponsors,
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
            sponsorshipLevels: ['Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind'],
            additionalCSS: ['/styles/club.styles.css']
        });
    } catch (error) {
        console.error('Error loading add sponsor form:', error);
        req.flash('error_msg', 'Error loading add sponsor form.');
        res.redirect('/clubs/manage/sponsors');
    }
};

/**
 * Add sponsor to club (create new or link existing)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addSponsorToClub = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.clubId) {
            req.flash('error_msg', 'You must be associated with a club to add sponsors.');
            return res.redirect('/dashboard');
        }

        const club = await Club.findByPk(user.clubId);
        
        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/dashboard');
        }

        const { sponsorType, existingSponsorId, ...sponsorData } = req.body;

        let sponsor;

        if (sponsorType === 'existing' && existingSponsorId) {
            // Link existing sponsor to club
            sponsor = await Sponsor.findByPk(existingSponsorId);
            
            if (!sponsor) {
                req.flash('error_msg', 'Selected sponsor not found.');
                return res.redirect('/clubs/manage/sponsors/add');
            }

            // Check if already linked
            const isAlreadyLinked = await sponsor.isAssociatedWithClub(club.id);
            if (isAlreadyLinked) {
                req.flash('error_msg', 'This sponsor is already linked to your club.');
                return res.redirect('/clubs/manage/sponsors');
            }

        } else if (sponsorType === 'new') {
            // Create new sponsor
            const {
                sponsorName,
                businessType,
                location,
                state,
                description,
                contactPerson,
                contactEmail,
                contactPhone,
                website,
                facebookUrl,
                instagramUrl,
                twitterUrl,
                linkedinUrl,
                sponsorshipLevel
            } = sponsorData;

            const newSponsorData = {
                sponsorName: sponsorName?.trim(),
                businessType: businessType?.trim(),
                location: location?.trim(),
                state,
                description: description?.trim(),
                contactPerson: contactPerson?.trim(),
                contactEmail: contactEmail?.trim(),
                contactPhone: contactPhone?.trim(),
                website: website?.trim(),
                facebookUrl: facebookUrl?.trim(),
                instagramUrl: instagramUrl?.trim(),
                twitterUrl: twitterUrl?.trim(),
                linkedinUrl: linkedinUrl?.trim(),
                sponsorshipLevel,
                isPubliclyVisible: true
            };

            // Handle logo upload
            if (req.structuredUploads && req.structuredUploads.length > 0) {
                const logoUpload = req.structuredUploads.find(upload => upload.fieldname === 'logo');
                if (logoUpload) {
                    newSponsorData.logoUrl = logoUpload.path;
                }
            }

            sponsor = await Sponsor.create(newSponsorData);
        } else {
            req.flash('error_msg', 'Invalid sponsor type selected.');
            return res.redirect('/clubs/manage/sponsors/add');
        }

        // Link sponsor to club with displayOrder
        const currentSponsors = await club.getSponsors();
        const displayOrder = currentSponsors.length + 1;

        await club.addSponsor(sponsor, { 
            through: { displayOrder } 
        });

        req.flash('success_msg', `Sponsor "${sponsor.sponsorName}" has been added to your club!`);
        res.redirect('/clubs/manage/sponsors');

    } catch (error) {
        console.error('Error adding sponsor to club:', error);
        req.flash('error_msg', 'Error adding sponsor to club.');
        res.redirect('/clubs/manage/sponsors/add');
    }
};

/**
 * Remove sponsor from club
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeSponsorFromClub = async (req, res) => {
    try {
        const user = req.user;
        const { sponsorId } = req.params;
        
        if (!user.clubId) {
            req.flash('error_msg', 'You must be associated with a club to manage sponsors.');
            return res.redirect('/dashboard');
        }

        const club = await Club.findByPk(user.clubId);
        
        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/dashboard');
        }

        const sponsor = await Sponsor.findByPk(sponsorId);
        
        if (!sponsor) {
            req.flash('error_msg', 'Sponsor not found.');
            return res.redirect('/clubs/manage/sponsors');
        }

        // Check if sponsor is linked to this club
        const isLinked = await sponsor.isAssociatedWithClub(club.id);
        if (!isLinked) {
            req.flash('error_msg', 'This sponsor is not linked to your club.');
            return res.redirect('/clubs/manage/sponsors');
        }

        // Remove the association
        await club.removeSponsor(sponsor);

        req.flash('success_msg', `Sponsor "${sponsor.sponsorName}" has been removed from your club.`);
        res.redirect('/clubs/manage/sponsors');

    } catch (error) {
        console.error('Error removing sponsor from club:', error);
        req.flash('error_msg', 'Error removing sponsor from club.');
        res.redirect('/clubs/manage/sponsors');
    }
};

/**
 * Show club alternate names management page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showClubAlternateNames = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.clubId) {
            req.flash('error_msg', 'You must be associated with a club to manage alternate names.');
            return res.redirect('/dashboard');
        }

        const club = await Club.findByPk(user.clubId, {
            include: [{
                model: ClubAlternateName,
                as: 'alternateNames',
                where: { isActive: true },
                required: false,
                order: [['displayName', 'ASC']]
            }]
        });

        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/dashboard');
        }

        res.render('clubs/alternate-names', {
            title: 'Manage Club Alternate Names',
            club,
            alternateNames: club.alternateNames || [],
            additionalCSS: ['/styles/club.styles.css']
        });
    } catch (error) {
        console.error('Error loading club alternate names:', error);
        req.flash('error_msg', 'Error loading club alternate names.');
        res.redirect('/clubs/manage');
    }
};

/**
 * Add new alternate name to club
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addAlternateName = async (req, res) => {
    try {
        const user = req.user;
        const { alternateName } = req.body;
        
        if (!user.clubId) {
            return res.status(403).json({
                success: false,
                message: 'You must be associated with a club to manage alternate names.'
            });
        }

        if (!alternateName || alternateName.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Alternate name must be at least 2 characters long.'
            });
        }

        const club = await Club.findByPk(user.clubId);
        
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found.'
            });
        }

        // Check if alternate name is unique for this club
        const isUnique = await ClubAlternateName.isUniqueForClub(alternateName, club.id);
        if (!isUnique) {
            return res.status(400).json({
                success: false,
                message: 'This alternate name already exists for your club.'
            });
        }

        // Create the alternate name
        const newAlternateName = await ClubAlternateName.create({
            clubId: club.id,
            alternateName: alternateName.trim(),
            displayName: alternateName.trim()
        });

        res.json({
            success: true,
            message: 'Alternate name added successfully.',
            alternateName: {
                id: newAlternateName.id,
                displayName: newAlternateName.displayName
            }
        });

    } catch (error) {
        console.error('Error adding alternate name:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding alternate name.'
        });
    }
};

/**
 * Update existing alternate name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAlternateName = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { alternateName } = req.body;
        
        if (!user.clubId) {
            return res.status(403).json({
                success: false,
                message: 'You must be associated with a club to manage alternate names.'
            });
        }

        if (!alternateName || alternateName.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Alternate name must be at least 2 characters long.'
            });
        }

        const existingAlternateName = await ClubAlternateName.findOne({
            where: { 
                id,
                clubId: user.clubId,
                isActive: true
            }
        });

        if (!existingAlternateName) {
            return res.status(404).json({
                success: false,
                message: 'Alternate name not found.'
            });
        }

        // Check if the new name is unique for this club (excluding current record)
        const isUnique = await ClubAlternateName.isUniqueForClub(alternateName, user.clubId, id);
        if (!isUnique) {
            return res.status(400).json({
                success: false,
                message: 'This alternate name already exists for your club.'
            });
        }

        // Update the alternate name
        await existingAlternateName.update({
            alternateName: alternateName.trim(),
            displayName: alternateName.trim()
        });

        res.json({
            success: true,
            message: 'Alternate name updated successfully.',
            alternateName: {
                id: existingAlternateName.id,
                displayName: existingAlternateName.displayName
            }
        });

    } catch (error) {
        console.error('Error updating alternate name:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating alternate name.'
        });
    }
};

/**
 * Delete alternate name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteAlternateName = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        
        if (!user.clubId) {
            return res.status(403).json({
                success: false,
                message: 'You must be associated with a club to manage alternate names.'
            });
        }

        const alternateName = await ClubAlternateName.findOne({
            where: { 
                id,
                clubId: user.clubId,
                isActive: true
            }
        });

        if (!alternateName) {
            return res.status(404).json({
                success: false,
                message: 'Alternate name not found.'
            });
        }

        // Soft delete by setting isActive to false
        await alternateName.update({ isActive: false });

        res.json({
            success: true,
            message: 'Alternate name deleted successfully.'
        });

    } catch (error) {
        console.error('Error deleting alternate name:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting alternate name.'
        });
    }
};

/**
 * Reorder club sponsors by priority
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const reorderClubSponsors = async (req, res) => {
    try {
        const user = req.user;
        const { sponsorOrder } = req.body; // Array of sponsor IDs in new order
        
        if (!user.clubId) {
            return res.status(403).json({
                success: false,
                message: 'You must be associated with a club to manage sponsors.'
            });
        }

        const club = await Club.findByPk(user.clubId);
        
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found.'
            });
        }

        if (!Array.isArray(sponsorOrder)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sponsor order data.'
            });
        }

        // Update display orders
        for (let i = 0; i < sponsorOrder.length; i++) {
            await ClubSponsor.update(
                { displayOrder: i + 1 },
                { 
                    where: { 
                        clubId: user.clubId, 
                        sponsorId: sponsorOrder[i] 
                    } 
                }
            );
        }

        res.json({
            success: true,
            message: 'Sponsor order updated successfully.'
        });

    } catch (error) {
        console.error('Error reordering club sponsors:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating sponsor order.'
        });
    }
};

/**
 * Show form to create a club on behalf of others
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCreateOnBehalf = async (req, res) => {
    try {
        // Only allow club delegates and admins to create clubs on behalf of others
        if (!req.user.clubId && !req.user.isAdmin) {
            req.flash('error_msg', 'You must be a club delegate or administrator to create clubs on behalf of others.');
            return res.redirect('/clubs');
        }

        res.render('clubs/create-on-behalf', {
            title: 'Create Club on Behalf of Others',
            user: req.user,
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
            errors: [],
            formData: {},
            additionalCSS: ['/styles/club.styles.css']
        });
    } catch (error) {
        console.error('Error showing create on behalf form:', error);
        req.flash('error_msg', 'An error occurred while loading the form.');
        res.redirect('/clubs');
    }
};

/**
 * Create a club on behalf of others (proxy creation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const postCreateOnBehalf = async (req, res) => {
    try {
        // Validate authorization
        if (!req.user.clubId && !req.user.isAdmin) {
            req.flash('error_msg', 'You must be a club delegate or administrator to create clubs on behalf of others.');
            return res.redirect('/clubs');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('clubs/create-on-behalf', {
                title: 'Create Club on Behalf of Others',
                user: req.user,
                states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
                errors: errors.array(),
                formData: req.body,
                additionalCSS: ['/styles/club.styles.css']
            });
        }

        const {
            clubName,
            state,
            location,
            contactEmail,
            contactPhone,
            contactPerson,
            description,
            inviteEmail,
            customMessage
        } = req.body;

        // Check if club name already exists
        const existingClub = await Club.findOne({ 
            where: { clubName: clubName.trim() } 
        });

        if (existingClub) {
            return res.render('clubs/create-on-behalf', {
                title: 'Create Club on Behalf of Others',
                user: req.user,
                states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
                errors: [{ msg: 'A club with this name already exists.' }],
                formData: req.body,
                additionalCSS: ['/styles/club.styles.css']
            });
        }

        // Create the club with proxy flag
        const newClub = await Club.create({
            clubName: clubName.trim(),
            state,
            location: location?.trim(),
            contactEmail: user.email, // Auto-populate from user
            contactPhone: user.phoneNumber, // Auto-populate from user's phone number
            contactPerson: user.getFullName(), // Auto-populate from user's name
            description: description?.trim(),
            createdByProxy: true,
            inviteEmail: inviteEmail.trim(),
            createdByUserId: req.user.id,
            isPubliclyListed: false // Keep unlisted until claimed
        });

        // Send ownership invitation email
        const emailService = require('../services/emailService');
        await emailService.sendClubOwnershipInvitation(
            newClub,
            req.user,
            inviteEmail.trim(),
            customMessage || ''
        );

        req.flash('success_msg', `Club "${clubName}" has been created and an ownership invitation has been sent to ${inviteEmail}.`);
        res.redirect(`/clubs/${newClub.id}`);

    } catch (error) {
        console.error('Error creating club on behalf:', error);
        req.flash('error_msg', 'An error occurred while creating the club.');
        res.render('clubs/create-on-behalf', {
            title: 'Create Club on Behalf of Others',
            user: req.user,
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
            errors: [{ msg: 'An error occurred while creating the club.' }],
            formData: req.body,
            additionalCSS: ['/styles/club.styles.css']
        });
    }
};

/**
 * Show club claiming page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getClaimOwnership = async (req, res) => {
    try {
        const club = await Club.findByPk(req.params.id);

        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/clubs');
        }

        // Check if club is available for claiming
        const isUnclaimed = await club.isUnclaimed();
        if (!isUnclaimed) {
            req.flash('error_msg', 'This club already has an owner or was not created for claiming.');
            return res.redirect(`/clubs/${club.id}`);
        }

        // Check if user can claim this club
        const canClaim = await club.canUserClaim(req.user);
        if (!canClaim) {
            req.flash('error_msg', 'You are not authorized to claim this club. Please ensure you are logged in with the invited email address.');
            return res.redirect(`/clubs/${club.id}`);
        }

        const proxyCreator = await club.getProxyCreator();

        res.render('clubs/claim-ownership', {
            title: `Claim Ownership - ${club.clubName}`,
            user: req.user,
            club,
            proxyCreator,
            additionalCSS: ['/styles/club.styles.css']
        });

    } catch (error) {
        console.error('Error showing claim ownership page:', error);
        req.flash('error_msg', 'An error occurred while loading the claiming page.');
        res.redirect('/clubs');
    }
};

/**
 * Process club ownership claim
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const postClaimOwnership = async (req, res) => {
    try {
        const club = await Club.findByPk(req.params.id);

        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/clubs');
        }

        // Verify user can claim this club
        const canClaim = await club.canUserClaim(req.user);
        if (!canClaim) {
            req.flash('error_msg', 'You are not authorized to claim this club.');
            return res.redirect(`/clubs/${club.id}`);
        }

        // Update user to be associated with this club as primary delegate
        await req.user.update({
            clubId: club.id,
            isPrimaryDelegate: true
        });

        // Clear proxy flags and invite email
        await club.update({
            createdByProxy: false,
            inviteEmail: null,
            isPubliclyListed: true // Make public now that it's claimed
        });

        req.flash('success_msg', `Congratulations! You are now the primary delegate for ${club.clubName}. You can manage your club's information and create carnivals.`);
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error claiming club ownership:', error);
        req.flash('error_msg', 'An error occurred while claiming ownership.');
        res.redirect(`/clubs/${req.params.id}`);
    }
};

/**
 * Create a new club (for users without clubs)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createClub = async (req, res) => {
    try {
        const user = req.user;
        
        // Ensure user doesn't already have a club
        if (user.clubId) {
            req.flash('error_msg', 'You are already associated with a club. You can only be a member of one club at a time.');
            return res.redirect('/clubs/manage');
        }

        // Check if this is actually a form submission (not just a page load)
        if (req.method !== 'POST') {
            req.flash('error_msg', 'Invalid request method.');
            return res.redirect('/clubs/manage');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Log the specific validation errors for debugging
            console.error('Club creation validation errors:', errors.array());
            
            // Get available clubs that user could potentially join
            const availableClubs = await Club.findAll({
                where: {
                    isActive: true,
                    isPubliclyListed: true
                },
                include: [{
                    model: User,
                    as: 'delegates',
                    where: { isActive: true },
                    required: false,
                    attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate']
                }],
                order: [['clubName', 'ASC']]
            });

            // Get clubs that were created on behalf of others and might match this user's email
            const claimableClubs = await Club.findAll({
                where: {
                    createdByProxy: true,
                    inviteEmail: user.email,
                    isActive: true
                }
            });

            // Render the form with errors and preserved data instead of redirecting
            return res.render('clubs/club-options', {
                title: 'Join or Create a Club',
                user,
                availableClubs,
                claimableClubs,
                states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
                errors: errors.array(),
                formData: req.body,
                additionalCSS: ['/styles/club.styles.css']
            });
        }

        // Validate required fields are present and not empty
        const { clubName, state, location, description } = req.body;

        if (!clubName || !clubName.trim()) {
            // Get clubs data for re-rendering
            const availableClubs = await Club.findAll({
                where: { isActive: true, isPubliclyListed: true },
                include: [{ model: User, as: 'delegates', where: { isActive: true }, required: false, attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate'] }],
                order: [['clubName', 'ASC']]
            });
            const claimableClubs = await Club.findAll({
                where: { createdByProxy: true, inviteEmail: user.email, isActive: true }
            });

            return res.render('clubs/club-options', {
                title: 'Join or Create a Club',
                user,
                availableClubs,
                claimableClubs,
                states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
                errors: [{ msg: 'Club name is required.' }],
                formData: req.body,
                additionalCSS: ['/styles/club.styles.css']
            });
        }

        if (!state) {
            // Get clubs data for re-rendering
            const availableClubs = await Club.findAll({
                where: { isActive: true, isPubliclyListed: true },
                include: [{ model: User, as: 'delegates', where: { isActive: true }, required: false, attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate'] }],
                order: [['clubName', 'ASC']]
            });
            const claimableClubs = await Club.findAll({
                where: { createdByProxy: true, inviteEmail: user.email, isActive: true }
            });

            return res.render('clubs/club-options', {
                title: 'Join or Create a Club',
                user,
                availableClubs,
                claimableClubs,
                states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
                errors: [{ msg: 'State is required.' }],
                formData: req.body,
                additionalCSS: ['/styles/club.styles.css']
            });
        }

        if (!location || !location.trim()) {
            // Get clubs data for re-rendering
            const availableClubs = await Club.findAll({
                where: { isActive: true, isPubliclyListed: true },
                include: [{ model: User, as: 'delegates', where: { isActive: true }, required: false, attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate'] }],
                order: [['clubName', 'ASC']]
            });
            const claimableClubs = await Club.findAll({
                where: { createdByProxy: true, inviteEmail: user.email, isActive: true }
            });

            return res.render('clubs/club-options', {
                title: 'Join or Create a Club',
                user,
                availableClubs,
                claimableClubs,
                states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
                errors: [{ msg: 'Location is required.' }],
                formData: req.body,
                additionalCSS: ['/styles/club.styles.css']
            });
        }

        // Debug log the received data
        console.log('Club creation data received:', {
            clubName: clubName?.trim(),
            state,
            location: location?.trim(),
            description: description?.trim()
        });

        // Check if club name already exists
        const existingClub = await Club.findOne({
            where: { clubName: clubName.trim() }
        });

        if (existingClub) {
            // Get clubs data for re-rendering
            const availableClubs = await Club.findAll({
                where: { isActive: true, isPubliclyListed: true },
                include: [{ model: User, as: 'delegates', where: { isActive: true }, required: false, attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate'] }],
                order: [['clubName', 'ASC']]
            });
            const claimableClubs = await Club.findAll({
                where: { createdByProxy: true, inviteEmail: user.email, isActive: true }
            });

            return res.render('clubs/club-options', {
                title: 'Join or Create a Club',
                user,
                availableClubs,
                claimableClubs,
                states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
                errors: [{ msg: 'A club with this name already exists. Please choose a different name.' }],
                formData: req.body,
                additionalCSS: ['/styles/club.styles.css']
            });
        }

        // Use database transaction for safe club creation and user association
        const { sequelize } = require('../models');
        const transaction = await sequelize.transaction();

        try {
            // Create the new club
            const newClub = await Club.create({
                clubName: clubName.trim(),
                state,
                location: location.trim(),
                description: description?.trim(),
                contactEmail: user.email, // Auto-populate from user
                contactPhone: user.phoneNumber, // Auto-populate from user's phone number
                contactPerson: user.getFullName(), // Auto-populate from user's name
                isActive: true,
                isPubliclyListed: true,
                createdByUserId: user.id
            }, { transaction });

            // Associate user with the new club as primary delegate
            await user.update({
                clubId: newClub.id,
                isPrimaryDelegate: true
            }, { transaction });

            // Commit the transaction
            await transaction.commit();

            console.log(`✅ New club created: ${newClub.clubName} (ID: ${newClub.id}) by user ${user.email}`);
            
            req.flash('success_msg', `Congratulations! You have successfully created "${newClub.clubName}" and are now the primary delegate. You can start creating carnivals and managing your club.`);
            res.redirect('/dashboard');

        } catch (transactionError) {
            // Rollback the transaction
            await transaction.rollback();
            throw transactionError;
        }

    } catch (error) {
        console.error('Error creating club:', error);
        
        // Even in case of unexpected errors, try to preserve form data
        try {
            const availableClubs = await Club.findAll({
                where: { isActive: true, isPubliclyListed: true },
                include: [{ model: User, as: 'delegates', where: { isActive: true }, required: false, attributes: ['id', 'firstName', 'lastName', 'isPrimaryDelegate'] }],
                order: [['clubName', 'ASC']]
            });
            const claimableClubs = await Club.findAll({
                where: { createdByProxy: true, inviteEmail: req.user.email, isActive: true }
            });

            return res.render('clubs/club-options', {
                title: 'Join or Create a Club',
                user: req.user,
                availableClubs,
                claimableClubs,
                states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
                errors: [{ msg: 'An error occurred while creating the club. Please try again.' }],
                formData: req.body,
                additionalCSS: ['/styles/club.styles.css']
            });
        } catch (renderError) {
            // Fallback to redirect if rendering fails
            req.flash('error_msg', 'An error occurred while creating the club. Please try again.');
            res.redirect('/clubs/manage');
        }
    }
};

/**
 * API endpoint for club autocomplete search
 * Searches both club names and alternate names
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchClubs = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.json({
                success: true,
                clubs: []
            });
        }

        const searchTerm = q.trim();

        // Search clubs by name
        const clubsByName = await Club.findAll({
            where: {
                clubName: { [Op.like]: `%${searchTerm}%` },
                isActive: true
            },
            attributes: ['id', 'clubName', 'location', 'state'],
            order: [['clubName', 'ASC']],
            limit: 10
        });

        // Search clubs by alternate names
        const clubIdsByAlternate = await ClubAlternateName.searchClubsByAlternateName(searchTerm);
        
        let clubsByAlternate = [];
        if (clubIdsByAlternate.length > 0) {
            clubsByAlternate = await Club.findAll({
                where: {
                    id: { [Op.in]: clubIdsByAlternate },
                    isActive: true
                },
                attributes: ['id', 'clubName', 'location', 'state'],
                include: [{
                    model: ClubAlternateName,
                    as: 'alternateNames',
                    where: {
                        alternateName: { [Op.like]: `%${searchTerm}%` },
                        isActive: true
                    },
                    attributes: ['alternateName'],
                    required: true
                }],
                order: [['clubName', 'ASC']],
                limit: 10
            });
        }

        // Combine and deduplicate results
        const allClubs = [...clubsByName];
        
        clubsByAlternate.forEach(altClub => {
            if (!allClubs.find(club => club.id === altClub.id)) {
                allClubs.push(altClub);
            }
        });

        // Format results for autocomplete
        const formattedClubs = allClubs.slice(0, 10).map(club => {
            const matchedAlternate = club.alternateNames && club.alternateNames.length > 0 
                ? club.alternateNames[0].alternateName 
                : null;

            return {
                id: club.id,
                clubName: club.clubName,
                location: club.location,
                state: club.state,
                matchedAlternate,
                displayText: matchedAlternate 
                    ? `${club.clubName} (also known as: ${matchedAlternate})`
                    : club.clubName,
                subtitle: `${club.location}, ${club.state}`
            };
        });

        res.json({
            success: true,
            clubs: formattedClubs
        });

    } catch (error) {
        console.error('Error searching clubs:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching clubs'
        });
    }
};

/**
 * Join an existing club
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const joinClub = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        
        // Ensure user doesn't already have a club
        if (user.clubId) {
            req.flash('error_msg', 'You are already associated with a club. You can only be a member of one club at a time.');
            return res.redirect('/clubs/manage');
        }

        const club = await Club.findOne({
            where: {
                id,
                isActive: true
            },
            include: [{
                model: User,
                as: 'delegates',
                where: { isActive: true, isPrimaryDelegate: true },
                required: false,
                attributes: ['id', 'firstName', 'lastName', 'email', 'isPrimaryDelegate']
            }]
        });

        if (!club) {
            req.flash('error_msg', 'Club not found or is not active.');
            return res.redirect('/clubs/manage');
        }

        // Check if club has a primary delegate
        const primaryDelegate = club.delegates && club.delegates.find(delegate => delegate.isPrimaryDelegate);
        
        if (primaryDelegate) {
            // Club has a primary delegate - user should contact them for an invitation
            req.flash('error_msg', `This club already has a primary delegate (${primaryDelegate.firstName} ${primaryDelegate.lastName}). Please contact them to request an invitation to join the club. You can find their contact information on the club's profile page.`);
            return res.redirect(`/clubs/${club.id}`);
        }

        // Club doesn't have a primary delegate - allow direct joining
        // Use database transaction for safe user association
        const { sequelize } = require('../models');
        const transaction = await sequelize.transaction();

        try {
            // Associate user with the club as a regular delegate (not primary)
            await user.update({
                clubId: club.id,
                isPrimaryDelegate: false
            }, { transaction });

            // Commit the transaction
            await transaction.commit();

            console.log(`✅ User ${user.email} joined club: ${club.clubName} (ID: ${club.id})`);
            
            req.flash('success_msg', `You have successfully joined "${club.clubName}" as a club delegate. You can now create carnivals for this club.`);
            res.redirect('/dashboard');

        } catch (transactionError) {
            // Rollback the transaction
            await transaction.rollback();
            throw transactionError;
        }

    } catch (error) {
        console.error('Error joining club:', error);
        req.flash('error_msg', 'An error occurred while joining the club. Please try again.');
        res.redirect('/clubs/manage');
    }
};

/**
 * Leave current club (disassociate user from club)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const leaveClub = async (req, res) => {
    try {
        const user = req.user;
        const { confirmed, leaveAction, newPrimaryDelegateId } = req.body;
        
        // Ensure user has a club to leave
        if (!user.clubId) {
            req.flash('error_msg', 'You are not currently associated with any club.');
            return res.redirect('/dashboard');
        }

        // Validate confirmation
        if (!confirmed || confirmed !== 'true') {
            req.flash('error_msg', 'You must confirm that you want to leave the club.');
            return res.redirect('/dashboard');
        }

        // Get the club information for messaging
        const club = await Club.findByPk(user.clubId, {
            attributes: ['id', 'clubName', 'isActive']
        });

        if (!club) {
            req.flash('error_msg', 'Club not found.');
            return res.redirect('/dashboard');
        }

        // Use database transaction for safe user disassociation
        const { sequelize } = require('../models');
        const transaction = await sequelize.transaction();

        try {
            const clubName = club.clubName;
            let successMessage = '';
            
            if (user.isPrimaryDelegate) {
                // Handle primary delegate leaving based on selected action
                if (leaveAction === 'transfer' && newPrimaryDelegateId) {
                    // Transfer primary role to specific delegate
                    const newPrimaryDelegate = await User.findOne({
                        where: {
                            id: newPrimaryDelegateId,
                            clubId: user.clubId,
                            isActive: true,
                            isPrimaryDelegate: false
                        },
                        transaction
                    });

                    if (!newPrimaryDelegate) {
                        await transaction.rollback();
                        req.flash('error_msg', 'Selected delegate not found or is not eligible for primary role.');
                        return res.redirect('/dashboard');
                    }

                    // Transfer the primary delegate role
                    await newPrimaryDelegate.update({
                        isPrimaryDelegate: true
                    }, { transaction });

                    successMessage = `You have successfully left "${clubName}". Primary delegate role has been transferred to ${newPrimaryDelegate.firstName} ${newPrimaryDelegate.lastName}.`;
                    console.log(`✅ Primary delegate role transferred from ${user.email} to ${newPrimaryDelegate.email} when leaving club`);

                } else if (leaveAction === 'deactivate') {
                    // Primary delegate chose to deactivate the club
                    await club.update({
                        isActive: false,
                        isPubliclyListed: false
                    }, { transaction });
                    
                    successMessage = `You have successfully left "${clubName}" and the club has been deactivated. The club will no longer appear in public listings.`;
                    console.log(`✅ Primary delegate ${user.email} left and deactivated club: ${clubName} (ID: ${club.id})`);

                } else {
                    // Primary delegate chose to leave club available for others (leaveAction === 'available')
                    const otherDelegates = await User.findAll({
                        where: {
                            clubId: user.clubId,
                            isActive: true,
                            isPrimaryDelegate: false,
                            id: { [Op.ne]: user.id }
                        },
                        transaction
                    });

                    if (otherDelegates.length > 0) {
                        // Auto-promote the first available delegate to primary
                        await otherDelegates[0].update({
                            isPrimaryDelegate: true
                        }, { transaction });
                        
                        successMessage = `You have successfully left "${clubName}". Primary delegate role has been automatically transferred to ${otherDelegates[0].firstName} ${otherDelegates[0].lastName}.`;
                        console.log(`✅ Primary delegate role auto-transferred from ${user.email} to ${otherDelegates[0].email} when leaving club`);
                    } else {
                        // No other delegates - club becomes available for claiming
                        successMessage = `You have successfully left "${clubName}". The club is now available for other users to claim or join.`;
                        console.log(`✅ Primary delegate ${user.email} left club: ${clubName} (ID: ${club.id}) - club available for claiming`);
                    }
                }
            } else {
                // Regular delegate leaving
                successMessage = `You have successfully left "${clubName}". You can now join a different club if needed.`;
                console.log(`✅ User ${user.email} left club: ${clubName} (ID: ${club.id})`);
            }

            // Disassociate user from the club
            await user.update({
                clubId: null,
                isPrimaryDelegate: false
            }, { transaction });

            // Commit the transaction
            await transaction.commit();

            req.flash('success_msg', successMessage);
            res.redirect('/dashboard');

        } catch (transactionError) {
            // Rollback the transaction
            await transaction.rollback();
            throw transactionError;
        }

    } catch (error) {
        console.error('Error leaving club:', error);
        req.flash('error_msg', 'An error occurred while leaving the club. Please try again.');
        res.redirect('/dashboard');
    }
};

module.exports = {
    showClubListings,
    showClubProfile,
    showClubManagement,
    createClub,
    searchClubs,
    joinClub,
    updateClubProfile,
    getClubImages,
    deleteClubImage,
    showClubSponsors,
    showAddSponsor,
    addSponsorToClub,
    removeSponsorFromClub,
    reorderClubSponsors,
    showClubAlternateNames,
    addAlternateName,
    updateAlternateName,
    deleteAlternateName,
    getCreateOnBehalf,
    postCreateOnBehalf,
    getClaimOwnership,
    postClaimOwnership,
    leaveClub
};