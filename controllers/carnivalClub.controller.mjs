/**
 * CarnivalClub Controller - MVC Architecture Implementation
 *
 * Handles carnival-club relationship management, including club registration
 * for carnivals and attendance tracking.
 * Follows strict MVC separation of concerns as outlined in best practices.
 */

import { CarnivalClub, Carnival, Club, ClubPlayer, CarnivalClubPlayer } from '../models/index.mjs';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';
import { wrapControllers } from '../middleware/asyncHandler.mjs';
import CarnivalEmailService from '../services/email/CarnivalEmailService.mjs';
import { APPROVAL_STATUS } from '../config/constants.mjs';

/**
 * Show carnival attendees management page (for carnival organizers)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCarnivalAttendeesHandler = async (req, res) => {
  const { carnivalId } = req.params;
  const user = req.user;

  // Get carnival and verify user has permission to manage it
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
    include: [
      {
        model: Club,
        as: 'hostClub',
        attributes: ['id', 'clubName', 'isActive', 'state', 'location', 'logoUrl'],
        required: false,
      },
    ],
  });

  if (!carnival) {
    req.flash('error_msg', 'Carnival not found or you do not have permission to manage it.');
    return res.redirect('/carnivals');
  }

  // Get all registered clubs for this carnival
  const attendingClubs = await CarnivalClub.findAll({
    where: {
      carnivalId: carnivalId,
      isActive: true,
    },
    include: [
      {
        model: Club,
        as: 'participatingClub',
        where: { isActive: true },
        attributes: ['id', 'clubName', 'state', 'location', 'logoUrl'],
      },
    ],
    order: [
      ['displayOrder', 'ASC'],
      ['registrationDate', 'ASC'],
    ],
  });

  // Get attendance statistics with approval status
  const attendanceStats = await CarnivalClub.getAttendanceCountWithStatus(carnivalId);
  const totalAttendees = attendingClubs.length;
  const paidAttendees = attendingClubs.filter((cc) => cc.isPaid).length;
  const totalPlayerCount = attendingClubs.reduce((sum, cc) => sum + (cc.playerCount || 0), 0);

  return res.render('carnivals/attendees', {
    title: `${carnival.title} - Manage Attendees`,
    carnival,
    attendingClubs,
    totalAttendees,
    paidAttendees,
    totalPlayerCount,
    attendanceStats,
    additionalCSS: ['/styles/carnival.styles.css'],
  });
};

/**
 * Show add club to carnival form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showAddClubToCarnivalHandler = async (req, res) => {
  const { carnivalId } = req.params;
  const user = req.user;

  // Get carnival and verify permissions
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
  });

  if (!carnival) {
    req.flash('error_msg', 'Carnival not found or you do not have permission to manage it.');
    return res.redirect('/carnivals');
  }

  // Get all active clubs not already registered for this carnival
  const registeredClubIds = await CarnivalClub.findAll({
    where: {
      carnivalId: carnivalId,
      isActive: true,
    },
    attributes: ['clubId'],
  }).then((results) => results.map((r) => r.clubId));

  const availableClubs = await Club.findAll({
    where: {
      isActive: true,
      isPubliclyListed: true,
      id: { [Op.notIn]: registeredClubIds },
    },
    order: [['clubName', 'ASC']],
    attributes: [
      'id',
      'clubName',
      'state',
      'location',
      'contactPerson',
      'contactEmail',
      'contactPhone',
    ],
  });

  return res.render('carnivals/add-club', {
    title: `Add Club to ${carnival.title}`,
    carnival,
    availableClubs,
    additionalCSS: ['/styles/carnival.styles.css'],
  });
};

/**
 * Register a club for a carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerClubForCarnivalHandler = async (req, res) => {
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
      isActive: true,
    },
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
    isPaid,
  } = req.body;

  // Check if club is already registered
  const existingRegistration = await CarnivalClub.findOne({
    where: {
      carnivalId,
      clubId,
      isActive: true,
    },
  });

  if (existingRegistration) {
    req.flash('error_msg', 'This club is already registered for this carnival.');
    return res.redirect(`/carnivals/${carnivalId}/attendees`);
  }

  // Get current count for display order
  const currentCount = await CarnivalClub.count({
    where: {
      carnivalId,
      isActive: true,
    },
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
    displayOrder: currentCount + 1,
    approvalStatus: 'approved', // Host club adding clubs directly = auto-approved
  };

  const registration = await CarnivalClub.create(registrationData);

  // Get club name for success message
  const club = await Club.findByPk(clubId, {
    attributes: ['clubName'],
  });

  req.flash(
    'success_msg',
    `${club.clubName} has been successfully registered for ${carnival.title}!`
  );
  return res.redirect(`/carnivals/${carnivalId}/attendees`);
};

/**
 * Show edit club registration form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditRegistrationHandler = async (req, res) => {
  const { carnivalId, registrationId } = req.params;
  const user = req.user;

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
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
      isActive: true,
    },
    include: [
      {
        model: Club,
        as: 'participatingClub',
        attributes: ['id', 'clubName', 'state', 'location'],
      },
    ],
  });

  if (!registration) {
    req.flash('error_msg', 'Registration not found.');
    return res.redirect(`/carnivals/${carnivalId}/attendees`);
  }

  return res.render('carnivals/edit-registration', {
    title: `Edit Registration - ${registration.participatingClub.clubName}`,
    carnival,
    registration,
    additionalCSS: ['/styles/carnival.styles.css'],
  });
};

/**
 * Update club registration details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateRegistrationHandler = async (req, res) => {
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
      isActive: true,
    },
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
      isActive: true,
    },
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
    isPaid,
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
    isPaid: isPaid === 'on',
  };

  // Update payment date if payment status changed
  if (updateData.isPaid && !registration.isPaid) {
    updateData.paymentDate = new Date();
  } else if (!updateData.isPaid && registration.isPaid) {
    updateData.paymentDate = null;
  }

  await registration.update(updateData);

  req.flash('success_msg', 'Registration updated successfully!');
  return res.redirect(`/carnivals/${carnivalId}/attendees`);
};

/**
 * Remove club from carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeClubFromCarnivalHandler = async (req, res) => {
  const { carnivalId, registrationId } = req.params;
  const user = req.user;

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
  });

  if (!carnival) {
    return res.status(403).json({
      success: false,
      message: 'Carnival not found or you do not have permission to manage it.',
    });
  }

  // Get registration
  const registration = await CarnivalClub.findOne({
    where: {
      id: registrationId,
      carnivalId: carnivalId,
      isActive: true,
    },
    include: [
      {
        model: Club,
        as: 'participatingClub',
        attributes: ['clubName'],
      },
    ],
  });

  if (!registration) {
    return res.status(404).json({
      success: false,
      message: 'Registration not found.',
    });
  }

  // Soft delete by setting isActive to false
  await registration.update({ isActive: false });

  return res.json({
    success: true,
    message: `${registration.participatingClub.clubName} has been removed from the carnival.`,
  });
};

/**
 * Update display order of attending clubs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const reorderAttendingClubsHandler = async (req, res) => {
  const { carnivalId } = req.params;
  const { clubOrder } = req.body; // Array of registration IDs in new order
  const user = req.user;

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
  });

  if (!carnival) {
    return res.status(403).json({
      success: false,
      message: 'Carnival not found or you do not have permission to manage it.',
    });
  }

  if (!Array.isArray(clubOrder)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid club order data.',
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
          isActive: true,
        },
      }
    );
  }

  return res.json({
    success: true,
    message: 'Club order updated successfully.',
  });
};

/**
 * Register delegate's own club for a carnival (self-service registration)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerMyClubForCarnivalHandler = async (req, res) => {
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
      isActive: true,
    },
  });

  if (!carnival) {
    req.flash('error_msg', 'Carnival not found.');
    return res.redirect('/carnivals');
  }

  // Check if registration is still open (using async version for real-time count)
  const canRegister = await carnival.isRegistrationActiveAsync();
  if (!canRegister) {
    if (carnival.maxTeams) {
      const approvedCount = await carnival.getApprovedRegistrationsCount();
      if (approvedCount >= carnival.maxTeams) {
        req.flash(
          'error_msg',
          `This carnival has reached its maximum capacity of ${carnival.maxTeams} teams.`
        );
        return res.redirect(`/carnivals/${carnivalId}`);
      }
    }
    req.flash('error_msg', 'Registration for this carnival is currently closed.');
    return res.redirect(`/carnivals/${carnivalId}`);
  }

  // Check if user's club is already registered
  const existingRegistration = await CarnivalClub.findOne({
    where: {
      carnivalId,
      clubId: user.clubId,
      isActive: true,
    },
  });

  if (existingRegistration) {
    req.flash('error_msg', 'Your club is already registered for this carnival.');
    return res.redirect(`/carnivals/${carnivalId}`);
  }

  // Get user's club for success message
  const club = await Club.findByPk(user.clubId, {
    attributes: ['clubName'],
  });

  const { playerCount, teamName, contactPerson, contactEmail, contactPhone, specialRequirements } =
    req.body;

  // Get current count for display order
  const currentCount = await CarnivalClub.count({
    where: {
      carnivalId,
      isActive: true,
    },
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
    registrationDate: new Date(),
    approvalStatus: 'pending', // Self-registrations need approval
  };

  await CarnivalClub.create(registrationData);

  req.flash(
    'success_msg',
    `${club.clubName} has registered interest to attend ${carnival.title}! Your registration is pending approval from the hosting club. You'll be notified once approved.`
  );
  return res.redirect(`/carnivals/${carnivalId}`);
};

/**
 * Unregister delegate's own club from a carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const unregisterMyClubFromCarnivalHandler = async (req, res) => {
  const { carnivalId } = req.params;
  const user = req.user;

  // Ensure user has a club
  if (!user.clubId) {
    return res.status(403).json({
      success: false,
      message: 'You must be associated with a club to manage registrations.',
    });
  }

  // Get carnival and ensure it exists
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      isActive: true,
    },
  });

  if (!carnival) {
    return res.status(404).json({
      success: false,
      message: 'Carnival not found.',
    });
  }

  // Find the registration
  const registration = await CarnivalClub.findOne({
    where: {
      carnivalId,
      clubId: user.clubId,
      isActive: true,
    },
  });

  if (!registration) {
    return res.status(404).json({
      success: false,
      message: 'Your club is not registered for this carnival.',
    });
  }

  // Check if payment has been made - prevent unregistration if paid
  if (registration.isPaid) {
    return res.status(400).json({
      success: false,
      message:
        'Cannot unregister from a carnival after payment has been made. Please contact the organiser.',
    });
  }

  // Soft delete the registration
  await registration.update({ isActive: false });

  // Get club name for response
  const club = await Club.findByPk(user.clubId, {
    attributes: ['clubName'],
  });

  return res.json({
    success: true,
    message: `${club.clubName} has been unregistered from ${carnival.title}.`,
  });
};

/**
 * Show players assigned to a specific carnival club registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCarnivalClubPlayersHandler = async (req, res) => {
  const { carnivalId, registrationId } = req.params;
  const user = req.user;

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
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
      isActive: true,
    },
    include: [
      {
        model: Club,
        as: 'participatingClub',
        attributes: ['id', 'clubName', 'state', 'location'],
      },
    ],
  });

  if (!registration) {
    req.flash('error_msg', 'Registration not found.');
    return res.redirect(`/carnivals/${carnivalId}/attendees`);
  }

  // Get assigned players
  const assignedPlayers = await CarnivalClubPlayer.findAll({
    where: {
      carnivalClubId: registrationId,
      isActive: true,
    },
    include: [
      {
        model: ClubPlayer,
        as: 'clubPlayer',
        where: { isActive: true },
        required: true,
      },
    ],
    order: [
      ['clubPlayer', 'firstName', 'ASC'],
      ['clubPlayer', 'lastName', 'ASC'],
    ],
  });

  // Get attendance statistics
  const attendanceStats = await CarnivalClubPlayer.getAttendanceStats(registrationId);

  // Get already assigned player IDs
  const assignedPlayerIds = await CarnivalClubPlayer.findAll({
    where: {
      carnivalClubId: registrationId,
      isActive: true,
    },
    attributes: ['clubPlayerId'],
  }).then((results) => results.map((r) => r.clubPlayerId));

  // Get available players from the club (for determining if Add Players button should be shown)
  const availablePlayers = await ClubPlayer.findAll({
    where: {
      clubId: registration.participatingClub.id,
      isActive: true,
      id: { [Op.notIn]: assignedPlayerIds },
    },
    order: [
      ['firstName', 'ASC'],
      ['lastName', 'ASC'],
    ],
  });

  return res.render('carnivals/club-players', {
    title: `Players - ${registration.participatingClub.clubName}`,
    carnival,
    registration,
    assignedPlayers,
    attendanceStats,
    availablePlayers,
    additionalCSS: ['/styles/carnival.styles.css'],
  });
};

/**
 * Show form to add players to carnival registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showAddPlayersToRegistrationHandler = async (req, res) => {
  const { carnivalId, registrationId } = req.params;
  const user = req.user;

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
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
      isActive: true,
    },
    include: [
      {
        model: Club,
        as: 'participatingClub',
        attributes: ['id', 'clubName', 'state', 'location'],
      },
    ],
  });

  if (!registration) {
    req.flash('error_msg', 'Registration not found.');
    return res.redirect(`/carnivals/${carnivalId}/attendees`);
  }

  // Get already assigned player IDs
  const assignedPlayerIds = await CarnivalClubPlayer.findAll({
    where: {
      carnivalClubId: registrationId,
      isActive: true,
    },
    attributes: ['clubPlayerId'],
  }).then((results) => results.map((r) => r.clubPlayerId));

  // Get available players from the club
  const availablePlayers = await ClubPlayer.findAll({
    where: {
      clubId: registration.participatingClub.id,
      isActive: true,
      id: { [Op.notIn]: assignedPlayerIds },
    },
    order: [
      ['firstName', 'ASC'],
      ['lastName', 'ASC'],
    ],
  });

  return res.render('carnivals/add-players', {
    title: `Add Players - ${registration.participatingClub.clubName}`,
    carnival,
    registration,
    availablePlayers,
    additionalCSS: ['/styles/carnival.styles.css'],
  });
};

/**
 * Add selected players to carnival registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addPlayersToRegistrationHandler = async (req, res) => {
  const { carnivalId, registrationId } = req.params;
  const user = req.user;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please select at least one player.');
    return res.redirect(`/carnivals/${carnivalId}/attendees/${registrationId}/players/add`);
  }

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
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
      isActive: true,
    },
  });

  if (!registration) {
    req.flash('error_msg', 'Registration not found.');
    return res.redirect(`/carnivals/${carnivalId}/attendees`);
  }

  const { playerIds } = req.body;
  const selectedPlayerIds = Array.isArray(playerIds) ? playerIds : [playerIds];

  // Verify all selected players belong to the registered club
  const validPlayers = await ClubPlayer.findAll({
    where: {
      id: { [Op.in]: selectedPlayerIds },
      clubId: registration.clubId,
      isActive: true,
    },
  });

  if (validPlayers.length !== selectedPlayerIds.length) {
    req.flash('error_msg', 'Some selected players are invalid.');
    return res.redirect(`/carnivals/${carnivalId}/attendees/${registrationId}/players/add`);
  }

  // Create player assignments
  const assignments = selectedPlayerIds.map((playerId) => ({
    carnivalClubId: parseInt(registrationId),
    clubPlayerId: parseInt(playerId),
    attendanceStatus: 'confirmed',
    addedAt: new Date(),
  }));

  await CarnivalClubPlayer.bulkCreate(assignments, {
    ignoreDuplicates: true, // Ignore if player is already assigned
  });

  req.flash(
    'success_msg',
    `${selectedPlayerIds.length} player(s) have been added to the carnival registration.`
  );
  return res.redirect(`/carnivals/${carnivalId}/attendees/${registrationId}/players`);
};

/**
 * Remove player from carnival registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removePlayerFromRegistrationHandler = async (req, res) => {
  const { carnivalId, registrationId, assignmentId } = req.params;
  const user = req.user;

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
  });

  if (!carnival) {
    return res.status(403).json({
      success: false,
      message: 'Carnival not found or you do not have permission to manage it.',
    });
  }

  // Get player assignment
  const assignment = await CarnivalClubPlayer.findOne({
    where: {
      id: assignmentId,
      carnivalClubId: registrationId,
      isActive: true,
    },
    include: [
      {
        model: ClubPlayer,
        as: 'clubPlayer',
        attributes: ['firstName', 'lastName'],
      },
    ],
  });

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Player assignment not found.',
    });
  }

  // Soft delete the assignment
  await assignment.update({ isActive: false });

  return res.json({
    success: true,
    message: `${assignment.clubPlayer.firstName} ${assignment.clubPlayer.lastName} has been removed from the carnival registration.`,
  });
};

/**
 * Update player attendance status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePlayerAttendanceStatusHandler = async (req, res) => {
  const { carnivalId, registrationId, assignmentId } = req.params;
  const user = req.user;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid attendance status.',
    });
  }

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
  });

  if (!carnival) {
    return res.status(403).json({
      success: false,
      message: 'Carnival not found or you do not have permission to manage it.',
    });
  }

  // Get player assignment
  const assignment = await CarnivalClubPlayer.findOne({
    where: {
      id: assignmentId,
      carnivalClubId: registrationId,
      isActive: true,
    },
  });

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Player assignment not found.',
    });
  }

  const { attendanceStatus, notes } = req.body;

  // Update assignment
  await assignment.update({
    attendanceStatus: attendanceStatus,
    notes: notes?.trim() || null,
  });

  return res.json({
    success: true,
    message: 'Player attendance status updated successfully.',
  });
};

/**
 * Show players for delegate's own club carnival registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showMyClubPlayersForCarnivalHandler = async (req, res) => {
  const { carnivalId } = req.params;
  const user = req.user;

  // Ensure user has a club
  if (!user.clubId) {
    req.flash('error_msg', 'You must be associated with a club to manage players.');
    return res.redirect(`/carnivals/${carnivalId}`);
  }

  // Get carnival
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      isActive: true,
    },
  });

  if (!carnival) {
    req.flash('error_msg', 'Carnival not found.');
    return res.redirect('/carnivals');
  }

  // Get user's club registration
  const registration = await CarnivalClub.findOne({
    where: {
      carnivalId: carnivalId,
      clubId: user.clubId,
      isActive: true,
    },
    include: [
      {
        model: Club,
        as: 'participatingClub',
        attributes: ['id', 'clubName', 'state', 'location'],
      },
    ],
  });

  if (!registration) {
    req.flash('error_msg', 'Your club is not registered for this carnival.');
    return res.redirect(`/carnivals/${carnivalId}`);
  }

  // Get assigned players
  const assignedPlayers = await CarnivalClubPlayer.findAll({
    where: {
      carnivalClubId: registration.id,
      isActive: true,
    },
    include: [
      {
        model: ClubPlayer,
        as: 'clubPlayer',
        where: { isActive: true },
        required: true,
      },
    ],
    order: [
      ['clubPlayer', 'firstName', 'ASC'],
      ['clubPlayer', 'lastName', 'ASC'],
    ],
  });

  // Get all club players for selection
  const assignedPlayerIds = assignedPlayers.map((ap) => ap.clubPlayerId);
  const availablePlayers = await ClubPlayer.findAll({
    where: {
      clubId: user.clubId,
      isActive: true,
      id: { [Op.notIn]: assignedPlayerIds },
    },
    order: [
      ['firstName', 'ASC'],
      ['lastName', 'ASC'],
    ],
  });

  return res.render('carnivals/my-club-players', {
    title: `Manage Players - ${carnival.title}`,
    carnival,
    registration,
    assignedPlayers,
    availablePlayers,
    additionalCSS: ['/styles/carnival.styles.css'],
  });
};

/**
 * Add players to delegate's own club registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addPlayersToMyClubRegistrationHandler = async (req, res) => {
  const { carnivalId } = req.params;
  const user = req.user;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please select at least one player.');
    return res.redirect(`/carnivals/${carnivalId}/register/players`);
  }

  // Ensure user has a club
  if (!user.clubId) {
    req.flash('error_msg', 'You must be associated with a club to manage players.');
    return res.redirect(`/carnivals/${carnivalId}`);
  }

  // Get user's club registration
  const registration = await CarnivalClub.findOne({
    where: {
      carnivalId: carnivalId,
      clubId: user.clubId,
      isActive: true,
    },
  });

  if (!registration) {
    req.flash('error_msg', 'Your club is not registered for this carnival.');
    return res.redirect(`/carnivals/${carnivalId}`);
  }

  const { playerIds } = req.body;
  const selectedPlayerIds = Array.isArray(playerIds) ? playerIds : [playerIds];

  // Verify all selected players belong to user's club
  const validPlayers = await ClubPlayer.findAll({
    where: {
      id: { [Op.in]: selectedPlayerIds },
      clubId: user.clubId,
      isActive: true,
    },
  });

  if (validPlayers.length !== selectedPlayerIds.length) {
    req.flash('error_msg', 'Some selected players are invalid.');
    return res.redirect(`/carnivals/${carnivalId}/register/players`);
  }

  // Create player assignments
  const assignments = selectedPlayerIds.map((playerId) => ({
    carnivalClubId: registration.id,
    clubPlayerId: parseInt(playerId),
    attendanceStatus: 'confirmed',
    addedAt: new Date(),
  }));

  await CarnivalClubPlayer.bulkCreate(assignments, {
    ignoreDuplicates: true,
  });

  req.flash(
    'success_msg',
    `${selectedPlayerIds.length} player(s) have been added to your carnival registration.`
  );
  return res.redirect(`/carnivals/${carnivalId}/register/players`);
};

/**
 * Approve a club registration for a carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const approveClubRegistrationHandler = async (req, res) => {
  const { carnivalId, registrationId } = req.params;
  const user = req.user;

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
  });

  if (!carnival) {
    return res.status(403).json({
      success: false,
      message: 'Carnival not found or you do not have permission to manage it.',
    });
  }

  // Get registration
  const registration = await CarnivalClub.findOne({
    where: {
      id: registrationId,
      carnivalId: carnivalId,
      isActive: true,
    },
    include: [
      {
        model: Club,
        as: 'participatingClub',
        attributes: ['clubName', 'contactEmail'],
      },
    ],
  });

  if (!registration) {
    return res.status(404).json({
      success: false,
      message: 'Registration not found.',
    });
  }

  if (registration.approvalStatus === 'approved') {
    return res.status(400).json({
      success: false,
      message: 'Registration is already approved.',
    });
  }

  // Approve the registration
  await registration.update({
    approvalStatus: 'approved',
    approvedAt: new Date(),
    approvedByUserId: user.id,
    rejectionReason: null,
  });

  // Send approval notification email
  
  await CarnivalEmailService.sendRegistrationApprovalEmail(
    carnival,
    registration.participatingClub,
    `${user.firstName} ${user.lastName}`
  );

  return res.json({
    success: true,
    message: `${registration.participatingClub.clubName} has been approved to attend ${carnival.title}.`,
  });
};

/**
 * Reject a club registration for a carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const rejectClubRegistrationHandler = async (req, res) => {
  const { carnivalId, registrationId } = req.params;
  const { rejectionReason } = req.body;
  const user = req.user;

  // Verify carnival ownership
  const carnival = await Carnival.findOne({
    where: {
      id: carnivalId,
      createdByUserId: user.id,
      isActive: true,
    },
  });

  if (!carnival) {
    return res.status(403).json({
      success: false,
      message: 'Carnival not found or you do not have permission to manage it.',
    });
  }

  // Get registration
  const registration = await CarnivalClub.findOne({
    where: {
      id: registrationId,
      carnivalId: carnivalId,
      isActive: true,
    },
    include: [
      {
        model: Club,
        as: 'participatingClub',
        attributes: ['clubName', 'contactEmail'],
      },
    ],
  });

  if (!registration) {
    return res.status(404).json({
      success: false,
      message: 'Registration not found.',
    });
  }

  if (registration.approvalStatus === 'rejected') {
    return res.status(400).json({
      success: false,
      message: 'Registration is already rejected.',
    });
  }

  // Reject the registration
  await registration.update({
    approvalStatus: 'rejected',
    approvedAt: null,
    approvedByUserId: user.id,
    rejectionReason: rejectionReason?.trim() || 'No reason provided',
  });

  // Send rejection notification email
  await CarnivalEmailService.sendRegistrationRejectionEmail(
    carnival,
    registration.participatingClub,
    `${user.firstName} ${user.lastName}`,
    rejectionReason
  );

  return res.json({
    success: true,
    message: `${registration.participatingClub.clubName}'s registration has been rejected.`,
  });
};

/**
 * CarnivalClub Controller
 * 
 * Handles carnival club registration operations
 */
class CarnivalClubController {
  /**
   * Update carnival club registration approval status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateApprovalStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { approvalStatus, rejectionReason } = req.body;

      // Validate approval status using constants
      if (!Object.values(APPROVAL_STATUS).includes(approvalStatus)) {
        return res.status(400).json({
          error: {
            status: 400,
            message: `Invalid approval status. Must be one of: ${Object.values(APPROVAL_STATUS).join(', ')}`
          }
        });
      }

      const carnivalClub = await CarnivalClub.findByPk(id);
      if (!carnivalClub) {
        return res.status(404).json({
          error: {
            status: 404,
            message: 'Carnival club registration not found'
          }
        });
      }

      // Update approval status
      carnivalClub.approvalStatus = approvalStatus;
      
      if (approvalStatus === APPROVAL_STATUS.APPROVED) {
        carnivalClub.approvedAt = new Date();
        carnivalClub.approvedByUserId = req.user?.id;
        carnivalClub.rejectionReason = null;
      } else if (approvalStatus === APPROVAL_STATUS.REJECTED) {
        carnivalClub.rejectionReason = rejectionReason;
        carnivalClub.approvedAt = null;
        carnivalClub.approvedByUserId = null;
      } else {
        carnivalClub.rejectionReason = null;
        carnivalClub.approvedAt = null;
        carnivalClub.approvedByUserId = null;
      }

      await carnivalClub.save();

      res.json({
        success: true,
        data: carnivalClub,
        message: `Registration ${approvalStatus} successfully`
      });
    } catch (error) {
      next(error);
    }
  }
}

// Raw controller functions object for wrapping
const rawControllers = {
  showCarnivalAttendeesHandler,
  showAddClubToCarnivalHandler,
  registerClubForCarnivalHandler,
  showEditRegistrationHandler,
  updateRegistrationHandler,
  removeClubFromCarnivalHandler,
  reorderAttendingClubsHandler,
  registerMyClubForCarnivalHandler,
  unregisterMyClubFromCarnivalHandler,
  showCarnivalClubPlayersHandler,
  showAddPlayersToRegistrationHandler,
  addPlayersToRegistrationHandler,
  removePlayerFromRegistrationHandler,
  updatePlayerAttendanceStatusHandler,
  showMyClubPlayersForCarnivalHandler,
  addPlayersToMyClubRegistrationHandler,
  approveClubRegistrationHandler,
  rejectClubRegistrationHandler,
  updateApprovalStatus: CarnivalClubController.prototype.updateApprovalStatus,
};

// Export wrapped versions using the wrapControllers utility
export const {
  showCarnivalAttendeesHandler: showCarnivalAttendees,
  showAddClubToCarnivalHandler: showAddClubToCarnival,
  registerClubForCarnivalHandler: registerClubForCarnival,
  showEditRegistrationHandler: showEditRegistration,
  updateRegistrationHandler: updateRegistration,
  removeClubFromCarnivalHandler: removeClubFromCarnival,
  reorderAttendingClubsHandler: reorderAttendingClubs,
  registerMyClubForCarnivalHandler: registerMyClubForCarnival,
  unregisterMyClubFromCarnivalHandler: unregisterMyClubFromCarnival,
  showCarnivalClubPlayersHandler: showCarnivalClubPlayers,
  showAddPlayersToRegistrationHandler: showAddPlayersToRegistration,
  addPlayersToRegistrationHandler: addPlayersToRegistration,
  removePlayerFromRegistrationHandler: removePlayerFromRegistration,
  updatePlayerAttendanceStatusHandler: updatePlayerAttendanceStatus,
  showMyClubPlayersForCarnivalHandler: showMyClubPlayersForCarnival,
  addPlayersToMyClubRegistrationHandler: addPlayersToMyClubRegistration,
  approveClubRegistrationHandler: approveClubRegistration,
  rejectClubRegistrationHandler: rejectClubRegistration,
  updateApprovalStatus: updateApprovalStatus,
} = wrapControllers(rawControllers);
