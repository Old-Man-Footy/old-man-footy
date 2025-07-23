import { describe, it, expect } from 'vitest';
import {
  formatCarnivalAddress,
  getGoogleMapsUrl,
  hasLocationData,
} from '/public/js/address-utils.js';

describe('address-utils', () => {
describe('formatCarnivalAddress', () => {
  it('formats structured address with all fields', () => {
    const carnival = {
      locationAddressLine1: '123 Main St',
      locationAddressLine2: 'Suite 4',
      locationSuburb: 'Footytown',
      state: 'VIC',
      locationPostcode: '3000',
      locationCountry: 'Australia',
      locationLatitude: '-37.8136',
      locationLongitude: '144.9631',
    };
    const result = formatCarnivalAddress(carnival);
    expect(result).toBeTruthy();
    expect(result.parts).toEqual([
      '123 Main St',
      'Suite 4',
      'Footytown VIC 3000',
    ]);
    expect(result.fullAddress).toBe(
      '123 Main St, Suite 4, Footytown VIC 3000'
    );
    expect(result.googleMapsUrl).toBe(
      'https://maps.google.com/?q=-37.8136,144.9631'
    );
    expect(result.primaryLine).toBe('123 Main St');
    expect(result.secondaryLines).toEqual(['Suite 4', 'Footytown VIC 3000']);
    expect(result.hasStructuredParts).toBe(true);
  });

  it('formats structured address with missing optional fields', () => {
    const carnival = {
      locationAddressLine1: '456 Side Rd',
      locationSuburb: 'Carnivalville',
      state: 'NSW',
      locationPostcode: '2000',
    };
    const result = formatCarnivalAddress(carnival);
    expect(result.parts).toEqual(['456 Side Rd', 'Carnivalville NSW 2000']);
    expect(result.fullAddress).toBe('456 Side Rd, Carnivalville NSW 2000');
    expect(result.googleMapsUrl).toMatch(
      /^https:\/\/maps\.google\.com\/maps\?q=/
    );
    expect(result.primaryLine).toBe('456 Side Rd');
    expect(result.secondaryLines).toEqual(['Carnivalville NSW 2000']);
    expect(result.hasStructuredParts).toBe(true);
  });

  it('includes country if not Australia', () => {
    const carnival = {
      locationAddressLine1: '789 Outback Ave',
      locationSuburb: 'Remote',
      state: 'WA',
      locationPostcode: '6000',
      locationCountry: 'New Zealand',
    };
    const result = formatCarnivalAddress(carnival);
    expect(result.parts).toContain('New Zealand');
    expect(result.fullAddress).toContain('New Zealand');
  });

  it('falls back to locationAddress if structured fields missing', () => {
    const carnival = {
      locationAddress: '1 Carnival Parade, Festiville, QLD 4000',
    };
    const result = formatCarnivalAddress(carnival);
    expect(result.parts).toEqual([
      '1 Carnival Parade, Festiville, QLD 4000',
    ]);
    expect(result.fullAddress).toBe(
      '1 Carnival Parade, Festiville, QLD 4000'
    );
    expect(result.googleMapsUrl).toBe(
      'https://maps.google.com/maps?q=1%20Carnival%20Parade%2C%20Festiville%2C%20QLD%204000'
    );
    expect(result.primaryLine).toBe('1 Carnival Parade, Festiville, QLD 4000');
    expect(result.secondaryLines).toEqual([]);
    expect(result.hasStructuredParts).toBe(false);
  });

  it('returns null if no address data', () => {
    const carnival = {};
    const result = formatCarnivalAddress(carnival);
    expect(result).toBeNull();
  });
});

describe('getGoogleMapsUrl', () => {
  it('returns Google Maps URL for structured address', () => {
    const carnival = {
      locationAddressLine1: '123 Main St',
      locationSuburb: 'Footytown',
      state: 'VIC',
      locationPostcode: '3000',
    };
    const url = getGoogleMapsUrl(carnival);
    expect(url).toMatch(/^https:\/\/maps\.google\.com\/maps\?q=/);
  });

  it('returns Google Maps URL for fallback address', () => {
    const carnival = {
      locationAddress: '1 Carnival Parade, Festiville, QLD 4000',
    };
    const url = getGoogleMapsUrl(carnival);
    expect(url).toBe(
      'https://maps.google.com/maps?q=1%20Carnival%20Parade%2C%20Festiville%2C%20QLD%204000'
    );
  });

  it('returns "#" if no address data', () => {
    const carnival = {};
    const url = getGoogleMapsUrl(carnival);
    expect(url).toBe('#');
  });
});

describe('hasLocationData', () => {
  it('returns true if structured address exists', () => {
    const carnival = {
      locationAddressLine1: '123 Main St',
      locationSuburb: 'Footytown',
      state: 'VIC',
      locationPostcode: '3000',
    };
    expect(hasLocationData(carnival)).toBe(true);
  });

  it('returns true if fallback address exists', () => {
    const carnival = {
      locationAddress: '1 Carnival Parade, Festiville, QLD 4000',
    };
    expect(hasLocationData(carnival)).toBe(true);
  });

  it('returns false if no address data', () => {
    const carnival = {};
    expect(hasLocationData(carnival)).toBe(false);
  });
});
});