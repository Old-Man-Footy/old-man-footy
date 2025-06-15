/**
 * Admin Controller - Administrator Management Interface
 * 
 * Handles all administrative functionality including user management,
 * club management, carnival management, and system administration.
 */

const { validationResult } = require('express-validator');
const { User, Club, Carnival, Sponsor, EmailSubscription } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const EmailService = require('../services/emailService');

/**
 * Get Admin Dashboard with system statistics
 */
const getAdminDashboard = async (req, res) => {
    try {
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
            Carnival.count({ where: { isActive: true } }),
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
                    isActive: true,
                    createdAt: {
                        [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            }),
            Carnival.count({
                where: {
                    isActive: true,
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
                where: { isActive: true },
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

        res.render('admin/dashboard', {
            title: 'Administrator Dashboard - Old Man Footy',
            stats,
            recentActivity,
            additionalCSS: ['/styles/admin.styles.css']
        });
    } catch (error) {
        console.error('❌ Error loading admin dashboard:', error);
        req.flash('error_msg', 'Error loading dashboard statistics');
        res.redirect('/dashboard');
    }
};

/**
 * Get User Management page with search and filters
 */
const getUserManagement = async (req, res) => {
    try {
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

        res.render('admin/users', {
            title: 'User Management - Admin Dashboard',
            users,
            filters,
            pagination,
            additionalCSS: ['/styles/admin.styles.css']
        });
    } catch (error) {
        console.error('❌ Error loading user management:', error);
        req.flash('error_msg', 'Error loading user management');
        res.redirect('/admin/dashboard');
    }
};

/**
 * Show Edit User form
 */
const showEditUser = async (req, res) => {
    try {
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

        res.render('admin/edit-user', {
            title: `Edit ${editUser.firstName} ${editUser.lastName} - Admin Dashboard`,
            editUser,
            clubs,
            additionalCSS: ['/styles/admin.styles.css']
        });
    } catch (error) {
        console.error('❌ Error loading edit user form:', error);
        req.flash('error_msg', 'Error loading user details');
        res.redirect('/admin/users');
    }
};

/**
 * Update User
 */
const updateUser = async (req, res) => {
    try {
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

        // Check if email is already taken by another user
        if (email !== user.email) {
            const emailExists = await User.findOne({
                where: {
                    email,
                    id: { [Op.ne]: userId }
                }
            });
            
            if (emailExists) {
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

        req.flash('success_msg', `User ${firstName} ${lastName} has been updated successfully`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error('❌ Error updating user:', error);
        req.flash('error_msg', 'Error updating user');
        res.redirect(`/admin/users/${req.params.id}/edit`);
    }
};

/**
 * Issue Password Reset
 */
const issuePasswordReset = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);

        if (!user) {
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
        const emailService = new EmailService();
        await emailService.sendPasswordResetEmail(user.email, resetToken, user.firstName);

        res.json({ 
            success: true, 
            message: `Password reset email sent to ${user.email}` 
        });
    } catch (error) {
        console.error('❌ Error issuing password reset:', error);
        res.json({ 
            success: false, 
            message: 'Error sending password reset email' 
        });
    }
};

/**
 * Toggle User Status
 */
const toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const { isActive } = req.body;
        
        const user = await User.findByPk(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        await user.update({ isActive: !!isActive });

        const status = isActive ? 'activated' : 'deactivated';
        res.json({ 
            success: true, 
            message: `User has been ${status} successfully` 
        });
    } catch (error) {
        console.error('❌ Error toggling user status:', error);
        res.json({ 
            success: false, 
            message: 'Error updating user status' 
        });
    }
};

/**
 * Get Club Management page
 */
const getClubManagement = async (req, res) => {
    try {
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

        res.render('admin/clubs', {
            title: 'Club Management - Admin Dashboard',
            clubs: clubsWithPrimaryDelegate,
            filters,
            pagination,
            additionalCSS: ['/styles/admin.styles.css']
        });
    } catch (error) {
        console.error('❌ Error loading club management:', error);
        req.flash('error_msg', 'Error loading club management');
        res.redirect('/admin/dashboard');
    }
};

/**
 * Show Edit Club form
 */
const showEditClub = async (req, res) => {
    try {
        const clubId = req.params.id;
        
        const club = await Club.findByPk(clubId, {
            include: [
                { 
                    model: User, 
                    as: 'delegates',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'isPrimaryDelegate', 'isActive']
                }
            ]
        });

        if (!club) {
            req.flash('error_msg', 'Club not found');
            return res.redirect('/admin/clubs');
        }

        // Transform the data to add primaryDelegate for template compatibility
        const clubData = club.toJSON();
        clubData.primaryDelegate = clubData.delegates && clubData.delegates.length > 0 
            ? clubData.delegates.find(delegate => delegate.isPrimaryDelegate) 
            : null;

        res.render('admin/edit-club', {
            title: `Edit ${club.clubName} - Admin Dashboard`,
            club: clubData,
            additionalCSS: ['/styles/admin.styles.css']
        });
    } catch (error) {
        console.error('❌ Error loading edit club form:', error);
        req.flash('error_msg', 'Error loading club details');
        res.redirect('/admin/clubs');
    }
};

/**
 * Update Club
 */
const updateClub = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array()[0].msg);
            return res.redirect(`/admin/clubs/${req.params.id}/edit`);
        }

        const clubId = req.params.id;
        const {
            clubName,
            state,
            location,
            description,
            contactEmail,
            contactPhone,
            facebookUrl,
            instagramUrl,
            twitterUrl,
            websiteUrl,
            isActive,
            isPubliclyListed
        } = req.body;

        const club = await Club.findByPk(clubId);
        if (!club) {
            req.flash('error_msg', 'Club not found');
            return res.redirect('/admin/clubs');
        }

        // Prepare update data
        const updateData = {
            clubName,
            state,
            location: location || null,
            description: description || null,
            contactEmail: contactEmail || null,
            contactPhone: contactPhone || null,
            facebookUrl: facebookUrl || null,
            instagramUrl: instagramUrl || null,
            twitterUrl: twitterUrl || null,
            website: websiteUrl || null,
            isActive: !!isActive,
            isPubliclyListed: !!isPubliclyListed
        };

        // Handle logo upload if provided
        if (req.structuredUploads && req.structuredUploads.length > 0) {
            const logoUpload = req.structuredUploads.find(upload => upload.fieldname === 'logo');
            if (logoUpload) {
                updateData.logoUrl = logoUpload.path;
                console.log(`📸 Admin updated club ${club.id} logo: ${logoUpload.path}`);
            }
        }

        // Update club with all editable fields
        await club.update(updateData);

        const successMessage = req.structuredUploads && req.structuredUploads.length > 0 
            ? `Club ${clubName} has been updated successfully, including new logo upload` 
            : `Club ${clubName} has been updated successfully`;

        req.flash('success_msg', successMessage);
        res.redirect('/admin/clubs');
    } catch (error) {
        console.error('❌ Error updating club:', error);
        req.flash('error_msg', 'Error updating club');
        res.redirect(`/admin/clubs/${req.params.id}/edit`);
    }
};

/**
 * Get Carnival Management page
 */
const getCarnivalManagement = async (req, res) => {
    try {
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

        res.render('admin/carnivals', {
            title: 'Carnival Management - Admin Dashboard',
            carnivals,
            filters,
            pagination,
            additionalCSS: ['/styles/admin.styles.css']
        });
    } catch (error) {
        console.error('❌ Error loading carnival management:', error);
        req.flash('error_msg', 'Error loading carnival management');
        res.redirect('/admin/dashboard');
    }
};

/**
 * Show Edit Carnival form
 */
const showEditCarnival = async (req, res) => {
    try {
        const carnivalId = req.params.id;
        
        const carnival = await Carnival.findByPk(carnivalId, {
            include: [{ model: User, as: 'creator' }]
        });

        if (!carnival) {
            req.flash('error_msg', 'Carnival not found');
            return res.redirect('/admin/carnivals');
        }

        res.render('admin/edit-carnival', {
            title: `Edit ${carnival.title} - Admin Dashboard`,
            carnival,
            additionalCSS: ['/styles/admin.styles.css']
        });
    } catch (error) {
        console.error('❌ Error loading edit carnival form:', error);
        req.flash('error_msg', 'Error loading carnival details');
        res.redirect('/admin/carnivals');
    }
};

/**
 * Update Carnival
 */
const updateCarnival = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array()[0].msg);
            return res.redirect(`/admin/carnivals/${req.params.id}/edit`);
        }

        const carnivalId = req.params.id;
        const {
            title,
            date,
            locationAddress,
            state,
            scheduleDetails,
            registrationLink,
            contactEmail
        } = req.body;

        const carnival = await Carnival.findByPk(carnivalId);
        if (!carnival) {
            req.flash('error_msg', 'Carnival not found');
            return res.redirect('/admin/carnivals');
        }

        await carnival.update({
            title,
            date: new Date(date),
            locationAddress,
            state,
            scheduleDetails,
            registrationLink,
            contactEmail
        });

        req.flash('success_msg', `Carnival ${title} has been updated successfully`);
        res.redirect('/admin/carnivals');
    } catch (error) {
        console.error('❌ Error updating carnival:', error);
        req.flash('error_msg', 'Error updating carnival');
        res.redirect(`/admin/carnivals/${req.params.id}/edit`);
    }
};

/**
 * Toggle Carnival Status (Activate/Deactivate)
 */
const toggleCarnivalStatus = async (req, res) => {
    try {
        const carnivalId = req.params.id;
        const { isActive } = req.body;
        
        const carnival = await Carnival.findByPk(carnivalId);
        if (!carnival) {
            return res.json({ success: false, message: 'Carnival not found' });
        }

        const newStatus = !!isActive;
        await carnival.update({ isActive: newStatus });

        const statusText = newStatus ? 'reactivated' : 'deactivated';
        const message = `Carnival "${carnival.title}" has been ${statusText} successfully`;
        
        console.log(`✅ Admin ${req.user.email} ${statusText} carnival: ${carnival.title} (ID: ${carnival.id})`);

        res.json({ 
            success: true, 
            message: message,
            newStatus: newStatus
        });
    } catch (error) {
        console.error('❌ Error toggling carnival status:', error);
        res.json({ 
            success: false, 
            message: 'Error updating carnival status' 
        });
    }
};

/**
 * Toggle Club Status (Activate/Deactivate)
 */
const toggleClubStatus = async (req, res) => {
    try {
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

        res.json({ 
            success: true, 
            message: message,
            newStatus: newStatus
        });
    } catch (error) {
        console.error('❌ Error toggling club status:', error);
        res.json({ 
            success: false, 
            message: 'Error updating club status' 
        });
    }
};

/**
 * Toggle Club Visibility (Publicly Listed status)
 */
const toggleClubVisibility = async (req, res) => {
    try {
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

        res.json({ 
            success: true, 
            message: message,
            newVisibility: newVisibility
        });
    } catch (error) {
        console.error('❌ Error toggling club visibility:', error);
        res.json({ 
            success: false, 
            message: 'Error updating club visibility' 
        });
    }
};

/**
 * Generate System Reports
 */
const generateReport = async (req, res) => {
    try {
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
                    attributes: ['state', [require('sequelize').fn('COUNT', '*'), 'count']],
                    group: ['state'],
                    raw: true
                })
            },
            carnivals: {
                total: await Carnival.count({ where: { isActive: true } }),
                upcoming: await Carnival.count({ 
                    where: { 
                        isActive: true,
                        date: { [Op.gte]: new Date() } 
                    } 
                }),
                past: await Carnival.count({ 
                    where: { 
                        isActive: true,
                        date: { [Op.lt]: new Date() } 
                    } 
                }),
                byState: await Carnival.findAll({
                    where: { isActive: true },
                    attributes: ['state', [require('sequelize').fn('COUNT', '*'), 'count']],
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

        res.render('admin/reports', {
            title: 'System Reports - Admin Dashboard',
            report,
            additionalCSS: ['/styles/admin.styles.css']
        });
    } catch (error) {
        console.error('❌ Error generating reports:', error);
        req.flash('error_msg', 'Error generating system reports');
        res.redirect('/admin/dashboard');
    }
};

/**
 * Delete User
 */
const deleteUser = async (req, res) => {
    try {
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

        const { sequelize } = require('../config/database');
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

            console.log(`✅ User ${user.firstName} ${user.lastName} (${user.email}) has been deleted by admin ${currentUser.email}`);

            res.json({ 
                success: true, 
                message: `User ${user.firstName} ${user.lastName} has been deleted successfully` 
            });

        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.json({ 
            success: false, 
            message: 'Error deleting user' 
        });
    }
};

module.exports = {
    getAdminDashboard,
    getUserManagement,
    showEditUser,
    updateUser,
    issuePasswordReset,
    toggleUserStatus,
    deleteUser,
    getClubManagement,
    showEditClub,
    updateClub,
    toggleClubStatus,
    toggleClubVisibility,
    getCarnivalManagement,
    showEditCarnival,
    updateCarnival,
    toggleCarnivalStatus,
    generateReport
};