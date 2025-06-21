/**
 * Carnival Controller - MVC Architecture Implementation
 * 
 * Handles carnival management, club registration, and carnival operations.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import { Carnival, Club, User, CarnivalClub, Sponsor, sequelize } from '../models/index.mjs';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';
import { AUSTRALIAN_STATES } from '../config/constants.mjs';
import mySidelineService from '../services/mySidelineIntegrationService.mjs';
import emailService from '../services/emailService.mjs';
import { sortSponsorsHierarchically } from '../services/sponsorSortingService.mjs';

/**
 * Display list of all carnivals with filtering options
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const listCarnivals = async (req, res) => {
    try {
        const { state, search, upcoming, mysideline, _submitted } = req.query;
        let whereClause = {}; // Remove isActive filter to show all carnivals

        // Set default for upcoming only if no form has been submitted and no explicit filters are applied
        let upcomingFilter = upcoming;
        if (upcomingFilter === undefined && !_submitted && !search && (!state || state === 'all')) {
            upcomingFilter = 'true'; // Default to showing upcoming events only on first page load
        }

        // State filter
        if (state && state !== 'all') {
            whereClause.state = state;
        }

        // Date filter - only apply if upcomingFilter is explicitly 'true'
        if (upcomingFilter === 'true') {
            whereClause.date = { [Op.gte]: new Date() };
            // When filtering for upcoming only, also filter to active carnivals
            whereClause.isActive = true;
        }

        // MySideline filter
        if (mysideline === 'true') {
            whereClause.lastMySidelineSync = { [Op.ne]: null };
        } else if (mysideline === 'false') {
            whereClause.lastMySidelineSync = null;
        }

        // Search filter
        if (search) {
            whereClause[Op.or] = [
                // Use UPPER() function for case-insensitive comparison in SQLite
                sequelize.where(
                    sequelize.fn('UPPER', sequelize.col('title')), 
                    'LIKE', 
                    `%${search.toUpperCase()}%`
                ),
                sequelize.where(
                    sequelize.fn('UPPER', sequelize.col('locationAddress')), 
                    'LIKE', 
                    `%${search.toUpperCase()}%`
                ),
                sequelize.where(
                    sequelize.fn('UPPER', sequelize.col('organiserContactName')), 
                    'LIKE', 
                    `%${search.toUpperCase()}%`
                )
            ];
        }

        const carnivals = await Carnival.findAll({
            where: whereClause,
            include: [{
                model: User,
                as: 'creator',
                attributes: ['firstName', 'lastName']
            }],
            order: [['date', 'DESC']] // Show newest first so inactive/past carnivals appear after active ones
        });

        // Fetch full user data with club information for ownership checking
        let userWithClub = null;
        if (req.user) {
            userWithClub = await User.findByPk(req.user.id, {
                include: [{
                    model: Club,
                    as: 'club',
                    attributes: ['id', 'clubName', 'state', 'location']
                }],
                attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId', 'isAdmin', 'isPrimaryDelegate']
            });
        }

        // Process carnivals through getPublicDisplayData and add ownership information
        const processedCarnivals = carnivals.map(carnival => {
            const publicData = carnival.getPublicDisplayData();
            
            // Check if this carnival can be claimed by the current user
            const canTakeOwnership = carnival.isActive && 
                                    carnival.lastMySidelineSync && 
                                    !carnival.createdByUserId && 
                                    userWithClub && 
                                    userWithClub.clubId &&
                                    // State-based restriction: can only claim events in club's state or events with no state
                                    (!carnival.state || !userWithClub.club.state || carnival.state === userWithClub.club.state);
            
            return {
                ...publicData,
                creator: carnival.creator, // Preserve creator relationship
                canTakeOwnership: canTakeOwnership
            };
        });

        const states = AUSTRALIAN_STATES;

        res.render('carnivals/list', {
            title: 'Find Carnivals',
            carnivals: processedCarnivals,
            states,
            currentFilters: { state, search, upcoming: upcomingFilter, mysideline },
            user: userWithClub, // Pass user data to view for ownership checking
            additionalCSS: ['/styles/carnival.styles.css']
        });
    } catch (error) {
        console.error('Error fetching carnivals:', error);
        res.render('carnivals/list', {
            title: 'Find Carnivals',
            carnivals: [],
            states: AUSTRALIAN_STATES,
            currentFilters: {},
            additionalCSS: ['/styles/carnival.styles.css']
        });
    }
};

/**
 * Display individual carnival details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const showCarnival = async (req, res) => {
    try {
        const carnival = await Carnival.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['firstName', 'lastName'],
                    include: [{
                        model: Club,
                        as: 'club'
                    }]
                },
                {
                    model: Sponsor,
                    as: 'sponsors',
                    where: { isActive: true },
                    required: false,
                    through: { attributes: ['displayOrder'] }
                },
                // Include attendees relationship
                {
                    model: Club,
                    as: 'attendingClubs',
                    attributes: ['id', 'clubName', 'state', 'location', 'logoUrl', 'isActive', 'isPubliclyListed'],
                    through: { attributes: [] },
                    required: false
                }
            ]
        });

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/carnivals');
        }

        // Process carnival data through getPublicDisplayData for public views
        const publicCarnivalData = carnival.getPublicDisplayData();

        // Fetch full user data with club information for auto-populating registration form
        let userWithClub = null;
        if (req.user) {
            userWithClub = await User.findByPk(req.user.id, {
                include: [{
                    model: Club,
                    as: 'club',
                    attributes: ['id', 'clubName', 'state', 'location']
                }],
                attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId', 'isAdmin', 'isPrimaryDelegate']
            });
        }

        // Check if this is a MySideline event that can be claimed (only for active carnivals)
        const canTakeOwnership = carnival.isActive && 
                                carnival.lastMySidelineSync && 
                                !carnival.createdByUserId && 
                                userWithClub && 
                                userWithClub.clubId &&
                                // State-based restriction: can only claim events in club's state or events with no state
                                (!carnival.state || !userWithClub.club.state || carnival.state === userWithClub.club.state);

        // Check if user's club is already registered for this carnival (only for active carnivals)
        let userClubRegistration = null;
        let canRegisterClub = false;
        
        if (carnival.isActive && userWithClub && userWithClub.clubId) {
            // Check if user's club is already registered - include approval status
            userClubRegistration = await CarnivalClub.findOne({
                where: {
                    carnivalId: carnival.id,
                    clubId: userWithClub.clubId,
                    isActive: true
                },
                attributes: [
                    'id', 'approvalStatus', 'isPaid', 'playerCount', 'teamName',
                    'contactPerson', 'registrationDate', 'rejectionReason'
                ]
            });

            // User can register if:
            // 1. They have a club
            // 2. Their club is not already registered
            // 3. They are not the carnival owner
            // 4. Carnival is active
            canRegisterClub = !userClubRegistration && 
                             carnival.createdByUserId !== userWithClub.id;
        }

        // Check if user can manage this carnival (always allow for owners/admins regardless of active status)
        const canManage = userWithClub && (
            userWithClub.isAdmin || 
            (carnival.createdByUserId === userWithClub.id) ||
            (userWithClub.clubId && carnival.creator && carnival.creator.club && carnival.creator.club.id === userWithClub.clubId)
        );

        // Check if merge carnival option should be available
        let canMergeCarnival = false;
        let availableMergeTargets = [];
        
        if (userWithClub && carnival.lastMySidelineSync && carnival.isActive) {
            // Admin users can merge any MySideline carnival into any active non-MySideline carnival
            if (userWithClub.isAdmin) {
                availableMergeTargets = await Carnival.findAll({
                    where: {
                        isActive: true,
                        isManuallyEntered: true, // Non-MySideline carnivals only
                        id: { [Op.ne]: carnival.id } // Exclude current carnival
                    },
                    include: [{
                        model: User,
                        as: 'creator',
                        attributes: ['firstName', 'lastName'],
                        include: [{
                            model: Club,
                            as: 'club',
                            attributes: ['clubName']
                        }]
                    }],
                    attributes: ['id', 'title', 'date', 'state', 'createdByUserId'],
                    order: [['date', 'DESC']]
                });
                
                canMergeCarnival = availableMergeTargets.length > 0;
            } 
            // Regular users can only merge carnivals they own
            else if (carnival.createdByUserId === userWithClub.id) {
                availableMergeTargets = await Carnival.findAll({
                    where: {
                        createdByUserId: userWithClub.id,
                        isActive: true,
                        isManuallyEntered: true, // Non-MySideline carnivals only
                        id: { [Op.ne]: carnival.id } // Exclude current carnival
                    },
                    attributes: ['id', 'title', 'date', 'state'],
                    order: [['date', 'DESC']]
                });
                
                canMergeCarnival = availableMergeTargets.length > 0;
            }
        }

        // Sort sponsors hierarchically using the sorting service
        const sortedSponsors = sortSponsorsHierarchically(carnival.sponsors || [], 'carnival');

        res.render('carnivals/show', {
            title: carnival.title,
            carnival: canManage ? carnival : publicCarnivalData, // Show full data to managers, obfuscated to public
            user: userWithClub, // Pass enriched user data with club information
            sponsors: sortedSponsors,
            canTakeOwnership,
            userClubRegistration,
            canRegisterClub,
            canManage,
            canMergeCarnival, // Pass merge option availability
            availableMergeTargets, // Pass available merge targets
            isInactiveCarnival: !carnival.isActive,
            additionalCSS: ['/styles/carnival.styles.css']
        });
    } catch (error) {
        console.error('Error fetching carnival:', error);
        req.flash('error_msg', 'Error loading carnival details.');
        res.redirect('/carnivals');
    }
};

/**
 * Display create carnival form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const showCreateForm = async (req, res) => {
    try {
        const states = AUSTRALIAN_STATES;
        
        // Fetch user's club information for auto-population
        let userWithClub = null;
        if (req.user) {
            userWithClub = await User.findByPk(req.user.id, {
                include: [{
                    model: Club,
                    as: 'club',
                    attributes: ['id', 'clubName', 'state', 'contactPerson', 'contactEmail', 'contactPhone']
                }],
                attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId']
            });
        }
        
        res.render('carnivals/new', {
            title: 'Add New Carnival',
            states,
            user: userWithClub, // Pass user with club data for auto-population
            additionalCSS: ['/styles/carnival.styles.css']
        });
    } catch (error) {
        console.error('Error loading carnival creation form:', error);
        req.flash('error_msg', 'Error loading carnival creation form.');
        res.redirect('/dashboard');
    }
};

/**
 * Create new carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createCarnival = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const states = AUSTRALIAN_STATES;
            
            // Fetch user's club information for auto-population on error
            let userWithClub = null;
            if (req.user) {
                userWithClub = await User.findByPk(req.user.id, {
                    include: [{
                        model: Club,
                        as: 'club',
                        attributes: ['id', 'clubName', 'state', 'contactPerson', 'contactEmail', 'contactPhone']
                    }],
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId']
                });
            }
            
            return res.render('carnivals/new', {
                title: 'Add New Carnival',
                states,
                errors: errors.array(),
                formData: req.body,
                user: userWithClub, // Pass user data for auto-population
                additionalCSS: ['/styles/carnival.styles.css']
            });
        }

        // Prepare carnival data
        const carnivalData = {
            title: req.body.title,
            date: new Date(req.body.date),
            endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            locationAddress: req.body.locationAddress,
            organiserContactName: req.body.organiserContactName,
            organiserContactEmail: req.body.organiserContactEmail,
            organiserContactPhone: req.body.organiserContactPhone,
            scheduleDetails: req.body.scheduleDetails,
            registrationLink: req.body.registrationLink || '',
            feesDescription: req.body.feesDescription || '',
            callForVolunteers: req.body.callForVolunteers || '',
            state: req.body.state,
            createdByUserId: req.user.id,
            isManuallyEntered: true,
            // Social media links
            socialMediaFacebook: req.body.socialMediaFacebook || '',
            socialMediaInstagram: req.body.socialMediaInstagram || '',
            socialMediaTwitter: req.body.socialMediaTwitter || '',
            socialMediaWebsite: req.body.socialMediaWebsite || ''
        };

        // Use the duplicate detection and merging service
        let carnival;
        try {
            // Check if user is forcing creation despite duplicate warning
            const forceCreate = req.body.forceCreate === 'true';
            
            if (forceCreate) {
                // Create directly without duplicate checking
                carnival = await Carnival.create(carnivalData);
            } else {
                // Use duplicate detection and merging
                carnival = await mySidelineService.createOrMergeEvent(carnivalData, req.user.id);
            }
            
            // Handle structured file uploads after carnival creation
            if (req.structuredUploads && req.structuredUploads.length > 0) {
                const uploadUpdates = {};
                const additionalImages = [];
                const drawFiles = [];

                for (const upload of req.structuredUploads) {
                    switch (upload.fieldname) {
                        case 'logo':
                            uploadUpdates.clubLogoURL = upload.path;
                            break;
                        case 'promotionalImage':
                            if (!uploadUpdates.promotionalImageURL) {
                                uploadUpdates.promotionalImageURL = upload.path;
                            } else {
                                additionalImages.push(upload.path);
                            }
                            break;
                        case 'galleryImage':
                            additionalImages.push(upload.path);
                            break;
                        case 'drawDocument':
                            drawFiles.push({
                                url: upload.path,
                                filename: upload.originalname,
                                title: req.body.drawTitle || `Draw Document ${drawFiles.length + 1}`,
                                uploadMetadata: upload.metadata
                            });
                            break;
                        case 'bannerImage':
                            // Store banner images in additionalImages with metadata
                            additionalImages.push(upload.path);
                            break;
                    }
                }

                // Update carnival with file paths
                if (additionalImages.length > 0) {
                    uploadUpdates.additionalImages = additionalImages;
                }
                
                if (drawFiles.length > 0) {
                    uploadUpdates.drawFiles = drawFiles;
                    // Maintain legacy compatibility
                    uploadUpdates.drawFileURL = drawFiles[0].url;
                    uploadUpdates.drawFileName = drawFiles[0].filename;
                    uploadUpdates.drawTitle = req.body.drawTitle || drawFiles[0].title;
                    uploadUpdates.drawDescription = req.body.drawDescription || '';
                }

                // Update carnival with upload information
                await carnival.update(uploadUpdates);
                
                // Log structured upload success
                console.log(`✅ Carnival ${carnival.id} created with ${req.structuredUploads.length} structured uploads`);
            }
            
            // Check if this was a merge operation
            const wasMerged = carnival.lastMySidelineSync && carnival.claimedAt;
            
        } catch (duplicateError) {
            // Handle duplicate detection errors
            if (duplicateError.message.includes('similar carnival already exists')) {
                const states = AUSTRALIAN_STATES;
                
                // Fetch user's club information for auto-population on duplicate error
                let userWithClub = null;
                if (req.user) {
                    userWithClub = await User.findByPk(req.user.id, {
                        include: [{
                            model: Club,
                            as: 'club',
                            attributes: ['id', 'clubName', 'state', 'contactPerson', 'contactEmail', 'contactPhone']
                        }],
                        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId']
                    });
                }
                
                return res.render('carnivals/new', {
                    title: 'Add New Carnival',
                    states,
                    errors: [{ msg: duplicateError.message }],
                    formData: req.body,
                    user: userWithClub, // Pass user data for auto-population
                    duplicateWarning: true,
                    additionalCSS: ['/styles/carnival.styles.css']
                });
            }
            throw duplicateError; // Re-throw if it's not a duplicate issue
        }

        // Send notification emails to subscribers
        try {
            await emailService.notifyNewCarnival(carnival);
        } catch (emailError) {
            console.error('Error sending notification emails:', emailError);
        }

        // Set comprehensive success message with important next steps
        const wasMerged = carnival.lastMySidelineSync && carnival.claimedAt;
        if (wasMerged) {
            req.flash('success_msg', `Carnival successfully merged with existing MySideline event! Your data has been combined with the imported event: "${carnival.title}"`);
            res.redirect(`/carnivals/${carnival.id}`);
        } else {
            // For manually created carnivals, redirect with flag to show important notices modal
            req.flash('success_msg', 'Carnival created successfully! 🎉');
            res.redirect(`/carnivals/${carnival.id}?showPostCreationModal=true`);
        }

    } catch (error) {
        console.error('Error creating carnival:', error);
        req.flash('error_msg', 'An error occurred while creating the carnival.');
        res.redirect('/carnivals/new');
    }
};

/**
 * Display edit carnival form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const showEditForm = async (req, res) => {
    try {
        const carnival = await Carnival.findByPk(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/dashboard');
        }

        // Check if user can edit this carnival (using async method for club delegate checking)
        const canEdit = await carnival.canUserEditAsync(req.user);
        if (!canEdit) {
            req.flash('error_msg', 'You can only edit carnivals hosted by your club.');
            return res.redirect('/dashboard');
        }

        const states = AUSTRALIAN_STATES;
        res.render('carnivals/edit', {
            title: 'Edit Carnival',
            carnival,
            states,
            additionalCSS: ['/styles/carnival.styles.css']
        });
    } catch (error) {
        console.error('Error fetching carnival for edit:', error);
        req.flash('error_msg', 'Error loading carnival for editing.');
        res.redirect('/dashboard');
    }
};

/**
 * Update existing carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateCarnival = async (req, res) => {
    try {
        const carnival = await Carnival.findByPk(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/dashboard');
        }

        // Check if user can edit this carnival (using async method for club delegate checking)
        const canEdit = await carnival.canUserEditAsync(req.user);
        if (!canEdit) {
            req.flash('error_msg', 'You can only edit carnivals hosted by your club.');
            return res.redirect('/dashboard');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const states = AUSTRALIAN_STATES;
            
            // Fetch user's club information for auto-population on error
            let userWithClub = null;
            if (req.user) {
                userWithClub = await User.findByPk(req.user.id, {
                    include: [{
                        model: Club,
                        as: 'club',
                        attributes: ['id', 'clubName', 'state', 'contactPerson', 'contactEmail', 'contactPhone']
                    }],
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'clubId']
                });
            }
            
            return res.render('carnivals/edit', {
                title: 'Edit Carnival',
                carnival,
                states,
                errors: errors.array(),
                user: userWithClub, // Pass user data for auto-population
                additionalCSS: ['/styles/carnival.styles.css']
            });
        }

        // Update carnival data
        const updateData = {
            title: req.body.title,
            date: new Date(req.body.date),
            endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            locationAddress: req.body.locationAddress,
            organiserContactName: req.body.organiserContactName,
            organiserContactEmail: req.body.organiserContactEmail,
            organiserContactPhone: req.body.organiserContactPhone,
            scheduleDetails: req.body.scheduleDetails,
            registrationLink: req.body.registrationLink || '',
            feesDescription: req.body.feesDescription || '',
            callForVolunteers: req.body.callForVolunteers || '',
            state: req.body.state,
            // Update social media links
            socialMediaFacebook: req.body.socialMediaFacebook || '',
            socialMediaInstagram: req.body.socialMediaInstagram || '',
            socialMediaTwitter: req.body.socialMediaTwitter || '',
            socialMediaWebsite: req.body.socialMediaWebsite || ''
        };

        // Handle structured file uploads (including draw documents)
        if (req.structuredUploads && req.structuredUploads.length > 0) {
            const existingAdditionalImages = carnival.additionalImages || [];
            const existingDrawFiles = carnival.drawFiles || [];

            for (const upload of req.structuredUploads) {
                switch (upload.fieldname) {
                    case 'logo':
                        updateData.clubLogoURL = upload.path;
                        console.log(`📸 Updated carnival ${carnival.id} logo: ${upload.path}`);
                        break;
                    case 'promotionalImage':
                        updateData.promotionalImageURL = upload.path;
                        console.log(`📸 Updated carnival ${carnival.id} promotional image: ${upload.path}`);
                        break;
                    case 'galleryImage':
                        existingAdditionalImages.push(upload.path);
                        updateData.additionalImages = existingAdditionalImages;
                        console.log(`📸 Added gallery image to carnival ${carnival.id}: ${upload.path}`);
                        break;
                    case 'drawDocument':
                        const newDrawFile = {
                            url: upload.path,
                            filename: upload.originalname,
                            title: req.body.drawTitle || `Draw Document ${existingDrawFiles.length + 1}`,
                            uploadMetadata: upload.metadata
                        };
                        existingDrawFiles.push(newDrawFile);
                        updateData.drawFiles = existingDrawFiles;
                        
                        // Update legacy fields with first draw file
                        if (existingDrawFiles.length === 1) {
                            updateData.drawFileURL = newDrawFile.url;
                            updateData.drawFileName = newDrawFile.filename;
                            updateData.drawTitle = req.body.drawTitle || newDrawFile.title;
                            updateData.drawDescription = req.body.drawDescription || '';
                        }
                        console.log(`📄 Added draw document to carnival ${carnival.id}: ${upload.path}`);
                        break;
                }
            }
        }

        await carnival.update(updateData);

        req.flash('success_msg', 'Carnival updated successfully!');
        res.redirect(`/carnivals/${carnival.id}`);

    } catch (error) {
        console.error('Error updating carnival:', error);
        req.flash('error_msg', 'An error occurred while updating the carnival.');
        res.redirect(`/carnivals/${req.params.id}/edit`);
    }
};

/**
 * Delete carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteCarnival = async (req, res) => {
    try {
        const carnival = await Carnival.findByPk(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/dashboard');
        }

        // Check if user can edit this carnival (using async method for club delegate checking)
        const canEdit = await carnival.canUserEditAsync(req.user);
        if (!canEdit) {
            req.flash('error_msg', 'You can only delete carnivals hosted by your club.');
            return res.redirect('/dashboard');
        }

        // Soft delete by setting isActive to false
        await carnival.update({ isActive: false });

        req.flash('success_msg', 'Carnival deleted successfully.');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error deleting carnival:', error);
        req.flash('error_msg', 'An error occurred while deleting the carnival.');
        res.redirect('/dashboard');
    }
};

/**
 * Take ownership of MySideline event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const takeOwnership = async (req, res) => {
    try {
        // Use the Carnival model's takeOwnership method instead of mySidelineService
        const result = await Carnival.takeOwnership(req.params.id, req.user.id);
        
        if (result.success) {
            req.flash('success_msg', result.message);
        } else {
            req.flash('error_msg', result.message);
        }
        
        res.redirect(`/carnivals/${req.params.id}`);

    } catch (error) {
        console.error('Error taking ownership of carnival:', error);
        req.flash('error_msg', error.message || 'An error occurred while taking ownership of the event.');
        res.redirect('/carnivals');
    }
};

/**
 * Release ownership of MySideline event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const releaseOwnership = async (req, res) => {
    try {
        // Use the Carnival model's releaseOwnership method
        const result = await Carnival.releaseOwnership(req.params.id, req.user.id);
        
        if (result.success) {
            req.flash('success_msg', result.message);
        } else {
            req.flash('error_msg', result.message);
        }
        
        res.redirect(`/carnivals/${req.params.id}`);

    } catch (error) {
        console.error('Error releasing ownership of carnival:', error);
        req.flash('error_msg', error.message || 'An error occurred while releasing ownership of the event.');
        res.redirect('/carnivals');
    }
};

/**
 * Trigger MySideline sync (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const syncMySideline = async (req, res) => {
    try {
        // Check if user is admin/primary delegate
        if (!req.user.isPrimaryDelegate && !req.user.isAdmin) {
            req.flash('error_msg', 'Access denied. Only administrators can sync MySideline data.');
            return res.redirect('/dashboard');
        }

        const result = await mySidelineService.syncEvents();
        
        req.flash('success_msg', `MySideline sync completed. ${result.newEvents} new events imported.`);
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error syncing MySideline:', error);
        req.flash('error_msg', 'An error occurred while syncing MySideline data.');
        res.redirect('/dashboard');
    }
};

// Compatibility aliases
export const list = listCarnivals;
export const show = showCarnival;
export const getNew = showCreateForm;
export const postNew = createCarnival;
export const getEdit = showEditForm;
export const postEdit = updateCarnival;