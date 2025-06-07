/**
 * Club Controller - MVC Architecture Implementation
 * 
 * Handles club management, public listings, and club profile operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const { Club, User, Carnival } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

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

        // Get club's carnivals
        const Carnival = require('../models/Carnival');
        const User = require('../models/User');
        
        // Get delegates for this club
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
            createdByUserId: delegateIds,
            isActive: true
          },
          include: [{
            model: User,
            as: 'createdBy',
            attributes: ['firstName', 'lastName', 'email']
          }],
          order: [['startDate', 'ASC']]
        });

        const delegates_full = await club.getDelegates();
        const primaryDelegate = await club.getPrimaryDelegate();

        res.render('clubs/show', {
            title: `${club.clubName} - Masters Rugby League Club`,
            club,
            carnivals,
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

        await club.update({
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
        });

        req.flash('success_msg', 'Club profile updated successfully!');
        res.redirect('/clubs/manage');
    } catch (error) {
        console.error('Error updating club profile:', error);
        req.flash('error_msg', 'Error updating club profile.');
        res.redirect('/clubs/manage');
    }
};

module.exports = {
    showClubListings,
    showClubProfile,
    showClubManagement,
    updateClubProfile
};