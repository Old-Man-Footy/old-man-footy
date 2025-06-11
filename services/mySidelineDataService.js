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
        let filteredCount = 0;
        
        for (const eventData of scrapedEvents) {
            try {
                // Filter out Touch events before processing
                if (this.shouldFilterTouchEvent(eventData, eventData.sourceData)) {
                    filteredCount++;
                    continue;
                }

                // Check if event already exists
                const existingEvent = await Carnival.findOne({
                    where: {
                        mySidelineEventId: eventData.mySidelineEventId
                    }
                });
                
                if (existingEvent) {
                    console.log(`Event already exists: ${eventData.title}`);
                    // Update existing event with any new information
                    await existingEvent.update({
                        title: eventData.title,
                        date: eventData.date,
                        locationAddress: eventData.locationAddress,
                        scheduleDetails: eventData.scheduleDetails,
                        state: eventData.state,
                        updatedAt: new Date()
                    });
                    processedEvents.push(existingEvent);
                } else {
                    // Create new event
                    const newEvent = await Carnival.create({
                        ...eventData,
                        isManuallyEntered: false,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    
                    console.log(`Created new MySideline event: ${newEvent.title}`);
                    processedEvents.push(newEvent);
                }
            } catch (error) {
                console.error(`Failed to process event "${eventData.title}":`, error.message);
            }
        }
        
        console.log(`Successfully processed ${processedEvents.length} MySideline events`);
        if (filteredCount > 0) {
            console.log(`Filtered out ${filteredCount} Touch events`);
        }
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
                    mySidelineEventId: { [Op.ne]: null }
                },
                order: [['createdAt', 'DESC']]
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
     * Extract state from MySideline text
     * @param {string} fullText - Full text content
     * @param {string} subtitle - Subtitle text
     * @returns {string|null} - Extracted state or null
     */
    extractStateFromMySidelineText(fullText, subtitle) {
        const content = (fullText + ' ' + subtitle).toUpperCase();
        
        for (const state of this.australianStates) {
            if (content.includes(state)) {
                return state;
            }
        }
        
        return null;
    }

    /**
     * Extract event name from text lines
     * @param {Array} lines - Array of text lines
     * @returns {string} - Extracted event name
     */
    extractEventName(lines) {
        // Find the best line to use as event name
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 10 && 
                trimmed.length < 100 && 
                !trimmed.match(/^\d+/) && 
                !trimmed.toLowerCase().includes('click') &&
                !trimmed.toLowerCase().includes('expand')) {
                return trimmed;
            }
        }
        return lines[0]?.trim() || '';
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
                mySidelineEventId: `mock-${state.toLowerCase()}-${currentYear}-${index + 1}`,
                isManuallyEntered: false,
                maxTeams: 16,
                feesDescription: `$${300 + (index * 50)} per team (Early bird discount available)`,
                registrationDeadline: new Date(eventDate.getTime() - (14 * 24 * 60 * 60 * 1000)), // 2 weeks before
                scheduleDetails: `Day-long tournament starting at ${8 + index}:00 AM. Multiple age divisions available.`,
                ageCategories: ['35+', '40+', '45+', '50+'],
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

    /**
     * Check if an event should be filtered out based on "Touch" content
     * @param {Object} eventData - Event data to check
     * @param {Object} sourceElement - Original scraped element data (optional)
     * @returns {boolean} - True if event should be filtered out (contains Touch)
     */
    shouldFilterTouchEvent(eventData, sourceElement = null) {
        const checkText = (text) => {
            if (!text || typeof text !== 'string') return false;
            return text.toLowerCase().includes('touch');
        };

        // Check title and subtitle
        if (checkText(eventData.title)) {
            console.log(`Filtering out Touch event (title): ${eventData.title}`);
            return true;
        }

        // Check contact email and website URLs
        if (checkText(eventData.organiserContactEmail)) {
            console.log(`Filtering out Touch event (email): ${eventData.organiserContactEmail}`);
            return true;
        }

        if (checkText(eventData.organiserContactWebsite)) {
            console.log(`Filtering out Touch event (website): ${eventData.organiserContactWebsite}`);
            return true;
        }

        if (checkText(eventData.registrationLink)) {
            console.log(`Filtering out Touch event (registration link): ${eventData.registrationLink}`);
            return true;
        }

        // Check source element data if available
        if (sourceElement) {
            // Check subtitle from source
            if (checkText(sourceElement.subtitle)) {
                console.log(`Filtering out Touch event (source subtitle): ${sourceElement.subtitle}`);
                return true;
            }

            // Check for div elements with class="right" containing only "Touch"
            if (sourceElement.innerHTML) {
                const rightDivMatch = sourceElement.innerHTML.match(/<div[^>]*class="right"[^>]*>\s*touch\s*<\/div>/i);
                if (rightDivMatch) {
                    console.log(`Filtering out Touch event (right div): Found touch in right div`);
                    return true;
                }
            }

            // Check expanded content
            if (checkText(sourceElement.expandedDetails)) {
                console.log(`Filtering out Touch event (expanded details): Contains touch in expanded content`);
                return true;
            }

            // Check full content
            if (checkText(sourceElement.fullContent || sourceElement.text)) {
                console.log(`Filtering out Touch event (full content): Contains touch in full content`);
                return true;
            }
        }

        return false;
    }
}

module.exports = MySidelineDataService;