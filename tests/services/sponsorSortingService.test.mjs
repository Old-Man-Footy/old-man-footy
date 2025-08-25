import { describe, it, expect, beforeEach } from 'vitest';
import SponsorSortingService, { sortSponsorsHierarchically } from '../../services/sponsorSortingService.mjs';
import { SPONSORSHIP_LEVELS, SPONSORSHIP_LEVEL_ORDER } from '../../config/constants.mjs';

const sponsorsFixture = [
  {
    id: 1,
    name: 'Sponsor A',
    sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD,
    createdAt: '2024-06-01T10:00:00Z',
    displayOrder: 2,
    sponsorshipValue: '5000',
  },
  {
    id: 2,
    name: 'Sponsor B',
    sponsorshipLevel: SPONSORSHIP_LEVELS.SILVER,
    createdAt: '2024-06-02T10:00:00Z',
    displayOrder: null,
    sponsorshipValue: '3000',
  },
  {
    id: 3,
    name: 'Sponsor C',
    sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD,
    createdAt: '2024-06-03T10:00:00Z',
    displayOrder: 1,
    sponsorshipValue: '7000',
  },
  {
    id: 4,
    name: 'Sponsor D',
    sponsorshipLevel: SPONSORSHIP_LEVELS.BRONZE,
    createdAt: '2024-06-04T10:00:00Z',
    displayOrder: null,
    sponsorshipValue: '1000',
  },
];

describe('SponsorSortingService', () => {
  let sponsors;

  beforeEach(() => {
    sponsors = JSON.parse(JSON.stringify(sponsorsFixture));
  });

  describe('sortByLevel', () => {
    it('sorts sponsors by level and then by creation date (newest first)', () => {
      const sorted = SponsorSortingService.sortByLevel(sponsors);
      expect(sorted[0].name).toBe('Sponsor C'); // Gold, newest
      expect(sorted[1].name).toBe('Sponsor A'); // Gold, older
      expect(sorted[2].name).toBe('Sponsor B'); // Silver
      expect(sorted[3].name).toBe('Sponsor D'); // Bronze
    });

    it('handles unknown sponsorship levels by sorting them last', () => {
      sponsors.push({
        id: 5,
        name: 'Sponsor E',
        sponsorshipLevel: 'Unknown',
        createdAt: '2024-06-05T10:00:00Z',
        displayOrder: null,
        sponsorshipValue: '0',
      });
      const sorted = SponsorSortingService.sortByLevel(sponsors);
      expect(sorted[sorted.length - 1].name).toBe('Sponsor E');
    });
  });

  describe('sortByDisplayOrder', () => {
    it('sorts sponsors by displayOrder, then level, then creation date', () => {
      const sorted = SponsorSortingService.sortByDisplayOrder(sponsors);
      expect(sorted[0].name).toBe('Sponsor C'); // displayOrder: 1
      expect(sorted[1].name).toBe('Sponsor A'); // displayOrder: 2
      expect(sorted[2].name).toBe('Sponsor B'); // no displayOrder, Silver
      expect(sorted[3].name).toBe('Sponsor D'); // no displayOrder, Bronze
    });

    it('prioritizes sponsors with displayOrder over those without', () => {
      sponsors[2].displayOrder = null; // Remove displayOrder from Sponsor C
      const sorted = SponsorSortingService.sortByDisplayOrder(sponsors);
      expect(sorted[0].name).toBe('Sponsor A'); // Only one with displayOrder
    });
  });

  describe('sortByValue', () => {
    it('sorts sponsors by sponsorshipValue (highest first)', () => {
      const sorted = SponsorSortingService.sortByValue(sponsors);
      expect(sorted[0].name).toBe('Sponsor C'); // 7000
      expect(sorted[1].name).toBe('Sponsor A'); // 5000
      expect(sorted[2].name).toBe('Sponsor B'); // 3000
      expect(sorted[3].name).toBe('Sponsor D'); // 1000
    });

    it('falls back to level sorting when values are equal', () => {
      sponsors[0].sponsorshipValue = '7000';
      sponsors[2].sponsorshipValue = '7000';
      const sorted = SponsorSortingService.sortByValue([sponsors[0], sponsors[2]]);
      expect(sorted[0].name).toBe('Sponsor C'); // Newest Gold
    });
  });
});

describe('sortSponsorsHierarchically', () => {
  it('returns empty array if sponsors is not an array', () => {
    expect(sortSponsorsHierarchically(null)).toEqual([]);
    expect(sortSponsorsHierarchically(undefined)).toEqual([]);
    expect(sortSponsorsHierarchically({})).toEqual([]);
  });

  it('uses sortByDisplayOrder for carnival context', () => {
    const sponsors = [
      { sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD, createdAt: '2024-06-01', displayOrder: 2 },
      { sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD, createdAt: '2024-06-02', displayOrder: 1 },
    ];
    const sorted = sortSponsorsHierarchically(sponsors, 'carnival');
    expect(sorted[0].displayOrder).toBe(1);
    expect(sorted[1].displayOrder).toBe(2);
  });

  it('uses sortByLevel for other contexts', () => {
    const sponsors = [
      { sponsorshipLevel: SPONSORSHIP_LEVELS.SILVER, createdAt: '2024-06-01', displayOrder: null },
      { sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD, createdAt: '2024-06-02', displayOrder: null },
    ];
    const sorted = sortSponsorsHierarchically(sponsors, 'club');
    expect(sorted[0].sponsorshipLevel).toBe(SPONSORSHIP_LEVELS.GOLD);
    expect(sorted[1].sponsorshipLevel).toBe(SPONSORSHIP_LEVELS.SILVER);
  });
});