const carnivalController = require('../controllers/carnival.controller');
const { Carnival, User, Club } = require('../models');
const mySidelineService = require('../services/mySidelineService');

// Mock all external dependencies
jest.mock('../models');
jest.mock('../services/mySidelineService');

describe('Carnival Controller', () => {
    let req, res, next;

    beforeEach(() => {
        // Arrange - Reset mocks and setup request/response objects
        jest.clearAllMocks();
        
        req = {
            body: {},
            params: {},
            query: {},
            user: { id: 1, firstName: 'Test', lastName: 'User' },
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

    describe('list', () => {
        test('should render carnival list with pagination', async () => {
            // Arrange
            const mockCarnivals = [
                { id: 1, title: 'Test Carnival 1', date: new Date(), state: 'NSW' },
                { id: 2, title: 'Test Carnival 2', date: new Date(), state: 'QLD' }
            ];
            
            Carnival.findAndCountAll.mockResolvedValue({
                count: 25,
                rows: mockCarnivals
            });

            req.query = { page: '2', state: 'NSW', search: 'test' };

            // Act
            await carnivalController.list(req, res);

            // Assert
            expect(Carnival.findAndCountAll).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    state: 'NSW',
                    title: expect.any(Object)
                }),
                include: [{
                    model: User,
                    as: 'createdByUser',
                    attributes: ['firstName', 'lastName', 'email']
                }],
                order: [['date', 'DESC']],
                limit: 10,
                offset: 10
            });

            expect(res.render).toHaveBeenCalledWith('carnivals/list', {
                title: 'Carnivals',
                carnivals: mockCarnivals,
                pagination: {
                    current: 2,
                    total: 3,
                    hasNext: true,
                    hasPrev: true
                },
                filters: {
                    state: 'NSW',
                    search: 'test'
                }
            });
        });

        test('should handle database error gracefully', async () => {
            // Arrange
            const error = new Error('Database error');
            Carnival.findAndCountAll.mockRejectedValue(error);

            // Act
            await carnivalController.list(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Error',
                message: 'Unable to load carnivals',
                error: error
            });
        });

        test('should apply correct filters and pagination defaults', async () => {
            // Arrange
            Carnival.findAndCountAll.mockResolvedValue({ count: 5, rows: [] });
            req.query = {}; // No filters

            // Act
            await carnivalController.list(req, res);

            // Assert
            expect(Carnival.findAndCountAll).toHaveBeenCalledWith({
                where: {},
                include: [{
                    model: User,
                    as: 'createdByUser',
                    attributes: ['firstName', 'lastName', 'email']
                }],
                order: [['date', 'DESC']],
                limit: 10,
                offset: 0
            });
        });
    });

    describe('show', () => {
        test('should render carnival details', async () => {
            // Arrange
            const mockCarnival = {
                id: 1,
                title: 'Test Carnival',
                date: new Date(),
                locationAddress: 'Test Location',
                createdByUser: { firstName: 'John', lastName: 'Doe' }
            };
            
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            req.params.id = '1';

            // Act
            await carnivalController.show(req, res);

            // Assert
            expect(Carnival.findByPk).toHaveBeenCalledWith(1, {
                include: [{
                    model: User,
                    as: 'createdByUser',
                    attributes: ['firstName', 'lastName', 'email']
                }]
            });
            expect(res.render).toHaveBeenCalledWith('carnivals/show', {
                title: 'Test Carnival',
                carnival: mockCarnival
            });
        });

        test('should handle carnival not found', async () => {
            // Arrange
            Carnival.findByPk.mockResolvedValue(null);
            req.params.id = '999';

            // Act
            await carnivalController.show(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Carnival Not Found',
                message: 'The requested carnival could not be found.',
                error: null
            });
        });

        test('should handle database error', async () => {
            // Arrange
            const error = new Error('Database error');
            Carnival.findByPk.mockRejectedValue(error);
            req.params.id = '1';

            // Act
            await carnivalController.show(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Error',
                message: 'Unable to load carnival details',
                error: error
            });
        });
    });

    describe('getNew', () => {
        test('should render new carnival form', async () => {
            // Act
            await carnivalController.getNew(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('carnivals/new', {
                title: 'Create New Carnival',
                carnival: {},
                error: null
            });
        });

        test('should render form with validation errors', async () => {
            // Arrange
            req.flash.mockReturnValue(['Title is required']);

            // Act
            await carnivalController.getNew(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('carnivals/new', {
                title: 'Create New Carnival',
                carnival: {},
                error: 'Title is required'
            });
        });
    });

    describe('postNew', () => {
        test('should create new carnival successfully', async () => {
            // Arrange
            req.body = {
                title: 'New Carnival',
                date: '2025-07-15',
                locationAddress: 'Test Stadium',
                state: 'NSW',
                scheduleDetails: 'Test schedule',
                organiserContactName: 'John Doe',
                organiserContactEmail: 'john@example.com',
                organiserContactPhone: '0412345678'
            };

            const mockCarnival = { id: 1, ...req.body, createdByUserId: 1 };
            Carnival.create.mockResolvedValue(mockCarnival);

            // Act
            await carnivalController.postNew(req, res);

            // Assert
            expect(Carnival.create).toHaveBeenCalledWith({
                ...req.body,
                date: new Date('2025-07-15'),
                createdByUserId: 1,
                isManuallyEntered: true,
                isActive: true
            });
            expect(req.flash).toHaveBeenCalledWith('success', 'Carnival created successfully');
            expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
        });

        test('should handle validation errors', async () => {
            // Arrange
            req.body = {
                title: '', // Missing required field
                date: 'invalid-date'
            };

            // Act
            await carnivalController.postNew(req, res);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Please provide all required fields');
            expect(res.redirect).toHaveBeenCalledWith('/carnivals/new');
            expect(Carnival.create).not.toHaveBeenCalled();
        });

        test('should handle database error', async () => {
            // Arrange
            req.body = {
                title: 'New Carnival',
                date: '2025-07-15',
                locationAddress: 'Test Stadium',
                state: 'NSW',
                scheduleDetails: 'Test schedule',
                organiserContactName: 'John Doe',
                organiserContactEmail: 'john@example.com',
                organiserContactPhone: '0412345678'
            };

            const error = new Error('Database constraint violation');
            Carnival.create.mockRejectedValue(error);

            // Act
            await carnivalController.postNew(req, res);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Unable to create carnival. Please try again.');
            expect(res.redirect).toHaveBeenCalledWith('/carnivals/new');
        });
    });

    describe('getEdit', () => {
        test('should render edit form for owned carnival', async () => {
            // Arrange
            const mockCarnival = {
                id: 1,
                title: 'Test Carnival',
                createdByUserId: 1,
                isManuallyEntered: true
            };
            
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            req.params.id = '1';

            // Act
            await carnivalController.getEdit(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('carnivals/edit', {
                title: 'Edit Carnival',
                carnival: mockCarnival,
                error: null
            });
        });

        test('should deny access to carnival not owned by user', async () => {
            // Arrange
            const mockCarnival = {
                id: 1,
                title: 'Test Carnival',
                createdByUserId: 2, // Different user
                isManuallyEntered: true
            };
            
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            req.params.id = '1';

            // Act
            await carnivalController.getEdit(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Access Denied',
                message: 'You can only edit carnivals you created.',
                error: null
            });
        });

        test('should deny editing MySideline imported carnivals', async () => {
            // Arrange
            const mockCarnival = {
                id: 1,
                title: 'Test Carnival',
                createdByUserId: 1,
                isManuallyEntered: false // MySideline imported
            };
            
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            req.params.id = '1';

            // Act
            await carnivalController.getEdit(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.render).toHaveBeenCalledWith('error', {
                title: 'Cannot Edit',
                message: 'MySideline imported carnivals cannot be edited directly.',
                error: null
            });
        });
    });

    describe('postEdit', () => {
        test('should update carnival successfully', async () => {
            // Arrange
            const mockCarnival = {
                id: 1,
                title: 'Old Title',
                createdByUserId: 1,
                isManuallyEntered: true,
                update: jest.fn().mockResolvedValue(true)
            };
            
            req.body = {
                title: 'Updated Title',
                date: '2025-07-16',
                locationAddress: 'Updated Location',
                state: 'QLD',
                scheduleDetails: 'Updated schedule',
                organiserContactName: 'Jane Doe',
                organiserContactEmail: 'jane@example.com',
                organiserContactPhone: '0412345679'
            };
            
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            req.params.id = '1';

            // Act
            await carnivalController.postEdit(req, res);

            // Assert
            expect(mockCarnival.update).toHaveBeenCalledWith({
                ...req.body,
                date: new Date('2025-07-16')
            });
            expect(req.flash).toHaveBeenCalledWith('success', 'Carnival updated successfully');
            expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
        });

        test('should handle validation errors', async () => {
            // Arrange
            const mockCarnival = {
                id: 1,
                createdByUserId: 1,
                isManuallyEntered: true
            };
            
            req.body = { title: '' }; // Invalid data
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            req.params.id = '1';

            // Act
            await carnivalController.postEdit(req, res);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Please provide all required fields');
            expect(res.redirect).toHaveBeenCalledWith('/carnivals/1/edit');
        });
    });

    describe('delete', () => {
        test('should soft delete carnival successfully', async () => {
            // Arrange
            const mockCarnival = {
                id: 1,
                title: 'Test Carnival',
                createdByUserId: 1,
                isManuallyEntered: true,
                update: jest.fn().mockResolvedValue(true)
            };
            
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            req.params.id = '1';

            // Act
            await carnivalController.delete(req, res);

            // Assert
            expect(mockCarnival.update).toHaveBeenCalledWith({ isActive: false });
            expect(req.flash).toHaveBeenCalledWith('success', 'Carnival deleted successfully');
            expect(res.redirect).toHaveBeenCalledWith('/carnivals');
        });

        test('should deny deleting carnival not owned by user', async () => {
            // Arrange
            const mockCarnival = {
                id: 1,
                createdByUserId: 2, // Different user
                isManuallyEntered: true
            };
            
            Carnival.findByPk.mockResolvedValue(mockCarnival);
            req.params.id = '1';

            // Act
            await carnivalController.delete(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'You can only delete carnivals you created.'
            });
        });
    });

    describe('getUpcoming', () => {
        test('should return upcoming carnivals as JSON', async () => {
            // Arrange
            const mockCarnivals = [
                { id: 1, title: 'Upcoming Carnival 1', date: new Date(Date.now() + 86400000) },
                { id: 2, title: 'Upcoming Carnival 2', date: new Date(Date.now() + 172800000) }
            ];
            
            Carnival.findAll.mockResolvedValue(mockCarnivals);

            // Act
            await carnivalController.getUpcoming(req, res);

            // Assert
            expect(Carnival.findAll).toHaveBeenCalledWith({
                where: {
                    date: { [expect.any(Symbol)]: expect.any(Date) },
                    isActive: true
                },
                order: [['date', 'ASC']],
                limit: 10,
                include: [{
                    model: User,
                    as: 'createdByUser',
                    attributes: ['firstName', 'lastName', 'email']
                }]
            });
            expect(res.json).toHaveBeenCalledWith(mockCarnivals);
        });

        test('should handle database error for API endpoint', async () => {
            // Arrange
            const error = new Error('Database error');
            Carnival.findAll.mockRejectedValue(error);

            // Act
            await carnivalController.getUpcoming(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unable to fetch upcoming carnivals'
            });
        });
    });

    describe('takeOwnership', () => {
        test('should allow taking ownership of MySideline carnival', async () => {
            // Arrange
            mySidelineService.takeOwnership.mockResolvedValue({
                success: true,
                carnival: { id: 1, title: 'MySideline Carnival', createdByUserId: 1 }
            });
            req.params.id = '1';

            // Act
            await carnivalController.takeOwnership(req, res);

            // Assert
            expect(mySidelineService.takeOwnership).toHaveBeenCalledWith(1, 1);
            expect(req.flash).toHaveBeenCalledWith('success', 'You now have ownership of this carnival');
            expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
        });

        test('should handle ownership failure', async () => {
            // Arrange
            mySidelineService.takeOwnership.mockRejectedValue(new Error('Already owned'));
            req.params.id = '1';

            // Act
            await carnivalController.takeOwnership(req, res);

            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Unable to take ownership: Already owned');
            expect(res.redirect).toHaveBeenCalledWith('/carnivals/1');
        });
    });

    describe('syncMySideline', () => {
        test('should trigger manual sync successfully', async () => {
            // Arrange
            mySidelineService.triggerManualSync.mockResolvedValue({
                success: true,
                message: 'Sync completed',
                eventsProcessed: 5
            });

            // Act
            await carnivalController.syncMySideline(req, res);

            // Assert
            expect(mySidelineService.triggerManualSync).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sync completed',
                eventsProcessed: 5
            });
        });

        test('should handle sync failure', async () => {
            // Arrange
            mySidelineService.triggerManualSync.mockRejectedValue(new Error('Sync failed'));

            // Act
            await carnivalController.syncMySideline(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Sync failed: Sync failed'
            });
        });
    });
});