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
     * Find existing MySideline event using flexible matching
     * @param {Object} eventData - Event data to match against
     * @returns {Promise<Carnival|null>} Existing carnival or null
     */
    async findExistingMySidelineEvent(eventData) {
        // Primary match: Use mySidelineTitle (this is the most reliable for MySideline events)
        if (eventData.title) {
            const primaryMatch = await Carnival.findOne({
                where: {
                    mySidelineTitle: eventData.title,
                    isManuallyEntered: false // Only match MySideline events
                }
            });
            
            if (primaryMatch) {
                return primaryMatch;
            }
        }
        
        // Secondary match: Use combination of available fields
        const whereConditions = {
            isManuallyEntered: false
        };
        
        // Add title condition
        if (eventData.title) {
            whereConditions.mySidelineTitle = eventData.title;
        }
        
        // Add date condition if available
        if (eventData.date) {
            whereConditions.date = eventData.date;
        }
        
        // Add location condition if available
        if (eventData.locationAddress) {
            whereConditions.locationAddress = eventData.locationAddress;
        }
        
        // Only search if we have meaningful criteria
        if (Object.keys(whereConditions).length > 1) { 
            // More than just isManuallyEntered
            return await Carnival.findOne({ where: whereConditions });
        }
        
        return null;
    }

    /**
     * Process scraped events and save to database
     * @param {Array} scrapedEvents - Array of scraped event objects
     * @returns {Promise<Array>} Array of processed event objects
     */
    async processScrapedEvents(scrapedEvents) {
        console.log(`Processing ${scrapedEvents.length} scraped MySideline events...`);
        
        // Set the sync timestamp for all events processed in this batch
        const lastMySidelineSync = new Date();
        
        const processedEvents = [];        
        for (const eventData of scrapedEvents) {
            try {
                // Check if event already exists
                const existingEvent = await this.findExistingMySidelineEvent(eventData);
                
                if (existingEvent) {
                    if (eventData.date < new Date() || existingEvent.isActive === false) {
                        // If the event date is in the past or already marked as inactive, skip it
                        console.log(`Skipping update of past event: ${eventData.mySidelineTitle} on ${eventData.date} at ${eventData.locationAddress}`);
                        continue; // Skip to next event
                    }

                    console.log(`Event already exists: ${eventData.mySidelineTitle} on ${eventData.date}`);
                    // Update existing event with any new information, but only for empty fields
                    const updateData = {
                        id: existingEvent.id
                    };
                    
                    // Only update fields that are currently empty
                    if (!existingEvent.clubLogoURL && eventData.clubLogoURL) {
                        updateData.clubLogoURL = eventData.clubLogoURL; // Fix field name mapping
                    }
                    if (!existingEvent.locationAddress && eventData.locationAddress) {
                        updateData.locationAddress = eventData.locationAddress;
                        updateData.locationAddressPart1 = eventData.locationAddressPart1 || null;
                        updateData.locationAddressPart2 = eventData.locationAddressPart2 || null;
                        updateData.locationAddressPart3 = eventData.locationAddressPart3 || null;
                        updateData.locationAddressPart4 = eventData.locationAddressPart4 || null;
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
                    updateData.lastMySidelineSync = lastMySidelineSync;
                    
                    // Only perform update if there are fields to update
                    if (Object.keys(updateData).length > 2) { // > 2 because id and lastMySidelineSync are always included
                        await existingEvent.update(updateData);
                        console.log(`Updated ${Object.keys(updateData).length - 2} empty fields for event: ${eventData.title}`);
                    } else {
                        await existingEvent.update({ lastMySidelineSync: lastMySidelineSync });
                    }
                    
                    processedEvents.push(existingEvent);
                } else {
                    // Create new event
                    const newEvent = await Carnival.create({
                        clubLogoURL: eventData.clubLogoURL, // Fix field name mapping
                        date: eventData.date,
                        googleMapsUrl: eventData.googleMapsUrl,
                        isMySidelineCard: eventData.isMySidelineCard,
                        isManuallyEntered: false,
                        lastMySidelineSync: lastMySidelineSync,
                        locationAddress: eventData.locationAddress,
                        locationAddressPart1: eventData.locationAddressPart1,
                        locationAddressPart2: eventData.locationAddressPart2,
                        locationAddressPart3: eventData.locationAddressPart3,
                        locationAddressPart4: eventData.locationAddressPart4,
                        mySidelineTitle: eventData.mySidelineTitle,
                        organiserContactEmail: eventData.organiserContactEmail,
                        organiserContactName: eventData.organiserContactName,
                        organiserContactPhone: eventData.organiserContactPhone,
                        registrationLink: eventData.registrationLink,
                        scheduleDetails: eventData.scheduleDetails,
                        socialMediaFacebook: eventData.socialMediaFacebook,
                        socialMediaWebsite: eventData.socialMediaWebsite,
                        source: eventData.source,
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
            const hasRecentSync = lastImportedCarnival && 
                (new Date() - lastImportedCarnival.createdAt) <= 24 * 60 * 60 * 1000;

            if (!lastImportedCarnival || !hasRecentSync) {
                if (!lastImportedCarnival) {
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
     * A robust function to parse various date string formats into a JavaScript Date object.
     * This is designed to work with the output from the date extraction regex patterns.
     *
     * @param {string} dateString The date string to parse (e.g., "27th July 2024", "19/07/2025").
     * @returns {Date|null} A valid Date object or null if parsing fails.
     */
    parseDate(dateString) {
        if (!dateString) {
            return null;
        }

        // --- 1. Normalise the string ---
        // Remove ordinal suffixes (st, nd, rd, th) from days
        const cleanString = dateString.trim().replace(/(\d+)(st|nd|rd|th)/i, '$1');

        let match;

        // --- 2. Define patterns for parsing ---

        // Pattern 1: Handles DD/MM/YYYY and DD-MM-YYYY
        // Example: "19/07/2025" or "21-06-2025"
        const patternNumeric = /^(\d{1,2})[\s\/\-](\d{1,2})[\s\/\-](\d{4})$/;
        match = cleanString.match(patternNumeric);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10); // month is 1-based
            const year = parseInt(match[3], 10);
            // Create date, ensuring month is 0-indexed for the Date constructor
            const date = new Date(year, month - 1, day);
            // Validate the date to catch invalid inputs like month > 12
            if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                return date;
            }
        }

        // Pattern 2: Handles "DD Month YYYY" and "Month DD, YYYY"
        // Example: "27 July 2024" or "Sep 20 2024" or "Sep 20, 2024"
        const patternMonthName = /^(?:(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{4}))|(?:([a-zA-Z]{3,})\s+(\d{1,2}),?\s+(\d{4}))$/i;
        match = cleanString.match(patternMonthName);
        if (match) {
            // match[1] is day, match[2] is month, match[3] is year OR
            // match[4] is month, match[5] is day, match[6] is year
            const day = parseInt(match[1] || match[5], 10);
            const monthStr = match[2] || match[4];
            const year = parseInt(match[3] || match[6], 10);

            const monthIndex = new Date(Date.parse(monthStr +" 1, 2000")).getMonth();
            
            if (monthIndex >= 0) {
                const date = new Date(year, monthIndex, day);
                // Validate the date
                if (date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day) {
                    return date;
                }
            }
        }
        
        // --- 3. Fallback for any other valid formats ---
        const fallbackDate = new Date(cleanString);
        if (!isNaN(fallbackDate.getTime())) {
            return fallbackDate;
        }

        // Return null if no patterns matched or date was invalid
        return null;
    }
}

module.exports = MySidelineDataService;