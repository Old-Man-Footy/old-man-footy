const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const Carnival = require('../models/Carnival');
const User = require('../models/User');
const Club = require('../models/Club');
const emailService = require('./emailService');

class MySidelineIntegrationService {
    constructor() {
        this.baseUrl = process.env.MYSIDELINE_URL || 'https://www.mysideline.com.au';
        this.lastSyncDate = null;
        this.isRunning = false;
    }

    // Initialize the scheduled sync
    initializeScheduledSync() {
        // Run every day at 3 AM
        cron.schedule('0 3 * * *', async () => {
            console.log('Starting scheduled MySideline sync...');
            await this.syncMySidelineEvents();
        });

        // Also run on startup if not synced in last 24 hours
        this.checkAndRunInitialSync();
    }

    async checkAndRunInitialSync() {
        try {
            const lastImportedCarnival = await Carnival.findOne({ 
                mySidelineEventId: { $exists: true, $ne: null } 
            }).sort({ createdAt: -1 });

            if (!lastImportedCarnival || 
                (new Date() - lastImportedCarnival.createdAt) > 24 * 60 * 60 * 1000) {
                console.log('Running initial MySideline sync...');
                await this.syncMySidelineEvents();
            }
        } catch (error) {
            console.error('Failed to check for initial sync:', error);
        }
    }

    // Main sync function
    async syncMySidelineEvents() {
        if (this.isRunning) {
            console.log('MySideline sync already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('Starting MySideline event synchronization...');

        try {
            const scrapedEvents = await this.scrapeMySidelineEvents();
            const processedEvents = await this.processScrapedEvents(scrapedEvents);
            
            console.log(`MySideline sync completed. Processed ${processedEvents.length} events.`);
            this.lastSyncDate = new Date();
            
            return {
                success: true,
                eventsProcessed: processedEvents.length,
                lastSync: this.lastSyncDate
            };
        } catch (error) {
            console.error('MySideline sync failed:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
        }
    }

    // Scrape MySideline website for events
    async scrapeMySidelineEvents() {
        try {
            // This is a simplified example - actual implementation would need
            // to handle MySideline's specific structure and possibly use their API
            
            const events = [];
            const states = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
            
            for (const state of states) {
                try {
                    const stateEvents = await this.scrapeStateEvents(state);
                    events.push(...stateEvents);
                } catch (error) {
                    console.error(`Failed to scrape events for ${state}:`, error.message);
                }
            }
            
            return events;
        } catch (error) {
            console.error('Failed to scrape MySideline events:', error);
            throw error;
        }
    }

    async scrapeStateEvents(state) {
        // Placeholder implementation - would need to be customized based on 
        // MySideline's actual website structure
        
        const url = `${this.baseUrl}/events?state=${state}&type=masters`;
        
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; RugbyLeagueMasters/1.0)'
                }
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // This selector would need to match MySideline's actual HTML structure
            $('.event-item').each((index, element) => {
                try {
                    const $element = $(element);
                    
                    const event = {
                        mySidelineId: $element.data('event-id') || $element.attr('id'),
                        title: $element.find('.event-title').text().trim(),
                        date: this.parseEventDate($element.find('.event-date').text()),
                        location: $element.find('.event-location').text().trim(),
                        state: state,
                        description: $element.find('.event-description').text().trim(),
                        registrationLink: $element.find('.register-link').attr('href'),
                        contactInfo: this.extractContactInfo($element),
                        lastUpdated: new Date()
                    };

                    if (event.title && event.date && event.mySidelineId) {
                        events.push(event);
                    }
                } catch (error) {
                    console.error('Error parsing individual event:', error);
                }
            });

            console.log(`Scraped ${events.length} events from ${state}`);
            return events;
            
        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                console.log(`MySideline not accessible for ${state}, using mock data for development`);
                return this.generateMockEvents(state);
            }
            throw error;
        }
    }

    // Generate mock events for development/testing
    generateMockEvents(state) {
        const mockEvents = [
            {
                mySidelineId: `mock-${state}-001`,
                title: `${state} Masters Rugby League Carnival`,
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                location: `${state} Sports Complex`,
                state: state,
                description: `Annual Masters Rugby League carnival featuring teams from across ${state}`,
                registrationLink: `${this.baseUrl}/register/mock-${state}-001`,
                contactInfo: {
                    name: `${state} Rugby League Masters`,
                    email: `contact@${state.toLowerCase()}masters.com.au`,
                    phone: `0${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 90000000) + 10000000}`
                },
                lastUpdated: new Date()
            }
        ];

        return mockEvents;
    }

    parseEventDate(dateString) {
        try {
            // Handle various date formats that might come from MySideline
            const cleanDate = dateString.replace(/[^\d\/\-\s:]/g, '');
            return new Date(cleanDate);
        } catch (error) {
            console.error('Failed to parse date:', dateString);
            return new Date();
        }
    }

    extractContactInfo(element) {
        return {
            name: element.find('.contact-name').text().trim() || 'Event Organiser',
            email: element.find('.contact-email').text().trim() || 'info@event.com',
            phone: element.find('.contact-phone').text().trim() || '0400 000 000'
        };
    }

    // Process scraped events and update database
    async processScrapedEvents(scrapedEvents) {
        const processedEvents = [];

        for (const scrapedEvent of scrapedEvents) {
            try {
                const processedEvent = await this.processIndividualEvent(scrapedEvent);
                if (processedEvent) {
                    processedEvents.push(processedEvent);
                }
            } catch (error) {
                console.error(`Failed to process event ${scrapedEvent.mySidelineId}:`, error);
            }
        }

        return processedEvents;
    }

    async processIndividualEvent(scrapedEvent) {
        try {
            // Check if event already exists
            const existingCarnival = await Carnival.findOne({
                mySidelineEventId: scrapedEvent.mySidelineId
            });

            if (existingCarnival) {
                // Update existing event if data has changed
                return await this.updateExistingEvent(existingCarnival, scrapedEvent);
            } else {
                // Create new event
                return await this.createNewEvent(scrapedEvent);
            }
        } catch (error) {
            console.error(`Error processing event ${scrapedEvent.mySidelineId}:`, error);
            throw error;
        }
    }

    async updateExistingEvent(existingCarnival, scrapedEvent) {
        const hasChanges = 
            existingCarnival.title !== scrapedEvent.title ||
            existingCarnival.date.getTime() !== scrapedEvent.date.getTime() ||
            existingCarnival.locationAddress !== scrapedEvent.location;

        if (hasChanges) {
            existingCarnival.title = scrapedEvent.title;
            existingCarnival.date = scrapedEvent.date;
            existingCarnival.locationAddress = scrapedEvent.location;
            existingCarnival.scheduleDetails = scrapedEvent.description;
            existingCarnival.registrationLink = scrapedEvent.registrationLink;
            existingCarnival.organiserContactName = scrapedEvent.contactInfo.name;
            existingCarnival.organiserContactEmail = scrapedEvent.contactInfo.email;
            existingCarnival.organiserContactPhone = scrapedEvent.contactInfo.phone;
            existingCarnival.lastMySidelineSync = new Date();

            await existingCarnival.save();

            // Send update notifications if event has an owner
            if (existingCarnival.createdByUserId) {
                try {
                    await emailService.sendCarnivalNotification(existingCarnival, 'updated');
                } catch (emailError) {
                    console.error('Failed to send update notification:', emailError);
                }
            }

            console.log(`Updated existing carnival: ${existingCarnival.title}`);
            return existingCarnival;
        }

        return null; // No changes
    }

    async createNewEvent(scrapedEvent) {
        const newCarnival = new Carnival({
            title: scrapedEvent.title,
            date: scrapedEvent.date,
            locationAddress: scrapedEvent.location,
            state: scrapedEvent.state,
            scheduleDetails: scrapedEvent.description,
            registrationLink: scrapedEvent.registrationLink,
            organiserContactName: scrapedEvent.contactInfo.name,
            organiserContactEmail: scrapedEvent.contactInfo.email,
            organiserContactPhone: scrapedEvent.contactInfo.phone,
            mySidelineEventId: scrapedEvent.mySidelineId,
            isManuallyEntered: false,
            isActive: true,
            lastMySidelineSync: new Date()
        });

        await newCarnival.save();

        // Send new carnival notifications
        try {
            await emailService.sendCarnivalNotification(newCarnival, 'new');
        } catch (emailError) {
            console.error('Failed to send new carnival notification:', emailError);
        }

        console.log(`Created new carnival from MySideline: ${newCarnival.title}`);
        return newCarnival;
    }

    // Manual sync trigger for admin users
    async triggerManualSync() {
        if (this.isRunning) {
            return {
                success: false,
                message: 'Sync already in progress'
            };
        }

        return await this.syncMySidelineEvents();
    }

    // Get sync status
    getSyncStatus() {
        return {
            isRunning: this.isRunning,
            lastSyncDate: this.lastSyncDate,
            nextScheduledSync: this.getNextScheduledSync()
        };
    }

    getNextScheduledSync() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(3, 0, 0, 0);
        return tomorrow;
    }

    // Take ownership of MySideline event
    async takeOwnership(carnivalId, userId) {
        try {
            const carnival = await Carnival.findById(carnivalId);
            const user = await User.findById(userId).populate('clubId');

            if (!carnival || !user) {
                throw new Error('Carnival or user not found');
            }

            if (carnival.createdByUserId) {
                throw new Error('Carnival already has an owner');
            }

            if (!carnival.mySidelineEventId) {
                throw new Error('Not a MySideline imported event');
            }

            carnival.createdByUserId = userId;
            carnival.isManuallyEntered = true; // Now managed manually
            await carnival.save();

            console.log(`User ${user.email} took ownership of carnival: ${carnival.title}`);
            
            return {
                success: true,
                message: 'Ownership taken successfully',
                carnival: carnival
            };
        } catch (error) {
            console.error('Failed to take ownership:', error);
            throw error;
        }
    }
}

module.exports = new MySidelineIntegrationService();