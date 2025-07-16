/**
 * Main Controller Unit Tests
 * 
 * Comprehensive test suite for Main controller following security-first principles
 * and strict MVC architecture. Tests cover homepage, dashboard, contact forms,
 * email subscriptions, and administrative functions.
 */

import { describe, test, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { sequelize } from '../config/database.mjs';

// Mock carousel service before importing controller
const mockCarouselImageService = {
  getCarouselImages: vi.fn().mockResolvedValue([
    { id: 1, url: '/images/carousel1.jpg', alt: 'Test Image 1' },
    { id: 2, url: '/images/carousel2.jpg', alt: 'Test Image 2' }
  ])
};

// Make carousel service available globally for the controller
global.carouselImageService = mockCarouselImageService;

// Mock external services before importing controller
vi.mock('../services/email/ContactEmailService.mjs', () => ({
  default: {
    sendContactFormEmail: vi.fn(),
    sendNewsletter: vi.fn()
  }
}));

vi.mock('../services/email/AuthEmailService.mjs', () => ({
  default: {
    sendWelcomeEmail: vi.fn()
  }
}));

// Mock crypto module for unsubscribe token handling
vi.mock('crypto', () => ({
  default: {
    createDecipher: vi.fn(() => ({
      update: vi.fn().mockReturnValue('test@example.com'),
      final: vi.fn().mockReturnValue('')
    }))
  }
}));

// Mock express-validator
vi.mock('express-validator', () => ({
  validationResult: vi.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

// Mock asyncHandler middleware
vi.mock('../middleware/asyncHandler.mjs', () => ({
  default: (fn) => fn // Return the function as-is for testing
}));

// Now import the controller and other dependencies
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
} from '../controllers/main.controller.mjs';
import {
  User,
  Club,
  Carnival,
  EmailSubscription,
  ClubPlayer,
  CarnivalClub
} from '../models/index.mjs';
import ContactEmailService from '../services/email/ContactEmailService.mjs';
import AuthEmailService from '../services/email/AuthEmailService.mjs';
import { AUSTRALIAN_STATES } from '../config/constants.mjs';

describe('Main Controller', () => {
  let mockReq, mockRes, mockNext;
  let testUser, testClub, testCarnival;

  beforeAll(async () => {
    // Ensure test database is ready
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clear database and reset mocks before each test
    await User.destroy({ where: {}, force: true });
    await Club.destroy({ where: {}, force: true });
    await Carnival.destroy({ where: {}, force: true });
    await EmailSubscription.destroy({ where: {}, force: true });
    await ClubPlayer.destroy({ where: {}, force: true });
    await CarnivalClub.destroy({ where: {}, force: true });
    
    vi.clearAllMocks();
    
    // Reset global subscription attempts
    global.subscriptionAttempts = new Map();

    // Create mock Express objects
    mockReq = {
      user: null,
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: vi.fn().mockReturnValue('Test User Agent'),
      flash: vi.fn().mockReturnValue([])
    };

    mockRes = {
      render: vi.fn(),
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      redirect: vi.fn()
    };

    mockNext = vi.fn();

    // Create test data
    testClub = await Club.create({
      clubName: 'Test Rugby Club',
      location: 'Test Location',
      state: 'NSW',
      isActive: true,
      isPubliclyListed: true
    });

    testUser = await User.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashedpassword123',
      clubId: testClub.id,
      isActive: true,
      isPrimaryDelegate: true
    });

    testCarnival = await Carnival.create({
      title: 'Test Carnival',
      date: new Date(Date.now() + 86400000), // Tomorrow
      endDate: new Date(Date.now() + 172800000), // Day after tomorrow
      locationAddress: 'Test Location',
      state: 'NSW',
      createdByUserId: testUser.id,
      isActive: true
    });
  });

  afterAll(async () => {
    // Clean up test database
    await User.destroy({ where: {}, force: true });
    await Club.destroy({ where: {}, force: true });
    await Carnival.destroy({ where: {}, force: true });
    await EmailSubscription.destroy({ where: {}, force: true });
    await ClubPlayer.destroy({ where: {}, force: true });
    await CarnivalClub.destroy({ where: {}, force: true });
    await sequelize.close();
  });

  describe('Homepage (getIndex)', () => {
    test('should render homepage with upcoming carnivals and stats', async () => {
      // Arrange
      mockReq.user = null; // Anonymous user

      // Act
      await getIndex(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('index', expect.objectContaining({
        title: 'Old Man Footy',
        user: null,
        upcomingCarnivals: expect.any(Array),
        carnivals: expect.any(Array),
        stats: expect.objectContaining({
          totalCarnivals: expect.any(Number),
          upcomingCount: expect.any(Number),
          clubsCount: expect.any(Number)
        }),
        carouselImages: expect.any(Array),
        AUSTRALIAN_STATES: expect.any(Object),
        additionalCSS: expect.any(Array)
      }));
      
      expect(mockCarouselImageService.getCarouselImages).toHaveBeenCalledWith(8);
    });

    test('should render homepage with user context for authenticated users', async () => {
      // Arrange
      mockReq.user = testUser;

      // Act
      await getIndex(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('index', expect.objectContaining({
        user: testUser,
        title: 'Old Man Footy'
      }));
    });

    test('should include upcoming carnivals ordered by date', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 259200000); // 3 days from now
      await Carnival.create({
        title: 'Future Carnival',
        date: futureDate,
        endDate: new Date(futureDate.getTime() + 86400000),
        locationAddress: 'Future Location',
        state: 'VIC',
        createdByUserId: testUser.id,
        isActive: true
      });

      // Act
      await getIndex(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalled();
      const renderCall = mockRes.render.mock.calls[0];
      const viewData = renderCall[1];
      
      expect(viewData.upcomingCarnivals).toBeDefined();
      expect(viewData.upcomingCarnivals.length).toBeGreaterThan(0);
    });

    test('should exclude inactive carnivals from homepage', async () => {
      // Arrange
      await Carnival.create({
        title: 'Inactive Carnival', // Fixed: was 'name', should be 'title'
        date: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        locationAddress: 'Test Location',
        state: 'NSW',
        createdByUserId: testUser.id,
        isActive: false // Inactive carnival
      });

      // Act
      await getIndex(mockReq, mockRes);

      // Assert
      const renderCall = mockRes.render.mock.calls[0];
      const viewData = renderCall[1];
      
      // Should not include inactive carnivals
      const inactiveCarnivals = viewData.upcomingCarnivals.filter(c => c.title === 'Inactive Carnival'); // Fixed: was 'name', should be 'title'
      expect(inactiveCarnivals).toHaveLength(0);
    });
  });

  describe('Dashboard (getDashboard)', () => {
    test('should render dashboard for authenticated user with club', async () => {
      // Arrange
      mockReq.user = testUser;

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('dashboard', expect.objectContaining({
        title: 'Dashboard',
        user: expect.objectContaining({
          id: testUser.id,
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName
        }),
        userCarnivals: expect.any(Array),
        attendingCarnivals: expect.any(Array),
        upcomingCarnivals: expect.any(Array),
        clubs: expect.any(Array),
        carnivals: expect.any(Array),
        eligibleDelegates: expect.any(Array),
        playerCount: expect.any(Number),
        additionalCSS: expect.any(Array)
      }));
    });

    test('should include user carnivals created by the user', async () => {
      // Arrange
      mockReq.user = testUser;

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      const renderCall = mockRes.render.mock.calls[0];
      const viewData = renderCall[1];
      
      expect(viewData.userCarnivals).toBeDefined();
      expect(Array.isArray(viewData.userCarnivals)).toBe(true);
    });

    test('should include eligible delegates for primary delegate transfer', async () => {
      // Arrange
      const eligibleDelegate = await User.create({
        email: 'delegate@example.com',
        firstName: 'Eligible',
        lastName: 'Delegate',
        passwordHash: 'hashedpassword123',
        clubId: testClub.id,
        isActive: true,
        isPrimaryDelegate: false
      });

      mockReq.user = testUser; // Primary delegate

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      const renderCall = mockRes.render.mock.calls[0];
      const viewData = renderCall[1];
      
      expect(viewData.eligibleDelegates).toBeDefined();
      expect(viewData.eligibleDelegates.length).toBeGreaterThan(0);
      expect(viewData.eligibleDelegates[0].id).toBe(eligibleDelegate.id);
    });

    test('should include player count for user club', async () => {
      // Arrange
      await ClubPlayer.create({
        firstName: 'Test',
        lastName: 'Player',
        dateOfBirth: '1980-01-01',
        email: 'player@example.com',
        clubId: testClub.id,
        isActive: true
      });

      mockReq.user = testUser;

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      const renderCall = mockRes.render.mock.calls[0];
      const viewData = renderCall[1];
      
      expect(viewData.playerCount).toBe(1);
    });

    test('should include carnivals club is attending', async () => {
      // Arrange
      await CarnivalClub.create({
        carnivalId: testCarnival.id,
        clubId: testClub.id,
        teamName: 'Test Team',
        playerCount: 15,
        isActive: true
      });

      mockReq.user = testUser;

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      const renderCall = mockRes.render.mock.calls[0];
      const viewData = renderCall[1];
      
      expect(viewData.attendingCarnivals).toBeDefined();
      expect(viewData.attendingCarnivals.length).toBeGreaterThan(0);
    });
  });

  describe('About Page (getAbout)', () => {
    test('should render about page', async () => {
      // Act
      await getAbout(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('about', {
        title: 'About Old Man Footy',
        additionalCSS: []
      });
    });
  });

  describe('Email Subscription (postSubscribe)', () => {
    beforeEach(() => {
      // Reset rate limiting between tests
      global.subscriptionAttempts = new Map();
      
      mockReq.body = {
        email: 'subscriber@example.com',
        state: ['NSW', 'VIC'],
        website: '', // Honeypot field
        form_timestamp: (Date.now() - 5000).toString() // 5 seconds ago to pass timing validation
      };
    });

    test('should successfully subscribe new email', async () => {
      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully subscribed to newsletter!'
      });

      // Verify database entry
      const subscription = await EmailSubscription.findOne({
        where: { email: 'subscriber@example.com' }
      });
      expect(subscription).toBeTruthy();
      expect(subscription.isActive).toBe(true);
      expect(subscription.states).toEqual(['NSW', 'VIC']);
    });

    test('should reject bot submissions with honeypot field filled', async () => {
      // Arrange
      mockReq.body.website = 'http://spam.com'; // Bot filled honeypot

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid request'
      });
    });

    test('should reject submissions that are too fast (bot protection)', async () => {
      // Arrange
      mockReq.body.form_timestamp = (Date.now() - 1000).toString(); // 1 second ago

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please wait a moment before submitting'
      });
    });

    test('should reject submissions with future timestamps', async () => {
      // Arrange
      mockReq.body.form_timestamp = (Date.now() + 10000).toString(); // 10 seconds in future

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid form timestamp'
      });
    });

    test('should reject expired form sessions', async () => {
      // Arrange
      const expiredTime = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      mockReq.body.form_timestamp = expiredTime.toString();

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Form session expired, please refresh and try again'
      });
    });

    test('should enforce rate limiting', async () => {
      // Arrange - First submission with valid timing
      mockReq.body.email = 'first@example.com';
      await postSubscribe(mockReq, mockRes);
      vi.clearAllMocks();

      // Act - Second submission from same IP within rate limit window
      mockReq.body.email = 'second@example.com';
      mockReq.body.form_timestamp = (Date.now() - 5000).toString(); // Valid timestamp
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many requests. Please wait a moment before trying again.'
      });
    });

    test('should validate email format', async () => {
      // Arrange
      mockReq.body.email = 'invalid-email';

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email address'
      });
    });

    test('should reject already subscribed active emails', async () => {
      // Arrange
      await EmailSubscription.create({
        email: 'subscriber@example.com',
        states: ['NSW'],
        isActive: true,
        subscribedAt: new Date()
      });

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'This email is already subscribed to our newsletter!'
      });
    });

    test('should reactivate previously unsubscribed emails', async () => {
      // Arrange
      await EmailSubscription.create({
        email: 'subscriber@example.com',
        states: ['QLD'],
        isActive: false,
        subscribedAt: new Date(Date.now() - 86400000),
        unsubscribedAt: new Date()
      });

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully subscribed to newsletter!'
      });

      // Verify reactivation
      const subscription = await EmailSubscription.findOne({
        where: { email: 'subscriber@example.com' }
      });
      expect(subscription.isActive).toBe(true);
      expect(subscription.states).toEqual(['NSW', 'VIC']);
    });

    test('should default to all states when none provided', async () => {
      // Arrange
      delete mockReq.body.state;

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      const subscription = await EmailSubscription.findOne({
        where: { email: 'subscriber@example.com' }
      });
      expect(subscription.states).toEqual(AUSTRALIAN_STATES);
    });

    test('should handle single state selection', async () => {
      // Arrange
      mockReq.body.state = 'NSW'; // Single string instead of array

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      const subscription = await EmailSubscription.findOne({
        where: { email: 'subscriber@example.com' }
      });
      expect(subscription.states).toEqual(['NSW']);
    });

    test('should send welcome email after successful subscription', async () => {
      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(AuthEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'subscriber@example.com',
        ['NSW', 'VIC']
      );
    });

    test('should continue subscription even if welcome email fails', async () => {
      // Arrange
      AuthEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service down'));

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully subscribed to newsletter!'
      });

      // Verify subscription was still created
      const subscription = await EmailSubscription.findOne({
        where: { email: 'subscriber@example.com' }
      });
      expect(subscription).toBeTruthy();
    });

    test('should handle missing request body gracefully', async () => {
      // Arrange
      mockReq.body = undefined;

      // Act
      await postSubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid request data'
      });
    });
  });

  describe('Unsubscribe (getUnsubscribe)', () => {
    test('should render unsubscribe page for valid token', async () => {
      // Arrange
      await EmailSubscription.create({
        email: 'test@example.com',
        states: ['NSW'],
        isActive: true,
        subscribedAt: new Date()
      });

      mockReq.params = { token: 'valid-token' };

      // Act
      await getUnsubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('unsubscribe', {
        title: 'Unsubscribe',
        email: 'test@example.com',
        additionalCSS: []
      });
    });

    test('should render error page for invalid token', async () => {
      // Arrange
      mockReq.params = { token: 'invalid-token' };

      // Act
      await getUnsubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        title: 'Invalid Link',
        message: 'This unsubscribe link is invalid or has expired.',
        error: null,
        additionalCSS: []
      });
    });
  });

  describe('Process Unsubscribe (postUnsubscribe)', () => {
    test('should successfully unsubscribe email', async () => {
      // Arrange
      const subscription = await EmailSubscription.create({
        email: 'test@example.com',
        states: ['NSW'],
        isActive: true,
        subscribedAt: new Date()
      });

      mockReq.body = { email: 'test@example.com' };

      // Act
      await postUnsubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('success', {
        title: 'Unsubscribed',
        message: 'You have been successfully unsubscribed from our newsletter.',
        additionalCSS: []
      });

      // Verify database update
      await subscription.reload();
      expect(subscription.isActive).toBe(false);
      expect(subscription.unsubscribedAt).toBeTruthy();
    });

    test('should handle unsubscribe for non-existent email gracefully', async () => {
      // Arrange
      mockReq.body = { email: 'nonexistent@example.com' };

      // Act
      await postUnsubscribe(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('success', {
        title: 'Unsubscribed',
        message: 'You have been successfully unsubscribed from our newsletter.',
        additionalCSS: []
      });
    });
  });

  describe('Admin Statistics (getStats)', () => {
    test('should render admin statistics page', async () => {
      // Act
      await getStats(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('admin/stats', {
        title: 'Admin Statistics',
        stats: expect.objectContaining({
          totalUsers: expect.any(Number),
          totalCarnivals: expect.any(Number),
          totalClubs: expect.any(Number),
          totalSubscriptions: expect.any(Number)
        }),
        additionalCSS: ['/styles/admin.styles.css']
      });
    });
  });

  describe('Send Newsletter (sendNewsletter)', () => {
    test('should send newsletter to all subscribers', async () => {
      // Arrange
      await EmailSubscription.create({
        email: 'subscriber1@example.com',
        states: ['NSW'],
        isActive: true,
        subscribedAt: new Date()
      });

      await EmailSubscription.create({
        email: 'subscriber2@example.com',
        states: ['VIC'],
        isActive: true,
        subscribedAt: new Date()
      });

      mockReq.body = {
        subject: 'Test Newsletter',
        content: 'Newsletter content'
      };

      ContactEmailService.sendNewsletter.mockResolvedValue({
        sent: 2,
        failed: 0
      });

      // Act
      await sendNewsletter(mockReq, mockRes);

      // Assert
      expect(ContactEmailService.sendNewsletter).toHaveBeenCalledWith(
        'Test Newsletter',
        'Newsletter content',
        expect.any(Array)
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Newsletter sent to 2 subscribers',
        details: { sent: 2, failed: 0 }
      });
    });

    test('should reject newsletter without subject', async () => {
      // Arrange
      mockReq.body = { content: 'Newsletter content' };

      // Act
      await sendNewsletter(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Subject and content are required'
      });
    });

    test('should reject newsletter without content', async () => {
      // Arrange
      mockReq.body = { subject: 'Test Newsletter' };

      // Act
      await sendNewsletter(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Subject and content are required'
      });
    });
  });

  describe('Contact Page (getContact)', () => {
    test('should render contact page for anonymous user', async () => {
      // Arrange
      mockReq.user = null;

      // Act
      await getContact(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('contact', {
        title: 'Contact Us',
        user: null,
        errors: [],
        success: [],
        additionalCSS: []
      });
    });

    test('should render contact page with user data for authenticated user', async () => {
      // Arrange
      mockReq.user = testUser;

      // Act
      await getContact(mockReq, mockRes);

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith('contact', expect.objectContaining({
        title: 'Contact Us',
        user: expect.objectContaining({
          id: testUser.id,
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName
        }),
        errors: [],
        success: [],
        additionalCSS: []
      }));
    });

    test('should include club information for users with clubs', async () => {
      // Arrange
      mockReq.user = testUser;

      // Act
      await getContact(mockReq, mockRes);

      // Assert
      const renderCall = mockRes.render.mock.calls[0];
      const viewData = renderCall[1];
      
      expect(viewData.user.clubId).toBeDefined();
      expect(viewData.user.clubId.clubName).toBe(testClub.clubName);
    });
  });

  describe('Contact Form Submission (postContact)', () => {
    beforeEach(() => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '0412345678',
        subject: 'general',
        clubName: 'Test Club',
        message: 'Test message',
        newsletter: 'on'
      };

      mockReq.flash = vi.fn();
    });

    test('should successfully submit contact form', async () => {
      // Arrange
      ContactEmailService.sendContactFormEmail.mockResolvedValue(true);

      // Act
      await postContact(mockReq, mockRes);

      // Assert
      expect(ContactEmailService.sendContactFormEmail).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '0412345678',
        subject: 'general',
        clubName: 'Test Club',
        message: 'Test message',
        newsletter: true,
        userAgent: 'Test User Agent',
        ipAddress: '127.0.0.1'
      });

      expect(mockReq.flash).toHaveBeenCalledWith(
        'success_msg',
        "Thank you for contacting us! We'll get back to you within 1-2 business days."
      );
      expect(mockRes.redirect).toHaveBeenCalledWith('/contact');
    });

    test('should subscribe to newsletter when requested', async () => {
      // Arrange
      ContactEmailService.sendContactFormEmail.mockResolvedValue(true);

      // Act
      await postContact(mockReq, mockRes);

      // Assert
      const subscription = await EmailSubscription.findOne({
        where: { email: 'john.doe@example.com' }
      });
      expect(subscription).toBeTruthy();
      expect(subscription.isActive).toBe(true);
      expect(subscription.source).toBe('contact_form');
      expect(subscription.states).toEqual(AUSTRALIAN_STATES);
    });

    test('should not create duplicate newsletter subscription', async () => {
      // Arrange
      await EmailSubscription.create({
        email: 'john.doe@example.com',
        states: ['NSW'],
        isActive: true,
        subscribedAt: new Date(),
        source: 'homepage'
      });

      ContactEmailService.sendContactFormEmail.mockResolvedValue(true);

      // Act
      await postContact(mockReq, mockRes);

      // Assert
      const subscriptions = await EmailSubscription.findAll({
        where: { email: 'john.doe@example.com' }
      });
      expect(subscriptions).toHaveLength(1); // Should not create duplicate
    });

    test('should handle contact form without newsletter subscription', async () => {
      // Arrange
      delete mockReq.body.newsletter;
      ContactEmailService.sendContactFormEmail.mockResolvedValue(true);

      // Act
      await postContact(mockReq, mockRes);

      // Assert
      const subscription = await EmailSubscription.findOne({
        where: { email: 'john.doe@example.com' }
      });
      expect(subscription).toBeNull(); // Should not create subscription
    });
  });

  describe('Model Hooks - Automatic unsubscribedAt Management', () => {
    test('should automatically set unsubscribedAt when isActive changes from true to false', async () => {
      // Arrange
      const subscription = await EmailSubscription.create({
        email: 'test-hook@example.com',
        states: ['NSW'],
        isActive: true,
        subscribedAt: new Date()
      });

      expect(subscription.unsubscribedAt).toBeNull();

      // Act - Change isActive from true to false
      await subscription.update({
        isActive: false
      });

      // Assert
      await subscription.reload();
      expect(subscription.isActive).toBe(false);
      expect(subscription.unsubscribedAt).toBeTruthy();
      expect(subscription.unsubscribedAt).toBeInstanceOf(Date);
    });

    test('should not overwrite existing unsubscribedAt when isActive changes from true to false', async () => {
      // Arrange
      const existingUnsubscribeDate = new Date('2025-01-01T10:00:00Z');
      const subscription = await EmailSubscription.create({
        email: 'test-existing@example.com',
        states: ['VIC'],
        isActive: true,
        subscribedAt: new Date(),
        unsubscribedAt: existingUnsubscribeDate
      });

      // Act - Change isActive from true to false
      await subscription.update({
        isActive: false
      });

      // Assert - Should preserve existing unsubscribedAt
      await subscription.reload();
      expect(subscription.isActive).toBe(false);
      expect(subscription.unsubscribedAt).toEqual(existingUnsubscribeDate);
    });

    test('should clear unsubscribedAt when isActive changes from false to true (reactivation)', async () => {
      // Arrange
      const subscription = await EmailSubscription.create({
        email: 'test-reactivate@example.com',
        states: ['QLD'],
        isActive: false,
        subscribedAt: new Date(),
        unsubscribedAt: new Date()
      });

      expect(subscription.unsubscribedAt).toBeTruthy();

      // Act - Reactivate subscription
      await subscription.update({
        isActive: true,
        states: ['QLD', 'NSW'] // Also updating states
      });

      // Assert
      await subscription.reload();
      expect(subscription.isActive).toBe(true);
      expect(subscription.unsubscribedAt).toBeNull();
    });

    test('should not modify unsubscribedAt when isActive is not changed', async () => {
      // Arrange
      const subscription = await EmailSubscription.create({
        email: 'test-no-change@example.com',
        states: ['SA'],
        isActive: true,
        subscribedAt: new Date()
      });

      expect(subscription.unsubscribedAt).toBeNull();

      // Act - Update other fields without changing isActive
      await subscription.update({
        states: ['SA', 'WA'] // Only update states
      });

      // Assert - unsubscribedAt should remain null
      await subscription.reload();
      expect(subscription.isActive).toBe(true);
      expect(subscription.unsubscribedAt).toBeNull();
    });

    test('should handle multiple status changes correctly', async () => {
      // Arrange
      const subscription = await EmailSubscription.create({
        email: 'test-multiple@example.com',
        states: ['TAS'],
        isActive: true,
        subscribedAt: new Date()
      });

      // Act & Assert - First unsubscribe
      await subscription.update({ isActive: false });
      await subscription.reload();
      expect(subscription.isActive).toBe(false);
      expect(subscription.unsubscribedAt).toBeTruthy();
      
      const firstUnsubscribeDate = subscription.unsubscribedAt;

      // Act & Assert - Reactivate
      await subscription.update({ isActive: true });
      await subscription.reload();
      expect(subscription.isActive).toBe(true);
      expect(subscription.unsubscribedAt).toBeNull();

      // Act & Assert - Unsubscribe again
      await subscription.update({ isActive: false });
      await subscription.reload();
      expect(subscription.isActive).toBe(false);
      expect(subscription.unsubscribedAt).toBeTruthy();
      
      // Should have a new timestamp (different from first unsubscribe)
      expect(subscription.unsubscribedAt.getTime()).toBeGreaterThan(firstUnsubscribeDate.getTime());
    });
  });
});