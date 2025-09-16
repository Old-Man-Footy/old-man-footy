import { Carnival, SyncLog } from '../models/index.mjs';
import { Op } from 'sequelize';
import { AUSTRALIAN_STATES } from '../config/constants.mjs';

/**
 * MySideline Data Processing Service
 * Handles database operations and data processing for MySideline carnivals
 */
class MySidelineDataService {
    constructor() {
        this.australianStates = AUSTRALIAN_STATES;
    }

    /**
     * Find existing MySideline carnival using robust matching with mySidelineId priority
     * @param {Object} eventData - Carnival data to match against
     * @returns {Promise<Carnival|null>} Existing carnival or null
     */
    async findExistingMySidelineCarnival(eventData) {
        // Strategy 1: Use mySidelineId for most reliable matching (if available)
        if (eventData.mySidelineId) {
            const match = await Carnival.findOne({ 
                where: { 
                    mySidelineId: eventData.mySidelineId
                } 
            });
            
            if (match) {
                console.log(`Found existing MySideline carnival by ID: ${eventData.mySidelineId} - "${eventData.title}"`);
                return match;
            }
        }

        // Strategy 2: Fall back to MySideline-specific matching fields (for legacy carnivals)
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
                    console.warn(`Invalid mySidelineDate for carnival "${eventData.mySidelineTitle}": ${eventData.mySidelineDate}`);
                }
            }

            // Add mySidelineAddress if available (null matches null, value matches value)
            if (eventData.mySidelineAddress !== undefined) {
                whereConditions.mySidelineAddress = eventData.mySidelineAddress;
            }

            const match = await Carnival.findOne({ where: whereConditions });
            
            if (match) {
                console.log(`Found existing MySideline carnival by legacy fields: "${eventData.mySidelineTitle}"`);
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
                    console.log(`Found existing MySideline carnival by date and title: "${eventData.title}" on ${eventData.date}`);
                    return match;
                }
            } else {
                console.warn(`Invalid date for carnival "${eventData.title}": ${eventData.date}. Skipping date-based matching.`);
            }
        }
        
        return null;
    }

    /**
     * Process scraped carnivals and save to database
     * @param {Array} scrapedCarnivals - Array of scraped carnival objects
     * @returns {Promise<Array>} Array of processed carnival objects
     */
    async processScrapedCarnivals(scrapedCarnivals) {
        console.log(`Processing ${scrapedCarnivals.length} scraped MySideline carnivals...`);
        
        // Set the sync timestamp for all carnivals processed in this batch
        const lastMySidelineSync = new Date();
        
        const processedCarnivals = [];        
        for (const eventData of scrapedCarnivals) {
            try {
                // Check if carnival already exists
                const existingCarnival = await this.findExistingMySidelineCarnival(eventData);
                
                if (existingCarnival) {
                    if (eventData.isActive === false && existingCarnival.isActive === false) {
                        // If the carnival already marked as inactive, skip it
                        console.log(`Skipping update of inactive carnival: ${eventData.mySidelineTitle} on ${eventData.date} at ${eventData.locationAddress}`);
                        continue; // Skip to next carnival
                    }

                    console.log(`Carnival already exists: ${eventData.mySidelineTitle} on ${eventData.date}`);
                    // Update existing carnival with any new information, but only for empty fields
                    const updateData = {
                        id: existingCarnival.id
                    };
                    
                    // Update MySideline ID if we didn't have one before
                    if (!existingCarnival.mySidelineId && eventData.mySidelineId) {
                        updateData.mySidelineId = eventData.mySidelineId;
                        if (eventData.registrationLink) {
                            // If we have a registration link, update it when updating MySidelineID
                            updateData.registrationLink = eventData.registrationLink;
                        }
                    } else if (!existingCarnival.mySidelineTitle && eventData.mySidelineTitle) {
                        updateData.mySidelineTitle = eventData.mySidelineTitle;
                    }

                    // Update Potentially Modified Fields
                    if (!existingCarnival.clubLogoURL && eventData.clubLogoURL) {
                        updateData.clubLogoURL = eventData.clubLogoURL;
                    }
                    if (!existingCarnival.date && eventData.date) {
                        updateData.date = eventData.date;
                    }
                    if (!existingCarnival.googleMapsUrl && eventData.googleMapsUrl) {
                        updateData.googleMapsUrl = eventData.googleMapsUrl;
                    }
                    if (!existingCarnival.isActive && eventData.isActive !== undefined) {
                        updateData.isActive = eventData.isActive;
                    }
                    if (!existingCarnival.isManuallyEntered && eventData.isManuallyEntered !== undefined) {
                        updateData.isManuallyEntered = false;
                    }
                    if (!existingCarnival.locationAddress && eventData.locationAddress) {
                        updateData.locationAddress = eventData.locationAddress;
                    }
                    if (!existingCarnival.locationAddressLine1 && eventData.locationAddressLine1) {
                        updateData.locationAddressLine1 = eventData.locationAddressLine1;
                    }
                    if (!existingCarnival.locationAddressLine2 && eventData.locationAddressLine2) {
                        updateData.locationAddressLine2 = eventData.locationAddressLine2;
                    }
                    if (!existingCarnival.locationCountry && eventData.locationCountry) {
                        updateData.locationCountry = eventData.locationCountry;
                    }
                    if (!existingCarnival.locationLatitude && eventData.locationLatitude) {
                        updateData.locationLatitude = eventData.locationLatitude;
                    }
                    if (!existingCarnival.locationLongitude && eventData.locationLongitude) {
                        updateData.locationLongitude = eventData.locationLongitude;
                    }
                    if (!existingCarnival.locationPostcode && eventData.locationPostcode) {
                        updateData.locationPostcode = eventData.locationPostcode;
                    }
                    if (!existingCarnival.locationSuburb && eventData.locationSuburb) {
                        updateData.locationSuburb = eventData.locationSuburb;
                    }
                    if (!existingCarnival.mySidelineAddress && eventData.mySidelineAddress) {  
                        updateData.mySidelineAddress = eventData.mySidelineAddress;
                    } 
                    if (!existingCarnival.mySidelineDate && eventData.mySidelineDate) {
                        updateData.mySidelineDate = eventData.mySidelineDate;
                    }
                    if (!existingCarnival.mySidelineTitle && eventData.mySidelineTitle) {
                        updateData.mySidelineTitle = eventData.mySidelineTitle;
                    }
                    if (!existingCarnival.organiserContactEmail && eventData.organiserContactEmail) {
                        updateData.organiserContactEmail = eventData.organiserContactEmail;
                    }
                    if (!existingCarnival.organiserContactName && eventData.organiserContactName) {
                        updateData.organiserContactName = eventData.organiserContactName;
                    }
                    if (!existingCarnival.organiserContactPhone && eventData.organiserContactPhone) {
                        updateData.organiserContactPhone = eventData.organiserContactPhone;
                    }
                    if (!existingCarnival.registrationLink && eventData.registrationLink) {
                        updateData.registrationLink = eventData.registrationLink;
                    }
                    if (!existingCarnival.scheduleDetails && eventData.scheduleDetails) {
                        updateData.scheduleDetails = eventData.scheduleDetails;
                    }
                    if (!existingCarnival.socialMediaFacebook && eventData.socialMediaFacebook) {
                        updateData.socialMediaFacebook = eventData.socialMediaFacebook;
                    }
                    if (!existingCarnival.socialMediaWebsite && eventData.socialMediaWebsite) {
                        updateData.socialMediaWebsite = eventData.socialMediaWebsite;
                    }
                    if (!existingCarnival.state && eventData.state) {
                        updateData.state = eventData.state;
                    }
                    if (!existingCarnival.title && eventData.title) {
                        updateData.title = eventData.title;
                    }
                    if (!existingCarnival.endDate && eventData.endDate) {
                        updateData.endDate = eventData.endDate;
                    }   
                    if (!existingCarnival.venueName && eventData.venueName) {
                        updateData.feesDescription = eventData.feesDescription;
                    }
                    if (!existingCarnival.feesDescription && eventData.feesDescription) {
                        updateData.feesDescription = eventData.feesDescription;
                    }
                    
                    // Always update the sync timestamp
                    updateData.lastMySidelineSync = lastMySidelineSync;
                    
                    // Only perform update if there are fields to update
                    if (Object.keys(updateData).length > 2) { // > 2 because id and lastMySidelineSync are always included
                        await existingCarnival.update(updateData);
                        console.log(`Updated ${Object.keys(updateData).length - 2} empty fields for carnival: ${eventData.title}`);
                    } else {
                        await existingCarnival.update({ lastMySidelineSync: lastMySidelineSync });
                    }
                    
                    processedCarnivals.push(existingCarnival);
                } else {
                    // Create new carnival
                    const newCarnival = await Carnival.create({
                        // Core carnival fields
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
                        
                        // Carnival details
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

                    // If the carnival is more than 7 days in the future, set registration open
                    if (eventData.date > new Date() + (7 * 24 * 60 * 60 * 1000)) {
                        newCarnival.isRegistrationOpen = true;
                    }
                    
                    console.log(`Created new MySideline carnival: ${newCarnival.title}`);
                    processedCarnivals.push(newCarnival);
                }
            } catch (error) {
                console.error(`Failed to process carnival "${eventData.title}":`, error.message);
            }
        }
        
        console.log(`Successfully processed ${processedCarnivals.length} MySideline carnivals`);
        return processedCarnivals;
    }

    /**
     * Check if we need to run initial sync using SyncLog table
     * @returns {Promise<boolean>} True if sync should run
     */
    async shouldRunInitialSync() {
        try {
            // Use the new SyncLog-based approach instead of checking individual carnivals
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