/**
 * CarnivalSponsor Controller - Junction Table Management
 * 
 * Handles CRUD operations for carnival-sponsor relationships
 * for the Old Man Footy platform.
 */

const { CarnivalSponsor, Carnival, Sponsor } = require('../models');
const { Op } = require('sequelize');

/**
 * Create a new carnival-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createCarnivalSponsor = async (req, res) => {
  try {
    const {
      carnivalId,
      sponsorId,
      sponsorshipLevel,
      sponsorshipValue,
      packageDetails,
      displayOrder,
      logoDisplaySize,
      includeInProgram,
      includeOnWebsite,
      notes
    } = req.body;

    // Validate required fields
    if (!carnivalId || !sponsorId) {
      return res.status(400).json({
        success: false,
        message: 'Carnival ID and Sponsor ID are required'
      });
    }

    // Check if carnival and sponsor exist
    const carnival = await Carnival.findByPk(carnivalId);
    const sponsor = await Sponsor.findByPk(sponsorId);

    if (!carnival) {
      return res.status(404).json({
        success: false,
        message: 'Carnival not found'
      });
    }

    if (!sponsor) {
      return res.status(404).json({
        success: false,
        message: 'Sponsor not found'
      });
    }

    // Check for existing active relationship
    const existingRelationship = await CarnivalSponsor.findOne({
      where: {
        carnivalId,
        sponsorId,
        isActive: true
      }
    });

    if (existingRelationship) {
      return res.status(409).json({
        success: false,
        message: 'An active sponsorship relationship already exists between this carnival and sponsor'
      });
    }

    // Create the relationship
    const carnivalSponsor = await CarnivalSponsor.create({
      carnivalId,
      sponsorId,
      sponsorshipLevel: sponsorshipLevel || 'Supporting',
      sponsorshipValue: sponsorshipValue || null,
      packageDetails: packageDetails || null,
      displayOrder: displayOrder || 0,
      logoDisplaySize: logoDisplaySize || 'Medium',
      includeInProgram: includeInProgram !== undefined ? includeInProgram : true,
      includeOnWebsite: includeOnWebsite !== undefined ? includeOnWebsite : true,
      notes: notes || null
    });

    // Fetch the created relationship with includes
    const createdRelationship = await CarnivalSponsor.findByPk(carnivalSponsor.id, {
      include: [
        { model: Carnival, as: 'carnival' },
        { model: Sponsor, as: 'sponsor' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Carnival-sponsor relationship created successfully',
      data: createdRelationship
    });

  } catch (error) {
    console.error('Error creating carnival-sponsor relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all carnival-sponsor relationships with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCarnivalSponsors = async (req, res) => {
  try {
    const {
      carnivalId,
      sponsorId,
      sponsorshipLevel,
      isActive = 'true',
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    
    if (carnivalId) where.carnivalId = carnivalId;
    if (sponsorId) where.sponsorId = sponsorId;
    if (sponsorshipLevel) where.sponsorshipLevel = sponsorshipLevel;
    if (isActive !== 'all') where.isActive = isActive === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await CarnivalSponsor.findAndCountAll({
      where,
      include: [
        { model: Carnival, as: 'carnival' },
        { model: Sponsor, as: 'sponsor' }
      ],
      order: [['displayOrder', 'ASC'], ['sponsorshipLevel', 'ASC'], ['createdAt', 'DESC']],
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
    console.error('Error fetching carnival-sponsor relationships:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a specific carnival-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCarnivalSponsor = async (req, res) => {
  try {
    const { id } = req.params;

    const carnivalSponsor = await CarnivalSponsor.findByPk(id, {
      include: [
        { model: Carnival, as: 'carnival' },
        { model: Sponsor, as: 'sponsor' }
      ]
    });

    if (!carnivalSponsor) {
      return res.status(404).json({
        success: false,
        message: 'Carnival-sponsor relationship not found'
      });
    }

    res.json({
      success: true,
      data: carnivalSponsor
    });

  } catch (error) {
    console.error('Error fetching carnival-sponsor relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a carnival-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateCarnivalSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const carnivalSponsor = await CarnivalSponsor.findByPk(id);

    if (!carnivalSponsor) {
      return res.status(404).json({
        success: false,
        message: 'Carnival-sponsor relationship not found'
      });
    }

    // Update the relationship
    await carnivalSponsor.update(updateData);

    // Fetch updated relationship with includes
    const updatedRelationship = await CarnivalSponsor.findByPk(id, {
      include: [
        { model: Carnival, as: 'carnival' },
        { model: Sponsor, as: 'sponsor' }
      ]
    });

    res.json({
      success: true,
      message: 'Carnival-sponsor relationship updated successfully',
      data: updatedRelationship
    });

  } catch (error) {
    console.error('Error updating carnival-sponsor relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete (deactivate) a carnival-sponsor relationship
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteCarnivalSponsor = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const carnivalSponsor = await CarnivalSponsor.findByPk(id);

    if (!carnivalSponsor) {
      return res.status(404).json({
        success: false,
        message: 'Carnival-sponsor relationship not found'
      });
    }

    if (permanent === 'true') {
      // Permanent deletion
      await carnivalSponsor.destroy();
      res.json({
        success: true,
        message: 'Carnival-sponsor relationship permanently deleted'
      });
    } else {
      // Soft delete (deactivate)
      await carnivalSponsor.update({ 
        isActive: false
      });
      res.json({
        success: true,
        message: 'Carnival-sponsor relationship deactivated'
      });
    }

  } catch (error) {
    console.error('Error deleting carnival-sponsor relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get sponsors for a specific carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCarnivalSponsorsForCarnival = async (req, res) => {
  try {
    const { carnivalId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const activeRelationships = await CarnivalSponsor.getActiveForCarnival(carnivalId);

    res.json({
      success: true,
      data: {
        carnivalId: parseInt(carnivalId),
        sponsors: activeRelationships
      }
    });

  } catch (error) {
    console.error('Error fetching sponsors for carnival:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get carnivals for a specific sponsor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCarnivalsForSponsor = async (req, res) => {
  try {
    const { sponsorId } = req.params;

    const activeRelationships = await CarnivalSponsor.getActiveForSponsor(sponsorId);

    res.json({
      success: true,
      data: {
        sponsorId: parseInt(sponsorId),
        carnivals: activeRelationships
      }
    });

  } catch (error) {
    console.error('Error fetching carnivals for sponsor:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get sponsorship summary for a carnival
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCarnivalSponsorshipSummary = async (req, res) => {
  try {
    const { carnivalId } = req.params;

    const summary = await CarnivalSponsor.getSponsorshipSummary(carnivalId);

    res.json({
      success: true,
      data: {
        carnivalId: parseInt(carnivalId),
        summary
      }
    });

  } catch (error) {
    console.error('Error fetching carnival sponsorship summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reorder carnival sponsors (update display order)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.reorderCarnivalSponsors = async (req, res) => {
  try {
    const { carnivalId } = req.params;
    const { sponsorOrders } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(sponsorOrders)) {
      return res.status(400).json({
        success: false,
        message: 'sponsorOrders must be an array'
      });
    }

    // Update display orders
    const updatePromises = sponsorOrders.map(({ id, displayOrder }) =>
      CarnivalSponsor.update(
        { displayOrder },
        { 
          where: { 
            id, 
            carnivalId,
            isActive: true 
          } 
        }
      )
    );

    await Promise.all(updatePromises);

    // Fetch updated sponsors
    const updatedSponsors = await CarnivalSponsor.getActiveForCarnival(carnivalId);

    res.json({
      success: true,
      message: 'Carnival sponsor display order updated successfully',
      data: {
        carnivalId: parseInt(carnivalId),
        sponsors: updatedSponsors
      }
    });

  } catch (error) {
    console.error('Error reordering carnival sponsors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};