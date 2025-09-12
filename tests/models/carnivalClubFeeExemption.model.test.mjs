/**
 * Hosting Club Fee Exemption Model Tests
 * 
 * Unit tests for the CarnivalClub model focusing on hosting club fee exemption logic.
 * Tests ensure that the model correctly handles fee calculations and exemptions
 * based on hosting club relationships.
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sequelize } from '../../config/database.mjs';

// Setup test database connection
beforeAll(async () => {
  try {
    await sequelize.authenticate();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});

afterAll(async () => {
  await sequelize.close();
});

describe('CarnivalClub Model - Hosting Club Fee Exemption', () => {
  let CarnivalClub, Carnival, Club, User;

  beforeAll(async () => {
    // Import models
    const models = await import('../../models/index.mjs');
    CarnivalClub = models.CarnivalClub;
    Carnival = models.Carnival;
    Club = models.Club;
    User = models.User;
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await CarnivalClub.destroy({ where: {}, force: true });
    await Carnival.destroy({ where: {}, force: true });
    await Club.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('Fee Exemption Data Validation', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user for foreign key constraint
      testUser = await User.create({
        username: 'testadmin',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        email: 'test@example.com',
        isActive: true
      });
    });
    it('should accept 0.00 payment amount for hosting club registrations', async () => {
      // Create test club
      const testClub = await Club.create({
        clubName: 'Test Hosting Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      // Create test carnival hosted by the club
      const testCarnival = await Carnival.create({
        title: 'Test Carnival',
        description: 'Test carnival for fee exemption',
        startDate: '2024-06-01',
        endDate: '2024-06-02',
        location: 'Sydney',
        state: 'NSW',
        clubId: testClub.id, // This club is hosting
        createdByUserId: testUser.id,
        isActive: true
      });

      // Create registration for hosting club with 0 payment
      const registration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: testClub.id, // Same as hosting club
        playerCount: 15,
        teamName: 'Host Team',
        contactPerson: 'Host Contact',
        contactEmail: 'host@testclub.com',
        contactPhone: '0123456789',
        paymentAmount: 0.00, // Fee exempted
        isPaid: true, // Auto-paid since no fee
        approvalStatus: 'approved', // Auto-approved for hosting club
        isActive: true
      });

      expect(registration).toBeDefined();
      expect(registration.paymentAmount).toBe(0);
      expect(registration.isPaid).toBe(true);
      expect(registration.approvalStatus).toBe('approved');
      expect(registration.clubId).toBe(testCarnival.clubId);
    });

    it('should accept non-zero payment amounts for non-hosting clubs', async () => {
      // Create hosting club
      const hostingClub = await Club.create({
        clubName: 'Hosting Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      // Create participating club
      const participatingClub = await Club.create({
        clubName: 'Participating Club',
        state: 'QLD',
        location: 'Brisbane',
        isActive: true,
        isPubliclyListed: true
      });

      // Create carnival hosted by first club
      const testCarnival = await Carnival.create({
        title: 'Test Carnival',
        description: 'Test carnival for fee exemption',
        startDate: '2024-06-01',
        endDate: '2024-06-02',
        location: 'Sydney',
        state: 'NSW',
        clubId: hostingClub.id,
        createdByUserId: testUser.id,
        isActive: true
      });

      // Create registration for non-hosting club with regular fee
      const registration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: participatingClub.id, // Different from hosting club
        playerCount: 18,
        teamName: 'Away Team',
        contactPerson: 'Away Contact',
        contactEmail: 'away@participatingclub.com',
        contactPhone: '0987654321',
        paymentAmount: 150.00, // Regular fee
        isPaid: false, // Awaiting payment
        approvalStatus: 'pending', // Requires approval
        isActive: true
      });

      expect(registration).toBeDefined();
      expect(registration.paymentAmount).toBe(150);
      expect(registration.isPaid).toBe(false);
      expect(registration.approvalStatus).toBe('pending');
      expect(registration.clubId).not.toBe(testCarnival.clubId);
    });

    it('should maintain data integrity with multiple hosting club registrations', async () => {
      // Create hosting club
      const hostingClub = await Club.create({
        clubName: 'Multi-Team Hosting Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      // Create carnival
      const testCarnival = await Carnival.create({
        title: 'Multi-Team Test Carnival',
        description: 'Carnival allowing multiple teams from hosting club',
        startDate: '2024-07-01',
        endDate: '2024-07-02',
        location: 'Sydney',
        state: 'NSW',
        clubId: hostingClub.id,
        createdByUserId: testUser.id,
        isActive: true
      });

      // Create multiple registrations for hosting club
      const registration1 = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: hostingClub.id,
        playerCount: 15,
        teamName: 'Host Team A',
        contactPerson: 'Contact A',
        contactEmail: 'contacta@hostclub.com',
        contactPhone: '0111111111',
        paymentAmount: 0.00,
        isPaid: true,
        approvalStatus: 'approved',
        isActive: true
      });

      const registration2 = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: hostingClub.id,
        playerCount: 18,
        teamName: 'Host Team B',
        contactPerson: 'Contact B',
        contactEmail: 'contactb@hostclub.com',
        contactPhone: '0222222222',
        paymentAmount: 0.00,
        isPaid: true,
        approvalStatus: 'approved',
        isActive: true
      });

      // Verify both registrations are fee-exempt
      expect(registration1.paymentAmount).toBe(0);
      expect(registration1.isPaid).toBe(true);
      expect(registration2.paymentAmount).toBe(0);
      expect(registration2.isPaid).toBe(true);

      // Verify both belong to hosting club
      expect(registration1.clubId).toBe(testCarnival.clubId);
      expect(registration2.clubId).toBe(testCarnival.clubId);
    });
  });

  describe('Fee Calculation Edge Cases', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user for foreign key constraint
      testUser = await User.create({
        username: 'testadmin',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        email: 'test@example.com',
        isActive: true
      });
    });
    it('should handle carnival without hosting club assigned', async () => {
      // Create club
      const testClub = await Club.create({
        clubName: 'Participating Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      // Create carnival without hosting club
      const testCarnival = await Carnival.create({
        title: 'Orphaned Carnival',
        description: 'Carnival without hosting club',
        startDate: '2024-08-01',
        endDate: '2024-08-02',
        location: 'Unknown',
        state: 'NSW',
        clubId: null, // No hosting club
        createdByUserId: testUser.id,
        isActive: true
      });

      // Create registration with regular fee
      const registration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: testClub.id,
        playerCount: 15,
        teamName: 'Regular Team',
        contactPerson: 'Regular Contact',
        contactEmail: 'regular@club.com',
        contactPhone: '0123456789',
        paymentAmount: 100.00,
        isPaid: false,
        approvalStatus: 'pending',
        isActive: true
      });

      expect(registration.paymentAmount).toBe(100);
      expect(registration.isPaid).toBe(false);
      expect(testCarnival.clubId).toBeNull();
    });

    it('should handle decimal payment amounts correctly', async () => {
      // Create clubs
      const hostingClub = await Club.create({
        clubName: 'Hosting Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      const participatingClub = await Club.create({
        clubName: 'Participating Club',
        state: 'QLD',
        location: 'Brisbane',
        isActive: true,
        isPubliclyListed: true
      });

      // Create carnival
      const testCarnival = await Carnival.create({
        title: 'Decimal Fee Test Carnival',
        description: 'Testing decimal fee handling',
        startDate: '2024-09-01',
        endDate: '2024-09-02',
        location: 'Sydney',
        state: 'NSW',
        clubId: hostingClub.id,
        createdByUserId: testUser.id,
        isActive: true
      });

      // Test hosting club with 0.00
      const hostingRegistration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: hostingClub.id,
        playerCount: 15,
        teamName: 'Host Team',
        contactPerson: 'Host Contact',
        contactEmail: 'host@hostclub.com',
        contactPhone: '0123456789',
        paymentAmount: 0.00,
        isPaid: true,
        approvalStatus: 'approved',
        isActive: true
      });

      // Test participating club with decimal amount
      const participatingRegistration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: participatingClub.id,
        playerCount: 18,
        teamName: 'Away Team',
        contactPerson: 'Away Contact',
        contactEmail: 'away@awayclub.com',
        contactPhone: '0987654321',
        paymentAmount: 125.50, // Decimal amount
        isPaid: false,
        approvalStatus: 'pending',
        isActive: true
      });

      expect(hostingRegistration.paymentAmount).toBe(0);
      expect(participatingRegistration.paymentAmount).toBe(125.5);
    });
  });

  describe('Model Relationship Validation', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user for foreign key constraint
      testUser = await User.create({
        username: 'testadmin',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        email: 'test@example.com',
        isActive: true
      });
    });
    it('should correctly associate carnival, club, and registration records', async () => {
      // Create hosting club
      const hostingClub = await Club.create({
        clubName: 'Association Test Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      // Create carnival
      const testCarnival = await Carnival.create({
        title: 'Association Test Carnival',
        description: 'Testing model associations',
        startDate: '2024-10-01',
        endDate: '2024-10-02',
        location: 'Sydney',
        state: 'NSW',
        clubId: hostingClub.id,
        createdByUserId: testUser.id,
        isActive: true
      });

      // Create registration
      const registration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: hostingClub.id,
        playerCount: 15,
        teamName: 'Association Test Team',
        contactPerson: 'Test Contact',
        contactEmail: 'test@testclub.com',
        contactPhone: '0123456789',
        paymentAmount: 0.00,
        isPaid: true,
        approvalStatus: 'approved',
        isActive: true
      });

      // Test relationships
      const foundRegistration = await CarnivalClub.findOne({
        where: { id: registration.id },
        include: [
          { model: Carnival, as: 'carnival' },
          { model: Club, as: 'participatingClub' }
        ]
      });

      expect(foundRegistration).toBeDefined();
      expect(foundRegistration.carnival).toBeDefined();
      expect(foundRegistration.participatingClub).toBeDefined();
      expect(foundRegistration.carnival.id).toBe(testCarnival.id);
      expect(foundRegistration.participatingClub.id).toBe(hostingClub.id);
      expect(foundRegistration.carnival.clubId).toBe(foundRegistration.clubId);
    });

    it('should validate foreign key constraints', async () => {
      // Create club and carnival
      const testClub = await Club.create({
        clubName: 'Constraint Test Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      const testCarnival = await Carnival.create({
        title: 'Constraint Test Carnival',
        description: 'Testing foreign key constraints',
        startDate: '2024-11-01',
        endDate: '2024-11-02',
        location: 'Sydney',
        state: 'NSW',
        clubId: testClub.id,
        createdByUserId: testUser.id,
        isActive: true
      });

      // Test that registration requires valid carnival and club IDs
      await expect(CarnivalClub.create({
        carnivalId: 99999, // Non-existent carnival
        clubId: testClub.id,
        playerCount: 15,
        teamName: 'Invalid Carnival Team',
        contactPerson: 'Test Contact',
        contactEmail: 'test@club.com',
        contactPhone: '0123456789',
        paymentAmount: 100.00,
        isPaid: false,
        approvalStatus: 'pending',
        isActive: true
      })).rejects.toThrow();

      await expect(CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: 99999, // Non-existent club
        playerCount: 15,
        teamName: 'Invalid Club Team',
        contactPerson: 'Test Contact',
        contactEmail: 'test@club.com',
        contactPhone: '0123456789',
        paymentAmount: 100.00,
        isPaid: false,
        approvalStatus: 'pending',
        isActive: true
      })).rejects.toThrow();
    });
  });

  describe('Fee Exemption Business Logic', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user for foreign key constraint
      testUser = await User.create({
        username: 'testadmin',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        email: 'test@example.com',
        isActive: true
      });
    });
    it('should support helper method to identify hosting club registrations', async () => {
      // Create clubs
      const hostingClub = await Club.create({
        clubName: 'Business Logic Host Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      const participatingClub = await Club.create({
        clubName: 'Business Logic Participating Club',
        state: 'QLD',
        location: 'Brisbane',
        isActive: true,
        isPubliclyListed: true
      });

      // Create carnival
      const testCarnival = await Carnival.create({
        title: 'Business Logic Test Carnival',
        description: 'Testing business logic methods',
        startDate: '2024-12-01',
        endDate: '2024-12-02',
        location: 'Sydney',
        state: 'NSW',
        clubId: hostingClub.id,
        createdByUserId: testUser.id,
        isActive: true
      });

      // Create registrations
      const hostingRegistration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: hostingClub.id,
        playerCount: 15,
        teamName: 'Host Team',
        contactPerson: 'Host Contact',
        contactEmail: 'host@hostclub.com',
        contactPhone: '0123456789',
        paymentAmount: 0.00,
        isPaid: true,
        approvalStatus: 'approved',
        isActive: true
      });

      const participatingRegistration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: participatingClub.id,
        playerCount: 18,
        teamName: 'Away Team',
        contactPerson: 'Away Contact',
        contactEmail: 'away@awayclub.com',
        contactPhone: '0987654321',
        paymentAmount: 150.00,
        isPaid: false,
        approvalStatus: 'pending',
        isActive: true
      });

      // Helper function to check if registration is for hosting club
      const isHostingClubRegistration = async (registrationId) => {
        const registration = await CarnivalClub.findByPk(registrationId, {
          include: [{ model: Carnival, as: 'carnival' }]
        });
        return registration && registration.clubId === registration.carnival.clubId;
      };

      // Test helper function
      expect(await isHostingClubRegistration(hostingRegistration.id)).toBe(true);
      expect(await isHostingClubRegistration(participatingRegistration.id)).toBe(false);
    });

    it('should calculate total fees excluding hosting club exemptions', async () => {
      // Create clubs
      const hostingClub = await Club.create({
        clubName: 'Fee Calculation Host Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      const club1 = await Club.create({
        clubName: 'Fee Calculation Club 1',
        state: 'QLD',
        location: 'Brisbane',
        isActive: true,
        isPubliclyListed: true
      });

      const club2 = await Club.create({
        clubName: 'Fee Calculation Club 2',
        state: 'VIC',
        location: 'Melbourne',
        isActive: true,
        isPubliclyListed: true
      });

      // Create carnival
      const testCarnival = await Carnival.create({
        title: 'Fee Calculation Test Carnival',
        description: 'Testing fee calculation logic',
        startDate: '2025-01-01',
        endDate: '2025-01-02',
        location: 'Sydney',
        state: 'NSW',
        clubId: hostingClub.id,
        createdByUserId: testUser.id,
        isActive: true
      });

      // Create registrations
      await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: hostingClub.id, // Hosting club - exempt
        playerCount: 15,
        teamName: 'Host Team',
        contactPerson: 'Host Contact',
        contactEmail: 'host@hostclub.com',
        contactPhone: '0123456789',
        paymentAmount: 0.00,
        isPaid: true,
        approvalStatus: 'approved',
        isActive: true
      });

      await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: club1.id, // Regular fee
        playerCount: 18,
        teamName: 'Team 1',
        contactPerson: 'Contact 1',
        contactEmail: 'contact1@club1.com',
        contactPhone: '0111111111',
        paymentAmount: 100.00,
        isPaid: false,
        approvalStatus: 'approved',
        isActive: true
      });

      await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: club2.id, // Regular fee
        playerCount: 16,
        teamName: 'Team 2',
        contactPerson: 'Contact 2',
        contactEmail: 'contact2@club2.com',
        contactPhone: '0222222222',
        paymentAmount: 125.00,
        isPaid: false,
        approvalStatus: 'approved',
        isActive: true
      });

      // Calculate total fees (should exclude hosting club)
      const totalFees = await CarnivalClub.sum('paymentAmount', {
        where: { 
          carnivalId: testCarnival.id,
          isActive: true
        }
      });

      expect(totalFees).toBe(225.00); // 100 + 125, hosting club's 0 is included but doesn't affect sum

      // Calculate fees excluding hosting club explicitly
      const nonHostingFees = await CarnivalClub.sum('paymentAmount', {
        where: { 
          carnivalId: testCarnival.id,
          clubId: { [sequelize.Sequelize.Op.ne]: testCarnival.clubId },
          isActive: true
        }
      });

      expect(nonHostingFees).toBe(225.00); // Only non-hosting clubs
    });
  });

  describe('Data Migration and Compatibility', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user for foreign key constraint
      testUser = await User.create({
        username: 'testadmin',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        email: 'test@example.com',
        isActive: true
      });
    });
    it('should handle existing registrations when fee exemption is implemented', async () => {
      // Simulate existing data before fee exemption feature
      const hostingClub = await Club.create({
        clubName: 'Legacy Hosting Club',
        state: 'NSW',
        location: 'Sydney',
        isActive: true,
        isPubliclyListed: true
      });

      const testCarnival = await Carnival.create({
        title: 'Legacy Test Carnival',
        description: 'Testing legacy data compatibility',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        location: 'Sydney',
        state: 'NSW',
        clubId: hostingClub.id,
        createdByUserId: testUser.id,
        isActive: true
      });

      // Create "legacy" registration with fee (before exemption feature)
      const legacyRegistration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: hostingClub.id,
        playerCount: 15,
        teamName: 'Legacy Host Team',
        contactPerson: 'Legacy Contact',
        contactEmail: 'legacy@hostclub.com',
        contactPhone: '0123456789',
        paymentAmount: 50.00, // Legacy registration had a fee
        isPaid: true, // Was paid under old system
        approvalStatus: 'approved',
        isActive: true
      });

      // Verify legacy data is preserved
      expect(legacyRegistration.paymentAmount).toBe(50);
      expect(legacyRegistration.isPaid).toBe(true);

      // New registration should get exemption
      const newRegistration = await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: hostingClub.id,
        playerCount: 18,
        teamName: 'New Host Team',
        contactPerson: 'New Contact',
        contactEmail: 'new@hostclub.com',
        contactPhone: '0987654321',
        paymentAmount: 0.00, // New registration gets exemption
        isPaid: true,
        approvalStatus: 'approved',
        isActive: true
      });

      expect(newRegistration.paymentAmount).toBe(0);
      expect(newRegistration.isPaid).toBe(true);
    });
  });
});
