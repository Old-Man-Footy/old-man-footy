/**
 * Sponsor Controller - MVC Architecture Implementation
 * 
 * Handles sponsor management, public listings, and sponsor profile operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const { Sponsor, Club } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const ImageNamingService = require('../services/imageNamingService');

/**
 * Display public sponsor listings with search and filter options
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showSponsorListings = async (req, res) => {
    try {
        const { search, state } = req.query;
        
        // Build where clause for filters
        const whereClause = {
            isActive: true,
            isPubliclyVisible: true
        };

        if (search) {
            whereClause[Op.or] = [
                { sponsorName: { [Op.like]: `%${search}%` } },
                { businessType: { [Op.like]: `%${search}%` } },
                { location: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        if (state) {
            whereClause.state = state;
        }

        const sponsors = await Sponsor.findAll({
            where: whereClause,
            order: [['sponsorName', 'ASC']],
            include: [{
                model: Club,
                as: 'clubs',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'clubName', 'state'],
                through: { attributes: [] }
            }]
        });

        // Get sponsor statistics for each sponsor
        const sponsorsWithStats = await Promise.all(sponsors.map(async (sponsor) => {
            const clubCount = await sponsor.getClubCount();
            return {
                ...sponsor.toJSON(),
                clubCount
            };
        }));

        res.render('sponsors/list', {
            title: 'Our Sponsors',
            sponsors: sponsorsWithStats,
            filters: { search, state },
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']
        });
    } catch (error) {
        console.error('Error loading sponsor listings:', error);
        req.flash('error_msg', 'Error loading sponsor listings.');
        res.redirect('/');
    }
};

/**
 * Display individual sponsor profile page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showSponsorProfile = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`showSponsorProfile called with ID: ${id}`);
        
        const sponsor = await Sponsor.findOne({
            where: {
                id,
                isActive: true,
                isPubliclyVisible: true
            },
            include: [{
                model: Club,
                as: 'clubs',
                where: { isActive: true, isPubliclyListed: true },
                required: false,
                attributes: ['id', 'clubName', 'state', 'location', 'logoUrl'],
                through: { attributes: [] }
            }]
        });

        console.log(`Sponsor found:`, sponsor ? 'YES' : 'NO');
        if (sponsor) {
            console.log(`Sponsor name: ${sponsor.sponsorName}`);
            console.log(`Associated clubs count: ${sponsor.clubs ? sponsor.clubs.length : 0}`);
        }

        if (!sponsor) {
            console.log('Sponsor not found, redirecting to /sponsors');
            req.flash('error_msg', 'Sponsor not found.');
            return res.redirect('/sponsors');
        }

        console.log('Rendering sponsors/show template');
        res.render('sponsors/show', {
            title: `${sponsor.sponsorName} - Sponsor Profile`,
            sponsor,
            associatedClubs: sponsor.clubs || [],
            user: req.user || null
        });
    } catch (error) {
        console.error('Error loading sponsor profile:', error);
        req.flash('error_msg', 'Error loading sponsor profile.');
        res.redirect('/sponsors');
    }
};

/**
 * Show sponsor creation form (for admins only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCreateSponsor = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            req.flash('error_msg', 'Access denied. Admin privileges required.');
            return res.redirect('/dashboard');
        }

        const clubs = await Club.findAll({
            where: { isActive: true },
            order: [['clubName', 'ASC']],
            attributes: ['id', 'clubName', 'state']
        });

        res.render('sponsors/new', {
            title: 'Add New Sponsor',
            clubs,
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
            sponsorshipLevels: ['Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind']
        });
    } catch (error) {
        console.error('Error loading sponsor creation form:', error);
        req.flash('error_msg', 'Error loading sponsor creation form.');
        res.redirect('/dashboard');
    }
};

/**
 * Create a new sponsor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createSponsor = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            req.flash('error_msg', 'Access denied. Admin privileges required.');
            return res.redirect('/dashboard');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the validation errors.');
            return res.redirect('/sponsors/new');
        }

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
            sponsorshipLevel,
            isPubliclyVisible,
            associatedClubs
        } = req.body;

        // Prepare sponsor data
        const sponsorData = {
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
            isPubliclyVisible: isPubliclyVisible === 'on'
        };

        // Handle logo upload
        if (req.structuredUploads && req.structuredUploads.length > 0) {
            const logoUpload = req.structuredUploads.find(upload => upload.fieldname === 'logo');
            if (logoUpload) {
                sponsorData.logoUrl = logoUpload.path;
            }
        }

        const sponsor = await Sponsor.create(sponsorData);

        // Associate with selected clubs
        if (associatedClubs && Array.isArray(associatedClubs)) {
            const clubIds = associatedClubs.map(id => parseInt(id)).filter(id => !isNaN(id));
            const clubs = await Club.findAll({
                where: { id: clubIds, isActive: true }
            });
            await sponsor.setClubs(clubs);
        }

        req.flash('success_msg', 'Sponsor created successfully!');
        res.redirect(`/sponsors/${sponsor.id}`);
    } catch (error) {
        console.error('Error creating sponsor:', error);
        req.flash('error_msg', 'Error creating sponsor.');
        res.redirect('/sponsors/new');
    }
};

/**
 * Show sponsor edit form (for admins only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditSponsor = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            req.flash('error_msg', 'Access denied. Admin privileges required.');
            return res.redirect('/dashboard');
        }

        const { id } = req.params;
        
        const sponsor = await Sponsor.findOne({
            where: { id, isActive: true },
            include: [{
                model: Club,
                as: 'clubs',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'clubName', 'state'],
                through: { attributes: [] }
            }]
        });

        if (!sponsor) {
            req.flash('error_msg', 'Sponsor not found.');
            return res.redirect('/sponsors');
        }

        const allClubs = await Club.findAll({
            where: { isActive: true },
            order: [['clubName', 'ASC']],
            attributes: ['id', 'clubName', 'state']
        });

        res.render('sponsors/edit', {
            title: `Edit ${sponsor.sponsorName}`,
            sponsor,
            allClubs,
            associatedClubIds: sponsor.clubs.map(club => club.id),
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
            sponsorshipLevels: ['Gold', 'Silver', 'Bronze', 'Supporting', 'In-Kind']
        });
    } catch (error) {
        console.error('Error loading sponsor edit form:', error);
        req.flash('error_msg', 'Error loading sponsor edit form.');
        res.redirect('/sponsors');
    }
};

/**
 * Update sponsor information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateSponsor = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            req.flash('error_msg', 'Access denied. Admin privileges required.');
            return res.redirect('/dashboard');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the validation errors.');
            return res.redirect(`/sponsors/${req.params.id}/edit`);
        }

        const { id } = req.params;
        const sponsor = await Sponsor.findOne({
            where: { id, isActive: true }
        });

        if (!sponsor) {
            req.flash('error_msg', 'Sponsor not found.');
            return res.redirect('/sponsors');
        }

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
            sponsorshipLevel,
            isPubliclyVisible,
            associatedClubs
        } = req.body;

        // Prepare update data
        const updateData = {
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
            isPubliclyVisible: isPubliclyVisible === 'on'
        };

        // Handle logo upload
        if (req.structuredUploads && req.structuredUploads.length > 0) {
            const logoUpload = req.structuredUploads.find(upload => upload.fieldname === 'logo');
            if (logoUpload) {
                updateData.logoUrl = logoUpload.path;
            }
        }

        await sponsor.update(updateData);

        // Update club associations
        if (associatedClubs) {
            const clubIds = Array.isArray(associatedClubs) 
                ? associatedClubs.map(id => parseInt(id)).filter(id => !isNaN(id))
                : [parseInt(associatedClubs)].filter(id => !isNaN(id));
            
            const clubs = await Club.findAll({
                where: { id: clubIds, isActive: true }
            });
            await sponsor.setClubs(clubs);
        } else {
            // Clear all associations if none selected
            await sponsor.setClubs([]);
        }

        req.flash('success_msg', 'Sponsor updated successfully!');
        res.redirect(`/sponsors/${sponsor.id}`);
    } catch (error) {
        console.error('Error updating sponsor:', error);
        req.flash('error_msg', 'Error updating sponsor.');
        res.redirect(`/sponsors/${req.params.id}/edit`);
    }
};

/**
 * Delete/deactivate a sponsor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSponsor = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { id } = req.params;
        const sponsor = await Sponsor.findOne({
            where: { id, isActive: true }
        });

        if (!sponsor) {
            return res.status(404).json({
                success: false,
                message: 'Sponsor not found.'
            });
        }

        // Soft delete by setting isActive to false
        await sponsor.update({ isActive: false });

        res.json({
            success: true,
            message: 'Sponsor deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting sponsor:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting sponsor.'
        });
    }
};

/**
 * Toggle sponsor active status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const toggleSponsorStatus = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { id } = req.params;
        const { isActive } = req.body;

        const sponsor = await Sponsor.findByPk(id);

        if (!sponsor) {
            return res.status(404).json({
                success: false,
                message: 'Sponsor not found.'
            });
        }

        await sponsor.update({ isActive: Boolean(isActive) });

        res.json({
            success: true,
            message: `Sponsor ${isActive ? 'activated' : 'deactivated'} successfully.`,
            isActive: sponsor.isActive
        });
    } catch (error) {
        console.error('Error toggling sponsor status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating sponsor status.'
        });
    }
};

module.exports = {
    showSponsorListings,
    showSponsorProfile,
    showCreateSponsor,
    createSponsor,
    showEditSponsor,
    updateSponsor,
    deleteSponsor,
    toggleSponsorStatus
};