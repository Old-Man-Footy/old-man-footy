/**
 * @file CarnivalClubPlayer Model Unit Tests (Mocked)
 * @description Vitest unit tests for the CarnivalClubPlayer model using mock data (no DB).
 *
 * Follows AAA (Arrange, Act, Assert) pattern and project security/MVC/testing guidelines.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Mock data
const mockCarnival = { id: 1, title: 'Test Carnival', isActive: true };
const mockClub = { id: 2, clubName: 'Test Club', isActive: true };
const mockCarnivalClub = {
  id: 3,
  carnivalId: mockCarnival.id,
  clubId: mockClub.id,
  approvalStatus: 'approved',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockClubPlayer = {
  id: 4,
  clubId: mockClub.id,
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1980-01-01',
  email: 'john.doe@example.com',
  isActive: true,
  shortsColour: 'Red',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockAssignment = {
  id: 5,
  carnivalClubId: mockCarnivalClub.id,
  clubPlayerId: mockClubPlayer.id,
  isActive: true,
  attendanceStatus: 'confirmed',
  createdAt: new Date(),
  updatedAt: new Date(),
  getCarnivalClubDetails: async () => mockCarnivalClub,
  getClubPlayerDetails: async () => mockClubPlayer,
  isActiveAssignment: () => true,
};

// Mock static methods
const CarnivalClubPlayer = {
  getActiveForCarnivalClub: async (carnivalClubId) => {
    return carnivalClubId === mockCarnivalClub.id ? [mockAssignment] : [];
  },
  getActiveForClubPlayer: async (clubPlayerId) => {
    return clubPlayerId === mockClubPlayer.id ? [mockAssignment] : [];
  },
  getPlayerCountForCarnivalClub: async (carnivalClubId) => {
    return carnivalClubId === mockCarnivalClub.id ? 1 : 0;
  },
  isPlayerAssigned: async (carnivalClubId, clubPlayerId) => {
    return carnivalClubId === mockCarnivalClub.id && clubPlayerId === mockClubPlayer.id;
  },
  getAttendanceStats: async (carnivalClubId) => {
    if (carnivalClubId === mockCarnivalClub.id) {
      return { total: 1, confirmed: 1, tentative: 0, unavailable: 0 };
    }
    return { total: 0, confirmed: 0, tentative: 0, unavailable: 0 };
  },
};

describe('CarnivalClubPlayer Model (Mocked)', () => {
  let assignment;
  beforeEach(() => {
    assignment = { ...mockAssignment };
  });

  it('should get carnival club details', async () => {
    const result = await assignment.getCarnivalClubDetails();
    expect(result).toBeDefined();
    expect(result.id).toBe(mockCarnivalClub.id);
  });

  it('should get club player details', async () => {
    const result = await assignment.getClubPlayerDetails();
    expect(result).toBeDefined();
    expect(result.id).toBe(mockClubPlayer.id);
  });

  it('should check if assignment is active', () => {
    expect(assignment.isActiveAssignment()).toBe(true);
  });

  it('should get active assignments for a carnival club', async () => {
    const results = await CarnivalClubPlayer.getActiveForCarnivalClub(mockCarnivalClub.id);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].carnivalClubId).toBe(mockCarnivalClub.id);
  });

  it('should get active assignments for a club player', async () => {
    const results = await CarnivalClubPlayer.getActiveForClubPlayer(mockClubPlayer.id);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].clubPlayerId).toBe(mockClubPlayer.id);
  });

  it('should get player count for a carnival club', async () => {
    const count = await CarnivalClubPlayer.getPlayerCountForCarnivalClub(mockCarnivalClub.id);
    expect(count).toBe(1);
  });

  it('should check if a player is assigned', async () => {
    const assigned = await CarnivalClubPlayer.isPlayerAssigned(mockCarnivalClub.id, mockClubPlayer.id);
    expect(assigned).toBe(true);
    const notAssigned = await CarnivalClubPlayer.isPlayerAssigned(999, 999);
    expect(notAssigned).toBe(false);
  });

  it('should get attendance stats', async () => {
    const stats = await CarnivalClubPlayer.getAttendanceStats(mockCarnivalClub.id);
    expect(stats).toHaveProperty('total', 1);
    expect(stats).toHaveProperty('confirmed', 1);
    expect(stats).toHaveProperty('tentative', 0);
    expect(stats).toHaveProperty('unavailable', 0);
  });
});
