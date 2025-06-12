const { Carnival } = require('../models');
const { Op } = require('sequelize');
const emailService = require('./emailService');

/**
 * MySideline Data Processing Service
 * Handles database operations and data processing for MySideline events
 */
class MySidelineDataService {
    constructor() {
        this.australianStates = ['NSW', 'QLD', 'VIC', 'SA', 'WA', 'NT', 'ACT', 'TAS'];
    }

    /**
     * Process scraped events and save to database
     * @param {Array} scrapedEvents - Array of scraped event objects
     * @returns {Promise<Array>} Array of processed event objects
     */
    async processScrapedEvents(scrapedEvents) {
        console.log(`Processing ${scrapedEvents.length} scraped MySideline events...`);
        
        const processedEvents = [];        
        for (const eventData of scrapedEvents) {
            try {
                // Check if event already exists
                const existingEvent = await Carnival.findOne({
                    where: {
                        title: eventData.title,
                        date: eventData.date,
                    }
                });
                
                if (existingEvent) {
                    if (eventData.date < new Date()) {
                        console.log(`Skipping update of past event: ${eventData.title} on ${eventData.date}`);
                        continue; // Skip to next event
                    }

                    console.log(`Event already exists: ${eventData.title} on ${eventData.date}`);
                    // Update existing event with any new information, but only for empty fields
                    const updateData = {
                        id: existingEvent.id
                    };
                    
                    // Only update fields that are currently empty
                    if (!existingEvent.carnivalIcon && eventData.carnivalIcon) {
                        updateData.carnivalIcon = eventData.carnivalIcon;
                    }
                    if (!existingEvent.locationAddress && eventData.locationAddress) {
                        updateData.locationAddress = eventData.locationAddress;
                    }
                    if (!existingEvent.organiserContactEmail && eventData.organiserContactEmail) {
                        updateData.organiserContactEmail = eventData.organiserContactEmail;
                    }
                    if (!existingEvent.organiserContactName && eventData.organiserContactName) {
                        updateData.organiserContactName = eventData.organiserContactName;
                    }
                    if (!existingEvent.organiserContactPhone && eventData.organiserContactPhone) {
                        updateData.organiserContactPhone = eventData.organiserContactPhone;
                    }
                    if (!existingEvent.registrationLink && eventData.registrationLink) {
                        updateData.registrationLink = eventData.registrationLink;
                    }
                    if (!existingEvent.scheduleDetails && eventData.scheduleDetails) {
                        updateData.scheduleDetails = eventData.scheduleDetails;
                    }
                    if (!existingEvent.socialMediaFacebook && eventData.socialMediaFacebook) {
                        updateData.socialMediaFacebook = eventData.socialMediaFacebook;
                    }
                    if (!existingEvent.socialMediaWebsite && eventData.socialMediaWebsite) {
                        updateData.socialMediaWebsite = eventData.socialMediaWebsite;
                    }
                    if (!existingEvent.state && eventData.state) {
                        updateData.state = eventData.state;
                    }
                    
                    // Always update the sync timestamp
                    updateData.lastMySidelineSync = scrapedAt;
                    
                    // Only perform update if there are fields to update
                    if (Object.keys(updateData).length > 2) { // > 2 because id and lastMySidelineSync are always included
                        await existingEvent.update(updateData);
                        console.log(`Updated ${Object.keys(updateData).length - 2} empty fields for event: ${eventData.title}`);
                    } else {
                        await existingEvent.update({ lastMySidelineSync: scrapedAt });
                    }
                    
                    processedEvents.push(existingEvent);
                } else {
                    // Create new event
                    const newEvent = await Carnival.create({
                        carnivalIcon: eventData.carnivalIcon,                        
                        date: eventData.date,
                        isManuallyEntered: false,
                        lastMySidelineSync: scrapedAt,
                        locationAddress: eventData.locationAddress,
                        organiserContactEmail: eventData.organiserContactEmail,
                        organiserContactName: eventData.organiserContactName,
                        organiserContactPhone: eventData.organiserContactPhone,
                        registrationLink: eventData.registrationLink,
                        scheduleDetails: eventData.scheduleDetails,
                        socialMediaFacebook: eventData.socialMediaFacebook,
                        socialMediaWebsite: eventData.socialMediaWebsite,
                        state: eventData.state,
                        title: eventData.title,
                    });

                    // If the event is more than 7 days in the future, set registration open
                    if (eventData.date > new Date() + (7 * 24 * 60 * 60 * 1000)) {
                        newEvent.isRegistrationOpen = true;
                    }
                    
                    console.log(`Created new MySideline event: ${newEvent.title}`);
                    processedEvents.push(newEvent);
                }
            } catch (error) {
                console.error(`Failed to process event "${eventData.title}":`, error.message);
            }
        }
        
        console.log(`Successfully processed ${processedEvents.length} MySideline events`);
        return processedEvents;
    }

    /**
     * Check if we need to run initial sync
     * @returns {Promise<boolean>} True if sync should run
     */
    async shouldRunInitialSync() {
        try {
            const lastImportedCarnival = await Carnival.findOne({ 
                where: {
                    lastMySidelineSync: { [Op.ne]: null }
                }
            });

            // In development mode, always run sync regardless of last sync time
            const isDevelopment = process.env.NODE_ENV !== 'production';
            const hasRecentSync = lastImportedCarnival && 
                (new Date() - lastImportedCarnival.createdAt) <= 24 * 60 * 60 * 1000;

            if (!lastImportedCarnival || !hasRecentSync || isDevelopment) {
                if (isDevelopment && hasRecentSync) {
                    console.log('Running MySideline sync in development mode (ignoring recent sync)...');
                } else if (!lastImportedCarnival) {
                    console.log('Running initial MySideline sync (no previous sync found)...');
                } else {
                    console.log('Running initial MySideline sync (last sync > 24 hours ago)...');
                }
                return true;
            } else {
                console.log('MySideline sync skipped - recent sync found (production mode)');
                return false;
            }
        } catch (error) {
            console.error('Failed to check for initial sync:', error.message);
            return false;
        }
    }

    /**
     * Extract location from MySideline text
     * @param {string} text - Text to extract location from
     * @returns {string} - Extracted location
     */
    extractLocationFromMySidelineText(text) {
        if (!text) return 'TBA - Check MySideline for details';
        
        const lowercaseText = text.toLowerCase();
        
        // Look for venue keywords
        const venuePatterns = [
            /at\s+([^,\n]+(?:park|ground|stadium|field|centre|center|oval|club))/i,
            /venue[:\s]+([^,\n]+)/i,
            /location[:\s]+([^,\n]+)/i,
            /held at\s+([^,\n]+)/i,
            /([^,\n]+(?:park|ground|stadium|field|centre|center|oval|club))/i
        ];
        
        for (const pattern of venuePatterns) {
            const match = text.match(pattern);
            if (match && match[1] && match[1].trim().length > 5) {
                return match[1].trim();
            }
        }
        
        return 'TBA - Check MySideline for details';
    }

    /**
     * Parse date string into Date object
     * @param {string} dateString - Date string to parse
     * @returns {Date|null} - Parsed date or null
     */
    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            // Handle various date formats
            const cleanDateString = dateString.trim();
            
            // Try parsing with different formats
            const formats = [
                // DD/MM/YYYY
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
                // DD-MM-YYYY
                /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
                // DD Month YYYY
                /^(\d{1,2})\s+(\w+)\s+(\d{4})$/,
                // Month DD, YYYY
                /^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/
            ];
            
            for (const format of formats) {
                const match = cleanDateString.match(format);
                if (match) {
                    // Handle different date formats appropriately
                    const parsedDate = new Date(cleanDateString);
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate;
                    }
                }
            }
            
            // Fallback to standard parsing
            const parsedDate = new Date(cleanDateString);
            return !isNaN(parsedDate.getTime()) ? parsedDate : null;
        } catch (error) {
            console.log(`Failed to parse date "${dateString}":`, error.message);
            return null;
        }
    }

    /**
     * Generate mock events for development/testing
     * @param {string} state - State to generate events for
     * @returns {Array} Array of mock events
     */
    generateMockEvents(state = 'NSW') {
        const currentYear = new Date().getFullYear();
        const mockEvents = [];
        
        // Generate 2-3 mock events per state
        const eventTemplates = [
            {
                title: `${state} Masters Rugby League Carnival`,
                locationSuffix: state === 'NSW' ? 'Sydney' : state === 'QLD' ? 'Brisbane' : 'Melbourne',
                monthOffset: 2
            },
            {
                title: `${state} Over 35s Championship`,
                locationSuffix: state === 'NSW' ? 'Newcastle' : state === 'QLD' ? 'Gold Coast' : 'Geelong',
                monthOffset: 4
            },
            {
                title: `${state} Masters Nines Tournament`,
                locationSuffix: state === 'NSW' ? 'Wollongong' : state === 'QLD' ? 'Cairns' : 'Ballarat',
                monthOffset: 6
            }
        ];

        eventTemplates.forEach((template, index) => {
            const eventDate = new Date();
            eventDate.setMonth(eventDate.getMonth() + template.monthOffset);
            eventDate.setDate(15); // Set to 15th of the month

            mockEvents.push({
                title: template.title,
                date: eventDate,
                locationAddress: `${template.locationSuffix} Sports Complex, ${state}`,
                state: state,
                registrationLink: `https://profile.mysideline.com.au/register/mock-${state.toLowerCase()}-${index + 1}`,
                isManuallyEntered: false,
                maxTeams: 16,
                feesDescription: `$${300 + (index * 50)} per team (Early bird discount available)`,
                registrationDeadline: new Date(eventDate.getTime() - (14 * 24 * 60 * 60 * 1000)), // 2 weeks before
                scheduleDetails: `Day-long tournament starting at ${8 + index}:00 AM. Multiple age divisions available.`,
                isRegistrationOpen: true,
                isActive: true,
                organiserContactName: `${state} Rugby League Masters`,
                organiserContactEmail: `masters@${state.toLowerCase()}rl.com.au`,
                organiserContactPhone: `0${index + 2} ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9000) + 1000}`,
                sourceData: {
                    isMockData: true,
                    generatedAt: new Date(),
                    state: state,
                    templateIndex: index
                }
            });
        });

        return mockEvents;
    }    
}

module.exports = MySidelineDataService;