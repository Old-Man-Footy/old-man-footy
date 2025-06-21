/**
 * ClubSponsor Controller - Junction Table Management
 * 
 * Handles CRUD operations for club-sponsor relationships
 * for the Old Man Footy platform.
 */

import { ClubSponsor, Club, Sponsor } from '../models/index.mjs';
import { Op } from 'sequelize';

/**
 * Create a new club-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createClubSponsor = async (req, res) => {
  try {
    const {
      clubId,
      sponsorId,
      sponsorshipLevel,
      sponsorshipValue,
      startDate,
      endDate,
      contractDetails,
      notes
    } = req.body;

    // Validate required fields
    if (!clubId || !sponsorId) {
      return res.status(400).json({
        success: false,
        message: 'Club ID and Sponsor ID are required'
      });
    }

    // Check if club and sponsor exist
    const club = await Club.findByPk(clubId);
    const sponsor = await Sponsor.findByPk(sponsorId);

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    if (!sponsor) {
      return res.status(404).json({
        success: false,
        message: 'Sponsor not found'
      });
    }

    // Check for existing active relationship
    const existingRelationship = await ClubSponsor.findOne({
      where: {
        clubId,
        sponsorId,
        isActive: true,
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gt]: new Date() } }
        ]
      }
    });

    if (existingRelationship) {
      return res.status(409).json({
        success: false,
        message: 'An active sponsorship relationship already exists between this club and sponsor'
      });
    }

    // Create the relationship
    const clubSponsor = await ClubSponsor.create({
      clubId,
      sponsorId,
      sponsorshipLevel: sponsorshipLevel || 'Supporting',
      sponsorshipValue: sponsorshipValue || null,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      contractDetails: contractDetails || null,
      notes: notes || null
    });

    // Fetch the created relationship with includes
    const createdRelationship = await ClubSponsor.findByPk(clubSponsor.id, {
      include: [
        { model: Club, as: 'club' },
        { model: Sponsor, as: 'sponsor' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Club-sponsor relationship created successfully',
      data: createdRelationship
    });

  } catch (error) {
    console.error('Error creating club-sponsor relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all club-sponsor relationships with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getClubSponsors = async (req, res) => {
  try {
    const {
      clubId,
      sponsorId,
      sponsorshipLevel,
      isActive = 'true',
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    
    if (clubId) where.clubId = clubId;
    if (sponsorId) where.sponsorId = sponsorId;
    if (sponsorshipLevel) where.sponsorshipLevel = sponsorshipLevel;
    if (isActive !== 'all') where.isActive = isActive === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await ClubSponsor.findAndCountAll({
      where,
      include: [
        { model: Club, as: 'club' },
        { model: Sponsor, as: 'sponsor' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        relationships: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching club-sponsor relationships:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a specific club-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getClubSponsor = async (req, res) => {
  try {
    const { id } = req.params;

    const clubSponsor = await ClubSponsor.findByPk(id, {
      include: [
        { model: Club, as: 'club' },
        { model: Sponsor, as: 'sponsor' }
      ]
    });

    if (!clubSponsor) {
      return res.status(404).json({
        success: false,
        message: 'Club-sponsor relationship not found'
      });
    }

    res.json({
      success: true,
      data: clubSponsor
    });

  } catch (error) {
    console.error('Error fetching club-sponsor relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a club-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateClubSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const clubSponsor = await ClubSponsor.findByPk(id);

    if (!clubSponsor) {
      return res.status(404).json({
        success: false,
        message: 'Club-sponsor relationship not found'
      });
    }

    // Update the relationship
    await clubSponsor.update(updateData);

    // Fetch updated relationship with includes
    const updatedRelationship = await ClubSponsor.findByPk(id, {
      include: [
        { model: Club, as: 'club' },
        { model: Sponsor, as: 'sponsor' }
      ]
    });

    res.json({
      success: true,
      message: 'Club-sponsor relationship updated successfully',
      data: updatedRelationship
    });

  } catch (error) {
    console.error('Error updating club-sponsor relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete (deactivate) a club-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteClubSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const clubSponsor = await ClubSponsor.findByPk(id);

    if (!clubSponsor) {
      return res.status(404).json({
        success: false,
        message: 'Club-sponsor relationship not found'
      });
    }

    if (permanent === 'true') {
      // Permanent deletion
      await clubSponsor.destroy();
      res.json({
        success: true,
        message: 'Club-sponsor relationship permanently deleted'
      });
    } else {
      // Soft delete (deactivate)
      await clubSponsor.update({ 
        isActive: false,
        endDate: new Date()
      });
      res.json({
        success: true,
        message: 'Club-sponsor relationship deactivated'
      });
    }

  } catch (error) {
    console.error('Error deleting club-sponsor relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get sponsors for a specific club
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getClubSponsorsForClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const activeRelationships = await ClubSponsor.getActiveForClub(clubId);

    res.json({
      success: true,
      data: {
        clubId: parseInt(clubId),
        sponsors: activeRelationships
      }
    });

  } catch (error) {
    console.error('Error fetching sponsors for club:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get clubs for a specific sponsor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getClubsForSponsor = async (req, res) => {
  try {
    const { sponsorId } = req.params;

    const activeRelationships = await ClubSponsor.getActiveForSponsor(sponsorId);

    res.json({
      success: true,
      data: {
        sponsorId: parseInt(sponsorId),
        clubs: activeRelationships
      }
    });

  } catch (error) {
    console.error('Error fetching clubs for sponsor:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};