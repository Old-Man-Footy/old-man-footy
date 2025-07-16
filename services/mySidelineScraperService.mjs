import { chromium } from 'playwright';
import { cheerio } from 'cheerio';

/**
 * MySideline Web Scraper Service
 * Handles all web scraping functionality for MySideline events using API interception
 */
class MySidelineScraperService {
    constructor() {
        this.timeout = parseInt(process.env.MYSIDELINE_REQUEST_TIMEOUT) || 60000;
        this.searchUrl = process.env.MYSIDELINE_URL || 'https://profile.mysideline.com.au/register/clubsearch/?criteria=Masters&source=rugby-league';
        this.eventUrl = process.env.MYSIDELINE_EVENT_URL || 'https://profile.mysideline.com.au/register/clubsearch/?source=rugby-league&entityType=team&isEntityIdSearch=true&entity=true&criteria=';
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

            // Save dom content html to variable
            const content = await page.content(); 
            console.log('DOM content captured successfully.');

            // Wait for the API call to complete
            console.log('Waiting for API response...');
            await page.waitForTimeout(10000); // Wait up to 10 seconds for the API call

            if (jsonData && jsonData.data) {
                const processedEvents = this.processApiResponse(jsonData, content);
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
    processApiResponse(apiResponse, htmlContent) {
        if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data)) {
            console.log('Invalid API response structure');
            return [];
        }

        const processedEvents = [];
        const $ = cheerio.load(htmlContent);

        for (const item of apiResponse.data) {
            try {
                // Add null/undefined check for the item itself
                if (!item || typeof item !== 'object') {
                    console.warn(`Skipping invalid API item: ${item}`);
                    continue;
                }

                // Skip non-Masters events and Touch events
                if (!this.isRelevantMastersEvent(item)) {
                    continue;
                }

                const processedEvent = this.convertApiItemToEvent(item);
                if (processedEvent) {

                    // Select the img element with the specific alt attribute
                    const element = $(`img[alt="${processedEvent.mySidelineTitle}"]`);
                    // Check if the element exists and has the data-url attribute

                    if (element.length > 0 && element.attr('data-url')) {
                        const dataUrl = element.attr('data-url');
                        console.log(`Data URL for alt "${processedEvent.mySidelineTitle}": ${dataUrl}`);
                        processedEvent.clubLogoURL = dataUrl;
                    } else {
                        console.log(`Image with alt "${processedEvent.mySidelineTitle}" not found or missing data-url attribute.`);
                    }

                    processedEvents.push(processedEvent);
                }   
            } catch (error) {
                console.warn(`Failed to process API item ${item?._id || 'unknown'}:`, error.message);
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
        // Add comprehensive null/undefined checks
        if (!item || typeof item !== 'object' || !item.name) {
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
        // Add comprehensive null/undefined checks at the start
        if (!item || typeof item !== 'object') {
            throw new Error('Item is null, undefined, or not an object');
        }

        if (!item.name) {
            throw new Error('Item missing required name property');
        }

        if (!item._id) {
            throw new Error('Item missing required _id property');
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
        let eventData = null;
        
        // Extract venue name from MySideline data with null checks
        venueName = item.venue?.name || item.orgtree?.venue?.name || null;

        // Get address data (prefer venue address, fallback to contact address)
        const addressData = item.venue?.address || item.contact?.address;
        
        if (addressData) {
            // Extract all address fields
            addressLine1 = addressData.addressLine1 || null;
            addressLine2 = addressData.addressLine2 || null;
            locationAddress = addressData.formatted || null;
            state = addressData.state || null;
            latitude = addressData.lat || null;
            longitude = addressData.lng || null;
            suburb = addressData.suburb || null;
            postcode = addressData.postcode || null;
            country = addressData.country || 'Australia';
            
            // Create Google Maps URL from coordinates or formatted address
            if (addressData.lat && addressData.lng) {
                googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${addressData.lat},${addressData.lng}`;
            } else if (locationAddress) {
                googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`;
            }
        }

        // Generate registration link using the top-level _id
        const registrationLink = `${this.eventUrl}${item._id}`;

        // 
        let { cleanTitle: carnivalName, extractedDate: eventDate } = this.parserService.extractAndStripDateFromTitle(item.name);
        if (!carnivalName || carnivalName.trim() === '') {
            // If no title was extracted, use the full title.
            carnivalName = item.name || 'Masters Rugby League Event';                
        }

        return {
            // Core event data
            title: carnivalName,
            date: eventDate,
            locationAddress: locationAddress || 'TBC',
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

                const mockId = 99000000 + mockEvents.length;

                mockEvents.push({
                    title: template.title,
                    date: eventDate,
                    locationAddress: `${template.locationSuffix} Sports Complex, ${state}`,
                    state: state,
                    mySidelineTitle: template.title,
                    mySidelineAddress: `${template.locationSuffix} Sports Complex, ${state}`,
                    mySidelineDate: eventDate,
                    mySidelineId: mockId,
                    registrationLink: `${this.eventUrl}${mockId}`,
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