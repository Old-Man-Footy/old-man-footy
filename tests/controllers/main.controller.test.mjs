/**
 * Main Controller Tests
 * 
 * Comprehensive test suite for the main application controller following the proven 
 * pattern from club.controller.test.mjs with 100% success rate implementation.
 * 
 * Covers homepage, dashboard, email subscriptions, contact forms, and admin functionality.
 * 
 * @author Old Man Footy System
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sequelize } from '../../config/database.mjs';

// Mock the asyncHandler middleware to prevent wrapping issues
vi.mock('/middleware/asyncHandler.mjs', () => ({
  asyncHandler: (fn) => fn,
  wrapControllers: (controllers) => controllers,
  default: (fn) => fn
}));

// Mock express-validator
vi.mock('express-validator', () => ({
  validationResult: vi.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

// Mock crypto for unsubscribe functionality
vi.mock('crypto', () => ({
  default: {
    createDecipher: vi.fn(() => ({
      update: vi.fn().mockReturnValue('test'),
      final: vi.fn().mockReturnValue('@example.com')
    }))
  }
}));

// Mock all model imports before importing the controller
vi.mock('/models/index.mjs', () => {
  const createMockCarnival = (overrides = {}) => ({
    id: 1,
    title: 'Test Carnival',
    date: new Date('2025-12-25'),
    location: 'Sydney',
    state: 'NSW',
    isActive: true,
    createdByUserId: 1,
    creator: {
      firstName: 'John',
      lastName: 'Doe'
    },
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    ...overrides
  });

  const createMockClub = (overrides = {}) => ({
    id: 1,
    clubName: 'Test Club',
    state: 'NSW',
    location: 'Sydney',
    isActive: true,
    isPubliclyListed: true,
    logoUrl: '/uploads/logo.jpg',
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    ...overrides
  });

  const createMockUser = (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    clubId: null,
    isPrimaryDelegate: false,
    isAdmin: false,
    phoneNumber: '1234567890',
    club: null,
    toJSON: vi.fn().mockImplementation(function () {
      const { toJSON, ...rest } = this;
      return { ...rest, ...overrides };
    }),
    ...overrides
  });

  const createMockEmailSubscription = (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    states: ['NSW', 'VIC'],
    isActive: true,
    subscribedAt: new Date(),
    source: 'homepage',
    update: vi.fn().mockResolvedValue(true),
    ...overrides
  });

  return {
    Carnival: {
      findAll: vi.fn(),
      count: vi.fn()
    },
    Club: {
      findAll: vi.fn(),
      count: vi.fn()
    },
    User: {
      findAll: vi.fn(),
      findByPk: vi.fn(),
      count: vi.fn()
    },
    EmailSubscription: {
      findOne: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      count: vi.fn()
    },
    ClubPlayer: {
      count: vi.fn()
    },
    CarnivalClub: {
      findAll: vi.fn()
    },
    createMockCarnival,
    createMockClub,
    createMockUser,
    createMockEmailSubscription,
    Op: {
      gte: Symbol('gte'),
      ne: Symbol('ne'),
      or: Symbol('or')
    }
  };
});

// Mock services
vi.mock('/services/email/ContactEmailService.mjs', () => ({
  default: {
    sendContactFormEmail: vi.fn().mockResolvedValue(true),
    sendNewsletter: vi.fn().mockResolvedValue({ sent: 5, failed: 0 })
  }
}));

vi.mock('/services/email/AuthEmailService.mjs', () => ({
  default: {
    sendWelcomeEmail: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('/services/carouselImageService.mjs', () => ({
  default: {
    getCarouselImages: vi.fn().mockResolvedValue([
      { url: '/images/carousel1.jpg', alt: 'Carousel 1' },
      { url: '/images/carousel2.jpg', alt: 'Carousel 2' }
    ])
  }
}));

// Mock constants
vi.mock('/config/constants.mjs', () => ({
  AUSTRALIAN_STATES: ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']
}));

// Now import the controller and dependencies
import {
  getIndex,
  getDashboard,
  getAbout,
  postSubscribe,
  getUnsubscribe,
  postUnsubscribe,
  getStats,
  sendNewsletter,
  getContact,
  postContact
} from '../../controllers/main.controller.mjs';

import {
  Carnival,
  Club,
  User,
  EmailSubscription,
  ClubPlayer,
  CarnivalClub,
  createMockCarnival,
  createMockClub,
  createMockUser,
  createMockEmailSubscription,
  Op
} from '../../models/index.mjs';

import ContactEmailService from '../../services/email/ContactEmailService.mjs';
import AuthEmailService from '../../services/email/AuthEmailService.mjs';
import carouselImageService from '../../services/carouselImageService.mjs';
import { validationResult } from 'express-validator';
import crypto from 'crypto';

describe('Main Controller', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request object
    req = {
      params: {},
      query: {},
      body: {},
      user: null,
      flash: vi.fn(),
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: vi.fn().mockReturnValue('Test User Agent')
    };

    // Mock response object
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    };

    // Mock next function
    next = vi.fn();

    // Set up default model mocks
    Carnival.findAll.mockResolvedValue([]);
    Carnival.count.mockResolvedValue(0);
    Club.count.mockResolvedValue(0);
    User.findByPk.mockResolvedValue(null);
    User.findAll.mockResolvedValue([]);
    User.count.mockResolvedValue(0);
    EmailSubscription.findOne.mockResolvedValue(null);
    EmailSubscription.findAll.mockResolvedValue([]);
    EmailSubscription.create.mockResolvedValue({});
    EmailSubscription.count.mockResolvedValue(0);
    ClubPlayer.count.mockResolvedValue(0);
    CarnivalClub.findAll.mockResolvedValue([]);

    // Mock validation to return no errors by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });

    // Reset global rate limiting state
    if (global.subscriptionAttempts) {
      global.subscriptionAttempts.clear();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Homepage Rendering', () => {
    it('should render homepage for anonymous user', async () => {
      const mockCarnivals = [createMockCarnival(), createMockCarnival({ id: 2, title: 'Another Carnival' })];
      const mockCarouselImages = [
        { url: '/images/carousel1.jpg', alt: 'Carousel 1' },
        { url: '/images/carousel2.jpg', alt: 'Carousel 2' }
      ];

      Carnival.findAll.mockResolvedValue(mockCarnivals);
      Carnival.count
        .mockResolvedValueOnce(10) // totalCarnivals
        .mockResolvedValueOnce(3); // upcomingCount
      Club.count.mockResolvedValue(5);
      carouselImageService.getCarouselImages.mockResolvedValue(mockCarouselImages);

      await getIndex(req, res);

      expect(Carnival.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          [Op.or]: [
            {
              date: {
                [Op.gte]: expect.any(Date)
              },
              isActive: true
            },
            {
              date: null,
              isActive: true
            }
          ]
        },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['firstName', 'lastName']
          }
        ],
        order: [['date', 'ASC']],
        limit: 4
      }));

      expect(res.render).toHaveBeenCalledWith('index', expect.objectContaining({
        title: 'Old Man Footy',
        user: null,
        upcomingCarnivals: mockCarnivals,
        carnivals: mockCarnivals,
        stats: {
          totalCarnivals: 10,
          upcomingCount: 3,
          clubsCount: 5
        },
        carouselImages: mockCarouselImages
      }));
    });

    it('should render homepage for authenticated user', async () => {
      req.user = createMockUser();
      
      Carnival.findAll.mockResolvedValue([]);
      Carnival.count.mockResolvedValue(0);
      Club.count.mockResolvedValue(0);

      await getIndex(req, res);

      expect(res.render).toHaveBeenCalledWith('index', expect.objectContaining({
        title: 'Old Man Footy',
        user: req.user
      }));
    });

    it('should handle carousel image loading errors gracefully', async () => {
      carouselImageService.getCarouselImages.mockRejectedValue(new Error('Image service error'));
      
      Carnival.findAll.mockResolvedValue([]);
      Carnival.count.mockResolvedValue(0);
      Club.count.mockResolvedValue(0);

      await expect(getIndex(req, res)).rejects.toThrow('Image service error');
    });

    it('should limit upcoming carnivals to 4', async () => {
      const manyCarnivals = Array.from({ length: 10 }, (_, i) => 
        createMockCarnival({ id: i + 1, title: `Carnival ${i + 1}` })
      );
      
      Carnival.findAll.mockResolvedValue(manyCarnivals);
      Carnival.count.mockResolvedValue(0);
      Club.count.mockResolvedValue(0);

      await getIndex(req, res);

      expect(Carnival.findAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 4
      }));
    });
  });

  describe('Dashboard Functionality', () => {
    it('should render dashboard for user with club', async () => {
      const mockClub = createMockClub();
      const mockUser = createMockUser({ 
        clubId: 1, 
        club: mockClub,
        isPrimaryDelegate: true 
      });
      
      req.user = { id: 1 };

      User.findByPk.mockResolvedValue(mockUser);
      Carnival.findAll
        .mockResolvedValueOnce([]) // userCarnivals
        .mockResolvedValueOnce([]); // upcomingCarnivals
      ClubPlayer.count.mockResolvedValue(15);
      CarnivalClub.findAll.mockResolvedValue([]);
      User.findAll.mockResolvedValue([]); // eligibleDelegates

      await getDashboard(req, res);

      expect(User.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({
        include: [{
          model: Club,
          as: 'club',
          attributes: ['id', 'clubName', 'state', 'location', 'isActive', 'isPubliclyListed', 'logoUrl']
        }]
      }));

      expect(res.render).toHaveBeenCalledWith('dashboard', expect.objectContaining({
        title: 'Dashboard',
        user: expect.objectContaining({
          clubId: mockClub
        }),
        playerCount: 15
      }));
    });

    it('should render dashboard for user without club', async () => {
      const mockUser = createMockUser({ clubId: null, club: null });
      req.user = { id: 1 };

      User.findByPk.mockResolvedValue(mockUser);
      Carnival.findAll.mockResolvedValue([]);
      ClubPlayer.count.mockResolvedValue(0);
      CarnivalClub.findAll.mockResolvedValue([]);

      await getDashboard(req, res);

      expect(res.render).toHaveBeenCalledWith('dashboard', expect.objectContaining({
        title: 'Dashboard',
        playerCount: 0,
        clubs: []
      }));
    });

    it('should load attending carnivals for club members', async () => {
      const mockUser = createMockUser({ clubId: 1, club: createMockClub() });
      const mockCarnivalRegistration = {
        id: 1,
        playerCount: 20,
        teamName: 'Test Team',
        isPaid: true,
        carnival: createMockCarnival()
      };

      req.user = { id: 1 };
      User.findByPk.mockResolvedValue(mockUser);
      Carnival.findAll.mockResolvedValue([]);
      CarnivalClub.findAll.mockResolvedValue([mockCarnivalRegistration]);
      ClubPlayer.count.mockResolvedValue(0);

      await getDashboard(req, res);

      expect(CarnivalClub.findAll).toHaveBeenCalledWith({
        where: { clubId: 1, isActive: true },
        include: [{
          model: Carnival,
          as: 'carnival',
          where: { isActive: true },
          include: [{
            model: User,
            as: 'creator',
            attributes: ['firstName', 'lastName', 'email']
          }]
        }],
        order: [['carnival', 'date', 'DESC']]
      });
    });

    it('should load eligible delegates for primary delegate users', async () => {
      const mockUser = createMockUser({ 
        clubId: 1, 
        club: createMockClub(),
        isPrimaryDelegate: true 
      });
      const mockDelegates = [
        createMockUser({ id: 2, firstName: 'Jane', lastName: 'Smith' }),
        createMockUser({ id: 3, firstName: 'Bob', lastName: 'Wilson' })
      ];

      req.user = { id: 1 };
      User.findByPk.mockResolvedValue(mockUser);
      Carnival.findAll.mockResolvedValue([]);
      ClubPlayer.count.mockResolvedValue(0);
      CarnivalClub.findAll.mockResolvedValue([]);
      User.findAll.mockResolvedValue(mockDelegates);

      await getDashboard(req, res);

      expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          clubId: 1,
          isActive: true,
          isPrimaryDelegate: false
        }),
        attributes: ['id', 'firstName', 'lastName', 'email'],
        order: [['firstName', 'ASC'], ['lastName', 'ASC']]
      }));

      expect(res.render).toHaveBeenCalledWith('dashboard', expect.objectContaining({
        eligibleDelegates: mockDelegates
      }));
    });

    it('should handle user not found gracefully', async () => {
      req.user = { id: 999 };
      User.findByPk.mockResolvedValue(null);

      await expect(getDashboard(req, res)).rejects.toThrow();
    });
  });

  describe('About Page', () => {
    it('should render about page', () => {
      getAbout(req, res);

      expect(res.render).toHaveBeenCalledWith('about', {
        title: 'About Old Man Footy',
        additionalCSS: []
      });
    });
  });

  describe('Email Subscription', () => {
    it('should successfully create subscription with valid data', async () => {
      req.body = {
        email: 'test@example.com',
        state: ['NSW', 'VIC'],
        website: '', // honeypot
        form_timestamp: Date.now() - 5000 // 5 seconds ago
      };

      EmailSubscription.findOne.mockResolvedValue(null);
      EmailSubscription.create.mockResolvedValue({});

      await postSubscribe(req, res);

      expect(EmailSubscription.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        isActive: true,
        subscribedAt: expect.any(Date),
        states: ['NSW', 'VIC'],
        source: 'homepage'
      });

      expect(AuthEmailService.sendWelcomeEmail).toHaveBeenCalledWith('test@example.com', ['NSW', 'VIC']);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully subscribed to newsletter!'
      });
    });

    it('should handle single state selection', async () => {
      req.body = {
        email: 'test@example.com',
        state: 'NSW', // Single state as string
        website: '',
        form_timestamp: Date.now() - 5000
      };

      EmailSubscription.findOne.mockResolvedValue(null);
      EmailSubscription.create.mockResolvedValue({});

      await postSubscribe(req, res);

      expect(EmailSubscription.create).toHaveBeenCalledWith(expect.objectContaining({
        states: ['NSW'] // Should convert string to array
      }));
    });

    it('should default to all states when none provided', async () => {
      req.body = {
        email: 'test@example.com',
        website: '',
        form_timestamp: Date.now() - 5000
      };

      EmailSubscription.findOne.mockResolvedValue(null);
      EmailSubscription.create.mockResolvedValue({});

      await postSubscribe(req, res);

      expect(EmailSubscription.create).toHaveBeenCalledWith(expect.objectContaining({
        states: ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']
      }));
    });

    it('should detect bot via honeypot field', async () => {
      req.body = {
        email: 'test@example.com',
        state: ['NSW'],
        website: 'http://spam.com', // Bot filled honeypot
        form_timestamp: Date.now() - 5000
      };

      await postSubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid request'
      });
      expect(EmailSubscription.create).not.toHaveBeenCalled();
    });

    it('should detect bot via timing protection', async () => {
      req.body = {
        email: 'test@example.com',
        state: ['NSW'],
        website: '',
        form_timestamp: Date.now() - 500 // Too fast (500ms)
      };

      await postSubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please wait a moment before submitting'
      });
    });

    it('should enforce rate limiting', async () => {
      req.body = {
        email: 'test@example.com',
        state: ['NSW'],
        website: '',
        form_timestamp: Date.now() - 5000
      };

      // First request should succeed
      EmailSubscription.findOne.mockResolvedValue(null);
      EmailSubscription.create.mockResolvedValue({});

      await postSubscribe(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

      // Reset mocks for second request
      vi.clearAllMocks();
      res.json = vi.fn();
      res.status = vi.fn().mockReturnThis();

      // Second request from same IP should be rate limited
      await postSubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many requests. Please wait a moment before trying again.'
      });
    });

    it('should handle invalid email format', async () => {
      req.body = {
        email: 'invalid-email',
        state: ['NSW'],
        website: '',
        form_timestamp: Date.now() - 5000
      };

      await postSubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email address'
      });
    });

    it('should handle existing active subscription', async () => {
      req.body = {
        email: 'test@example.com',
        state: ['NSW'],
        website: '',
        form_timestamp: Date.now() - 5000
      };

      EmailSubscription.findOne.mockResolvedValue(
        createMockEmailSubscription({ isActive: true })
      );

      await postSubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'This email is already subscribed to our newsletter!'
      });
    });

    it('should reactivate inactive subscription', async () => {
      req.body = {
        email: 'test@example.com',
        state: ['NSW', 'QLD'],
        website: '',
        form_timestamp: Date.now() - 5000
      };

      const mockSubscription = createMockEmailSubscription({ isActive: false });
      EmailSubscription.findOne.mockResolvedValue(mockSubscription);

      await postSubscribe(req, res);

      expect(mockSubscription.update).toHaveBeenCalledWith({
        isActive: true,
        subscribedAt: expect.any(Date),
        states: ['NSW', 'QLD']
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully subscribed to newsletter!'
      });
    });

    it('should handle welcome email failure gracefully', async () => {
      req.body = {
        email: 'test@example.com',
        state: ['NSW'],
        website: '',
        form_timestamp: Date.now() - 5000
      };

      EmailSubscription.findOne.mockResolvedValue(null);
      EmailSubscription.create.mockResolvedValue({});
      AuthEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service error'));

      await postSubscribe(req, res);

      // Should still succeed even if welcome email fails
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully subscribed to newsletter!'
      });
    });
  });

  describe('Unsubscribe Flow', () => {
    it('should display unsubscribe page for valid token', async () => {
      req.params.token = 'valid-token';
      const mockSubscription = createMockEmailSubscription();

      EmailSubscription.findOne.mockResolvedValue(mockSubscription);

      await getUnsubscribe(req, res);

      expect(res.render).toHaveBeenCalledWith('unsubscribe', {
        title: 'Unsubscribe',
        email: 'test@example.com',
        additionalCSS: []
      });
    });

    it('should handle invalid unsubscribe token', async () => {
      req.params.token = 'invalid-token';

      EmailSubscription.findOne.mockResolvedValue(null);

      await getUnsubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith('error', expect.objectContaining({
        title: 'Invalid Link',
        message: 'This unsubscribe link is invalid or has expired.'
      }));
    });

    it('should process unsubscribe request', async () => {
      req.body = { email: 'test@example.com' };
      const mockSubscription = createMockEmailSubscription();

      EmailSubscription.findOne.mockResolvedValue(mockSubscription);

      await postUnsubscribe(req, res);

      expect(mockSubscription.update).toHaveBeenCalledWith({
        isActive: false
      });

      expect(res.render).toHaveBeenCalledWith('success', {
        title: 'Unsubscribed',
        message: 'You have been successfully unsubscribed from our newsletter.',
        additionalCSS: []
      });
    });

    it('should handle unsubscribe for non-existent email', async () => {
      req.body = { email: 'nonexistent@example.com' };

      EmailSubscription.findOne.mockResolvedValue(null);

      await postUnsubscribe(req, res);

      // Should still show success page
      expect(res.render).toHaveBeenCalledWith('success', expect.objectContaining({
        title: 'Unsubscribed'
      }));
    });
  });

  describe('Contact Form', () => {
    it('should display contact page for anonymous user', async () => {
      await getContact(req, res);

      expect(res.render).toHaveBeenCalledWith('contact', expect.objectContaining({
        title: 'Contact Us',
        user: null
      }));
    });

    it('should display contact page with user club information', async () => {
      req.user = { id: 1 };
      const mockUser = createMockUser({ 
        clubId: 1, 
        club: createMockClub() 
      });

      User.findByPk.mockResolvedValue(mockUser);

      await getContact(req, res);

      expect(res.render).toHaveBeenCalledWith('contact', expect.objectContaining({
        title: 'Contact Us',
        user: expect.objectContaining({
          clubId: expect.any(Object) // Should include club object
        })
      }));
    });

    it('should process contact form submission', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        subject: 'Test Subject',
        clubName: 'Test Club',
        message: 'Test message',
        newsletter: 'on'
      };

      EmailSubscription.findOne.mockResolvedValue(null);
      EmailSubscription.create.mockResolvedValue({});

      await postContact(req, res);

      expect(ContactEmailService.sendContactFormEmail).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        subject: 'Test Subject',
        clubName: 'Test Club',
        message: 'Test message',
        newsletter: true,
        userAgent: 'Test User Agent',
        ipAddress: '127.0.0.1'
      });

      expect(EmailSubscription.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'john@example.com',
        source: 'contact_form'
      }));

      expect(req.flash).toHaveBeenCalledWith(
        'success_msg',
        "Thank you for contacting us! We'll get back to you within 1-2 business days."
      );
      expect(res.redirect).toHaveBeenCalledWith('/contact');
    });

    it('should handle validation errors', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Email is required' }]
      });

      req.body = {
        firstName: 'John',
        email: '' // Invalid
      };

      await postContact(req, res);

      expect(req.flash).toHaveBeenCalledWith(
        'error_msg',
        'Please correct the validation errors and try again.'
      );
      expect(res.render).toHaveBeenCalledWith('contact', expect.objectContaining({
        errors: [{ msg: 'Email is required' }],
        formData: req.body
      }));
    });
  });

  describe('Admin Functionality', () => {
    it('should display admin statistics', async () => {
      User.count.mockResolvedValue(100);
      Carnival.count.mockResolvedValue(25);
      Club.count.mockResolvedValue(50);
      EmailSubscription.count.mockResolvedValue(200);

      await getStats(req, res);

      expect(res.render).toHaveBeenCalledWith('admin/stats', {
        title: 'Admin Statistics',
        stats: {
          totalUsers: 100,
          totalCarnivals: 25,
          totalClubs: 50,
          totalSubscriptions: 200
        },
        additionalCSS: ['/styles/admin.styles.css']
      });
    });

    it('should send newsletter to subscribers', async () => {
      req.body = {
        subject: 'Test Newsletter',
        content: 'Newsletter content'
      };

      const mockSubscribers = [
        createMockEmailSubscription(),
        createMockEmailSubscription({ id: 2, email: 'test2@example.com' })
      ];

      EmailSubscription.findAll.mockResolvedValue(mockSubscribers);
      ContactEmailService.sendNewsletter.mockResolvedValue({ sent: 2, failed: 0 });

      await sendNewsletter(req, res);

      expect(ContactEmailService.sendNewsletter).toHaveBeenCalledWith(
        'Test Newsletter',
        'Newsletter content',
        mockSubscribers
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Newsletter sent to 2 subscribers',
        details: { sent: 2, failed: 0 }
      });
    });

    it('should handle missing newsletter content', async () => {
      req.body = {
        subject: 'Test Newsletter'
        // Missing content
      };

      await sendNewsletter(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Subject and content are required'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in homepage', async () => {
      Carnival.findAll.mockRejectedValue(new Error('Database error'));

      await expect(getIndex(req, res)).rejects.toThrow('Database error');
    });

    it('should handle subscription errors gracefully', async () => {
      req.body = {
        email: 'test@example.com',
        state: ['NSW'],
        website: '',
        form_timestamp: Date.now() - 5000
      };

      EmailSubscription.create.mockRejectedValue(new Error('Database error'));

      await postSubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      });
    });

    it('should handle missing request body gracefully', async () => {
      req.body = undefined;

      await postSubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid request data'
      });
    });
  });
});