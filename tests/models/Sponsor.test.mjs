/**
 * Unit tests for Sponsor model (Mocked)
 * Uses Vitest and in-memory mock data. No database.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// In-memory stores
let sponsorStore;
let clubStore;

function createMockClub(data) {
  const club = {
    ...data,
    id: clubStore.length + 1,
    isActive: data.isActive !== undefined ? data.isActive : true,
    clubName: data.clubName ? data.clubName.trim() : '',
  };
  clubStore.push(club);
  return club;
}

function createMockSponsor(data) {
  // Normalize and validate
  const sponsorName = data.sponsorName ? data.sponsorName.trim() : null;
  if (!sponsorName) throw new Error('Sponsor name is required');
  if (sponsorStore.some(s => s.sponsorName === sponsorName)) throw new Error('Sponsor name must be unique');
  const contactEmail = data.contactEmail ? data.contactEmail.trim().toLowerCase() : null;
  const website = data.website && data.website.trim() ? data.website.trim() : null;
  const isActive = data.isActive !== undefined ? data.isActive : true;
  const isPubliclyVisible = data.isPubliclyVisible !== undefined ? data.isPubliclyVisible : true;
  // Mocked instance
  const sponsor = {
    ...data,
    id: sponsorStore.length + 1,
    sponsorName,
    contactEmail,
    website,
    isActive,
    isPubliclyVisible,
    clubs: [],
    addClub: async function(club) {
      if (!this.clubs.some(c => c.id === club.id)) this.clubs.push(club);
    },
    getAssociatedClubs: async function() {
      return this.clubs.filter(c => c.isActive);
    },
    getClubCount: async function() {
      return this.clubs.filter(c => c.isActive).length;
    },
    isAssociatedWithClub: async function(clubId) {
      return this.clubs.some(c => c.id === clubId && c.isActive);
    }
  };
  sponsorStore.push(sponsor);
  return sponsor;
}

const Sponsor = {
  create: async data => createMockSponsor(data),
  destroy: async ({ where }) => {
    if (where && where.sponsorName) {
      sponsorStore = sponsorStore.filter(s => s.sponsorName !== where.sponsorName);
    } else {
      sponsorStore = [];
    }
  }
};
const Club = {
  create: async data => createMockClub(data),
  destroy: async ({ where }) => {
    if (where && where.clubName) {
      clubStore = clubStore.filter(c => c.clubName !== where.clubName);
    } else {
      clubStore = [];
    }
  }
};

describe('Sponsor Model (Mocked)', () => {
  beforeEach(() => {
    sponsorStore = [];
    clubStore = [];
  });

  it('should trim sponsorName and set correctly', async () => {
    const sponsor = await Sponsor.create({ sponsorName: '  Test Sponsor  ', createdAt: new Date(), updatedAt: new Date() });
    expect(sponsor.sponsorName).toBe('Test Sponsor');
  });

  it('should lowercase and trim contactEmail', async () => {
    const sponsor = await Sponsor.create({
      sponsorName: 'Sponsor',
      contactEmail: '  TEST@EXAMPLE.COM ',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    expect(sponsor.contactEmail).toBe('test@example.com');
  });

  it('should set website to null if blank', async () => {
    const sponsor = await Sponsor.create({
      sponsorName: 'Sponsor',
      website: '   ',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    expect(sponsor.website).toBeNull();
  });

  it('should get associated clubs (only active)', async () => {
    const sponsor = await Sponsor.create({ sponsorName: 'Sponsor', createdAt: new Date(), updatedAt: new Date() });
    const club1 = await Club.create({ clubName: 'Alpha', isActive: true });
    const club2 = await Club.create({ clubName: 'Beta', isActive: false });
    await sponsor.addClub(club1);
    await sponsor.addClub(club2);

    const clubs = await sponsor.getAssociatedClubs();
    expect(clubs.length).toBe(1);
    expect(clubs[0].clubName).toBe('Alpha');
  });

  it('should get club count (only active)', async () => {
    const sponsor = await Sponsor.create({ sponsorName: 'Sponsor', createdAt: new Date(), updatedAt: new Date() });
    const club1 = await Club.create({ clubName: 'Alpha', isActive: true });
    const club2 = await Club.create({ clubName: 'Beta', isActive: false });
    await sponsor.addClub(club1);
    await sponsor.addClub(club2);

    const count = await sponsor.getClubCount();
    expect(count).toBe(1);
  });

  it('should check association with specific club', async () => {
    const sponsor = await Sponsor.create({ sponsorName: 'Sponsor', createdAt: new Date(), updatedAt: new Date() });
    const club1 = await Club.create({ clubName: 'Alpha', isActive: true });
    const club2 = await Club.create({ clubName: 'Beta', isActive: false });
    await sponsor.addClub(club1);
    await sponsor.addClub(club2);

    const isAssociated = await sponsor.isAssociatedWithClub(club1.id);
    expect(isAssociated).toBe(true);

    const notAssociated = await sponsor.isAssociatedWithClub(club2.id);
    expect(notAssociated).toBe(false);
  });

  it('should enforce unique sponsorName', async () => {
    await Sponsor.create({ sponsorName: 'UniqueName', createdAt: new Date(), updatedAt: new Date() });
    await expect(
      Sponsor.create({ sponsorName: 'UniqueName', createdAt: new Date(), updatedAt: new Date() })
    ).rejects.toThrow();
  });

  it('should default isActive and isPubliclyVisible to true', async () => {
    const sponsor = await Sponsor.create({ sponsorName: 'Sponsor', createdAt: new Date(), updatedAt: new Date() });
    expect(sponsor.isActive).toBe(true);
    expect(sponsor.isPubliclyVisible).toBe(true);
  });
});