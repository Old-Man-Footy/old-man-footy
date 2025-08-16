/**
 * Vitest unit tests for CarnivalSponsor model (Mocked)
 * Uses in-memory mock data and methods. No database.
 */
import { describe, it, expect, beforeEach } from 'vitest';

const SPONSORSHIP_LEVELS = { GOLD: 'Gold', SILVER: 'Silver', BRONZE: 'Bronze' };

// In-memory stores
let carnivalStore;
let sponsorStore;
let carnivalSponsorStore;

function createMockCarnival(data) {
  const carnival = { ...data, id: carnivalStore.length + 1, isActive: true };
  carnivalStore.push(carnival);
  return carnival;
}
function createMockSponsor(data) {
  const sponsor = { ...data, id: sponsorStore.length + 1, isActive: true };
  sponsorStore.push(sponsor);
  return sponsor;
}
function createMockCarnivalSponsor(data) {
  const carnivalSponsor = {
    ...data,
    id: carnivalSponsorStore.length + 1,
    isActive: data.isActive !== undefined ? data.isActive : true,
    getSponsorDetails: async function() {
      return sponsorStore.find(s => s.id === this.sponsorId);
    },
    getCarnivalDetails: async function() {
      return carnivalStore.find(c => c.id === this.carnivalId);
    },
    isActiveRelationship: function() {
      return !!this.isActive;
    }
  };
  carnivalSponsorStore.push(carnivalSponsor);
  return carnivalSponsor;
}
const CarnivalSponsor = {
  create: async data => createMockCarnivalSponsor(data),
  getActiveForCarnival: async carnivalId =>
    carnivalSponsorStore.filter(cs => cs.carnivalId === carnivalId && cs.isActive),
  getActiveForSponsor: async sponsorId =>
    carnivalSponsorStore.filter(cs => cs.sponsorId === sponsorId && cs.isActive),
  getSponsorshipSummary: async carnivalId => {
    const active = carnivalSponsorStore.filter(cs => cs.carnivalId === carnivalId && cs.isActive);
    const byLevel = {};
    let totalValue = 0;
    for (const cs of active) {
      byLevel[cs.sponsorshipLevel] = (byLevel[cs.sponsorshipLevel] || 0) + 1;
      totalValue += cs.sponsorshipValue || 0;
    }
    return {
      totalSponsors: active.length,
      totalValue,
      byLevel
    };
  }
};

describe('CarnivalSponsor Model (Mocked)', () => {
  let carnival, sponsor, carnivalSponsor;
  beforeEach(() => {
    carnivalStore = [];
    sponsorStore = [];
    carnivalSponsorStore = [];
    carnival = createMockCarnival({ title: 'Test Carnival' });
    sponsor = createMockSponsor({ sponsorName: 'Test Sponsor', businessName: 'Test Sponsor Pty Ltd' });
    carnivalSponsor = createMockCarnivalSponsor({
      carnivalId: carnival.id,
      sponsorId: sponsor.id,
      sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD,
      sponsorshipValue: 1000,
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
    expect(summary).toHaveProperty('totalValue', 1000);
    expect(summary.byLevel).toHaveProperty(SPONSORSHIP_LEVELS.GOLD, 1);
  });
});
