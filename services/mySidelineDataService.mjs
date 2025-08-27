import { Carnival, SyncLog } from '../models/index.mjs';
import { Op } from 'sequelize';
import { AUSTRALIAN_STATES } from '../config/constants.mjs';

/**
 * MySideline Data Processing Service
 * Handles database operations and data processing for MySideline events
 */
class MySidelineDataService {
    constructor() {
        this.australianStates = AUSTRALIAN_STATES;
    }

    /**
     * Find existing MySideline event using robust matching with mySidelineId priority
     * @param {Object} eventData - Event data to match against
     * @returns {Promise<Carnival|null>} Existing carnival or null
     */
    async findExistingMySidelineEvent(eventData) {
        // Strategy 1: Use mySidelineId for most reliable matching (if available)
        if (eventData.mySidelineId) {
            const match = await Carnival.findOne({ 
                where: { 
                    mySidelineId: eventData.mySidelineId
                } 
            });
            
            if (match) {
                console.log(`Found existing MySideline event by ID: ${eventData.mySidelineId} - "${eventData.title}"`);
                return match;
            }
        }

        // Strategy 2: Fall back to MySideline-specific matching fields (for legacy events)
        if (eventData.mySidelineTitle) {
            const whereConditions = {
                mySidelineTitle: eventData.mySidelineTitle,
                isManuallyEntered: false
            };

            // Add mySidelineDate if available and valid (null matches null, valid date matches date)
            if (eventData.mySidelineDate !== undefined) {
                // Validate that mySidelineDate is a valid date or null
                if (eventData.mySidelineDate === null || 
                    (eventData.mySidelineDate instanceof Date && !isNaN(eventData.mySidelineDate.getTime()))) {
                    whereConditions.mySidelineDate = eventData.mySidelineDate;
                } else {
                    console.warn(`Invalid mySidelineDate for event "${eventData.mySidelineTitle}": ${eventData.mySidelineDate}`);
                }
            }

            // Add mySidelineAddress if available (null matches null, value matches value)
            if (eventData.mySidelineAddress !== undefined) {
                whereConditions.mySidelineAddress = eventData.mySidelineAddress;
            }

            const match = await Carnival.findOne({ where: whereConditions });
            
            if (match) {
                console.log(`Found existing MySideline event by legacy fields: "${eventData.mySidelineTitle}"`);
                return match;
            }
        }

        // Strategy 3: Fall back to date and title matching (when mySidelineId is empty)
        if (eventData.date && eventData.title) {
            // Validate that the date is actually a valid Date object
            const isValidDate = eventData.date instanceof Date && !isNaN(eventData.date.getTime());
            
            if (isValidDate) {
                const match = await Carnival.findOne({
                    where: {
                        date: eventData.date,
                        title: eventData.title,
                        isManuallyEntered: false
                    }
                });

                if (match) {
                    console.log(`Found existing MySideline event by date and title: "${eventData.title}" on ${eventData.date}`);
                    return match;
                }
            } else {
                console.warn(`Invalid date for event "${eventData.title}": ${eventData.date}. Skipping date-based matching.`);
            }
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
                    if (eventData.isActive === false && existingEvent.isActive === false) {
                        // If the event already marked as inactive, skip it
                        console.log(`Skipping update of inactive event: ${eventData.mySidelineTitle} on ${eventData.date} at ${eventData.locationAddress}`);
                        continue; // Skip to next event
                    }

                    console.log(`Event already exists: ${eventData.mySidelineTitle} on ${eventData.date}`);
                    // Update existing event with any new information, but only for empty fields
                    const updateData = {
                        id: existingEvent.id
                    };
                    
                    // Update MySideline ID if we didn't have one before
                    if (!existingEvent.mySidelineId && eventData.mySidelineId) {
                        updateData.mySidelineId = eventData.mySidelineId;
                        if (eventData.registrationLink) {
                            // If we have a registration link, update it when updating MySidelineID
                            updateData.registrationLink = eventData.registrationLink;
                        }
                    } else if (!existingEvent.mySidelineTitle && eventData.mySidelineTitle) {
                        updateData.mySidelineTitle = eventData.mySidelineTitle;
                    }

                    // Update Potentially Modified Fields
                    if (!existingEvent.clubLogoURL && eventData.clubLogoURL) {
                        updateData.clubLogoURL = eventData.clubLogoURL;
                    }
                    if (!existingEvent.date && eventData.date) {
                        updateData.date = eventData.date;
                    }
                    if (!existingEvent.googleMapsUrl && eventData.googleMapsUrl) {
                        updateData.googleMapsUrl = eventData.googleMapsUrl;
                    }
                    if (!existingEvent.isActive && eventData.isActive !== undefined) {
                        updateData.isActive = eventData.isActive;
                    }
                    if (!existingEvent.isManuallyEntered && eventData.isManuallyEntered !== undefined) {
                        updateData.isManuallyEntered = false;
                    }
                    if (!existingEvent.locationAddress && eventData.locationAddress) {
                        updateData.locationAddress = eventData.locationAddress;
                    }
                    if (!existingEvent.locationAddressLine1 && eventData.locationAddressLine1) {
                        updateData.locationAddressLine1 = eventData.locationAddressLine1;
                    }
                    if (!existingEvent.locationAddressLine2 && eventData.locationAddressLine2) {
                        updateData.locationAddressLine2 = eventData.locationAddressLine2;
                    }
                    if (!existingEvent.locationCountry && eventData.locationCountry) {
                        updateData.locationCountry = eventData.locationCountry;
                    }
                    if (!existingEvent.locationLatitude && eventData.locationLatitude) {
                        updateData.locationLatitude = eventData.locationLatitude;
                    }
                    if (!existingEvent.locationLongitude && eventData.locationLongitude) {
                        updateData.locationLongitude = eventData.locationLongitude;
                    }
                    if (!existingEvent.locationPostcode && eventData.locationPostcode) {
                        updateData.locationPostcode = eventData.locationPostcode;
                    }
                    if (!existingEvent.locationSuburb && eventData.locationSuburb) {
                        updateData.locationSuburb = eventData.locationSuburb;
                    }
                    if (!existingEvent.mySidelineAddress && eventData.mySidelineAddress) {  
                        updateData.mySidelineAddress = eventData.mySidelineAddress;
                    } 
                    if (!existingEvent.mySidelineDate && eventData.mySidelineDate) {
                        updateData.mySidelineDate = eventData.mySidelineDate;
                    }
                    if (!existingEvent.mySidelineTitle && eventData.mySidelineTitle) {
                        updateData.mySidelineTitle = eventData.mySidelineTitle;
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
                    if (!existingEvent.title && eventData.title) {
                        updateData.title = eventData.title;
                    }
                    if (!existingEvent.endDate && eventData.endDate) {
                        updateData.endDate = eventData.endDate;
                    }   
                    if (!existingEvent.venueName && eventData.venueName) {
                        updateData.feesDescription = eventData.feesDescription;
                    }
                    if (!existingEvent.feesDescription && eventData.feesDescription) {
                        updateData.feesDescription = eventData.feesDescription;
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
                        // Core event fields
                        title: eventData.title,
                        date: eventData.date,                    
                        endDate: null,
                        state: eventData.state,
                        clubLogoURL: eventData.clubLogoURL,
                        
                        // MySideline-specific tracking fields
                        mySidelineId: eventData.mySidelineId,
                        mySidelineTitle: eventData.mySidelineTitle,
                        mySidelineAddress: eventData.mySidelineAddress,
                        mySidelineDate: eventData.mySidelineDate,
                        
                        // Location fields - structured address
                        venueName: eventData.venueName,
                        locationAddress: eventData.locationAddress,
                        locationAddressLine1: eventData.locationAddressLine1,
                        locationAddressLine2: eventData.locationAddressLine2,
                        locationSuburb: eventData.locationSuburb,
                        locationPostcode: eventData.locationPostcode,
                        locationCountry: eventData.locationCountry || 'Australia',
                        locationLatitude: eventData.locationLatitude,
                        locationLongitude: eventData.locationLongitude,
                        
                        // Contact fields
                        organiserContactName: eventData.organiserContactName,
                        organiserContactEmail: eventData.organiserContactEmail,
                        organiserContactPhone: eventData.organiserContactPhone,
                        
                        // Event details
                        scheduleDetails: eventData.scheduleDetails,
                        registrationLink: eventData.registrationLink,
                        
                        // Social media fields
                        socialMediaFacebook: eventData.socialMediaFacebook,
                        socialMediaWebsite: eventData.socialMediaWebsite,
                        
                        // MySideline metadata
                        isManuallyEntered: false,
                        lastMySidelineSync: lastMySidelineSync,
                        googleMapsUrl: eventData.googleMapsUrl,
                        
                        // Status
                        isActive: eventData.isActive !== undefined ? eventData.isActive : true,
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
     * Check if we need to run initial sync using SyncLog table
     * @returns {Promise<boolean>} True if sync should run
     */
    async shouldRunInitialSync() {
        try {
            // Use the new SyncLog-based approach instead of checking individual events
            const shouldSync = await SyncLog.shouldRunSync('mysideline', 24);
            
            if (shouldSync) {
                const lastSync = await SyncLog.getLastSuccessfulSync('mysideline');
                if (!lastSync) {
                    console.log('Running initial MySideline sync (no previous sync found)...');
                } else {
                    const hoursSinceLastSync = (new Date() - new Date(lastSync.completedAt)) / (1000 * 60 * 60);
                    console.log(`Running MySideline sync (last sync was ${hoursSinceLastSync.toFixed(1)} hours ago)...`);
                }
                return true;
            } else {
                const lastSync = await SyncLog.getLastSuccessfulSync('mysideline');
                const hoursSinceLastSync = (new Date() - new Date(lastSync.completedAt)) / (1000 * 60 * 60);
                console.log(`MySideline sync skipped - recent sync found (${hoursSinceLastSync.toFixed(1)} hours ago)`);
                return false;
            }
        } catch (error) {
            console.error('Failed to check for initial sync:', error.message);
            return false;
        }
    }

    /**
     * A robust function to parse various date string formats into a Date object (local time).
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
            const month = parseInt(match[2], 10);
            const year = parseInt(match[3], 10);
            const date = new Date(year, month - 1, day);
            if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                return date;
            }
        }

        // Pattern 2: Handles "DD Month YYYY" and "Month DD, YYYY"
        // Example: "27 July 2024" or "Sep 20 2024" or "Sep 20, 2024"
        const patternMonthName = /^(?:(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{4}))|(?:([a-zA-Z]{3,})\s+(\d{1,2}),?\s+(\d{4}))$/i;
        match = cleanString.match(patternMonthName);
        if (match) {
            const day = parseInt(match[1] || match[5], 10);
            const monthStr = match[2] || match[4];
            const year = parseInt(match[3] || match[6], 10);
            const monthIndex = new Date(Date.parse(monthStr + " 1, 2000")).getMonth();
            if (monthIndex >= 0) {
                const date = new Date(year, monthIndex, day);
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

    /**
     * Deactivate carnivals that are in the past
     * This runs as part of the scheduled MySideline sync to maintain data hygiene
     * @returns {Promise<Object>} Result object with count of deactivated carnivals
     */
    async deactivatePastCarnivals() {
        console.log('🗓️  Checking for past carnivals to deactivate...');
        
        try {
            const currentDate = new Date();
            // Set time to start of today to avoid timezone issues
            currentDate.setHours(0, 0, 0, 0);
            
            // Find all active carnivals with dates in the past
            const pastCarnivals = await Carnival.findAll({
                where: {
                    isActive: true,
                    date: {
                        [Op.lt]: currentDate // Less than current date
                    }
                },
                attributes: ['id', 'title', 'date', 'state', 'isManuallyEntered']
            });

            if (pastCarnivals.length === 0) {
                console.log('✅ No past carnivals found to deactivate');
                return {
                    success: true,
                    deactivatedCount: 0,
                    message: 'No past carnivals found'
                };
            }

            console.log(`📋 Found ${pastCarnivals.length} past carnivals to deactivate:`);
            pastCarnivals.forEach((carnival, index) => {
                const daysPast = Math.floor((currentDate - carnival.date) / (1000 * 60 * 60 * 24));
                console.log(`   ${index + 1}. "${carnival.title}" (${carnival.state}) - ${daysPast} days past`);
            });

            // Update all past carnivals to inactive
            const [updatedCount] = await Carnival.update(
                { 
                    isActive: false,
                    updatedAt: new Date()
                },
                {
                    where: {
                        isActive: true,
                        date: {
                            [Op.lt]: currentDate
                        }
                    }
                }
            );

            console.log(`✅ Successfully deactivated ${updatedCount} past carnivals`);

            return {
                success: true,
                deactivatedCount: updatedCount,
                carnivals: pastCarnivals.map(c => ({
                    id: c.id,
                    title: c.title,
                    date: c.date,
                    state: c.state,
                    isManuallyEntered: c.isManuallyEntered
                }))
            };

        } catch (error) {
            console.error('❌ Error deactivating past carnivals:', error.message);
            return {
                success: false,
                error: error.message,
                deactivatedCount: 0
            };
        }
    }
}

export default MySidelineDataService;