import { Carnival, SyncLog } from '../models';
import { Op } from 'sequelize';
import MySidelineLogoDownloadService from './mySidelineLogoDownloadService.mjs';
import { ENTITY_TYPES, IMAGE_TYPES, parseImageName, generateImageName } from './imageNamingService.mjs';
import { AUSTRALIAN_STATES } from '../config/constants.mjs';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';


/**
 * MySideline Data Processing Service
 * Handles database operations and data processing for MySideline events
 */
class MySidelineDataService {
    constructor() {
        this.australianStates = AUSTRALIAN_STATES;
        this.logoDownloadService = new MySidelineLogoDownloadService();
    }

    /**
     * Find existing MySideline event using robust matching with immutable fields
     * @param {Object} eventData - Event data to match against
     * @returns {Promise<Carnival|null>} Existing carnival or null
     */
    async findExistingMySidelineEvent(eventData) {
        // Strategy 1: Use MySideline-specific matching fields (most reliable)
        // This uses the immutable fields that never change after import
        if (eventData.mySidelineTitle) {
            const whereConditions = {
                mySidelineTitle: eventData.mySidelineTitle,
                isManuallyEntered: false
            };

            // Add mySidelineDate if available (null matches null, value matches value)
            if (eventData.mySidelineDate !== undefined) {
                whereConditions.mySidelineDate = eventData.mySidelineDate;
            }

            // Add mySidelineAddress if available (null matches null, value matches value)
            if (eventData.mySidelineAddress !== undefined) {
                whereConditions.mySidelineAddress = eventData.mySidelineAddress;
            }

            const match = await Carnival.findOne({ where: whereConditions });
            
            if (match) {
                console.log(`Found existing MySideline event by immutable fields: "${eventData.mySidelineTitle}"`);
                return match;
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
                // Process club logo if available - download and store locally
                let localLogoUrl = null;
                if (eventData.clubLogoURL) {
                    // Add temporary ID for logo processing
                    eventData.temporaryId = Date.now() + Math.random();
                    localLogoUrl = await this.processClubLogo(eventData.clubLogoURL, eventData);
                }

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
                    if (!existingEvent.clubLogoURL && localLogoUrl) {
                        updateData.clubLogoURL = localLogoUrl; // Use downloaded logo URL
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
                        clubLogoURL: localLogoUrl, // Use downloaded logo URL instead of original URL
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
                        mySidelineAddress: eventData.mySidelineAddress,
                        mySidelineDate: eventData.mySidelineDate,
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

                    // Update logo with actual carnival ID if we downloaded one
                    if (localLogoUrl && newEvent.id) {
                        const updatedLogoUrl = await this.updateLogoWithCarnivalId(localLogoUrl, newEvent.id);
                        if (updatedLogoUrl !== localLogoUrl) {
                            await newEvent.update({ clubLogoURL: updatedLogoUrl });
                        }
                    }

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

    /**
     * Process club logo URL - download and store locally instead of saving URL
     * 
     * @param {string} logoUrl - MySideline logo URL
     * @param {Object} eventData - Event data containing carnival info
     * @returns {Promise<string|null>} Local logo URL or null if download failed
     */
    async processClubLogo(logoUrl, eventData) {
        if (!logoUrl || typeof logoUrl !== 'string') {
            return null;
        }

        try {
            console.log(`🖼️  Processing club logo for "${eventData.title}": ${logoUrl}`);

            // For MySideline events, we'll use the carnival as the entity
            // since clubs may not exist in our system yet
            const downloadResult = await this.logoDownloadService.downloadLogo(
                logoUrl,
                ENTITY_TYPES.CARNIVAL,
                eventData.temporaryId || Date.now(), // Use temporary ID until carnival is created
                IMAGE_TYPES.LOGO
            );

            if (downloadResult.success) {
                console.log(`✅ Club logo downloaded successfully: ${downloadResult.publicUrl}`);
                return downloadResult.publicUrl;
            } else {
                console.warn(`⚠️  Failed to download club logo: ${downloadResult.error}`);
                // Don't crash - just proceed without the logo
                return null;
            }

        } catch (error) {
            console.error(`❌ Error processing club logo for "${eventData.title}":`, error.message);
            // Don't crash - just proceed without the logo
            return null;
        }
    }

    /**
     * Update downloaded logo to use actual carnival ID after creation
     * 
     * @param {string} tempLogoUrl - Temporary logo URL
     * @param {number} carnivalId - Actual carnival ID
     * @returns {Promise<string|null>} Updated logo URL or original if update failed
     */
    async updateLogoWithCarnivalId(tempLogoUrl, carnivalId) {
        if (!tempLogoUrl || !carnivalId) {
            return tempLogoUrl;
        }

        try {
            // Parse the temporary logo URL to get the filename
            const urlParts = tempLogoUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            
            // Parse the filename to get components
            const parsed = parseImageName(filename);
            if (!parsed) {
                return tempLogoUrl; // Keep original if parsing fails
            }

            // Generate new filename with actual carnival ID
            const newNamingResult = await generateImageName({
                entityType: ENTITY_TYPES.CARNIVAL,
                entityId: carnivalId,
                imageType: IMAGE_TYPES.LOGO,
                customSuffix: 'mysideline'
            });

            // Move the file to the new location
            const oldPath = join('uploads', tempLogoUrl.replace('/uploads/', ''));
            const newPath = join('uploads', newNamingResult.fullPath);
            
            // Ensure new directory exists
            await fs.mkdir(dirname(newPath), { recursive: true });
            
            // Move the file
            await fs.rename(oldPath, newPath);
            
            const newPublicUrl = `/uploads/${newNamingResult.fullPath.replace(/\\/g, '/')}`;
            console.log(`📁 Updated logo location: ${tempLogoUrl} → ${newPublicUrl}`);
            
            return newPublicUrl;

        } catch (error) {
            console.error('Error updating logo with carnival ID:', error.message);
            return tempLogoUrl; // Return original URL if update fails
        }
    }
}

export default MySidelineDataService;