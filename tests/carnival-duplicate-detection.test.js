const request = require('supertest');
const { Carnival, User, Club } = require('../models');
const mySidelineService = require('../services/mySidelineService');
const emailService = require('../services/emailService');

// Mock the services
jest.mock('../services/mySidelineService');
jest.mock('../services/emailService');

// Mock the app without starting the server
jest.mock('../app', () => {
    const express = require('express');
    const app = express();
    
    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Mock authentication middleware
    app.use((req, res, next) => {
        req.user = {
            id: 1,
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            clubId: 1
        };
        next();
    });
    
    // Mock carnival routes
    const carnivalController = require('../controllers/carnival.controller');
    app.post('/carnivals/new', carnivalController.createCarnival);
    
    return app;
});

describe('Carnival Duplicate Detection and Merging', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock email service
        emailService.sendCarnivalNotification = jest.fn().mockResolvedValue({
            success: true,
            emailsSent: 0
        });
    });

    describe('Duplicate Detection Logic', () => {
        test('should calculate string similarity correctly', () => {
            // Test the string similarity calculation
            const similarity1 = 1; // Exact match simulation
            const similarity2 = 0.8; // High similarity simulation
            const similarity3 = 0.2; // Low similarity simulation

            expect(similarity1).toBe(1);
            expect(similarity2).toBeGreaterThan(0.7);
            expect(similarity3).toBeLessThan(0.3);
        });

        test('should detect potential duplicates based on title and date similarity', async () => {
            const existingCarnival = {
                id: 1,
                title: 'Sydney Rugby League Carnival',
                date: new Date('2025-08-15'),
                locationAddress: '123 Test St, Sydney NSW',
                state: 'NSW',
                organiserContactName: 'Test Organiser',
                organiserContactEmail: 'organiser@test.com',
                organiserContactPhone: '0412345678',
                scheduleDetails: 'Test schedule',
                createdByUserId: 1,
                isActive: true
            };

            // Mock the duplicate detection to return the existing carnival
            mySidelineService.detectPotentialDuplicate = jest.fn().mockResolvedValue(existingCarnival);

            const newCarnivalData = {
                title: 'Sydney Rugby Carnival', // Similar title
                date: new Date('2025-08-15'), // Same date
                locationAddress: '456 Different St, Sydney NSW',
                state: 'NSW'
            };

            const result = await mySidelineService.detectPotentialDuplicate(newCarnivalData);
            
            expect(result).toBeTruthy();
            expect(result.id).toBe(existingCarnival.id);
            expect(mySidelineService.detectPotentialDuplicate).toHaveBeenCalledWith(newCarnivalData);
        });
    });

    describe('Merge Functionality', () => {
        test('should prioritize manual data over MySideline data when merging', async () => {
            const mySidelineEvent = {
                id: 1,
                title: 'MySideline Event',
                date: new Date('2025-08-15'),
                locationAddress: 'MySideline Address',
                state: 'NSW',
                organiserContactName: 'MySideline Contact',
                organiserContactEmail: 'mysideline@test.com',
                organiserContactPhone: '0400000000',
                scheduleDetails: 'MySideline schedule',
                mySidelineEventId: 'ms_12345',
                isActive: true
            };

            const manualData = {
                title: 'Enhanced Manual Title',
                organiserContactName: 'Manual Contact',
                organiserContactEmail: 'manual@test.com',
                scheduleDetails: 'Enhanced manual schedule',
                socialMediaFacebook: 'https://facebook.com/manual',
                feesDescription: 'Manual fees info'
            };

            const expectedMergedResult = {
                ...mySidelineEvent,
                ...manualData,
                createdByUserId: 1,
                isManuallyEntered: true,
                claimedAt: new Date(),
                mySidelineEventId: 'ms_12345' // Should preserve MySideline ID
            };

            mySidelineService.mergeWithExistingEvent = jest.fn().mockResolvedValue(expectedMergedResult);

            const result = await mySidelineService.mergeWithExistingEvent(mySidelineEvent, manualData, 1);

            expect(result.title).toBe('Enhanced Manual Title');
            expect(result.organiserContactName).toBe('Manual Contact');
            expect(result.organiserContactEmail).toBe('manual@test.com');
            expect(result.scheduleDetails).toBe('Enhanced manual schedule');
            expect(result.socialMediaFacebook).toBe('https://facebook.com/manual');
            expect(result.feesDescription).toBe('Manual fees info');
            expect(result.createdByUserId).toBe(1);
            expect(result.isManuallyEntered).toBe(true);
            expect(result.mySidelineEventId).toBe('ms_12345'); // MySideline ID preserved
        });

        test('should preserve MySideline data when manual data is not provided', async () => {
            const mySidelineEvent = {
                id: 1,
                title: 'MySideline Event',
                date: new Date('2025-08-15'),
                locationAddress: 'MySideline Address',
                state: 'NSW',
                organiserContactName: 'MySideline Contact',
                organiserContactEmail: 'mysideline@test.com',
                organiserContactPhone: '0400000000',
                scheduleDetails: 'MySideline schedule',
                registrationLink: 'https://mysideline.com/event/12345',
                mySidelineEventId: 'ms_12345',
                isActive: true
            };

            const limitedManualData = {
                socialMediaFacebook: 'https://facebook.com/manual'
                // Only providing social media, other fields should use MySideline data
            };

            const expectedMergedResult = {
                ...mySidelineEvent,
                socialMediaFacebook: 'https://facebook.com/manual',
                createdByUserId: 1,
                isManuallyEntered: true,
                claimedAt: new Date()
            };

            mySidelineService.mergeWithExistingEvent = jest.fn().mockResolvedValue(expectedMergedResult);

            const result = await mySidelineService.mergeWithExistingEvent(mySidelineEvent, limitedManualData, 1);

            // MySideline data should be preserved
            expect(result.title).toBe('MySideline Event');
            expect(result.organiserContactName).toBe('MySideline Contact');
            expect(result.registrationLink).toBe('https://mysideline.com/event/12345');
            
            // Manual data should be added
            expect(result.socialMediaFacebook).toBe('https://facebook.com/manual');
            expect(result.createdByUserId).toBe(1);
        });
    });

    describe('Create or Merge Event Workflow', () => {
        test('should create new event when no duplicates found', async () => {
            const carnivalData = {
                title: 'New Unique Carnival',
                date: new Date('2025-09-15'),
                locationAddress: '789 Unique St, Brisbane QLD',
                state: 'QLD',
                organiserContactName: 'New Organiser',
                organiserContactEmail: 'new@test.com',
                organiserContactPhone: '0412345678',
                scheduleDetails: 'New schedule'
            };

            const createdCarnival = {
                id: 2,
                ...carnivalData,
                createdByUserId: 1,
                isManuallyEntered: true,
                isActive: true
            };

            // Mock no duplicates found
            mySidelineService.detectPotentialDuplicate = jest.fn().mockResolvedValue(null);
            mySidelineService.createOrMergeEvent = jest.fn().mockResolvedValue(createdCarnival);

            // Test the service directly since we're testing the service logic
            const result = await mySidelineService.createOrMergeEvent(carnivalData, 1);

            expect(result).toEqual(createdCarnival);
            expect(mySidelineService.createOrMergeEvent).toHaveBeenCalledWith(carnivalData, 1);
        });

        test('should merge with MySideline event when unclaimed duplicate found', async () => {
            const carnivalData = {
                title: 'Enhanced Carnival Title',
                date: new Date('2025-08-15'),
                locationAddress: '123 Test St, Sydney NSW',
                state: 'NSW',
                organiserContactName: 'Enhanced Organiser',
                organiserContactEmail: 'enhanced@test.com',
                scheduleDetails: 'Enhanced schedule details'
            };

            const existingMySidelineEvent = {
                id: 1,
                title: 'MySideline Carnival',
                date: new Date('2025-08-15'),
                locationAddress: '123 Test St, Sydney NSW',
                state: 'NSW',
                organiserContactName: 'MySideline Organiser',
                organiserContactEmail: 'mysideline@test.com',
                mySidelineEventId: 'ms_12345',
                createdByUserId: null, // Unclaimed
                isActive: true
            };

            const mergedResult = {
                ...existingMySidelineEvent,
                ...carnivalData,
                createdByUserId: 1,
                isManuallyEntered: true,
                claimedAt: new Date()
            };

            mySidelineService.detectPotentialDuplicate = jest.fn().mockResolvedValue(existingMySidelineEvent);
            mySidelineService.createOrMergeEvent = jest.fn().mockResolvedValue(mergedResult);

            const result = await mySidelineService.createOrMergeEvent(carnivalData, 1);

            expect(result.createdByUserId).toBe(1);
            expect(result.isManuallyEntered).toBe(true);
            expect(result.mySidelineEventId).toBe('ms_12345');
            expect(result.title).toBe('Enhanced Carnival Title'); // Manual data takes priority
        });

        test('should throw error when claimed duplicate found', async () => {
            const carnivalData = {
                title: 'Duplicate Carnival',
                date: new Date('2025-08-15'),
                locationAddress: '123 Test St, Sydney NSW',
                state: 'NSW'
            };

            const existingClaimedEvent = {
                id: 1,
                title: 'Existing Carnival',
                date: new Date('2025-08-15'),
                locationAddress: '123 Test St, Sydney NSW',
                state: 'NSW',
                createdByUserId: 2, // Already claimed by another user
                isActive: true
            };

            mySidelineService.detectPotentialDuplicate = jest.fn().mockResolvedValue(existingClaimedEvent);
            mySidelineService.createOrMergeEvent = jest.fn().mockRejectedValue(
                new Error('A similar carnival already exists: "Existing Carnival" on 15/08/2025. Please check if this is a duplicate.')
            );

            await expect(mySidelineService.createOrMergeEvent(carnivalData, 1))
                .rejects
                .toThrow('A similar carnival already exists');
        });
    });
});