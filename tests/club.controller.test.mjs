// Jest unit tests for club.controller.mjs
import { jest } from '@jest/globals';
import {
  showClubManagement,
  updateClubProfile,
  createClub,
  joinClub,
  leaveClub
} from '../controllers/club.controller.mjs';
import Club from '../models/Club.mjs';
import User from '../models/User.mjs';
import { sequelize, Op } from '../models/index.mjs';
import { validationResult } from 'express-validator';

jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] }))
}));

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
}

describe('club.controller', () => {
  let club, user;
  beforeEach(async () => {
    // Arrange: Always create fresh Sequelize instances for isolation
    user = await User.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      isActive: true,
      phoneNumber: '0400000000',
      isAdmin: false,
      isPrimaryDelegate: false,
      clubId: null,
    });
    user.getFullName = function () { return `${this.firstName} ${this.lastName}`; };
    club = await Club.create({ clubName: 'Test Club', isActive: true });
  });

  it('should show club management for user without club', async () => {
    // Arrange
    await User.update({ clubId: null }, { where: {} }); // Ensure no user is in a club
    user.clubId = null;
    await user.save();
    const req = { user, flash: jest.fn() };
    const res = mockRes();
    // Act
    await showClubManagement(req, res);
    // Assert
    expect(res.render.mock.calls.length).toBeGreaterThan(0);
    expect(res.render.mock.calls[0][0]).toContain('club-options');
    expect(res.render.mock.calls[0][1]).toHaveProperty('user');
  });

  it('should update club profile for user with club', async () => {
    // Arrange
    await user.update({ clubId: club.id, isPrimaryDelegate: true });
    await club.update({ isActive: true });
    const req = {
      user: await User.findByPk(user.id),
      body: { location: 'Sydney', isPubliclyListed: 'on', isActive: 'on' },
      flash: jest.fn(),
    };
    req.user.getFullName = function () { return `${req.user.firstName} ${req.user.lastName}`; };
    const res = mockRes();
    // Act
    await updateClubProfile(req, res);
    // Assert
    expect(res.redirect.mock.calls.length).toBeGreaterThan(0);
    expect(res.redirect.mock.calls[0][0]).toBe('/clubs/manage');
  });

  it('should create a club for user without club', async () => {
    // Arrange
    await User.update({ clubId: null }, { where: {} });
    await Club.destroy({ where: { clubName: 'New Club' } }); // Ensure no club with this name exists
    await user.update({ clubId: null, isPrimaryDelegate: false });
    const req = {
      user: await User.findByPk(user.id),
      body: { clubName: 'New Club', state: 'NSW', location: 'Sydney', description: 'A new club' },
      flash: jest.fn(),
    };
    req.user.getFullName = function () { return `${req.user.firstName} ${req.user.lastName}`; };
    const res = mockRes();
    // Act
    await createClub(req, res);
    // Assert
    expect(res.redirect.mock.calls.length).toBeGreaterThan(0);
    expect(res.redirect.mock.calls[0][0]).toBe('/dashboard');
  });

  it('should join a club for user without club and no primary delegate', async () => {
    // Arrange
    const joinableClub = await Club.create({ clubName: 'Joinable Club', isActive: true });
    await User.destroy({ where: { clubId: joinableClub.id, isPrimaryDelegate: true } }); // Ensure no primary delegate
    const req = {
      user: await User.findByPk(user.id),
      params: { id: joinableClub.id },
      flash: jest.fn(),
    };
    req.user.clubId = null;
    await req.user.save();
    const res = mockRes();
    // Act
    await joinClub(req, res);
    // Assert
    expect(res.redirect.mock.calls.length).toBeGreaterThan(0);
    expect(res.redirect.mock.calls[0][0]).toBe('/dashboard');
  });

  it('should leave a club for user with club (regular delegate)', async () => {
    // Arrange
    await user.update({ clubId: club.id, isPrimaryDelegate: false });
    await User.destroy({ where: { clubId: club.id, id: { [Op.ne]: user.id } } }); // Only this user in club
    const freshUser = await User.findByPk(user.id);
    freshUser.getFullName = function () { return `${freshUser.firstName} ${freshUser.lastName}`; };
    const req = {
      user: freshUser,
      body: { confirmed: 'true' },
      flash: jest.fn(),
    };
    const res = mockRes();
    // Act
    await leaveClub(req, res);
    // Assert
    expect(res.redirect.mock.calls.length).toBeGreaterThan(0);
    expect(res.redirect.mock.calls[0][0]).toBe('/dashboard');
  });

  it('should leave a club for user with club (primary delegate, no other delegates)', async () => {
    // Arrange
    await user.update({ clubId: club.id, isPrimaryDelegate: true });
    await User.destroy({ where: { clubId: club.id, isPrimaryDelegate: false, id: { [Op.ne]: user.id } } }); // Only this user in club
    const freshUser = await User.findByPk(user.id);
    freshUser.getFullName = function () { return `${freshUser.firstName} ${freshUser.lastName}`; };
    const req = {
      user: freshUser,
      body: { confirmed: 'true', leaveAction: 'available' },
      flash: jest.fn(),
    };
    const res = mockRes();
    // Act
    await leaveClub(req, res);
    // Assert
    expect(res.redirect.mock.calls.length).toBeGreaterThan(0);
    expect(res.redirect.mock.calls[0][0]).toBe('/dashboard');
  });
});
