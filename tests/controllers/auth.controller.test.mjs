/**
 * Authentication Controller Unit Tests
 * 
 * Comprehensive test suite for authentication controller following security-first principles
 * and strict MVC architecture. Tests cover login, registration, invitation management,
 * and user profile updates with full security validation.
 * 
 * Test execution order: Model -> Service -> Controller (as per Unit Test Plan)
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Op } from 'sequelize';

// Mock bcrypt with Vitest
const mockBcrypt = {
  compare: vi.fn(),
  hash: vi.fn(),
  genSalt: vi.fn()
};

// Mock crypto module
const mockCrypto = {
  randomBytes: vi.fn(),
};

// Create comprehensive mocks for all dependencies
const mockUser = {
  findOne: vi.fn(),
  findByPk: vi.fn(),
  create: vi.fn(),
};

const mockClub = {
  findByPk: vi.fn(),
};

const mockValidationResult = vi.fn();

// Create mock services that will be properly intercepted
const mockEmailService = {
  sendInvitationEmail: vi.fn(),
  sendDelegateRoleTransferNotification: vi.fn(),
};

const mockAuditService = {
  logAuthAction: vi.fn(),
  logUserAction: vi.fn(),
  ACTIONS: {
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT', 
    USER_REGISTER: 'USER_REGISTER',
    USER_INVITATION_SEND: 'USER_INVITATION_SEND',
    USER_INVITATION_ACCEPT: 'USER_INVITATION_ACCEPT',
  },
  ENTITIES: {
    USER: 'USER',
  },
  sanitizeData: vi.fn((data) => data),
};

// Create transaction mock
const mockTransaction = {
  commit: vi.fn().mockResolvedValue(),
  rollback: vi.fn().mockResolvedValue(),
};

const mockSequelize = {
  transaction: vi.fn().mockResolvedValue(mockTransaction),
};

const mockWrapControllers = vi.fn((controllers) => controllers);

// Mock modules using Vitest
vi.mock('bcrypt', () => ({
  default: mockBcrypt,
  ...mockBcrypt
}));

vi.mock('crypto', () => ({
  default: mockCrypto,
  ...mockCrypto
}));

vi.mock('/models/index.mjs', () => ({
  User: mockUser,
  Club: mockClub,
}));

vi.mock('express-validator', () => ({
  validationResult: mockValidationResult,
}));

vi.mock('/services/email/InvitationEmailService.mjs', () => ({
  default: {
    sendDelegateInvitation: vi.fn().mockResolvedValue({ success: true }),
    sendDelegateRoleTransfer: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('/services/auditService.mjs', () => ({
  default: mockAuditService,
}));

vi.mock('/config/database.mjs', () => ({
  sequelize: mockSequelize,
}));

vi.mock('/middleware/asyncHandler.mjs', () => ({ 
  wrapControllers: mockWrapControllers 
}));

// Import controller functions after mocking
const {
  showLoginForm,
  loginUser,
  showRegisterForm,
  registerUser,
  showInvitationForm,
  acceptInvitation,
  logoutUser,
  sendInvitation,
  transferDelegateRole,
  updatePhoneNumber,
  updateName,
  updateEmail,
} = await import('/controllers/auth.controller.mjs');

// Import the email service to access the mocked methods
const InvitationEmailService = (await import('/services/email/InvitationEmailService.mjs')).default;

// Create authController object for test compatibility
const authController = {
  showLoginForm,
  loginUser,
  showRegisterForm,
  registerUser,
  showInvitationForm,
  acceptInvitation,
  logoutUser,
  sendInvitation,
  transferDelegateRole,
  updatePhoneNumber,
  updateName,
  updateEmail,
};

describe('Authentication Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset transaction mock
    mockTransaction.commit.mockResolvedValue();
    mockTransaction.rollback.mockResolvedValue();
    mockSequelize.transaction.mockResolvedValue(mockTransaction);
    
    // Create fresh mock objects for each test
    mockReq = {
      body: {},
      params: {},
      user: null,
      flash: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    };
    
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    
    mockNext = vi.fn();

    // Setup default mock implementations
    mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    mockAuditService.logAuthAction.mockResolvedValue();
    mockAuditService.logUserAction.mockResolvedValue();
    mockEmailService.sendInvitationEmail.mockResolvedValue();
    mockEmailService.sendDelegateRoleTransferNotification.mockResolvedValue();
  });

  describe('Login Functionality', () => {
    describe('showLoginForm', () => {
      test('should render login form with correct title', () => {
        // Act
        authController.showLoginForm(mockReq, mockRes);

        // Assert
        expect(mockRes.render).toHaveBeenCalledWith('auth/login', {
          title: 'Login',
        });
      });
    });

    describe('loginUser', () => {
      test('should handle successful login with valid credentials', async () => {
        // Arrange
        const mockUserData = {
          id: 1,
          email: 'test@example.com',
          passwordHash: '$2b$12$hashedpassword',
          isActive: true,
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.body = { email: 'test@example.com', password: 'password123' };
        mockUser.findOne.mockResolvedValue(mockUserData);
        mockBcrypt.compare.mockResolvedValue(true);
        mockReq.login.mockImplementation((user, callback) => callback(null));

        // Act
        await authController.loginUser(mockReq, mockRes, mockNext);

        // Assert
        expect(mockUser.findOne).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
          include: [{ model: mockClub, as: 'club' }],
        });
        expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', '$2b$12$hashedpassword');
        expect(mockUserData.update).toHaveBeenCalledWith({ lastLoginAt: expect.any(Date) });
        expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_LOGIN,
          mockReq,
          mockUserData,
          { result: 'SUCCESS' }
        );
        expect(mockReq.login).toHaveBeenCalledWith(mockUserData, expect.any(Function));
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should handle validation errors', async () => {
        // Arrange
        const validationErrors = [{ msg: 'Email is required' }];
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => validationErrors,
        });

        // Act
        await authController.loginUser(mockReq, mockRes, mockNext);

        // Assert
        expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_LOGIN,
          mockReq,
          null,
          {
            result: 'FAILURE',
            reason: 'Validation failed',
            validationErrors,
          }
        );
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Email is required');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle user not found', async () => {
        // Arrange
        mockReq.body = { email: 'notfound@example.com', password: 'password123' };
        mockUser.findOne.mockResolvedValue(null);

        // Act
        await authController.loginUser(mockReq, mockRes, mockNext);

        // Assert
        expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_LOGIN,
          mockReq,
          null,
          {
            result: 'FAILURE',
            reason: 'User not found',
            attemptedEmail: 'notfound@example.com',
          }
        );
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Invalid email or password.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle inactive user', async () => {
        // Arrange
        const inactiveUser = {
          id: 1,
          email: 'inactive@example.com',
          isActive: false,
        };

        mockReq.body = { email: 'inactive@example.com', password: 'password123' };
        mockUser.findOne.mockResolvedValue(inactiveUser);

        // Act
        await authController.loginUser(mockReq, mockRes, mockNext);

        // Assert
        expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_LOGIN,
          mockReq,
          null,
          {
            result: 'FAILURE',
            reason: 'User inactive',
            attemptedEmail: 'inactive@example.com',
          }
        );
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Invalid email or password.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle invalid password', async () => {
        // Arrange
        const mockUserData = {
          id: 1,
          email: 'test@example.com',
          passwordHash: '$2b$12$hashedpassword',
          isActive: true,
        };

        mockReq.body = { email: 'test@example.com', password: 'wrongpassword' };
        mockUser.findOne.mockResolvedValue(mockUserData);
        mockBcrypt.compare.mockResolvedValue(false);

        // Act
        await authController.loginUser(mockReq, mockRes, mockNext);

        // Assert
        expect(mockBcrypt.compare).toHaveBeenCalledWith('wrongpassword', '$2b$12$hashedpassword');
        expect(mockAuditService.logAuthAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_LOGIN,
          mockReq,
          mockUserData,
          {
            result: 'FAILURE',
            reason: 'Invalid password',
          }
        );
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Invalid email or password.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle login session creation error', async () => {
        // Arrange
        const mockUserData = {
          id: 1,
          email: 'test@example.com',
          passwordHash: '$2b$12$hashedpassword',
          isActive: true,
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.body = { email: 'test@example.com', password: 'password123' };
        mockUser.findOne.mockResolvedValue(mockUserData);
        mockBcrypt.compare.mockResolvedValue(true);
        mockReq.login.mockImplementation((user, callback) => callback(new Error('Session error')));

        // Act
        await authController.loginUser(mockReq, mockRes, mockNext);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Login failed. Please try again.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should normalize email to lowercase', async () => {
        // Arrange
        const mockUserData = {
          id: 1,
          email: 'test@example.com',
          passwordHash: '$2b$12$hashedpassword',
          isActive: true,
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.body = { email: 'TEST@EXAMPLE.COM', password: 'password123' };
        mockUser.findOne.mockResolvedValue(mockUserData);
        mockBcrypt.compare.mockResolvedValue(true);
        mockReq.login.mockImplementation((user, callback) => callback(null));

        // Act
        await authController.loginUser(mockReq, mockRes, mockNext);

        // Assert
        expect(mockUser.findOne).toHaveBeenCalledWith({
          where: { email: 'test@example.com' }, // Should be normalized to lowercase
          include: [{ model: mockClub, as: 'club' }],
        });
      });
    });
  });

  describe('Registration Functionality', () => {
    describe('showRegisterForm', () => {
      test('should render registration form with correct title', async () => {
        // Act
        await authController.showRegisterForm(mockReq, mockRes);

        // Assert
        expect(mockRes.render).toHaveBeenCalledWith('auth/register', {
          title: 'Create Account',
        });
      });
    });

    describe('registerUser', () => {
      test('should handle successful user registration', async () => {
        // Arrange
        const newUser = {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phoneNumber: '0412345678',
        };

        mockReq.body = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123',
          phoneNumber: '0412345678',
        };

        mockUser.findOne.mockResolvedValue(null); // User doesn't exist
        mockUser.create.mockResolvedValue(newUser);

        // Act
        await authController.registerUser(mockReq, mockRes);

        // Assert
        expect(mockUser.findOne).toHaveBeenCalledWith({
          where: { email: 'john@example.com' },
        });
        expect(mockUser.create).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          passwordHash: 'password123',
          phoneNumber: '0412345678',
          clubId: null,
          isPrimaryDelegate: false,
          isActive: true,
        });
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_REGISTER,
          expect.objectContaining({
            req: mockReq,
            entityType: mockAuditService.ENTITIES.USER,
            entityId: 1,
          })
        );
        expect(mockReq.flash).toHaveBeenCalledWith(
          'success_msg',
          'Registration successful! You can now log in and create or join a club from your dashboard.'
        );
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle validation errors', async () => {
        // Arrange
        const validationErrors = [{ msg: 'First name is required' }];
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => validationErrors,
        });

        mockReq.body = { firstName: '', lastName: 'Doe' };

        // Act
        await authController.registerUser(mockReq, mockRes);

        // Assert
        expect(mockRes.render).toHaveBeenCalledWith('auth/register', {
          title: 'Create Account',
          errors: validationErrors,
          formData: mockReq.body,
        });
      });

      test('should handle existing user registration attempt', async () => {
        // Arrange
        const existingUser = { id: 1, email: 'existing@example.com' };
        
        mockReq.body = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'existing@example.com',
          password: 'password123',
        };

        mockUser.findOne.mockResolvedValue(existingUser);

        // Act
        await authController.registerUser(mockReq, mockRes);

        // Assert
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_REGISTER,
          expect.objectContaining({
            req: mockReq,
            entityType: mockAuditService.ENTITIES.USER,
            result: 'FAILURE',
            errorMessage: 'Email already exists',
            metadata: { attemptedEmail: 'existing@example.com' },
          })
        );
        expect(mockRes.render).toHaveBeenCalledWith('auth/register', {
          title: 'Create Account',
          errors: [{ msg: 'User with this email already exists' }],
          formData: mockReq.body,
        });
      });

      test('should trim whitespace from name fields', async () => {
        // Arrange
        const newUser = {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        };

        mockReq.body = {
          firstName: '  John  ',
          lastName: '  Doe  ',
          email: 'john@example.com',
          password: 'password123',
        };

        mockUser.findOne.mockResolvedValue(null);
        mockUser.create.mockResolvedValue(newUser);

        // Act
        await authController.registerUser(mockReq, mockRes);

        // Assert
        expect(mockUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
          })
        );
      });

      test('should handle null phone number', async () => {
        // Arrange
        const newUser = {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phoneNumber: null,
        };

        mockReq.body = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123',
          phoneNumber: '',
        };

        mockUser.findOne.mockResolvedValue(null);
        mockUser.create.mockResolvedValue(newUser);

        // Act
        await authController.registerUser(mockReq, mockRes);

        // Assert
        expect(mockUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: null,
          })
        );
      });
    });
  });

  describe('Logout Functionality', () => {
    describe('logoutUser', () => {
      test('should handle successful logout', async () => {
        // Arrange
        const mockUserData = {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
        };

        mockReq.user = mockUserData;
        mockReq.logout.mockImplementation((callback) => callback(null));

        // Act
        await authController.logoutUser(mockReq, mockRes);

        // Assert
        expect(mockReq.logout).toHaveBeenCalledWith(expect.any(Function));
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_LOGOUT,
          expect.objectContaining({
            req: mockReq,
            entityType: mockAuditService.ENTITIES.USER,
            entityId: 1,
            metadata: { userName: 'John Doe' },
          })
        );
        expect(mockReq.flash).toHaveBeenCalledWith('success_msg', 'You have been logged out successfully.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/');
      });

      test('should handle logout error', async () => {
        // Arrange
        const mockUserData = { id: 1, firstName: 'John', lastName: 'Doe' };
        mockReq.user = mockUserData;
        mockReq.logout.mockImplementation((callback) => callback(new Error('Logout error')));

        // Act
        await authController.logoutUser(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'An error occurred during logout.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/');
      });

      test('should handle logout when user is null', async () => {
        // Arrange
        mockReq.user = null;
        mockReq.logout.mockImplementation((callback) => callback(null));

        // Act
        await authController.logoutUser(mockReq, mockRes);

        // Assert
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_LOGOUT,
          expect.objectContaining({
            entityId: null,
            metadata: { userName: 'Unknown' },
          })
        );
      });
    });
  });

  describe('Invitation Management', () => {
    describe('showInvitationForm', () => {
      test('should render invitation form for valid token', async () => {
        // Arrange
        const invitedUser = {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          isActive: false,
          club: { clubName: 'Test Club' },
        };

        mockReq.params = { token: 'validtoken123' };
        mockUser.findOne.mockResolvedValue(invitedUser);

        // Act
        await authController.showInvitationForm(mockReq, mockRes);

        // Assert
        expect(mockUser.findOne).toHaveBeenCalledWith({
          where: {
            invitationToken: 'validtoken123',
            tokenExpires: { [Op.gt]: expect.any(Date) },
            isActive: false,
          },
          include: [{ model: mockClub, as: 'club' }],
        });
        expect(mockRes.render).toHaveBeenCalledWith('auth/accept-invitation', {
          title: 'Accept Invitation',
          invitedUser,
          token: 'validtoken123',
        });
      });

      test('should handle missing token', async () => {
        // Arrange
        mockReq.params = {};

        // Act
        await authController.showInvitationForm(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Invalid invitation link.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle invalid or expired token', async () => {
        // Arrange
        mockReq.params = { token: 'invalidtoken' };
        mockUser.findOne.mockResolvedValue(null);

        // Act
        await authController.showInvitationForm(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Invalid or expired invitation link.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });
    });

    describe('acceptInvitation', () => {
      test('should handle successful invitation acceptance', async () => {
        // Arrange
        const invitedUser = {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          isActive: false,
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.params = { token: 'validtoken123' };
        mockReq.body = {
          firstName: 'Jane',
          lastName: 'Smith',
          password: 'newpassword123',
        };

        mockUser.findOne.mockResolvedValue(invitedUser);
        mockBcrypt.hash.mockResolvedValue('hashedpassword');

        // Act
        await authController.acceptInvitation(mockReq, mockRes);

        // Assert
        expect(invitedUser.update).toHaveBeenCalledWith({
          firstName: 'Jane',
          lastName: 'Smith',
          passwordHash: 'newpassword123',
          isActive: true,
          invitationToken: null,
          tokenExpires: null,
        });
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_INVITATION_ACCEPT,
          expect.objectContaining({
            req: mockReq,
            entityType: mockAuditService.ENTITIES.USER,
            entityId: 2,
          })
        );
        expect(mockReq.flash).toHaveBeenCalledWith('success_msg', 'Account activated successfully! You can now log in.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle validation errors', async () => {
        // Arrange
        const validationErrors = [{ msg: 'Password is required' }];
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => validationErrors,
        });

        // Act
        await authController.acceptInvitation(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Password is required');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle invalid invitation token', async () => {
        // Arrange
        mockReq.params = { token: 'invalidtoken' };
        mockUser.findOne.mockResolvedValue(null);

        // Act
        await authController.acceptInvitation(mockReq, mockRes);

        // Assert
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_INVITATION_ACCEPT,
          expect.objectContaining({
            result: 'FAILURE',
            errorMessage: 'Invalid or expired invitation link',
            metadata: { token: 'invalidtoken' },
          })
        );
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Invalid or expired invitation link.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });
    });

    describe('sendInvitation', () => {
      test('should handle successful invitation sending', async () => {
        // Arrange
        const primaryDelegate = {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          clubId: 1,
          isPrimaryDelegate: true,
          club: { clubName: 'Test Club' },
        };

        const newUser = {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          clubId: 1,
        };

        mockReq.user = primaryDelegate;
        mockReq.body = {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        };

        mockUser.findOne.mockResolvedValue(null); // User doesn't exist
        mockUser.create.mockResolvedValue(newUser);
        mockCrypto.randomBytes.mockReturnValue(Buffer.from('randomtoken123', 'hex'));

        // Act
        await authController.sendInvitation(mockReq, mockRes);

        // Assert
        expect(mockUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            clubId: 1,
            isPrimaryDelegate: false,
            isActive: false,
            invitationToken: expect.any(String),
            tokenExpires: expect.any(Date),
          })
        );
        expect(InvitationEmailService.sendDelegateInvitation).toHaveBeenCalled();
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_INVITATION_SEND,
          expect.objectContaining({
            entityId: 2,
          })
        );
        expect(mockReq.flash).toHaveBeenCalledWith(
          'success_msg',
          'Invitation sent to jane@example.com. They will receive an email with instructions to activate their account.'
        );
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should reject invitation from non-primary delegate', async () => {
        // Arrange
        mockReq.user = { isPrimaryDelegate: false };

        // Act
        await authController.sendInvitation(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Only primary delegates can send invitations.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should handle existing user invitation attempt', async () => {
        // Arrange
        const primaryDelegate = { id: 1, isPrimaryDelegate: true };
        const existingUser = { id: 2, email: 'existing@example.com' };

        mockReq.user = primaryDelegate;
        mockReq.body = { email: 'existing@example.com' };
        mockUser.findOne.mockResolvedValue(existingUser);

        // Act
        await authController.sendInvitation(mockReq, mockRes);

        // Assert
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_INVITATION_SEND,
          expect.objectContaining({
            result: 'FAILURE',
            errorMessage: 'User already exists',
          })
        );
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'A user with this email already exists.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('User Profile Updates', () => {
    describe('updatePhoneNumber', () => {
      test('should update phone number successfully', async () => {
        // Arrange
        const mockUserData = {
          id: 1,
          email: 'test@example.com',
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.user = mockUserData;
        mockReq.body = { phoneNumber: '0412345678' };

        // Act
        await authController.updatePhoneNumber(mockReq, mockRes);

        // Assert
        expect(mockUserData.update).toHaveBeenCalledWith({
          phoneNumber: '0412345678',
        });
        expect(mockReq.flash).toHaveBeenCalledWith('success_msg', 'Phone number updated successfully!');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should trim whitespace from phone number', async () => {
        // Arrange
        const mockUserData = {
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.user = mockUserData;
        mockReq.body = { phoneNumber: '  0412345678  ' };

        // Act
        await authController.updatePhoneNumber(mockReq, mockRes);

        // Assert
        expect(mockUserData.update).toHaveBeenCalledWith({
          phoneNumber: '0412345678',
        });
      });

      test('should handle null phone number', async () => {
        // Arrange
        const mockUserData = {
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.user = mockUserData;
        mockReq.body = { phoneNumber: '' };

        // Act
        await authController.updatePhoneNumber(mockReq, mockRes);

        // Assert
        expect(mockUserData.update).toHaveBeenCalledWith({
          phoneNumber: null,
        });
      });
    });

    describe('updateName', () => {
      test('should update name successfully', async () => {
        // Arrange
        const mockUserData = {
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.user = mockUserData;
        mockReq.body = {
          firstName: 'John',
          lastName: 'Smith',
        };

        // Act
        await authController.updateName(mockReq, mockRes);

        // Assert
        expect(mockUserData.update).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Smith',
        });
        expect(mockReq.flash).toHaveBeenCalledWith('success_msg', 'Name updated successfully!');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should handle validation errors', async () => {
        // Arrange
        const validationErrors = [{ msg: 'First name is required' }];
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => validationErrors,
        });

        // Act
        await authController.updateName(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Please provide valid first and last names.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should trim whitespace from names', async () => {
        // Arrange
        const mockUserData = {
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.user = mockUserData;
        mockReq.body = {
          firstName: '  John  ',
          lastName: '  Smith  ',
        };

        // Act
        await authController.updateName(mockReq, mockRes);

        // Assert
        expect(mockUserData.update).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Smith',
        });
      });
    });

    describe('updateEmail', () => {
      test('should update email successfully with valid password', async () => {
        // Arrange
        const mockUserData = {
          id: 1,
          checkPassword: vi.fn().mockResolvedValue(true),
          update: vi.fn().mockResolvedValue(),
        };

        mockReq.user = mockUserData;
        mockReq.body = {
          email: 'newemail@example.com',
          currentPassword: 'currentpass123',
        };

        mockUser.findOne.mockResolvedValue(null); // Email not in use

        // Act
        await authController.updateEmail(mockReq, mockRes);

        // Assert
        expect(mockUserData.checkPassword).toHaveBeenCalledWith('currentpass123');
        expect(mockUser.findOne).toHaveBeenCalledWith({
          where: {
            email: 'newemail@example.com',
            id: { [Op.ne]: 1 },
          },
        });
        expect(mockUserData.update).toHaveBeenCalledWith({
          email: 'newemail@example.com',
        });
        expect(mockReq.flash).toHaveBeenCalledWith(
          'success_msg',
          'Email address updated successfully! Please use your new email to log in next time.'
        );
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should handle validation errors', async () => {
        // Arrange
        const validationErrors = [{ msg: 'Email is required' }];
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => validationErrors,
        });

        // Act
        await authController.updateEmail(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Please provide a valid email address and current password.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should handle incorrect current password', async () => {
        // Arrange
        const mockUserData = {
          checkPassword: vi.fn().mockResolvedValue(false),
        };

        mockReq.user = mockUserData;
        mockReq.body = {
          email: 'newemail@example.com',
          currentPassword: 'wrongpassword',
        };

        // Act
        await authController.updateEmail(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Current password is incorrect. Please try again.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should handle email already in use', async () => {
        // Arrange
        const mockUserData = {
          id: 1,
          checkPassword: vi.fn().mockResolvedValue(true),
        };

        const existingUser = { id: 2, email: 'existing@example.com' };

        mockReq.user = mockUserData;
        mockReq.body = {
          email: 'existing@example.com',
          currentPassword: 'currentpass123',
        };

        mockUser.findOne.mockResolvedValue(existingUser);

        // Act
        await authController.updateEmail(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'This email address is already in use by another account.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Delegate Role Transfer', () => {
    describe('transferDelegateRole', () => {
      test('should transfer delegate role successfully', async () => {
        // Arrange
        const currentDelegate = {
          id: 1,
          isPrimaryDelegate: true,
          clubId: 1,
          getFullName: () => 'John Doe',
          update: vi.fn().mockResolvedValue(),
        };

        const newDelegate = {
          id: 2,
          email: 'newdelegate@example.com',
          getFullName: () => 'Jane Smith',
          update: vi.fn().mockResolvedValue(),
        };

        const club = { clubName: 'Test Club' };

        mockReq.user = currentDelegate;
        mockReq.body = { newPrimaryUserId: 2 };

        mockUser.findOne.mockResolvedValue(newDelegate);
        mockClub.findByPk.mockResolvedValue(club);

        // Act
        await authController.transferDelegateRole(mockReq, mockRes);

        // Assert
        expect(currentDelegate.update).toHaveBeenCalledWith(
          { isPrimaryDelegate: false },
          { transaction: mockTransaction }
        );
        expect(newDelegate.update).toHaveBeenCalledWith(
          { isPrimaryDelegate: true },
          { transaction: mockTransaction }
        );
        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(InvitationEmailService.sendDelegateRoleTransfer).toHaveBeenCalledWith(
          'newdelegate@example.com',
          'Jane Smith',
          'John Doe',
          'Test Club'
        );
        expect(mockReq.flash).toHaveBeenCalledWith(
          'success_msg',
          'Primary delegate role successfully transferred to Jane Smith.'
        );
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should reject transfer from non-primary delegate', async () => {
        // Arrange
        mockReq.user = { isPrimaryDelegate: false };

        // Act
        await authController.transferDelegateRole(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Only primary delegates can transfer their role.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should handle validation errors', async () => {
        // Arrange
        const validationErrors = [{ msg: 'User selection is required' }];
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => validationErrors,
        });

        mockReq.user = { isPrimaryDelegate: true };

        // Act
        await authController.transferDelegateRole(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Please select a valid user to transfer the role to.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should handle user not found or not eligible', async () => {
        // Arrange
        mockReq.user = { isPrimaryDelegate: true, clubId: 1 };
        mockReq.body = { newPrimaryUserId: 999 };
        mockUser.findOne.mockResolvedValue(null);

        // Act
        await authController.transferDelegateRole(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 'Selected user not found or not eligible for primary delegate role.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
      });

      test('should handle transaction rollback on error', async () => {
        // Arrange
        const currentDelegate = {
          id: 1,
          isPrimaryDelegate: true,
          clubId: 1,
          update: vi.fn().mockRejectedValue(new Error('Database error')),
        };

        const newDelegate = { id: 2 };
        
        mockReq.user = currentDelegate;
        mockReq.body = { newPrimaryUserId: 2 };
        mockUser.findOne.mockResolvedValue(newDelegate);

        // Act & Assert
        await expect(authController.transferDelegateRole(mockReq, mockRes)).rejects.toThrow('Database error');
        expect(mockTransaction.rollback).toHaveBeenCalled();
      });
    });
  });
});