const mainController = require('../controllers/main.controller');
const { Carnival, User, Club, EmailSubscription } = require('../models');
const emailService = require('../services/emailService');

// Mock all external dependencies
jest.mock('../models');
jest.mock('../services/emailService');

describe('Main Controller', () => {
    let req, res, next;

    beforeEach(() => {
        // Arrange - Reset mocks and setup request/response objects
        jest.clearAllMocks();
        
        req = {
            body: {},
            params: {},
            query: {},
            user: null,
            flash: jest.fn()
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

    describe('getIndex', () => {
        test('should render home page with upcoming carnivals', async () => {
            // Arrange
            const mockCarnivals = [
                { 
                    id: 1, 
                    title: 'NSW Masters Carnival', 
                    date: new Date(Date.now() + 86400000), 
                    state: 'NSW',
                    locationAddress: 'Sydney Olympic Park'
                },
                { 
                    id: 2, 
                    title: 'QLD Masters Carnival', 
                    date: new Date(Date.now() + 172800000), 
                    state: 'QLD',
                    locationAddress: 'Suncorp Stadium'
                }
            ];
            
            Carnival.findAll.mockResolvedValue(mockCarnivals);

            // Act
            await mainController.getIndex(req, res);

            // Assert
            expect(Carnival.findAll).toHaveBeenCalledWith({
                where: {
                    date: { [expect.any(Symbol)]: expect.any(Date) },
                    isActive: true
                },
                order: [['date', 'ASC']],
                limit: 5,
                include: [{
                    model: User,
                    as: 'createdByUser',
                    attributes: ['firstName', 'lastName']
                }]
            });

            expect(res.render).toHaveBeenCalledWith('index', {
                title: 'Old Man Footy',
                upcomingCarnivals: mockCarnivals
            });
        });

        test('should handle database error gracefully', async () => {
            // Arrange
            const error = new Error('Database connection failed');
            Carnival.findAll.mockRejectedValue(error);

            // Act
            await mainController.getIndex(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('index', {
                title: 'Old Man Footy',
                upcomingCarnivals: []
            });
        });

        test('should handle empty carnival list', async () => {
            // Arrange
            Carnival.findAll.mockResolvedValue([]);

            // Act
            await mainController.getIndex(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('index', {
                title: 'Old Man Footy',
                upcomingCarnivals: []
            });
        });
    });

    describe('getDashboard', () => {
        test('should render dashboard for authenticated user', async () => {
            // Arrange
            req.user = { 
                id: 1, 
                firstName: 'John', 
                lastName: 'Doe',
                clubId: 1
            };

            const mockUserCarnivals = [
                { id: 1, title: 'My Carnival', createdByUserId: 1 }
            ];
            const mockUpcomingCarnivals = [
                { id: 2, title: 'Upcoming Carnival', date: new Date(Date.now() + 86400000) }
            ];

            Carnival.findAll
                .mockResolvedValueOnce(mockUserCarnivals) // First call for user's carnivals
                .mockResolvedValueOnce(mockUpcomingCarnivals); // Second call for upcoming carnivals

            // Act
            await mainController.getDashboard(req, res);

            // Assert
            expect(Carnival.findAll).toHaveBeenCalledTimes(2);
            
            // Check first call - user's carnivals
            expect(Carnival.findAll).toHaveBeenNthCalledWith(1, {
                where: { createdByUserId: 1 },
                order: [['createdAt', 'DESC']],
                limit: 5
            });

            // Check second call - upcoming carnivals
            expect(Carnival.findAll).toHaveBeenNthCalledWith(2, {
                where: {
                    date: { [expect.any(Symbol)]: expect.any(Date) },
                    isActive: true
                },
                order: [['date', 'ASC']],
                limit: 5
            });

            expect(res.render).toHaveBeenCalledWith('dashboard', {
                title: 'Dashboard',
                user: req.user,
                userCarnivals: mockUserCarnivals,
                upcomingCarnivals: mockUpcomingCarnivals
            });
        });

        test('should handle database errors in dashboard', async () => {
            // Arrange
            req.user = { id: 1, firstName: 'John', lastName: 'Doe' };
            const error = new Error('Database error');
            Carnival.findAll.mockRejectedValue(error);

            // Act
            await mainController.getDashboard(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('dashboard', {
                title: 'Dashboard',
                user: req.user,
                userCarnivals: [],
                upcomingCarnivals: []
            });
        });
    });

    describe('getAbout', () => {
        test('should render about page', async () => {
            // Act
            await mainController.getAbout(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('about', {
                title: 'About Old Man Footy'
            });
        });
    });

    describe('postSubscribe', () => {
        test('should subscribe new email successfully', async () => {
            // Arrange
            req.body = { email: 'test@example.com' };
            EmailSubscription.findOne.mockResolvedValue(null); // No existing subscription
            EmailSubscription.create.mockResolvedValue({
                id: 1,
                email: 'test@example.com',
                isActive: true
            });

            // Act
            await mainController.postSubscribe(req, res);

            // Assert
            expect(EmailSubscription.findOne).toHaveBeenCalledWith({
                where: { email: 'test@example.com' }
            });
            expect(EmailSubscription.create).toHaveBeenCalledWith({
                email: 'test@example.com',
                isActive: true,
                subscribedAt: expect.any(Date)
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Successfully subscribed to updates'
            });
        });

        test('should handle already subscribed email', async () => {
            // Arrange
            req.body = { email: 'existing@example.com' };
            const existingSubscription = {
                id: 1,
                email: 'existing@example.com',
                isActive: true
            };
            EmailSubscription.findOne.mockResolvedValue(existingSubscription);

            // Act
            await mainController.postSubscribe(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email already subscribed'
            });
            expect(EmailSubscription.create).not.toHaveBeenCalled();
        });

        test('should reactivate inactive subscription', async () => {
            // Arrange
            req.body = { email: 'inactive@example.com' };
            const inactiveSubscription = {
                id: 1,
                email: 'inactive@example.com',
                isActive: false,
                update: jest.fn().mockResolvedValue(true)
            };
            EmailSubscription.findOne.mockResolvedValue(inactiveSubscription);

            // Act
            await mainController.postSubscribe(req, res);

            // Assert
            expect(inactiveSubscription.update).toHaveBeenCalledWith({
                isActive: true,
                subscribedAt: expect.any(Date)
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Subscription reactivated successfully'
            });
        });

        test('should handle invalid email format', async () => {
            // Arrange
            req.body = { email: 'invalid-email' };

            // Act
            await mainController.postSubscribe(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid email address'
            });
            expect(EmailSubscription.findOne).not.toHaveBeenCalled();
        });

        test('should handle missing email', async () => {
            // Arrange
            req.body = {};

            // Act
            await mainController.postSubscribe(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email address is required'
            });
        });

        test('should handle database error during subscription', async () => {
            // Arrange
            req.body = { email: 'test@example.com' };
            const error = new Error('Database constraint violation');
            EmailSubscription.findOne.mockRejectedValue(error);

            // Act
            await mainController.postSubscribe(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unable to process subscription. Please try again.'
            });
        });
    });

    describe('getUnsubscribe', () => {
        test('should render unsubscribe page with valid token', async () => {
            // Arrange
            req.params.token = 'valid-unsubscribe-token';
            const mockSubscription = {
                id: 1,
                email: 'test@example.com',
                unsubscribeToken: 'valid-unsubscribe-token',
                isActive: true
            };
            EmailSubscription.findOne.mockResolvedValue(mockSubscription);

            // Act
            await mainController.getUnsubscribe(req, res);

            // Assert
            expect(EmailSubscription.findOne).toHaveBeenCalledWith({
                where: { unsubscribeToken: 'valid-unsubscribe-token' }
            });
            expect(res.render).toHaveBeenCalledWith('unsubscribe', {
                title: 'Unsubscribe',
                subscription: mockSubscription,
                success: false
            });
        });

        test('should handle invalid unsubscribe token', async () => {
            // Arrange
            req.params.token = 'invalid-token';
            EmailSubscription.findOne.mockResolvedValue(null);

            // Act
            await mainController.getUnsubscribe(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Invalid Link',
                message: 'This unsubscribe link is invalid or has expired.',
                error: null
            });
        });
    });

    describe('postUnsubscribe', () => {
        test('should unsubscribe successfully', async () => {
            // Arrange
            req.params.token = 'valid-unsubscribe-token';
            const mockSubscription = {
                id: 1,
                email: 'test@example.com',
                unsubscribeToken: 'valid-unsubscribe-token',
                isActive: true,
                update: jest.fn().mockResolvedValue(true)
            };
            EmailSubscription.findOne.mockResolvedValue(mockSubscription);

            // Act
            await mainController.postUnsubscribe(req, res);

            // Assert
            expect(mockSubscription.update).toHaveBeenCalledWith({
                isActive: false,
                unsubscribedAt: expect.any(Date)
            });
            expect(res.render).toHaveBeenCalledWith('unsubscribe', {
                title: 'Unsubscribed',
                subscription: mockSubscription,
                success: true
            });
        });

        test('should handle already unsubscribed email', async () => {
            // Arrange
            req.params.token = 'valid-token';
            const mockSubscription = {
                id: 1,
                email: 'test@example.com',
                isActive: false
            };
            EmailSubscription.findOne.mockResolvedValue(mockSubscription);

            // Act
            await mainController.postUnsubscribe(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('unsubscribe', {
                title: 'Already Unsubscribed',
                subscription: mockSubscription,
                success: true
            });
        });

        test('should handle database error during unsubscribe', async () => {
            // Arrange
            req.params.token = 'valid-token';
            const error = new Error('Database error');
            EmailSubscription.findOne.mockRejectedValue(error);

            // Act
            await mainController.postUnsubscribe(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Error',
                message: 'Unable to process unsubscribe request.',
                error: error
            });
        });
    });

    describe('getStats', () => {
        test('should render admin stats page with data', async () => {
            // Arrange
            req.user = { id: 1, isAdmin: true };
            
            const mockStats = {
                totalCarnivals: 15,
                totalUsers: 25,
                totalClubs: 10,
                totalSubscriptions: 50
            };

            Carnival.count.mockResolvedValue(mockStats.totalCarnivals);
            User.count.mockResolvedValue(mockStats.totalUsers);
            Club.count.mockResolvedValue(mockStats.totalClubs);
            EmailSubscription.count.mockResolvedValue(mockStats.totalSubscriptions);

            // Act
            await mainController.getStats(req, res);

            // Assert
            expect(Carnival.count).toHaveBeenCalledWith({ where: { isActive: true } });
            expect(User.count).toHaveBeenCalledWith({ where: { isActive: true } });
            expect(Club.count).toHaveBeenCalledWith({ where: { isActive: true } });
            expect(EmailSubscription.count).toHaveBeenCalledWith({ where: { isActive: true } });

            expect(res.render).toHaveBeenCalledWith('admin/stats', {
                title: 'Admin Statistics',
                stats: mockStats
            });
        });

        test('should handle database errors in stats', async () => {
            // Arrange
            req.user = { id: 1, isAdmin: true };
            const error = new Error('Database error');
            Carnival.count.mockRejectedValue(error);

            // Act
            await mainController.getStats(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Error',
                message: 'Unable to load statistics',
                error: error
            });
        });
    });

    describe('sendNewsletter', () => {
        test('should send newsletter to all active subscribers', async () => {
            // Arrange
            req.body = {
                subject: 'Test Newsletter',
                content: 'This is a test newsletter content'
            };

            const mockSubscribers = [
                { id: 1, email: 'user1@example.com', isActive: true },
                { id: 2, email: 'user2@example.com', isActive: true }
            ];

            EmailSubscription.findAll.mockResolvedValue(mockSubscribers);
            emailService.sendNewsletter.mockResolvedValue({
                success: true,
                sent: 2,
                failed: 0
            });

            // Act
            await mainController.sendNewsletter(req, res);

            // Assert
            expect(EmailSubscription.findAll).toHaveBeenCalledWith({
                where: { isActive: true },
                attributes: ['email']
            });
            expect(emailService.sendNewsletter).toHaveBeenCalledWith(
                ['user1@example.com', 'user2@example.com'],
                'Test Newsletter',
                'This is a test newsletter content'
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Newsletter sent successfully',
                stats: { sent: 2, failed: 0 }
            });
        });

        test('should handle missing newsletter content', async () => {
            // Arrange
            req.body = { subject: 'Test' }; // Missing content

            // Act
            await mainController.sendNewsletter(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Subject and content are required'
            });
            expect(emailService.sendNewsletter).not.toHaveBeenCalled();
        });

        test('should handle email service error', async () => {
            // Arrange
            req.body = {
                subject: 'Test Newsletter',
                content: 'Test content'
            };

            EmailSubscription.findAll.mockResolvedValue([
                { email: 'test@example.com' }
            ]);
            emailService.sendNewsletter.mockRejectedValue(new Error('SMTP error'));

            // Act
            await mainController.sendNewsletter(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to send newsletter: SMTP error'
            });
        });
    });
});