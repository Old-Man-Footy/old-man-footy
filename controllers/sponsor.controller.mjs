/**
 * Sponsor Controller - MVC Architecture Implementation
 * 
 * Handles sponsor management, public listings, and sponsor profile operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import { Sponsor, Club, User, Carnival } from '../models/index.mjs';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';
import ImageNamingService from '../services/imageNamingService.mjs';
import { AUSTRALIAN_STATES, SPONSORSHIP_LEVELS } from '../config/constants.mjs';

/**
 * Display public sponsor listings with search and filter options
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const showSponsorListings = async (req, res) => {
    try {
        const { search, state, businessType } = req.query;
        
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
            title: 'Find Masters Rugby League Sponsors',
            sponsors: sponsorsWithStats,
            filters: { search, state, businessType },
            states: AUSTRALIAN_STATES,
            additionalCSS: ['/styles/sponsor.styles.css']
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
export const showSponsorProfile = async (req, res) => {
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
            user: req.user || null,
            additionalCSS: ['/styles/sponsor.styles.css']
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
export const showCreateSponsor = async (req, res) => {
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

        res.render('sponsors/create', {
            title: 'Add New Sponsor',
            user: req.user,
            states: AUSTRALIAN_STATES,
            sponsorshipLevels: SPONSORSHIP_LEVELS,
            additionalCSS: ['/styles/sponsor.styles.css'],
            errors: [],
            formData: {}
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
export const createSponsor = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            req.flash('error_msg', 'Access denied. Admin privileges required.');
            return res.redirect('/dashboard');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the validation errors.');
            return res.render('sponsors/create', {
                title: 'Add New Sponsor', 
                user: req.user,
                states: AUSTRALIAN_STATES,
                sponsorshipLevels: SPONSORSHIP_LEVELS,
                errors: errors.array(),
                formData: req.body,
                additionalCSS: ['/styles/sponsor.styles.css']
            });
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
export const showEditSponsor = async (req, res) => {
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

        res.render('sponsors/edit', {
            title: 'Edit Sponsor',
            sponsor,
            states: AUSTRALIAN_STATES,
            sponsorshipLevels: SPONSORSHIP_LEVELS,
            additionalCSS: ['/styles/sponsor.styles.css']
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
export const updateSponsor = async (req, res) => {
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
export const deleteSponsor = async (req, res) => {
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
export const toggleSponsorStatus = async (req, res) => {
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

/**
 * Check for duplicate sponsors by name (API endpoint)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkDuplicateSponsor = async (req, res) => {
    try {
        const { sponsorName } = req.body;
        
        if (!sponsorName || sponsorName.trim().length < 3) {
            return res.json({
                isDuplicate: false,
                existingSponsor: null
            });
        }

        const trimmedName = sponsorName.trim();
        
        // Look for exact matches or very similar names
        const existingSponsor = await Sponsor.findOne({
            where: {
                isActive: true,
                [Op.or]: [
                    { sponsorName: { [Op.like]: trimmedName } }, // Exact match (case insensitive)
                    { sponsorName: { [Op.like]: `%${trimmedName}%` } } // Contains match
                ]
            },
            order: [
                // Prioritize exact matches
                [Sponsor.sequelize.fn('LENGTH', Sponsor.sequelize.col('sponsorName')), 'ASC']
            ]
        });

        if (existingSponsor) {
            // Check if it's a close enough match to suggest linking
            const similarity = calculateNameSimilarity(trimmedName.toLowerCase(), existingSponsor.sponsorName.toLowerCase());
            
            if (similarity > 0.7) { // 70% similarity threshold
                return res.json({
                    isDuplicate: true,
                    existingSponsor: {
                        id: existingSponsor.id,
                        sponsorName: existingSponsor.sponsorName,
                        businessType: existingSponsor.businessType,
                        location: existingSponsor.location,
                        state: existingSponsor.state,
                        description: existingSponsor.description,
                        logoUrl: existingSponsor.logoUrl
                    }
                });
            }
        }

        res.json({
            isDuplicate: false,
            existingSponsor: null
        });
    } catch (error) {
        console.error('Error checking for duplicate sponsors:', error);
        res.status(500).json({
            isDuplicate: false,
            existingSponsor: null,
            error: 'Server error'
        });
    }
};

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity ratio between 0 and 1
 */
function calculateNameSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}