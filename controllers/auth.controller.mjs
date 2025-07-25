/**
 * Authentication Controller - MVC Architecture Implementation
 *
 * Handles all authentication-related business logic and request processing.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import { User, Club } from '../models/index.mjs';
import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.mjs';
import bcrypt from 'bcrypt'; // Fixed: Use bcrypt to match User model
import crypto from 'crypto';
import InvitationEmailService from '../services/email/InvitationEmailService.mjs';
import AuditService from '../services/auditService.mjs';
import { wrapControllers } from '../middleware/asyncHandler.mjs';

/**
 * Display login form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showLoginForm = (req, res) => {
  return res.render('auth/login', {
    title: 'Login',
  });
};

/**
 * Handle user login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const loginUser = async (req, res, next) => {
  const DEBUG_AUTH = process.env.NODE_ENV === 'test';
  
  if (DEBUG_AUTH) {
    console.log(`[AUTH CONTROLLER DEBUG] Login attempt for email: ${req.body.email}`);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (DEBUG_AUTH) {
      console.log(`[AUTH CONTROLLER DEBUG] Validation errors:`, errors.array());
    }
    
    // Log failed login attempt due to validation
    await AuditService.logAuthAction(AuditService.ACTIONS.USER_LOGIN, req, null, {
      result: 'FAILURE',
      reason: 'Validation failed',
      validationErrors: errors.array(),
    });

    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/auth/login');
  }

  const { email, password } = req.body;

  if (DEBUG_AUTH) {
    console.log(`[AUTH CONTROLLER DEBUG] Looking up user with email: ${email.toLowerCase()}`);
  }

  // Find user by email
  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    include: [{ model: Club, as: 'club' }],
  });

  if (DEBUG_AUTH) {
    console.log(`[AUTH CONTROLLER DEBUG] User lookup result:`, {
      userFound: !!user,
      isActive: user?.isActive,
      email: user?.email,
      passwordHashLength: user?.passwordHash?.length,
      passwordHashPrefix: user?.passwordHash?.substring(0, 10)
    });
  }

  if (!user || !user.isActive) {
    if (DEBUG_AUTH) {
      console.log(`[AUTH CONTROLLER DEBUG] Authentication failed: ${user ? 'User inactive' : 'User not found'}`);
    }
    
    // Log failed login attempt - user not found or inactive
    await AuditService.logAuthAction(AuditService.ACTIONS.USER_LOGIN, req, null, {
      result: 'FAILURE',
      reason: user ? 'User inactive' : 'User not found',
      attemptedEmail: email.toLowerCase(),
    });

    req.flash('error_msg', 'Invalid email or password.');
    return res.redirect('/auth/login');
  }

  if (DEBUG_AUTH) {
    console.log(`[AUTH CONTROLLER DEBUG] Starting password comparison...`);
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  
  if (DEBUG_AUTH) {
    console.log(`[AUTH CONTROLLER DEBUG] Password comparison result: ${isMatch}`);
  }
  
  if (!isMatch) {
    if (DEBUG_AUTH) {
      console.log(`[AUTH CONTROLLER DEBUG] Authentication failed: Password mismatch`);
    }
    
    // Log failed login attempt - wrong password
    await AuditService.logAuthAction(AuditService.ACTIONS.USER_LOGIN, req, user, {
      result: 'FAILURE',
      reason: 'Invalid password',
    });

    req.flash('error_msg', 'Invalid email or password.');
    return res.redirect('/auth/login');
  }

  if (DEBUG_AUTH) {
    console.log(`[AUTH CONTROLLER DEBUG] Authentication successful, updating last login...`);
  }

  // Update last login timestamp
  await user.update({ lastLoginAt: new Date() });

  // Log successful login
  await AuditService.logAuthAction(AuditService.ACTIONS.USER_LOGIN, req, user, {
    result: 'SUCCESS',
  });

  if (DEBUG_AUTH) {
    console.log(`[AUTH CONTROLLER DEBUG] Calling req.login() with user ID: ${user.id}`);
  }

  req.login(user, (err) => {
    if (err) {
      if (DEBUG_AUTH) {
        console.log(`[AUTH CONTROLLER DEBUG] req.login() error:`, err);
      }
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Login error:', err);
      }
      req.flash('error_msg', 'Login failed. Please try again.');
      return res.redirect('/auth/login');
    }
    
    if (DEBUG_AUTH) {
      console.log(`[AUTH CONTROLLER DEBUG] req.login() successful, checking user role for redirect`);
    }
    
    // Redirect based on user role
    if (user.isAdmin) {
      if (DEBUG_AUTH) {
        console.log(`[AUTH CONTROLLER DEBUG] Admin user detected, redirecting to admin dashboard`);
      }
      return res.redirect('/admin/dashboard');
    } else {
      if (DEBUG_AUTH) {
        console.log(`[AUTH CONTROLLER DEBUG] Regular user, redirecting to standard dashboard`);
      }
      return res.redirect('/dashboard');
    }
  });
};

/**
 * Display registration form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showRegisterForm = async (req, res) => {
  return res.render('auth/register', {
    title: 'Create Account',
  });
};

/**
 * Handle user registration - simplified to create user only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerUser = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Create Account',
      errors: errors.array(),
      formData: req.body,
    });
  }

  const { firstName, lastName, email, password, phoneNumber } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    // Log failed registration attempt
    await AuditService.logUserAction(AuditService.ACTIONS.USER_REGISTER, {
      req,
      entityType: AuditService.ENTITIES.USER,
      result: 'FAILURE',
      errorMessage: 'Email already exists',
      metadata: { attemptedEmail: email.toLowerCase() },
    });

    return res.render('auth/register', {
      title: 'Create Account',
      errors: [{ msg: 'User with this email already exists' }],
      formData: req.body,
    });
  }

  // Create user without club association
  const newUser = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase(),
    passwordHash: password,
    phoneNumber: phoneNumber?.trim() || null,
    clubId: null, // No club association initially
    isPrimaryDelegate: false, // Will be set when they create/join a club
    isActive: true,
  });

  // Log successful user registration
  await AuditService.logUserAction(AuditService.ACTIONS.USER_REGISTER, {
    req,
    entityType: AuditService.ENTITIES.USER,
    entityId: newUser.id,
    newValues: AuditService.sanitizeData({
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
    }),
  });

  console.log(`✅ New user registered: ${newUser.email} (ID: ${newUser.id})`);

  req.flash(
    'success_msg',
    'Registration successful! You can now log in and create or join a club from your dashboard.'
  );
  return res.redirect('/auth/login');
};

/**
 * Display invitation acceptance form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showInvitationForm = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    req.flash('error_msg', 'Invalid invitation link.');
    return res.redirect('/auth/login');
  }

  // Find user with this invitation token
  const invitedUser = await User.findOne({
    where: {
      invitationToken: token,
      tokenExpires: { [Op.gt]: new Date() },
      isActive: false,
    },
    include: [
      {
        model: Club,
        as: 'club',
      },
    ],
  });

  if (!invitedUser) {
    req.flash('error_msg', 'Invalid or expired invitation link.');
    return res.redirect('/auth/login');
  }

  return res.render('auth/accept-invitation', {
    title: 'Accept Invitation',
    invitedUser,
    token,
  });
};

/**
 * Handle invitation acceptance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const acceptInvitation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/auth/login');
  }

  const { token } = req.params;

  // Find user by invitation token
  const invitedUser = await User.findOne({
    where: {
      invitationToken: token,
      tokenExpires: { [Op.gt]: new Date() },
      isActive: false,
    },
  });

  if (!invitedUser) {
    await AuditService.logUserAction(AuditService.ACTIONS.USER_INVITATION_ACCEPT, {
      req,
      entityType: AuditService.ENTITIES.USER,
      result: 'FAILURE',
      errorMessage: 'Invalid or expired invitation link',
      metadata: { token },
    });

    req.flash('error_msg', 'Invalid or expired invitation link.');
    return res.redirect('/auth/login');
  }

  // Hash password and activate user
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

  const oldValues = {
    firstName: invitedUser.firstName,
    lastName: invitedUser.lastName,
    isActive: invitedUser.isActive,
  };

  // Update user with plain password (User model will hash it)
  await invitedUser.update({
    firstName: req.body.firstName.trim(),
    lastName: req.body.lastName.trim(),
    passwordHash: req.body.password, // Pass plain password - User model will hash it
    isActive: true,
    invitationToken: null,
    tokenExpires: null,
  });

  // Log successful invitation acceptance
  await AuditService.logUserAction(AuditService.ACTIONS.USER_INVITATION_ACCEPT, {
    req,
    entityType: AuditService.ENTITIES.USER,
    entityId: invitedUser.id,
    oldValues,
    newValues: AuditService.sanitizeData({
      firstName: invitedUser.firstName,
      lastName: invitedUser.lastName,
      isActive: true,
    }),
  });

  req.flash('success_msg', 'Account activated successfully! You can now log in.');
  return res.redirect('/auth/login');
};

/**
 * Handle user logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logoutUser = (req, res) => {
  const user = req.user;

  req.logout(async (err) => {
    if (err) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error during logout:', err);
      }
      // Use enhanced flash - works even if session is corrupted
      req.flash('error_msg', 'An error occurred during logout.');
      return res.redirect('/');
    }

    // Log successful logout
    try {
      await AuditService.logUserAction(AuditService.ACTIONS.USER_LOGOUT, {
        req,
        entityType: AuditService.ENTITIES.USER,
        entityId: user?.id || null,
        metadata: { userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown' },
      });
    } catch (auditError) {
      // Only log audit errors in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to log logout audit:', auditError);
      }
    }

    // Enhanced flash works regardless of session status
    req.flash('success_msg', 'You have been logged out successfully.');
    return res.redirect('/');
  });
};

/**
 * Send invitation to new club delegate
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendInvitation = async (req, res) => {
  // Check if user is primary delegate
  if (!req.user.isPrimaryDelegate) {
    req.flash('error_msg', 'Only primary delegates can send invitations.');
    return res.redirect('/dashboard');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/dashboard');
  }

  const { firstName, lastName, email } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    await AuditService.logUserAction(AuditService.ACTIONS.USER_INVITATION_SEND, {
      req,
      entityType: AuditService.ENTITIES.USER,
      result: 'FAILURE',
      errorMessage: 'User already exists',
      metadata: { targetEmail: email.toLowerCase() },
    });

    req.flash('error_msg', 'A user with this email already exists.');
    return res.redirect('/dashboard');
  }

  // Generate invitation token
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create inactive user with invitation
  const newUser = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase(),
    clubId: req.user.clubId,
    isPrimaryDelegate: false,
    isActive: false,
    invitationToken: invitationToken,
    tokenExpires: tokenExpiry,
  });

  // Send invitation email
  await InvitationEmailService.sendDelegateInvitation(
    email,
    invitationToken,
    `${req.user.firstName} ${req.user.lastName}`,
    req.user.club?.clubName || 'the club'
  );

  // Log successful invitation send
  await AuditService.logUserAction(AuditService.ACTIONS.USER_INVITATION_SEND, {
    req,
    entityType: AuditService.ENTITIES.USER,
    entityId: newUser.id,
    newValues: AuditService.sanitizeData({
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      clubId: newUser.clubId,
      inviterUserId: req.user.id,
    }),
  });

  req.flash(
    'success_msg',
    `Invitation sent to ${email}. They will receive an email with instructions to activate their account.`
  );
  return res.redirect('/dashboard');
};

/**
 * Transfer primary delegate role to another user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const transferDelegateRole = async (req, res) => {
  // Check if current user is primary delegate
  if (!req.user.isPrimaryDelegate) {
    req.flash('error_msg', 'Only primary delegates can transfer their role.');
    return res.redirect('/dashboard');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please select a valid user to transfer the role to.');
    return res.redirect('/dashboard');
  }

  const { newPrimaryUserId } = req.body;

  // Find the user to transfer role to
  const newPrimaryUser = await User.findOne({
    where: {
      id: newPrimaryUserId,
      clubId: req.user.clubId,
      isActive: true,
      isPrimaryDelegate: false,
    },
  });

  if (!newPrimaryUser) {
    req.flash('error_msg', 'Selected user not found or not eligible for primary delegate role.');
    return res.redirect('/dashboard');
  }

  // Perform the transfer in a transaction to ensure data consistency
  const transaction = await sequelize.transaction();

  try {
    // Remove primary delegate status from current user
    await req.user.update(
      {
        isPrimaryDelegate: false,
      },
      { transaction }
    );

    // Grant primary delegate status to new user
    await newPrimaryUser.update(
      {
        isPrimaryDelegate: true,
      },
      { transaction }
    );

    // Commit the transaction
    await transaction.commit();

    // Send notification email to new primary delegate
    const club = await Club.findByPk(req.user.clubId);
    await InvitationEmailService.sendDelegateRoleTransfer(
      newPrimaryUser.email,
      newPrimaryUser.getFullName(),
      req.user.getFullName(),
      club.clubName
    );

    req.flash(
      'success_msg',
      `Primary delegate role successfully transferred to ${newPrimaryUser.getFullName()}.`
    );
    return res.redirect('/dashboard');
  } catch (transactionError) {
    // Rollback the transaction
    await transaction.rollback();
    throw transactionError;
  }
};

/**
 * Update user's phone number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePhoneNumber = async (req, res) => {
  const { phoneNumber } = req.body;

  // Sanitize phone number input
  const sanitizedPhoneNumber = phoneNumber ? phoneNumber.trim() : null;

  // Update user's phone number
  await req.user.update({
    phoneNumber: sanitizedPhoneNumber,
  });

  console.log(`✅ Phone number updated for user: ${req.user.email} (ID: ${req.user.id})`);

  req.flash('success_msg', 'Phone number updated successfully!');
  return res.redirect('/dashboard');
};

/**
 * Update user's name (first name and last name)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateName = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please provide valid first and last names.');
    return res.redirect('/dashboard');
  }

  const { firstName, lastName } = req.body;

  // Update user's name
  await req.user.update({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
  });

  console.log(`✅ Name updated for user: ${req.user.email} (ID: ${req.user.id})`);

  req.flash('success_msg', 'Name updated successfully!');
  return res.redirect('/dashboard');
};

/**
 * Update user's email address with password verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateEmail = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please provide a valid email address and current password.');
    return res.redirect('/dashboard');
  }

  const { email, currentPassword } = req.body;

  // Verify current password for security
  const isPasswordValid = await req.user.checkPassword(currentPassword);
  if (!isPasswordValid) {
    req.flash('error_msg', 'Current password is incorrect. Please try again.');
    return res.redirect('/dashboard');
  }

  // Check if new email is already in use by another user
  const existingUser = await User.findOne({
    where: {
      email: email.toLowerCase(),
      id: { [Op.ne]: req.user.id },
    },
  });

  if (existingUser) {
    req.flash('error_msg', 'This email address is already in use by another account.');
    return res.redirect('/dashboard');
  }

  // Update user's email
  await req.user.update({
    email: email.toLowerCase().trim(),
  });

  console.log(
    `✅ Email updated for user: ${req.user.id} from ${req.user.email} to ${email.toLowerCase()}`
  );

  req.flash(
    'success_msg',
    'Email address updated successfully! Please use your new email to log in next time.'
  );
  return res.redirect('/dashboard');
};

// Raw controller functions object for wrapping
const rawControllers = {
  showLoginForm,
  loginUser,
  showRegisterForm,
  registerUser,
  showInvitationForm,
  acceptInvitation,
  logoutUser,
  sendInvitation,
  transferDelegateRole,
  updatePhoneNumber,
  updateName,
  updateEmail,
};

// Export wrapped versions using the wrapControllers utility
export const {
  showLoginForm: wrappedShowLoginForm,
  loginUser: wrappedLoginUser,
  showRegisterForm: wrappedShowRegisterForm,
  registerUser: wrappedRegisterUser,
  showInvitationForm: wrappedShowInvitationForm,
  acceptInvitation: wrappedAcceptInvitation,
  logoutUser: wrappedLogoutUser,
  sendInvitation: wrappedSendInvitation,
  transferDelegateRole: wrappedTransferDelegateRole,
  updatePhoneNumber: wrappedUpdatePhoneNumber,
  updateName: wrappedUpdateName,
  updateEmail: wrappedUpdateEmail,
} = wrapControllers(rawControllers);

// Export with original names for route compatibility
export {
  wrappedShowLoginForm as showLoginForm,
  wrappedLoginUser as loginUser,
  wrappedShowRegisterForm as showRegisterForm,
  wrappedRegisterUser as registerUser,
  wrappedShowInvitationForm as showInvitationForm,
  wrappedAcceptInvitation as acceptInvitation,
  wrappedLogoutUser as logoutUser,
  wrappedSendInvitation as sendInvitation,
  wrappedTransferDelegateRole as transferDelegateRole,
  wrappedUpdatePhoneNumber as updatePhoneNumber,
  wrappedUpdateName as updateName,
  wrappedUpdateEmail as updateEmail,
};
