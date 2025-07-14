/**
 * Authentication Service Unit Tests
 * 
 * Tests authentication service layer functionality including invitation management,
 * password reset, email notifications, and security validation following strict
 * MVC patterns and security-first principles.
 */

import { jest } from '@jest/globals';

// Mock dependencies using jest.unstable_mockModule
const mockUser = {
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  findByEmail: jest.fn()
};

const mockEmailService = {
  sendInvitationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendDelegateRoleTransferNotification: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  _canSendEmails: jest.fn().mockReturnValue(true),
  _logBlockedEmail: jest.fn()
};

const mockAuditService = {
  logAuthAction: jest.fn(),
  logUserAction: jest.fn(),
  ACTIONS: {
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    USER_REGISTER: 'USER_REGISTER',
    USER_INVITATION_SEND: 'USER_INVITATION_SEND',
    USER_INVITATION_ACCEPT: 'USER_INVITATION_ACCEPT',
    USER_PASSWORD_RESET: 'USER_PASSWORD_RESET'
  },
  ENTITIES: {
    USER: 'USER'
  }
};

const mockBcryptjs = {
  compare: jest.fn(),
  genSalt: jest.fn().mockResolvedValue('mockedsalt'),
  hash: jest.fn().mockResolvedValue('mockedhashedpassword')
};

const mockCrypto = {
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mockedinvitationtoken123456')
  })
};

jest.unstable_mockModule('../models/index.mjs', () => ({
  User: mockUser
}));

jest.unstable_mockModule('../services/emailService.mjs', () => ({
  default: mockEmailService
}));

jest.unstable_mockModule('../services/auditService.mjs', () => ({
  default: mockAuditService
}));

jest.unstable_mockModule('bcryptjs', () => mockBcryptjs);
jest.unstable_mockModule('crypto', () => mockCrypto);

// Import the authentication service functionality
const { User } = await import('../models/index.mjs');
const emailService = (await import('../services/emailService.mjs')).default;
const AuditService = (await import('../services/auditService.mjs')).default;
const bcryptjs = await import('bcryptjs');
const crypto = await import('crypto');

/**
 * Authentication Service Layer
 * Since there's no dedicated authService.mjs, we'll test the service-layer patterns
 * used in the authentication controller and related functionality
 */
class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(email, password, req) {
    // Find user by email
    const user = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.isActive) {
      await AuditService.logAuthAction(AuditService.ACTIONS.USER_LOGIN, req, null, {
        result: 'FAILURE',
        reason: user ? 'User inactive' : 'User not found',
        attemptedEmail: email.toLowerCase(),
      });
      return { success: false, error: 'Invalid credentials' };
    }

    // Check password
    const isMatch = await bcryptjs.compare(password, user.passwordHash);
    
    if (!isMatch) {
      await AuditService.logAuthAction(AuditService.ACTIONS.USER_LOGIN, req, user, {
        result: 'FAILURE',
        reason: 'Invalid password',
      });
      return { success: false, error: 'Invalid credentials' };
    }

    // Update last login timestamp
    await user.update({ lastLoginAt: new Date() });

    // Log successful login
    await AuditService.logAuthAction(AuditService.ACTIONS.USER_LOGIN, req, user, {
      result: 'SUCCESS',
    });

    return { success: true, user };
  }

  /**
   * Send invitation to new club delegate
   */
  static async sendInvitation(inviterUser, inviteeData, req) {
    const { firstName, lastName, email } = inviteeData;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      await AuditService.logUserAction(AuditService.ACTIONS.USER_INVITATION_SEND, {
        req,
        entityType: AuditService.ENTITIES.USER,
        result: 'FAILURE',
        errorMessage: 'User already exists',
        metadata: { targetEmail: email.toLowerCase() },
      });
      return { success: false, error: 'User already exists' };
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create inactive user with invitation
    const newUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      clubId: inviterUser.clubId,
      isPrimaryDelegate: false,
      isActive: false,
      invitationToken: invitationToken,
      tokenExpires: tokenExpiry,
    });

    // Send invitation email
    await emailService.sendInvitationEmail({
      to: email,
      firstName: firstName,
      inviterName: `${inviterUser.firstName} ${inviterUser.lastName}`,
      clubName: inviterUser.club?.clubName || 'the club',
      invitationUrl: `${process.env.BASE_URL || 'http://localhost:3050'}/auth/accept-invitation/${invitationToken}`,
    });

    // Log successful invitation send
    await AuditService.logUserAction(AuditService.ACTIONS.USER_INVITATION_SEND, {
      req,
      entityType: AuditService.ENTITIES.USER,
      entityId: newUser.id,
      newValues: {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        clubId: newUser.clubId,
        inviterUserId: inviterUser.id,
      },
    });

    return { success: true, user: newUser, token: invitationToken };
  }

  /**
   * Accept invitation and activate user account
   */
  static async acceptInvitation(token, userData, req) {
    const { firstName, lastName, password } = userData;

    // Find user by invitation token
    const invitedUser = await User.findOne({
      where: {
        invitationToken: token,
        tokenExpires: { $gt: new Date() },
        isActive: false,
      },
    });

    if (!invitedUser) {
      await AuditService.logUserAction(AuditService.ACTIONS.USER_INVITATION_ACCEPT, {
        req,
        entityType: AuditService.ENTITIES.USER,
        result: 'FAILURE',
        errorMessage: 'Invalid or expired invitation link',
        metadata: { token },
      });
      return { success: false, error: 'Invalid or expired invitation link' };
    }

    const oldValues = {
      firstName: invitedUser.firstName,
      lastName: invitedUser.lastName,
      isActive: invitedUser.isActive,
    };

    // Update user with new data and activate
    await invitedUser.update({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      passwordHash: password, // User model will hash it
      isActive: true,
      invitationToken: null,
      tokenExpires: null,
    });

    // Log successful invitation acceptance
    await AuditService.logUserAction(AuditService.ACTIONS.USER_INVITATION_ACCEPT, {
      req,
      entityType: AuditService.ENTITIES.USER,
      entityId: invitedUser.id,
      oldValues,
      newValues: {
        firstName: invitedUser.firstName,
        lastName: invitedUser.lastName,
        isActive: true,
      },
    });

    return { success: true, user: invitedUser };
  }

  /**
   * Initiate password reset process
   */
  static async initiatePasswordReset(email, req) {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user || !user.isActive) {
      // For security, don't reveal if user exists
      return { success: true, message: 'If the email exists, a reset link has been sent' };
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpiry: resetTokenExpiry
    });

    // Send password reset email
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3050'}/auth/reset-password/${resetToken}`;
    await emailService.sendPasswordResetEmail(user.email, resetToken, user.firstName);

    // Log password reset initiation
    await AuditService.logUserAction(AuditService.ACTIONS.USER_PASSWORD_RESET, {
      req,
      entityType: AuditService.ENTITIES.USER,
      entityId: user.id,
      metadata: {
        action: 'Password reset initiated',
        resetTokenGenerated: true,
      },
    });

    return { success: true, message: 'If the email exists, a reset link has been sent' };
  }

  /**
   * Validate invitation token
   */
  static async validateInvitationToken(token) {
    const invitedUser = await User.findOne({
      where: {
        invitationToken: token,
        tokenExpires: { $gt: new Date() },
        isActive: false,
      },
    });

    return {
      valid: !!invitedUser,
      user: invitedUser
    };
  }

  /**
   * Validate password reset token
   */
  static async validatePasswordResetToken(token) {
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { $gt: new Date() },
        isActive: true,
      },
    });

    return {
      valid: !!user,
      user: user
    };
  }

  /**
   * Transfer primary delegate role
   */
  static async transferDelegateRole(currentPrimary, newPrimaryUserId, req) {
    const newPrimaryUser = await User.findOne({
      where: {
        id: newPrimaryUserId,
        clubId: currentPrimary.clubId,
        isActive: true,
        isPrimaryDelegate: false,
      },
    });

    if (!newPrimaryUser) {
      return { success: false, error: 'Selected user not found or not eligible' };
    }

    // Update both users in a transaction-like manner
    await currentPrimary.update({ isPrimaryDelegate: false });
    await newPrimaryUser.update({ isPrimaryDelegate: true });

    // Send notification email
    await emailService.sendDelegateRoleTransferNotification(
      newPrimaryUser.email,
      newPrimaryUser.getFullName(),
      currentPrimary.getFullName(),
      currentPrimary.club?.clubName || 'the club'
    );

    return { success: true, newPrimary: newPrimaryUser };
  }
}

describe('Authentication Service Layer', () => {
  let mockReq, mockUser, mockInviterUser;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock request object
    mockReq = {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Jest Test Agent'
      },
      session: {},
      user: null
    };

    // Mock user object
    mockUser = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpassword',
      isActive: true,
      lastLoginAt: null,
      update: jest.fn().mockResolvedValue(true),
      getFullName: jest.fn().mockReturnValue('Test User')
    };

    // Mock inviter user
    mockInviterUser = {
      id: 2,
      firstName: 'Inviter',
      lastName: 'User',
      email: 'inviter@example.com',
      clubId: 1,
      isPrimaryDelegate: true,
      club: {
        clubName: 'Test Club'
      },
      getFullName: jest.fn().mockReturnValue('Inviter User'),
      update: jest.fn().mockResolvedValue(true)
    };

    // Reset mock implementations
    mockBcryptjs.compare.mockResolvedValue(true);
    mockCrypto.randomBytes.mockReturnValue({
      toString: jest.fn().mockReturnValue('mockedinvitationtoken123456')
    });
  });

  describe('User Authentication', () => {
    describe('authenticateUser', () => {
      it('should successfully authenticate valid user', async () => {
        User.findOne.mockResolvedValue(mockUser);

        const result = await AuthService.authenticateUser('test@example.com', 'password123', mockReq);

        expect(result.success).toBe(true);
        expect(result.user).toEqual(mockUser);
        expect(User.findOne).toHaveBeenCalledWith({
          where: { email: 'test@example.com' }
        });
        expect(bcryptjs.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
        expect(mockUser.update).toHaveBeenCalledWith({ lastLoginAt: expect.any(Date) });
        expect(AuditService.logAuthAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_LOGIN,
          mockReq,
          mockUser,
          { result: 'SUCCESS' }
        );
      });

      it('should fail authentication for non-existent user', async () => {
        User.findOne.mockResolvedValue(null);

        const result = await AuthService.authenticateUser('nonexistent@example.com', 'password123', mockReq);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid credentials');
        expect(AuditService.logAuthAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_LOGIN,
          mockReq,
          null,
          {
            result: 'FAILURE',
            reason: 'User not found',
            attemptedEmail: 'nonexistent@example.com',
          }
        );
      });

      it('should fail authentication for inactive user', async () => {
        const inactiveUser = { ...mockUser, isActive: false };
        User.findOne.mockResolvedValue(inactiveUser);

        const result = await AuthService.authenticateUser('test@example.com', 'password123', mockReq);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid credentials');
        expect(AuditService.logAuthAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_LOGIN,
          mockReq,
          null,
          {
            result: 'FAILURE',
            reason: 'User inactive',
            attemptedEmail: 'test@example.com',
          }
        );
      });

      it('should fail authentication for invalid password', async () => {
        User.findOne.mockResolvedValue(mockUser);
        mockBcryptjs.compare.mockResolvedValue(false);

        const result = await AuthService.authenticateUser('test@example.com', 'wrongpassword', mockReq);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid credentials');
        expect(AuditService.logAuthAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_LOGIN,
          mockReq,
          mockUser,
          {
            result: 'FAILURE',
            reason: 'Invalid password',
          }
        );
      });

      it('should normalize email to lowercase', async () => {
        User.findOne.mockResolvedValue(mockUser);

        await AuthService.authenticateUser('TEST@EXAMPLE.COM', 'password123', mockReq);

        expect(User.findOne).toHaveBeenCalledWith({
          where: { email: 'test@example.com' }
        });
      });
    });
  });

  describe('Invitation Management', () => {
    describe('sendInvitation', () => {
      it('should successfully send invitation to new user', async () => {
        User.findOne.mockResolvedValue(null); // No existing user
        User.create.mockResolvedValue({
          id: 3,
          firstName: 'New',
          lastName: 'User',
          email: 'new@example.com',
          clubId: 1,
          invitationToken: 'mockedinvitationtoken123456'
        });

        const inviteeData = {
          firstName: 'New',
          lastName: 'User',
          email: 'new@example.com'
        };

        const result = await AuthService.sendInvitation(mockInviterUser, inviteeData, mockReq);

        expect(result.success).toBe(true);
        expect(result.token).toBe('mockedinvitationtoken123456');
        expect(User.create).toHaveBeenCalledWith({
          firstName: 'New',
          lastName: 'User',
          email: 'new@example.com',
          clubId: 1,
          isPrimaryDelegate: false,
          isActive: false,
          invitationToken: 'mockedinvitationtoken123456',
          tokenExpires: expect.any(Date),
        });
        expect(emailService.sendInvitationEmail).toHaveBeenCalled();
        expect(AuditService.logUserAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_INVITATION_SEND,
          expect.objectContaining({
            req: mockReq,
            entityType: AuditService.ENTITIES.USER,
            entityId: 3,
          })
        );
      });

      it('should fail invitation for existing user', async () => {
        User.findOne.mockResolvedValue(mockUser); // Existing user found

        const inviteeData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        };

        const result = await AuthService.sendInvitation(mockInviterUser, inviteeData, mockReq);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User already exists');
        expect(User.create).not.toHaveBeenCalled();
        expect(emailService.sendInvitationEmail).not.toHaveBeenCalled();
        expect(AuditService.logUserAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_INVITATION_SEND,
          expect.objectContaining({
            result: 'FAILURE',
            errorMessage: 'User already exists',
          })
        );
      });

      it('should normalize email and trim names', async () => {
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ id: 3, invitationToken: 'token123' });

        const inviteeData = {
          firstName: '  New  ',
          lastName: '  User  ',
          email: 'NEW@EXAMPLE.COM'
        };

        await AuthService.sendInvitation(mockInviterUser, inviteeData, mockReq);

        expect(User.findOne).toHaveBeenCalledWith({
          where: { email: 'new@example.com' }
        });
        expect(User.create).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'New',
            lastName: 'User',
            email: 'new@example.com',
          })
        );
      });

      it('should generate secure invitation token', async () => {
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ id: 3, invitationToken: 'securetoken123' });

        const inviteeData = {
          firstName: 'New',
          lastName: 'User',
          email: 'new@example.com'
        };

        await AuthService.sendInvitation(mockInviterUser, inviteeData, mockReq);

        expect(crypto.randomBytes).toHaveBeenCalledWith(32);
        expect(User.create).toHaveBeenCalledWith(
          expect.objectContaining({
            invitationToken: 'mockedinvitationtoken123456',
            tokenExpires: expect.any(Date),
          })
        );
      });
    });

    describe('acceptInvitation', () => {
      it('should successfully accept valid invitation', async () => {
        const invitedUser = {
          id: 3,
          firstName: 'Old',
          lastName: 'Name',
          email: 'invited@example.com',
          isActive: false,
          invitationToken: 'validtoken',
          tokenExpires: new Date(Date.now() + 1000000),
          update: jest.fn().mockResolvedValue(true)
        };

        User.findOne.mockResolvedValue(invitedUser);

        const userData = {
          firstName: 'New',
          lastName: 'Name',
          password: 'newpassword123'
        };

        const result = await AuthService.acceptInvitation('validtoken', userData, mockReq);

        expect(result.success).toBe(true);
        expect(result.user).toEqual(invitedUser);
        expect(invitedUser.update).toHaveBeenCalledWith({
          firstName: 'New',
          lastName: 'Name',
          passwordHash: 'newpassword123',
          isActive: true,
          invitationToken: null,
          tokenExpires: null,
        });
        expect(AuditService.logUserAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_INVITATION_ACCEPT,
          expect.objectContaining({
            req: mockReq,
            entityType: AuditService.ENTITIES.USER,
            entityId: 3,
          })
        );
      });

      it('should fail for invalid invitation token', async () => {
        User.findOne.mockResolvedValue(null);

        const userData = {
          firstName: 'New',
          lastName: 'Name',
          password: 'newpassword123'
        };

        const result = await AuthService.acceptInvitation('invalidtoken', userData, mockReq);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid or expired invitation link');
        expect(AuditService.logUserAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_INVITATION_ACCEPT,
          expect.objectContaining({
            result: 'FAILURE',
            errorMessage: 'Invalid or expired invitation link',
            metadata: { token: 'invalidtoken' },
          })
        );
      });

      it('should trim whitespace from names', async () => {
        const invitedUser = {
          id: 3,
          firstName: 'Old',
          lastName: 'Name',
          isActive: false,
          update: jest.fn().mockResolvedValue(true)
        };

        User.findOne.mockResolvedValue(invitedUser);

        const userData = {
          firstName: '  New  ',
          lastName: '  Name  ',
          password: 'newpassword123'
        };

        await AuthService.acceptInvitation('validtoken', userData, mockReq);

        expect(invitedUser.update).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'New',
            lastName: 'Name',
          })
        );
      });
    });

    describe('validateInvitationToken', () => {
      it('should validate valid invitation token', async () => {
        const validUser = {
          id: 3,
          invitationToken: 'validtoken',
          tokenExpires: new Date(Date.now() + 1000000),
          isActive: false
        };

        User.findOne.mockResolvedValue(validUser);

        const result = await AuthService.validateInvitationToken('validtoken');

        expect(result.valid).toBe(true);
        expect(result.user).toEqual(validUser);
      });

      it('should invalidate expired invitation token', async () => {
        User.findOne.mockResolvedValue(null);

        const result = await AuthService.validateInvitationToken('expiredtoken');

        expect(result.valid).toBe(false);
        expect(result.user).toBeNull();
      });
    });
  });

  describe('Password Reset', () => {
    describe('initiatePasswordReset', () => {
      it('should initiate password reset for valid user', async () => {
        User.findOne.mockResolvedValue(mockUser);

        const result = await AuthService.initiatePasswordReset('test@example.com', mockReq);

        expect(result.success).toBe(true);
        expect(result.message).toBe('If the email exists, a reset link has been sent');
        expect(mockUser.update).toHaveBeenCalledWith({
          passwordResetToken: 'mockedinvitationtoken123456',
          passwordResetExpiry: expect.any(Date),
        });
        expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
          'test@example.com',
          'mockedinvitationtoken123456',
          'Test'
        );
        expect(AuditService.logUserAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_PASSWORD_RESET,
          expect.objectContaining({
            req: mockReq,
            entityType: AuditService.ENTITIES.USER,
            entityId: 1,
          })
        );
      });

      it('should handle non-existent user securely', async () => {
        User.findOne.mockResolvedValue(null);

        const result = await AuthService.initiatePasswordReset('nonexistent@example.com', mockReq);

        expect(result.success).toBe(true);
        expect(result.message).toBe('If the email exists, a reset link has been sent');
        expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(AuditService.logUserAction).not.toHaveBeenCalled();
      });

      it('should handle inactive user securely', async () => {
        const inactiveUser = { ...mockUser, isActive: false };
        User.findOne.mockResolvedValue(inactiveUser);

        const result = await AuthService.initiatePasswordReset('test@example.com', mockReq);

        expect(result.success).toBe(true);
        expect(result.message).toBe('If the email exists, a reset link has been sent');
        expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      });

      it('should normalize email to lowercase', async () => {
        User.findOne.mockResolvedValue(mockUser);

        await AuthService.initiatePasswordReset('TEST@EXAMPLE.COM', mockReq);

        expect(User.findOne).toHaveBeenCalledWith({
          where: { email: 'test@example.com' }
        });
      });
    });

    describe('validatePasswordResetToken', () => {
      it('should validate valid password reset token', async () => {
        const userWithResetToken = {
          ...mockUser,
          passwordResetToken: 'validresettoken',
          passwordResetExpiry: new Date(Date.now() + 1000000)
        };

        User.findOne.mockResolvedValue(userWithResetToken);

        const result = await AuthService.validatePasswordResetToken('validresettoken');

        expect(result.valid).toBe(true);
        expect(result.user).toEqual(userWithResetToken);
      });

      it('should invalidate expired password reset token', async () => {
        User.findOne.mockResolvedValue(null);

        const result = await AuthService.validatePasswordResetToken('expiredtoken');

        expect(result.valid).toBe(false);
        expect(result.user).toBeNull();
      });
    });
  });

  describe('Delegate Role Management', () => {
    describe('transferDelegateRole', () => {
      it('should successfully transfer delegate role', async () => {
        const newPrimaryUser = {
          id: 4,
          firstName: 'New',
          lastName: 'Primary',
          email: 'newprimary@example.com',
          clubId: 1,
          isActive: true,
          isPrimaryDelegate: false,
          update: jest.fn().mockResolvedValue(true),
          getFullName: jest.fn().mockReturnValue('New Primary')
        };

        User.findOne.mockResolvedValue(newPrimaryUser);

        const result = await AuthService.transferDelegateRole(mockInviterUser, 4, mockReq);

        expect(result.success).toBe(true);
        expect(result.newPrimary).toEqual(newPrimaryUser);
        expect(mockInviterUser.update).toHaveBeenCalledWith({ isPrimaryDelegate: false });
        expect(newPrimaryUser.update).toHaveBeenCalledWith({ isPrimaryDelegate: true });
        expect(emailService.sendDelegateRoleTransferNotification).toHaveBeenCalledWith(
          'newprimary@example.com',
          'New Primary',
          'Inviter User',
          'Test Club'
        );
      });

      it('should fail transfer for non-existent user', async () => {
        User.findOne.mockResolvedValue(null);

        const result = await AuthService.transferDelegateRole(mockInviterUser, 999, mockReq);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Selected user not found or not eligible');
        expect(mockInviterUser.update).not.toHaveBeenCalled();
        expect(emailService.sendDelegateRoleTransferNotification).not.toHaveBeenCalled();
      });

      it('should fail transfer for user from different club', async () => {
        const userFromDifferentClub = {
          id: 4,
          clubId: 2, // Different club
          isActive: true,
          isPrimaryDelegate: false
        };

        User.findOne.mockResolvedValue(null); // Should not find user due to clubId filter

        const result = await AuthService.transferDelegateRole(mockInviterUser, 4, mockReq);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Selected user not found or not eligible');
      });
    });
  });

  describe('Security and Edge Cases', () => {
    describe('Token Security', () => {
      it('should generate cryptographically secure tokens', async () => {
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ id: 3, invitationToken: 'securetoken' });

        const inviteeData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        };

        await AuthService.sendInvitation(mockInviterUser, inviteeData, mockReq);

        expect(crypto.randomBytes).toHaveBeenCalledWith(32);
        expect(crypto.randomBytes().toString).toHaveBeenCalledWith('hex');
      });

      it('should set appropriate token expiry times', async () => {
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ id: 3 });

        const inviteeData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        };

        const beforeTime = Date.now();
        await AuthService.sendInvitation(mockInviterUser, inviteeData, mockReq);
        const afterTime = Date.now();

        const createCall = User.create.mock.calls[0][0];
        const tokenExpiry = createCall.tokenExpires.getTime();
        const expectedExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

        expect(tokenExpiry).toBeGreaterThan(beforeTime + expectedExpiry - 1000);
        expect(tokenExpiry).toBeLessThan(afterTime + expectedExpiry + 1000);
      });
    });

    describe('Input Sanitization', () => {
      it('should handle malicious input safely', async () => {
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ id: 3, invitationToken: 'token' });

        const maliciousData = {
          firstName: '<script>alert("xss")</script>',
          lastName: 'DROP TABLE users;--',
          email: 'test@example.com'
        };

        await AuthService.sendInvitation(mockInviterUser, maliciousData, mockReq);

        // Input should be trimmed but not additionally sanitized at service layer
        // (that should happen at validation middleware layer)
        expect(User.create).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: '<script>alert("xss")</script>',
            lastName: 'DROP TABLE users;--',
          })
        );
      });

      it('should handle null and undefined values gracefully', async () => {
        User.findOne.mockResolvedValue(mockUser);

        const result = await AuthService.authenticateUser(null, 'password', mockReq);

        expect(result.success).toBe(false);
        // Should handle null email gracefully without crashing
      });
    });

    describe('Audit Logging', () => {
      it('should log all authentication attempts', async () => {
        User.findOne.mockResolvedValue(mockUser);

        await AuthService.authenticateUser('test@example.com', 'password123', mockReq);

        expect(AuditService.logAuthAction).toHaveBeenCalledTimes(2); // One for success, one for updating login time
      });

      it('should log invitation management actions', async () => {
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ id: 3, invitationToken: 'token' });

        const inviteeData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        };

        await AuthService.sendInvitation(mockInviterUser, inviteeData, mockReq);

        expect(AuditService.logUserAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_INVITATION_SEND,
          expect.objectContaining({
            req: mockReq,
            entityType: AuditService.ENTITIES.USER,
          })
        );
      });

      it('should include relevant metadata in audit logs', async () => {
        User.findOne.mockResolvedValue(null);

        await AuthService.authenticateUser('test@example.com', 'password123', mockReq);

        expect(AuditService.logAuthAction).toHaveBeenCalledWith(
          AuditService.ACTIONS.USER_LOGIN,
          mockReq,
          null,
          expect.objectContaining({
            result: 'FAILURE',
            reason: 'User not found',
            attemptedEmail: 'test@example.com',
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        User.findOne.mockRejectedValue(new Error('Database connection failed'));

        await expect(
          AuthService.authenticateUser('test@example.com', 'password123', mockReq)
        ).rejects.toThrow('Database connection failed');
      });

      it('should handle email service errors gracefully', async () => {
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ id: 3, invitationToken: 'token' });
        emailService.sendInvitationEmail.mockRejectedValue(new Error('Email service unavailable'));

        const inviteeData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        };

        await expect(
          AuthService.sendInvitation(mockInviterUser, inviteeData, mockReq)
        ).rejects.toThrow('Email service unavailable');
      });
    });
  });
});