/**
 * CarnivalClub Controller - MVC Architecture Implementation
 * 
 * Handles carnival-club relationship management, including club registration
 * for carnivals and attendance tracking.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

const { CarnivalClub, Carnival, Club, User } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

/**
 * Show carnival attendees management page (for carnival organizers)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCarnivalAttendees = async (req, res) => {
    try {
        const { carnivalId } = req.params;
        const user = req.user;

        // Get carnival and verify user has permission to manage it
        const carnival = await Carnival.findOne({
            where: {
                id: carnivalId,
                createdByUserId: user.id,
                isActive: true
            }
        });

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found or you do not have permission to manage it.');
            return res.redirect('/carnivals');
        }

        // Get all registered clubs for this carnival
        const attendingClubs = await CarnivalClub.findAll({
            where: {
                carnivalId: carnivalId,
                isActive: true
            },
            include: [{
                model: Club,
                as: 'club',
                where: { isActive: true },
                attributes: ['id', 'clubName', 'state', 'location', 'logoUrl']
            }],
            order: [['displayOrder', 'ASC'], ['registrationDate', 'ASC']]
        });

        // Get attendance statistics
        const totalAttendees = attendingClubs.length;
        const paidAttendees = attendingClubs.filter(cc => cc.isPaid).length;
        const totalPlayerCount = attendingClubs.reduce((sum, cc) => sum + (cc.playerCount || 0), 0);

        res.render('carnivals/attendees', {
            title: `${carnival.carnivalName} - Manage Attendees`,
            carnival,
            attendingClubs,
            totalAttendees,
            paidAttendees,
            totalPlayerCount,
            additionalCSS: ['/styles/carnival.styles.css']
        });
    } catch (error) {
        console.error('Error loading carnival attendees:', error);
        req.flash('error_msg', 'Error loading carnival attendees.');
        res.redirect('/carnivals');
    }
};

/**
 * Show add club to carnival form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showAddClubToCarnival = async (req, res) => {
    try {
        const { carnivalId } = req.params;
        const user = req.user;

        // Get carnival and verify permissions
        const carnival = await Carnival.findOne({
            where: {
                id: carnivalId,
                createdByUserId: user.id,
                isActive: true
            }
        });

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found or you do not have permission to manage it.');
            return res.redirect('/carnivals');
        }

        // Get all active clubs not already registered for this carnival
        const registeredClubIds = await CarnivalClub.findAll({
            where: {
                carnivalId: carnivalId,
                isActive: true
            },
            attributes: ['clubId']
        }).then(results => results.map(r => r.clubId));

        const availableClubs = await Club.findAll({
            where: {
                isActive: true,
                isPubliclyListed: true,
                id: { [Op.notIn]: registeredClubIds }
            },
            order: [['clubName', 'ASC']],
            attributes: ['id', 'clubName', 'state', 'location']
        });

        res.render('carnivals/add-club', {
            title: `Add Club to ${carnival.carnivalName}`,
            carnival,
            availableClubs,
            additionalCSS: ['/styles/carnival.styles.css']
        });
    } catch (error) {
        console.error('Error loading add club form:', error);
        req.flash('error_msg', 'Error loading add club form.');
        res.redirect(`/carnivals/${req.params.carnivalId}/attendees`);
    }
};

/**
 * Register a club for a carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerClubForCarnival = async (req, res) => {
    try {
        const { carnivalId } = req.params;
        const user = req.user;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the validation errors.');
            return res.redirect(`/carnivals/${carnivalId}/attendees/add`);
        }

        // Verify carnival ownership
        const carnival = await Carnival.findOne({
            where: {
                id: carnivalId,
                createdByUserId: user.id,
                isActive: true
            }
        });

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found or you do not have permission to manage it.');
            return res.redirect('/carnivals');
        }

        const {
            clubId,
            playerCount,
            teamName,
            contactPerson,
            contactEmail,
            contactPhone,
            specialRequirements,
            registrationNotes,
            paymentAmount,
            isPaid
        } = req.body;

        // Check if club is already registered
        const existingRegistration = await CarnivalClub.findOne({
            where: {
                carnivalId,
                clubId,
                isActive: true
            }
        });

        if (existingRegistration) {
            req.flash('error_msg', 'This club is already registered for this carnival.');
            return res.redirect(`/carnivals/${carnivalId}/attendees`);
        }

        // Get current count for display order
        const currentCount = await CarnivalClub.count({
            where: {
                carnivalId,
                isActive: true
            }
        });

        // Create the registration
        const registrationData = {
            carnivalId: parseInt(carnivalId),
            clubId: parseInt(clubId),
            playerCount: playerCount ? parseInt(playerCount) : null,
            teamName: teamName?.trim() || null,
            contactPerson: contactPerson?.trim() || null,
            contactEmail: contactEmail?.trim() || null,
            contactPhone: contactPhone?.trim() || null,
            specialRequirements: specialRequirements?.trim() || null,
            registrationNotes: registrationNotes?.trim() || null,
            paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
            isPaid: isPaid === 'on',
            paymentDate: isPaid === 'on' ? new Date() : null,
            displayOrder: currentCount + 1
        };

        const registration = await CarnivalClub.create(registrationData);

        // Get club name for success message
        const club = await Club.findByPk(clubId, {
            attributes: ['clubName']
        });

        req.flash('success_msg', `${club.clubName} has been successfully registered for ${carnival.carnivalName}!`);
        res.redirect(`/carnivals/${carnivalId}/attendees`);
    } catch (error) {
        console.error('Error registering club for carnival:', error);
        req.flash('error_msg', 'Error registering club for carnival.');
        res.redirect(`/carnivals/${req.params.carnivalId}/attendees/add`);
    }
};

/**
 * Show edit club registration form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditRegistration = async (req, res) => {
    try {
        const { carnivalId, registrationId } = req.params;
        const user = req.user;

        // Verify carnival ownership
        const carnival = await Carnival.findOne({
            where: {
                id: carnivalId,
                createdByUserId: user.id,
                isActive: true
            }
        });

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found or you do not have permission to manage it.');
            return res.redirect('/carnivals');
        }

        // Get registration details
        const registration = await CarnivalClub.findOne({
            where: {
                id: registrationId,
                carnivalId: carnivalId,
                isActive: true
            },
            include: [{
                model: Club,
                as: 'club',
                attributes: ['id', 'clubName', 'state', 'location']
            }]
        });

        if (!registration) {
            req.flash('error_msg', 'Registration not found.');
            return res.redirect(`/carnivals/${carnivalId}/attendees`);
        }

        res.render('carnivals/edit-registration', {
            title: `Edit Registration - ${registration.club.clubName}`,
            carnival,
            registration,
            additionalCSS: ['/styles/carnival.styles.css']
        });
    } catch (error) {
        console.error('Error loading edit registration form:', error);
        req.flash('error_msg', 'Error loading registration details.');
        res.redirect(`/carnivals/${req.params.carnivalId}/attendees`);
    }
};

/**
 * Update club registration details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateRegistration = async (req, res) => {
    try {
        const { carnivalId, registrationId } = req.params;
        const user = req.user;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the validation errors.');
            return res.redirect(`/carnivals/${carnivalId}/attendees/${registrationId}/edit`);
        }

        // Verify carnival ownership
        const carnival = await Carnival.findOne({
            where: {
                id: carnivalId,
                createdByUserId: user.id,
                isActive: true
            }
        });

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found or you do not have permission to manage it.');
            return res.redirect('/carnivals');
        }

        // Get registration
        const registration = await CarnivalClub.findOne({
            where: {
                id: registrationId,
                carnivalId: carnivalId,
                isActive: true
            }
        });

        if (!registration) {
            req.flash('error_msg', 'Registration not found.');
            return res.redirect(`/carnivals/${carnivalId}/attendees`);
        }

        const {
            playerCount,
            teamName,
            contactPerson,
            contactEmail,
            contactPhone,
            specialRequirements,
            registrationNotes,
            paymentAmount,
            isPaid
        } = req.body;

        // Prepare update data
        const updateData = {
            playerCount: playerCount ? parseInt(playerCount) : null,
            teamName: teamName?.trim() || null,
            contactPerson: contactPerson?.trim() || null,
            contactEmail: contactEmail?.trim() || null,
            contactPhone: contactPhone?.trim() || null,
            specialRequirements: specialRequirements?.trim() || null,
            registrationNotes: registrationNotes?.trim() || null,
            paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
            isPaid: isPaid === 'on'
        };

        // Update payment date if payment status changed
        if (updateData.isPaid && !registration.isPaid) {
            updateData.paymentDate = new Date();
        } else if (!updateData.isPaid && registration.isPaid) {
            updateData.paymentDate = null;
        }

        await registration.update(updateData);

        req.flash('success_msg', 'Registration updated successfully!');
        res.redirect(`/carnivals/${carnivalId}/attendees`);
    } catch (error) {
        console.error('Error updating registration:', error);
        req.flash('error_msg', 'Error updating registration.');
        res.redirect(`/carnivals/${req.params.carnivalId}/attendees/${req.params.registrationId}/edit`);
    }
};

/**
 * Remove club from carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeClubFromCarnival = async (req, res) => {
    try {
        const { carnivalId, registrationId } = req.params;
        const user = req.user;

        // Verify carnival ownership
        const carnival = await Carnival.findOne({
            where: {
                id: carnivalId,
                createdByUserId: user.id,
                isActive: true
            }
        });

        if (!carnival) {
            return res.status(403).json({
                success: false,
                message: 'Carnival not found or you do not have permission to manage it.'
            });
        }

        // Get registration
        const registration = await CarnivalClub.findOne({
            where: {
                id: registrationId,
                carnivalId: carnivalId,
                isActive: true
            },
            include: [{
                model: Club,
                as: 'club',
                attributes: ['clubName']
            }]
        });

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found.'
            });
        }

        // Soft delete by setting isActive to false
        await registration.update({ isActive: false });

        res.json({
            success: true,
            message: `${registration.club.clubName} has been removed from the carnival.`
        });
    } catch (error) {
        console.error('Error removing club from carnival:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing club from carnival.'
        });
    }
};

/**
 * Update display order of attending clubs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const reorderAttendingClubs = async (req, res) => {
    try {
        const { carnivalId } = req.params;
        const { clubOrder } = req.body; // Array of registration IDs in new order
        const user = req.user;

        // Verify carnival ownership
        const carnival = await Carnival.findOne({
            where: {
                id: carnivalId,
                createdByUserId: user.id,
                isActive: true
            }
        });

        if (!carnival) {
            return res.status(403).json({
                success: false,
                message: 'Carnival not found or you do not have permission to manage it.'
            });
        }

        if (!Array.isArray(clubOrder)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid club order data.'
            });
        }

        // Update display orders
        for (let i = 0; i < clubOrder.length; i++) {
            await CarnivalClub.update(
                { displayOrder: i + 1 },
                { 
                    where: { 
                        id: clubOrder[i],
                        carnivalId: carnivalId,
                        isActive: true
                    } 
                }
            );
        }

        res.json({
            success: true,
            message: 'Club order updated successfully.'
        });
    } catch (error) {
        console.error('Error reordering attending clubs:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating club order.'
        });
    }
};

/**
 * Register delegate's own club for a carnival (self-service registration)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerMyClubForCarnival = async (req, res) => {
    try {
        const { carnivalId } = req.params;
        const user = req.user;

        // Ensure user has a club and is a delegate
        if (!user.clubId) {
            req.flash('error_msg', 'You must be associated with a club to register for carnivals.');
            return res.redirect(`/carnivals/${carnivalId}`);
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', 'Please correct the validation errors.');
            return res.redirect(`/carnivals/${carnivalId}`);
        }

        // Get carnival and ensure it exists and is active
        const carnival = await Carnival.findOne({
            where: {
                id: carnivalId,
                isActive: true
            }
        });

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/carnivals');
        }

        // Check if user's club is already registered
        const existingRegistration = await CarnivalClub.findOne({
            where: {
                carnivalId,
                clubId: user.clubId,
                isActive: true
            }
        });

        if (existingRegistration) {
            req.flash('error_msg', 'Your club is already registered for this carnival.');
            return res.redirect(`/carnivals/${carnivalId}`);
        }

        // Get user's club for success message
        const club = await Club.findByPk(user.clubId, {
            attributes: ['clubName']
        });

        const {
            playerCount,
            teamName,
            contactPerson,
            contactEmail,
            contactPhone,
            specialRequirements
        } = req.body;

        // Get current count for display order
        const currentCount = await CarnivalClub.count({
            where: {
                carnivalId,
                isActive: true
            }
        });

        // Create the registration with delegate's information
        const registrationData = {
            carnivalId: parseInt(carnivalId),
            clubId: user.clubId,
            playerCount: playerCount ? parseInt(playerCount) : null,
            teamName: teamName?.trim() || null,
            contactPerson: contactPerson?.trim() || `${user.firstName} ${user.lastName}`,
            contactEmail: contactEmail?.trim() || user.email,
            contactPhone: contactPhone?.trim() || null,
            specialRequirements: specialRequirements?.trim() || null,
            registrationNotes: `Self-registered by ${user.firstName} ${user.lastName} (${user.email})`,
            isPaid: false, // Delegates register unpaid by default
            paymentDate: null,
            displayOrder: currentCount + 1,
            registrationDate: new Date()
        };

        await CarnivalClub.create(registrationData);

        req.flash('success_msg', `${club.clubName} has been successfully registered for ${carnival.title}! The carnival organiser will contact you with payment details.`);
        res.redirect(`/carnivals/${carnivalId}`);
    } catch (error) {
        console.error('Error registering club for carnival:', error);
        req.flash('error_msg', 'Error registering your club for the carnival.');
        res.redirect(`/carnivals/${req.params.carnivalId}`);
    }
};

/**
 * Unregister delegate's own club from a carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const unregisterMyClubFromCarnival = async (req, res) => {
    try {
        const { carnivalId } = req.params;
        const user = req.user;

        // Ensure user has a club
        if (!user.clubId) {
            return res.status(403).json({
                success: false,
                message: 'You must be associated with a club to manage registrations.'
            });
        }

        // Get carnival and ensure it exists
        const carnival = await Carnival.findOne({
            where: {
                id: carnivalId,
                isActive: true
            }
        });

        if (!carnival) {
            return res.status(404).json({
                success: false,
                message: 'Carnival not found.'
            });
        }

        // Find the registration
        const registration = await CarnivalClub.findOne({
            where: {
                carnivalId,
                clubId: user.clubId,
                isActive: true
            }
        });

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Your club is not registered for this carnival.'
            });
        }

        // Check if payment has been made - prevent unregistration if paid
        if (registration.isPaid) {
            return res.status(400).json({
                success: false,
                message: 'Cannot unregister from a carnival after payment has been made. Please contact the organiser.'
            });
        }

        // Soft delete the registration
        await registration.update({ isActive: false });

        // Get club name for response
        const club = await Club.findByPk(user.clubId, {
            attributes: ['clubName']
        });

        res.json({
            success: true,
            message: `${club.clubName} has been unregistered from ${carnival.title}.`
        });
    } catch (error) {
        console.error('Error unregistering club from carnival:', error);
        res.status(500).json({
            success: false,
            message: 'Error unregistering from carnival.'
        });
    }
};

module.exports = {
    showCarnivalAttendees,
    showAddClubToCarnival,
    registerClubForCarnival,
    showEditRegistration,
    updateRegistration,
    removeClubFromCarnival,
    reorderAttendingClubs,
    registerMyClubForCarnival,
    unregisterMyClubFromCarnival
};