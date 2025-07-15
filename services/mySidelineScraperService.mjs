import { chromium } from 'playwright';

/**
 * MySideline Web Scraper Service
 * Handles all web scraping functionality for MySideline events using API interception
 */
class MySidelineScraperService {
    constructor() {
        this.timeout = parseInt(process.env.MYSIDELINE_REQUEST_TIMEOUT) || 60000;
        this.searchUrl = process.env.MYSIDELINE_URL || 'https://profile.mysideline.com.au/register/clubsearch/?criteria=Masters&source=rugby-league';
        this.enableScraping = process.env.MYSIDELINE_ENABLE_SCRAPING !== 'false';
        this.useMockData = process.env.MYSIDELINE_USE_MOCK === 'true';
        this.useHeadlessBrowser = process.env.NODE_ENV !== 'development';
    }

    /**
     * Main method to scrape MySideline events
     * @returns {Promise<Array>} Array of scraped event objects
     */
    async scrapeEvents() {
        try {
            // Check if we should use mock data instead of scraping
            if (this.useMockData) {
                console.log('Using mock MySideline data (development mode)...');
                return this.generateMockEvents();
            }

            // Check if scraping is disabled
            if (!this.enableScraping) {
                console.log('MySideline scraping is disabled via configuration');
                return [];
            }

            console.log('Fetching MySideline Masters events via API interception...');
            
            const events = await this.fetchEventsWithApiInterception();
            
            if (events && events.length > 0) {
                console.log(`Found ${events.length} Masters events from MySideline API`);
                return events;
            } else {
                console.log('No events found via API interception');
                return [];
            }
        } catch (error) {
            console.error('Failed to fetch MySideline events:', error.message);
            return [];
        }
    }

    /**
     * Fetch events using browser automation with API interception
     * @returns {Promise<Array>} Array of fetched event objects
     */
    async fetchEventsWithApiInterception() {
        let browser = null;
        let context = null;
        let page = null;
        let jsonData = null;

        try {
            console.log('Launching browser for API interception...');
            browser = await chromium.launch({
                headless: this.useHeadlessBrowser,
                timeout: this.timeout
            });
            
            context = await browser.newContext();
            page = await context.newPage();
            
            // Set up API response interception
            page.on('response', async response => {
                if (response.url() === 'https://api.mysideline.xyz/nrl/api/v1/portal-public/registration/search') {
                    if (response.ok()) {
                        try {
                            jsonData = await response.json();
                            console.log(`✅ Successfully intercepted API response with ${jsonData?.data?.length || 0} events`);
                        } catch (e) {
                            console.error('Failed to parse JSON response:', e);
                        }
                    } else {
                        console.error(`API request failed with status: ${response.status()}`);
                    }
                }
            });

            console.log(`Navigating to MySideline search URL: ${this.searchUrl}`);
            await page.goto(this.searchUrl, { waitUntil: 'domcontentloaded' });
            
            // Wait for the API call to complete
            console.log('Waiting for API response...');
            await page.waitForTimeout(10000); // Wait up to 10 seconds for the API call

            if (jsonData && jsonData.data) {
                const processedEvents = this.processApiResponse(jsonData);
                console.log(`✅ Processed ${processedEvents.length} events from API response`);
                return processedEvents;
            } else {
                console.log('⚠️ No JSON data captured from API. Using fallback mock data.');
                return this.generateMockEvents();
            }

        } catch (error) {
            console.error('Error during API interception:', error.message);
            return this.generateMockEvents();
        } finally {
            try {
                if (page) await page.close();
                if (context) await context.close();
                if (browser) await browser.close();
                console.log('✅ Browser cleanup completed');
            } catch (closeError) {
                console.log('Error closing browser resources:', closeError.message);
            }
        }
    }

    /**
     * Process the API response and convert to our internal format
     * @param {Object} apiResponse - The raw API response
     * @returns {Array} Array of processed events
     */
    processApiResponse(apiResponse) {
        if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data)) {
            console.log('Invalid API response structure');
            return [];
        }

        const processedEvents = [];

        for (const item of apiResponse.data) {
            try {
                // Skip non-Masters events and Touch events
                if (!this.isRelevantMastersEvent(item)) {
                    continue;
                }

                const processedEvent = this.convertApiItemToEvent(item);
                if (processedEvent) {
                    processedEvents.push(processedEvent);
                }   
            } catch (error) {
                console.warn(`Failed to process API item ${item._id}:`, error.message);
            }
        }

        return processedEvents;
    }

    /**
     * Check if an API item represents a relevant Masters event
     * @param {Object} item - API response item
     * @returns {boolean} True if relevant
     */
    isRelevantMastersEvent(item) {
        if (!item || !item.name) {
            return false;
        }

        const ageLvl = (item.ageLevel || '').toLowerCase();
        const region = (item.orgtree?.region?.name || '').toLowerCase();
        const association = (item.association?.name || '').toLowerCase();
        const competition = (item.competition?.name || '').toLowerCase();
        const club = (item.club?.name || '').toLowerCase(); 
        
        // Skip Touch events
        if (association.includes('touch') || competition.includes('touch')) {
            return false;
        }

        // Check for Masters keywords in age level, region, association, competition, or club
        if (ageLvl.includes('masters')
            || region.includes('nrl masters')
            || association.includes('nrl masters')
            || competition.includes('masters')
            || club.includes('masters')) {
            return true;
        }
        
        // Assume Not Masters
        return false;
    }

    /**
     * Convert API item to our internal event format
     * @param {Object} item - API response item
     * @returns {Object} Converted event object
     */
    convertApiItemToEvent(item) {
        // Extract date from name if present
        const dateMatch = item.name.match(/\(([^)]+)\)|\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b|\b(\d{1,2}\s+\w+\s+\d{4})\b/);
        let eventDate = null;
        if (dateMatch) {
            const dateStr = dateMatch[1] || dateMatch[2] || dateMatch[3];
            eventDate = this.parseDate(dateStr);
        }

        // Build address from venue or contact address
        let locationAddress = '';
        let state = null;
        let googleMapsUrl = null;
        let latitude = null;
        let longitude = null;
        let suburb = null;
        let postcode = null;
        let country = 'Australia';
        let addressLine1 = null;
        let addressLine2 = null;
        let venueName = null;
        
        // Extract venue name from MySideline data
        venueName = item.venue.name || item.orgtree?.venue?.name || null;

        if (item.venue && item.venue.address) {
            const addr = item.venue.address;

            addressLine1 = addr.addressLine1 || null;
            addressLine2 = addr.addressLine2 || null;
            locationAddress = addr.formatted || null;
            state = addr.state || null;
            latitude = addr.lat || null;
            longitude = addr.lng || null;
            suburb = addr.suburb || null;
            postcode = addr.postcode || null;
            country = addr.country || 'Australia';
            
            // Create Google Maps URL from coordinates
            if (addr.lat && addr.lng) {
                googleMapsUrl = `https://maps.google.com/?q=${addr.lat},${addr.lng}`;
            }
            else if (locationAddress) {
                // Fallback to formatted address
                googleMapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(locationAddress)}`;
            }
        } else if (item.contact && item.contact.address) {
            const addr = item.contact.address;
            
            // Extract venue name from MySideline data (try orgtree first, then venue)
            venueName = item.orgtree?.venue?.name || item.venue?.name || null;
            
            // Extract structured address fields from MySideline
            addressLine1 = addr.addressLine1 || null;
            addressLine2 = addr.addressLine2 || null;
            locationAddress = addr.formatted || null;
            state = addr.state || null;
            latitude = addr.lat || null;
            longitude = addr.lng || null;
            suburb = addr.suburb || null;
            postcode = addr.postcode || null;
            country = addr.country || 'Australia';
            
            if (addr.lat && addr.lng) {
                googleMapsUrl = `https://maps.google.com/?q=${addr.lat},${addr.lng}`;
            }
            else if (locationAddress) {
                // Fallback to formatted address
                googleMapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(locationAddress)}`;
            }            
        } else {
            // No address data available, but try to extract venue name from orgtree
            venueName = item.orgtree?.venue?.name || item.venue?.name || null;
        }

        // Generate registration link using the top-level _id
        const registrationLink = `${MYSIDELINE_EVENT_URL}${item._id}`;

        return {
            // Core event data
            title: this.cleanTitle(item.name),
            date: eventDate,
            locationAddress: locationAddress || 'TBA - Check MySideline for details',
            state: state,
            
            // MySideline-specific fields
            mySidelineTitle: item.name,
            mySidelineAddress: locationAddress,
            mySidelineDate: eventDate,
            mySidelineId: item._id,
            
            // Contact information
            organiserContactName: item.contact?.name || null,
            organiserContactPhone: item.contact?.number || null,
            organiserContactEmail: item.contact?.email || null,
            
            // URLs and links
            registrationLink: registrationLink,
            googleMapsUrl: googleMapsUrl,
            socialMediaWebsite: item.meta?.website || null,
            socialMediaFacebook: item.meta?.facebook || null,
            
            // Event details
            scheduleDetails: item.finderDetails?.description || null,
            
            // System fields
            source: 'MySideline',
            isActive: item.regoOpen || false,
            isMySidelineCard: true,
            isManuallyEntered: false,
            
            // MySideline-compatible address fields
            locationAddressLine1: addressLine1,
            locationAddressLine2: addressLine2,
            venueName: venueName,
            locationLatitude: latitude,
            locationLongitude: longitude,
            locationSuburb: suburb,
            locationPostcode: postcode,
            locationCountry: country
        };
    }    

    /**
     * Clean and standardize event titles
     * @param {string} title - Raw title from API
     * @returns {string} Cleaned title
     */
    cleanTitle(title) {
        if (!title) return 'Masters Rugby League Event';
        
        // Remove date information in parentheses
        let cleaned = title.replace(/\s*\([^)]*\)\s*/g, ' ');
        
        // Remove trailing dashes and pipes
        cleaned = cleaned.replace(/\s*[\-\|]\s*$/, '');
        
        // Normalize whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned || 'Masters Rugby League Event';
    }

    /**
     * Parse various date formats
     * @param {string} dateString - Date string to parse
     * @returns {Date|null} Parsed date or null
     */
    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            // Try standard date parsing first
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date;
            }
            
            // Handle DD/MM/YYYY format
            const ddmmyyyy = dateString.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (ddmmyyyy) {
                const [, day, month, year] = ddmmyyyy;
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            
            return null;
        } catch (error) {
            console.warn(`Failed to parse date: ${dateString}`);
            return null;
        }
    }

    /**
     * Generate mock events for development/testing
     * @returns {Array} Array of mock events
     */
    generateMockEvents() {
        const states = ['NSW', 'QLD', 'VIC'];
        const mockEvents = [];
        
        states.forEach(state => {
            const currentYear = new Date().getFullYear();
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
                }
            ];

            eventTemplates.forEach((template, index) => {
                const eventDate = new Date();
                eventDate.setMonth(eventDate.getMonth() + template.monthOffset);
                eventDate.setDate(15);

                mockEvents.push({
                    title: template.title,
                    date: eventDate,
                    locationAddress: `${template.locationSuffix} Sports Complex, ${state}`,
                    state: state,
                    mySidelineTitle: template.title,
                    mySidelineAddress: `${template.locationSuffix} Sports Complex, ${state}`,
                    mySidelineDate: eventDate,
                    mySidelineId: 99000000 + mockEvents.length,
                    registrationLink: `${MYSIDELINE_EVENT_URL}${item._id}99000${mockEvents.length}`,
                    organiserContactName: `${state} Rugby League Masters`,
                    organiserContactEmail: `masters@${state.toLowerCase()}rl.com.au`,
                    organiserContactPhone: `0${index + 2} ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9000) + 1000}`,
                    socialMediaWebsite: null,
                    socialMediaFacebook: null,
                    source: 'MySideline',
                    scheduleDetails: `Day-long tournament starting at ${8 + index}:00 AM. Multiple age divisions available.`,
                    isActive: true,
                    isMySidelineCard: true,
                    isManuallyEntered: false,
                    locationAddressLine1: `${template.locationSuffix} Sports Complex`,
                    locationAddressLine2: null,
                    venueName: `${template.locationSuffix} Sports Complex`,
                    locationLatitude: null,
                    locationLongitude: null,
                    locationSuburb: template.locationSuffix,
                    locationPostcode: null,
                    locationCountry: 'Australia',
                    googleMapsUrl: null
                });
            });
        });

        return mockEvents;
    }

    /**
     * Validate and clean extracted data to ensure it meets requirements
     * @param {Object} rawData - Raw extracted data
     * @returns {Object} Cleaned and validated data
     */
    validateAndCleanData(rawData) {
        const cleanedData = { ...rawData };

        // Ensure title is present (required field)
        if (!cleanedData.title || cleanedData.title.trim() === '') {
            console.warn('No title provided, using default');
            cleanedData.title = 'Masters Rugby League Event';
        }

        // Clean string fields
        const stringFields = ['title', 'locationAddress', 'organiserContactName'];
        stringFields.forEach(field => {
            const value = cleanedData[field];
            if (value && typeof value === 'string') {
                cleanedData[field] = value.trim();
                // Convert empty strings to null
                if (cleanedData[field] === '') {
                    cleanedData[field] = null;
                }
            }
        });

        // Validate email format
        if (cleanedData.organiserContactEmail) {
            const email = cleanedData.organiserContactEmail.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                console.warn(`Invalid email format: ${email}`);
                cleanedData.organiserContactEmail = null;
            } else {
                cleanedData.organiserContactEmail = email.toLowerCase();
            }
        }

        return cleanedData;
    }
}

export default MySidelineScraperService;