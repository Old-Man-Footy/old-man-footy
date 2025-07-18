// Vitest unit tests for CarnivalSponsor model
import { describe, test, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CarnivalSponsor from '../../models/CarnivalSponsor.mjs';
import Carnival from '../../models/Carnival.mjs';
import Sponsor from '../../models/Sponsor.mjs';
import { SPONSORSHIP_LEVELS } from '../../config/constants.mjs';

describe('CarnivalSponsor Model', () => {
  let carnival, sponsor, carnivalSponsor;
  beforeEach(async () => {
    carnival = await Carnival.create({ title: 'Test Carnival', isActive: true });
    sponsor = await Sponsor.create({ sponsorName: 'Test Sponsor', businessName: 'Test Sponsor Pty Ltd', isActive: true });
    carnivalSponsor = await CarnivalSponsor.create({
      carnivalId: carnival.id,
      sponsorId: sponsor.id,
      sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should get sponsor details', async () => {
    const result = await carnivalSponsor.getSponsorDetails();
    expect(result).toBeDefined();
    expect(result.id).toBe(sponsor.id);
  });

  it('should get carnival details', async () => {
    const result = await carnivalSponsor.getCarnivalDetails();
    expect(result).toBeDefined();
    expect(result.id).toBe(carnival.id);
  });

  it('should check if relationship is active', () => {
    expect(carnivalSponsor.isActiveRelationship()).toBe(true);
  });

  it('should get active relationships for a carnival', async () => {
    const results = await CarnivalSponsor.getActiveForCarnival(carnival.id);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].carnivalId).toBe(carnival.id);
  });

  it('should get active relationships for a sponsor', async () => {
    const results = await CarnivalSponsor.getActiveForSponsor(sponsor.id);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].sponsorId).toBe(sponsor.id);
  });

  it('should get sponsorship summary for a carnival', async () => {
    const summary = await CarnivalSponsor.getSponsorshipSummary(carnival.id);
    expect(summary).toHaveProperty('totalSponsors', 1);
    expect(summary).toHaveProperty('totalValue');
    expect(summary.byLevel).toHaveProperty(SPONSORSHIP_LEVELS.GOLD, 1);
  });
});
