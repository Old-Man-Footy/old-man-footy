import { chromium } from 'playwright';
import MySidelineEventParserService from './mySidelineEventParserService.mjs';

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
        this.useHeadlessBrowser = process.env.NODE_ENV !== 'development';
        
        // Initialize the parser service
        this.parserService = new MySidelineEventParserService();
    }

    /**
     * Main method to scrape MySideline events
     * @returns {Promise<Array>} Array of scraped event objects
     */
    async scrapeEvents() {
        try {
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

            // Set the browser launch options
            const launchOptions = {
                headless: this.useHeadlessBrowser,
                timeout: this.timeout
            };
            
            // Use custom executable path if specified
            if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
            }
            
            // Launch the browser
            browser = await chromium.launch(launchOptions);
            
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
            await page.goto(this.searchUrl, { waitUntil: 'domcontentloaded'});
            console.log('✅ DOM loaded, waiting for content...');

            // Extract image dictionary
            var imgDictionary = await this.extractImageDictionary(page);

            // Wait for the API call to complete
            console.log('Waiting for API response...');
            await page.waitForTimeout(10000); // Wait up to 10 seconds for the API call

            if (jsonData && jsonData.data) {
                const processedEvents = await this.processApiResponse(jsonData, imgDictionary);
                console.log(`✅ Processed ${processedEvents.length} events from API response`);
                return processedEvents;
            } else {
                console.log('⚠️ No JSON data captured from API. Using fallback mock data.');                
            }

        } catch (error) {
            console.error('Error during API interception:', error.message);
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
    processApiResponse(apiResponse, imgDictionary) {
        if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data)) {
            console.log('Invalid API response structure');
            return [];
        }

        const processedEvents = [];

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

                    const imageUrl = imgDictionary[processedEvent.mySidelineTitle];
                    if (imageUrl) {
                        processedEvent.clubLogoURL = imageUrl.split('?')[0]; // Remove any query parameters
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

        const ageLvl = (item.ageLvl || '').toLowerCase();
        const region = (item.orgtree?.region?.name || '').toLowerCase();
        const association = (item.association?.name || '').toLowerCase();
        const competition = (item.competition?.name || '').toLowerCase();
        const club = (item.club?.name || '').toLowerCase(); 
        
        // Skip Touch events
        if (association.includes('touch') || competition.includes('touch') || ageLvl.includes('all ages')) {
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

     /**
     * Wait for MySideline-specific content to load (replaces all other wait methods)
     * @param {Page} page - Playwright page object
     */
     async waitForMySidelineContent(page) {
        console.log('Waiting for MySideline content to load...');
        
        try {
            // Step 1: Wait for basic page structure
            await page.waitForSelector('body', { timeout: 30000 });
            
            // Step 2: Wait for MySideline-specific elements
            await page.waitForSelector('.el-card.is-always-shadow, [id^="clubsearch_"]', { 
                timeout: 45000 
            });
            
            // Step 3: Wait for meaningful content with Masters events
            await page.waitForFunction(() => {
                const cards = document.querySelectorAll('.el-card.is-always-shadow, [id^="clubsearch_"]');
                let mastersContent = 0;

                for (let card of cards) {
                    const text = card.textContent?.toLowerCase() || '';
                    if (text.includes('masters') || 
                        text.includes('rugby') || 
                        text.includes('league') ||
                        text.includes('tournament') ||
                        text.includes('carnival')) {
                        mastersContent++;
                    }
                }

                return mastersContent >= 2; // At least 2 relevant cards
            }, { timeout: 60000 });

            // Step 4: Final stabilization wait
            await page.waitForTimeout(5000);
            
            console.log('✅ MySideline content loaded and ready for extraction');
            
        } catch (error) {
            console.log(`⚠️ MySideline content wait failed: ${error.message}`);
        }
    }

    /**
     * Extract images with alt tags from MySideline page
     * @param {Page} page - Playwright page object
     * @returns {Promise<Object>} Dictionary with alt tags as keys and image sources as values
     */
    async extractImageDictionary(page) {
        try {
            // Validate page parameter
            if (!page || typeof page.evaluate !== 'function') {
                console.error('❌ Invalid page object provided to extractImageDictionary');
                return {};
            }

            console.log('🔄 Loading MySideline page for image extraction...');
            await this.waitForMySidelineContent(page);

            console.log('✅ Extracting images with alt tags...');
            
            // Wait a bit more for images to load and lazy loading to complete
            await page.waitForTimeout(3000);
            
            // Extract images and create dictionary with alt as key, src as value
            const imageDictionary = await page.evaluate(() => {
                try {
                    // Define generic/default images to skip
                    const genericImagePatterns = [
                        'nrl.svg',
                        'default.png',
                        'placeholder',
                        'logo-placeholder',
                        'no-image',
                        '/18285.png',  // Known default MySideline image
                        'generic-logo.png' // Added new generic image pattern
                    ];
                    
                    // Target only the specific MySideline image structure
                    // Look for images within the image__wrapper containers with data-url attributes
                    const imageWrappers = document.querySelectorAll('.image__wrapper img[alt][data-url]');
                    
                    console.log(`DEBUG: Found ${imageWrappers.length} images in .image__wrapper containers with alt and data-url`);
                    
                    const allImages = Array.from(imageWrappers);
                    console.log(`DEBUG: Total images found: ${allImages.length}`);
                    
                    const imageDict = {};
                    let processedCount = 0;
                    let skippedCount = 0;
                    let genericCount = 0;
                    
                    allImages.forEach((img, index) => {
                        try {
                            console.log(`DEBUG: Processing image ${index + 1}:`);
                            console.log(`  - Alt: "${img.alt}"`);
                            console.log(`  - Src: "${img.src}"`);
                            console.log(`  - Data-url: "${img.getAttribute('data-url')}"`);
                            console.log(`  - Classes: "${img.className}"`);
                            console.log(`  - Parent classes: "${img.parentElement?.className}"`);
                            
                            // Validate image element has alt text
                            if (!img.alt) {
                                console.log(`  - Skipped: No alt text`);
                                skippedCount++;
                                return;
                            }

                            // Clean alt text - remove extra whitespace and normalize
                            const altText = img.alt.trim();
                            if (!altText) {
                                console.log(`  - Skipped: Empty alt text after trim`);
                                skippedCount++;
                                return;
                            }

                            // Get image URL - prioritize data-url attribute for MySideline structure
                            let srcUrl = img.getAttribute('data-url')?.trim() || img.src?.trim();
                            if (!srcUrl) {
                                console.log(`  - Skipped: No data-url or src attribute`);
                                skippedCount++;
                                return;
                            }

                            // Check if this is a generic/default image we should skip
                            const isGeneric = genericImagePatterns.some(pattern => 
                                srcUrl.toLowerCase().includes(pattern.toLowerCase())
                            );
                            
                            if (isGeneric) {
                                console.log(`  - Skipped: Generic/default image detected`);
                                genericCount++;
                                return;
                            }

                            // Validate URL format
                            if (!srcUrl.startsWith('http') && !srcUrl.startsWith('data:') && !srcUrl.startsWith('/')) {
                                console.log(`  - Skipped: Invalid URL format`);
                                skippedCount++;
                                return;
                            }

                            // Convert relative URLs to absolute URLs if needed
                            if (srcUrl.startsWith('/')) {
                                srcUrl = window.location.origin + srcUrl;
                                console.log(`  - Converted relative URL to: ${srcUrl}`);
                            }

                            // For MySideline events, use the full alt text as the event key
                            // Alt text format: "Team A vs Team B - Date" or just "Event Name"
                            // We want to use this as the key to match against mySidelineTitle
                            const eventKey = altText;

                            // Store in dictionary (last one wins if duplicate alt text)
                            imageDict[eventKey] = srcUrl;
                            console.log(`  - ✅ Added to dictionary: "${eventKey}" -> ${srcUrl}`);
                            processedCount++;
                            
                        } catch (imgError) {
                            console.log(`  - Error processing image: ${imgError.message}`);
                            skippedCount++;
                        }
                    });
                    
                    console.log(`DEBUG: Image extraction summary:`);
                    console.log(`  - Total images: ${allImages.length}`);
                    console.log(`  - Successfully processed: ${processedCount}`);
                    console.log(`  - Skipped (missing data): ${skippedCount}`);
                    console.log(`  - Skipped (generic): ${genericCount}`);
                    
                    // Return results with metadata
                    return {
                        images: imageDict,
                        metadata: {
                            totalElements: allImages.length,
                            processed: processedCount,
                            skipped: skippedCount,
                            generic: genericCount
                        }
                    };
                    
                } catch (evaluationError) {
                    console.error('Error in page.evaluate for image extraction:', evaluationError.message);
                    return {
                        images: {},
                        metadata: {
                            totalElements: 0,
                            processed: 0,
                            skipped: 0,
                            generic: 0,
                            error: evaluationError.message
                        }
                    };
                }
            });
            
            // Extract the actual image dictionary and metadata
            const { images: finalImageDict, metadata } = imageDictionary;
            const imageCount = Object.keys(finalImageDict).length;
            
            // Enhanced logging with detailed statistics
            console.log(`📸 Image extraction results:`);
            console.log(`  - Found ${metadata.totalElements} total img elements in .image__wrapper containers`);
            console.log(`  - Successfully processed ${metadata.processed} images`);
            console.log(`  - Skipped ${metadata.skipped} images (missing data or invalid URLs)`);
            console.log(`  - Skipped ${metadata.generic} generic/default images (nrl.svg, etc.)`);
            console.log(`  - Final unique images in dictionary: ${imageCount}`);
            
            // Log any extraction errors
            if (metadata.error) {
                console.error(`⚠️ Extraction error: ${metadata.error}`);
            }
            
            // Always log the final dictionary contents for debugging
            console.log('📋 Final image dictionary contents:');
            if (imageCount === 0) {
                console.log('  (empty - no valid non-generic images found)');
            } else {
                Object.entries(finalImageDict).forEach(([alt, src], index) => {
                    console.log(`  ${index + 1}. "${alt}" -> ${src}`);
                });
            }
            
            // Additional debugging if no images found
            if (imageCount === 0) {
                console.warn('⚠️ No valid non-generic images found. Running additional diagnostics...');
                
                const debugInfo = await page.evaluate(() => {
                    const allImages = document.querySelectorAll('img');
                    const imageWrappers = document.querySelectorAll('.image__wrapper');
                    const targetImages = document.querySelectorAll('.image__wrapper img[alt][data-url]');
                    const imagesInfo = [];
                    
                    Array.from(allImages).slice(0, 10).forEach((img, index) => {
                        imagesInfo.push({
                            index: index + 1,
                            alt: img.alt,
                            src: img.src,
                            dataUrl: img.getAttribute('data-url'),
                            className: img.className,
                            parentClass: img.parentElement?.className,
                            hasImageWrapper: img.closest('.image__wrapper') !== null
                        });
                    });
                    
                    return {
                        totalImages: allImages.length,
                        totalImageWrappers: imageWrappers.length,
                        targetImages: targetImages.length,
                        imagesWithAlt: document.querySelectorAll('img[alt]').length,
                        imagesWithSrc: document.querySelectorAll('img[src]').length,
                        imagesWithDataUrl: document.querySelectorAll('img[data-url]').length,
                        imagesWithBoth: document.querySelectorAll('img[alt][data-url]').length,
                        imagesInWrappers: document.querySelectorAll('.image__wrapper img').length,
                        sampleImages: imagesInfo
                    };
                });
                
                console.log('🔍 Debug info:', JSON.stringify(debugInfo, null, 2));
            }
            
            return finalImageDict;
            
        } catch (error) {
            console.error('❌ Failed to extract image dictionary:', error.message);
            console.error('Stack trace:', error.stack);
            
            // Return empty dictionary on error to prevent downstream failures
            return {};
        }
    }


}

export default MySidelineScraperService;