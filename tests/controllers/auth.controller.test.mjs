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
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mocked-hash-value')
  }))
};

// Create comprehensive mocks for all dependencies
const mockUser = {
  findOne: vi.fn(),
  findByPk: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
};

const mockClub = {
  findByPk: vi.fn(),
};

const mockValidationResult = vi.fn();

// Create mock services that will be properly intercepted
const mockEmailService = {
  sendInvitationEmail: vi.fn(),
  sendDelegateRoleTransferNotification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
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
    USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
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

vi.mock('/services/email/AuthEmailService.mjs', () => ({
  default: {
    sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('/services/auditService.mjs', () => ({
  default: mockAuditService,
}));

// Mock the failureCounter store so we can assert calls
const mockFailureCounter = {
  setWindowMs: vi.fn(),
  incrementFailure: vi.fn(),
  resetFailures: vi.fn(),
  getFailureCount: vi.fn().mockReturnValue(0),
  _debug: vi.fn().mockReturnValue({ windowMs: 600000, store: [] }),
};

vi.mock('/middleware/failureCounterStore.mjs', () => ({
  default: mockFailureCounter,
  failureCounter: mockFailureCounter,
  ...mockFailureCounter,
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
  showForgotPasswordForm,
  initiateForgotPassword,
  showResetPasswordForm,
  resetPasswordWithToken,
} = await import('../../controllers/auth.controller.mjs');

// Import the email service to access the mocked methods
const InvitationEmailService = (await import('../../services/email/InvitationEmailService.mjs')).default;
const AuthEmailService = (await import('../../services/email/AuthEmailService.mjs')).default;

// Assign the imported mocked service to our mock object
Object.assign(mockEmailService, AuthEmailService);

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
  showForgotPasswordForm,
  initiateForgotPassword,
  showResetPasswordForm,
  resetPasswordWithToken,
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
      csrfToken: vi.fn().mockReturnValue('csrf-token-123'),
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
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

      test('should increment failure counter on validation error', async () => {
        // Arrange
        const validationErrors = [{ msg: 'Email is required' }];
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => validationErrors,
        });

        // Act
        await authController.loginUser(mockReq, mockRes, mockNext);

        // Assert
        expect(mockAuditService.logAuthAction).toHaveBeenCalled();
        expect(mockFailureCounter.incrementFailure).toHaveBeenCalled();
      });

      test('should increment failure counter on invalid password', async () => {
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
        expect(mockAuditService.logAuthAction).toHaveBeenCalled();
        expect(mockFailureCounter.incrementFailure).toHaveBeenCalledWith('test@example.com');
      });

      test('should reset failures on successful login', async () => {
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
        expect(mockAuditService.logAuthAction).toHaveBeenCalled();
        expect(mockFailureCounter.resetFailures).toHaveBeenCalledWith('test@example.com');
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
          isAdmin: false,
        };

        mockReq.body = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123',
          phoneNumber: '0412345678',
        };

        mockUser.count.mockResolvedValue(1); // One existing user
        mockUser.findOne.mockResolvedValue(null); // User doesn't exist
        mockUser.create.mockResolvedValue(newUser);

        // Act
        await authController.registerUser(mockReq, mockRes);

        // Assert
        expect(mockUser.count).toHaveBeenCalled();
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
          isAdmin: false,
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

      test('should automatically grant admin privileges to first registered user', async () => {
        // Arrange
        const newUser = {
          id: 1,
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          phoneNumber: '0412345678',
          isAdmin: true,
        };

        mockReq.body = {
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          password: 'password123',
          phoneNumber: '0412345678',
        };

        mockUser.count.mockResolvedValue(0); // No existing users
        mockUser.findOne.mockResolvedValue(null); // User doesn't exist
        mockUser.create.mockResolvedValue(newUser);

        // Act
        await authController.registerUser(mockReq, mockRes);

        // Assert
        expect(mockUser.count).toHaveBeenCalled();
        expect(mockUser.create).toHaveBeenCalledWith({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          passwordHash: 'password123',
          phoneNumber: '0412345678',
          clubId: null,
          isPrimaryDelegate: false,
          isAdmin: true, // Should be true for first user
          isActive: true,
        });
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_REGISTER,
          expect.objectContaining({
            req: mockReq,
            entityType: mockAuditService.ENTITIES.USER,
            entityId: 1,
            metadata: { adminBootstrap: true, reason: 'First user automatically promoted to admin' },
          })
        );
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_UPDATE,
          expect.objectContaining({
            req: mockReq,
            entityType: mockAuditService.ENTITIES.USER,
            entityId: 1,
            newValues: { isAdmin: true },
            metadata: { 
              adminBootstrap: true, 
              reason: 'First registered user automatically promoted to admin',
              userCount: 1
            },
          })
        );
        expect(mockReq.flash).toHaveBeenCalledWith(
          'success_msg',
          'Registration successful! As the first user, you have been granted administrator privileges. You can now log in and manage the system.'
        );
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should not grant admin privileges to subsequent users', async () => {
        // Arrange
        const newUser = {
          id: 2,
          firstName: 'Regular',
          lastName: 'User',
          email: 'user@example.com',
          phoneNumber: '0412345678',
          isAdmin: false,
        };

        mockReq.body = {
          firstName: 'Regular',
          lastName: 'User',
          email: 'user@example.com',
          password: 'password123',
          phoneNumber: '0412345678',
        };

        mockUser.count.mockResolvedValue(1); // One existing user
        mockUser.findOne.mockResolvedValue(null); // User doesn't exist
        mockUser.create.mockResolvedValue(newUser);

        // Act
        await authController.registerUser(mockReq, mockRes);

        // Assert
        expect(mockUser.count).toHaveBeenCalled();
        expect(mockUser.create).toHaveBeenCalledWith({
          firstName: 'Regular',
          lastName: 'User',
          email: 'user@example.com',
          passwordHash: 'password123',
          phoneNumber: '0412345678',
          clubId: null,
          isPrimaryDelegate: false,
          isAdmin: false, // Should be false for subsequent users
          isActive: true,
        });
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          mockAuditService.ACTIONS.USER_REGISTER,
          expect.objectContaining({
            req: mockReq,
            entityType: mockAuditService.ENTITIES.USER,
            entityId: 2,
            metadata: {}, // No admin bootstrap metadata
          })
        );
        expect(mockReq.flash).toHaveBeenCalledWith(
          'success_msg',
          'Registration successful! You can now log in and create or join a club from your dashboard.'
        );
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
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

  describe('Forgot Password Functionality', () => {
    describe('showForgotPasswordForm', () => {
      test('should render forgot password form with CSRF token', async () => {
        // Arrange
        mockReq.csrfToken = vi.fn().mockReturnValue('csrf-token-123');

        // Act
        await authController.showForgotPasswordForm(mockReq, mockRes);

        // Assert
        expect(mockRes.render).toHaveBeenCalledWith('auth/forgot-password', {
          title: 'Forgot Password',
          csrfToken: 'csrf-token-123'
        });
      });
    });

    describe('initiateForgotPassword', () => {
      beforeEach(() => {
        mockValidationResult.mockReturnValue({ isEmpty: () => true });
        mockCrypto.randomBytes.mockReturnValue(Buffer.from('test-token-bytes'));
        mockReq.csrfToken = vi.fn().mockReturnValue('csrf-token-123');
      });

      test('should handle validation errors', async () => {
        // Arrange
        const validationErrors = [{ msg: 'Invalid email format' }];
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => validationErrors
        });

        // Act
        await authController.initiateForgotPassword(mockReq, mockRes);

        // Assert
        expect(mockRes.render).toHaveBeenCalledWith('auth/forgot-password', {
          title: 'Forgot Password',
          errors: validationErrors,
          formData: mockReq.body,
          csrfToken: 'csrf-token-123'
        });
      });

      test('should successfully initiate password reset for existing user', async () => {
        // Arrange
        mockReq.body = { email: 'user@example.com' };
        const mockUserInstance = {
          id: 1,
          email: 'user@example.com',
          update: vi.fn().mockResolvedValue(),
          getFullName: vi.fn().mockReturnValue('Test User')
        };
        mockUser.findOne.mockResolvedValue(mockUserInstance);

        // Act
        await authController.initiateForgotPassword(mockReq, mockRes);

        // Assert
        expect(mockUser.findOne).toHaveBeenCalledWith({
          where: { 
            email: 'user@example.com',
            isActive: true
          }
        });
        expect(mockUserInstance.update).toHaveBeenCalledWith({
          passwordResetToken: expect.any(String),
          passwordResetExpires: expect.any(Date)
        });
        expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
          'user@example.com',
          expect.any(String),
          'Test User'
        );
        expect(mockReq.flash).toHaveBeenCalledWith('success_msg', 
          'If an account with that email exists, a password reset link has been sent.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle non-existent user gracefully', async () => {
        // Arrange
        mockReq.body = { email: 'nonexistent@example.com' };
        mockUser.findOne.mockResolvedValue(null);

        // Act
        await authController.initiateForgotPassword(mockReq, mockRes);

        // Assert
        expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(mockReq.flash).toHaveBeenCalledWith('success_msg', 
          'If an account with that email exists, a password reset link has been sent.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle email service errors', async () => {
        // Arrange
        mockReq.body = { email: 'user@example.com' };
        const mockUserInstance = {
          id: 1,
          email: 'user@example.com',
          update: vi.fn().mockResolvedValue(),
          getFullName: vi.fn().mockReturnValue('Test User')
        };
        mockUser.findOne.mockResolvedValue(mockUserInstance);
        mockEmailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service error'));

        // Act
        await authController.initiateForgotPassword(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 
          'An error occurred while processing your request. Please try again.');
        expect(mockRes.render).toHaveBeenCalledWith('auth/forgot-password', {
          title: 'Forgot Password',
          formData: mockReq.body,
        });
      });

      test('should handle database errors', async () => {
        // Arrange
        mockReq.body = { email: 'user@example.com' };
        mockUser.findOne.mockRejectedValue(new Error('Database error'));

        // Act
        await authController.initiateForgotPassword(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 
          'An error occurred while processing your request. Please try again.');
        expect(mockRes.render).toHaveBeenCalledWith('auth/forgot-password', {
          csrfToken: 'csrf-token-123',
          title: 'Forgot Password',
          formData: mockReq.body
        });
      });
    });

    describe('showResetPasswordForm', () => {
      beforeEach(() => {
        mockReq.params = { token: 'valid-reset-token' };
        mockReq.csrfToken = vi.fn().mockReturnValue('csrf-token-123');
      });

      test('should render reset form for valid token', async () => {
        // Arrange
        const mockUserInstance = {
          id: 1,
          passwordResetToken: 'valid-reset-token',
          passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour from now
        };
        mockUser.findOne.mockResolvedValue(mockUserInstance);

        // Act
        await authController.showResetPasswordForm(mockReq, mockRes);

        // Assert
        expect(mockUser.findOne).toHaveBeenCalledWith({
          where: {
            passwordResetToken: 'mocked-hash-value',
            passwordResetExpires: { [Op.gt]: expect.any(Date) },
            isActive: true
          }
        });
        expect(mockRes.render).toHaveBeenCalledWith('auth/reset-password', {
          token: 'valid-reset-token',
          csrfToken: 'csrf-token-123',
          title: 'Reset Password'
        });
      });

      test('should redirect for invalid or expired token', async () => {
        // Arrange
        mockUser.findOne.mockResolvedValue(null);

        // Act
        await authController.showResetPasswordForm(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 
          'Password reset link is invalid or has expired.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/forgot-password');
      });

      test('should handle database errors', async () => {
        // Arrange
        mockUser.findOne.mockRejectedValue(new Error('Database error'));

        // Act
        await authController.showResetPasswordForm(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 
          'An error occurred while processing your request. Please try again.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/forgot-password');
      });
    });

    describe('resetPasswordWithToken', () => {
      beforeEach(() => {
        mockReq.params = { token: 'valid-reset-token' };
        mockReq.body = { password: 'NewPassword123!', confirmPassword: 'NewPassword123!' };
        mockReq.csrfToken = vi.fn().mockReturnValue('csrf-token-123');
        mockValidationResult.mockReturnValue({ isEmpty: () => true });
        mockBcrypt.hash.mockResolvedValue('hashed-new-password');
      });

      test('should handle validation errors', async () => {
        // Arrange
        const validationErrors = [{ msg: 'Password must be at least 8 characters' }];
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => validationErrors
        });

        // Act
        await authController.resetPasswordWithToken(mockReq, mockRes);

        // Assert
        expect(mockRes.render).toHaveBeenCalledWith('auth/reset-password', {
          token: 'valid-reset-token',
          errors: validationErrors,
          csrfToken: 'csrf-token-123',
          title: 'Reset Password'
        });
      });

      test('should successfully reset password with valid token', async () => {
        // Arrange
        const mockUserInstance = {
          id: 1,
          passwordResetToken: 'valid-reset-token',
          passwordResetExpires: new Date(Date.now() + 3600000),
          update: vi.fn().mockResolvedValue()
        };
        mockUser.findOne.mockResolvedValue(mockUserInstance);

        // Act
        await authController.resetPasswordWithToken(mockReq, mockRes);

        // Assert
        expect(mockUser.findOne).toHaveBeenCalledWith({
          where: {
            passwordResetToken: 'mocked-hash-value',
            passwordResetExpires: { [Op.gt]: expect.any(Date) },
            isActive: true
          }
        });
        expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
        expect(mockUserInstance.update).toHaveBeenCalledWith({
          password: 'hashed-new-password',
          passwordResetToken: null,
          passwordResetExpires: null
        });
        expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
          1, 
          mockAuditService.ACTIONS.USER_PASSWORD_RESET, 
          mockAuditService.ENTITIES.USER, 
          1, 
          { method: 'token_reset' }
        );
        expect(mockReq.flash).toHaveBeenCalledWith('success_msg', 
          'Your password has been successfully reset. You can now log in with your new password.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login');
      });

      test('should handle invalid or expired token', async () => {
        // Arrange
        mockUser.findOne.mockResolvedValue(null);

        // Act
        await authController.resetPasswordWithToken(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 
          'Password reset link is invalid or has expired.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/forgot-password');
      });

      test('should handle password confirmation mismatch', async () => {
        // Arrange
        mockReq.body.confirmPassword = 'DifferentPassword123!';
        
        // Mock validation errors for password confirmation mismatch
        mockValidationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [{ msg: 'Password confirmation does not match' }]
        });

        // Act
        await authController.resetPasswordWithToken(mockReq, mockRes);

        // Assert
        expect(mockRes.render).toHaveBeenCalledWith('auth/reset-password', {
          title: 'Reset Password',
          token: 'valid-reset-token',
          errors: [{ msg: 'Password confirmation does not match' }],
          csrfToken: 'csrf-token-123'
        });
        expect(mockBcrypt.hash).not.toHaveBeenCalled();
      });

      test('should handle database errors during user lookup', async () => {
        // Arrange
        mockUser.findOne.mockRejectedValue(new Error('Database error'));

        // Act
        await authController.resetPasswordWithToken(mockReq, mockRes);

        // Assert
        expect(mockReq.flash).toHaveBeenCalledWith('error_msg', 
          'An error occurred while processing your request. Please try again.');
        expect(mockRes.redirect).toHaveBeenCalledWith('/auth/forgot-password');
      });

      test('should handle password hashing errors', async () => {
        // Arrange
        const mockUserInstance = {
          id: 1,
          passwordResetToken: 'valid-reset-token',
          passwordResetExpires: new Date(Date.now() + 3600000)
        };
        mockUser.findOne.mockResolvedValue(mockUserInstance);
        mockBcrypt.hash.mockRejectedValue(new Error('Hashing error'));

        // Act
        await authController.resetPasswordWithToken(mockReq, mockRes);

        // Assert
        expect(mockRes.render).toHaveBeenCalledWith('auth/reset-password', {
          token: 'valid-reset-token',
          error: 'An error occurred while resetting your password. Please try again.',
          csrfToken: 'csrf-token-123',
          title: 'Reset Password'
        });
      });

      test('should handle database update errors', async () => {
        // Arrange
        const mockUserInstance = {
          id: 1,
          passwordResetToken: 'valid-reset-token',
          passwordResetExpires: new Date(Date.now() + 3600000),
          update: vi.fn().mockRejectedValue(new Error('Update error'))
        };
        mockUser.findOne.mockResolvedValue(mockUserInstance);

        // Act
        await authController.resetPasswordWithToken(mockReq, mockRes);

        // Assert
        expect(mockRes.render).toHaveBeenCalledWith('auth/reset-password', {
          token: 'valid-reset-token',
          error: 'An error occurred while resetting your password. Please try again.',
          csrfToken: 'csrf-token-123',
          title: 'Reset Password'
        });
      });
    });
  });
});