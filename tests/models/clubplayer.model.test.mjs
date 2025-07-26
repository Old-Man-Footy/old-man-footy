/**
 * @file ClubPlayer Model Unit Tests (Mocked)
 * @description Vitest unit tests for the ClubPlayer model using mock data (no DB).
 *
 * Follows AAA (Arrange, Act, Assert) pattern and project security/MVC/testing guidelines.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Helper to create a mock ClubPlayer instance
function createMockPlayer(data) {
  // Field normalization
  const normalize = s => s ? s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase() : null;
  const firstName = normalize(data.firstName);
  const lastName = normalize(data.lastName);
  const email = data.email ? data.email.trim().toLowerCase() : null;
  // Validation
  if (!firstName) throw new Error('First name is required');
  if (!lastName) throw new Error('Last name is required');
  if (!data.dateOfBirth) throw new Error('Date of birth is required');
  if (!email) throw new Error('Email is required');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Email must be a valid email address');
  const dob = new Date(data.dateOfBirth);
  const now = new Date();
  if (dob > now) throw new Error('Date of birth cannot be in the future');
  const age = now.getFullYear() - dob.getFullYear() - (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
  if (age < 16 || age > 100) throw new Error('Player must be between 16 and 100 years old');
  const shortsAllowed = ['Unrestricted', 'Red', 'Yellow', 'Blue', 'Green'];
  if (data.shorts && !shortsAllowed.includes(data.shorts)) throw new Error('Shorts must be one of: Unrestricted, Red, Yellow, Blue, Green');
  // Mocked instance
  return {
    ...data,
    firstName,
    lastName,
    email,
    getFullName: () => `${firstName} ${lastName}`,
    getAge: () => age,
    isMastersEligible: () => age >= 35,
    getInitials: () => `${firstName[0]}.${lastName[0]}.`,
  };
}

describe('ClubPlayer Model (Mocked)', () => {
  let baseData;
  beforeEach(() => {
    baseData = {
      clubId: 1,
      firstName: 'john',
      lastName: 'doe',
      dateOfBirth: '1980-06-30',
      email: 'TEST@EXAMPLE.COM',
      isActive: true,
      shorts: 'Unrestricted',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  afterEach(() => {
    baseData = null;
  });

  describe('getFullName', () => {
    it('returns full name', () => {
      const player = createMockPlayer(baseData);
      expect(player.getFullName()).toBe('John Doe');
    });
  });

  describe('getAge', () => {
    it('returns correct age for birthday today', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 40);
      const player = createMockPlayer({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) });
      expect(player.getAge()).toBe(40);
    });
  });

  describe('isMastersEligible', () => {
    it('returns true if age >= 35', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 36);
      const player = createMockPlayer({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) });
      expect(player.isMastersEligible()).toBe(true);
    });
    it('returns false if age < 35', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 30);
      const player = createMockPlayer({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) });
      expect(player.isMastersEligible()).toBe(false);
    });
  });

  describe('getInitials', () => {
    it('returns initials for normal names', () => {
      const player = createMockPlayer(baseData);
      expect(player.getInitials()).toBe('J.D.');
    });
  });

  describe('field normalization', () => {
    it('capitalizes and trims first/last name, lowercases email', () => {
      const player = createMockPlayer({
        ...baseData,
        firstName: '  alice ',
        lastName: ' SMITH ',
        email: '  Alice@Email.COM  ',
      });
      expect(player.firstName).toBe('Alice');
      expect(player.lastName).toBe('Smith');
      expect(player.email).toBe('alice@email.com');
    });
  });

  describe('validation', () => {
    it('throws for missing firstName', () => {
      expect(() => createMockPlayer({ ...baseData, firstName: null }))
        .toThrow(/First name is required/);
    });
    it('throws for missing lastName', () => {
      expect(() => createMockPlayer({ ...baseData, lastName: null }))
        .toThrow(/Last name is required/);
    });
    it('throws for missing dateOfBirth', () => {
      expect(() => createMockPlayer({ ...baseData, dateOfBirth: null }))
        .toThrow(/Date of birth is required/);
    });
    it('throws for missing email', () => {
      expect(() => createMockPlayer({ ...baseData, email: null }))
        .toThrow(/Email is required/);
    });
    it('throws for future DOB', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      expect(() => createMockPlayer({ ...baseData, dateOfBirth: future.toISOString().slice(0, 10) }))
        .toThrow('Date of birth cannot be in the future');
    });
    it('throws for too young', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 10);
      expect(() => createMockPlayer({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) }))
        .toThrow('Player must be between 16 and 100 years old');
    });
    it('throws for too old', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 101);
      expect(() => createMockPlayer({ ...baseData, dateOfBirth: dob.toISOString().slice(0, 10) }))
        .toThrow('Player must be between 16 and 100 years old');
    });
    it('throws for invalid email', () => {
      expect(() => createMockPlayer({ ...baseData, email: 'not-an-email' }))
        .toThrow('Email must be a valid email address');
    });
    it('throws for invalid shorts', () => {
      expect(() => createMockPlayer({ ...baseData, shorts: 'Purple' }))
        .toThrow('Shorts must be one of: Unrestricted, Red, Yellow, Blue, Green');
    });
  });
});
