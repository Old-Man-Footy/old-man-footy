/**
 * Sponsor Display View Tests
 *
 * Ensures that sponsor views only display sponsors for the correct club.
 * Tests the unified sponsor template with context-specific parameters.
 * Follows AAA pattern and strict MVC separation.
 * Uses Vitest for isolation.
 */
import { describe, it, expect } from 'vitest';
import ejs from 'ejs';
import path from 'path';

const sponsorViewPath = path.resolve('views/shared/sponsors/sponsors.ejs');

const mockClub = {
  id: 1,
  clubName: 'Test Club',
  state: 'NSW',
  location: 'Sydney',
};

const mockSponsors = [
  {
    id: 1,
    sponsorName: 'Sponsor A',
    clubId: 1,
    displayOrder: 1,
    logoUrl: '/uploads/logo-a.jpg',
    isActive: true,
  },
  {
    id: 2,
    sponsorName: 'Sponsor B',
    clubId: 1,
    displayOrder: 2,
    logoUrl: '/uploads/logo-b.jpg',
    isActive: true,
  },
  {
    id: 3,
    sponsorName: 'Sponsor C',
    clubId: 2,
    displayOrder: 1,
    logoUrl: '/uploads/logo-c.jpg',
    isActive: true,
  },
];

describe('Sponsor View Display', () => {
  it('should only render sponsors for the current club', async () => {
    // Arrange
    const sponsorsForClub = mockSponsors.filter(s => s.clubId === mockClub.id);
    const html = await ejs.renderFile(sponsorViewPath, {
      entityType: 'club',
      entityData: mockClub,
      routePrefix: `/clubs/${mockClub.id}`,
      sponsors: sponsorsForClub,
      additionalCSS: [],
    });
    // Act & Assert
    expect(html).toContain('Sponsor A');
    expect(html).toContain('Sponsor B');
    expect(html).not.toContain('Sponsor C');
  });

  it('should show empty state if no sponsors for club', async () => {
    // Arrange
    const html = await ejs.renderFile(sponsorViewPath, {
      entityType: 'club',
      entityData: mockClub,
      routePrefix: `/clubs/${mockClub.id}`,
      sponsors: [],
      additionalCSS: [],
    });
    // Act & Assert
    expect(html).toContain('No Sponsors Yet');
  });

  it('should render correctly for carnival context', async () => {
    // Arrange
    const mockCarnival = {
      id: 1,
      carnivalName: 'Test Carnival',
      startDate: '2024-01-01',
      endDate: '2024-01-03'
    };
    const html = await ejs.renderFile(sponsorViewPath, {
      entityType: 'carnival',
      entityData: mockCarnival,
      routePrefix: `/carnivals/${mockCarnival.id}`,
      sponsors: [],
      additionalCSS: [],
    });
    // Act & Assert
    expect(html).toContain('Carnival Sponsors');
    expect(html).toContain('Test Carnival');
  });
});
