const MySidelineService = require('../services/mySidelineService');
const Carnival = require('../models/Carnival');
const User = require('../models/User');
const Club = require('../models/Club');
const emailService = require('../services/emailService');
const axios = require('axios');

// Mock external dependencies
jest.mock('axios');
jest.mock('../services/emailService');
jest.mock('node-cron');

describe('MySidelineIntegrationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        MySidelineService.isRunning = false;
        MySidelineService.lastSyncDate = null;
    });

    describe('Initialization', () => {
        test('should initialize with correct default values', () => {
            expect(MySidelineService.baseUrl).toBeDefined();
            expect(MySidelineService.isRunning).toBe(false);
            expect(MySidelineService.lastSyncDate).toBeNull();
        });

        test('should use environment URL if provided', () => {
            const originalEnv = process.env.MYSIDELINE_URL;
            process.env.MYSIDELINE_URL = 'https://test.mysideline.com';
            
            // Re-require to get new instance with env var
            delete require.cache[require.resolve('../services/mySidelineService')];
            const TestService = require('../services/mySidelineService');
            
            expect(TestService.baseUrl).toBe('https://test.mysideline.com');
            
            // Restore original
            process.env.MYSIDELINE_URL = originalEnv;
        });
    });

    describe('Event Scraping', () => {
        test('should generate mock events when MySideline is not accessible', async () => {
            axios.get.mockRejectedValue({ code: 'ENOTFOUND' });
            
            const events = await MySidelineService.scrapeStateEvents('NSW');
            
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                mySidelineId: 'mock-NSW-001',
                title: 'NSW Masters Rugby League Carnival',
                state: 'NSW',
                location: 'NSW Sports Complex'
            });
            expect(events[0].date).toBeInstanceOf(Date);
        });

        test('should parse HTML events when MySideline is accessible', async () => {
            const mockHtml = `
                <div class="event-item" data-event-id="real-001">
                    <div class="event-title">Test Carnival</div>
                    <div class="event-date">2025-07-15</div>
                    <div class="event-location">Test Stadium</div>
                    <div class="event-description">Test Description</div>
                    <a class="register-link" href="/register/real-001">Register</a>
                    <div class="contact-name">Test Organiser</div>
                    <div class="contact-email">test@example.com</div>
                    <div class="contact-phone">0400 123 456</div>
                </div>
            `;
            
            axios.get.mockResolvedValue({ data: mockHtml });
            
            const events = await MySidelineService.scrapeStateEvents('QLD');
            
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                mySidelineId: 'real-001',
                title: 'Test Carnival',
                state: 'QLD',
                location: 'Test Stadium',
                description: 'Test Description'
            });
        });

        test('should handle scraping errors gracefully', async () => {
            axios.get.mockRejectedValue(new Error('Network error'));
            
            await expect(MySidelineService.scrapeStateEvents('VIC')).rejects.toThrow('Network error');
        });
    });

    describe('Event Processing', () => {
        test('should create new carnival from scraped event', async () => {
            const scrapedEvent = {
                mySidelineId: 'test-001',
                title: 'Test Carnival',
                date: new Date('2025-07-15'),
                location: 'Test Stadium',
                state: 'NSW',
                description: 'Test Description',
                registrationLink: '/register/test-001',
                contactInfo: {
                    name: 'Test Organiser',
                    email: 'test@example.com',
                    phone: '0400 123 456'
                }
            };

            const result = await MySidelineService.createNewEvent(scrapedEvent);
            
            expect(result).toBeDefined();
            expect(result.title).toBe('Test Carnival');
            expect(result.mySidelineEventId).toBe('test-001');
            expect(result.isManuallyEntered).toBe(false);
            expect(result.isActive).toBe(true);
            
            // Verify carnival was saved to database
            const savedCarnival = await Carnival.findById(result._id);
            expect(savedCarnival).toBeDefined();
            expect(savedCarnival.title).toBe('Test Carnival');
        });

        test('should update existing carnival when changes detected', async () => {
            // Create existing carnival
            const existingCarnival = new Carnival({
                title: 'Old Title',
                date: new Date('2025-07-15'),
                locationAddress: 'Old Location',
                mySidelineEventId: 'test-001',
                isActive: true
            });
            await existingCarnival.save();

            const scrapedEvent = {
                mySidelineId: 'test-001',
                title: 'Updated Title',
                date: new Date('2025-07-16'),
                location: 'Updated Location',
                state: 'NSW',
                description: 'Updated Description',
                registrationLink: '/register/test-001',
                contactInfo: {
                    name: 'Updated Organiser',
                    email: 'updated@example.com',
                    phone: '0400 123 457'
                }
            };

            const result = await MySidelineService.updateExistingEvent(existingCarnival, scrapedEvent);
            
            expect(result).toBeDefined();
            expect(result.title).toBe('Updated Title');
            expect(result.locationAddress).toBe('Updated Location');
            
            // Verify changes were saved
            const updatedCarnival = await Carnival.findById(existingCarnival._id);
            expect(updatedCarnival.title).toBe('Updated Title');
        });

        test('should not update carnival when no changes detected', async () => {
            // Create an existing carnival with all required fields
            const existingCarnival = new Carnival({
                title: 'Existing Event',
                date: new Date('2025-08-15'),
                locationAddress: 'Test Location',
                state: 'NSW',
                scheduleDetails: 'Test schedule details',
                organiserContactName: 'Test Organiser',
                organiserContactEmail: 'test@example.com',
                organiserContactPhone: '0400123456',
                mySidelineEventId: 'existing-event-1',
                isManuallyEntered: false,
                isActive: true
            });
            await existingCarnival.save();

            const scrapedEvent = {
                mySidelineId: 'existing-event-1',
                title: 'Existing Event',
                date: new Date('2025-08-15'),
                location: 'Test Location',
                description: 'Test Description',
                contactInfo: {
                    name: 'Test Contact',
                    email: 'test@example.com',
                    phone: '0400123456'
                }
            };

            const result = await MySidelineService.updateExistingEvent(existingCarnival, scrapedEvent);
            expect(result).toBeNull(); // No changes detected
        });
    });

    describe('Ownership Management', () => {
        test('should allow taking ownership of MySideline event', async () => {
            // Create test user and club
            const club = new Club({
                name: 'Test Club',
                state: 'NSW',
                isActive: true
            });
            await club.save();

            const user = new User({
                email: 'test@example.com',
                name: 'Test User',
                clubId: club._id,
                isActive: true
            });
            await user.save();

            // Create MySideline carnival without owner
            const carnival = new Carnival({
                title: 'Test Carnival',
                date: new Date('2025-07-15'),
                locationAddress: 'Test Stadium',
                mySidelineEventId: 'test-001',
                isActive: true
            });
            await carnival.save();

            const result = await MySidelineService.takeOwnership(carnival._id, user._id);
            
            expect(result.success).toBe(true);
            expect(result.carnival.createdByUserId.toString()).toBe(user._id.toString());
            expect(result.carnival.isManuallyEntered).toBe(true);
        });

        test('should prevent taking ownership of already owned carnival', async () => {
            const user1 = new User({
                email: 'user1@example.com',
                name: 'User 1',
                isActive: true
            });
            await user1.save();

            const user2 = new User({
                email: 'user2@example.com',
                name: 'User 2',
                isActive: true
            });
            await user2.save();

            const carnival = new Carnival({
                title: 'Test Carnival',
                date: new Date('2025-07-15'),
                locationAddress: 'Test Stadium',
                mySidelineEventId: 'test-001',
                createdByUserId: user1._id,
                isActive: true
            });
            await carnival.save();

            await expect(MySidelineService.takeOwnership(carnival._id, user2._id))
                .rejects.toThrow('Carnival already has an owner');
        });

        test('should prevent taking ownership of non-MySideline event', async () => {
            const user = new User({
                email: 'test@example.com',
                name: 'Test User',
                isActive: true
            });
            await user.save();

            const carnival = new Carnival({
                title: 'Manual Carnival',
                date: new Date('2025-07-15'),
                locationAddress: 'Test Stadium',
                isActive: true
                // No mySidelineEventId
            });
            await carnival.save();

            await expect(MySidelineService.takeOwnership(carnival._id, user._id))
                .rejects.toThrow('Not a MySideline imported event');
        });
    });

    describe('Sync Management', () => {
        test('should prevent concurrent sync operations', async () => {
            MySidelineService.isRunning = true;
            
            const result = await MySidelineService.triggerManualSync();
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('Sync already in progress');
        });

        test('should return correct sync status', () => {
            const testDate = new Date('2025-06-01T03:00:00Z');
            MySidelineService.lastSyncDate = testDate;
            MySidelineService.isRunning = true;
            
            const status = MySidelineService.getSyncStatus();
            
            expect(status.isRunning).toBe(true);
            expect(status.lastSyncDate).toBe(testDate);
            expect(status.nextScheduledSync).toBeInstanceOf(Date);
        });

        test('should handle full sync process', async () => {
            // Mock the scraping to return some events
            jest.spyOn(MySidelineService, 'scrapeMySidelineEvents').mockResolvedValue([
                {
                    mySidelineId: 'test-event-1',
                    title: 'Test Masters Event',
                    date: new Date('2025-08-15'),
                    location: 'Test Location',
                    state: 'NSW',
                    description: 'Test Description',
                    contactInfo: {
                        name: 'Test Contact',
                        email: 'test@example.com',
                        phone: '0400123456'
                    }
                }
            ]);

            const result = await MySidelineService.syncMySidelineEvents();

            expect(result.success).toBe(true);
            expect(result.eventsProcessed).toBeGreaterThan(0);
            expect(result.lastSync).toBeInstanceOf(Date);
            
            // Verify events were created
            const carnival = await Carnival.findOne({ mySidelineEventId: 'test-event-1' });
            expect(carnival).toBeTruthy();
            expect(carnival.title).toBe('Test Masters Event');
        });
    });

    describe('Date and Data Parsing', () => {
        test('should parse various date formats correctly', () => {
            const testDates = [
                '2025-07-15',
                '15/07/2025',
                '15-07-2025',
                'July 15, 2025'
            ];

            testDates.forEach(dateString => {
                const parsed = MySidelineService.parseEventDate(dateString);
                expect(parsed).toBeInstanceOf(Date);
                expect(parsed.getFullYear()).toBe(2025);
            });
        });

        test('should handle invalid dates gracefully', () => {
            const invalidDate = MySidelineService.parseEventDate('invalid-date');
            expect(invalidDate).toBeInstanceOf(Date);
        });

        test('should extract contact info correctly', () => {
            const mockElement = { 
                mockData: true,
                textContent: 'Contact: Test Organiser, Email: test@example.com, Phone: 0400 123 456'
            };
            const contactInfo = MySidelineService.extractContactInfo(mockElement);
            
            expect(contactInfo).toEqual({
                name: 'Test Organiser',
                email: 'test@example.com',
                phone: '0400 123 456'
            });
        });
    });

    describe('Email Notifications', () => {
        test('should send notifications for new carnivals', async () => {
            emailService.sendCarnivalNotification.mockResolvedValue(true);

            const scrapedEvent = {
                mySidelineId: 'notification-test-001',
                title: 'Notification Test Carnival',
                date: new Date('2025-07-15'),
                location: 'Test Stadium',
                state: 'NSW',
                description: 'Test Description',
                registrationLink: '/register/notification-test-001',
                contactInfo: {
                    name: 'Test Organiser',
                    email: 'test@example.com',
                    phone: '0400 123 456'
                }
            };

            await MySidelineService.createNewEvent(scrapedEvent);
            
            expect(emailService.sendCarnivalNotification).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Notification Test Carnival' }),
                'new'
            );
        });

        test('should handle email notification failures gracefully', async () => {
            emailService.sendCarnivalNotification.mockRejectedValue(new Error('Email failed'));

            const scrapedEvent = {
                mySidelineId: 'email-fail-test-001',
                title: 'Email Fail Test Carnival',
                date: new Date('2025-07-15'),
                location: 'Test Stadium',
                state: 'NSW',
                description: 'Test Description',
                registrationLink: '/register/email-fail-test-001',
                contactInfo: {
                    name: 'Test Organiser',
                    email: 'test@example.com',
                    phone: '0400 123 456'
                }
            };

            // Should not throw error even if email fails
            const result = await MySidelineService.createNewEvent(scrapedEvent);
            expect(result).toBeDefined();
            expect(result.title).toBe('Email Fail Test Carnival');
        });
    });
});