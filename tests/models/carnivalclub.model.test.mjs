/**
 * Vitest unit tests for CarnivalClub model (Mocked)
 * Uses in-memory mock data and methods. No database.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// In-memory stores
let carnivalStore;
let clubStore;
let carnivalClubStore;

function createMockCarnival(data) {
  const carnival = { ...data, id: carnivalStore.length + 1, isActive: true };
  carnivalStore.push(carnival);
  return carnival;
}
function createMockClub(data) {
  const club = { ...data, id: clubStore.length + 1, isActive: true };
  clubStore.push(club);
  return club;
}
function createMockCarnivalClub(data) {
  const carnivalClub = {
    ...data,
    id: carnivalClubStore.length + 1,
    isActive: data.isActive !== undefined ? data.isActive : true,
    approvalStatus: data.approvalStatus || 'pending',
    numberOfTeams: data.numberOfTeams || 1, // Default to 1 team if not specified
    getCarnivalDetails: async function() {
      return carnivalStore.find(c => c.id === this.carnivalId);
    },
    getClubDetails: async function() {
      return clubStore.find(c => c.id === this.clubId);
    },
    isActiveRelationship: function() {
      return !!this.isActive;
    },
    isApproved: function() {
      return this.approvalStatus === 'approved';
    },
    isPending: function() {
      return this.approvalStatus === 'pending';
    },
    isRejected: function() {
      return this.approvalStatus === 'rejected';
    }
  };
  carnivalClubStore.push(carnivalClub);
  return carnivalClub;
}
const CarnivalClub = {
  create: async data => createMockCarnivalClub(data),
  getActiveForCarnival: async carnivalId =>
    carnivalClubStore.filter(cc => cc.carnivalId === carnivalId && cc.isActive),
  getActiveForClub: async clubId =>
    carnivalClubStore.filter(cc => cc.clubId === clubId && cc.isActive),
  isClubRegistered: async (carnivalId, clubId) =>
    carnivalClubStore.some(cc => cc.carnivalId === carnivalId && cc.clubId === clubId && cc.isActive),
  getAttendanceCount: async carnivalId =>
    carnivalClubStore.filter(cc => cc.carnivalId === carnivalId && cc.isActive).length,
  getAttendanceCountWithStatus: async carnivalId => {
    const filtered = carnivalClubStore.filter(cc => cc.carnivalId === carnivalId && cc.isActive);
    const counts = { approved: 0, pending: 0, rejected: 0, total: filtered.length };
    for (const cc of filtered) {
      if (cc.approvalStatus === 'approved') counts.approved++;
      if (cc.approvalStatus === 'pending') counts.pending++;
      if (cc.approvalStatus === 'rejected') counts.rejected++;
    }
    return counts;
  },
  // New method to get team count (sum of numberOfTeams for approved registrations)
  getApprovedTeamsCount: async carnivalId => {
    const approvedRegistrations = carnivalClubStore.filter(cc => 
      cc.carnivalId === carnivalId && cc.isActive && cc.approvalStatus === 'approved'
    );
    return approvedRegistrations.reduce((total, cc) => total + (cc.numberOfTeams || 1), 0);
  },
  // Method to update carnival's currentRegistrations based on team count
  updateCarnivalRegistrationCount: async carnivalId => {
    const teamCount = await CarnivalClub.getApprovedTeamsCount(carnivalId);
    const carnival = carnivalStore.find(c => c.id === carnivalId);
    if (carnival) {
      carnival.currentRegistrations = teamCount;
    }
    return teamCount;
  }
};

describe('CarnivalClub Model (Mocked)', () => {
  describe('Instance methods', () => {
    let carnival, club, carnivalClub;
    beforeEach(() => {
      carnivalStore = [];
      clubStore = [];
      carnivalClubStore = [];
      carnival = createMockCarnival({ title: 'Test Carnival' });
      club = createMockClub({ clubName: 'Test Club' });
      carnivalClub = createMockCarnivalClub({
        carnivalId: carnival.id,
        clubId: club.id,
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should get carnival details', async () => {
      const result = await carnivalClub.getCarnivalDetails();
      expect(result).toBeDefined();
      expect(result.id).toBe(carnival.id);
    });

    it('should get club details', async () => {
      const result = await carnivalClub.getClubDetails();
      expect(result).toBeDefined();
      expect(result.id).toBe(club.id);
    });

    it('should check if relationship is active', () => {
      expect(carnivalClub.isActiveRelationship()).toBe(true);
    });

    it('should check if registration is approved', () => {
      expect(carnivalClub.isApproved()).toBe(true);
      expect(carnivalClub.isPending()).toBe(false);
      expect(carnivalClub.isRejected()).toBe(false);
    });
  });

  describe('Static methods', () => {
    let carnival, club;
    beforeEach(() => {
      carnivalStore = [];
      clubStore = [];
      carnivalClubStore = [];
      carnival = createMockCarnival({ title: 'Static Carnival' });
      club = createMockClub({ clubName: 'Static Club' });
      createMockCarnivalClub({
        carnivalId: carnival.id,
        clubId: club.id,
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should get active relationships for a carnival', async () => {
      const results = await CarnivalClub.getActiveForCarnival(carnival.id);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].carnivalId).toBe(carnival.id);
    });

    it('should get active relationships for a club', async () => {
      const results = await CarnivalClub.getActiveForClub(club.id);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].clubId).toBe(club.id);
    });

    it('should check if a club is registered for a carnival', async () => {
      const isRegistered = await CarnivalClub.isClubRegistered(carnival.id, club.id);
      expect(isRegistered).toBe(true);
      const isNotRegistered = await CarnivalClub.isClubRegistered(999, 999);
      expect(isNotRegistered).toBe(false);
    });

    it('should get attendance count for a carnival', async () => {
      const count = await CarnivalClub.getAttendanceCount(carnival.id);
      expect(count).toBe(1);
    });

    it('should get attendance count with status', async () => {
      const counts = await CarnivalClub.getAttendanceCountWithStatus(carnival.id);
      expect(counts).toHaveProperty('approved', 1);
      expect(counts).toHaveProperty('pending', 0);
      expect(counts).toHaveProperty('total', 1);
    });

    it('should calculate approved teams count based on numberOfTeams', async () => {
      // Add additional registrations with different numberOfTeams
      createMockCarnivalClub({
        carnivalId: carnival.id,
        clubId: club.id + 1,
        approvalStatus: 'approved',
        numberOfTeams: 2,
        isActive: true
      });
      
      createMockCarnivalClub({
        carnivalId: carnival.id,
        clubId: club.id + 2,
        approvalStatus: 'pending', // Should not be counted
        numberOfTeams: 3,
        isActive: true
      });

      const teamCount = await CarnivalClub.getApprovedTeamsCount(carnival.id);
      expect(teamCount).toBe(3); // 1 (first club) + 2 (second club), pending not counted
    });

    it('should update carnival registration count with team count', async () => {
      // Create multiple registrations with different team counts
      createMockCarnivalClub({
        carnivalId: carnival.id,
        clubId: club.id + 1,
        approvalStatus: 'approved',
        numberOfTeams: 3,
        isActive: true
      });

      const teamCount = await CarnivalClub.updateCarnivalRegistrationCount(carnival.id);
      expect(teamCount).toBe(4); // 1 + 3 teams

      // Verify the carnival's currentRegistrations was updated
      const updatedCarnival = carnivalStore.find(c => c.id === carnival.id);
      expect(updatedCarnival.currentRegistrations).toBe(4);
    });

    it('should only count approved registrations for team count', async () => {
      // Add registrations with different statuses
      createMockCarnivalClub({
        carnivalId: carnival.id,
        clubId: club.id + 1,
        approvalStatus: 'approved',
        numberOfTeams: 2,
        isActive: true
      });
      
      createMockCarnivalClub({
        carnivalId: carnival.id,
        clubId: club.id + 2,
        approvalStatus: 'rejected',
        numberOfTeams: 5,
        isActive: true
      });

      createMockCarnivalClub({
        carnivalId: carnival.id,
        clubId: club.id + 3,
        approvalStatus: 'pending',
        numberOfTeams: 1,
        isActive: true
      });

      const teamCount = await CarnivalClub.getApprovedTeamsCount(carnival.id);
      expect(teamCount).toBe(3); // Only approved: 1 (original) + 2 (new approved)
    });

    it('should handle registrations without numberOfTeams field', async () => {
      // Create a registration without numberOfTeams (should default to 1)
      createMockCarnivalClub({
        carnivalId: carnival.id,
        clubId: club.id + 1,
        approvalStatus: 'approved',
        // numberOfTeams not specified
        isActive: true
      });

      const teamCount = await CarnivalClub.getApprovedTeamsCount(carnival.id);
      expect(teamCount).toBe(2); // 1 (original) + 1 (default for new registration)
    });
  });
});
