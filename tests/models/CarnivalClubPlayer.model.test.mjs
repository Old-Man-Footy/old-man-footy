// Vitest unit tests for CarnivalClubPlayer model
import { describe, it, expect, beforeEach } from 'vitest';
import CarnivalClubPlayer from '/models/CarnivalClubPlayer.mjs';
import CarnivalClub from '/models/CarnivalClub.mjs';
import ClubPlayer from '/models/ClubPlayer.mjs';
import Carnival from '/models/Carnival.mjs';
import Club from '/models/Club.mjs';

describe('CarnivalClubPlayer Model', () => {
  let carnival, club, carnivalClub, clubPlayer, assignment;
  beforeEach(async () => {
    carnival = await Carnival.create({ title: 'Test Carnival', isActive: true });
    club = await Club.create({ clubName: 'Test Club', isActive: true });
    carnivalClub = await CarnivalClub.create({
      carnivalId: carnival.id,
      clubId: club.id,
      approvalStatus: 'approved',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    clubPlayer = await ClubPlayer.create({
      clubId: club.id,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1980-01-01',
      email: 'john.doe@example.com',
      isActive: true,
      shortsColour: 'Red',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assignment = await CarnivalClubPlayer.create({
      carnivalClubId: carnivalClub.id,
      clubPlayerId: clubPlayer.id,
      isActive: true,
      attendanceStatus: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should get carnival club details', async () => {
    const result = await assignment.getCarnivalClubDetails();
    expect(result).toBeDefined();
    expect(result.id).toBe(carnivalClub.id);
  });

  it('should get club player details', async () => {
    const result = await assignment.getClubPlayerDetails();
    expect(result).toBeDefined();
    expect(result.id).toBe(clubPlayer.id);
  });

  it('should check if assignment is active', () => {
    expect(assignment.isActiveAssignment()).toBe(true);
  });

  it('should get active assignments for a carnival club', async () => {
    const results = await CarnivalClubPlayer.getActiveForCarnivalClub(carnivalClub.id);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].carnivalClubId).toBe(carnivalClub.id);
  });

  it('should get active assignments for a club player', async () => {
    const results = await CarnivalClubPlayer.getActiveForClubPlayer(clubPlayer.id);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].clubPlayerId).toBe(clubPlayer.id);
  });

  it('should get player count for a carnival club', async () => {
    const count = await CarnivalClubPlayer.getPlayerCountForCarnivalClub(carnivalClub.id);
    expect(count).toBe(1);
  });

  it('should check if a player is assigned', async () => {
    const assigned = await CarnivalClubPlayer.isPlayerAssigned(carnivalClub.id, clubPlayer.id);
    expect(assigned).toBe(true);
    const notAssigned = await CarnivalClubPlayer.isPlayerAssigned(999, 999);
    expect(notAssigned).toBe(false);
  });

  it('should get attendance stats', async () => {
    const stats = await CarnivalClubPlayer.getAttendanceStats(carnivalClub.id);
    expect(stats).toHaveProperty('total', 1);
    expect(stats).toHaveProperty('confirmed', 1);
    expect(stats).toHaveProperty('tentative', 0);
    expect(stats).toHaveProperty('unavailable', 0);
  });
});
