/**
 * Carnival Model - SQLite/Sequelize Implementation
 * 
 * Manages rugby league carnival events, including MySideline integration
 * and comprehensive carnival management for the Old Man Footy platform.
 */

import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../config/database.mjs';

/**
 * Carnival model class extending Sequelize Model
 */
class Carnival extends Model {
  /**
   * Check if registration is currently active
   * @returns {boolean} Registration status
   */
  get isRegistrationActive() {
    if (!this.isRegistrationOpen) return false;
    if (this.registrationDeadline && new Date() > this.registrationDeadline) return false;
    if (this.maxTeams && this.currentRegistrations >= this.maxTeams) return false;
    return true;
  }

  /**
   * Update currentRegistrations to reflect only approved teams
   * @returns {Promise<number>} Number of approved registrations
   */
  async updateCurrentRegistrations() {
    const CarnivalClub = (await import('./CarnivalClub.mjs')).default;
    const approvedCount = await CarnivalClub.count({
      where: {
        carnivalId: this.id,
        isActive: true,
        approvalStatus: 'approved'
      }
    });
    
    // Update the currentRegistrations field
    await this.update({ currentRegistrations: approvedCount }, { 
      silent: true // Prevent triggering hooks to avoid recursion
    });
    
    return approvedCount;
  }

  /**
   * Get current approved registrations count (real-time)
   * @returns {Promise<number>}
   */
  async getApprovedRegistrationsCount() {
    const CarnivalClub = (await import('./CarnivalClub.mjs')).default;
    return await CarnivalClub.count({
      where: {
        carnivalId: this.id,
        isActive: true,
        approvalStatus: 'approved'
      }
    });
  }

  /**
   * Check if registration is currently active (async version with real-time count)
   * @returns {Promise<boolean>} Registration status
   */
  async isRegistrationActiveAsync() {
    if (!this.isRegistrationOpen) return false;
    if (this.registrationDeadline && new Date() > this.registrationDeadline) return false;
    
    if (this.maxTeams) {
      const approvedCount = await this.getApprovedRegistrationsCount();
      if (approvedCount >= this.maxTeams) return false;
    }
    
    return true;
  }

  /**
   * Calculate days until carnival
   * @returns {number} Days until carnival (negative if past)
   */
  get daysUntilCarnival() {
    const today = new Date();
    const carnivalDate = new Date(this.date);
    const diffTime = carnivalDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Get carnival status based on date
   * @returns {string} Status: 'completed', 'today', 'upcoming', 'future'
   */
  get status() {
    const today = new Date();
    const carnivalDate = new Date(this.date);
    
    if (carnivalDate < today) return 'completed';
    if (carnivalDate.toDateString() === today.toDateString()) return 'today';
    if (this.daysUntilCarnival <= 7) return 'upcoming';
    return 'future';
  }

  /**
   * Check if this is a MySideline imported carnival
   * @returns {boolean} MySideline carnival status
   */
  get isMySidelineEvent() {
    return !this.isManuallyEntered;
  }

  /**
   * Check if user can edit this carnival
   * @param {Object} user - User object to check permissions
   * @returns {boolean} Edit permission status
   */
  canUserEdit(user) {
    if (!user) return false;
    
    // Admin users can edit any carnival
    if (user.isAdmin) return true;
    
    // Primary delegates can edit any carnival
    if (user.isPrimaryDelegate) return true;
    
    // Users can edit their own carnivals
    if (this.createdByUserId && this.createdByUserId === user.id) return true;
    
    // Allow any delegate from the hosting club to edit carnivals their club is hosting
    if (user.clubId && this.createdByUserId) {
      // We need to check if the carnival creator belongs to the same club as the current user
      // This requires a database lookup, so we'll need to handle this asynchronously
      return 'async_check_needed';
    }
    
    return false;
  }

  /**
   * Check if user can edit this carnival (async version for club delegate checking)
   * @param {Object} user - User object to check permissions
   * @returns {Promise<boolean>} Edit permission status
   */
  async canUserEditAsync(user) {
    if (!user) return false;
    
    // Admin users can edit any carnival
    if (user.isAdmin) return true;
    
    // Primary delegates can edit any carnival
    if (user.isPrimaryDelegate) return true;
    
    // Users can edit their own carnivals
    if (this.createdByUserId && this.createdByUserId === user.id) return true;
    
    // Allow any delegate from the hosting club to edit carnivals their club is hosting
    if (user.clubId && this.createdByUserId) {
      const User = (await import('./User.mjs')).default;
      const carnivalCreator = await User.findByPk(this.createdByUserId, {
        attributes: ['clubId']
      });
      
      // If the carnival creator and current user belong to the same club, allow editing
      if (carnivalCreator && carnivalCreator.clubId === user.clubId) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get creator user information
   * @returns {Promise<User|null>} Creator user or null
   */
  async getCreator() {
    const User = (await import('./User.mjs')).default;
    if (!this.createdByUserId) return null;
    return await User.findByPk(this.createdByUserId);
  }

  /**
   * Obfuscate sensitive contact information for inactive carnivals
   * @returns {Object} Carnival data with obfuscated contact details if inactive
   */
  getPublicDisplayData() {
    const carnivalData = this.toJSON();
    
    // If carnival is active, return full data
    if (this.isActive) {
      return carnivalData;
    }
    
    // For inactive carnivals, obfuscate contact details
    return {
      ...carnivalData,
      organiserContactEmail: this.obfuscateEmail(carnivalData.organiserContactEmail),
      organiserContactPhone: this.obfuscatePhone(carnivalData.organiserContactPhone),
      registrationLink: null, // Remove registration link entirely
      socialMediaFacebook: null,
      socialMediaInstagram: null,
      socialMediaTwitter: null,
      socialMediaWebsite: null,
      // Keep other information visible for historical purposes
      isRegistrationDisabled: !this.isActive
    };
  }

  /**
   * Obfuscate email address for display
   * @param {string} email - Email to obfuscate
   * @returns {string} Obfuscated email or placeholder
   */
  obfuscateEmail(email) {
    if (!email) return 'Contact details not available';
    
    const [localPart, domain] = email.split('@');
    if (!domain) return 'Contact details not available';
    
    // Show first 2 characters and last character of local part
    const obfuscatedLocal = localPart.length > 3 
      ? `${localPart.substring(0, 2)}***${localPart.slice(-1)}`
      : '***';
    
    // Show first character and last part of domain
    const domainParts = domain.split('.');
    const obfuscatedDomain = domainParts.length > 1
      ? `${domainParts[0].charAt(0)}***.${domainParts[domainParts.length - 1]}`
      : '***';
    
    return `${obfuscatedLocal}@${obfuscatedDomain}`;
  }

  /**
   * Obfuscate phone number for display
   * @param {string} phone - Phone number to obfuscate (can include letters or digits)
   * @returns {string} Obfuscated phone or placeholder
   */
  obfuscatePhone(phone) {
    if (!phone) return 'Contact details not available';
    // Keep only alphanumeric characters for obfuscation
    const alnum = phone.replace(/[^a-zA-Z0-9]/g, '');
    if (alnum.length < 6) {
      return 'Contact details not available';
    }
    // Show first 2 and last 2 alphanumeric characters
    const visible = `${alnum.substring(0, 2)}***${alnum.slice(-2)}`;
    return visible;
  }

  /**
   * Find upcoming carnivals
   * @returns {Promise<Array>} Array of upcoming carnivals
   */
  static async findUpcoming() {
    return await this.findAll({
      where: {
        isActive: true,
        date: {
          [Op.gte]: new Date()
        }
      },
      order: [['date', 'ASC']]
    });
  }

  /**
   * Find carnivals by state
   * @param {string} state - Australian state code
   * @returns {Promise<Array>} Array of carnivals in specified state
   */
  static async findByState(state) {
    return await this.findAll({
      where: {
        isActive: true,
        state: state
      },
      order: [['date', 'ASC']]
    });
  }

  /**
   * Find MySideline imported events
   * @returns {Promise<Array>} Array of MySideline events
   */
  static async findMySidelineEvents() {
    return await this.findAll({
      where: {
        isActive: true,
        isManuallyEntered: false
      },
      order: [['date', 'ASC']]
    });
  }

  /**
   * Take ownership of a MySideline carnival
   * This method handles the business logic for claiming unclaimed MySideline events
   * @param {number} carnivalId - ID of the carnival to claim
   * @param {number} userId - ID of the user claiming ownership
   * @returns {Promise<Object>} Result object with success status and message
   */
  static async takeOwnership(carnivalId, userId) {
    const User = (await import('./User.mjs')).default;
    
    try {
      // Input validation
      if (!carnivalId || !userId) {
        throw new Error('Carnival ID and User ID are required');
      }

      // Find the carnival
      const carnival = await this.findByPk(carnivalId);
      if (!carnival) {
        throw new Error('Carnival not found');
      }

      // Find the user and include their club information
      const user = await User.findByPk(userId, {
        include: [{
          model: (await import('./Club.mjs')).default,
          as: 'club',
          attributes: ['id', 'clubName', 'state', 'isActive']
        }]
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Authorization checks
      if (!user.clubId) {
        throw new Error('You must be associated with a club to claim carnival ownership');
      }

      if (!user.club || !user.club.isActive) {
        throw new Error('Your club must be active to claim carnival ownership');
      }

      // State-based restriction: delegates can only claim events in their club's state or events with no state
      if (carnival.state && user.club.state && carnival.state !== user.club.state) {
        throw new Error(`You can only claim events in your club's state (${user.club.state}) or events with no specific state. This carnival is in ${carnival.state}.`);
      }

      // Business rule checks
      if (carnival.isManuallyEntered) {
        throw new Error('Can only claim ownership of MySideline imported events');
      }

      if (!carnival.lastMySidelineSync) {
        throw new Error('This carnival was not imported from MySideline');
      }

      if (carnival.createdByUserId) {
        throw new Error('This carnival already has an owner');
      }

      // All checks passed - preserve original MySideline contact email before updating
      const originalMySidelineContactEmail = carnival.organiserContactEmail;

      // Update the carnival with user's clubId and contact details (do NOT set createdByUserId)
      const updateData = {
        clubId: user.clubId, // Set clubId on claim
        claimedAt: new Date(),
        updatedAt: new Date(),
        // Preserve original MySideline contact email
        originalMySidelineContactEmail: originalMySidelineContactEmail,
        // Auto-populate contact details with the claiming user's information
        organiserContactName: `${user.firstName} ${user.lastName}`,
        organiserContactEmail: user.email,
        organiserContactPhone: user.phoneNumber || null
      };

      await carnival.update(updateData);

      // Send notification to original MySideline contact if email exists
      if (originalMySidelineContactEmail) {
        try {
          const CarnivalEmailService = (await import('../services/email/CarnivalEmailService.mjs')).default;
          await CarnivalEmailService.sendCarnivalClaimNotification(
            carnival, 
            user, 
            user.club, 
            originalMySidelineContactEmail
          );
          console.log(`📧 Claim notification sent to original organiser: ${originalMySidelineContactEmail}`);
        } catch (emailError) {
          console.warn(`⚠️ Failed to send claim notification email to ${originalMySidelineContactEmail}:`, emailError.message);
          // Don't fail the claiming process if email fails
        }
      }

      // Log the ownership claim for audit purposes
      console.log(`🏆 Carnival ownership claimed: "${carnival.title}" (ID: ${carnivalId}) claimed by user ${userId} (${user.club.clubName})`);

      return {
        success: true,
        message: `You have successfully claimed ownership of "${carnival.title}". You can now manage this carnival and its attendees.`,
        carnival: carnival,
        claimedBy: {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          clubName: user.club.clubName
        }
      };

    } catch (error) {
      console.error(`❌ Failed to claim carnival ownership (ID: ${carnivalId}, User: ${userId}):`, error.message);
      
      return {
        success: false,
        message: error.message || 'An error occurred while claiming carnival ownership'
      };
    }
  }

  /**
   * Release ownership of a carnival
   * This method handles the business logic for unclaiming carnival ownership
   * @param {number} carnivalId - ID of the carnival to release
   * @param {number} userId - ID of the user releasing ownership
   * @returns {Promise<Object>} Result object with success status and message
   */
  static async releaseOwnership(carnivalId, userId) {
    const User = (await import('./User.mjs')).default;
    
    try {
      // Input validation
      if (!carnivalId || !userId) {
        throw new Error('Carnival ID and User ID are required');
      }

      // Find the carnival
      const carnival = await this.findByPk(carnivalId);
      if (!carnival) {
        throw new Error('Carnival not found');
      }

      // Find the user and include their club information
      const user = await User.findByPk(userId, {
        include: [{
          model: (await import('./Club.mjs')).default,
          as: 'club',
          attributes: ['id', 'clubName', 'isActive']
        }]
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Authorization checks
      if (!carnival.createdByUserId) {
        throw new Error('This carnival is not currently owned by anyone');
      }

      if (carnival.createdByUserId !== userId) {
        throw new Error('You can only release ownership of carnivals you own');
      }

      // Business rule checks
      if (!carnival.lastMySidelineSync) {
        throw new Error('Can only release ownership of MySideline imported events');
      }

      // Check if there are registered clubs - warn but allow
      const { CarnivalClub } = await import('./index.mjs');
      const registeredClubs = await CarnivalClub.count({
        where: {
          carnivalId: carnivalId,
          isActive: true
        }
      });

      // Release ownership - revert to MySideline import state
      await carnival.update({
        createdByUserId: null,
        claimedAt: null,
        updatedAt: new Date(),
        // Clear contact details when releasing ownership
        organiserContactName: null,
        organiserContactEmail: null,
        organiserContactPhone: null
      });

      // Log the ownership release for audit purposes
      console.log(`🔓 Carnival ownership released: "${carnival.title}" (ID: ${carnivalId}) released by user ${userId} (${user.club ? user.club.clubName : 'No Club'})`);

      let warningMessage = '';
      if (registeredClubs > 0) {
        warningMessage = ` Note: This carnival has ${registeredClubs} registered club${registeredClubs > 1 ? 's' : ''} - you may want to contact them about the ownership change.`;
      }

      return {
        success: true,
        message: `You have successfully released ownership of "${carnival.title}". The carnival is now available for the correct organizer to claim.${warningMessage}`,
        carnival: carnival,
        releasedBy: {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          clubName: user.club ? user.club.clubName : 'No Club'
        },
        registeredClubsCount: registeredClubs
      };

    } catch (error) {
      console.error(`❌ Failed to release carnival ownership (ID: ${carnivalId}, User: ${userId}):`, error.message);
      
      return {
        success: false,
        message: error.message || 'An error occurred while releasing carnival ownership'
      };
    }
  }

  /**
   * Admin claim ownership of a carnival on behalf of a club
   * This method handles the business logic for admins claiming carnivals for other clubs
   * @param {number} carnivalId - ID of the carnival to claim
   * @param {number} adminUserId - ID of the admin user performing the claim
   * @param {number} targetClubId - ID of the club to claim the carnival for
   * @returns {Promise<Object>} Result object with success status and message
   */
  static async adminClaimOnBehalf(carnivalId, adminUserId, targetClubId) {
    const User = (await import('./User.mjs')).default;
    const Club = (await import('./Club.mjs')).default;
    
    try {
      // Input validation
      if (!carnivalId || !adminUserId || !targetClubId) {
        throw new Error('Carnival ID, Admin User ID, and Target Club ID are required');
      }

      // Find the carnival
      const carnival = await this.findByPk(carnivalId);
      if (!carnival) {
        throw new Error('Carnival not found');
      }

      // Find and validate the admin user
      const adminUser = await User.findByPk(adminUserId, {
        attributes: ['id', 'firstName', 'lastName', 'email', 'isAdmin']
      });

      if (!adminUser) {
        throw new Error('Admin user not found');
      }

      if (!adminUser.isAdmin) {
        throw new Error('Only administrators can claim carnivals on behalf of other clubs');
      }

      // Find and validate the target club
      const targetClub = await Club.findByPk(targetClubId, {
        include: [{
          model: User,
          as: 'delegates',
          where: { 
            isPrimaryDelegate: true,
            isActive: true 
          },
          required: false,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        }],
        attributes: ['id', 'clubName', 'state', 'isActive']
      });

      if (!targetClub) {
        throw new Error('Target club not found');
      }

      if (!targetClub.isActive) {
        throw new Error('Cannot claim carnival for an inactive club');
      }

      // Get the primary delegate for contact details
      const primaryDelegate = targetClub.delegates && targetClub.delegates.length > 0 
        ? targetClub.delegates[0] 
        : null;

      if (!primaryDelegate) {
        throw new Error('Target club must have an active primary delegate to claim carnival');
      }

      // Business rule checks
      if (carnival.isManuallyEntered) {
        throw new Error('Can only claim ownership of MySideline imported events');
      }

      if (!carnival.lastMySidelineSync) {
        throw new Error('This carnival was not imported from MySideline');
      }

      if (carnival.createdByUserId) {
        throw new Error('This carnival already has an owner');
      }

      // State-based validation (optional warning, but allow admin override)
      let stateWarning = '';
      if (carnival.state && targetClub.state && carnival.state !== targetClub.state) {
        stateWarning = ` Note: This carnival is in ${carnival.state} but the club is based in ${targetClub.state}.`;
      }

      // All checks passed - preserve original MySideline contact email before updating
      const originalMySidelineContactEmail = carnival.organiserContactEmail;

      // Update the carnival with primary delegate's contact details
      const updateData = {
        createdByUserId: primaryDelegate.id,
        claimedAt: new Date(),
        updatedAt: new Date(),
        // Preserve original MySideline contact email
        originalMySidelineContactEmail: originalMySidelineContactEmail,
        // Auto-populate contact details with the primary delegate's information
        organiserContactName: `${primaryDelegate.firstName} ${primaryDelegate.lastName}`,
        organiserContactEmail: primaryDelegate.email,
        organiserContactPhone: primaryDelegate.phoneNumber || null
      };

      await carnival.update(updateData);

      // Send notification to original MySideline contact if email exists
      if (originalMySidelineContactEmail) {
        try {
          const CarnivalEmailService = (await import('../services/email/CarnivalEmailService.mjs')).default;
          await CarnivalEmailService.sendCarnivalClaimNotification(
            carnival, 
            primaryDelegate, 
            targetClub, 
            originalMySidelineContactEmail
          );
          console.log(`📧 Admin claim notification sent to original organiser: ${originalMySidelineContactEmail}`);
        } catch (emailError) {
          console.warn(`⚠️ Failed to send admin claim notification email to ${originalMySidelineContactEmail}:`, emailError.message);
          // Don't fail the claiming process if email fails
        }
      }

      // Log the admin claim for audit purposes
      console.log(`🏆 Admin claim: "${carnival.title}" (ID: ${carnivalId}) claimed by admin ${adminUser.email} for club ${targetClub.clubName} (Primary delegate: ${primaryDelegate.email})`);

      return {
        success: true,
        message: `You have successfully claimed ownership of "${carnival.title}" for ${targetClub.clubName}. The primary delegate ${primaryDelegate.firstName} ${primaryDelegate.lastName} will now manage this carnival.${stateWarning}`,
        carnival: carnival,
        claimedBy: {
          adminUserId: adminUser.id,
          adminName: `${adminUser.firstName} ${adminUser.lastName}`,
          targetClubId: targetClub.id,
          targetClubName: targetClub.clubName,
          primaryDelegateId: primaryDelegate.id,
          primaryDelegateName: `${primaryDelegate.firstName} ${primaryDelegate.lastName}`,
          primaryDelegateEmail: primaryDelegate.email
        }
      };

    } catch (error) {
      console.error(`❌ Failed admin claim (Carnival: ${carnivalId}, Admin: ${adminUserId}, Club: ${targetClubId}):`, error.message);
      
      return {
        success: false,
        message: error.message || 'An error occurred while claiming carnival ownership'
      };
    }
  }

  /**
   * Check if this is a multi-day carnival
   * @returns {boolean} Multi-day carnival status
   */
  get isMultiDay() {
    return this.endDate && this.endDate !== this.date;
  }

  /**
   * Get formatted date range string for display
   * @returns {string} Formatted date range
   */
  getDateRangeString() {
    if (!this.date) return 'Date To Be Announced';
    
    const startDate = new Date(this.date);
    const endDate = this.endDate ? new Date(this.endDate) : null;
    
    if (!endDate || startDate.toDateString() === endDate.toDateString()) {
      // Single day carnival
      return startDate.toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    // Multi-day carnival
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();
    
    if (startYear === endYear && startMonth === endMonth) {
      // Same month and year: "18-20 July 2025"
      return `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`;
    } else if (startYear === endYear) {
      // Same year: "28 June - 2 July 2025"
      return `${startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })} - ${endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    } else {
      // Different years: "28 December 2024 - 2 January 2025"
      return `${startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })} - ${endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
  }

  /**
   * Get short formatted date range string for compact display
   * @returns {string} Short formatted date range
   */
  getShortDateRangeString() {
    if (!this.date) return 'Date TBA';
    
    const startDate = new Date(this.date);
    const endDate = this.endDate ? new Date(this.endDate) : null;
    
    if (!endDate || startDate.toDateString() === endDate.toDateString()) {
      // Single day carnival
      return startDate.toLocaleDateString('en-AU', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    // Multi-day carnival
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();
    
    if (startYear === endYear && startMonth === endMonth) {
      // Same month and year: "18-20 Jul"
      return `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleDateString('en-AU', { month: 'short' })}`;
    } else {
      // Different months: "28 Jun - 2 Jul"
      return `${startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
    }
  }
}

/**
 * Initialize Carnival model with comprehensive schema definition
 */
Carnival.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('title', value ? value.trim() : value);
    }
  },
  mySidelineTitle: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Original MySideline title for matching purposes - never changes once set'
  },
  mySidelineId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Unique MySideline carnival identifier (numeric) for reliable duplicate detection'
  },
  mySidelineAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Original MySideline address - immutable, used for duplicate detection'
  },
  mySidelineDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Original MySideline date - immutable, used for duplicate detection'
  },
  date: {
    type: DataTypes.DATE,
    allowNull: true, // Allow null for MySideline imports
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'End date for multi-day carnivals. If null, carnival is a single day carnival.'
  },
  locationAddress: {
    type: DataTypes.TEXT,
    allowNull: true, // Allow null for MySideline imports
    set(value) {
      this.setDataValue('locationAddress', value ? value.trim() : value);
    }
  },
  // MySideline-compatible address fields
  locationLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Latitude coordinate for the carnival location'
  },
  locationLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: 'Longitude coordinate for the carnival location'
  },
  locationSuburb: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Suburb/city name for the carnival location',
    set(value) {
      this.setDataValue('locationSuburb', value ? value.trim() : value);
    }
  },
  locationPostcode: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Postcode for the carnival location',
    set(value) {
      this.setDataValue('locationPostcode', value ? value.trim() : value);
    }
  },
  locationCountry: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Australia',
    comment: 'Country for the carnival location',
    set(value) {
      this.setDataValue('locationCountry', value ? value.trim() : value);
    }
  },
  // MySideline structured address line fields
  locationAddressLine1: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'First line of structured address from MySideline (street address, venue name)',
    set(value) {
      this.setDataValue('locationAddressLine1', value ? value.trim() : value);
    }
  },
  locationAddressLine2: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Second line of structured address from MySideline (additional address info)',
    set(value) {
      this.setDataValue('locationAddressLine2', value ? value.trim() : value);
    }
  },
  venueName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Name of the venue/facility hosting the carnival (from MySideline venue data)',
    set(value) {
      this.setDataValue('venueName', value ? value.trim() : value);
    }
  },
  organiserContactName: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for MySideline imports
    set(value) {
      this.setDataValue('organiserContactName', value ? value.trim() : value);
    }
  },
  organiserContactEmail: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for MySideline imports
    set(value) {
      this.setDataValue('organiserContactEmail', value ? value.toLowerCase().trim() : value);
    }
  },
  organiserContactPhone: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for MySideline imports
    set(value) {
      this.setDataValue('organiserContactPhone', value ? value.trim() : value);
    }
  },
  scheduleDetails: {
    type: DataTypes.TEXT,
    allowNull: true, // Allow null for MySideline imports    
  },
  registrationLink: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('registrationLink', value && value.trim() ? value.trim() : null);
    }
  },
  feesDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  callForVolunteers: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  clubLogoURL: {
    type: DataTypes.STRING,
    allowNull: true
  },
  promotionalImageURL: {
    type: DataTypes.STRING,
    allowNull: true
  },
  additionalImages: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // Social Media Links
  socialMediaFacebook: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('socialMediaFacebook', value && value.trim() ? value.trim() : null);
    }
  },
  socialMediaInstagram: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('socialMediaInstagram', value && value.trim() ? value.trim() : null);
    }
  },
  socialMediaTwitter: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('socialMediaTwitter', value && value.trim() ? value.trim() : null);
    }
  },
  socialMediaWebsite: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      // Convert empty strings to null for cleaner data storage
      this.setDataValue('socialMediaWebsite', value && value.trim() ? value.trim() : null);
    }
  },
  // Enhanced Draw/Document Upload Support
  drawFiles: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // Legacy draw fields for backward compatibility
  drawFileURL: {
    type: DataTypes.STRING,
    allowNull: true
  },
  drawFileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  drawTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  drawDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  clubId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Clubs',
      key: 'id'
    },
    comment: 'The club that is hosting or claimed this carnival'
  },
  isManuallyEntered: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  lastMySidelineSync: {
    type: DataTypes.DATE,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(3),
    allowNull: true // Allow null for MySideline imports
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  claimedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Original MySideline contact email (preserved before claiming)
  originalMySidelineContactEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Original organiser contact email from MySideline import, preserved when carnival is claimed'
  },
  // Enhanced fields for better carnival management
  maxTeams: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  currentRegistrations: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  isRegistrationOpen: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  registrationDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Admin notes (only visible to carnival owner and primary delegates)
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Carnival',
  tableName: 'carnivals',
  timestamps: true,
  indexes: [
    {
      fields: ['date']
    },
    {
      fields: ['state']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['createdByUserId']
    },
    {
      fields: ['isManuallyEntered']
    }
  ],
  hooks: {
    /**
     * Pre-save validation and data consistency
     */
    beforeSave: async (carnival, options) => {
      // Ensure current registrations doesn't exceed max teams
      if (carnival.maxTeams && carnival.currentRegistrations > carnival.maxTeams) {
        carnival.currentRegistrations = carnival.maxTeams;
      }
      
      // Validate end date is after start date for multi-day carnivals
      if (carnival.endDate && carnival.date) {
        const startDate = new Date(carnival.date);
        const endDate = new Date(carnival.endDate);
        
        if (endDate <= startDate) {
          throw new Error('End date must be after the start date for multi-day carnivals');
        }
      }
    }
  }
});


/**
 * Get carnival statistics for optimization decisions
 * @returns {Promise<Object>} Carnival statistics
 */
Carnival.getStatistics = async function() {
  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCarnivals'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN isActive = 1 THEN 1 END')), 'activeCarnivals'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN isManuallyEntered = 1 THEN 1 END')), 'manualCarnivals'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN isManuallyEntered = 0 THEN 1 END')), 'importedCarnivals']
    ],
    raw: true
  });
  return stats[0] || {};
};

export default Carnival;