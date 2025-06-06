const express = require('express');
const router = express.Router();
const { Carnival, User, Club } = require('../models');
const { body, validationResult } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const { carnivalUpload, handleUploadError } = require('../middleware/upload');
const mySidelineService = require('../services/mySidelineService');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');

// List all carnivals with filtering
router.get('/', async (req, res) => {
    try {
        const { state, search, upcoming, mysideline } = req.query;
        let whereClause = { isActive: true };

        // State filter
        if (state && state !== 'all') {
            whereClause.state = state;
        }

        // Date filter
        if (upcoming === 'true') {
            whereClause.date = { [Op.gte]: new Date() };
        }

        // MySideline filter
        if (mysideline === 'true') {
            whereClause.mySidelineEventId = { [Op.ne]: null };
        } else if (mysideline === 'false') {
            whereClause.mySidelineEventId = null;
        }

        // Search filter
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { locationAddress: { [Op.iLike]: `%${search}%` } },
                { organiserContactName: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const carnivals = await Carnival.findAll({
            where: whereClause,
            include: [{
                model: User,
                as: 'creator',
                attributes: ['firstName', 'lastName']
            }],
            order: [['date', 'ASC']]
        });

        const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

        res.render('carnivals/list', {
            title: 'All Carnivals',
            carnivals,
            states,
            currentFilters: { state, search, upcoming, mysideline }
        });
    } catch (error) {
        console.error('Error fetching carnivals:', error);
        res.render('carnivals/list', {
            title: 'All Carnivals',
            carnivals: [],
            states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
            currentFilters: {}
        });
    }
});

// Show individual carnival
router.get('/:id', async (req, res) => {
    try {
        const carnival = await Carnival.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'creator',
                attributes: ['firstName', 'lastName'],
                include: [{
                    model: Club,
                    as: 'club'
                }]
            }]
        });

        if (!carnival || !carnival.isActive) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/carnivals');
        }

        // Check if this is a MySideline event that can be claimed
        const canTakeOwnership = carnival.mySidelineEventId && 
                                !carnival.createdByUserId && 
                                req.user && 
                                req.user.clubId;

        res.render('carnivals/show', {
            title: carnival.title,
            carnival,
            canTakeOwnership
        });
    } catch (error) {
        console.error('Error fetching carnival:', error);
        req.flash('error_msg', 'Error loading carnival details.');
        res.redirect('/carnivals');
    }
});

// Create carnival form
router.get('/new', ensureAuthenticated, (req, res) => {
    const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
    res.render('carnivals/new', {
        title: 'Add New Carnival',
        states
    });
});

// Create carnival POST with enhanced upload middleware
router.post('/new', ensureAuthenticated, carnivalUpload, handleUploadError, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('locationAddress').trim().notEmpty().withMessage('Location address is required'),
    body('organiserContactName').trim().notEmpty().withMessage('Organiser contact name is required'),
    body('organiserContactEmail').isEmail().withMessage('Valid organiser email is required'),
    body('organiserContactPhone').trim().notEmpty().withMessage('Organiser phone is required'),
    body('scheduleDetails').trim().notEmpty().withMessage('Schedule details are required'),
    body('state').isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional().isURL().withMessage('Facebook URL must be valid'),
    body('socialMediaInstagram').optional().isURL().withMessage('Instagram URL must be valid'),
    body('socialMediaTwitter').optional().isURL().withMessage('Twitter URL must be valid'),
    body('socialMediaWebsite').optional().isURL().withMessage('Website URL must be valid')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
            return res.render('carnivals/new', {
                title: 'Add New Carnival',
                states,
                errors: errors.array(),
                formData: req.body
            });
        }

        const carnivalData = {
            title: req.body.title,
            date: new Date(req.body.date),
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

        // Handle file uploads with enhanced middleware
        if (req.files && req.files.logo) {
            carnivalData.clubLogoURL = '/uploads/' + req.files.logo[0].filename;
        }
        if (req.files && req.files.promotionalImage) {
            const imageFiles = req.files.promotionalImage.map(file => '/uploads/' + file.filename);
            carnivalData.promotionalImageURL = imageFiles[0]; // Primary image
            carnivalData.additionalImages = imageFiles.slice(1); // Additional images
        }
        if (req.files && req.files.drawDocument) {
            const drawFiles = req.files.drawDocument.map(file => ({
                url: '/uploads/' + file.filename,
                name: file.originalname,
                uploadDate: new Date()
            }));
            carnivalData.drawFiles = drawFiles;
        }

        const carnival = await Carnival.create(carnivalData);

        // Send notification emails to subscribers
        try {
            await emailService.sendCarnivalNotification(carnival, 'new');
        } catch (emailError) {
            console.error('Failed to send carnival notification emails:', emailError);
            // Don't fail the carnival creation if email fails
        }

        req.flash('success_msg', 'Carnival created successfully!');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error creating carnival:', error);
        const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
        res.render('carnivals/new', {
            title: 'Add New Carnival',
            states,
            errors: [{ msg: 'An error occurred while creating the carnival.' }],
            formData: req.body
        });
    }
});

// Edit carnival form
router.get('/:id/edit', ensureAuthenticated, async (req, res) => {
    try {
        const carnival = await Carnival.findByPk(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/dashboard');
        }

        // Check if user owns this carnival
        if (carnival.createdByUserId !== req.user.id) {
            req.flash('error_msg', 'You can only edit your own carnivals.');
            return res.redirect('/dashboard');
        }

        const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
        res.render('carnivals/edit', {
            title: 'Edit Carnival',
            carnival,
            states
        });
    } catch (error) {
        console.error('Error fetching carnival for edit:', error);
        req.flash('error_msg', 'Error loading carnival for editing.');
        res.redirect('/dashboard');
    }
});

// Update carnival POST with enhanced upload middleware
router.post('/:id/edit', ensureAuthenticated, carnivalUpload, handleUploadError, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('locationAddress').trim().notEmpty().withMessage('Location address is required'),
    body('organiserContactName').trim().notEmpty().withMessage('Organiser contact name is required'),
    body('organiserContactEmail').isEmail().withMessage('Valid organiser email is required'),
    body('organiserContactPhone').trim().notEmpty().withMessage('Organiser phone is required'),
    body('scheduleDetails').trim().notEmpty().withMessage('Schedule details are required'),
    body('state').isIn(['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']).withMessage('Valid state is required'),
    body('socialMediaFacebook').optional().isURL().withMessage('Facebook URL must be valid'),
    body('socialMediaInstagram').optional().isURL().withMessage('Instagram URL must be valid'),
    body('socialMediaTwitter').optional().isURL().withMessage('Twitter URL must be valid'),
    body('socialMediaWebsite').optional().isURL().withMessage('Website URL must be valid')
], async (req, res) => {
    try {
        const carnival = await Carnival.findByPk(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/dashboard');
        }

        // Check if user owns this carnival
        if (carnival.createdByUserId !== req.user.id) {
            req.flash('error_msg', 'You can only edit your own carnivals.');
            return res.redirect('/dashboard');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
            return res.render('carnivals/edit', {
                title: 'Edit Carnival',
                carnival,
                states,
                errors: errors.array()
            });
        }

        // Update carnival data
        await carnival.update({
            title: req.body.title,
            date: new Date(req.body.date),
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
        });

        // Handle file uploads with enhanced middleware
        if (req.files && req.files.logo) {
            carnival.clubLogoURL = '/uploads/' + req.files.logo[0].filename;
        }
        if (req.files && req.files.promotionalImage) {
            const imageFiles = req.files.promotionalImage.map(file => '/uploads/' + file.filename);
            carnival.promotionalImageURL = imageFiles[0]; // Primary image
            if (imageFiles.length > 1) {
                carnival.additionalImages = carnival.additionalImages || [];
                carnival.additionalImages.push(...imageFiles.slice(1));
            }
        }
        if (req.files && req.files.drawDocument) {
            const drawFiles = req.files.drawDocument.map(file => ({
                url: '/uploads/' + file.filename,
                name: file.originalname,
                uploadDate: new Date()
            }));
            carnival.drawFiles = carnival.drawFiles || [];
            carnival.drawFiles.push(...drawFiles);
        }

        await carnival.save();

        // Send notification emails to subscribers about the update
        try {
            await emailService.sendCarnivalNotification(carnival, 'updated');
        } catch (emailError) {
            console.error('Failed to send carnival update notification emails:', emailError);
            // Don't fail the carnival update if email fails
        }

        req.flash('success_msg', 'Carnival updated successfully!');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error updating carnival:', error);
        req.flash('error_msg', 'An error occurred while updating the carnival.');
        res.redirect('/dashboard');
    }
});

// Delete carnival
router.post('/:id/delete', ensureAuthenticated, async (req, res) => {
    try {
        const carnival = await Carnival.findByPk(req.params.id);

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found.');
            return res.redirect('/dashboard');
        }

        // Check if user owns this carnival
        if (carnival.createdByUserId !== req.user.id) {
            req.flash('error_msg', 'You can only delete your own carnivals.');
            return res.redirect('/dashboard');
        }

        // Soft delete - mark as inactive
        await carnival.update({ isActive: false });

        req.flash('success_msg', 'Carnival deleted successfully.');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error deleting carnival:', error);
        req.flash('error_msg', 'An error occurred while deleting the carnival.');
        res.redirect('/dashboard');
    }
});

// Take ownership of MySideline event
router.post('/:id/take-ownership', ensureAuthenticated, async (req, res) => {
    try {
        const result = await mySidelineService.takeOwnership(req.params.id, req.user.id);
        
        req.flash('success_msg', result.message);
        res.redirect(`/carnivals/${req.params.id}`);

    } catch (error) {
        console.error('Error taking ownership of carnival:', error);
        req.flash('error_msg', error.message || 'An error occurred while taking ownership of the event.');
        res.redirect('/carnivals');
    }
});

// Admin route: Trigger MySideline sync
router.post('/admin/sync-mysideline', ensureAuthenticated, async (req, res) => {
    try {
        // Check if user is admin/primary delegate
        if (!req.user.isPrimaryDelegate) {
            req.flash('error_msg', 'Only primary delegates can trigger MySideline sync.');
            return res.redirect('/dashboard');
        }

        const result = await mySidelineService.triggerManualSync();
        
        if (result.success) {
            req.flash('success_msg', `MySideline sync completed. Processed ${result.eventsProcessed} events.`);
        } else {
            req.flash('error_msg', `MySideline sync failed: ${result.message || result.error}`);
        }

        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error triggering MySideline sync:', error);
        req.flash('error_msg', 'An error occurred while triggering MySideline sync.');
        res.redirect('/dashboard');
    }
});

// Admin route: Get MySideline sync status
router.get('/admin/mysideline-status', ensureAuthenticated, (req, res) => {
    try {
        // Check if user is admin/primary delegate
        if (!req.user.isPrimaryDelegate) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const status = mySidelineService.getSyncStatus();
        res.json(status);

    } catch (error) {
        console.error('Error getting MySideline status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;