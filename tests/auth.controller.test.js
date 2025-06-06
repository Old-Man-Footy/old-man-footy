const authController = require('../controllers/auth.controller');
const { User, Club } = require('../models');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Mock all external dependencies
jest.mock('../models');
jest.mock('bcryptjs');
jest.mock('passport');

describe('Auth Controller', () => {
    let req, res, next;

    beforeEach(() => {
        // Arrange - Reset mocks and setup request/response objects
        jest.clearAllMocks();
        
        req = {
            body: {},
            params: {},
            query: {},
            user: null,
            flash: jest.fn(),
            login: jest.fn(),
            logout: jest.fn()
        };
        
        res = {
            render: jest.fn(),
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {}
        };
        
        next = jest.fn();
    });

    describe('getLogin', () => {
        test('should render login page with flash messages', async () => {
            // Arrange
            req.flash.mockReturnValue(['Test error message']);

            // Act
            await authController.getLogin(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('auth/login', {
                title: 'Login',
                error: 'Test error message'
            });
        });

        test('should render login page without error when no flash messages', async () => {
            // Arrange
            req.flash.mockReturnValue([]);

            // Act
            await authController.getLogin(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('auth/login', {
                title: 'Login',
                error: null
            });
        });
    });

    describe('postLogin', () => {
        test('should authenticate user successfully', async () => {
            // Arrange
            const mockUser = { id: 1, email: 'test@example.com', firstName: 'Test' };
            passport.authenticate = jest.fn((strategy, callback) => {
                return (req, res, next) => {
                    callback(null, mockUser);
                };
            });
            req.login.mockImplementation((user, callback) => callback(null));

            // Act
            await authController.postLogin(req, res, next);

            // Assert
            expect(passport.authenticate).toHaveBeenCalledWith('local', expect.any(Function));
            expect(req.login).toHaveBeenCalledWith(mockUser, expect.any(Function));
            expect(res.redirect).toHaveBeenCalledWith('/dashboard');
        });

        test('should handle authentication failure', async () => {
            // Arrange
            passport.authenticate = jest.fn((strategy, callback) => {
                return (req, res, next) => {
                    callback(null, false, { message: 'Invalid credentials' });
                };
            });

            // Act
            await authController.postLogin(req, res, next);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Invalid credentials');
            expect(res.redirect).toHaveBeenCalledWith('/auth/login');
        });

        test('should handle authentication error', async () => {
            // Arrange
            const error = new Error('Database error');
            passport.authenticate = jest.fn((strategy, callback) => {
                return (req, res, next) => {
                    callback(error);
                };
            });

            // Act
            await authController.postLogin(req, res, next);

            // Assert
            expect(next).toHaveBeenCalledWith(error);
        });

        test('should handle login error', async () => {
            // Arrange
            const mockUser = { id: 1, email: 'test@example.com' };
            const loginError = new Error('Login failed');
            passport.authenticate = jest.fn((strategy, callback) => {
                return (req, res, next) => {
                    callback(null, mockUser);
                };
            });
            req.login.mockImplementation((user, callback) => callback(loginError));

            // Act
            await authController.postLogin(req, res, next);

            // Assert
            expect(next).toHaveBeenCalledWith(loginError);
        });
    });

    describe('getRegister', () => {
        test('should render register page with clubs and flash messages', async () => {
            // Arrange
            const mockClubs = [
                { id: 1, clubName: 'Test Club 1', state: 'NSW' },
                { id: 2, clubName: 'Test Club 2', state: 'QLD' }
            ];
            Club.findAll.mockResolvedValue(mockClubs);
            req.flash.mockReturnValue(['Test error']);

            // Act
            await authController.getRegister(req, res);

            // Assert
            expect(Club.findAll).toHaveBeenCalledWith({
                where: { isActive: true },
                order: [['state', 'ASC'], ['clubName', 'ASC']]
            });
            expect(res.render).toHaveBeenCalledWith('auth/register', {
                title: 'Register',
                clubs: mockClubs,
                error: 'Test error'
            });
        });

        test('should handle database error when fetching clubs', async () => {
            // Arrange
            const error = new Error('Database error');
            Club.findAll.mockRejectedValue(error);

            // Act
            await authController.getRegister(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Error',
                message: 'Unable to load registration page',
                error: error
            });
        });
    });

    describe('postRegister', () => {
        test('should register new user successfully', async () => {
            // Arrange
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'password123',
                clubId: '1'
            };
            
            const mockClub = { id: 1, clubName: 'Test Club' };
            const mockUser = { 
                id: 1, 
                email: 'john@example.com', 
                firstName: 'John',
                clubId: 1 
            };
            
            User.findOne.mockResolvedValue(null); // No existing user
            Club.findByPk.mockResolvedValue(mockClub);
            bcrypt.hash.mockResolvedValue('hashedPassword123');
            User.create.mockResolvedValue(mockUser);
            req.login.mockImplementation((user, callback) => callback(null));

            // Act
            await authController.postRegister(req, res);

            // Assert
            expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
            expect(Club.findByPk).toHaveBeenCalledWith(1);
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
            expect(User.create).toHaveBeenCalledWith({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                passwordHash: 'hashedPassword123',
                clubId: 1,
                isActive: true
            });
            expect(req.login).toHaveBeenCalledWith(mockUser, expect.any(Function));
            expect(res.redirect).toHaveBeenCalledWith('/dashboard');
        });

        test('should reject registration for existing email', async () => {
            // Arrange
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'existing@example.com',
                password: 'password123',
                clubId: '1'
            };
            
            const existingUser = { id: 1, email: 'existing@example.com' };
            User.findOne.mockResolvedValue(existingUser);

            // Act
            await authController.postRegister(req, res);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Email address already registered');
            expect(res.redirect).toHaveBeenCalledWith('/auth/register');
            expect(User.create).not.toHaveBeenCalled();
        });

        test('should reject registration for invalid club', async () => {
            // Arrange
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'password123',
                clubId: '999'
            };
            
            User.findOne.mockResolvedValue(null);
            Club.findByPk.mockResolvedValue(null);

            // Act
            await authController.postRegister(req, res);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Invalid club selected');
            expect(res.redirect).toHaveBeenCalledWith('/auth/register');
            expect(User.create).not.toHaveBeenCalled();
        });

        test('should handle database error during registration', async () => {
            // Arrange
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'password123',
                clubId: '1'
            };
            
            const error = new Error('Database error');
            User.findOne.mockRejectedValue(error);

            // Act
            await authController.postRegister(req, res);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Registration failed. Please try again.');
            expect(res.redirect).toHaveBeenCalledWith('/auth/register');
        });

        test('should handle login error after successful registration', async () => {
            // Arrange
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'password123',
                clubId: '1'
            };
            
            const mockClub = { id: 1, clubName: 'Test Club' };
            const mockUser = { id: 1, email: 'john@example.com' };
            
            User.findOne.mockResolvedValue(null);
            Club.findByPk.mockResolvedValue(mockClub);
            bcrypt.hash.mockResolvedValue('hashedPassword123');
            User.create.mockResolvedValue(mockUser);
            
            const loginError = new Error('Login failed');
            req.login.mockImplementation((user, callback) => callback(loginError));

            // Act
            await authController.postRegister(req, res);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Registration successful, but login failed. Please try logging in manually.');
            expect(res.redirect).toHaveBeenCalledWith('/auth/login');
        });
    });

    describe('logout', () => {
        test('should logout user successfully', async () => {
            // Arrange
            req.logout.mockImplementation((callback) => callback(null));

            // Act
            await authController.logout(req, res);

            // Assert
            expect(req.logout).toHaveBeenCalledWith(expect.any(Function));
            expect(res.redirect).toHaveBeenCalledWith('/');
        });

        test('should handle logout error', async () => {
            // Arrange
            const error = new Error('Logout failed');
            req.logout.mockImplementation((callback) => callback(error));

            // Act
            await authController.logout(req, res);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Error during logout');
            expect(res.redirect).toHaveBeenCalledWith('/dashboard');
        });
    });

    describe('getAcceptInvitation', () => {
        test('should render accept invitation page with valid token', async () => {
            // Arrange
            req.params.token = 'valid-token';
            const mockUser = { 
                id: 1, 
                email: 'invited@example.com',
                invitationToken: 'valid-token',
                invitationExpires: new Date(Date.now() + 3600000)
            };
            User.findOne.mockResolvedValue(mockUser);

            // Act
            await authController.getAcceptInvitation(req, res);

            // Assert
            expect(User.findOne).toHaveBeenCalledWith({
                where: {
                    invitationToken: 'valid-token',
                    invitationExpires: { [expect.any(Symbol)]: expect.any(Date) }
                }
            });
            expect(res.render).toHaveBeenCalledWith('auth/accept-invitation', {
                title: 'Accept Invitation',
                user: mockUser,
                error: null
            });
        });

        test('should handle invalid or expired invitation token', async () => {
            // Arrange
            req.params.token = 'invalid-token';
            User.findOne.mockResolvedValue(null);

            // Act
            await authController.getAcceptInvitation(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Invalid Invitation',
                message: 'This invitation link is invalid or has expired.',
                error: null
            });
        });
    });

    describe('postAcceptInvitation', () => {
        test('should activate user account successfully', async () => {
            // Arrange
            req.params.token = 'valid-token';
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                password: 'newPassword123'
            };
            
            const mockUser = {
                id: 1,
                email: 'invited@example.com',
                invitationToken: 'valid-token',
                invitationExpires: new Date(Date.now() + 3600000),
                update: jest.fn().mockResolvedValue(true)
            };
            
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.hash.mockResolvedValue('hashedNewPassword123');
            req.login.mockImplementation((user, callback) => callback(null));

            // Act
            await authController.postAcceptInvitation(req, res);

            // Assert
            expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
            expect(mockUser.update).toHaveBeenCalledWith({
                firstName: 'John',
                lastName: 'Doe',
                passwordHash: 'hashedNewPassword123',
                isActive: true,
                invitationToken: null,
                invitationExpires: null
            });
            expect(req.login).toHaveBeenCalledWith(mockUser, expect.any(Function));
            expect(res.redirect).toHaveBeenCalledWith('/dashboard');
        });

        test('should handle invalid invitation token', async () => {
            // Arrange
            req.params.token = 'invalid-token';
            req.body = { firstName: 'John', lastName: 'Doe', password: 'password123' };
            User.findOne.mockResolvedValue(null);

            // Act
            await authController.postAcceptInvitation(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Invalid Invitation',
                message: 'This invitation link is invalid or has expired.',
                error: null
            });
        });

        test('should handle database error during activation', async () => {
            // Arrange
            req.params.token = 'valid-token';
            req.body = { firstName: 'John', lastName: 'Doe', password: 'password123' };
            
            const error = new Error('Database error');
            User.findOne.mockRejectedValue(error);

            // Act
            await authController.postAcceptInvitation(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Error',
                message: 'Unable to activate account. Please try again.',
                error: error
            });
        });
    });
});