/**
 * Admin Controller - Administrator Management Interface
 * 
 * Handles all administrative functionality including user management,
 * club management, carnival management, and system administration.
 */

import { validationResult } from 'express-validator';
import { User, Club, Carnival, Sponsor, EmailSubscription, AuditLog, sequelize } from '../models/index.mjs';
import { Op, fn } from 'sequelize';
import crypto from 'crypto';
import AuthEmailService from '../services/email/AuthEmailService.mjs';
import AuditService from '../services/auditService.mjs';
import { wrapControllers } from '../middleware/asyncHandler.mjs';
import { processStructuredUploads } from '../utils/uploadProcessor.mjs';

/**
 * Check if carnival is null and handle errors
 * @param {Object|null} carnival - The carnival object to check
 */
const checkNullCarnival = (carnival, res, req, path = '/carnivals') => {
    if (!carnival) {
      req.flash('error_msg', 'Carnival not found');
      return res.redirect(path);
    }
}

/**
 * Get Admin Dashboard with system statistics
 */
const getAdminDashboardHandler = async (req, res) => {
    // Get system statistics
    const [
        totalUsers,
        totalClubs,
        totalCarnivals,
        totalSponsors,
        totalSubscriptions,
        inactiveUsers,
        inactiveClubs,
        recentUsers,
        recentCarnivals,
        upcomingCarnivals
    ] = await Promise.all([
        User.count(),
        Club.count(),
        Carnival.count({ where: { isDisabled: false } }),
        Sponsor.count(),
        EmailSubscription.count(),
        User.count({ where: { isActive: false } }),
        Club.count({ where: { isActive: false } }),
        User.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        }),
        Carnival.count({
            where: {
                isDisabled: false,
                createdAt: {
                    [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        }),
        Carnival.count({
            where: {
                isDisabled: false,
                date: {
                    [Op.gte]: new Date()
                }
            }
        })
    ]);

    // Get recent activity
    const recentActivity = {
        users: await User.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: Club, as: 'club' }]
        }),
        carnivals: await Carnival.findAll({
            where: { isDisabled: false },
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'creator' }]
        })
    };

    const stats = {
        totalUsers,
        totalClubs,
        totalCarnivals,
        totalSponsors,
        totalSubscriptions,
        inactiveUsers,
        inactiveClubs,
        recentUsers,
        recentCarnivals,
        upcomingCarnivals
    };

    return res.render('admin/dashboard', {
        title: 'Administrator Dashboard - Old Man Footy',
        stats,
        recentActivity,
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Get User Management page with search and filters
 */
const getUserManagementHandler = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    // Build search conditions
    const whereConditions = {};
    const filters = {
        search: req.query.search || '',
        status: req.query.status || '',
        role: req.query.role || ''
    };

    // Search by name or email
    if (filters.search) {
        whereConditions[Op.or] = [
            { firstName: { [Op.like]: `%${filters.search}%` } },
            { lastName: { [Op.like]: `%${filters.search}%` } },
            { email: { [Op.like]: `%${filters.search}%` } }
        ];
    }

    // Filter by status
    if (filters.status === 'active') {
        whereConditions.isActive = true;
    } else if (filters.status === 'inactive') {
        whereConditions.isActive = false;
    }

    // Filter by role
    if (filters.role === 'admin') {
        whereConditions.isAdmin = true;
    } else if (filters.role === 'primary') {
        whereConditions.isPrimaryDelegate = true;
    }

    const { count, rows: users } = await User.findAndCountAll({
        where: whereConditions,
        include: [{ model: Club, as: 'club' }],
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });

    const pagination = {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
    };

    return res.render('admin/users', {
        title: 'User Management - Admin Dashboard',
        users,
        filters,
        pagination,
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Show Edit User form
 */
const showEditUserHandler = async (req, res) => {
    const userId = req.params.id;
    
    const [editUser, clubs] = await Promise.all([
        User.findByPk(userId, {
            include: [{ model: Club, as: 'club' }]
        }),
        Club.findAll({
            where: { isActive: true },
            order: [['clubName', 'ASC']]
        })
    ]);

    if (!editUser) {
        req.flash('error_msg', 'User not found');
        return res.redirect('/admin/users');
    }

    return res.render('admin/edit-user', {
        title: `Edit ${editUser.firstName} ${editUser.lastName} - Admin Dashboard`,
        editUser,
        clubs,
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Update User
 */
const updateUserHandler = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array()[0].msg);
        return res.redirect(`/admin/users/${req.params.id}/edit`);
    }

    const userId = req.params.id;
    const {
        firstName,
        lastName,
        email,
        clubId,
        isPrimaryDelegate,
        isAdmin,
        isActive
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
        req.flash('error_msg', 'User not found');
        return res.redirect('/admin/users');
    }

    // Capture old values for audit
    const oldValues = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        clubId: user.clubId,
        isPrimaryDelegate: user.isPrimaryDelegate,
        isAdmin: user.isAdmin,
        isActive: user.isActive
    };

    // Check if email is already taken by another user
    if (email !== user.email) {
        const emailExists = await User.findOne({
            where: {
                email,
                id: { [Op.ne]: userId }
            }
        });
        
        if (emailExists) {
            await AuditService.logAdminAction(
                AuditService.ACTIONS.USER_UPDATE,
                req,
                AuditService.ENTITIES.USER,
                userId,
                {
                    result: 'FAILURE',
                    errorMessage: 'Email already in use',
                    targetUserId: userId
                }
            );

            req.flash('error_msg', 'Email address is already in use by another user');
            return res.redirect(`/admin/users/${userId}/edit`);
        }
    }

    // Update user
    await user.update({
        firstName,
        lastName,
        email,
        clubId: clubId || null,
        isPrimaryDelegate: !!isPrimaryDelegate,
        isAdmin: !!isAdmin,
        isActive: !!isActive
    });

    const newValues = {
        firstName,
        lastName,
        email,
        clubId: clubId || null,
        isPrimaryDelegate: !!isPrimaryDelegate,
        isAdmin: !!isAdmin,
        isActive: !!isActive
    };

    // Log successful user update
    await AuditService.logAdminAction(
        AuditService.ACTIONS.USER_UPDATE,
        req,
        AuditService.ENTITIES.USER,
        userId,
        {
            oldValues: AuditService.sanitizeData(oldValues),
            newValues: AuditService.sanitizeData(newValues),
            targetUserId: userId,
            metadata: {
                adminAction: 'User profile update',
                changedFields: Object.keys(newValues).filter(key => 
                    JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
                )
            }
        }
    );

    req.flash('success_msg', `User ${firstName} ${lastName} has been updated successfully`);
    return res.redirect('/admin/users');
};

/**
 * Issue Password Reset
 */
const issuePasswordResetHandler = async (req, res) => {
    const userId = req.params.id;
    const user = await User.findByPk(userId);

    if (!user) {
        await AuditService.logAdminAction(
            AuditService.ACTIONS.USER_PASSWORD_RESET,
            req,
            AuditService.ENTITIES.USER,
            userId,
            {
                result: 'FAILURE',
                errorMessage: 'User not found',
                targetUserId: userId
            }
        );

        return res.json({ success: false, message: 'User not found' });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await user.update({
        passwordResetToken: resetToken,
        passwordResetExpiry: resetTokenExpiry
    });

    // Send password reset email
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3050'}/auth/reset-password/${resetToken}`;
    await AuthEmailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl);

    // Log successful password reset initiation
    await AuditService.logAdminAction(
        AuditService.ACTIONS.USER_PASSWORD_RESET,
        req,
        AuditService.ENTITIES.USER,
        userId,
        {
            targetUserId: userId,
            metadata: {
                adminAction: 'Password reset initiated',
                targetUserEmail: user.email
            }
        }
    );

    console.log(`✅ Admin ${req.user.email} initiated password reset for user ${user.email}`);
    
    return res.json({ 
        success: true, 
        message: `Password reset email sent to ${user.email}` 
    });
};

/**
 * Toggle User Status
 */
const toggleUserStatusHandler = async (req, res) => {
    const userId = req.params.id;
    const { isActive } = req.body;
    
    const user = await User.findByPk(userId);
    if (!user) {
        return res.json({ success: false, message: 'User not found' });
    }

    const oldStatus = user.isActive;
    const newStatus = !!isActive;
    
    await user.update({ isActive: newStatus });

    const action = newStatus ? AuditService.ACTIONS.USER_ACTIVATE : AuditService.ACTIONS.USER_DEACTIVATE;
    const statusText = newStatus ? 'activated' : 'deactivated';
    
    // Log user status change
    await AuditService.logAdminAction(
        action,
        req,
        AuditService.ENTITIES.USER,
        userId,
        {
            oldValues: { isActive: oldStatus },
            newValues: { isActive: newStatus },
            targetUserId: userId,
            metadata: {
                adminAction: `User ${statusText}`,
                targetUserEmail: user.email
            }
        }
    );

    const message = `User "${user.firstName} ${user.lastName}" has been ${statusText} successfully`;
    
    console.log(`✅ Admin ${req.user.email} ${statusText} user: ${user.email} (ID: ${user.id})`);

    return res.json({ 
        success: true, 
        message: message,
        newStatus: newStatus
    });
};

/**
 * Get Club Management page
 */
const getClubManagementHandler = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const whereConditions = {};
    const filters = {
        search: req.query.search || '',
        state: req.query.state || '',
        status: req.query.status || ''
    };

    if (filters.search) {
        whereConditions.clubName = { [Op.like]: `%${filters.search}%` };
    }

    if (filters.state) {
        whereConditions.state = filters.state;
    }

    if (filters.status === 'active') {
        whereConditions.isActive = true;
    } else if (filters.status === 'inactive') {
        whereConditions.isActive = false;
    }

    const { count, rows: clubs } = await Club.findAndCountAll({
        where: whereConditions,
        include: [
            { 
                model: User, 
                as: 'delegates',
                where: { 
                    isPrimaryDelegate: true,
                    isActive: true 
                },
                required: false,
                attributes: ['id', 'firstName', 'lastName', 'email', 'isPrimaryDelegate']
            }
        ],
        order: [['clubName', 'ASC']],
        limit,
        offset
    });

    // Transform the data to add primaryDelegate for template compatibility
    const clubsWithPrimaryDelegate = clubs.map(club => {
        const clubData = club.toJSON();
        clubData.primaryDelegate = clubData.delegates && clubData.delegates.length > 0 
            ? clubData.delegates[0] 
            : null;
        return clubData;
    });

    const pagination = {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
    };

    return res.render('admin/clubs', {
        title: 'Club Management - Admin Dashboard',
        clubs: clubsWithPrimaryDelegate,
        filters,
        pagination,
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Show Edit Club form - Redirect to unified interface
 * Using standardized /clubs/:id/edit route for all users
 */
const showEditClubHandler = async (req, res) => {
    const clubId = req.params.id;
    
    // Validate club exists before redirecting
    const club = await Club.findByPk(clubId);
    if (!club) {
        req.flash('error_msg', 'Club not found');
        return res.redirect('/admin/clubs');
    }

    // Redirect to unified interface - club.canUserEdit() will handle admin authorization
    return res.redirect(`/clubs/${clubId}/edit`);
};

/**
 * Update Club - Redirect to unified interface
 * Using standardized /clubs/:id route for all club updates
 */
const updateClubHandler = async (req, res) => {
    const clubId = req.params.id;
    
    // Validate club exists before redirecting
    const club = await Club.findByPk(clubId);
    if (!club) {
        req.flash('error_msg', 'Club not found');
        return res.redirect('/admin/clubs');
    }

    // Redirect POST request to unified update handler with same request data
    return res.redirect(307, `/clubs/${clubId}`);
};

/**
 * Deactivate Club (formerly deleteClub)
 * Clubs should never be deleted, only deactivated to preserve historical data
 */
const deactivateClubHandler = async (req, res) => {
    const clubId = req.params.id;
    
    const club = await Club.findByPk(clubId, {
        include: [
            { 
                model: User, 
                as: 'delegates',
                attributes: ['id', 'firstName', 'lastName', 'email', 'isActive']
            }
        ]
    });

    if (!club) {
        return res.json({ success: false, message: 'Club not found' });
    }

    // Check if club is already inactive
    if (!club.isActive) {
        return res.json({ 
            success: false, 
            message: 'Club is already deactivated' 
        });
    }

    // Check if club has active delegates - warn but allow deactivation
    const activeDelegates = club.delegates.filter(delegate => delegate.isActive);
    let warningMessage = '';
    if (activeDelegates.length > 0) {
        warningMessage = ` Note: This club has ${activeDelegates.length} active delegate(s) who will need to be reassigned to other clubs.`;
    }

    // Check if club has active carnivals - warn but allow deactivation
    const activeCarnivalCount = await Carnival.count({
        where: { 
            clubId: club.id, 
            isActive: true 
        }
    });

    if (activeCarnivalCount > 0) {
        warningMessage += ` This club has ${activeCarnivalCount} active carnival(s) - ownership may need to be transferred.`;
    }

    const transaction = await sequelize.transaction();

    try {
        // Capture original data for audit
        const originalClubData = {
            clubName: club.clubName,
            isActive: club.isActive,
            isPubliclyListed: club.isPubliclyListed
        };

        // Deactivate the club (soft delete)
        await club.update({
            isActive: false,
            isPubliclyListed: false, // Also hide from public listings
            updatedAt: new Date()
        }, { transaction });

        await transaction.commit();

        // Log club deactivation
        await AuditService.logAdminAction(
            AuditService.ACTIONS.CLUB_DEACTIVATE,
            req,
            AuditService.ENTITIES.CLUB,
            clubId,
            {
                oldValues: originalClubData,
                newValues: { 
                    isActive: false, 
                    isPubliclyListed: false 
                },
                targetClubId: clubId,
                metadata: {
                    adminAction: 'Club deactivation via admin delete action',
                    targetClubName: club.clubName,
                    activeDelegatesCount: activeDelegates.length,
                    activeCarnivalsCount: activeCarnivalCount
                }
            }
        );

        console.log(`✅ Club ${club.clubName} has been deactivated by admin ${req.user.email}`);

        return res.json({ 
            success: true, 
            message: `Club "${club.clubName}" has been deactivated successfully.${warningMessage}`,
            action: 'deactivated' // Indicate this was a deactivation, not deletion
        });

    } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
    }
};

/**
 * Get Carnival Management page
 */
const getCarnivalManagementHandler = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const whereConditions = {};
    const filters = {
        search: req.query.search || '',
        state: req.query.state || '',
        status: req.query.status || '',
        active: req.query.active || ''
    };

    if (filters.search) {
        whereConditions.title = { [Op.like]: `%${filters.search}%` };
    }

    if (filters.state) {
        whereConditions.state = filters.state;
    }

    if (filters.status === 'upcoming') {
        whereConditions.date = { [Op.gte]: new Date() };
    } else if (filters.status === 'past') {
        whereConditions.date = { [Op.lt]: new Date() };
    }

    // Filter by active status - admin should see all by default
    if (filters.active === 'active') {
        whereConditions.isActive = true;
    } else if (filters.active === 'inactive') {
        whereConditions.isActive = false;
    }
    // If no active filter specified, show both active and inactive carnivals

    const { count, rows: carnivals } = await Carnival.findAndCountAll({
        where: whereConditions,
        include: [{ model: User, as: 'creator' }],
        order: [['date', 'DESC']],
        limit,
        offset
    });

    const pagination = {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
    };

    return res.render('admin/carnivals', {
        title: 'Carnival Management - Admin Dashboard',
        carnivals,
        filters,
        pagination,
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Show Edit Carnival form
 */
const showEditCarnivalHandler = async (req, res) => {
    const carnivalId = req.params.id;
    
    const carnival = await Carnival.findByPk(carnivalId, {
        include: [{ model: User, as: 'creator' }]
    });

    checkNullCarnival(carnival, res, req, '/admin/carnivals');

    return res.render('carnivals/edit', {
        title: `Edit ${carnival.title} - Admin Dashboard`,
        carnival,
        additionalCSS: ['/styles/admin.styles.css'],
        csrfToken: req.csrfToken()
    });
};

/**
 * Update Carnival
 */
const updateCarnivalHandler = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array()[0].msg);
        return res.redirect(`/admin/carnivals/${req.params.id}/edit`);
    }

    const carnivalId = req.params.id;
    const {
        title,
        subtitle,
        date,
        endDate,
        locationAddress,
        state,
        scheduleDetails,
        registrationLink,
        feesDescription,
        callForVolunteers,
        contactName,
        contactEmail,
        contactPhone,
        maxTeams,
        registrationDeadline,
        isRegistrationOpen,
        socialMediaFacebook,
        socialMediaInstagram,
        socialMediaTwitter,
        socialMediaWebsite,
        drawTitle,
        drawDescription,
        adminNotes,
        isActive,
        isDisabled
    } = req.body;

    const carnival = await Carnival.findByPk(carnivalId);

    checkNullCarnival(carnival, res, req, '/admin/carnivals');


    // Prepare base update data
    const updateData = {
        title,
        subtitle,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        locationAddress,
        // MySideline-compatible address fields
        venueName: req.body.venueName || null,
        locationAddressLine1: req.body.locationAddressLine1 || null,
        locationAddressLine2: req.body.locationAddressLine2 || null,
        locationSuburb: req.body.locationSuburb || null,
        locationPostcode: req.body.locationPostcode || null,
        locationLatitude: req.body.locationLatitude ? parseFloat(req.body.locationLatitude) : null,
        locationLongitude: req.body.locationLongitude ? parseFloat(req.body.locationLongitude) : null,
        locationCountry: req.body.locationCountry || 'Australia',
        state,
        scheduleDetails,
        registrationLink: registrationLink || null,
        feesDescription: feesDescription || null,
        callForVolunteers: callForVolunteers || null,
        organiserContactName: contactName,
        organiserContactEmail: contactEmail,
        organiserContactPhone: contactPhone,
        maxTeams: maxTeams ? parseInt(maxTeams) : null,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        isRegistrationOpen: !!isRegistrationOpen,
        socialMediaFacebook: socialMediaFacebook || null,
        socialMediaInstagram: socialMediaInstagram || null,
        socialMediaTwitter: socialMediaTwitter || null,
        socialMediaWebsite: socialMediaWebsite || null,
        drawTitle: drawTitle || null,
        drawDescription: drawDescription || null,
        adminNotes: adminNotes || null,
        isActive: !!isActive,
        isDisabled: !!isDisabled
    };

    // Handle all uploads using shared processor (defensive against corrupted uploads)
    const processedData = await processStructuredUploads(req, updateData, 'carnivals', carnival.id);

    await carnival.update(processedData);

    const successMessage = req.structuredUploads && req.structuredUploads.length > 0 
        ? `Carnival ${title} has been updated successfully, including ${req.structuredUploads.length} file upload(s)` 
        : `Carnival ${title} has been updated successfully`;

    req.flash('success_msg', successMessage);
    return res.redirect('/admin/carnivals');
};

/**
 * Toggle Carnival Status (Activate/Deactivate)
 */
const toggleCarnivalStatusHandler = async (req, res) => {
    const carnivalId = req.params.id;
    const { isDisabled } = req.body;
    
    const carnival = await Carnival.findByPk(carnivalId);
    if (!carnival) {
        return res.json({ success: false, message: 'Carnival not found' });
    }

    const newStatus = !!isDisabled;
    await carnival.update({ isDisabled: newStatus });

    const statusText = newStatus ? 'disabled' : 'enabled';
    const message = `Carnival "${carnival.title}" has been ${statusText} successfully`;
    
    console.log(`✅ Admin ${req.user.email} ${statusText} carnival: ${carnival.title} (ID: ${carnival.id})`);

    // Log carnival status change
    await AuditService.logAdminAction(
        newStatus ? AuditService.ACTIONS.CARNIVAL_DEACTIVATE : AuditService.ACTIONS.CARNIVAL_ACTIVATE,
        req,
        AuditService.ENTITIES.CARNIVAL,
        carnivalId,
        {
            oldValues: { isDisabled: !newStatus },
            newValues: { isDisabled: newStatus },
            targetCarnivalId: carnivalId,
            metadata: {
                adminAction: `Carnival ${statusText}`,
                targetCarnivalTitle: carnival.title
            }
        }
    );

    return res.json({ 
        success: true, 
        message: message,
        newStatus: newStatus
    });
};

/**
 * Toggle Carnival Active Status (Activate/Deactivate)
 */
const toggleCarnivalActiveHandler = async (req, res) => {
    const carnivalId = req.params.id;
    const { isActive } = req.body;
    
    const carnival = await Carnival.findByPk(carnivalId);
    if (!carnival) {
        return res.json({ success: false, message: 'Carnival not found' });
    }

    const newStatus = !!isActive;
    await carnival.update({ isActive: newStatus });

    const statusText = newStatus ? 'activated' : 'deactivated';
    const message = `Carnival "${carnival.title}" has been ${statusText} successfully`;
    
    console.log(`✅ Admin ${req.user.email} ${statusText} carnival: ${carnival.title} (ID: ${carnival.id})`);

    // Log carnival status change
    await AuditService.logAdminAction(
        newStatus ? AuditService.ACTIONS.CARNIVAL_ACTIVATE : AuditService.ACTIONS.CARNIVAL_DEACTIVATE,
        req,
        AuditService.ENTITIES.CARNIVAL,
        carnivalId,
        {
            oldValues: { isActive: !newStatus },
            newValues: { isActive: newStatus },
            targetCarnivalId: carnivalId,
            metadata: {
                adminAction: `Carnival ${statusText}`,
                targetCarnivalTitle: carnival.title
            }
        }
    );

    return res.json({ 
        success: true, 
        message: message,
        newStatus: newStatus
    });
};

/**
 * Toggle Club Status (Activate/Deactivate)
 */
const toggleClubStatusHandler = async (req, res) => {
    const clubId = req.params.id;
    const { isActive } = req.body;
    
    const club = await Club.findByPk(clubId);
    if (!club) {
        return res.json({ success: false, message: 'Club not found' });
    }

    const newStatus = !!isActive;
    await club.update({ isActive: newStatus });

    const statusText = newStatus ? 'reactivated' : 'deactivated';
    const message = `Club "${club.clubName}" has been ${statusText} successfully`;
    
    console.log(`✅ Admin ${req.user.email} ${statusText} club: ${club.clubName} (ID: ${club.id})`);

    // Log club status change
    await AuditService.logAdminAction(
        newStatus ? AuditService.ACTIONS.CLUB_ACTIVATE : AuditService.ACTIONS.CLUB_DEACTIVATE,
        req,
        AuditService.ENTITIES.CLUB,
        clubId,
        {
            oldValues: { isActive: !newStatus },
            newValues: { isActive: newStatus },
            targetClubId: clubId,
            metadata: {
                adminAction: `Club ${statusText}`,
                targetClubName: club.clubName
            }
        }
    );

    return res.json({ 
        success: true, 
        message: message,
        newStatus: newStatus
    });
};

/**
 * Toggle Club Visibility (Publicly Listed status)
 */
const toggleClubVisibilityHandler = async (req, res) => {
    const clubId = req.params.id;
    const { isPubliclyListed } = req.body;
    
    const club = await Club.findByPk(clubId);
    if (!club) {
        return res.json({ success: false, message: 'Club not found' });
    }

    const newVisibility = !!isPubliclyListed;
    await club.update({ isPubliclyListed: newVisibility });

    const visibilityText = newVisibility ? 'shown in public listing' : 'hidden from public listing';
    const message = `Club "${club.clubName}" is now ${visibilityText}`;
    
    console.log(`✅ Admin ${req.user.email} updated club visibility: ${club.clubName} (ID: ${club.id}) - ${visibilityText}`);

    // Log club visibility change
    await AuditService.logAdminAction(
        newVisibility ? AuditService.ACTIONS.CLUB_SHOW : AuditService.ACTIONS.CLUB_HIDE,
        req,
        AuditService.ENTITIES.CLUB,
        clubId,
        {
            oldValues: { isPubliclyListed: !newVisibility },
            newValues: { isPubliclyListed: newVisibility },
            targetClubId: clubId,
            metadata: {
                adminAction: `Club ${newVisibility ? 'shown' : 'hidden'} in public listing`,
                targetClubName: club.clubName
            }
        }
    );

    return res.json({ 
        success: true, 
        message: message,
        newVisibility: newVisibility
    });
};

/**
 * Generate System Reports
 */
const generateReportHandler = async (req, res) => {
    // Define time periods for activity analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Generate comprehensive system report with login activity tracking
    const report = {
        generatedAt: now,
        users: {
            total: await User.count(),
            active: await User.count({ where: { isActive: true } }),
            inactive: await User.count({ where: { isActive: false } }),
            admins: await User.count({ where: { isAdmin: true } }),
            primaryDelegates: await User.count({ where: { isPrimaryDelegate: true } }),
            // Login activity statistics
            loggedInLast30Days: await User.count({
                where: {
                    isActive: true,
                    lastLoginAt: { [Op.gte]: thirtyDaysAgo }
                }
            }),
            loggedInLast7Days: await User.count({
                where: {
                    isActive: true,
                    lastLoginAt: { [Op.gte]: sevenDaysAgo }
                }
            }),
            neverLoggedIn: await User.count({
                where: {
                    isActive: true,
                    lastLoginAt: null
                }
            })
        },
        clubs: {
            total: await Club.count(),
            active: await Club.count({ where: { isActive: true } }),
            inactive: await Club.count({ where: { isActive: false } }),
            byState: await Club.findAll({
                attributes: ['state', [fn('COUNT', '*'), 'count']],
                group: ['state'],
                raw: true
            })
        },
        carnivals: {
            total: await Carnival.count({ where: { isDisabled: false } }),
            upcoming: await Carnival.count({
                where: {
                    isDisabled: false,
                    isActive: true,
                    date: { [Op.gte]: new Date() }
                }
            }),
            past: await Carnival.count({
                where: {
                    isDisabled: false,
                    date: { [Op.lt]: new Date() }
                }
            }),
            byState: await Carnival.findAll({
                attributes: ['state', [fn('COUNT', '*'), 'count']],
                where: { isDisabled: false },
                group: ['state'],
                raw: true
            })
        },
        sponsors: {
            total: await Sponsor.count()
        },
        subscriptions: {
            total: await EmailSubscription.count()
        }
    };

    return res.render('admin/reports', {
        title: 'System Reports - Admin Dashboard',
        report,
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Delete User
 */
const deleteUserHandler = async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user;
    
    const user = await User.findByPk(userId, {
        include: [{ model: Club, as: 'club' }]
    });

    if (!user) {
        return res.json({ success: false, message: 'User not found' });
    }

    // Prevent self-deletion
    if (user.id === currentUser.id) {
        return res.json({ 
            success: false, 
            message: 'You cannot delete your own account' 
        });
    }

    // Prevent non-admin from deleting admin users
    if (user.isAdmin && !currentUser.isAdmin) {
        return res.json({ 
            success: false, 
            message: 'Only administrators can delete admin accounts' 
        });
    }

    // Capture user data for audit before deletion
    const deletedUserData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        clubId: user.clubId,
        isPrimaryDelegate: user.isPrimaryDelegate,
        isAdmin: user.isAdmin,
        clubName: user.club?.clubName
    };

    const transaction = await sequelize.transaction();

    try {
        // Handle primary delegate transfer if user is primary delegate
        if (user.isPrimaryDelegate && user.clubId) {
            // Find another delegate in the same club to transfer role to
            const alternateDelegate = await User.findOne({
                where: {
                    clubId: user.clubId,
                    isActive: true,
                    isPrimaryDelegate: false,
                    id: { [Op.ne]: user.id }
                },
                transaction
            });

            if (alternateDelegate) {
                // Transfer primary delegate role
                await alternateDelegate.update({
                    isPrimaryDelegate: true
                }, { transaction });

                console.log(`✅ Primary delegate role transferred from ${user.email} to ${alternateDelegate.email}`);
            } else {
                // No other delegates available - log warning but allow deletion
                console.log(`⚠️ Warning: Deleting primary delegate ${user.email} with no alternate delegates available for club ${user.club?.clubName}`);
            }
        }

        // Soft delete user by setting isActive to false and clearing sensitive data
        await user.update({
            isActive: false,
            email: `deleted_${user.id}_${user.email}`, // Preserve for audit but make unique
            passwordHash: null,
            invitationToken: null,
            tokenExpires: null,
            passwordResetToken: null,
            passwordResetExpiry: null
        }, { transaction });

        await transaction.commit();

        // Log user deletion
        await AuditService.logAdminAction(
            AuditService.ACTIONS.USER_DELETE,
            req,
            AuditService.ENTITIES.USER,
            userId,
            {
                oldValues: AuditService.sanitizeData(deletedUserData),
                targetUserId: userId,
                metadata: {
                    adminAction: 'User deletion',
                    targetUserEmail: deletedUserData.email,
                    wasPrimaryDelegate: deletedUserData.isPrimaryDelegate,
                    hadClub: !!deletedUserData.clubId
                }
            }
        );

        console.log(`✅ User ${user.firstName} ${user.lastName} (${user.email}) has been deleted by admin ${currentUser.email}`);

        return res.json({ 
            success: true, 
            message: `User ${user.firstName} ${user.lastName} has been deleted successfully` 
        });

    } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
    }

};

/**
 * Show claim carnival on behalf of club form
 */
const showClaimCarnivalFormHandler = async (req, res) => {
    const carnivalId = req.params.id;
    
    const carnival = await Carnival.findByPk(carnivalId, {
        include: [{ model: User, as: 'creator' }]
    });

    checkNullCarnival(carnival, res, req, '/admin/carnivals');

    // Check if carnival can be claimed (MySideline import with no owner)
    if (carnival.isManuallyEntered) {
        req.flash('error_msg', 'Can only claim ownership of MySideline imported carnivals');
        return res.redirect('/admin/carnivals');
    }

    if (!carnival.lastMySidelineSync) {
        req.flash('error_msg', 'This carnival was not imported from MySideline');
        return res.redirect('/admin/carnivals');
    }

    if (carnival.createdByUserId) {
        req.flash('error_msg', 'This carnival already has an owner');
        return res.redirect('/admin/carnivals');
    }

    // Get all active clubs with primary delegates
    const clubs = await Club.findAll({
        where: { isActive: true },
        include: [{
            model: User,
            as: 'delegates',
            where: { 
                isPrimaryDelegate: true,
                isActive: true 
            },
            required: true,
            attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        order: [['clubName', 'ASC']]
    });

    return res.render('admin/claim-carnival', {
        title: `Claim Carnival - ${carnival.title}`,
        carnival,
        clubs,
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Process admin claim carnival on behalf of club
 */
const adminClaimCarnivalHandler = async (req, res) => {
    const carnivalId = req.params.id;
    const { targetClubId } = req.body;

    if (!targetClubId) {
        req.flash('error_msg', 'Please select a club to claim the carnival for');
        return res.redirect(`/admin/carnivals/${carnivalId}/claim`);
    }

    // Use the Carnival model's adminClaimOnBehalf method
    const result = await Carnival.adminClaimOnBehalf(carnivalId, req.user.id, parseInt(targetClubId));
    
    if (result.success) {
        req.flash('success_msg', result.message);
    } else {
        req.flash('error_msg', result.message);
    }
    
    return res.redirect('/admin/carnivals');

};

/**
 * Show comprehensive player list for any carnival (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCarnivalPlayersHandler = async (req, res) => {
    const carnivalId = req.params.id;
    
    const carnival = await Carnival.findByPk(carnivalId, {
        include: [{ model: User, as: 'creator' }]
    });

    checkNullCarnival

    // Get all club registrations for this carnival with their players
    const { CarnivalClub, CarnivalClubPlayer, ClubPlayer } = await import('../models/index.mjs');
    const clubRegistrations = await CarnivalClub.findAll({
        where: {
            carnivalId: carnival.id,
            isActive: true,
            approvalStatus: 'approved' // Only show approved clubs
        },
        include: [
            {
                model: Club,
                as: 'participatingClub',
                attributes: ['id', 'clubName', 'state', 'location']
            },
            {
                model: CarnivalClubPlayer,
                as: 'playerAssignments',
                where: { isActive: true },
                required: false,
                include: [{
                    model: ClubPlayer,
                    as: 'clubPlayer',
                    where: { isActive: true },
                    attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'shorts', 'email', 'phoneNumber']
                }]
            }
        ],
        order: [
            ['participatingClub', 'clubName', 'ASC'],
            ['playerAssignments', 'clubPlayer', 'firstName', 'ASC'],
            ['playerAssignments', 'clubPlayer', 'lastName', 'ASC']
        ]
    });

    // Flatten the data structure for easier display
    const allPlayers = [];
    let totalPlayers = 0;
    let totalMastersEligible = 0;

    clubRegistrations.forEach(registration => {
        if (registration.playerAssignments && registration.playerAssignments.length > 0) {
            registration.playerAssignments.forEach(playerAssignment => {
                const player = playerAssignment.clubPlayer;
                const isMastersEligible = player.dateOfBirth ? 
                    ClubPlayer.calculateAge(player.dateOfBirth) >= 35 : false;
                
                allPlayers.push({
                    id: player.id,
                    clubName: registration.participatingClub.clubName,
                    clubState: registration.participatingClub.state,
                    firstName: player.firstName,
                    lastName: player.lastName,
                    fullName: `${player.firstName} ${player.lastName}`,
                    dateOfBirth: player.dateOfBirth,
                    age: player.dateOfBirth ? ClubPlayer.calculateAge(player.dateOfBirth) : null,
                    shortsColour: player.shorts || 'Not specified',
                    attendanceStatus: playerAssignment.attendanceStatus,
                    isMastersEligible,
                    email: player.email,
                    phoneNumber: player.phoneNumber
                });
                
                totalPlayers++;
                if (isMastersEligible) totalMastersEligible++;
            });
        }
    });

    // Group players by club for summary stats
    const clubSummary = {};
    allPlayers.forEach(player => {
        if (!clubSummary[player.clubName]) {
            clubSummary[player.clubName] = {
                total: 0,
                mastersEligible: 0,
                state: player.clubState
            };
        }
        clubSummary[player.clubName].total++;
        if (player.isMastersEligible) {
            clubSummary[player.clubName].mastersEligible++;
        }
    });

    return res.render('admin/carnival-players', {
        title: `All Players - ${carnival.title} (Admin View)`,
        carnival,
        allPlayers,
        clubSummary,
        totalPlayers,
        totalMastersEligible,
        totalClubs: Object.keys(clubSummary).length,
        additionalCSS: ['/styles/admin.styles.css', '/styles/carnival.styles.css']
    });
};

/**
 * Get Audit Log Management page
 */
const getAuditLogsHandler = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    // Build filter conditions
    const filters = {
        userId: req.query.userId || '',
        action: req.query.action || '',
        entityType: req.query.entityType || '',
        result: req.query.result || '',
        startDate: req.query.startDate || '',
        endDate: req.query.endDate || ''
    };

    const whereConditions = {};

    if (filters.userId) {
        whereConditions.userId = parseInt(filters.userId);
    }

    if (filters.action) {
        whereConditions.action = filters.action;
    }

    if (filters.entityType) {
        whereConditions.entityType = filters.entityType;
    }

    if (filters.result) {
        whereConditions.result = filters.result;
    }

    if (filters.startDate && filters.endDate) {
        whereConditions.createdAt = {
            [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
        };
    } else if (filters.startDate) {
        whereConditions.createdAt = {
            [Op.gte]: new Date(filters.startDate)
        };
    } else if (filters.endDate) {
        whereConditions.createdAt = {
            [Op.lte]: new Date(filters.endDate)
        };
    }

    const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
        where: whereConditions,
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });

    // Get unique values for filter dropdowns
    const [users, actions, entityTypes] = await Promise.all([
        User.findAll({
            attributes: ['id', 'firstName', 'lastName', 'email'],
            where: { isActive: true },
            order: [['firstName', 'ASC']]
        }),
        AuditLog.findAll({
            attributes: ['action'],
            group: ['action'],
            order: [['action', 'ASC']],
            raw: true
        }),
        AuditLog.findAll({
            attributes: ['entityType'],
            group: ['entityType'],
            order: [['entityType', 'ASC']],
            raw: true
        })
    ]);

    const pagination = {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
    };

    // Format audit logs for display
    const formattedLogs = auditLogs.map(log => AuditService.formatAuditLog(log));

    return res.render('admin/audit-logs', {
        title: 'Audit Logs - Admin Dashboard',
        auditLogs: formattedLogs,
        filters,
        pagination,
        users,
        actions: actions.map(a => a.action),
        entityTypes: entityTypes.map(e => e.entityType),
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Get Audit Statistics for dashboard
 */
const getAuditStatisticsHandler = async (req, res) => {
    // Get statistics for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const stats = await AuditLog.getAuditStatistics({
        startDate: thirtyDaysAgo,
        endDate: new Date()
    });

    return res.json({
        success: true,
        stats
    });
};

/**
 * Export audit logs as CSV
 */
const exportAuditLogsHandler = async (req, res) => {
    const { startDate, endDate, action, entityType, result } = req.query;
    
    const whereConditions = {};
    
    if (startDate && endDate) {
        whereConditions.createdAt = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }
    
    if (action) whereConditions.action = action;
    if (entityType) whereConditions.entityType = entityType;
    if (result) whereConditions.result = result;

    const auditLogs = await AuditLog.findAll({
        where: whereConditions,
        include: [{
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email'],
            required: false
        }],
        order: [['createdAt', 'DESC']],
        limit: 10000 // Reasonable limit for exports
    });

    // Log the export action
    await AuditService.logAdminAction(
        AuditService.ACTIONS.ADMIN_DATA_EXPORT,
        req,
        AuditService.ENTITIES.SYSTEM,
        null,
        {
            metadata: {
                exportType: 'audit_logs',
                recordCount: auditLogs.length,
                filters: { startDate, endDate, action, entityType, result }
            }
        }
    );

    // Create CSV content
    const csvHeader = [
        'Timestamp',
        'User',
        'User Email', 
        'Action',
        'Entity Type',
        'Entity ID',
        'Result',
        'IP Address',
        'Has Changes'
    ].join(',');

    const csvRows = auditLogs.map(log => {
        const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System';
        const userEmail = log.user?.email || 'support@oldmanfooty.au';
        const hasChanges = !!(log.oldValues || log.newValues);
        
        return [
            log.createdAt.toISOString(),
            `"${userName}"`,
            `"${userEmail}"`,
            `"${log.action}"`,
            `"${log.entityType}"`,
            log.entityId || '',
            log.result,
            log.ipAddress || '',
            hasChanges
        ].join(',');
    });

    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Set response headers for file download
    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csvContent);

};

/**
 * Get Sponsor Management page
 */
const getSponsorManagementHandler = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const whereConditions = {};
    const filters = {
        search: req.query.search || '',
        state: req.query.state || '',
        status: req.query.status || '',
        businessType: req.query.businessType || ''
    };

    if (filters.search) {
        whereConditions[Op.or] = [
            { sponsorName: { [Op.like]: `%${filters.search}%` } },
            { businessType: { [Op.like]: `%${filters.search}%` } },
            { location: { [Op.like]: `%${filters.search}%` } }
        ];
    }

    if (filters.state) {
        whereConditions.state = filters.state;
    }

    if (filters.businessType) {
        whereConditions.businessType = { [Op.like]: `%${filters.businessType}%` };
    }

    if (filters.status === 'active') {
        whereConditions.isActive = true;
    } else if (filters.status === 'inactive') {
        whereConditions.isActive = false;
    }

    const { count, rows: sponsors } = await Sponsor.findAndCountAll({
        where: whereConditions,
        include: [
            {
                model: Club,
                as: 'club',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'clubName', 'state'],
                through: { attributes: [] }
            }
        ],
        order: [['sponsorName', 'ASC']],
        limit,
        offset
    });

    // Add club count to each sponsor
    const sponsorsWithStats = sponsors.map(sponsor => {
        const sponsorData = sponsor.toJSON();
        sponsorData.clubCount = sponsorData.club ? 1 : 0;
        return sponsorData;
    });

    const pagination = {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
    };

    return res.render('admin/sponsors', {
        title: 'Sponsor Management - Admin Dashboard',
        sponsors: sponsorsWithStats,
        filters,
        pagination,
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Show Edit Sponsor form
 */
const showEditSponsorHandler = async (req, res) => {
    const sponsorId = req.params.id;
    
    const sponsor = await Sponsor.findByPk(sponsorId, {
        include: [
            {
                model: Club,
                as: 'club',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'clubName', 'state'],
                through: { attributes: [] }
            }
        ]
    });

    if (!sponsor) {
        req.flash('error_msg', 'Sponsor not found');
        return res.redirect('/admin/sponsors');
    }

    // Get all active clubs for association options
    const allClubs = await Club.findAll({
        where: { isActive: true },
        order: [['clubName', 'ASC']],
        attributes: ['id', 'clubName', 'state']
    });

    return res.render('admin/edit-sponsor', {
        title: `Edit ${sponsor.sponsorName} - Admin Dashboard`,
        sponsor,
        allClubs,
        additionalCSS: ['/styles/admin.styles.css']
    });
};

/**
 * Delete Sponsor (deactivate)
 */
const deleteSponsorHandler = async (req, res) => {
    const sponsorId = req.params.id;
    
    const sponsor = await Sponsor.findByPk(sponsorId, {
        include: [
            {
                model: Club,
                as: 'club',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'clubName']
            }
        ]
    });

    if (!sponsor) {
        return res.json({ success: false, message: 'Sponsor not found' });
    }

    // Check if sponsor is already inactive
    if (!sponsor.isActive) {
        return res.json({ 
            success: false, 
            message: 'Sponsor is already deactivated' 
        });
    }

    // Check if sponsor has active club associations
    const activeClubCount = sponsor.club ? 1 : 0;
    let warningMessage = '';
    if (activeClubCount > 0) {
        warningMessage = ` Note: This sponsor is currently associated with ${activeClubCount} club(s). These relationships will be maintained but the sponsor will be hidden from public listings.`;
    }

    // Deactivate the sponsor (soft delete)
    await sponsor.update({
        isActive: false,
        isPubliclyVisible: false,
        updatedAt: new Date()
    });

    // Log sponsor deactivation
    await AuditService.logAdminAction(
        AuditService.ACTIONS.SPONSOR_DEACTIVATE,
        req,
        AuditService.ENTITIES.SPONSOR,
        sponsorId,
        {
            oldValues: { 
                isActive: true, 
                isPubliclyVisible: sponsor.isPubliclyVisible 
            },
            newValues: { 
                isActive: false, 
                isPubliclyVisible: false 
            },
            targetSponsorId: sponsorId,
            metadata: {
                adminAction: 'Sponsor deactivation via admin interface',
                targetSponsorName: sponsor.sponsorName,
                activeClubAssociations: activeClubCount
            }
        }
    );

    console.log(`✅ Sponsor ${sponsor.sponsorName} has been deactivated by admin ${req.user.email}`);

    return res.json({ 
        success: true, 
        message: `Sponsor "${sponsor.sponsorName}" has been deactivated successfully.${warningMessage}`,
        action: 'deactivated'
    });
};

/**
 * Trigger MySideline sync manually (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const syncMySidelineHandler = async (req, res) => {
    try {
        // Import MySideline service dynamically
        const { default: mySidelineService } = await import('../services/mySidelineIntegrationService.mjs');
        
        console.log(`🔄 Admin ${req.user.email} initiated manual MySideline sync`);
        
        // Trigger the sync
        const result = await mySidelineService.syncMySidelineCarnivals();
        
        // Log the admin action - using correct action constant
        await AuditService.logAdminAction(
            AuditService.ACTIONS.ADMIN_SYSTEM_SYNC,
            req,
            AuditService.ENTITIES.SYSTEM,
            null,
            {
                metadata: {
                    adminAction: 'Manual MySideline sync triggered',
                    syncResult: result ? {
                        success: result.success,
                        carnivalsProcessed: result.carnivalsProcessed || 0,
                        carnivalsCreated: result.carnivalsCreated || 0,
                        carnivalsUpdated: result.carnivalsUpdated || 0
                    } : { success: false, error: 'No result returned' }
                }
            }
        );
        
        if (result && result.success) {
            const message = `MySideline sync completed successfully! ` +
                `Processed ${result.carnivalsProcessed || 0} carnivals ` +
                `(${result.carnivalsCreated || 0} new, ${result.carnivalsUpdated || 0} updated)`;
            
            req.flash('success_msg', message);
            console.log(`✅ Manual MySideline sync completed: ${result.carnivalsProcessed || 0} carnivals processed`);
        } else {
            const errorMessage = result?.error || 'Sync completed but no carnivals were processed';
            req.flash('warning_msg', `MySideline sync completed with issues: ${errorMessage}`);
            console.log(`⚠️ MySideline sync completed with issues: ${errorMessage}`);
        }
        
    } catch (error) {
        console.error('❌ Manual MySideline sync failed:', error);
        
        // Log the failure - using correct action constant
        await AuditService.logAdminAction(
            AuditService.ACTIONS.ADMIN_SYSTEM_SYNC,
            req,
            AuditService.ENTITIES.SYSTEM,
            null,
            {
                result: 'FAILURE',
                errorMessage: error.message,
                metadata: {
                    adminAction: 'Manual MySideline sync triggered',
                    error: error.message
                }
            }
        );
        
        req.flash('error_msg', `MySideline sync failed: ${error.message}`);
    }
    
    return res.redirect('/admin/dashboard');
};



// Raw controller functions object for wrapping
const rawControllers = {
    getAdminDashboardHandler,
    getUserManagementHandler,
    showEditUserHandler,
    updateUserHandler,
    issuePasswordResetHandler,
    toggleUserStatusHandler,
    getClubManagementHandler,
    showEditClubHandler,
    updateClubHandler,
    deactivateClubHandler,
    getCarnivalManagementHandler,
    showEditCarnivalHandler,
    updateCarnivalHandler,
    toggleCarnivalStatusHandler,
    toggleCarnivalActiveHandler,
    toggleClubStatusHandler,
    toggleClubVisibilityHandler,
    generateReportHandler,
    deleteUserHandler,
    showClaimCarnivalFormHandler,
    adminClaimCarnivalHandler,
    showCarnivalPlayersHandler,
    getSponsorManagementHandler,
    showEditSponsorHandler,
    deleteSponsorHandler,
    getAuditLogsHandler,
    getAuditStatisticsHandler,
    exportAuditLogsHandler,
    syncMySidelineHandler
};

// Export wrapped versions using the wrapControllers utility
export const {
    getAdminDashboardHandler: getAdminDashboard,
    getUserManagementHandler: getUserManagement,
    showEditUserHandler: showEditUser,
    updateUserHandler: updateUser,
    issuePasswordResetHandler: issuePasswordReset,
    toggleUserStatusHandler: toggleUserStatus,
    getClubManagementHandler: getClubManagement,
    showEditClubHandler: showEditClub,
    updateClubHandler: updateClub,
    deactivateClubHandler: deactivateClub,
    getCarnivalManagementHandler: getCarnivalManagement,
    showEditCarnivalHandler: showEditCarnival,
    updateCarnivalHandler: updateCarnival,
    toggleCarnivalStatusHandler: toggleCarnivalStatus,
    toggleCarnivalActiveHandler: toggleCarnivalActive,
    toggleClubStatusHandler: toggleClubStatus,
    toggleClubVisibilityHandler: toggleClubVisibility,
    generateReportHandler: generateReport,
    deleteUserHandler: deleteUser,
    showClaimCarnivalFormHandler: showClaimCarnivalForm,
    adminClaimCarnivalHandler: adminClaimCarnival,
    showCarnivalPlayersHandler: showCarnivalPlayers,
    getSponsorManagementHandler: getSponsorManagement,
    showEditSponsorHandler: showEditSponsor,
    deleteSponsorHandler: deleteSponsor,
    getAuditLogsHandler: getAuditLogs,
    getAuditStatisticsHandler: getAuditStatistics,
    exportAuditLogsHandler: exportAuditLogs,
    syncMySidelineHandler: syncMySideline
} = wrapControllers(rawControllers); 